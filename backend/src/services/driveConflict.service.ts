import { prisma } from '../config/prisma.js';

interface Round { name?: string; date?: string; venue?: string; meetingLink?: string }

const OVERLAP_BUFFER_MS = 2 * 60 * 60 * 1000; // 2h buffer around round windows

/**
 * Detects schedule conflicts: another live drive whose recruitment round
 * times overlap AND whose eligible population (branches/batches) intersects.
 * Drives with disjoint populations are never flagged.
 */
export async function detectScheduleConflicts(input: {
  rounds: Round[];
  branchIds: number[];
  batchIds: number[];
  excludeDriveId?: string;
}) {
  const myWindows = input.rounds
    .map((r) => (r.date ? new Date(r.date).getTime() : null))
    .filter((t): t is number => t !== null);
  if (myWindows.length === 0) return [];

  const others = await prisma.placementDrive.findMany({
    where: {
      status: { in: ['published', 'active'] },
      ...(input.excludeDriveId && { id: { not: input.excludeDriveId } }),
      OR: [
        input.branchIds.length ? { eligibleBranches: { some: { branchId: { in: input.branchIds } } } } : {},
        input.batchIds.length ? { eligibleBatches: { some: { batchId: { in: input.batchIds } } } } : {},
      ].filter((w) => Object.keys(w).length > 0) as any,
    },
    include: {
      company: { select: { name: true } },
      eligibleBranches: { include: { branch: { select: { id: true, name: true } } } },
      eligibleBatches: { include: { batch: { select: { id: true, name: true } } } },
    },
  });

  const conflicts: any[] = [];
  for (const other of others) {
    const otherRounds = Array.isArray(other.rounds) ? (other.rounds as Round[]) : [];
    const otherWindows = otherRounds
      .map((r) => (r.date ? new Date(r.date).getTime() : null))
      .filter((t): t is number => t !== null);

    const overlaps = myWindows.some((mt) =>
      otherWindows.some((ot) => Math.abs(mt - ot) < OVERLAP_BUFFER_MS)
    );
    if (!overlaps) continue;

    const sharedBranches = other.eligibleBranches
      .map((eb: any) => eb.branch)
      .filter((b: any) => input.branchIds.includes(b.id))
      .map((b: any) => b.name);
    const sharedBatches = other.eligibleBatches
      .map((eb: any) => eb.batch)
      .filter((b: any) => input.batchIds.includes(b.id))
      .map((b: any) => b.name);

    conflicts.push({
      driveId: other.id,
      title: other.title,
      company: other.company.name,
      status: other.status,
      sharedBranches,
      sharedBatches,
      rounds: otherRounds.filter((r) => r.date),
    });
  }
  return conflicts;
}
