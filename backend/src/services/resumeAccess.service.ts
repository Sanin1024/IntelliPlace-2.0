import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { resumeDir } from './resumeValidation.service.js';
import { audit } from './audit.service.js';
import { ApiError } from '../utils/errors.js';

export interface UserContext {
  id: string;
  role: string;
}

/**
 * Validates whether the user is authorized to access the given resume version (Challenge 111).
 * Allowed: Resume owner (student), Placement Officer, Admin.
 * Throws 403 and records audit log if unauthorized.
 */
export async function assertResumeAccess(user: UserContext, resumeVersionId: string) {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: resumeVersionId },
    include: { student: { select: { id: true, name: true, email: true } } },
  });

  if (!version) {
    throw new ApiError(404, 'Resume version not found.');
  }

  const isOwner = user.id === version.studentId;
  const isAuthorizedStaff =
    user.role === 'po' || user.role === 'placement_officer' || user.role === 'admin';

  if (!isOwner && !isAuthorizedStaff) {
    await audit(user.id, 'resume.access_denied', 'resume_version', resumeVersionId, 'failure', {
      ownerStudentId: version.studentId,
      userRole: user.role,
    });
    throw new ApiError(403, 'Forbidden: You do not have permission to access this resume.');
  }

  return version;
}

/**
 * Checks storage consistency between DB record and disk (Challenge 110).
 * Throws 404 if file is physically missing.
 */
export async function getResumeFilePath(resumeVersionId: string): Promise<{
  version: any;
  filePath: string;
}> {
  const version = await prisma.resumeVersion.findUnique({
    where: { id: resumeVersionId },
  });

  if (!version) {
    throw new ApiError(404, 'Resume record not found.');
  }

  const filePath = path.join(resumeDir(version.studentId), version.storageKey);
  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'Resume file is missing from physical storage.');
  }

  return { version, filePath };
}

/**
 * Generates a secure time-limited hashed share token (Challenge 112).
 * Returns raw token to client once; stores SHA-256 hash in DB.
 */
export async function createAccessToken(
  resumeVersionId: string,
  createdBy: string,
  expiresInDays: number = 7
): Promise<{ token: string; expiresAt: Date }> {
  // Verify resume exists
  const version = await prisma.resumeVersion.findUnique({
    where: { id: resumeVersionId },
  });
  if (!version) {
    throw new ApiError(404, 'Resume version not found.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await prisma.resumeAccessToken.create({
    data: {
      resumeVersionId,
      tokenHash,
      expiresAt,
      createdBy,
    },
  });

  await audit(createdBy, 'resume.share_link_created', 'resume_version', resumeVersionId, 'success', {
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

/**
 * Resolves a share token and verifies it has not expired (Challenge 112).
 */
export async function resolveAccessToken(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const record = await prisma.resumeAccessToken.findUnique({
    where: { tokenHash },
    include: {
      resumeVersion: true,
    },
  });

  if (!record) {
    throw new ApiError(404, 'Resume share link is invalid or does not exist.');
  }

  if (new Date() > record.expiresAt) {
    throw new ApiError(410, 'This resume share link has expired.');
  }

  // Update usedAt timestamp
  await prisma.resumeAccessToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.resumeVersion;
}
