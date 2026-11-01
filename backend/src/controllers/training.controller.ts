import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import {
  syncAssignmentStatuses,
  getStudentSchedule,
  getFallingBehind,
  rescheduleSession,
  sendTrainingReminders,
} from '../services/trainingSchedule.service.js';
import {
  runAllLinkChecks,
  checkResourceLink,
  canAccessResource,
  findDuplicateResources,
  sha256Hex,
  createResourceVersion,
  getStaleResources,
} from '../services/resourceManagement.service.js';
import {
  checkPrerequisites,
  recommendResources,
  evaluateModuleCompletion,
  grantPrerequisiteException,
} from '../services/learningPath.service.js';
import {
  getTrainingEffectiveness,
  getContentRelevance,
  toEffectivenessCsv,
} from '../services/trainingAnalytics.service.js';

// ============================================================
// SESSIONS (Challenge 51)
// ============================================================
export const createSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      topicId,
      moduleId,
      scheduledAt,
      durationMins,
      learningObjectives,
      location,
      meetingLink,
    } = req.body;

    if (moduleId) {
      const m = await prisma.learningModule.findUnique({ where: { id: moduleId } });
      if (!m) throw ApiError.badRequest('Module not found');
    }

    const session = await prisma.trainingSession.create({
      data: {
        title,
        description,
        topicId: topicId || null,
        moduleId: moduleId || null,
        scheduledAt: new Date(scheduledAt),
        durationMins,
        learningObjectives: learningObjectives || [],
        location,
        meetingLink,
        createdBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'training.session_create', 'training_session', session.id, 'success', { title });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};

export const assignStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.id as string;
    const { studentIds, batchId, levelOverrideReason } = req.body;

    const session = await prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { module: true },
    });
    if (!session) throw ApiError.notFound('Session not found');
    if (session.cancelledAt) throw ApiError.badRequest('Cannot assign to a cancelled session');

    let targets: string[];
    if (batchId) {
      const profiles = await prisma.studentProfile.findMany({
        where: { batchId, user: { isActive: true, role: 'student' } },
        select: { userId: true },
      });
      targets = profiles.map((p) => p.userId);
    } else {
      targets = studentIds;
    }
    if (!targets || targets.length === 0) throw ApiError.badRequest('No students to assign');

    // Challenge 54/55: mandatory assignments must not push advanced content to beginners
    const skipped: Array<{ studentId: string; reason: string }> = [];
    if (session.module && session.module.level === 'advanced' && !levelOverrideReason) {
      const profiles = await prisma.studentProfile.findMany({
        where: { userId: { in: targets } },
        select: { userId: true, knowledgeLevel: true },
      });
      const pm = new Map(profiles.map((p) => [p.userId, p.knowledgeLevel]));
      targets = targets.filter((sid) => {
        if (pm.get(sid) === 'beginner') {
          skipped.push({
            studentId: sid,
            reason: 'Beginner-level student cannot be mandatorily assigned advanced content without an override',
          });
          return false;
        }
        return true;
      });
    }

    const created = await prisma.trainingAssignment.createMany({
      data: targets.map((studentId) => ({ sessionId, studentId })),
      skipDuplicates: true, // @@unique backstop (Ch 60-pattern duplicate safety)
    });

    // Notify
    if (targets.length > 0) {
      const n = await prisma.notification.create({
        data: {
          title: `Training Scheduled: ${session.title}`,
          message: `You have been assigned a training session on ${new Date(session.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${session.location ? ` at ${session.location}` : ''}. Objectives: ${(session.learningObjectives || []).join('; ') || 'see session details'}.`,
          createdBy: req.user!.id,
        },
      });
      await prisma.notificationRecipient.createMany({
        data: targets.map((userId) => ({ notificationId: n.id, userId })),
      });
    }

    await audit(req.user!.id, 'training.assign', 'training_session', sessionId, 'success', {
      assigned: created.count,
      skipped,
      levelOverride: !!levelOverrideReason,
    });
    res.status(201).json({ success: true, data: { assigned: created.count, skipped } });
  } catch (err) {
    next(err);
  }
};

export const reschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { newScheduledAt, reason } = req.body;
    await rescheduleSession(id, new Date(newScheduledAt), reason, req.user!.id);
    res.json({ success: true, data: { message: 'Session rescheduled; assigned students notified' } });
  } catch (err: any) {
    next(err.message ? ApiError.badRequest(err.message) : err);
  }
};

export const cancelSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!session) throw ApiError.notFound('Session not found');

    await prisma.$transaction([
      prisma.trainingSession.update({ where: { id }, data: { cancelledAt: new Date() } }),
      prisma.trainingAssignment.updateMany({
        where: { sessionId: id, status: { in: ['scheduled', 'rescheduled', 'overdue'] } },
        data: { status: 'cancelled' },
      }),
    ]);

    if (session.assignments.length) {
      const n = await prisma.notification.create({
        data: {
          title: `Training Cancelled: ${session.title}`,
          message: 'This training session has been cancelled.',
          createdBy: req.user!.id,
        },
      });
      await prisma.notificationRecipient.createMany({
        data: session.assignments
          .filter((a) => a.status !== 'completed')
          .map((a) => ({ notificationId: n.id, userId: a.studentId })),
      });
    }

    await audit(req.user!.id, 'training.cancel', 'training_session', id, 'success');
    res.json({ success: true, data: { message: 'Cancelled' } });
  } catch (err) {
    next(err);
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignmentId = req.params.assignmentId as string;
    const { status } = req.body;
    const assignment = await prisma.trainingAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw ApiError.notFound('Assignment not found');

    // Students may only update their OWN assignment, and only to completed
    if (req.user!.role === 'student') {
      if (assignment.studentId !== req.user!.id) throw ApiError.forbidden('Not your assignment');
      if (status !== 'completed') throw ApiError.forbidden('Students may only mark their own assignments as completed');
    }

    const updated = await prisma.trainingAssignment.update({
      where: { id: assignmentId },
      data: { status, ...(status === 'completed' && { completedAt: new Date() }) },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const mySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await getStudentSchedule(req.user!.id) });
  } catch (err) {
    next(err);
  }
};

export const adherenceOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await syncAssignmentStatuses();
    const [falling, all] = await Promise.all([
      getFallingBehind(),
      prisma.trainingAssignment.findMany({
        include: {
          student: { select: { name: true, email: true } },
          session: { select: { title: true, scheduledAt: true } },
        },
        orderBy: { session: { scheduledAt: 'desc' } },
        take: 200,
      }),
    ]);
    res.json({ success: true, data: { fallingBehind: falling, recent: all } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LEARNING MODULES (Challenges 54, 55, 57)
// ============================================================
export const createModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      description,
      level,
      topicId,
      resourceId,
      assessmentTestId,
      codingProblemId,
      minPassingScore,
      prerequisiteModuleIds,
      orderIndex,
      requiredSkills,
    } = req.body;

    if (resourceId) {
      const r = await prisma.resource.findUnique({ where: { id: resourceId } });
      if (!r) throw ApiError.badRequest('Resource not found');
      // Ch 54: content difficulty must match module level (no advanced material in a beginner module)
      if (r.difficulty && r.difficulty !== level) {
        throw ApiError.badRequest(`Resource difficulty (${r.difficulty}) does not match module level (${level})`);
      }
    }

    const module = await prisma.learningModule.create({
      data: {
        title,
        description,
        level,
        topicId: topicId || null,
        resourceId: resourceId || null,
        assessmentTestId: assessmentTestId || null,
        codingProblemId: codingProblemId || null,
        minPassingScore: minPassingScore ?? 60,
        orderIndex: orderIndex ?? 0,
        requiredSkills: requiredSkills || [],
        createdBy: req.user!.id,
        ...(prerequisiteModuleIds?.length && {
          prerequisites: {
            create: prerequisiteModuleIds.map((prerequisiteModuleId: string) => ({
              prerequisiteModuleId,
            })),
          },
        }),
      },
    });

    await audit(req.user!.id, 'learning.module_create', 'learning_module', module.id, 'success', { title, level });
    res.status(201).json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
};

export const listModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modules = await prisma.learningModule.findMany({
      include: {
        resource: { select: { id: true, title: true, difficulty: true, visibility: true } },
        prerequisites: {
          include: { prerequisiteModule: { select: { id: true, title: true, level: true } } },
        },
        _count: { select: { progress: true } },
      },
      orderBy: [{ level: 'asc' }, { orderIndex: 'asc' }],
    });

    if (req.user!.role !== 'student') {
      return res.json({ success: true, data: modules });
    }

    // Student view: own progress + prerequisite status (Ch 55)
    const withState = await Promise.all(
      modules.map(async (m) => {
        const progress = await prisma.moduleProgress.findUnique({
          where: { studentId_moduleId: { studentId: req.user!.id, moduleId: m.id } },
        });
        const prereq = await checkPrerequisites(req.user!.id, m.id);
        return {
          ...m,
          myProgress: progress
            ? {
                status: progress.status,
                bestScore: progress.bestScore,
                attempts: progress.attempts,
                hasException: !!progress.prereqExceptionReason,
              }
            : null,
          prerequisitesSatisfied: prereq.satisfied,
          missingPrerequisites: prereq.missing,
          enrolled: !!progress,
        };
      })
    );
    res.json({ success: true, data: withState });
  } catch (err) {
    next(err);
  }
};

export const enrollInModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleId = req.params.id as string;
    const prereq = await checkPrerequisites(req.user!.id, moduleId);
    if (!prereq.satisfied) {
      throw ApiError.forbidden(
        `Prerequisites not met: ${prereq.missing
          .map((m) => m.title)
          .join(', ')}. Complete those modules first or request a trainer exception.`
      );
    }
    const progress = await prisma.moduleProgress.upsert({
      where: { studentId_moduleId: { studentId: req.user!.id, moduleId } },
      update: { status: 'in_progress' },
      create: { studentId: req.user!.id, moduleId, status: 'in_progress' },
    });
    res.status(201).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

export const evaluateMyModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleId = req.params.id as string;
    const result = await evaluateModuleCompletion(req.user!.id, moduleId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const trainerVerifyModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleId = req.params.moduleId as string;
    const studentId = req.params.studentId as string;
    const { passed, note } = req.body;

    const module = await prisma.learningModule.findUnique({ where: { id: moduleId } });
    if (!module) throw ApiError.notFound('Module not found');

    const progress = await prisma.moduleProgress.update({
      where: { studentId_moduleId: { studentId, moduleId } },
      data: {
        status: passed ? 'completed' : 'failed',
        verifiedBy: req.user!.id,
        ...(passed && { completedAt: new Date() }),
      },
    });

    if (passed) {
      await prisma.competencyRecord.upsert({
        where: { studentId_skill: { studentId, skill: module.title } },
        update: {
          level: module.level,
          evidence: { type: 'trainer_verification', note, verifiedBy: req.user!.id },
          moduleId,
          verifiedBy: req.user!.id,
          verifiedAt: new Date(),
        },
        create: {
          studentId,
          skill: module.title,
          level: module.level,
          evidence: { type: 'trainer_verification', note },
          moduleId,
          verifiedBy: req.user!.id,
        },
      });
    }

    await audit(req.user!.id, 'learning.trainer_verify', 'module_progress', `${studentId}:${moduleId}`, 'success', {
      passed,
      note,
    });
    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

export const prereqException = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const moduleId = req.params.id as string;
    const { studentId, reason } = req.body;
    await grantPrerequisiteException(studentId, moduleId, reason, req.user!.id);
    res.json({ success: true, data: { message: 'Exception granted and audited' } });
  } catch (err) {
    next(err);
  }
};

export const myRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await recommendResources(req.user!.id) });
  } catch (err) {
    next(err);
  }
};

export const myCompetencies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.id : (req.params.studentId as string);
    if (!studentId) throw ApiError.badRequest('studentId required');
    if (req.user!.role === 'student' && studentId !== req.user!.id) {
      throw ApiError.forbidden('Own records only');
    }
    const records = await prisma.competencyRecord.findMany({
      where: { studentId },
      orderBy: { verifiedAt: 'desc' },
    });
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// RESOURCE MANAGEMENT (Challenges 52, 53, 60, 61, 62, 63, 64)
// ============================================================
export const checkDuplicate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, sourceUrl, contentHash } = req.body;
    const duplicates = await findDuplicateResources({ title, sourceUrl, contentHash });
    res.json({ success: true, data: { duplicates, duplicateFound: duplicates.length > 0 } });
  } catch (err) {
    next(err);
  }
};

export const newResourceVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title, description, sourceUrl, duplicateOverrideReason } = req.body;
    const file = req.file;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw ApiError.notFound('Resource not found');
    if (resource.uploadedBy !== req.user!.id && req.user!.role !== 'admin') {
      throw ApiError.forbidden('Only the owner or an admin can create new versions');
    }

    let fileUrl = resource.fileUrl;
    let contentHash = resource.contentHash;
    if (file) {
      fileUrl = `/uploads/${file.filename}`;
      contentHash = sha256Hex(fs.readFileSync(file.path));
      // Ch 60: hash dup-check against OTHER resources
      const dups = await findDuplicateResources({ title: title || resource.title, contentHash });
      const others = dups.filter((d) => d.id !== id);
      if (others.length > 0 && !duplicateOverrideReason) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path); // cleanup
        return res.status(409).json({
          success: false,
          error: 'Duplicate content detected. Provide duplicateOverrideReason to proceed.',
          details: { duplicates: others.map((d) => ({ id: d.id, title: d.title, version: d.version })) },
        });
      }
    }

    const updated = await createResourceVersion(
      id,
      { title, description, fileUrl, sourceUrl, contentHash },
      req.user!.id
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    next(err.message ? ApiError.badRequest(err.message) : err);
  }
};

export const updateContentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { contentStatus } = req.body;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw ApiError.notFound('Resource not found');
    if (resource.uploadedBy !== req.user!.id && req.user!.role !== 'admin') {
      throw ApiError.forbidden('Owner or admin only');
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { contentStatus, ...(contentStatus === 'updated' && { lastReviewedAt: new Date() }) },
    });
    await audit(req.user!.id, 'resource.content_status', 'resource', id, 'success', { contentStatus });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const updateVisibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { visibility, license, attribution, alternatives } = req.body;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw ApiError.notFound('Resource not found');
    if (resource.uploadedBy !== req.user!.id && req.user!.role !== 'admin') {
      throw ApiError.forbidden('Owner or admin only');
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: { visibility, license, attribution, alternatives },
    });
    await audit(req.user!.id, 'resource.visibility_change', 'resource', id, 'success', { visibility });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const staleResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await getStaleResources() });
  } catch (err) {
    next(err);
  }
};

export const runLinkChecks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await runAllLinkChecks() });
  } catch (err) {
    next(err);
  }
};

export const linkStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const checks = await prisma.resourceLinkCheck.findMany({ where: { resourceId: id } });
    res.json({ success: true, data: checks });
  } catch (err) {
    next(err);
  }
};

/**
 * SECURE DOWNLOAD (Challenge 64): replaces static /uploads serving.
 * Backend authorization → access log → stream from disk.
 */
export const downloadResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const allowed = await canAccessResource(req.user!, id);
    if (!allowed) {
      await audit(req.user!.id, 'resource.access_denied', 'resource', id, 'failure', { action: 'download' });
      throw ApiError.forbidden('You do not have access to this resource');
    }
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw ApiError.notFound('Resource not found');

    await prisma.resourceAccessLog.create({
      data: { resourceId: id, userId: req.user!.id, action: 'download' },
    });

    const cleanPath = resource.fileUrl.replace('/uploads/', '');
    const filePath = path.join(process.cwd(), 'uploads', cleanPath);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('File missing from storage');

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

// ============================================================
// VIDEO PROGRESS (Challenges 61, 62)
// ============================================================
export const getVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.id as string;
    const progress = await prisma.videoProgress.findUnique({
      where: { studentId_resourceId: { studentId: req.user!.id, resourceId } },
    });
    res.json({ success: true, data: progress || { positionSeconds: 0, durationSeconds: null } });
  } catch (err) {
    next(err);
  }
};

export const saveVideoProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.id as string;
    const { positionSeconds, durationSeconds, clientUpdatedAt } = req.body;

    const existing = await prisma.videoProgress.findUnique({
      where: { studentId_resourceId: { studentId: req.user!.id, resourceId } },
    });

    // Ch 62: never overwrite newer server state with an older out-of-order client write
    if (
      existing &&
      clientUpdatedAt &&
      new Date(clientUpdatedAt).getTime() < existing.updatedAt.getTime() - 2000
    ) {
      return res.json({ success: true, data: existing, stale: true });
    }

    const saved = await prisma.videoProgress.upsert({
      where: { studentId_resourceId: { studentId: req.user!.id, resourceId } },
      update: {
        positionSeconds,
        durationSeconds: durationSeconds ?? existing?.durationSeconds ?? null,
      },
      create: {
        studentId: req.user!.id,
        resourceId,
        positionSeconds,
        durationSeconds,
      },
    });
    res.json({ success: true, data: saved, stale: false });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ANALYTICS (Challenges 56, 65)
// ============================================================
export const effectiveness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query.branchId) filters.branchId = parseInt(req.query.branchId as string, 10);
    if (req.query.batchId) filters.batchId = parseInt(req.query.batchId as string, 10);
    res.json({ success: true, data: await getTrainingEffectiveness(filters) });
  } catch (err) {
    next(err);
  }
};

export const contentRelevance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await getContentRelevance() });
  } catch (err) {
    next(err);
  }
};

export const effectivenessReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getTrainingEffectiveness();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="training-effectiveness.csv"');
    res.send(toEffectivenessCsv(data));
  } catch (err) {
    next(err);
  }
};

export const runReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await sendTrainingReminders() });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TRAINING RESOURCE HUB & DISCOVERY
// ============================================================

// STUDENT: Browse Resources
export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, category, search, limit } = req.query;
    const where: any = { status: 'published' };
    if (type) where.resourceType = type;
    if (category) where.category = { contains: category as string, mode: 'insensitive' };
    if (search) where.title = { contains: search as string, mode: 'insensitive' };

    const take = limit ? Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50)) : 50;

    const resources = await prisma.trainingResource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    res.json({ success: true, data: resources });
  } catch (err) { next(err); }
};

// STUDENT: Bookmark Resource
export const toggleBookmark = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.resourceId as string;
    const studentId = req.user!.id;

    const existing = await prisma.resourceBookmark.findUnique({
      where: { studentId_resourceId: { studentId, resourceId } }
    });

    if (existing) {
      await prisma.resourceBookmark.delete({ where: { id: existing.id } });
      return res.json({ success: true, data: { bookmarked: false } });
    }

    await prisma.resourceBookmark.create({ data: { studentId, resourceId } });
    res.status(201).json({ success: true, data: { bookmarked: true } });
  } catch (err) { next(err); }
};

// STUDENT: Update Progress
export const updateProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resourceId = req.params.resourceId as string;
    const { status, progressPercentage } = req.body;
    const studentId = req.user!.id;

    const progress = await prisma.resourceProgress.upsert({
      where: { studentId_resourceId: { studentId, resourceId } },
      update: { status, progressPercentage: progressPercentage ?? 0 },
      create: { studentId, resourceId, status: status || 'in_progress', progressPercentage: progressPercentage ?? 0 },
    });

    res.json({ success: true, data: progress });
  } catch (err) { next(err); }
};

// STUDENT: Get Training Dashboard Stats
export const getTrainingDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [bookmarks, inProgress, completed] = await Promise.all([
      prisma.resourceBookmark.count({ where: { studentId } }),
      prisma.resourceProgress.count({ where: { studentId, status: 'in_progress' } }),
      prisma.resourceProgress.count({ where: { studentId, status: 'completed' } }),
    ]);

    res.json({
      success: true,
      data: { bookmarks, inProgress, completed }
    });
  } catch (err) { next(err); }
};

// ADMIN/PO: Manual Resource Ingestion (CSV/JSON parsed in frontend or raw body)
export const ingestResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resources } = req.body; // Array of resource objects
    if (!Array.isArray(resources)) throw ApiError.badRequest('Expected an array of resources.');

    const created = [];
    for (const r of resources) {
      // Basic deduplication by title+provider
      const exists = await prisma.trainingResource.findFirst({
        where: { title: r.title, provider: r.provider || 'Internal' }
      });
      if (!exists) {
        created.push(
          await prisma.trainingResource.create({
            data: {
              ...r,
              createdBy: req.user!.id,
              status: 'published',
            }
          })
        );
      }
    }

    res.status(201).json({ success: true, data: { createdCount: created.length } });
  } catch (err) { next(err); }
};

// ADMIN: Get Sync Providers
export const getProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await prisma.resourceProvider.findMany({
      include: { _count: { select: { syncJobs: true } } }
    });
    res.json({ success: true, data: providers });
  } catch (err) { next(err); }
};

