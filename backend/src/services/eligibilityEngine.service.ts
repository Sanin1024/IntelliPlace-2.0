import { prisma } from '../config/prisma.js';
import { sendNotification } from './notification.service.js';
import {
  computeCgpaPrecise,
  convertCgpaToPercentage,
  getPercentageFormula,
  round2,
} from './cgpa.service.js';

// ============================================================
// TYPES
// ============================================================
export interface DriveCriteria {
  minCgpa?: number | null;
  minPercentage?: number | null;
  maxActiveBacklogs?: number | null;
  maxHistoricalBacklogs?: number | null;
  allowPendingSupplementary?: boolean; // Challenge 48
  maxGapYears?: number | null; // Challenge 49: total gap
  gapBetweenStages?: string[]; // 'tenth_twelfth' | 'twelfth_ug'
  requiresGapDocumentation?: boolean; // Challenge 49
  branchRules?: Record<string, { minCgpa?: number }>; // Challenge 42: branchId → overrides
  eligibleBranchIds: number[];
  eligibleBatchIds: number[];
  qualifications?: string | null;
}

export interface CriterionResult {
  key: string;
  label: string;
  mode: 'pass' | 'fail' | 'pending' | 'not_applicable';
  actualValue?: unknown;
  requiredValue?: unknown;
  explanation: string;
}

export interface EngineResult {
  studentId: string;
  driveId: string;
  criteriaVersion: number;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_VERIFICATION' | 'MANUAL_OVERRIDE';
  criteriaResults: CriterionResult[];
  warnings: string[];
  evaluatedAt: string;
  percentageMethod?: string;
}

// ============================================================
// CRITERIA RETRIEVAL (Challenges 38, 39)
// ============================================================

/** Synthesize criteria from legacy drive fields (v0) — backward compatible. */
function criteriaFromDrive(drive: any): DriveCriteria {
  return {
    minCgpa: drive.minCgpa ?? null,
    maxActiveBacklogs: drive.maxBacklogs ?? null,
    eligibleBranchIds: (drive.eligibleBranches || []).map((e: any) => e.branchId),
    eligibleBatchIds: (drive.eligibleBatches || []).map((e: any) => e.batchId),
  };
}

export async function getActiveCriteria(driveId: string) {
  const version = await prisma.driveEligibilityCriteria.findFirst({
    where: { driveId, supersededAt: null },
    orderBy: { version: 'desc' },
  });
  if (version) {
    return {
      version: version.version,
      criteria: version.criteria as unknown as DriveCriteria,
      record: version,
    };
  }
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: { eligibleBranches: true, eligibleBatches: true },
  });
  if (!drive) return null;
  return { version: 0, criteria: criteriaFromDrive(drive), record: null };
}

// ============================================================
// STUDENT CONTEXT (verified data only — Challenge 23, 37, 48, 49)
// ============================================================
interface StudentContext {
  profile: any;
  cgpa: number | null;
  cgpaConclusive: boolean;
  cgpaVerified: boolean;
  academicStatus: string;
  activeBacklogs: number; // verified active
  historicalBacklogs: number; // verified cleared (Ch 37)
  pendingSupplementary: number; // Challenge 48
  gapYears: number | null; // null = history incomplete (Ch 49)
  gapBreakdown: Array<{ stage: string; years: number }>;
  gapDocVerified: boolean;
}

async function buildStudentContext(studentId: string): Promise<StudentContext | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: { branch: true, batch: true },
  });
  if (!profile) return null;

  const cgpaComp = await computeCgpaPrecise(studentId);

  // Backlogs: verified only (Ch 37 — current vs historical)
  const backlogs = await prisma.backlogRecord.findMany({
    where: {
      studentId,
      OR: [{ verifiedAt: { not: null } }, { isVerified: true }],
    },
    select: { status: true },
  });
  const activeBacklogs = backlogs.filter((b: any) => b.status === 'active').length;
  const historicalBacklogs = backlogs.filter((b: any) => b.status === 'cleared').length;

  // Supplementary exams (Ch 48)
  const supps = await prisma.supplementaryExam.findMany({ where: { studentId } });
  const pendingSupplementary = supps.filter((s: any) => s.result === 'pending' || !s.verifiedAt).length;

  // Educational gaps (Ch 49) — missing history ⇒ gapYears null ⇒ PENDING
  const history = await prisma.educationHistory.findMany({
    where: { studentId },
    orderBy: { startYear: 'asc' },
  });

  let gapYears: number | null = null;
  const gapBreakdown: Array<{ stage: string; years: number }> = [];
  let gapDocVerified = false;

  if (history.length >= 2 && history.every((h: any) => h.startYear && h.endYear)) {
    gapYears = 0;
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const cur = history[i];
      const gap = Math.max(0, cur.startYear! - prev.endYear!);
      if (gap > 0) {
        const stage = `${prev.level}_to_${cur.level}`;
        gapBreakdown.push({ stage, years: gap });
        gapYears += gap;
      }
      if (cur.gapExplanation && cur.gapDocVerified) gapDocVerified = true;
    }
    gapYears = round2(gapYears);
  }

  return {
    profile,
    cgpa: cgpaComp.cgpa,
    cgpaConclusive: cgpaComp.conclusive,
    cgpaVerified: profile.cgpaVerified,
    academicStatus: profile.academicStatus,
    activeBacklogs,
    historicalBacklogs,
    pendingSupplementary,
    gapYears,
    gapBreakdown,
    gapDocVerified,
  };
}

// ============================================================
// EVALUATION (Challenges 36–50)
// ============================================================
export async function evaluateForDrive(
  studentId: string,
  driveId: string,
  opts: { persist?: boolean } = {}
): Promise<EngineResult | null> {
  const criteriaInfo = await getActiveCriteria(driveId);
  if (!criteriaInfo) return null;
  const ctx = await buildStudentContext(studentId);
  if (!ctx) return null;

  const c = criteriaInfo.criteria;
  const results: CriterionResult[] = [];
  const warnings: string[] = [];
  const { formula, description } = await getPercentageFormula();

  // ---------- 1. CGPA (Challenge 36/41/42 branch overrides) ----------
  const branchOverride = ctx.profile.branchId
    ? c.branchRules?.[String(ctx.profile.branchId)]?.minCgpa
    : undefined;
  const effectiveMinCgpa = branchOverride ?? c.minCgpa ?? null;

  if (effectiveMinCgpa != null) {
    const studentCgpa =
      ctx.academicStatus === 'rejected' ? null : ctx.cgpa ?? ctx.profile.cgpa ?? null;

    if (studentCgpa == null) {
      results.push({
        key: 'cgpa',
        label: 'Minimum CGPA',
        mode: 'pending',
        actualValue: null,
        requiredValue: effectiveMinCgpa,
        explanation: 'CGPA not available or academically rejected — verification required before eligibility can be determined.',
      });
    } else if (!ctx.cgpaVerified) {
      results.push({
        key: 'cgpa',
        label: 'Minimum CGPA',
        mode: 'pending',
        actualValue: studentCgpa,
        requiredValue: effectiveMinCgpa,
        explanation: `Your CGPA (${studentCgpa}) meets or is being checked against the requirement (${effectiveMinCgpa}+), but it is NOT yet verified by the placement office.`,
      });
      warnings.push('CGPA unverified');
    } else if (studentCgpa < effectiveMinCgpa) {
      results.push({
        key: 'cgpa',
        label: 'Minimum CGPA',
        mode: 'fail',
        actualValue: studentCgpa,
        requiredValue: effectiveMinCgpa,
        explanation: `CGPA ${studentCgpa} is below the required ${effectiveMinCgpa}${
          branchOverride ? ' (branch-specific requirement)' : ''
        }.`,
      });
    } else {
      results.push({
        key: 'cgpa',
        label: 'Minimum CGPA',
        mode: 'pass',
        actualValue: studentCgpa,
        requiredValue: effectiveMinCgpa,
        explanation: `Verified CGPA ${studentCgpa} meets the required ${effectiveMinCgpa}+.`,
      });
    }
    if (ctx.cgpa != null && !ctx.cgpaConclusive) {
      warnings.push('CGPA not conclusive (missing semester results)');
    }
  }

  // ---------- 2. Percentage (Challenge 44) ----------
  if (c.minPercentage != null) {
    const studentCgpa = ctx.cgpa ?? ctx.profile.cgpa ?? null;
    if (studentCgpa == null || !ctx.cgpaVerified) {
      results.push({
        key: 'percentage',
        label: 'Minimum Percentage',
        mode: 'pending',
        actualValue: null,
        requiredValue: c.minPercentage,
        explanation: 'Percentage cannot be computed — CGPA missing or unverified.',
      });
    } else {
      const pct = convertCgpaToPercentage(studentCgpa, formula);
      const pass = pct >= c.minPercentage;
      results.push({
        key: 'percentage',
        label: 'Minimum Percentage',
        mode: pass ? 'pass' : 'fail',
        actualValue: pct,
        requiredValue: c.minPercentage,
        explanation: `Converted percentage ${pct}% (method: ${description}) ${
          pass ? 'meets' : 'is below'
        } the required ${c.minPercentage}%.`,
      });
    }
  }

  // ---------- 3. Active backlogs (Challenge 37) ----------
  if (c.maxActiveBacklogs != null) {
    const pass = ctx.activeBacklogs <= c.maxActiveBacklogs;
    results.push({
      key: 'active_backlogs',
      label: 'Active Backlogs',
      mode: pass ? 'pass' : 'fail',
      actualValue: ctx.activeBacklogs,
      requiredValue: `≤ ${c.maxActiveBacklogs}`,
      explanation: pass
        ? `${ctx.activeBacklogs} active backlog(s) — within the allowed maximum of ${c.maxActiveBacklogs}.`
        : `${ctx.activeBacklogs} active backlog(s) exceed the allowed maximum of ${c.maxActiveBacklogs}.`,
    });
  }

  // ---------- 4. Historical backlogs (Challenge 37) ----------
  if (c.maxHistoricalBacklogs != null) {
    const pass = ctx.historicalBacklogs <= c.maxHistoricalBacklogs;
    results.push({
      key: 'historical_backlogs',
      label: 'Historical (Cleared) Backlogs',
      mode: pass ? 'pass' : 'fail',
      actualValue: ctx.historicalBacklogs,
      requiredValue: `≤ ${c.maxHistoricalBacklogs}`,
      explanation: pass
        ? `${ctx.historicalBacklogs} cleared backlog(s) — within the allowed historical maximum.`
        : `${ctx.historicalBacklogs} cleared backlog(s) exceed the company's historical backlog limit of ${c.maxHistoricalBacklogs}.`,
    });
  }

  // ---------- 5. Supplementary examinations (Challenge 48) ----------
  if (ctx.pendingSupplementary > 0 && c.allowPendingSupplementary === false) {
    results.push({
      key: 'supplementary',
      label: 'Supplementary Examinations',
      mode: 'fail',
      actualValue: ctx.pendingSupplementary,
      requiredValue: 'No pending supplementary exams',
      explanation: `${ctx.pendingSupplementary} supplementary examination result(s) are pending — this company does not allow pending supplementary exams.`,
    });
  } else if (ctx.pendingSupplementary > 0) {
    warnings.push(`${ctx.pendingSupplementary} supplementary exam(s) pending verification`);
  }

  // ---------- 6. Branch (Challenge 42 — FK matching, no free text) ----------
  if (c.eligibleBranchIds && c.eligibleBranchIds.length > 0) {
    if (ctx.profile.branchId == null) {
      results.push({
        key: 'branch',
        label: 'Eligible Branch',
        mode: 'pending',
        actualValue: null,
        requiredValue: 'branch set on profile',
        explanation: 'Your branch is not set on your profile — required before eligibility can be determined.',
      });
    } else {
      const pass = c.eligibleBranchIds.includes(ctx.profile.branchId);
      const branchName = ctx.profile.branch?.name;
      const names = await branchNames(c.eligibleBranchIds);
      results.push({
        key: 'branch',
        label: 'Eligible Branch',
        mode: pass ? 'pass' : 'fail',
        actualValue: branchName,
        requiredValue: names.join(', '),
        explanation: pass
          ? `Your branch (${branchName}) is eligible for this drive.`
          : `Your branch (${branchName}) is not in this drive's eligible branches: ${names.join(', ')}.`,
      });
    }
  }

  // ---------- 7. Batch (Challenge 43) ----------
  if (c.eligibleBatchIds && c.eligibleBatchIds.length > 0) {
    if (ctx.profile.batchId == null) {
      results.push({
        key: 'batch',
        label: 'Eligible Batch',
        mode: 'pending',
        actualValue: null,
        requiredValue: 'batch set on profile',
        explanation: 'Your batch is not set on your profile — required before eligibility can be determined.',
      });
    } else {
      const pass = c.eligibleBatchIds.includes(ctx.profile.batchId);
      const batchName = ctx.profile.batch?.name;
      const names = await batchNames(c.eligibleBatchIds);
      results.push({
        key: 'batch',
        label: 'Eligible Batch',
        mode: pass ? 'pass' : 'fail',
        actualValue: batchName,
        requiredValue: names.join(', '),
        explanation: pass
          ? `Your batch (${batchName}) is eligible for this drive.`
          : `Your batch (${batchName}) is not in this drive's eligible batches: ${names.join(', ')}.`,
      });
    }
  }

  // ---------- 8. Educational gaps (Challenge 49) ----------
  if (c.maxGapYears != null) {
    if (ctx.gapYears == null) {
      results.push({
        key: 'gap',
        label: 'Educational Gap',
        mode: 'pending',
        actualValue: null,
        requiredValue: `≤ ${c.maxGapYears} year(s) total`,
        explanation: 'Educational history is incomplete — gap duration cannot be determined. Submit your education history for verification.',
      });
    } else if (ctx.gapYears > c.maxGapYears) {
      if (c.requiresGapDocumentation && !ctx.gapDocVerified) {
        results.push({
          key: 'gap',
          label: 'Educational Gap',
          mode: 'pending',
          actualValue: ctx.gapYears,
          requiredValue: `≤ ${c.maxGapYears} (or verified documentation)`,
          explanation: `Total educational gap of ${ctx.gapYears} year(s) exceeds the permitted ${c.maxGapYears}. This company accepts gaps with documentation — your explanation has not yet been verified by the placement office.`,
        });
      } else {
        results.push({
          key: 'gap',
          label: 'Educational Gap',
          mode: 'fail',
          actualValue: ctx.gapYears,
          requiredValue: `≤ ${c.maxGapYears}`,
          explanation: `Total educational gap of ${ctx.gapYears} year(s) exceeds the permitted maximum of ${c.maxGapYears}. (${
            ctx.gapBreakdown.map((g) => `${g.stage}: ${g.years}y`).join('; ') || 'no breakdown'
          })`,
        });
      }
    } else {
      results.push({
        key: 'gap',
        label: 'Educational Gap',
        mode: 'pass',
        actualValue: ctx.gapYears,
        requiredValue: `≤ ${c.maxGapYears}`,
        explanation: `Total educational gap of ${ctx.gapYears} year(s) is within the permitted maximum.`,
      });
    }
  }

  // ---------- Aggregate (Challenges 41, 50) ----------
  const hasFail = results.some((r) => r.mode === 'fail');
  const hasPending = results.some((r) => r.mode === 'pending');
  const status: EngineResult['status'] = hasFail
    ? 'INELIGIBLE'
    : hasPending
    ? 'PENDING_VERIFICATION'
    : 'ELIGIBLE';

  const result: EngineResult = {
    studentId,
    driveId,
    criteriaVersion: criteriaInfo.version,
    status,
    criteriaResults: results,
    warnings,
    evaluatedAt: new Date().toISOString(),
    ...(c.minPercentage != null && { percentageMethod: description }),
  };

  if (opts.persist) {
    await persistEvaluation(result);
  }
  return result;
}

async function branchNames(ids: number[]): Promise<string[]> {
  const branches = await prisma.branch.findMany({ where: { id: { in: ids } }, select: { name: true } });
  return branches.map((b: any) => b.name);
}

async function batchNames(ids: number[]): Promise<string[]> {
  const batches = await prisma.batch.findMany({ where: { id: { in: ids } }, select: { name: true } });
  return batches.map((b: any) => b.name);
}

// ============================================================
// PERSISTENCE (Challenges 47, 50 — history preserved)
// ============================================================
export async function persistEvaluation(result: EngineResult, override?: { reason: string; by: string }) {
  return prisma.$transaction(async (tx: any) => {
    // Supersede previous current evaluation (history retained via isCurrent=false)
    await tx.eligibilityEvaluation.updateMany({
      where: { studentId: result.studentId, driveId: result.driveId, isCurrent: true },
      data: { isCurrent: false },
    });
    return tx.eligibilityEvaluation.create({
      data: {
        studentId: result.studentId,
        driveId: result.driveId,
        criteriaVersion: result.criteriaVersion,
        status: override ? 'MANUAL_OVERRIDE' : result.status,
        criteriaResults: {
          automatedStatus: result.status,
          criteria: result.criteriaResults,
          warnings: result.warnings,
          percentageMethod: result.percentageMethod,
        } as any,
        overrideReason: override?.reason ?? null,
        overriddenBy: override?.by ?? null,
      },
    });
  });
}

export async function getCurrentEvaluation(studentId: string, driveId: string) {
  return prisma.eligibilityEvaluation.findFirst({
    where: { studentId, driveId, isCurrent: true },
    orderBy: { evaluatedAt: 'desc' },
  });
}

/**
 * Fresh-or-cached evaluation: reuse the current evaluation only if it was
 * computed after the student's last academic update (Challenge 47).
 */
export async function getOrCreateEvaluation(studentId: string, driveId: string): Promise<EngineResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { academicUpdatedAt: true },
  });
  const current = await getCurrentEvaluation(studentId, driveId);

  if (
    current &&
    current.status !== 'MANUAL_OVERRIDE' &&
    profile?.academicUpdatedAt &&
    current.evaluatedAt > profile.academicUpdatedAt
  ) {
    const parsed = current.criteriaResults as any;
    return {
      studentId,
      driveId,
      criteriaVersion: current.criteriaVersion,
      status: current.status as EngineResult['status'],
      criteriaResults: parsed.criteria,
      warnings: parsed.warnings || [],
      evaluatedAt: current.evaluatedAt.toISOString(),
      percentageMethod: parsed.percentageMethod,
    };
  }

  const fresh = await evaluateForDrive(studentId, driveId, { persist: true });
  if (!fresh) throw new Error('Drive not found');
  return fresh;
}

// ============================================================
// RE-EVALUATION (Challenge 47)
// ============================================================
export async function reevaluateStudentForAppliedDrives(studentId: string) {
  const apps = await prisma.driveApplication.findMany({
    where: { studentId, status: { not: 'withdrawn' } },
    select: { driveId: true },
  });

  const outcomes = [];
  for (const app of apps) {
    const before = await getCurrentEvaluation(studentId, app.driveId);
    const fresh = await evaluateForDrive(studentId, app.driveId, { persist: true });
    if (!fresh) continue;

    // Notify PO if a SHORTLISTED student's status degraded
    const shortlist = await prisma.shortlistDecision.findUnique({
      where: { driveId_studentId: { driveId: app.driveId, studentId } },
    });

    if (shortlist && shortlist.action !== 'reject' && fresh.status === 'INELIGIBLE') {
      const pos = await prisma.user.findMany({ where: { role: 'po', isActive: true }, select: { id: true } });
      if (pos.length > 0) {
        const [student, drive] = await Promise.all([
          prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
          prisma.placementDrive.findUnique({ where: { id: app.driveId }, select: { title: true } }),
        ]);

        const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
        if (adminUser) {
          const n = await prisma.notification.create({
            data: {
              title: '⚠️ Shortlisted Student Now Ineligible',
              message: `${student?.name} was shortlisted for "${drive?.title}" but is now INELIGIBLE after a profile change. Review the evaluation and override if justified.`,
              createdBy: adminUser.id,
            },
          });
          await prisma.notificationRecipient.createMany({
            data: pos.map((po: any) => ({ notificationId: n.id, userId: po.id })),
          });
        }
      }
    }

    // Challenge 142: Notify student of eligibility status change
    if (before && before.status !== fresh.status) {
      const drive = await prisma.placementDrive.findUnique({
        where: { id: app.driveId },
        select: { title: true },
      });
      await sendNotification({
        title: 'Eligibility Status Changed',
        message: `Your eligibility for "${drive?.title || 'Placement Drive'}" has changed to ${fresh.status}.`,
        category: 'eligibility',
        priority: 'high',
        recipients: [studentId],
        entityType: 'drive',
        entityId: app.driveId,
        idempotencyKey: `eligibility_change:${app.driveId}:${studentId}:${fresh.status}`,
        createdBy: 'system',
      }).catch(() => {});
    }

    outcomes.push({ driveId: app.driveId, from: before?.status ?? null, to: fresh.status });
  }
  return outcomes;
}

// ============================================================
// CRITERIA VERSIONING (Challenge 39)
// ============================================================
export async function createCriteriaVersion(
  driveId: string,
  criteria: DriveCriteria,
  changeReason: string,
  actorId: string
) {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: { _count: { select: { applications: true } } },
  });
  if (!drive) throw new Error('Drive not found');
  if (!['draft', 'published', 'active'].includes(drive.status)) {
    throw new Error(`Cannot modify criteria for a drive in status "${drive.status}"`);
  }

  const latest = await prisma.driveEligibilityCriteria.findFirst({
    where: { driveId },
    orderBy: { version: 'desc' },
  });

  const created = await prisma.$transaction(async (tx: any) => {
    if (latest) {
      await tx.driveEligibilityCriteria.update({
        where: { id: latest.id },
        data: { supersededAt: new Date() },
      });
    }
    return tx.driveEligibilityCriteria.create({
      data: {
        driveId,
        version: (latest?.version ?? 0) + 1,
        criteria: criteria as any,
        changeReason,
        createdBy: actorId,
      },
    });
  });

  const reevaluations = [];
  if (drive._count.applications > 0 && ['published', 'active'].includes(drive.status)) {
    const apps = await prisma.driveApplication.findMany({
      where: { driveId, status: { not: 'withdrawn' } },
      select: { studentId: true },
    });
    for (const app of apps) {
      const previous = await getCurrentEvaluation(app.studentId, driveId);
      const fresh = await evaluateForDrive(app.studentId, driveId, { persist: true });
      if (!fresh) continue;
      reevaluations.push({ studentId: app.studentId, from: previous?.status, to: fresh.status });

      // Significant change communication (Challenge 39)
      if (previous && previous.status === 'ELIGIBLE' && fresh.status !== 'ELIGIBLE') {
        const failed = fresh.criteriaResults
          .filter((r) => r.mode === 'fail' || r.mode === 'pending')
          .map((r) => r.explanation)
          .join(' ');
        const n = await prisma.notification.create({
          data: {
            title: 'Eligibility Changed After Criteria Update',
            message: `The eligibility criteria for "${drive.title}" were updated, and your eligibility is now: ${fresh.status}. ${failed} Contact the placement office if you believe this is incorrect.`,
            createdBy: actorId,
          },
        });
        await prisma.notificationRecipient.createMany({
          data: [{ notificationId: n.id, userId: app.studentId }],
        });
      }
    }
  }

  return { criteria: created, reevaluations };
}

