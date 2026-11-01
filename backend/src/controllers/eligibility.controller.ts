import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import {
  evaluateForDrive,
  getOrCreateEvaluation,
  createCriteriaVersion,
  getActiveCriteria,
  reevaluateStudentForAppliedDrives,
} from '../services/eligibilityEngine.service.js';
import { shortlistStudents } from '../services/shortlist.service.js';

// CSV-injection safe cell
const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
};

/**
 * GET /api/drives/:id/eligibility (student — own evaluation, Ch 50)
 */
export const getMyEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const evaluation = await getOrCreateEvaluation(req.user!.id, driveId);
    res.json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drives/:id/eligibility-preview (PO/Admin — full cohort breakdown,
 * Ch 38/41/50): eligible / ineligible / pending counts + per-student reasons.
 */
export const getEligibilityPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;

    const criteriaInfo = await getActiveCriteria(driveId);
    if (!criteriaInfo) throw ApiError.notFound('Drive not found');

    // Pre-filter by FK branch/batch (cheap DB filter), then engine-evaluate
    const profiles = await prisma.studentProfile.findMany({
      where: {
        user: { isActive: true, role: 'student' },
        ...(criteriaInfo.criteria.eligibleBranchIds?.length
          ? { branchId: { in: criteriaInfo.criteria.eligibleBranchIds } }
          : {}),
        ...(criteriaInfo.criteria.eligibleBatchIds?.length
          ? { batchId: { in: criteriaInfo.criteria.eligibleBatchIds } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: true,
        batch: true,
      },
    });

    const students = [];
    for (const p of profiles) {
      const ev = await evaluateForDrive(p.userId, driveId);
      if (!ev) continue;
      students.push({
        studentId: p.userId,
        name: p.user.name,
        email: p.user.email,
        branch: p.branch?.name,
        batch: p.batch?.name,
        status: ev.status,
        failedReasons: ev.criteriaResults.filter((r) => r.mode === 'fail').map((r) => r.explanation),
        pendingReasons: ev.criteriaResults.filter((r) => r.mode === 'pending').map((r) => r.explanation),
      });
    }

    res.json({
      success: true,
      data: {
        criteriaVersion: criteriaInfo.version,
        counts: {
          total: students.length,
          eligible: students.filter((s) => s.status === 'ELIGIBLE').length,
          ineligible: students.filter((s) => s.status === 'INELIGIBLE').length,
          pending: students.filter((s) => s.status === 'PENDING_VERIFICATION').length,
        },
        students,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/drives/:id/criteria (PO/Admin — new version, Ch 39)
 */
export const updateCriteria = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const { criteria, changeReason } = req.body;
    if (!changeReason || changeReason.trim().length < 10) {
      throw ApiError.badRequest('A change reason of at least 10 characters is required for criteria modifications');
    }
    const result = await createCriteriaVersion(driveId, criteria, changeReason.trim(), req.user!.id);
    await audit(
      req.user!.id,
      'drive.criteria_version',
      'drive_eligibility_criteria',
      result.criteria.id,
      'success',
      {
        driveId,
        version: result.criteria.version,
        changeReason,
        reevaluations: result.reevaluations,
      }
    );
    res.json({
      success: true,
      data: {
        version: result.criteria.version,
        reevaluations: result.reevaluations,
        message: `Criteria v${result.criteria.version} created; ${result.reevaluations.length} applicant(s) re-evaluated`,
      },
    });
  } catch (err: any) {
    next(err.message ? err : ApiError.badRequest('Criteria update failed'));
  }
};

/**
 * GET /api/drives/:id/criteria (PO/Admin — versioned history, Ch 38/39)
 */
export const getCriteriaHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const versions = await prisma.driveEligibilityCriteria.findMany({
      where: { driveId },
      orderBy: { version: 'desc' },
    });
    res.json({ success: true, data: versions });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/drives/:id/shortlist (PO/Admin, Ch 40/45)
 */
export const shortlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const { studentIds, conflictOverrideReason } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw ApiError.badRequest('studentIds array is required');
    }
    const results = await shortlistStudents(driveId, studentIds, req.user!.id, { conflictOverrideReason });
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/drives/:id/eligibility/:studentId/override (PO/Admin — Ch 46)
 */
export const overrideEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const studentId = req.params.studentId as string;
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      throw ApiError.badRequest('An override justification of at least 10 characters is required');
    }

    // Capture the automated result FIRST — it is preserved alongside the override (Ch 46)
    const automated = await evaluateForDrive(studentId, driveId);
    if (!automated) throw ApiError.notFound('Drive not found');

    const record = await prisma.$transaction(async (tx: any) => {
      await tx.eligibilityEvaluation.updateMany({
        where: { studentId, driveId, isCurrent: true },
        data: { isCurrent: false },
      });
      return tx.eligibilityEvaluation.create({
        data: {
          studentId,
          driveId,
          criteriaVersion: automated.criteriaVersion,
          status: 'MANUAL_OVERRIDE',
          criteriaResults: {
            automatedStatus: automated.status,
            criteria: automated.criteriaResults,
            warnings: automated.warnings,
            note: 'Manual override — automated result preserved above',
          } as any,
          overrideReason: reason.trim(),
          overriddenBy: req.user!.id,
        },
      });
    });

    await audit(req.user!.id, 'eligibility.override', 'eligibility_evaluation', record.id, 'success', {
      driveId,
      studentId,
      automatedStatus: automated.status,
      reason,
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drives/:id/eligibility-report (PO/Admin — CSV, Ch 50)
 */
export const getEligibilityReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: { company: { select: { name: true } } },
    });
    if (!drive) throw ApiError.notFound('Drive not found');

    const evaluations = await prisma.eligibilityEvaluation.findMany({
      where: { driveId, isCurrent: true },
      include: { student: { select: { name: true, email: true } } },
    });

    const rows = [
      ['Student', 'Email', 'Status', 'Override Reason', 'Criteria Version', 'Evaluated At'],
      ...evaluations.map((e: any) => [
        csvCell(e.student.name),
        csvCell(e.student.email),
        csvCell(e.status),
        csvCell(e.overrideReason),
        csvCell(e.criteriaVersion),
        csvCell(e.evaluatedAt.toISOString()),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="eligibility-${driveId}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drives/:id/override-history (Admin — Ch 46 review)
 */
export const getOverrideHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params.id as string;
    const overrides = await prisma.eligibilityEvaluation.findMany({
      where: { driveId, status: 'MANUAL_OVERRIDE' },
      include: {
        student: { select: { name: true, email: true } },
      },
      orderBy: { evaluatedAt: 'desc' },
    });
    res.json({ success: true, data: overrides });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SUPPLEMENTARY EXAMS + EDUCATION HISTORY (Ch 48, 49)
// ============================================================
export const recordSupplementaryExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId as string;
    const { subject, semesterNumber, attemptNumber, result } = req.body;

    const record = await prisma.supplementaryExam.create({
      data: {
        studentId,
        subject,
        semesterNumber,
        attemptNumber: attemptNumber || 1,
        result,
        verifiedBy: req.user!.id,
        verifiedAt: new Date(),
      },
    });

    // Verified PASS ⇒ clear the matching active backlog (Ch 48)
    if (result === 'passed' || result === 'cleared_official') {
      await prisma.backlogRecord.updateMany({
        where: {
          studentId,
          status: 'active',
          OR: [
            { subject: subject },
            { subjectCode: subject },
            { subjectName: subject },
          ],
        },
        data: {
          status: 'cleared',
          clearedAt: new Date(),
          clearedInSemester: semesterNumber,
          verifiedBy: req.user!.id,
          verifiedAt: new Date(),
          isVerified: true,
        },
      });
    }

    await reevaluateStudentForAppliedDrives(studentId); // Ch 47 trigger
    await audit(req.user!.id, 'academic.supplementary_record', 'supplementary_exam', record.id, 'success', {
      studentId,
      result,
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const upsertEducationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId as string;
    const { level, institutionName, startYear, endYear, gapExplanation } = req.body;

    const existing = await prisma.educationHistory.findFirst({ where: { studentId, level } });
    const record = existing
      ? await prisma.educationHistory.update({
          where: { id: existing.id },
          data: {
            institutionName,
            startYear,
            endYear,
            gapExplanation,
            isVerified: false,
            gapDocVerified: false,
          },
        })
      : await prisma.educationHistory.create({
          data: { studentId, level, institutionName, startYear, endYear, gapExplanation },
        });

    await reevaluateStudentForAppliedDrives(studentId);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

export const verifyEducationHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const historyId = req.params.historyId as string;
    const record = await prisma.educationHistory.update({
      where: { id: historyId },
      data: { isVerified: true, verifiedBy: req.user!.id, gapDocVerified: true },
    });
    await reevaluateStudentForAppliedDrives(record.studentId);
    await audit(req.user!.id, 'academic.education_verified', 'education_history', historyId, 'success');
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

