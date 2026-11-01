import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

/**
 * POST /api/practice/start
 * Student starts a practice session.
 * Returns: attemptId + list of questions WITHOUT correctOption.
 */
export const startPractice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { topicId, difficulty, count } = req.body;
    const studentId = req.user!.id;

    // Verify topic exists and is aptitude type
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw ApiError.badRequest('Topic not found');
    if (topic.type !== 'aptitude') {
      throw ApiError.badRequest('Practice mode is for aptitude topics only');
    }

    // Fetch random questions (WITHOUT correctOption and explanation)
    const allQuestions = await prisma.aptitudeQuestion.findMany({
      where: {
        topicId,
        ...(difficulty ? { difficulty: difficulty as any } : {}),
      },
      select: {
        id: true,
        topicId: true,
        difficulty: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
      },
    });

    if (allQuestions.length === 0) {
      throw ApiError.badRequest('No questions available for this topic yet');
    }

    // Shuffle and take N
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Create a practice attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        studentId,
        attemptType: 'practice',
        status: 'in_progress',
        totalMarks: selected.length,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt.id,
        totalQuestions: selected.length,
        questions: selected,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/practice/answer
 * Student submits answer for one question.
 * Returns: isCorrect, correctOption, explanation.
 */
export const submitAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId, questionId, selectedOption } = req.body;
    const studentId = req.user!.id;

    // Verify attempt belongs to this student and is in progress
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) {
      throw ApiError.forbidden('This attempt does not belong to you');
    }
    if (attempt.status !== 'in_progress') {
      throw ApiError.badRequest('This practice session is already completed');
    }

    // Verify question exists
    const question = await prisma.aptitudeQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) throw ApiError.notFound('Question not found');

    // Check if already answered this question in this attempt
    const existingAnswer = await prisma.studentAnswer.findUnique({
      where: {
        attemptId_questionId: { attemptId, questionId },
      },
    });
    if (existingAnswer) {
      throw ApiError.badRequest('You have already answered this question in this session');
    }

    // Evaluate
    const isCorrect = question.correctOption === selectedOption;

    // Save answer and update attempt score atomically
    const { correctCount, totalAnswered } = await prisma.$transaction(async (tx) => {
      await tx.studentAnswer.create({
        data: {
          attemptId,
          questionId,
          selectedOption,
          isCorrect,
        },
      });

      const answers = await tx.studentAnswer.findMany({
        where: { attemptId },
      });
      const count = answers.filter((a) => a.isCorrect).length;
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: { score: count },
      });

      return { correctCount: count, totalAnswered: answers.length };
    });

    res.json({
      success: true,
      data: {
        isCorrect,
        correctOption: question.correctOption,
        explanation: question.explanation,
        currentScore: correctCount,
        totalAnswered,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/practice/finish
 * Student finishes the practice session.
 * Returns summary: total questions, correct, wrong, accuracy.
 */
export const finishPractice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { attemptId } = req.body;
    const studentId = req.user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { answers: true },
    });
    if (!attempt) throw ApiError.notFound('Attempt not found');
    if (attempt.studentId !== studentId) {
      throw ApiError.forbidden('This attempt does not belong to you');
    }

    // Mark as submitted
    const updated = await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'submitted',
        endTime: new Date(),
        score: attempt.answers.filter((a) => a.isCorrect).length,
        totalMarks: attempt.answers.length,
      },
    });

    // Get topic breakdown for this attempt
    const answersWithTopic = await prisma.studentAnswer.findMany({
      where: { attemptId },
      include: {
        question: {
          select: {
            topic: { select: { name: true } },
          },
        },
      },
    });

    const correctCount = answersWithTopic.filter((a) => a.isCorrect).length;
    const totalAnswered = answersWithTopic.length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    res.json({
      success: true,
      data: {
        attemptId: updated.id,
        totalAnswered,
        correctCount,
        wrongCount: totalAnswered - correctCount,
        accuracy,
        duration: updated.startTime && updated.endTime
          ? Math.round((updated.endTime.getTime() - updated.startTime.getTime()) / 1000)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};