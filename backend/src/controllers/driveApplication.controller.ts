import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { checkRegistrationOpen } from '../services/eligibility.service.js';
import { getProfileCompleteness } from '../services/academic.service.js';
import { getOrCreateEvaluation } from '../services/eligibilityEngine.service.js';
import {
  enqueueDriveNotification,
  processPendingDriveNotifications,
} from '../services/driveNotification.service.js';
import { sendNotification } from '../services/notification.service.js';

// ============================================================
// APPLY TO DRIVE (Student or PO Override)
// ============================================================
export const applyToDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['id'] as string;
    const studentId = req.user!.id;
    const { eligibilityOverrideReason, resumeVersionId } = req.body || {};

    const isPoOrAdmin = req.user!.role === 'po' || req.user!.role === 'admin';
    if (eligibilityOverrideReason && !isPoOrAdmin) {
      throw ApiError.forbidden('Only placement officers or administrators can apply with an eligibility override');
    }

    // Challenge 33: Profile completeness gate
    const completeness = await getProfileCompleteness(studentId);
    if (!completeness.isComplete && !eligibilityOverrideReason) {
      return res.status(403).json({
        success: false,
        error: 'Your profile is incomplete. Complete all required fields before applying.',
        missingFields: completeness.missingFields,
      });
    }

    // Challenges 36-50: Centralized Eligibility Engine evaluation
    const evaluation = await getOrCreateEvaluation(studentId, driveId);
    if (
      evaluation.status !== 'ELIGIBLE' &&
      evaluation.status !== 'MANUAL_OVERRIDE' &&
      !eligibilityOverrideReason
    ) {
      const failReasons = evaluation.criteriaResults
        .filter((r) => r.mode === 'fail')
        .map((r) => r.explanation);
      const pendingReasons = evaluation.criteriaResults
        .filter((r) => r.mode === 'pending')
        .map((r) => r.explanation);

      return res.status(403).json({
        success: false,
        error:
          evaluation.status === 'PENDING_VERIFICATION'
            ? 'Your application is blocked: one or more academic criteria require verification.'
            : 'You do not meet the eligibility criteria for this drive.',
        status: evaluation.status,
        reasons: [...failReasons, ...pendingReasons],
        missingProfileInfo: pendingReasons,
        criteriaResults: evaluation.criteriaResults,
      });
    }

    // Transaction guarantees atomic capacity lock & DB unique constraint
    const result = await prisma.$transaction(async (tx) => {
      const drive = await tx.placementDrive.findUnique({
        where: { id: driveId },
        include: {
          company: true,
          eligibleBranches: { include: { branch: true } },
          eligibleBatches: { include: { batch: true } },
        },
      });

      if (!drive) throw ApiError.notFound('Placement drive not found');

      // Count active applicants
      const activeCount = await tx.driveApplication.count({
        where: {
          driveId,
          status: { not: 'withdrawn' },
        },
      });

      // Challenges 7, 19: Registration open check against server clock
      const regStatus = checkRegistrationOpen(drive, activeCount);
      if (!regStatus.open) {
        let msg = 'Registration is currently closed for this placement drive';
        if (regStatus.reason === 'deadline') {
          msg = 'Registration deadline has passed';
        } else if (regStatus.reason === 'capacity_full') {
          msg = 'Drive capacity has been reached';
        } else if (regStatus.reason === 'cancelled') {
          msg = 'This drive has been cancelled';
        } else if (regStatus.reason === 'withdrawn') {
          msg = 'This drive has been withdrawn by the company';
        }
        throw ApiError.badRequest(msg);
      }

      // Check existing application
      const existingApp = await tx.driveApplication.findUnique({
        where: {
          driveId_studentId: { driveId, studentId },
        },
      });

      if (existingApp && existingApp.status !== 'withdrawn') {
        throw ApiError.conflict('You have already applied to this placement drive');
      }

      // Challenge 18: Concurrency check for capacity
      if (drive.vacancies != null && activeCount >= drive.vacancies) {
        throw ApiError.badRequest('Registration closed: maximum capacity reached');
      }

      // Challenge 114: Snapshot resume version and label at submission
      let attachedResume: { id: string; label: string } | null = null;
      if (resumeVersionId) {
        const found = await tx.resumeVersion.findFirst({
          where: { id: resumeVersionId, studentId },
        });
        if (!found) {
          throw ApiError.badRequest('The selected resume version does not exist or does not belong to you.');
        }
        attachedResume = { id: found.id, label: found.label };
      } else {
        const activeResume = await tx.resumeVersion.findFirst({
          where: { studentId, isActive: true },
        });
        if (activeResume) {
          attachedResume = { id: activeResume.id, label: activeResume.label };
        }
      }

      let application;
      if (existingApp) {
        // Re-applying after previous withdrawal
        application = await tx.driveApplication.update({
          where: { id: existingApp.id },
          data: {
            status: 'applied',
            appliedAt: new Date(),
            withdrawnAt: null,
            withdrawalReason: null,
            eligibilityOverrideReason: eligibilityOverrideReason || null,
            overriddenBy: eligibilityOverrideReason ? req.user!.id : null,
            resumeVersionId: attachedResume?.id || null,
            resumeLabelAtSubmit: attachedResume?.label || null,
          },
        });
      } else {
        application = await tx.driveApplication.create({
          data: {
            driveId,
            studentId,
            status: 'applied',
            eligibilityOverrideReason: eligibilityOverrideReason || null,
            overriddenBy: eligibilityOverrideReason ? req.user!.id : null,
            resumeVersionId: attachedResume?.id || null,
            resumeLabelAtSubmit: attachedResume?.label || null,
          },
        });
      }

      return { application, driveTitle: drive.title };
    });

    await audit(req.user!.id, 'drive.apply', 'drive_application', result.application.id, 'success', {
      driveId,
      studentId,
      hasOverride: !!eligibilityOverrideReason,
    });

    // Challenge 144: Send application confirmation notification with idempotency
    await sendNotification({
      title: 'Application Submitted',
      message: `You have successfully applied to "${result.driveTitle}". Application ID: ${result.application.id}.`,
      category: 'application',
      priority: 'high',
      recipients: [studentId],
      entityType: 'application',
      entityId: result.application.id,
      idempotencyKey: `apply_confirm:${result.application.id}`,
      createdBy: 'system',
    }).catch(() => {});

    res.status(201).json({
      success: true,
      data: result.application,
      message: 'Application submitted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// WITHDRAW APPLICATION (Student self-service or PO)
// ============================================================
export const withdrawApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['id'] as string;
    const { withdrawalReason } = req.body || {};
    const userId = req.user!.id;
    const isPoOrAdmin = req.user!.role === 'po' || req.user!.role === 'admin';

    const targetStudentId = isPoOrAdmin && req.query['studentId'] ? (req.query['studentId'] as string) : userId;

    const application = await prisma.driveApplication.findUnique({
      where: {
        driveId_studentId: {
          driveId,
          studentId: targetStudentId,
        },
      },
    });

    if (!application) throw ApiError.notFound('Application not found');

    // Challenge 17: Ownership verification
    if (!isPoOrAdmin && application.studentId !== userId) {
      throw ApiError.forbidden('You can only withdraw your own applications');
    }

    if (application.status === 'withdrawn') {
      throw ApiError.badRequest('Application has already been withdrawn');
    }

    // Stage rules: selected students cannot withdraw self-service without PO
    if (application.status === 'selected' && !isPoOrAdmin) {
      throw ApiError.badRequest(
        'Selected students cannot withdraw self-service. Please contact the placement office.'
      );
    }

    const updated = await prisma.driveApplication.update({
      where: { id: application.id },
      data: {
        status: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawalReason: withdrawalReason || (isPoOrAdmin ? 'Withdrawn by Placement Officer' : 'Withdrawn by student'),
      },
    });

    await audit(req.user!.id, 'drive.withdraw_application', 'drive_application', application.id, 'success', {
      driveId,
      studentId: targetStudentId,
      reason: updated.withdrawalReason,
    });

    res.json({
      success: true,
      data: updated,
      message: 'Application withdrawn successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET DRIVE APPLICATIONS (PO/Admin)
// ============================================================
export const getDriveApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['id'] as string;

    const drive = await prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive) throw ApiError.notFound('Placement drive not found');

    const applications = await prisma.driveApplication.findMany({
      where: { driveId },
      include: {
        resumeVersion: {
          select: {
            id: true,
            version: true,
            label: true,
            originalName: true,
            uploadedAt: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                cgpa: true,
                resumeUrl: true,
                knowledgeLevel: true,
                placementStatus: true,
                branch: { select: { id: true, name: true } },
                batch: { select: { id: true, name: true, graduationYear: true } },
              },
            },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const formatted = applications.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      name: a.student.name,
      email: a.student.email,
      cgpa: a.student.studentProfile?.cgpa ?? null,
      branch: a.student.studentProfile?.branch?.name ?? null,
      batch: a.student.studentProfile?.batch?.name ?? null,
      resumeUrl: a.student.studentProfile?.resumeUrl ?? null,
      resumeVersionId: a.resumeVersionId,
      resumeVersion: a.resumeVersion,
      resumeLabelAtSubmit: a.resumeLabelAtSubmit,
      knowledgeLevel: a.student.studentProfile?.knowledgeLevel ?? null,
      placementStatus: a.student.studentProfile?.placementStatus ?? null,
      status: a.status,
      appliedAt: a.appliedAt,
      withdrawnAt: a.withdrawnAt,
      withdrawalReason: a.withdrawalReason,
      eligibilityOverrideReason: a.eligibilityOverrideReason,
      overriddenBy: a.overriddenBy,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// UPDATE APPLICATION STATUS (PO/Admin)
// ============================================================
export const updateApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: driveId, applicationId } = req.params as { id: string; applicationId: string };
    const { status, eligibilityOverrideReason } = req.body;

    const application = await prisma.driveApplication.findUnique({
      where: { id: applicationId },
      include: { drive: true },
    });

    if (!application || application.driveId !== driveId) {
      throw ApiError.notFound('Application not found for this drive');
    }

    const updated = await prisma.driveApplication.update({
      where: { id: applicationId },
      data: {
        status,
        ...(eligibilityOverrideReason && {
          eligibilityOverrideReason,
          overriddenBy: req.user!.id,
        }),
      },
    });

    // Notify student about application update
    const dedupKey = `${driveId}:application_update:${applicationId}:${status}`;
    await enqueueDriveNotification(driveId, 'application_update', dedupKey);
    processPendingDriveNotifications().catch(() => {});

    await audit(req.user!.id, 'drive.application_status_update', 'drive_application', applicationId, 'success', {
      driveId,
      oldStatus: application.status,
      newStatus: status,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

