import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { ensureStudentOwnership } from '../utils/ownership.js';
import { calculateStudentReadiness } from '../services/readiness.js';
import {
  getPlacementStats,
  getBranchWiseStats,
  getCompanyWiseStats,
  getSalaryAnalytics,
  getAssessmentAnalytics,
  AnalyticsFilters,
} from '../services/analytics.service.js';
import {
  generatePlacementReportCsv,
  generatePlacementReportExcel,
  generatePlacementReportPdf,
} from '../services/report.service.js';

// ============================================================
// HELPER: Get topic-wise accuracy for a student
// ============================================================

const computeTopicAccuracy = async (studentId: string) => {
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

  // Group by topic
  const topicMap = new Map<number, {
    topicId: number;
    topicName: string;
    total: number;
    correct: number;
    accuracy: number;
  }>();

  for (const answer of answers) {
    const { topicId, topic } = answer.question;
    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        topicId,
        topicName: topic.name,
        total: 0,
        correct: 0,
        accuracy: 0,
      });
    }
    const stat = topicMap.get(topicId)!;
    stat.total++;
    if (answer.isCorrect) stat.correct++;
  }

  // Calculate accuracy
  const result = Array.from(topicMap.values()).map((t) => ({
    ...t,
    accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
  }));

  return result;
};

// ============================================================
// GET /api/analytics/student/:id/topic-accuracy
// Student sees own; PO/Admin see any
// ============================================================

export const getTopicAccuracy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    // Security: students can only see own analytics
    ensureStudentOwnership(req, studentId, 'You can only view your own analytics');

    const accuracy = await computeTopicAccuracy(studentId);
    res.json({ success: true, data: accuracy });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/analytics/student/:id/weak-topics
// Topics with accuracy < 60%
// ============================================================

export const getWeakTopics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    ensureStudentOwnership(req, studentId, 'You can only view your own analytics');

    const allTopics = await computeTopicAccuracy(studentId);
    // Minimum-sample rule: at least 5 answered questions in a topic before flagging as weak
    const weakTopics = allTopics.filter((t) => t.total >= 5 && t.accuracy < 60);

    res.json({ success: true, data: weakTopics });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/analytics/student/:id/progress
// Score trend over time
// ============================================================

export const getProgressOverTime = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    ensureStudentOwnership(req, studentId, 'You can only view your own analytics');

    const attempts = await prisma.testAttempt.findMany({
      where: { studentId, status: 'submitted' },
      include: { test: { select: { title: true } } },
      orderBy: { endTime: 'asc' },
    });

    const progress = attempts.map((a: any, index: number) => ({
      attemptNumber: index + 1,
      attemptId: a.id,
      testTitle: a.test?.title || 'Practice',
      attemptType: a.attemptType,
      score: a.score || 0,
      totalMarks: a.totalMarks || 0,
      percentage: a.totalMarks && a.totalMarks > 0
        ? Math.round(((a.score || 0) / a.totalMarks) * 100)
        : 0,
      date: a.endTime,
    }));

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/analytics/student/:id/readiness
// Composite readiness score
// ============================================================

export const getReadinessScore = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    ensureStudentOwnership(req, studentId, 'You can only view your own analytics');

    const readiness = await calculateStudentReadiness(studentId);

    res.json({
      success: true,
      data: {
        readinessScore: readiness.score,
        readinessBand: readiness.band,
        readinessLevel: readiness.band,
        score: readiness.score,
        overallScore: readiness.score,
        level: readiness.band,
        band: readiness.band,
        breakdown: {
          aptitude: {
            points: Math.round(readiness.breakdown.aptitude),
            maxPoints: 60,
            mockTestsTaken: readiness.details.mockCount,
            note: readiness.details.mockCount === 0 ? 'Take a mock test to earn aptitude points' : 'Based on mock test average',
          },
          coding: {
            points: Math.round(readiness.breakdown.coding),
            maxPoints: 30,
            problemsSolved: readiness.details.distinctSolvedProblems,
            totalProblems: readiness.details.totalCodingProblems,
            note: readiness.details.distinctSolvedProblems === 0 ? 'Solve coding problems to earn coding points' : `${readiness.details.distinctSolvedProblems} of ${readiness.details.totalCodingProblems} distinct problems solved`,
          },
          profile: {
            points: readiness.breakdown.profile,
            maxPoints: 10,
            note: 'Complete your profile (CGPA, resume, branch, target role)',
          },
        },
        components: {
          aptitude: readiness.breakdown.aptitude,
          coding: readiness.breakdown.coding,
          profile: readiness.breakdown.profile,
        },
        details: readiness.details,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET /api/analytics/student/:id/recommendations
// Rule-based recommendations (NO AI)
// ============================================================

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    ensureStudentOwnership(req, studentId, 'You can only view your own recommendations');

    const recommendations: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      message: string;
      action: { label: string; link: string };
    }> = [];

    // Get profile for knowledge level
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { knowledgeLevel: true, resumeUrl: true, cgpa: true, targetRole: true },
    });

    // Get topic accuracy
    const topicAccuracy = await computeTopicAccuracy(studentId);

    // Get total attempts count
    const totalAttempts = await prisma.testAttempt.count({
      where: { studentId, status: 'submitted' },
    });

    // ===== RULE 1: No attempts yet =====
    if (totalAttempts === 0) {
      recommendations.push({
        type: 'get_started',
        priority: 'high',
        title: 'Start Your First Mock Test',
        message: 'You haven\'t taken any tests yet. Take a mock test to assess your current level and identify weak areas.',
        action: { label: 'Browse Mock Tests', link: '/tests' },
      });

      if (profile?.knowledgeLevel === 'beginner') {
        recommendations.push({
          type: 'beginner_path',
          priority: 'high',
          title: 'Beginner? Start with Easy Practice',
          message: 'Since you selected "Beginner" level, start with easy aptitude questions to build your foundation.',
          action: { label: 'Start Practicing', link: '/practice' },
        });
      }
    }

    // ===== RULE 2: Weak topics (< 60% accuracy) =====
    const weakTopics = topicAccuracy.filter((t) => t.accuracy < 60);
    for (const weak of weakTopics) {
      recommendations.push({
        type: 'weak_topic',
        priority: 'high',
        title: `Improve: ${weak.topicName}`,
        message: `Your accuracy in ${weak.topicName} is ${weak.accuracy}% (${weak.correct}/${weak.total}). Review the concepts and practice more questions in this area.`,
        action: { label: `Practice ${weak.topicName}`, link: `/practice?topic=${weak.topicId}` },
      });

      // Find resources for this topic
      const resources = await prisma.resource.findMany({
        where: { topicId: weak.topicId },
        select: { id: true, title: true },
        take: 2,
      });
      if (resources.length > 0) {
        recommendations.push({
          type: 'weak_topic_resource',
          priority: 'medium',
          title: `Study Material for ${weak.topicName}`,
          message: `Check out: ${resources.map((r: any) => r.title).join(', ')}`,
          action: { label: 'View Resources', link: '/resources' },
        });
      }
    }

    // ===== RULE 3: Strong topics (>= 80% accuracy) =====
    const strongTopics = topicAccuracy.filter((t) => t.accuracy >= 80);
    for (const strong of strongTopics) {
      recommendations.push({
        type: 'strong_topic',
        priority: 'low',
        title: `Challenge Yourself: ${strong.topicName}`,
        message: `Great job! ${strong.accuracy}% accuracy in ${strong.topicName}. Try harder difficulty questions to maintain your edge.`,
        action: { label: 'Try Hard Questions', link: `/practice?topic=${strong.topicId}&difficulty=hard` },
      });
    }

    // ===== RULE 4: Profile incomplete =====
    if (profile) {
      const missingFields = [];
      if (!profile.resumeUrl) missingFields.push('resume URL');
      if (profile.cgpa === null) missingFields.push('CGPA');
      if (!profile.targetRole) missingFields.push('target role');

      if (missingFields.length > 0) {
        recommendations.push({
          type: 'profile_incomplete',
          priority: 'medium',
          title: 'Complete Your Profile',
          message: `You're missing: ${missingFields.join(', ')}. A complete profile improves your readiness score.`,
          action: { label: 'Update Profile', link: '/profile' },
        });
      }
    }

    // ===== RULE 5: No coding practice =====
    const codingCount = await prisma.codingSubmission.count({
      where: { studentId },
    });
    if (codingCount === 0 && totalAttempts > 0) {
      recommendations.push({
        type: 'start_coding',
        priority: 'medium',
        title: 'Try Coding Problems',
        message: 'You haven\'t attempted any coding problems yet. Coding is a major part of technical interviews — start practicing!',
        action: { label: 'Browse Problems', link: '/problems' },
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.json({ success: true, data: recommendations });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PO: GET ALL STUDENT ANALYTICS (batch overview)
// ============================================================

export const getBatchAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only PO or Admin can access this
    if (!['po', 'admin'].includes(req.user!.role)) {
      throw ApiError.forbidden('Only Placement Officers can view batch analytics');
    }

    const batchId = req.query.batchId ? parseInt(req.query.batchId as string) : undefined;

    // Get all students (optionally filtered by batch)
    const students = await prisma.studentProfile.findMany({
      where: batchId ? { batchId } : {},
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    // For each student, compute readiness + attempts
    const studentStats = await Promise.all(
      students.map(async (sp: any) => {
        const attempts = await prisma.testAttempt.count({
          where: { studentId: sp.userId, status: 'submitted' },
        });

        const mockAttempts = await prisma.testAttempt.findMany({
          where: { studentId: sp.userId, attemptType: 'mock', status: 'submitted' },
          select: { score: true, totalMarks: true },
        });

        const avgScore = mockAttempts.length > 0
          ? Math.round(
              mockAttempts.reduce((sum: number, a: any) =>
                sum + (a.totalMarks && a.totalMarks > 0 ? ((a.score || 0) / a.totalMarks) * 100 : 0),
              0) / mockAttempts.length
            )
          : null;

        return {
          studentId: sp.userId,
          name: sp.user.name,
          email: sp.user.email,
          branch: sp.branch?.name,
          batch: sp.batch?.name,
          knowledgeLevel: sp.knowledgeLevel,
          cgpa: sp.cgpa,
          placementStatus: sp.placementStatus,
          totalAttempts: attempts,
          mockTestsTaken: mockAttempts.length,
          avgMockScore: avgScore,
        };
      })
    );

    res.json({ success: true, data: studentStats });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// Challenges 336–350: Centralized PO & Admin Reporting & Analytics
// ============================================================

const parseAnalyticsFilters = (req: Request): AnalyticsFilters => ({
  batchId: req.query.batchId ? parseInt(req.query.batchId as string, 10) : undefined,
  branchId: req.query.branchId ? parseInt(req.query.branchId as string, 10) : undefined,
  companyId: req.query.companyId as string | undefined,
  graduatingBatch: req.query.graduatingBatch as string | undefined,
  entryType: req.query.entryType as string | undefined,
});

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getPlacementStats(parseAnalyticsFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getBranchStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getBranchWiseStats(parseAnalyticsFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getCompanyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getCompanyWiseStats(parseAnalyticsFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSalaryStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getSalaryAnalytics(parseAnalyticsFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getAssessmentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAssessmentAnalytics(parseAnalyticsFilters(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Exports (Challenges 345, 346)
export const exportCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await generatePlacementReportCsv(parseAnalyticsFilters(req));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="placement_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = await generatePlacementReportExcel(parseAnalyticsFilters(req));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="placement_report.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buffer = await generatePlacementReportPdf(parseAnalyticsFilters(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="placement_report.pdf"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};
