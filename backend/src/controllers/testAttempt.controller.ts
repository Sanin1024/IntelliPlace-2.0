import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { ensureStudentOwnership } from '../utils/ownership.js';

/**
 * Helper: check if attempt time has expired.
 */
const isExpired = (startTime: Date, durationMins: number): boolean => {
  const elapsed = Date.now() - startTime.getTime();
  return elapsed > durationMins * 60 * 1000;
};

/**
 * Helper: compute remaining seconds.
 */
const getRemainingSeconds = (startTime: Date, durationMins: number): number => {
  const elapsed = Date.now() - startTime.getTime();
  const total = durationMins * 60;
  return Math.max(0, total - Math.floor(elapsed / 1000));
};

// ============================================================
// STUDENT: START ATTEMPT
// ============================================================

export const startAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params['id'] as string;
    const studentId = req.user!.id;

    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                difficulty: true,
                topic: { select: { id: true, name: true } },
                // NOTE: correctOption NOT included — student must not see it
              },
            },
          },
        },
        batch: { select: { id: true } },
      },
    });

    if (!test) throw ApiError.notFound('Test not found');
    if (!test.isActive) throw ApiError.badRequest('This test is not active');

    // Check availability window
    const now = new Date();
    if (test.availableFrom && now < test.availableFrom) {
      throw ApiError.badRequest('This test is not yet available');
    }
    if (test.availableUntil && now > test.availableUntil) {
      throw ApiError.badRequest('This test is no longer available');
    }

    // Check batch eligibility
    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (test.batchId && profile?.batchId !== test.batchId) {
      throw ApiError.forbidden('This test is not available for your batch');
    }

    // Check max attempts
    const attemptCount = await prisma.testAttempt.count({
      where: { testId, studentId, attemptType: 'mock' },
    });
    if (attemptCount >= test.maxAttempts) {
      throw ApiError.badRequest(
        `You have used all ${test.maxAttempts} attempt(s) for this test`
      );
    }

    // Check if there's already an in-progress attempt (resume it)
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: { testId, studentId, attemptType: 'mock', status: 'in_progress' },
    });

    if (existingAttempt) {
      // Check if the existing attempt has expired
      if (isExpired(existingAttempt.startTime, test.durationMins)) {
        // Auto-submit the expired attempt
        await autoEvaluate(existingAttempt.id);
        throw ApiError.badRequest('Your previous attempt has expired and was auto-submitted');
      }

      // Return the existing attempt (resume)
      const savedAnswers = await prisma.studentAnswer.findMany({
        where: { attemptId: existingAttempt.id },
        select: { questionId: true, selectedOption: true },
      });

      return res.json({
        success: true,
        data: {
          attemptId: existingAttempt.id,
          resumed: true,
          test: {
            id: test.id,
            title: test.title,
            durationMins: test.durationMins,
          },
          questions: test.questions.map((q: any) => q.question),
          savedAnswers,
          remainingSeconds: getRemainingSeconds(existingAttempt.startTime, test.durationMins),
          startTime: existingAttempt.startTime,
        },
      });
    }

    // Create new attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        testId,
        studentId,
        attemptType: 'mock',
        status: 'in_progress',
        totalMarks: test.questions.length,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt.id,
        resumed: false,
        test: {
          id: test.id,
          title: test.title,
          durationMins: test.durationMins,
        },
        questions: test.questions.map((q: any) => q.question),
        savedAnswers: [],
        remainingSeconds: getRemainingSeconds(attempt.startTime, test.durationMins),
        startTime: attempt.startTime,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// STUDENT: SAVE ANSWER (during test)
// ============================================================

export const saveAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const { questionId, selectedOption } = req.body;
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { select: { durationMins: true } } },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) throw ApiError.forbidden('Not your attempt');
    if (attempt.status !== 'in_progress') throw ApiError.badRequest('Attempt already submitted');
    if (!attempt.test) throw ApiError.badRequest('Test not found for this attempt');

    // Check time expiry
    if (isExpired(attempt.startTime, attempt.test.durationMins)) {
      await autoEvaluate(attemptId, 'expired');
      throw ApiError.badRequest('Time expired — your test has been auto-submitted');
    }

    // Verify question belongs to this test
    const questionInTest = await prisma.mockTestQuestion.findUnique({
      where: { testId_questionId: { testId: attempt.testId!, questionId } },
    });
    if (!questionInTest) {
      throw ApiError.badRequest('This question is not part of the test');
    }

    // Upsert the answer
    await prisma.studentAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { selectedOption, isCorrect: null },
      create: { attemptId, questionId, selectedOption },
    });

    const remainingSeconds = getRemainingSeconds(attempt.startTime, attempt.test.durationMins);

    res.json({
      success: true,
      data: { message: 'Answer saved', remainingSeconds },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// STUDENT: SUBMIT ATTEMPT
// ============================================================

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { select: { durationMins: true } } },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) throw ApiError.forbidden('Not your attempt');
    if (attempt.status === 'submitted' || attempt.status === 'expired') {
      throw ApiError.badRequest('Attempt already submitted');
    }

    const finalStatus =
      attempt.test && isExpired(attempt.startTime, attempt.test.durationMins)
        ? 'expired'
        : 'submitted';

    const result = await autoEvaluate(attemptId, finalStatus);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// AUTO-EVALUATE (private helper)
// ============================================================

const autoEvaluate = async (
  attemptId: string,
  finalStatus: 'submitted' | 'expired' = 'submitted'
) => {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: { select: { title: true } } },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  // Get all answers with their questions
  const answers = await prisma.studentAnswer.findMany({
    where: { attemptId },
    include: {
      question: {
        select: {
          id: true,
          correctOption: true,
          explanation: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          topic: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Evaluate each answer
  let score = 0;
  const evaluatedAnswers = [];

  for (const answer of answers) {
    const isCorrect = answer.selectedOption === answer.question.correctOption;
    if (isCorrect) score++;

    await prisma.studentAnswer.update({
      where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
      data: { isCorrect },
    });

    evaluatedAnswers.push({
      questionId: answer.question.id,
      questionText: answer.question.questionText,
      options: {
        A: answer.question.optionA,
        B: answer.question.optionB,
        C: answer.question.optionC,
        D: answer.question.optionD,
      },
      topic: answer.question.topic,
      myAnswer: answer.selectedOption,
      correctAnswer: answer.question.correctOption,
      isCorrect,
      explanation: answer.question.explanation,
    });
  }

  // Count unanswered questions
  const test = await prisma.mockTest.findUnique({
    where: { id: attempt.testId! },
    include: { questions: { select: { questionId: true } } },
  });
  const totalQuestions = test?.questions.length || answers.length;

  // Update attempt
  const updatedAttempt = await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      score,
      totalMarks: totalQuestions,
      status: finalStatus,
      endTime: new Date(),
    },
  });

  // Calculate duration
  const durationSecs = updatedAttempt.endTime && attempt.startTime
    ? Math.round((updatedAttempt.endTime.getTime() - attempt.startTime.getTime()) / 1000)
    : 0;

  return {
    attemptId,
    testTitle: attempt.test?.title,
    score,
    totalMarks: totalQuestions,
    percentage: totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0,
    answeredCount: answers.length,
    unansweredCount: totalQuestions - answers.length,
    durationSecs,
    review: evaluatedAnswers,
  };
};

// ============================================================
// STUDENT: GET ATTEMPT RESULT (after submission)
// ============================================================

export const getAttemptResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: { select: { id: true, title: true, durationMins: true } } },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    ensureStudentOwnership(req, attempt.studentId, 'You can only view your own attempt result');
    if (attempt.status === 'in_progress') {
      throw ApiError.badRequest('Attempt not yet submitted');
    }

    const answers = await prisma.studentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            correctOption: true,
            explanation: true,
            difficulty: true,
            topic: { select: { id: true, name: true } },
          },
        },
      },
    });

    const durationSecs = attempt.endTime && attempt.startTime
      ? Math.round((attempt.endTime.getTime() - attempt.startTime.getTime()) / 1000)
      : 0;

    res.json({
      success: true,
      data: {
        attemptId: attempt.id,
        testTitle: attempt.test?.title,
        status: attempt.status,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.totalMarks && attempt.totalMarks > 0
          ? Math.round(((attempt.score || 0) / attempt.totalMarks) * 100)
          : 0,
        durationSecs,
        submittedAt: attempt.endTime,
        review: answers.map((a: any) => ({
          questionId: a.question.id,
          questionText: a.question.questionText,
          options: {
            A: a.question.optionA,
            B: a.question.optionB,
            C: a.question.optionC,
            D: a.question.optionD,
          },
          topic: a.question.topic,
          difficulty: a.question.difficulty,
          myAnswer: a.selectedOption,
          correctAnswer: a.question.correctOption,
          isCorrect: a.isCorrect,
          explanation: a.question.explanation,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// STUDENT: GET MY ATTEMPT HISTORY
// ============================================================

export const getMyAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId,
        status: 'submitted',
      },
      include: {
        test: { select: { id: true, title: true } },
      },
      orderBy: { endTime: 'desc' },
    });

    res.json({
      success: true,
      data: attempts.map((a: any) => ({
        attemptId: a.id,
        testId: a.testId,
        testTitle: a.test?.title || 'Practice Session',
        attemptType: a.attemptType,
        score: a.score,
        totalMarks: a.totalMarks,
        percentage: a.totalMarks && a.totalMarks > 0
          ? Math.round(((a.score || 0) / a.totalMarks) * 100)
          : 0,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    });
  } catch (err) {
    next(err);
  }
};