import { prisma } from '../config/prisma.js';
import { audit } from './audit.service.js';
import { getOrCreateEvaluation } from './eligibilityEngine.service.js';

const OVERLAP_BUFFER_MS = 2 * 60 * 60 * 1000;

/**
 * Cross-drive conflict detection (Challenge 45):
 * the student is shortlisted/selected in another live drive whose rounds
 * overlap this drive's rounds within a 2-hour buffer.
 */
export async function findShortlistConflicts(studentId: string, targetDriveId: string) {
  const target = await prisma.placementDrive.findUnique({ where: { id: targetDriveId } });
  if (!target) return [];

  const targetRounds = (Array.isArray(target.rounds) ? target.rounds : [])
    .map((r: any) => (r.date ? new Date(r.date).getTime() : null))
    .filter((t: any): t is number => t !== null && !isNaN(t));

  if (targetRounds.length === 0) return [];

  const decisions = await prisma.shortlistDecision.findMany({
    where: { studentId, action: { in: ['shortlist', 'select'] } },
    include: { drive: { include: { company: { select: { name: true } } } } },
  });

  const conflicts = [];
  for (const d of decisions) {
    if (d.driveId === targetDriveId) continue;
    if (!['published', 'active', 'closed'].includes(d.drive.status)) continue;

    const otherRounds = (Array.isArray(d.drive.rounds) ? d.drive.rounds : [])
      .map((r: any) => (r.date ? new Date(r.date).getTime() : null))
      .filter((o: any): o is number => o !== null && !isNaN(o));

    const overlaps = targetRounds.some((t: number) =>
      otherRounds.some((o: number) => Math.abs(t - o) < OVERLAP_BUFFER_MS)
    );

    if (overlaps) {
      conflicts.push({
        driveId: d.driveId,
        title: d.drive.title,
        company: d.drive.company.name,
        existingAction: d.action,
        rounds: d.drive.rounds,
      });
    }
  }
  return conflicts;
}

/**
 * Bulk shortlist (Challenge 40): every student is revalidated against the
 * CURRENT evaluation before the decision is recorded. Invalid candidates
 * are rejected individually with full explanations.
 */
export async function shortlistStudents(
  driveId: string,
  studentIds: string[],
  actorId: string,
  opts: { conflictOverrideReason?: string } = {}
) {
  const results = [];

  for (const studentId of studentIds) {
    // 1. Mandatory revalidation via the centralized engine (Challenge 40)
    const evaluation = await getOrCreateEvaluation(studentId, driveId);

    if (evaluation.status === 'INELIGIBLE' || evaluation.status === 'PENDING_VERIFICATION') {
      const failed = evaluation.criteriaResults
        .filter((r) => r.mode === 'fail' || r.mode === 'pending')
        .map((r) => r.explanation);
      results.push({
        studentId,
        ok: false,
        reason: `Shortlist rejected — ${evaluation.status}: ${failed.join(' ')}`,
      });
      await audit(actorId, 'shortlist.rejected', 'student', studentId, 'failure', {
        driveId,
        status: evaluation.status,
        reasons: failed,
      });
      continue;
    }

    // 2. Cross-drive conflict check (Challenge 45)
    const conflicts = await findShortlistConflicts(studentId, driveId);
    if (conflicts.length > 0 && !opts.conflictOverrideReason) {
      results.push({
        studentId,
        ok: false,
        conflicts,
        reason: `Schedule conflict with: ${conflicts
          .map((c) => c.title)
          .join(', ')}. Provide a conflict override justification to proceed.`,
      });
      continue;
    }

    // 3. Record decision with evaluation snapshot (Challenge 50 audit trail)
    const evaluationRecord = await prisma.eligibilityEvaluation.findFirst({
      where: { studentId, driveId, isCurrent: true },
      orderBy: { evaluatedAt: 'desc' },
    });

    await prisma.$transaction(async (tx: any) => {
      await tx.shortlistDecision.upsert({
        where: { driveId_studentId: { driveId, studentId } },
        update: {
          action: 'shortlist',
          evaluationId: evaluationRecord?.id ?? null,
          conflictOverrideReason: opts.conflictOverrideReason ?? null,
          decidedBy: actorId,
          decidedAt: new Date(),
        },
        create: {
          driveId,
          studentId,
          action: 'shortlist',
          evaluationId: evaluationRecord?.id ?? null,
          conflictOverrideReason: opts.conflictOverrideReason ?? null,
          decidedBy: actorId,
        },
      });

      await tx.driveApplication.updateMany({
        where: { driveId, studentId },
        data: { status: 'shortlisted' },
      });

      // Notify the student
      const drive = await tx.placementDrive.findUnique({
        where: { id: driveId },
        select: { title: true },
      });

      const notif = await tx.notification.create({
        data: {
          title: `Shortlisted: ${drive?.title}`,
          message: 'Congratulations! You have been shortlisted. Check the drive page for round schedules.',
          createdBy: actorId,
        },
      });

      await tx.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: studentId,
        },
      });
    });

    await audit(actorId, 'shortlist.decision', 'shortlist_decision', `${driveId}:${studentId}`, 'success', {
      action: 'shortlist',
      evaluationId: evaluationRecord?.id,
      conflictsOverridden: conflicts.length > 0,
    });

    results.push({ studentId, ok: true, conflictsOverridden: conflicts.length > 0 });
  }

  return results;
}

