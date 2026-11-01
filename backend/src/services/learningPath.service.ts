import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';

// ============================================================
// TOPIC ACCURACY (Module 2/3 Alignment)
// ============================================================
export async function computeTopicAccuracy(
  studentId: string
): Promise<Array<{ topicId: number; topicName: string; accuracy: number }>> {
  const answers = await prisma.studentAnswer.findMany({
    where: {
      attempt: { studentId, status: 'submitted' },
      isCorrect: { not: null },
    },
    include: {
      question: {
        select: {
          topicId: true,
          topic: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  const topicMap = new Map<
    number,
    { topicId: number; topicName: string; total: number; correct: number }
  >();
  for (const answer of answers) {
    const { topicId, topic } = answer.question;
    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, { topicId, topicName: topic.name, total: 0, correct: 0 });
    }
    const entry = topicMap.get(topicId)!;
    entry.total++;
    if (answer.isCorrect) entry.correct++;
  }

  return [...topicMap.values()].map((t) => ({
    topicId: t.topicId,
    topicName: t.topicName,
    accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
  }));
}

// ============================================================
// PREREQUISITES (Challenge 55)
// ============================================================
export async function checkPrerequisites(studentId: string, moduleId: string) {
  const module = await prisma.learningModule.findUnique({
    where: { id: moduleId },
    include: { prerequisites: { include: { prerequisiteModule: true } } },
  });
  if (!module) throw ApiError.notFound('Module not found');

  const missing: Array<{ moduleId: string; title: string; level: string }> = [];
  for (const p of module.prerequisites) {
    const progress = await prisma.moduleProgress.findUnique({
      where: { studentId_moduleId: { studentId, moduleId: p.prerequisiteModuleId } },
    });
    // Satisfied if completed, OR an approved exception exists on THIS module's progress
    if (!progress || progress.status !== 'completed') {
      if (!progress?.prereqExceptionReason) {
        missing.push({
          moduleId: p.prerequisiteModuleId,
          title: p.prerequisiteModule.title,
          level: p.prerequisiteModule.level,
        });
      }
    }
  }
  return { satisfied: missing.length === 0, missing };
}

// ============================================================
// SKILL-LEVEL RECOMMENDATIONS (Challenge 54)
// ============================================================
export async function recommendResources(studentId: string) {
  // Knowledge level is ASSESSMENT-DERIVED (Module 3) — not self-reported
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { knowledgeLevel: true, cgpaVerified: true },
  });
  const level = profile?.knowledgeLevel ?? 'beginner';

  const [levelResources, weakTopics] = await Promise.all([
    prisma.resource.findMany({
      where: { difficulty: level, contentStatus: 'updated' },
      include: { topic: { select: { name: true } }, module: { select: { id: true } } },
      take: 20,
    }),
    computeTopicAccuracy(studentId), // accuracy < 60 ⇒ weak
  ]);
  const weakTopicIds = weakTopics.filter((t) => t.accuracy < 60).map((t) => t.topicId);

  const recommendations = [];
  for (const r of levelResources) {
    // Skip resources attached to modules whose prerequisites the student hasn't met (Ch 54/55)
    if (r.module) {
      const prereq = await checkPrerequisites(studentId, r.module.id);
      if (!prereq.satisfied) {
        recommendations.push({
          resourceId: r.id,
          title: r.title,
          topic: r.topic?.name,
          difficulty: r.difficulty,
          locked: true,
          explanation: `Complete first: ${prereq.missing.map((m) => m.title).join(', ')} — this material builds on those foundations.`,
        });
        continue;
      }
    }
    recommendations.push({
      resourceId: r.id,
      title: r.title,
      topic: r.topic?.name,
      difficulty: r.difficulty,
      locked: false,
      explanation: weakTopicIds.includes(r.topicId ?? -1)
        ? `Recommended because your accuracy in ${r.topic?.name} is below 60% — this ${r.difficulty}-level material targets that gap.`
        : `Matched to your assessed level (${level}).`,
    });
  }

  // Foundational suggestions for weak topics at the student's level
  const foundational = await prisma.resource.findMany({
    where: { topicId: { in: weakTopicIds }, difficulty: level, contentStatus: 'updated' },
    include: { topic: { select: { name: true } } },
    take: 5,
  });
  for (const r of foundational) {
    if (!recommendations.some((x) => x.resourceId === r.id)) {
      recommendations.push({
        resourceId: r.id,
        title: r.title,
        topic: r.topic?.name ?? null,
        difficulty: r.difficulty,
        locked: false,
        explanation: `Targets your weak topic (${r.topic?.name}) at your current level.`,
      });
    }
  }

  return { level, recommendations: recommendations.slice(0, 15) };
}

// ============================================================
// COMPETENCY-BASED COMPLETION (Challenge 57)
// ============================================================
/**
 * A module is NEVER completed by opening a resource. Completion requires:
 *  - assessmentTestId: best submitted attempt ≥ minPassingScore, OR
 *  - codingProblemId: a passed coding submission, OR
 *  - neither: explicit trainer verification (manual endpoint).
 * Reassessment: re-running evaluation overwrites bestScore; failed → status 'failed'.
 */
export async function evaluateModuleCompletion(studentId: string, moduleId: string) {
  const module = await prisma.learningModule.findUnique({ where: { id: moduleId } });
  if (!module) throw ApiError.notFound('Module not found');

  const progress = await prisma.moduleProgress.findUnique({
    where: { studentId_moduleId: { studentId, moduleId } },
  });
  if (!progress) throw ApiError.badRequest('Not enrolled in this module');
  if (progress.status === 'completed') {
    return { status: 'completed', bestScore: progress.bestScore, note: 'Already completed' };
  }

  let bestScore: number | null = null;
  let attempts = progress.attempts;
  let completed = false;
  let verifiedBy: string | null = null;
  let evidence: any = null;

  if (module.assessmentTestId) {
    const attemptRows = await prisma.testAttempt.findMany({
      where: { studentId, testId: module.assessmentTestId, status: 'submitted' },
      select: { id: true, score: true, totalMarks: true },
    });
    attempts = attemptRows.length;
    const scored = attemptRows
      .filter((a): a is typeof a & { totalMarks: number } => typeof a.totalMarks === 'number' && a.totalMarks > 0)
      .map((a) => Math.round(((a.score || 0) / a.totalMarks) * 100));
    bestScore = scored.length ? Math.max(...scored) : null;
    if (bestScore != null && bestScore >= module.minPassingScore) {
      completed = true;
      verifiedBy = 'assessment';
      evidence = { type: 'assessment', testId: module.assessmentTestId, bestScore, attempts };
    }
  } else if (module.codingProblemId) {
    const subs = await prisma.codingSubmission.findMany({
      where: { studentId, problemId: module.codingProblemId },
      select: { id: true, isPassed: true, passedTestCases: true, totalTestCases: true },
    });
    attempts = subs.length;
    const passed = subs.find((s) => s.isPassed);
    if (passed) {
      completed = true;
      bestScore = 100;
      verifiedBy = 'coding_submission';
      evidence = { type: 'coding', submissionId: passed.id, problemId: module.codingProblemId };
    }
  } else {
    // No automated evidence — requires trainer verification (manual endpoint)
    return {
      status: 'in_progress',
      bestScore: null,
      note: 'This module requires trainer verification of a practical submission.',
    };
  }

  await prisma.moduleProgress.update({
    where: { studentId_moduleId: { studentId, moduleId } },
    data: {
      status: completed ? 'completed' : 'failed',
      bestScore,
      attempts,
      verifiedBy: verifiedBy || progress.verifiedBy,
      ...(completed && { completedAt: new Date() }),
    },
  });

  // Competency record on success (Integration #2/#3)
  if (completed) {
    const skill = module.title;
    await prisma.competencyRecord.upsert({
      where: { studentId_skill: { studentId, skill } },
      update: {
        level: module.level,
        evidence,
        moduleId,
        verifiedBy: verifiedBy || 'assessment',
        verifiedAt: new Date(),
      },
      create: {
        studentId,
        skill,
        level: module.level,
        evidence,
        moduleId,
        verifiedBy: verifiedBy || 'assessment',
      },
    });
  }

  return {
    status: completed ? 'completed' : 'failed',
    bestScore,
    attempts,
    passingScore: module.minPassingScore,
  };
}

export async function grantPrerequisiteException(
  studentId: string,
  moduleId: string,
  reason: string,
  actorId: string
) {
  if (!reason || reason.trim().length < 10) {
    throw ApiError.badRequest('An exception justification of at least 10 characters is required');
  }
  await prisma.moduleProgress.upsert({
    where: { studentId_moduleId: { studentId, moduleId } },
    update: { prereqExceptionReason: reason, prereqExceptionBy: actorId },
    create: { studentId, moduleId, prereqExceptionReason: reason, prereqExceptionBy: actorId },
  });
  await audit(actorId, 'learning.prereq_exception', 'module_progress', `${studentId}:${moduleId}`, 'success', {
    reason,
  });
}
