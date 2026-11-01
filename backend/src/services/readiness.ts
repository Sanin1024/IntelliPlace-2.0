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
export function classifyReadinessBand(totalScore: number): string {
  if (totalScore > 70) return 'Ready (>70)';
  if (totalScore >= 40) return 'Almost Ready (40-70)';
  return 'Not Ready (<40)';
}

export function computeReadinessScoreFromInputs(params: {
  mockAvgPercentage: number;
  distinctSolved: number;
  totalCodingProblems: number;
  hasCgpa: boolean;
  hasResume: boolean;
  hasBranch: boolean;
  hasTargetRole: boolean;
}): {
  aptitudeScore: number;
  codingScore: number;
  profileScore: number;
  totalScore: number;
  band: string;
} {
  const aptitudeScore = params.mockAvgPercentage > 0 ? (params.mockAvgPercentage / 100) * 60 : 0;
  const codingScore = params.totalCodingProblems > 0
    ? (params.distinctSolved / params.totalCodingProblems) * 30
    : 0;

  let profileScore = 0;
  if (params.hasCgpa) profileScore += 3;
  if (params.hasResume) profileScore += 3;
  if (params.hasBranch) profileScore += 2;
  if (params.hasTargetRole) profileScore += 2;

  const rawTotal = aptitudeScore + codingScore + profileScore;
  const totalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));
  const band = classifyReadinessBand(totalScore);

  return {
    aptitudeScore,
    codingScore,
    profileScore,
    totalScore,
    band,
  };
}

export async function calculateStudentReadiness(studentId: string): Promise<ReadinessResult> {
  // 1. Mock test attempts
  const mockAttempts = await prisma.testAttempt.findMany({
    where: { studentId, attemptType: 'mock', status: 'submitted' },
    select: { score: true, totalMarks: true },
  });

  let mockAvgPercentage = 0;
  if (mockAttempts.length > 0) {
    const percentages = mockAttempts.map((a) => {
      if (!a.totalMarks || a.totalMarks <= 0) return 0;
      return ((a.score || 0) / a.totalMarks) * 100;
    });
    mockAvgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  }

  // 2. Distinct coding problems solved (proportional: 30 * distinctSolved / totalProblems)
  // Department scoping: the denominator only counts problems the student can access
  // (global problems + those of the student's own department)
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { branchId: true },
  });
  const branchScope =
    studentProfile?.branchId != null
      ? { OR: [{ branchId: null }, { branchId: studentProfile.branchId }] }
      : { branchId: null };

  const [passedSubmissions, totalCodingProblems] = await Promise.all([
    prisma.codingSubmission.findMany({
      where: { studentId, isPassed: true },
      distinct: ['problemId'],
      select: { problemId: true },
    }),
    prisma.codingProblem.count({ where: branchScope }),
  ]);

  const distinctSolved = passedSubmissions.length;

  // 3. Profile completeness
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { cgpa: true, resumeUrl: true, branchId: true, targetRole: true },
  });

  const hasCgpa = profile?.cgpa !== null && profile?.cgpa !== undefined;
  const hasResume = Boolean(profile?.resumeUrl);
  const hasBranch = Boolean(profile?.branchId);
  const hasTargetRole = Boolean(profile?.targetRole);

  const { aptitudeScore, codingScore, profileScore, totalScore, band } =
    computeReadinessScoreFromInputs({
      mockAvgPercentage,
      distinctSolved,
      totalCodingProblems,
      hasCgpa,
      hasResume,
      hasBranch,
      hasTargetRole,
    });

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
