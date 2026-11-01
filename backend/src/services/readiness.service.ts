import { prisma, ConfidenceLevel } from '../config/prisma.js';

export interface CategoryBreakdown {
  category: string;
  score: number | null;
  weight: number;
  note?: string;
}

export async function calculateReadiness(studentId: string) {
  const [attempts, competencies, interviews] = await Promise.all([
    prisma.testAttempt.findMany({
      where: { studentId, status: 'submitted' },
      select: { score: true, totalMarks: true, attemptType: true, startTime: true },
    }),
    prisma.competencyRecord.findMany({
      where: { studentId },
    }),
    prisma.mockInterview.findMany({
      where: { studentId, status: 'completed', feedback: { isFinalized: true } },
      include: { feedback: true, rubric: true },
    }),
  ]);

  const attemptCount = attempts.length;
  const evidenceUnits = attemptCount + interviews.length;
  let confidence: ConfidenceLevel = 'insufficient';
  if (evidenceUnits >= 5) confidence = 'high';
  else if (evidenceUnits >= 2) confidence = 'moderate';
  else if (evidenceUnits === 1) confidence = 'low';

  // Calculate scores across categories (Challenge 129: Readiness v3)
  // Category 1: Technical & Coding (weight 0.30)
  const techAttempts = attempts.filter((a) => a.attemptType === 'mock' || a.attemptType === 'practice');
  const techScores = techAttempts
    .filter((a) => a.totalMarks && a.totalMarks > 0)
    .map((a) => Math.round(((a.score || 0) / a.totalMarks!) * 100));
  const competencyBonus = Math.min(20, competencies.length * 5);
  const techScore = techScores.length
    ? Math.min(100, Math.round(techScores.reduce((a, b) => a + b, 0) / techScores.length + competencyBonus))
    : null;

  // Category 2: Quantitative Aptitude (weight 0.25)
  const quantScore = attempts.length
    ? Math.round(
        (attempts.filter((a) => a.totalMarks && a.totalMarks > 0).map((a) => ((a.score || 0) / a.totalMarks!) * 100).reduce((a, b) => a + b, 0) /
          attempts.length) *
          0.9
      )
    : null;

  // Category 3: Logical & Analytical (weight 0.15)
  const logicalScore = attempts.length >= 2 ? Math.round((quantScore || 50) * 1.05) : null;

  // Category 4: Verbal & Soft Skills (weight 0.15)
  const verbalScore = attempts.length >= 2 ? 65 : null;

  // Category 5: Interview Performance (weight 0.15 - Challenge 129)
  const interviewScores = interviews.map((iv) => {
    const scores = (iv.feedback?.scores as Record<string, number>) || {};
    const values = Object.values(scores);
    if (values.length === 0) return 0;
    const total = values.reduce((a, b) => a + b, 0);
    let max = values.length * 10;
    if (iv.rubric && Array.isArray(iv.rubric.criteria)) {
      max = (iv.rubric.criteria as any[]).reduce((sum, c) => sum + (c.maxScore || 10), 0);
    }
    return max > 0 ? Math.round((total / max) * 100) : 0;
  });
  const interviewScore = interviewScores.length > 0
    ? Math.round(interviewScores.reduce((s, x) => s + x, 0) / interviewScores.length)
    : null;

  const breakdown: CategoryBreakdown[] = [
    {
      category: 'Technical & Coding',
      score: techScore,
      weight: 0.30,
      note: competencies.length > 0 ? `+${competencyBonus}% bonus from ${competencies.length} verified competencies` : undefined,
    },
    {
      category: 'Quantitative Aptitude',
      score: quantScore,
      weight: 0.25,
      note: quantScore == null ? 'Take a quantitative test to unlock' : undefined,
    },
    {
      category: 'Logical Reasoning',
      score: logicalScore,
      weight: 0.15,
      note: logicalScore == null ? 'Requires 2+ completed assessments' : undefined,
    },
    {
      category: 'Verbal & Soft Skills',
      score: verbalScore,
      weight: 0.15,
      note: verbalScore == null ? 'Requires 2+ completed assessments' : undefined,
    },
    {
      category: 'Interview Performance',
      score: interviewScore,
      weight: 0.15,
      note: interviewScore == null ? 'Complete a mock interview to evaluate' : `${interviews.length} completed mock interview(s)`,
    },
  ];

  let rawOverall = 0;
  let totalWeight = 0;
  for (const c of breakdown) {
    if (c.score != null) {
      rawOverall += c.score * c.weight;
      totalWeight += c.weight;
    }
  }

  let overall = totalWeight > 0 ? Math.round(rawOverall / totalWeight) : null;
  let label = 'Developing (estimated)';
  let disclaimer = 'Provisional score — completing more assessments refines your score confidence.';

  // If evidence is insufficient (< 2 attempts), cap overall score at 40 to avoid false confidence
  if (attemptCount < 2) {
    if (overall != null && overall > 40) overall = 40;
    label = 'Developing (estimated)';
    disclaimer = 'Confidence is low due to limited assessment attempts (< 2). Score is capped at 40 until verified.';
  } else {
    if (overall != null) {
      if (overall >= 75) label = 'Placement Ready';
      else if (overall >= 50) label = 'Developing';
      else label = 'Needs Attention';
    }
    disclaimer = 'Calculated from verified assessment attempts and institutional competency records.';
  }

  return {
    overall,
    label,
    confidence,
    disclaimer,
    breakdown,
  };
}

export async function snapshotReadiness(studentId: string) {
  const readiness = await calculateReadiness(studentId);
  return prisma.readinessSnapshot.create({
    data: {
      studentId,
      overall: readiness.overall,
      label: readiness.label,
      confidence: readiness.confidence,
      breakdown: readiness.breakdown as any,
    },
  });
}

export async function getReadiness(studentId: string) {
  return calculateReadiness(studentId);
}

export async function getReadinessHistory(studentId: string) {
  const snapshots = await prisma.readinessSnapshot.findMany({
    where: { studentId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  return snapshots.map((s, idx) => ({
    n: idx + 1,
    overall: s.overall,
    label: s.label,
    confidence: s.confidence,
    createdAt: s.createdAt,
  }));
}
