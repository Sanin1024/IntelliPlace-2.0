import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { logDataAccess } from '../services/privacy.service.js';
import {
  MAX_SIZE_MB,
  validateResumeBuffer,
  resumeDir,
  ensureDir,
  safeUnlink,
} from '../services/resumeValidation.service.js';
import {
  parseResumeBuffer,
  compareWithProfile,
} from '../services/resumeParsing.service.js';
import {
  checkResumeFreshness,
  getSkillGapAnalysis,
  getFreshnessThresholdDays,
} from '../services/resumeAnalysis.service.js';
import {
  assertResumeAccess,
  getResumeFilePath,
  createAccessToken,
  resolveAccessToken,
} from '../services/resumeAccess.service.js';

/**
 * GET /api/resumes/versions — list authenticated student's resume versions
 */
export const listMyResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const versions = await prisma.resumeVersion.findMany({
      where: { studentId },
      include: {
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { version: 'desc' },
    });

    const freshness = await checkResumeFreshness(studentId);

    res.json({
      success: true,
      data: {
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          label: v.label,
          originalName: v.originalName,
          mimeType: v.mimeType,
          fileSize: v.fileSize,
          isActive: v.isActive,
          parseStatus: v.parseStatus,
          uploadedAt: v.uploadedAt,
          applicationsCount: v._count.applications,
          isLocked: v._count.applications > 0,
          privacyScan: v.privacyScan,
        })),
        freshness,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/resumes/upload — upload and parse a new resume version (Challenges 101, 102, 103, 105, 109, 110)
 */
export const uploadResume = async (req: Request, res: Response, next: NextFunction) => {
  const studentId = req.user!.id;
  const file = (req as any).file as Express.Multer.File | undefined;

  if (!file || !file.buffer) {
    return next(new ApiError(400, 'No file uploaded. Attach a PDF or DOCX file under "file".'));
  }

  // 1. Size limit check (Challenge 102)
  const maxMb = await MAX_SIZE_MB();
  if (file.buffer.length > maxMb * 1024 * 1024) {
    return next(
      new ApiError(400, `File size (${(file.buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${maxMb}MB.`)
    );
  }

  // 2. Content-based validation (Challenges 101, 103)
  const validation = validateResumeBuffer(file.buffer, file.mimetype, file.originalname);
  if (!validation.valid || !validation.detectedType) {
    return next(new ApiError(400, validation.error || 'Invalid file content.'));
  }

  // 3. Prepare storage paths
  const sDir = resumeDir(studentId);
  ensureDir(sDir);
  const storageKey = `${crypto.randomUUID()}.${validation.detectedType}`;
  const tempPath = path.join(sDir, `.tmp_${storageKey}`);
  const finalPath = path.join(sDir, storageKey);

  try {
    // Write to temp file first (Challenge 110)
    fs.writeFileSync(tempPath, file.buffer);

    // Parse extracted content
    const parseResult = await parseResumeBuffer(file.buffer, validation.detectedType);

    // Transaction guarantees versioning and single-active invariant
    const createdVersion = await prisma.$transaction(async (tx) => {
      const agg = await tx.resumeVersion.aggregate({
        where: { studentId },
        _max: { version: true },
      });
      const nextVersion = (agg._max.version || 0) + 1;

      // Deactivate all older versions
      await tx.resumeVersion.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false },
      });

      const label =
        typeof req.body.label === 'string' && req.body.label.trim().length > 0
          ? req.body.label.trim()
          : `Resume v${nextVersion}`;

      return tx.resumeVersion.create({
        data: {
          studentId,
          version: nextVersion,
          label,
          originalName: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          fileSize: file.buffer.length,
          isActive: true,
          parseStatus: parseResult.parseStatus,
          parsedData: parseResult.parsedData ? (parseResult.parsedData as any) : undefined,
          privacyScan: parseResult.privacyScan ? (parseResult.privacyScan as any) : undefined,
        },
      });
    });

    // Commit file rename after DB transaction succeeds
    fs.renameSync(tempPath, finalPath);

    // Audit upload
    await audit(studentId, 'resume.upload', 'resume_version', createdVersion.id, 'success', {
      version: createdVersion.version,
      originalName: file.originalname,
      parseStatus: createdVersion.parseStatus,
    });

    // Send confirmation notification
    try {
      await prisma.notification.create({
        data: {
          title: 'Resume Uploaded & Processed',
          message: `Your resume "${createdVersion.label}" (v${createdVersion.version}) was successfully uploaded and set as active.`,
          createdBy: studentId,
          recipients: {
            create: { userId: studentId },
          },
        },
      });
    } catch {
      // Non-fatal notification failure
    }

    res.status(201).json({
      success: true,
      data: {
        version: createdVersion,
        privacyScan: parseResult.privacyScan,
        parsedSummary: parseResult.parsedData
          ? {
              email: parseResult.parsedData.email,
              phone: parseResult.parsedData.phone,
              skillsCount: parseResult.parsedData.skills.length,
              skills: parseResult.parsedData.skills,
              links: parseResult.parsedData.links,
              confidence: parseResult.parsedData.confidence,
            }
          : null,
      },
      message: 'Resume uploaded and activated successfully.',
    });
  } catch (err) {
    safeUnlink(tempPath);
    next(err);
  }
};

/**
 * PATCH /api/resumes/:id/activate — set a version as active (Challenge 109)
 */
export const activateVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const id = req.params['id'] as string;

    const version = await prisma.resumeVersion.findUnique({ where: { id } });
    if (!version || version.studentId !== studentId) {
      throw new ApiError(404, 'Resume version not found.');
    }

    // Verify storage consistency before activating (Challenge 110)
    await getResumeFilePath(id);

    await prisma.$transaction(async (tx) => {
      await tx.resumeVersion.updateMany({
        where: { studentId, isActive: true },
        data: { isActive: false },
      });

      await tx.resumeVersion.update({
        where: { id },
        data: { isActive: true },
      });
    });

    await audit(studentId, 'resume.activate', 'resume_version', id, 'success', {
      version: version.version,
    });

    res.json({
      success: true,
      message: `Resume v${version.version} ("${version.label}") is now your active resume.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/resumes/:id/label — update label of a version (Challenge 114)
 * Blocked if version is already attached to any drive application.
 */
export const setLabel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const id = req.params['id'] as string;
    const label = req.body.label?.trim();

    if (!label) {
      throw new ApiError(400, 'Label cannot be empty.');
    }

    const version = await prisma.resumeVersion.findUnique({ where: { id } });
    if (!version || version.studentId !== studentId) {
      throw new ApiError(404, 'Resume version not found.');
    }

    // Challenge 114: Block modification if submitted to any drive
    const applicationsCount = await prisma.driveApplication.count({
      where: { resumeVersionId: id },
    });

    if (applicationsCount > 0) {
      throw new ApiError(
        400,
        'Cannot rename this resume version because it has already been submitted to placement drives. Historical applications preserve their submitted snapshot.'
      );
    }

    const updated = await prisma.resumeVersion.update({
      where: { id },
      data: { label },
    });

    await audit(studentId, 'resume.label_update', 'resume_version', id, 'success', { label });

    res.json({
      success: true,
      data: updated,
      message: 'Resume label updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resumes/:id/analysis — detailed analysis of a resume version (Challenges 106, 107, 108)
 */
export const getAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const version = await assertResumeAccess(req.user!, id);

    let profileDiff = null;
    if (version.parsedData) {
      profileDiff = await compareWithProfile(version.studentId, version.parsedData as any);
    }

    const skillGap = await getSkillGapAnalysis(version.studentId);

    res.json({
      success: true,
      data: {
        version: {
          id: version.id,
          version: version.version,
          label: version.label,
          parseStatus: version.parseStatus,
          parsedData: version.parsedData,
          privacyScan: version.privacyScan,
          uploadedAt: version.uploadedAt,
        },
        profileDiff,
        skillGap,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resumes/recommendations — returns skill gap analysis and recommendations for current student (Challenge 107)
 */
export const getMyRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const analysis = await getSkillGapAnalysis(studentId);
    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/resumes/:id/confirm-parsed — import confirmed extracted skills/summary into builder data (Challenge 108)
 * Never modifies verified academic profile records (CGPA, branch, etc.).
 */
export const confirmParsedData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const id = req.params['id'] as string;

    const version = await prisma.resumeVersion.findUnique({ where: { id } });
    if (!version || version.studentId !== studentId) {
      throw new ApiError(404, 'Resume version not found.');
    }

    const { skills, summary, links } = req.body;

    // Update student resume builder data (unverified personal profile)
    await prisma.studentResumeData.upsert({
      where: { userId: studentId },
      update: {
        ...(Array.isArray(skills) && { skills }),
        ...(typeof summary === 'string' && { summary }),
        ...(links && { links }),
      },
      create: {
        userId: studentId,
        skills: Array.isArray(skills) ? skills : [],
        summary: typeof summary === 'string' ? summary : undefined,
        links: links || undefined,
      },
    });

    // Mark version as parsed
    await prisma.resumeVersion.update({
      where: { id },
      data: { parseStatus: 'parsed' },
    });

    await audit(studentId, 'resume.confirm_parsed_data', 'resume_version', id, 'success', {
      skillsCount: Array.isArray(skills) ? skills.length : 0,
    });

    res.json({
      success: true,
      message: 'Resume builder skills and summary updated. Verified academic fields remain unchanged.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resumes/:id/download — authenticated streaming download (Challenge 111)
 */
export const downloadVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const version = await assertResumeAccess(req.user!, id);
    const { filePath } = await getResumeFilePath(id);

    await audit(req.user!.id, 'resume.download', 'resume_version', id, 'success', {
      studentId: version.studentId,
      version: version.version,
    });

    // Challenge 328: Log data access for sensitive resume downloads
    await logDataAccess(
      req.user!.id,
      version.studentId,
      'resume',
      'download',
      req.headers['x-request-id'] as string | undefined
    );

    res.setHeader('Content-Type', version.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(version.originalName)}"`
    );
    res.setHeader('Content-Length', version.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/resumes/:id/link — generate time-limited hashed share token (Challenge 112)
 */
export const generateShareLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await assertResumeAccess(req.user!, id);

    const days = parseInt(req.body.expiresInDays || '7', 10);
    const result = await createAccessToken(id, req.user!.id, isNaN(days) ? 7 : days);

    res.json({
      success: true,
      data: {
        token: result.token,
        shareUrl: `/api/resumes/link/${result.token}`,
        expiresAt: result.expiresAt,
      },
      message: `Temporary share link generated, valid until ${result.expiresAt.toISOString()}.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resumes/link/:token — public token-authenticated streaming download (Challenge 112)
 */
export const downloadByShareLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params['token'] as string;
    const version = await resolveAccessToken(token);
    const { filePath } = await getResumeFilePath(version.id);

    res.setHeader('Content-Type', version.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(version.originalName)}"`
    );
    res.setHeader('Content-Length', version.fileSize);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resumes/stale-report — PO report of students with stale or missing resumes (Challenge 115)
 */
export const getStaleResumes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thresholdDays = await getFreshnessThresholdDays();

    const students = await prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: {
          select: {
            branch: { select: { name: true } },
            batch: { select: { name: true } },
            placementStatus: true,
          },
        },
        resumeVersions: {
          where: { isActive: true },
          select: {
            id: true,
            version: true,
            label: true,
            uploadedAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = Date.now();
    const staleList = [];

    for (const s of students) {
      const active = s.resumeVersions[0];
      if (!active) {
        staleList.push({
          studentId: s.id,
          name: s.name,
          email: s.email,
          branch: s.studentProfile?.branch?.name || null,
          batch: s.studentProfile?.batch?.name || null,
          placementStatus: s.studentProfile?.placementStatus || 'not_placed',
          hasResume: false,
          daysSinceUpload: null,
          daysOld: null,
          lastUploadedAt: null,
          isStale: true,
          activeVersion: null,
        });
      } else {
        const days = Math.floor((now - new Date(active.uploadedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (days > thresholdDays) {
          staleList.push({
            studentId: s.id,
            name: s.name,
            email: s.email,
            branch: s.studentProfile?.branch?.name || null,
            batch: s.studentProfile?.batch?.name || null,
            placementStatus: s.studentProfile?.placementStatus || 'not_placed',
            hasResume: true,
            daysSinceUpload: days,
            daysOld: days,
            lastUploadedAt: active.uploadedAt,
            isStale: true,
            activeVersion: {
              id: active.id,
              version: active.version,
              label: active.label,
              uploadedAt: active.uploadedAt,
            },
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        thresholdDays,
        totalStale: staleList.length,
        students: staleList,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/resumes/:studentId/remind — PO sends resume update reminder to student (Challenge 115)
 * Never auto-rejects student from drives.
 */
export const remindStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['studentId'] as string;
    const actorId = req.user!.id;

    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'student' },
    });

    if (!student) {
      throw new ApiError(404, 'Student not found.');
    }

    await prisma.notification.create({
      data: {
        title: 'Resume Update Recommended',
        message: 'The Placement Office recommends updating your resume before upcoming placement drives to highlight your latest skills and projects.',
        createdBy: actorId,
        recipients: {
          create: { userId: studentId },
        },
      },
    });

    await audit(actorId, 'resume.reminder_sent', 'user', studentId, 'success');

    res.json({
      success: true,
      message: `Reminder sent to ${student.name}.`,
    });
  } catch (err) {
    next(err);
  }
};
