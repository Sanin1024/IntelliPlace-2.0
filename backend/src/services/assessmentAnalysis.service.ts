import { prisma, ConfidenceLevel, IntegrityFlagType, IntegrityFlagStatus } from '../config/prisma.js';

export async function onAssessmentSubmitted(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { select: { title: true } },
      answers: {
        include: {
          question: {
            include: { topic: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!attempt || !attempt.studentId) return;

  const totalQuestions = attempt.answers.length;
  if (totalQuestions === 0) return;

  // 1. Check for Integrity Flags (Challenge 74)
  const startTime = attempt.startTime ? new Date(attempt.startTime).getTime() : 0;
  const endTime = attempt.endTime ? new Date(attempt.endTime).getTime() : Date.now();
  const durationSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));
  const secondsPerQuestion = durationSeconds / totalQuestions;
  const totalScorePercent =
    attempt.totalMarks && attempt.totalMarks > 0
      ? Math.round(((attempt.score || 0) / attempt.totalMarks) * 100)
      : 0;

  // Rapid completion rule: < 10 seconds per question with high score >= 90%
  if (secondsPerQuestion < 10 && totalScorePercent >= 90 && totalQuestions >= 5) {
    const details = {
      durationSeconds,
      totalQuestions,
      secondsPerQuestion: Math.round(secondsPerQuestion * 10) / 10,
      scorePercent: totalScorePercent,
      reason: `Completed ${totalQuestions} questions in ${durationSeconds}s (${secondsPerQuestion.toFixed(
        1
      )}s/q) with ${totalScorePercent}% score.`,
    };

    await prisma.assessmentIntegrityFlag.create({
      data: {
        studentId: attempt.studentId,
        attemptId: attempt.id,
        flagType: 'rapid_completion' as IntegrityFlagType,
        status: 'open' as IntegrityFlagStatus,
        details,
      },
    });

    // Notify PO / Admin
    const poUsers = await prisma.user.findMany({
      where: { role: { in: ['po', 'admin'] } },
      select: { id: true },
    });
    if (poUsers.length > 0) {
      const student = await prisma.user.findUnique({
        where: { id: attempt.studentId },
        select: { name: true },
      });
      const notif = await prisma.notification.create({
        data: {
          title: `Integrity Review Needed: ${student?.name || 'Student'}`,
          message: `Rapid completion flagged on "${attempt.test?.title || 'Assessment'}": ${durationSeconds}s for ${totalQuestions} questions with score ${totalScorePercent}%.`,
          createdBy: poUsers[0].id,
        },
      });
      await prisma.notificationRecipient.createMany({
        data: poUsers.map((u) => ({ notificationId: notif.id, userId: u.id })),
      });
    }
  }

  // 2. Aggregate skill evidence by topic (Challenge 66, 67)
  const topicStats = new Map<string, { total: number; correct: number }>();
  for (const ans of attempt.answers) {
    const topicName = ans.question?.topic?.name?.trim().toLowerCase();
    if (!topicName) continue;
    const existing = topicStats.get(topicName) || { total: 0, correct: 0 };
    existing.total += 1;
    if (ans.isCorrect) existing.correct += 1;
    topicStats.set(topicName, existing);
  }

  for (const [skill, stats] of topicStats.entries()) {
    const accuracy = Math.round((stats.correct / stats.total) * 100);
    let confidence: ConfidenceLevel = 'insufficient';
    if (stats.total >= 10) confidence = 'high';
    else if (stats.total >= 6) confidence = 'moderate';
    else if (stats.total >= 3) confidence = 'low';

    await prisma.skillEvidence.create({
      data: {
        studentId: attempt.studentId,
        skill,
        source: 'mock_test',
        accuracy,
        totalQuestions: stats.total,
        confidence,
        testAttemptId: attempt.id,
      },
    });

    // Update declared skill verified level if matching
    const declared = await prisma.declaredSkill.findUnique({
      where: { studentId_skill: { studentId: attempt.studentId, skill } },
    });
    if (declared) {
      const verifiedLevel = accuracy >= 75 ? 'advanced' : accuracy >= 50 ? 'intermediate' : 'beginner';
      await prisma.declaredSkill.update({
        where: { id: declared.id },
        data: {
          verifiedLevel,
          confidence,
          evidenceCount: declared.evidenceCount + stats.total,
        },
      });
    }
  }
}

export async function getIntegrityFlags(params?: { status?: string }) {
  const where: any = {};
  if (params?.status) where.status = params.status;

  return prisma.assessmentIntegrityFlag.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, email: true } },
      attempt: { select: { id: true, test: { select: { title: true } }, startTime: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function reviewIntegrityFlag(flagId: string, reviewerId: string, status: 'reviewed' | 'dismissed', note?: string) {
  return prisma.assessmentIntegrityFlag.update({
    where: { id: flagId },
    data: {
      status,
      reviewedBy: reviewerId,
      reviewNote: note || null,
      reviewedAt: new Date(),
    },
  });
}
