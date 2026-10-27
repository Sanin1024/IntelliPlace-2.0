import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

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
