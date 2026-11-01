// Challenges 186, 188, 190, 191, 199, 200: Admin Management Service
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { validateAcademicMapping } from './academic.service.js';

// ============================================================
// SOFT DELETE & RECOVERY (Challenges 186, 200)
// ============================================================
export async function softDeleteEntity(
  entity: 'user' | 'company' | 'drive',
  id: string,
  actorId: string
) {
  const model: any =
    entity === 'user' ? prisma.user : entity === 'company' ? prisma.company : prisma.placementDrive;

  // Prevent self-deletion
  if (entity === 'user' && id === actorId) {
    throw ApiError.badRequest('Administrators cannot delete their own account.');
  }

  // Prevent deletion of active entities with dependencies (e.g. active drives)
  if (entity === 'company') {
    const activeDrives = await prisma.placementDrive.count({
      where: { companyId: id, status: { in: ['published'] }, deletedAt: null },
    });
    if (activeDrives > 0) {
      throw ApiError.badRequest(
        'Cannot delete a company with active placement drives. Archive or cancel the drives first.'
      );
    }
  }

  const updated = await model.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit(actorId, `${entity}.soft_delete`, entity, id, 'success');
  return updated;
}

export async function restoreEntity(
  entity: 'user' | 'company' | 'drive',
  id: string,
  actorId: string
) {
  const model: any =
    entity === 'user' ? prisma.user : entity === 'company' ? prisma.company : prisma.placementDrive;

  const updated = await model.update({
    where: { id },
    data: { deletedAt: null },
  });

  await audit(actorId, `${entity}.restore`, entity, id, 'success');
  return updated;
}

// ============================================================
// BULK IMPORT (Challenges 190, 191)
// ============================================================
export interface ImportRow {
  name: string;
  email: string;
  universityId?: string;
  branchName: string;
  batchName: string;
  admissionYear?: number;
  cgpa?: number;
}

export async function bulkImportStudents(rows: ImportRow[], actorId: string) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; email: string; error: string }>,
  };

  let branches: Array<{ id: number; name: string }> = [];
  let batches: Array<{ id: number; name: string }> = [];

  // Challenge 284: Pre-hash password once for bulk import efficiency
  const defaultPasswordHash = await bcrypt.hash('Default@123', 10);

  // Challenge 284: Pre-fetch existing emails and university IDs to eliminate N+1 lookup queries
  const existingEmails = new Set<string>();
  const existingUnivIds = new Set<string>();
  const seenEmailsInBatch = new Set<string>();
  const seenUnivIdsInBatch = new Set<string>();

  try {
    branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    batches = await prisma.batch.findMany({ select: { id: true, name: true } });

    const incomingEmails = rows.map((r) => r.email?.trim().toLowerCase()).filter(Boolean);
    const incomingUniv = rows.map((r) => r.universityId?.trim()).filter(Boolean) as string[];

    if (incomingEmails.length > 0 || incomingUniv.length > 0) {
      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { in: incomingEmails } },
            ...(incomingUniv.length > 0
              ? [{ studentProfile: { universityId: { in: incomingUniv } } }]
              : []),
          ],
        },
        select: {
          email: true,
          studentProfile: { select: { universityId: true } },
        },
      });

      for (const u of existingUsers) {
        if (u.email) existingEmails.add(u.email.toLowerCase());
        if (u.studentProfile?.universityId) existingUnivIds.add(u.studentProfile.universityId.toLowerCase());
      }
    }
  } catch (err) {
    console.warn('bulkImportStudents DB load error (offline safe):', (err as Error).message);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // 1. Basic validation
      if (!row.name || !row.email || !row.branchName || !row.batchName) {
        throw new Error('Missing required fields (name, email, branchName, batchName).');
      }

      const normalizedEmail = row.email.trim().toLowerCase();
      const normalizedUnivId = row.universityId?.trim().toLowerCase();

      const branch = branches.find(
        (b) => b.name.toLowerCase() === row.branchName.trim().toLowerCase()
      );
      if (!branch) {
        throw new Error(`Branch "${row.branchName}" not found.`);
      }

      const batch = batches.find(
        (b) =>
          b.name.toLowerCase() === row.batchName.trim().toLowerCase() ||
          b.name.includes(row.batchName.trim())
      );
      if (!batch) {
        throw new Error(`Batch "${row.batchName}" not found.`);
      }

      // 2. Academic mapping validation (Challenge 22, 35)
      const academicCheck = await validateAcademicMapping({
        branchId: branch.id,
        batchId: batch.id,
        admissionYear: row.admissionYear,
      });
      if (!academicCheck.valid) {
        throw new Error(academicCheck.error || 'Invalid branch/batch academic mapping.');
      }

      // 3. Duplicate checks in pre-fetched cache and batch duplicates (Challenge 191, 284)
      if (
        existingEmails.has(normalizedEmail) ||
        seenEmailsInBatch.has(normalizedEmail) ||
        (normalizedUnivId && (existingUnivIds.has(normalizedUnivId) || seenUnivIdsInBatch.has(normalizedUnivId)))
      ) {
        throw new Error('Student with this email or university ID already exists.');
      }

      seenEmailsInBatch.add(normalizedEmail);
      if (normalizedUnivId) seenUnivIdsInBatch.add(normalizedUnivId);

      // 4. Create User and StudentProfile
      await prisma.user.create({
        data: {
          name: row.name.trim(),
          email: normalizedEmail,
          passwordHash: defaultPasswordHash,
          role: 'student',
          studentProfile: {
            create: {
              universityId: row.universityId?.trim() || null,
              branchId: branch.id,
              batchId: batch.id,
              admissionYear: row.admissionYear || null,
              cgpa: typeof row.cgpa === 'number' ? row.cgpa : null,
              cgpaVerified: false,
              academicStatus: 'pending',
              profileUpdatedAt: new Date(),
              academicUpdatedAt: new Date(),
            },
          },
          assessmentsAssigned: {
            create: {
              status: 'pending_scheduling',
              deadline: new Date(Date.now() + 7 * 86400000),
            },
          },
        },
      });

      results.success++;
    } catch (err: any) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        email: row.email || 'N/A',
        error: err.message || 'Unknown import error',
      });
    }
  }

  try {
    await audit(actorId, 'student.bulk_import', 'system', null, 'success', {
      success: results.success,
      failed: results.failed,
    });
  } catch (err) {
    console.warn('bulkImport audit log failed (offline safe):', (err as Error).message);
  }

  return results;
}

// ============================================================
// SYSTEM CONFIG (Challenge 199)
// ============================================================
export async function updateSystemSetting(key: string, value: string, actorId: string) {
  const existing = await prisma.systemSetting.findUnique({ where: { key } });

  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key },
      update: { value, updatedBy: actorId },
      create: { key, value, updatedBy: actorId },
    }),
    prisma.systemSettingHistory.create({
      data: {
        key,
        oldValue: existing?.value || null,
        newValue: value,
        changedBy: actorId,
      },
    }),
  ]);

  try {
    await audit(actorId, 'settings.update', 'system_setting', key, 'success', {
      oldValue: existing?.value,
      newValue: value,
    });
  } catch (err) {
    console.warn('updateSystemSetting audit log failed (offline safe):', (err as Error).message);
  }

  return { key, value };
}

