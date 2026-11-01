import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { evaluateAnswer, recomputeAttempt } from '../services/scoring.service.js';
import { onAssessmentSubmitted } from '../services/assessmentAnalysis.service.js';
import { snapshotReadiness } from '../services/readiness.service.js';
import { formatIST } from '../utils/timezone.util.js';

const GRACE_SECS = () =>
  parseInt(process.env.SUBMIT_GRACE_SECS || '30', 10); // Ch 98: institutional grace

const attemptDeadline = (attempt: { startTime: Date; extraTimeMins: number }, test: { durationMins: number }) =>
  attempt.startTime.getTime() + (test.durationMins + attempt.extraTimeMins) * 60 * 1000;

const remainingFor = (attempt: any, test: any) =>
  Math.max(0, Math.floor((attemptDeadline(attempt, test) - Date.now()) / 1000));

// ============================================================
// START / RESUME (Ch 83, 84, 87, 95, 97)
// ============================================================
export const startAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params['id'] as string;
    const studentId = req.user!.id;

    const result = await prisma.$transaction(async (tx) => {
      // One-live-attempt lock (Ch 83/87): serializes concurrent starts
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM mock_tests WHERE id = ${testId} FOR UPDATE`;
      if (locked.length === 0) throw ApiError.notFound('Test not found');

      const test = await tx.mockTest.findUnique({
        where: { id: testId },
        include: { questions: { include: { question: true } }, batch: true },
      });
      if (!test) throw ApiError.notFound('Test not found');
      if (!test.isActive || test.status === 'archived' || test.status === 'draft') {
        throw ApiError.badRequest('This test is not available');
      }

      // Ch 84: server-authoritative availability
      const now = new Date();
      if (test.availableFrom && now < test.availableFrom) {
        throw ApiError.badRequest(
          `This assessment opens at ${formatIST(test.availableFrom)}. Please return at the scheduled time.`
        );
      }
      if (test.availableUntil && now > test.availableUntil) {
        throw ApiError.badRequest('This assessment is no longer available.');
      }

      const profile = await tx.studentProfile.findUnique({ where: { userId: studentId } });
      if (test.batchId && profile?.batchId !== test.batchId) {
        throw ApiError.forbidden('This assessment is not available for your batch.');
      }
      // Department scoping: block starting attempts on other departments' assessments
      if (test.branchId && profile?.branchId !== test.branchId) {
        throw ApiError.forbidden('This assessment is not available for your department.');
      }

      const attemptCount = await tx.testAttempt.count({
        where: { testId, studentId, attemptType: 'mock' },
      });
      if (attemptCount >= test.maxAttempts) {
        throw ApiError.badRequest(`You have used all ${test.maxAttempts} permitted attempt(s).`);
      }

      // Resume existing in-progress attempt (Ch 87)
      const existing = await tx.testAttempt.findFirst({
        where: { testId, studentId, attemptType: 'mock', status: 'in_progress' },
      });
      if (existing) {
        if (Date.now() > attemptDeadline(existing, test) + GRACE_SECS() * 1000) {
          await recomputeAttempt(existing.id); // finalize expired
          throw ApiError.badRequest('Your previous attempt expired and has been finalized with your saved answers.');
        }
        return { attempt: existing, test, resumed: true };
      }

      // ---- Build the attempt's question set (Ch 95, 97) ----
      let orderedQuestions = test.questions;

      if (test.generationMode === 'balanced' && Array.isArray(test.questionRules)) {
        // Per-attempt bank sampling honoring difficulty distribution (Ch 97)
        const rules = test.questionRules as Array<{ topicId: number; difficulty: string; count: number }>;
        const sampled: typeof test.questions = [];
        for (const rule of rules) {
          const pool = await tx.aptitudeQuestion.findMany({
            where: { topicId: rule.topicId, difficulty: rule.difficulty as any },
            select: { id: true },
          });
          if (pool.length < rule.count) {
            throw ApiError.badRequest(
              `Insufficient questions in the bank for the configured assessment composition (topic ${rule.topicId}, ${rule.difficulty}: need ${rule.count}, have ${pool.length}). Contact your trainer.`
            );
          }
          const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, rule.count);
          for (const q of shuffled) {
            const link = test.questions.find((tq) => tq.questionId === q.id);
            if (link) sampled.push(link);
          }
        }
        orderedQuestions = sampled.sort(() => Math.random() - 0.5);
      } else if (test.shuffleQuestions) {
        orderedQuestions = [...test.questions].sort(() => Math.random() - 0.5);
      }

      const questionOrder = orderedQuestions.map((q) => q.questionId);

      // Per-attempt option shuffling (Ch 92/95) — canonical keys preserved
      const optionOrders: Record<string, string[]> = {};
      if (test.shuffleOptions) {
        for (const q of orderedQuestions) {
          optionOrders[q.questionId] = ['A', 'B', 'C', 'D'].sort(() => Math.random() - 0.5);
        }
      }

      const attempt = await tx.testAttempt.create({
        data: {
          testId, studentId, attemptType: 'mock', status: 'in_progress',
          totalMarks: orderedQuestions.reduce((s, q) => s + q.marks, 0),
          questionOrder: questionOrder as any,
          optionOrders: optionOrders as any,
        },
      });

      // Lazy lifecycle: published → in_progress on first attempt (Ch 99)
      if (test.status === 'published') {
        await tx.mockTest.update({ where: { id: testId }, data: { status: 'in_progress' } });
      }
      return { attempt, test, resumed: false };
    });

    const { attempt, test, resumed } = result;

    // Build student-safe question payload (answer keys stripped — Ch 90/92)
    const order = (attempt.questionOrder as string[]) || test.questions.map((q) => q.questionId);
    const byId = new Map(test.questions.map((q) => [q.questionId, q]));
    const questions = order
      .map((qid) => byId.get(qid))
      .filter(Boolean)
      .map(({ question, marks }: any) => {
        const optMap = (attempt.optionOrders as any)?.[question.id] || ['A', 'B', 'C', 'D'];
        return {
          id: question.id,
          questionText: question.questionText,
          isMultiSelect: question.isMultiSelect,
          marks,
          difficulty: question.difficulty,
          topic: question.topic ? { id: question.topic.id, name: question.topic.name } : null,
          // options in display order; canonical key travels with each option
          options: optMap.map((key: string) => ({
            key,
            text: question[`option${key}`],
          })),
        };
      });

    const savedAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, selectedOption: true, selectedOptions: true, savedAt: true },
    });

    res.status(resumed ? 200 : 201).json({
      success: true,
      data: {
        attemptId: attempt.id,
        resumed,
        test: {
          id: test.id, title: test.title, durationMins: test.durationMins,
          negativeMarks: test.negativeMarks, securityConfig: test.securityConfig,
        },
        questions,
        savedAnswers,
        lastQuestionIndex: attempt.lastQuestionIndex ?? 0,
        // Ch 86: server clock for skew correction
        serverNow: new Date().toISOString(),
        deadline: new Date(attemptDeadline(attempt, test)).toISOString(),
        remainingSeconds: remainingFor(attempt, test),
        graceSeconds: GRACE_SECS(),
      },
    });
  } catch (err) { next(err); }
};

// ============================================================
// SAVE ANSWER (Ch 81, 85, 87, 98)
// ============================================================
export const saveAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { questionId, selectedOption, selectedOptions } = req.body;
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) {
      await audit(studentId, 'assessment.access_denied', 'test_attempt', attemptId, 'failure', { action: 'save_answer' });
      throw ApiError.forbidden('Not your attempt');
    }
    if (attempt.status !== 'in_progress') throw ApiError.badRequest('Attempt is not active');

    // Ch 85/98: server deadline + grace; answers preserved up to grace
    if (attempt.test && Date.now() > attemptDeadline(attempt, attempt.test) + GRACE_SECS() * 1000) {
      await recomputeAttempt(attemptId);
      throw ApiError.badRequest('Time expired — your saved answers have been finalized.');
    }

    if (attempt.testId) {
      const inTest = await prisma.mockTestQuestion.findUnique({
        where: { testId_questionId: { testId: attempt.testId, questionId } },
      });
      if (!inTest) throw ApiError.badRequest('Question is not part of this assessment');
    }

    await prisma.studentAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { selectedOption: selectedOption ?? null, selectedOptions: selectedOptions || [], savedAt: new Date() },
      create: { attemptId, questionId, selectedOption: selectedOption ?? null, selectedOptions: selectedOptions || [] },
    });

    res.json({
      success: true,
      data: {
        savedAt: new Date().toISOString(),           // Ch 81: display timestamp
        serverNow: new Date().toISOString(),          // Ch 86: drift correction
        remainingSeconds: attempt.test ? remainingFor(attempt, attempt.test) : 0,
      },
    });
  } catch (err) { next(err); }
};

/** PATCH /attempts/:attemptId/position — lightweight restore marker (Ch 87) */
export const savePosition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { questionIndex } = req.body;
    const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== req.user!.id) throw ApiError.forbidden('Not your attempt');
    if (attempt.status !== 'in_progress') return res.json({ success: true });
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: { lastQuestionIndex: Math.max(0, Math.min(200, questionIndex)) },
    });
    res.json({ success: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// ============================================================
// SUBMIT (Ch 82, 83, 85, 93, 98)
// ============================================================
export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { idempotencyKey, clientSubmittedAt } = req.body || {};
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId }, include: { test: true } });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) throw ApiError.forbidden('Not your attempt');

    // Ch 83: idempotent submission — identical repeat returns existing result
    if (attempt.status === 'submitted') {
      if (idempotencyKey && attempt.submissionIdempotencyKey === idempotencyKey) {
        return res.json({ success: true, data: { duplicated: true, result: await resultPayload(attemptId) } });
      }
      throw ApiError.badRequest('Attempt already submitted');
    }
    if (attempt.status !== 'in_progress') throw ApiError.badRequest('Attempt is not active');

    // Ch 98: arrival-time grace — penalize neither server processing nor network delay
    if (attempt.test) {
      const arrivedAt = Date.now();
      const deadline = attemptDeadline(attempt, attempt.test);
      if (arrivedAt > deadline + GRACE_SECS() * 1000) {
        await recomputeAttempt(attemptId); // finalize with saved answers
        throw ApiError.badRequest(
          `Submission arrived after the deadline + ${GRACE_SECS()}s grace. Your previously saved answers were preserved and finalized.`
        );
      }
    }

    try {
      await prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          submissionIdempotencyKey: idempotencyKey || crypto.randomUUID(),
          clientSubmittedAt: clientSubmittedAt ? new Date(clientSubmittedAt) : null,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Concurrent duplicate with same key (Ch 83)
        return res.json({ success: true, data: { duplicated: true, result: await resultPayload(attemptId) } });
      }
      throw err;
    }

    await recomputeAttempt(attemptId); // transactional, idempotent (Ch 93/94)

    // ===== PRESERVED HOOKS (Modules 3 & 5) =====
    // Preliminary-assessment classification hook
    const linkedAssessment = await prisma.preliminaryAssessment.findUnique({
      where: { testAttemptId: attemptId },
    });

    if (linkedAssessment) {
      const settings = await prisma.systemSetting.findMany();
      const config = settings.reduce(
        (acc: Record<string, string>, s: { key: string; value: string }) => {
          acc[s.key] = s.value;
          return acc;
        },
        {} as Record<string, string>
      );

      const parsedBeginnerMax = Number.parseInt(config.PRELIM_BEGINNER_MAX || '40', 10);
      const parsedIntermediateMax = Number.parseInt(config.PRELIM_INTERMEDIATE_MAX || '70', 10);
      const beginnerMax = Number.isFinite(parsedBeginnerMax) ? parsedBeginnerMax : 40;
      const intermediateMax = Number.isFinite(parsedIntermediateMax) ? parsedIntermediateMax : 70;

      const scoredAttempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
      const score = scoredAttempt?.score || 0;
      const totalMarks = scoredAttempt?.totalMarks || 1;
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

      let assignedLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      if (percentage > intermediateMax) {
        assignedLevel = 'advanced';
      } else if (percentage > beginnerMax) {
        assignedLevel = 'intermediate';
      }

      await prisma.preliminaryAssessment.update({
        where: { id: linkedAssessment.id },
        data: {
          status: 'completed',
          score: Math.round(score),
          assignedLevel,
          completedAt: new Date(),
        },
      });

      await prisma.studentProfile.update({
        where: { userId: linkedAssessment.studentId },
        data: { knowledgeLevel: assignedLevel },
      });

      const notificationCreator = await prisma.user.findFirst({
        where: { role: 'admin', isActive: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (notificationCreator) {
        await prisma.notification.create({
          data: {
            title: 'Assessment Result Published',
            message: `Your preliminary assessment is complete. You are classified as: ${assignedLevel}.`,
            createdBy: notificationCreator.id,
            recipients: {
              create: [{ userId: linkedAssessment.studentId }],
            },
          },
        });
      }
    }

    // Recommendation & readiness hooks (Module 5)
    onAssessmentSubmitted(attemptId).catch((e: any) => console.error('reco-hook-failed', e?.message || e));
    snapshotReadiness(studentId).catch(() => {});

    res.json({ success: true, data: { duplicated: false, result: await resultPayload(attemptId) } });
  } catch (err) { next(err); }
};

async function resultPayload(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: { select: { title: true } } },
  });
  return {
    attemptId,
    testTitle: attempt?.test?.title,
    score: attempt?.score,
    totalMarks: attempt?.totalMarks,
    percentage: attempt?.totalMarks
      ? Math.round(((attempt?.score || 0) / attempt.totalMarks) * 100)
      : 0,
  };
}

// ============================================================
// RESULTS — visibility gating (Ch 92, 100)
// ============================================================
export const getAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== req.user!.id && !['trainer', 'admin', 'po'].includes(req.user!.role)) {
      await audit(req.user!.id, 'assessment.access_denied', 'test_attempt', attemptId, 'failure', { action: 'read_result' });
      throw ApiError.forbidden('Not your attempt');
    }
    if (attempt.status !== 'submitted') throw ApiError.badRequest('Attempt not yet submitted');

    const test = attempt.test;
    if (req.user!.id === attempt.studentId && test) {
      const mode = test.showResults;
      const deadlinePassed = !test.availableUntil || test.availableUntil < new Date();
      if (mode === 'manual' && !test.resultsPublishedAt) {
        throw ApiError.forbidden('Results for this assessment have not been published yet.');
      }
      if (mode === 'after_deadline' && !deadlinePassed && !test.resultsPublishedAt) {
        throw ApiError.forbidden(`Results unlock after the assessment window closes (${test.availableUntil ? formatIST(test.availableUntil) : 'TBD'}).`);
      }
    }

    const answers = await prisma.studentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            id: true, questionText: true, optionA: true, optionB: true, optionC: true, optionD: true,
            correctOption: true, correctOptions: true, isMultiSelect: true, explanation: true,
            topic: { select: { name: true } },
          },
        },
      },
    });

    const marksByQuestion = new Map(
      (await prisma.mockTestQuestion.findMany({ where: { testId: attempt.testId || '' } }))
        .map((q) => [q.questionId, q.marks])
    );

    res.json({
      success: true,
      data: {
        attemptId,
        testTitle: test?.title,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.totalMarks ? Math.round(((attempt.score || 0) / attempt.totalMarks) * 100) : 0,
        durationSecs: attempt.endTime && attempt.startTime
          ? Math.round((attempt.endTime.getTime() - attempt.startTime.getTime()) / 1000)
          : 0,
        review: answers.map((a) => ({
          questionId: a.question.id,
          questionText: a.question.questionText,
          myAnswer: a.question.isMultiSelect ? a.selectedOptions : a.selectedOption,
          correctAnswer: a.question.isMultiSelect ? a.question.correctOptions : a.question.correctOption,
          isCorrect: a.isCorrect,
          marksAwarded: a.marksAwarded,
          maxMarks: marksByQuestion.get(a.question.id) ?? 1,
          explanation: a.question.explanation,
          topic: a.question.topic?.name,
        })),
      },
    });
  } catch (err) { next(err); }
};

// ============================================================
// ACTIVITY LOGGING (Ch 91)
// ============================================================
export const recordActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { events } = req.body; // [{type, at, details}]
    const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.studentId !== req.user!.id) throw ApiError.forbidden('Not your attempt');
    if (attempt.status !== 'in_progress') return res.json({ success: true, data: { logged: 0 } });

    const test = attempt.testId ? await prisma.mockTest.findUnique({ where: { id: attempt.testId } }) : null;
    const maxLog = (test?.securityConfig as any)?.maxLoggedEvents ?? 50;

    const rows = (events || []).slice(0, 20).map((e: any) => ({
      attemptId,
      studentId: req.user!.id,
      eventType: e.type as any,
      details: (e.details || {}) as any,
    }));
    const existing = await prisma.attemptActivityLog.count({ where: { attemptId } });
    const canLog = Math.max(0, maxLog - existing);
    if (canLog > 0 && rows.length > 0) {
      await prisma.attemptActivityLog.createMany({ data: rows.slice(0, canLog) });
    }
    res.json({ success: true, data: { logged: Math.min(rows.length, canLog) } });
  } catch (err) { next(err); }
};

// ============================================================
// EXTENSIONS (Ch 85, 86) — trainer/admin, audited
// ============================================================
export const grantExtraTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { extraTimeMins, reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      throw ApiError.badRequest('A justification of at least 10 characters is required for time extensions');
    }
    const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId }, include: { test: true } });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.status !== 'in_progress') throw ApiError.badRequest('Can only extend active attempts');
    if (!attempt.test) throw ApiError.badRequest('Test not found for attempt');

    const updated = await prisma.testAttempt.update({
      where: { id: attemptId },
      data: { extraTimeMins: attempt.extraTimeMins + extraTimeMins },
    });
    await audit(req.user!.id, 'assessment.extra_time', 'test_attempt', attemptId, 'success', {
      extraTimeMins, reason, studentId: attempt.studentId, testId: attempt.testId,
    });
    res.json({
      success: true,
      data: { newDeadline: new Date(attemptDeadline(updated, attempt.test)).toISOString() },
    });
  } catch (err) { next(err); }
};

// ============================================================
// STUDENT: GET MY ATTEMPT HISTORY
// ============================================================
export const getMyAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const attempts = await prisma.testAttempt.findMany({
      where: { studentId, status: { in: ['submitted', 'expired'] } },
      include: {
        test: { select: { id: true, title: true } },
      },
      orderBy: { endTime: 'desc' },
    });

    res.json({
      success: true,
      data: attempts.map((attempt) => ({
        attemptId: attempt.id,
        testId: attempt.testId,
        testTitle: attempt.test?.title || 'Practice Session',
        attemptType: attempt.attemptType,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.totalMarks && attempt.totalMarks > 0
          ? Math.round(((attempt.score || 0) / attempt.totalMarks) * 100)
          : 0,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
      })),
    });
  } catch (err) { next(err); }
};
