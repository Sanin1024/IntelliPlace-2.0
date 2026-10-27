import { prisma } from '../config/prisma.js';

export interface ReadinessResult {
  score: number;
  overallScore: number;
  level: string;
  readinessLevel: string;
  band: string;
  breakdown: {
    aptitude: number;
    coding: number;
    profile: number;
    rawAptitude: number;
    rawCoding: number;
    rawProfile: number;
  };
  details: {
    mockCount: number;
    mockAvgPercentage: number;
    distinctSolvedProblems: number;
    totalCodingProblems: number;
    profileFields: {
      cgpa: number | null;
      hasResume: boolean;
      hasBranch: boolean;
      hasTargetRole: boolean;
    };
  };
}

/**
 * Single source of truth for student readiness score.
 *
 * Formula:
 * 1. Aptitude (60 points max):
 *    Average percentage across all submitted mock test attempts * 0.60.
 *    If no mock attempts exist: 0 points.
 *
 * 2. Coding (30 points max):
 *    Proportional points based on distinct solved problems:
 *    (distinctSolved / totalCodingProblems) * 30.
 *    If totalCodingProblems is 0: 0 points.
 *
 * 3. Profile (10 points max):
 *    - CGPA entered: +3
 *    - Resume uploaded: +3
 *    - Branch assigned: +2
 *    - Target role specified: +2
 *
 * Total Readiness Score:
 *    Math.round(aptitudeScore + codingScore + profileScore) [bounded 0-100]
 *
 * Exact Readiness Bands:
 *    - Not Ready (<40)
 *    - Almost Ready (40-70)
 *    - Ready (>70)
 */
export async function calculateStudentReadiness(studentId: string): Promise<ReadinessResult> {
  // 1. Mock test attempts
  const mockAttempts = await prisma.testAttempt.findMany({
    where: { studentId, attemptType: 'mock', status: 'submitted' },
    select: { score: true, totalMarks: true },
  });

  let aptitudeScore = 0;
  let mockAvgPercentage = 0;
  if (mockAttempts.length > 0) {
    const percentages = mockAttempts.map((a) => {
      if (!a.totalMarks || a.totalMarks <= 0) return 0;
      return ((a.score || 0) / a.totalMarks) * 100;
    });
    mockAvgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    aptitudeScore = (mockAvgPercentage / 100) * 60;
  }

  // 2. Distinct coding problems solved (proportional: 30 * distinctSolved / totalProblems)
  const [passedSubmissions, totalCodingProblems] = await Promise.all([
    prisma.codingSubmission.findMany({
      where: { studentId, isPassed: true },
      distinct: ['problemId'],
      select: { problemId: true },
    }),
    prisma.codingProblem.count(),
  ]);

  const distinctSolved = passedSubmissions.length;
  let codingScore = 0;
  if (totalCodingProblems > 0) {
    codingScore = (distinctSolved / totalCodingProblems) * 30;
  }

  // 3. Profile completeness
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { cgpa: true, resumeUrl: true, branchId: true, targetRole: true },
  });

  let profileScore = 0;
  const hasCgpa = profile?.cgpa !== null && profile?.cgpa !== undefined;
  const hasResume = Boolean(profile?.resumeUrl);
  const hasBranch = Boolean(profile?.branchId);
  const hasTargetRole = Boolean(profile?.targetRole);

  if (hasCgpa) profileScore += 3;
  if (hasResume) profileScore += 3;
  if (hasBranch) profileScore += 2;
  if (hasTargetRole) profileScore += 2;

  // Composite score & rounding rule
  const rawTotal = aptitudeScore + codingScore + profileScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  // Exact band labels: Not Ready (<40), Almost Ready (40-70), Ready (>70)
  const band =
    totalScore > 70 ? 'Ready (>70)' :
    totalScore >= 40 ? 'Almost Ready (40-70)' :
    'Not Ready (<40)';

  return {
    score: totalScore,
    overallScore: totalScore,
    level: band,
    readinessLevel: band,
    band,
    breakdown: {
      aptitude: Math.round(aptitudeScore * 100) / 100,
      coding: Math.round(codingScore * 100) / 100,
      profile: profileScore,
      rawAptitude: aptitudeScore,
      rawCoding: codingScore,
      rawProfile: profileScore,
    },
    details: {
      mockCount: mockAttempts.length,
      mockAvgPercentage: Math.round(mockAvgPercentage * 100) / 100,
      distinctSolvedProblems: distinctSolved,
      totalCodingProblems,
      profileFields: {
        cgpa: profile?.cgpa ?? null,
        hasResume,
        hasBranch,
        hasTargetRole,
      },
    },
  };
}
