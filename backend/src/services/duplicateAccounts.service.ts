import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';

export interface DuplicateCluster {
  matchType: 'university_id' | 'email_variant' | 'name_branch_batch';
  key: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    universityId: string | null;
    branch: string | null;
    batch: string | null;
    createdAt: Date;
    academicStatus: string;
  }>;
}

/**
 * Challenge 21 & 34: Find candidate duplicate student accounts.
 */
export async function findDuplicateAccounts(): Promise<DuplicateCluster[]> {
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      studentProfile: {
        select: {
          universityId: true,
          academicStatus: true,
          branch: { select: { name: true } },
          batch: { select: { name: true } },
        },
      },
    },
  });

  const clusters: DuplicateCluster[] = [];

  // 1. Group by universityId
  const byUniversityId = new Map<string, typeof students>();
  for (const s of students) {
    const uid = s.studentProfile?.universityId?.trim().toUpperCase();
    if (uid) {
      if (!byUniversityId.has(uid)) byUniversityId.set(uid, []);
      byUniversityId.get(uid)!.push(s);
    }
  }

  for (const [uid, group] of byUniversityId.entries()) {
    if (group.length > 1) {
      clusters.push({
        matchType: 'university_id',
        key: uid,
        users: group.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          universityId: u.studentProfile?.universityId ?? null,
          branch: u.studentProfile?.branch?.name ?? null,
          batch: u.studentProfile?.batch?.name ?? null,
          createdAt: u.createdAt,
          academicStatus: u.studentProfile?.academicStatus ?? 'pending',
        })),
      });
    }
  }

  // 2. Group by normalized name + branch + batch
  const byNameAndCohort = new Map<string, typeof students>();
  for (const s of students) {
    const branch = s.studentProfile?.branch?.name ?? 'unknown';
    const batch = s.studentProfile?.batch?.name ?? 'unknown';
    const normName = s.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const key = `${normName}::${branch}::${batch}`;

    if (!byNameAndCohort.has(key)) byNameAndCohort.set(key, []);
    byNameAndCohort.get(key)!.push(s);
  }

  for (const [key, group] of byNameAndCohort.entries()) {
    if (group.length > 1) {
      // Avoid exact duplicate clusters if already matched by universityId
      const alreadyClustered = clusters.some(
        (c) => c.matchType === 'university_id' && group.every((u: any) => c.users.some((cu) => cu.id === u.id))
      );
      if (!alreadyClustered) {
        clusters.push({
          matchType: 'name_branch_batch',
          key,
          users: group.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            universityId: u.studentProfile?.universityId ?? null,
            branch: u.studentProfile?.branch?.name ?? null,
            batch: u.studentProfile?.batch?.name ?? null,
            createdAt: u.createdAt,
            academicStatus: u.studentProfile?.academicStatus ?? 'pending',
          })),
        });
      }
    }
  }

  return clusters;
}

/**
 * Challenge 34: Admin merge of duplicate accounts.
 * Safely resolves foreign keys and unique constraints in a transaction.
 */
export async function mergeAccounts(
  primaryUserId: string,
  duplicateUserId: string,
  adminId: string,
  reqIp?: string
) {
  if (primaryUserId === duplicateUserId) {
    throw new ApiError(400, 'Cannot merge an account into itself.');
  }

  const [primary, duplicate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: primaryUserId },
      include: { studentProfile: true },
    }),
    prisma.user.findUnique({
      where: { id: duplicateUserId },
      include: { studentProfile: true },
    }),
  ]);

  if (!primary) throw new ApiError(404, 'Primary user not found.');
  if (!duplicate) throw new ApiError(404, 'Duplicate user not found.');

  await prisma.$transaction(async (tx: any) => {
    // 1. Resolve DriveApplication conflicts
    const primaryApps = await tx.driveApplication.findMany({
      where: { studentId: primaryUserId },
    });
    const duplicateApps = await tx.driveApplication.findMany({
      where: { studentId: duplicateUserId },
    });

    const primaryDriveIds = new Set(primaryApps.map((a: any) => a.driveId));

    for (const dApp of duplicateApps) {
      if (primaryDriveIds.has(dApp.driveId)) {
        // Conflict on (driveId, studentId): delete duplicate application
        await tx.driveApplication.delete({ where: { id: dApp.id } });
      } else {
        // Safe to reassign
        await tx.driveApplication.update({
          where: { id: dApp.id },
          data: { studentId: primaryUserId },
        });
      }
    }

    // 2. Resolve SemesterResult conflicts
    const primarySems = await tx.semesterResult.findMany({
      where: { studentId: primaryUserId },
    });
    const duplicateSems = await tx.semesterResult.findMany({
      where: { studentId: duplicateUserId },
    });

    const primarySemNums = new Set(primarySems.map((s: any) => s.semesterNumber));

    for (const dSem of duplicateSems) {
      if (primarySemNums.has(dSem.semesterNumber)) {
        await tx.semesterResult.delete({ where: { id: dSem.id } });
      } else {
        await tx.semesterResult.update({
          where: { id: dSem.id },
          data: { studentId: primaryUserId },
        });
      }
    }

    // 3. Reassign BacklogRecords
    await tx.backlogRecord.updateMany({
      where: { studentId: duplicateUserId },
      data: { studentId: primaryUserId },
    });

    // 4. Reassign PreliminaryAssessments
    await tx.preliminaryAssessment.updateMany({
      where: { userId: duplicateUserId },
      data: { userId: primaryUserId },
    });

    // 5. TestAttempt & CodingSubmission
    await tx.testAttempt.updateMany({
      where: { userId: duplicateUserId },
      data: { userId: primaryUserId },
    });

    await tx.codingSubmission.updateMany({
      where: { userId: duplicateUserId },
      data: { userId: primaryUserId },
    });

    // 6. StudentTargetCompany
    const primaryTargets = await tx.studentTargetCompany.findMany({
      where: { userId: primaryUserId },
    });
    const duplicateTargets = await tx.studentTargetCompany.findMany({
      where: { userId: duplicateUserId },
    });
    const primaryCompIds = new Set(primaryTargets.map((t: any) => t.companyId));

    for (const dt of duplicateTargets) {
      if (primaryCompIds.has(dt.companyId)) {
        await tx.studentTargetCompany.delete({ where: { id: dt.id } });
      } else {
        await tx.studentTargetCompany.update({
          where: { id: dt.id },
          data: { userId: primaryUserId },
        });
      }
    }

    // 7. StudentResumeData
    const primaryResume = await tx.studentResumeData.findUnique({
      where: { userId: primaryUserId },
    });
    const duplicateResume = await tx.studentResumeData.findUnique({
      where: { userId: duplicateUserId },
    });

    if (duplicateResume) {
      if (!primaryResume) {
        await tx.studentResumeData.update({
          where: { userId: duplicateUserId },
          data: { userId: primaryUserId },
        });
      } else {
        await tx.studentResumeData.delete({ where: { userId: duplicateUserId } });
      }
    }

    // 8. Copy missing fields to primary profile
    if (duplicate.studentProfile && primary.studentProfile) {
      const updates: any = {};
      if (!primary.studentProfile.universityId && duplicate.studentProfile.universityId) {
        updates.universityId = duplicate.studentProfile.universityId;
      }
      if (!primary.studentProfile.resumeUrl && duplicate.studentProfile.resumeUrl) {
        updates.resumeUrl = duplicate.studentProfile.resumeUrl;
      }
      if (!primary.studentProfile.targetRole && duplicate.studentProfile.targetRole) {
        updates.targetRole = duplicate.studentProfile.targetRole;
      }
      if (primary.studentProfile.cgpa == null && duplicate.studentProfile.cgpa != null) {
        updates.cgpa = duplicate.studentProfile.cgpa;
      }
      if (Object.keys(updates).length > 0) {
        await tx.studentProfile.update({
          where: { userId: primaryUserId },
          data: updates,
        });
      }
    }

    // 9. Delete duplicate profile & user
    await tx.studentProfile.deleteMany({ where: { userId: duplicateUserId } });
    await tx.user.delete({ where: { id: duplicateUserId } });
  });

  await audit(
    adminId,
    'MERGE_ACCOUNTS',
    'user',
    primaryUserId,
    'success',
    {
      primaryUserId,
      primaryEmail: primary.email,
      duplicateUserId,
      duplicateEmail: duplicate.email,
      ip: reqIp,
    }
  );

  return { success: true, message: `Account ${duplicate.email} merged into ${primary.email}.` };
}
