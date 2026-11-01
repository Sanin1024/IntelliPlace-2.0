import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  assignTrainerToBatch,
  detectScheduleConflicts,
  getBatchPerformance,
  identifyStrugglingStudents,
  generateTrainerEvaluation,
} from '../services/trainer.service.js';

/**
 * GET /api/trainer/summary
 * Summary metrics for the trainer dashboard
 * Allowed roles: trainer, admin
 */
export const getTrainerSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isTrainer = req.user!.role === 'trainer';
    const trainerId = req.user!.id;

    // 1. Counts of bank assets
    const [questionsCount, problemsCount, mockTestsCount, resourcesCount] = await Promise.all([
      prisma.aptitudeQuestion.count(),
      prisma.codingProblem.count(),
      prisma.mockTest.count(isTrainer ? { where: { createdBy: trainerId } } : undefined),
      prisma.resource.count(isTrainer ? { where: { uploadedBy: trainerId } } : undefined),
    ]);

    // 2. Last 5 mock tests created by this trainer (or all for admin)
    const recentTestsRaw = await prisma.mockTest.findMany({
      where: isTrainer ? { createdBy: trainerId } : {},
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        attempts: {
          select: { status: true, score: true, totalMarks: true },
        },
      },
    });

    const recentTests = recentTestsRaw.map((t: any) => {
      const attemptsCount = t.attempts.length;
      const submitted = t.attempts.filter((a: any) => a.status === 'submitted' || a.status === 'expired');
      const submittedCount = submitted.length;
      const avgPercentage = submittedCount > 0
        ? Math.round(
            submitted.reduce(
              (sum: number, a: any) =>
                sum + (a.totalMarks && a.totalMarks > 0 ? ((a.score || 0) / a.totalMarks) * 100 : 0),
              0
            ) / submittedCount
          )
        : 0;

      return {
        id: t.id,
        title: t.title,
        createdAt: t.createdAt,
        durationMins: t.durationMins,
        attemptsCount,
        submittedCount,
        averagePercentage: avgPercentage,
      };
    });

    // 3. Lowest accuracy topics across all student answers (min 5 answers per topic)
    const studentAnswers = await prisma.studentAnswer.findMany({
      where: { isCorrect: { not: null } },
      include: {
        question: {
          select: {
            topicId: true,
            topic: { select: { id: true, name: true } },
          },
        },
      },
    });

    const topicStats = new Map<number, { id: number; name: string; total: number; correct: number }>();
    for (const ans of studentAnswers) {
      const tId = ans.question.topicId;
      if (!topicStats.has(tId)) {
        topicStats.set(tId, { id: tId, name: ans.question.topic.name, total: 0, correct: 0 });
      }
      const s = topicStats.get(tId)!;
      s.total++;
      if (ans.isCorrect) s.correct++;
    }

    const weakestTopics = Array.from(topicStats.values())
      .filter((t) => t.total >= 5)
      .map((t) => ({
        id: t.id,
        topicId: t.id,
        name: t.name,
        topicName: t.name,
        totalAnswers: t.total,
        answeredCount: t.total,
        correctAnswers: t.correct,
        accuracy: Math.round((t.correct / t.total) * 100),
        accuracyPercentage: Math.round((t.correct / t.total) * 100),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        counts: {
          questions: questionsCount,
          problems: problemsCount,
          mockTests: mockTestsCount,
          resources: resourcesCount,
        },
        recentTests,
        weakestTopics,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CHALLENGES 176–185: TRAINER MANAGEMENT
// ============================================================

// ---- Assignment (Challenges 176, 177) ----
export const assignBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trainerId, batchId, role } = req.body;
    const assignment = await assignTrainerToBatch({
      trainerId,
      batchId: Number(batchId),
      role,
      actorId: req.user!.id,
    });
    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

export const myBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignments = await prisma.trainerBatchAssignment.findMany({
      where: { trainerId: req.user!.id, isActive: true },
      include: { batch: true },
    });
    res.json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
};

// ---- Performance & Intervention (Challenges 178, 185) ----
export const batchPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBatchId = Array.isArray(req.params.batchId) ? req.params.batchId[0] : req.params.batchId;
    const batchId = parseInt(rawBatchId, 10);
    if (isNaN(batchId)) {
      throw ApiError.badRequest('Invalid batch ID');
    }

    // Authorization: If trainer, ensure assignment to this batch
    if (req.user!.role === 'trainer') {
      const assigned = await prisma.trainerBatchAssignment.findFirst({
        where: { trainerId: req.user!.id, batchId, isActive: true },
      });
      if (!assigned) {
        throw ApiError.forbidden('You are not assigned to this batch.');
      }
    }

    const performance = await getBatchPerformance(batchId);
    const struggling = await identifyStrugglingStudents(batchId);

    res.json({ success: true, data: { performance, struggling } });
  } catch (err) {
    next(err);
  }
};

export const createIntervention = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, severity, reason, action, followUpDate } = req.body;

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'student') {
      throw ApiError.badRequest('Target user must be a valid student.');
    }

    const intervention = await prisma.studentIntervention.create({
      data: {
        studentId,
        trainerId: req.user!.id,
        severity: severity || 'medium',
        reason,
        action: action || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });

    res.status(201).json({ success: true, data: intervention });
  } catch (err) {
    next(err);
  }
};

// ---- Feedback (Challenge 184) ----
export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { trainerId, sessionId, ratings, comments, isAnonymous = true } = req.body;

    const trainer = await prisma.user.findUnique({ where: { id: trainerId } });
    if (!trainer || trainer.role !== 'trainer') {
      throw ApiError.badRequest('Target user must be a trainer.');
    }

    const feedback = await prisma.trainerFeedback.create({
      data: {
        trainerId,
        studentId: req.user!.id,
        sessionId: sessionId || null,
        ratings,
        comments: comments || null,
        isAnonymous: Boolean(isAnonymous),
      },
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

export const getMyFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Trainers see feedback, but student name is redacted to 'Anonymous' if isAnonymous is true
    const feedback = await prisma.trainerFeedback.findMany({
      where: { trainerId: req.user!.id },
      select: {
        id: true,
        ratings: true,
        comments: true,
        createdAt: true,
        student: { select: { name: true } },
        isAnonymous: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = feedback.map((f) => ({
      id: f.id,
      ratings: f.ratings,
      comments: f.comments,
      createdAt: f.createdAt,
      isAnonymous: f.isAnonymous,
      student: f.isAnonymous ? { name: 'Anonymous' } : f.student,
    }));

    res.json({ success: true, data: sanitized });
  } catch (err) {
    next(err);
  }
};

// ---- Tasks (Challenge 182) ----
export const myTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await prisma.trainerTask.findMany({
      where: { trainerId: req.user!.id },
      orderBy: { deadline: 'asc' },
    });
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const task = await prisma.trainerTask.findUnique({ where: { id } });
    if (!task) {
      throw ApiError.notFound('Task not found.');
    }
    if (task.trainerId !== req.user!.id && req.user!.role !== 'admin') {
      throw ApiError.forbidden('You can only acknowledge your own tasks.');
    }

    const updated = await prisma.trainerTask.update({
      where: { id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ---- Schedule Conflicts (Challenges 177, 179) ----
export const checkConflicts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId, trainerId, startTime, endTime } = req.body;
    const conflicts = await detectScheduleConflicts(
      parseInt(batchId, 10),
      trainerId,
      new Date(startTime),
      new Date(endTime)
    );
    res.json({ success: true, data: { conflicts, hasConflicts: conflicts.length > 0 } });
  } catch (err) {
    next(err);
  }
};

// ---- Admin: Evaluation (Challenge 181) ----
export const getEvaluation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trainerId = Array.isArray(req.params.trainerId) ? req.params.trainerId[0] : req.params.trainerId;
    const { period } = req.query;
    const evalPeriod = (period as string) || `${new Date().getFullYear()}-Q1`;
    const evalRecord = await generateTrainerEvaluation(trainerId, evalPeriod);
    res.json({ success: true, data: evalRecord });
  } catch (err) {
    next(err);
  }
};
