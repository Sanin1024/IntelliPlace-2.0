import { prisma } from '../config/prisma.js';

const normalize = (s?: string | null) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Detects potential duplicate drives: same company + same normalized
 * job role + same employment type + same location + overlapping eligible
 * batches, among live drives (draft/published/active).
 * Does NOT block legitimate repeat drives — controller requires an
 * explicit duplicateOverrideReason to proceed past a match.
 */
export async function findDuplicateDrives(input: {
  companyId: string;
  jobRole: string;
  employmentType: string;
  location?: string | null;
  batchIds: number[];
  excludeDriveId?: string;
}) {
  const jobRoleNorm = normalize(input.jobRole);
  const locationNorm = normalize(input.location);

  const candidates = await prisma.placementDrive.findMany({
    where: {
      status: { in: ['draft', 'published', 'active'] },
      companyId: input.companyId,
      ...(input.excludeDriveId && { id: { not: input.excludeDriveId } }),
      eligibleBatches: input.batchIds.length
        ? { some: { batchId: { in: input.batchIds } } }
        : undefined,
    },
    include: { company: { select: { name: true } }, eligibleBatches: { include: { batch: true } } },
  });

  return candidates.filter((c: any) => {
    const sameRole = normalize(c.jobRole) === jobRoleNorm;
    const sameType = c.employmentType === input.employmentType;
    const sameLocation = normalize(c.location) === locationNorm;
    return sameRole && sameType && sameLocation;
  });
}
