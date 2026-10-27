import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { ensureStudentOwnership } from '../utils/ownership.js';
import { calculateStudentReadiness } from '../services/readiness.js';

/**
 * GET /api/students/me
 * Current student gets their own profile
 */
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            placementStatus: true,
            resumeUrl: true,
            targetRole: true,
            branch: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true, graduationYear: true } },
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('User not found');
    if (!user.studentProfile) {
      throw ApiError.badRequest('Profile not found for this user');
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/students/me
 * Update own profile
 */
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, branchId, batchId, knowledgeLevel, cgpa, resumeUrl, targetRole } = req.body;

    // Validate branch/batch exist if provided
    if (branchId) {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) throw ApiError.badRequest('Invalid branch ID');
    }
    if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw ApiError.badRequest('Invalid batch ID');
    }

    // Update user name if provided
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    // Build profile update data
    const profileData: any = {};
    if (branchId !== undefined) profileData.branchId = branchId;
    if (batchId !== undefined) profileData.batchId = batchId;
    if (knowledgeLevel) profileData.knowledgeLevel = knowledgeLevel;
    if (cgpa !== undefined) profileData.cgpa = cgpa;
    if (resumeUrl !== undefined) profileData.resumeUrl = resumeUrl;
    if (targetRole !== undefined) profileData.targetRole = targetRole;

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: profileData,
      select: {
        knowledgeLevel: true,
        cgpa: true,
        placementStatus: true,
        resumeUrl: true,
        targetRole: true,
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true, graduationYear: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/:id
 * A student can only view their own data.
 * PO and Admin can view any student.
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Security check: students can only view their own profile
    ensureStudentOwnership(req, id, 'You can only view your own profile');

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            placementStatus: true,
            resumeUrl: true,
            targetRole: true,
            branch: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true, graduationYear: true } },
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('Student not found');
    if (!user.studentProfile) throw ApiError.notFound('This user is not a student');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/me/dashboard
 * Consolidated dashboard data for student
 */
export const getStudentDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    // 1. Student profile with branch & batch
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            placementStatus: true,
            resumeUrl: true,
            targetRole: true,
            branchId: true,
            batchId: true,
            branch: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true, graduationYear: true } },
          },
        },
      },
    });

    if (!user || !user.studentProfile) throw ApiError.notFound('Student profile not found');
    const profile = user.studentProfile;

    // 2. Mock test attempts & coding submissions
    const [mockAttempts, passedCodingProblems, totalProblemsCount, studentAnswers, myTargets, availableTests, companies, notifications] = await Promise.all([
      prisma.testAttempt.findMany({
        where: { studentId, attemptType: 'mock', status: 'submitted' },
        select: { id: true, score: true, totalMarks: true, endTime: true, test: { select: { title: true } } },
        orderBy: { endTime: 'asc' },
      }),
      prisma.codingSubmission.findMany({
        where: { studentId, isPassed: true },
        distinct: ['problemId'],
        select: { problemId: true },
      }),
      prisma.codingProblem.count(),
      prisma.studentAnswer.findMany({
        where: { attempt: { studentId, status: 'submitted' }, isCorrect: { not: null } },
        include: { question: { select: { topicId: true, topic: { select: { id: true, name: true } } } } },
      }),
      prisma.studentTargetCompany.findMany({
        where: { userId: studentId },
        select: { companyId: true },
      }),
      prisma.mockTest.findMany({
        where: { isActive: true },
        include: {
          questions: { select: { questionId: true } },
          batch: { select: { id: true, name: true } },
          attempts: {
            where: { studentId, attemptType: 'mock' },
            select: { id: true, status: true, score: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.company.findMany({
        include: {
          eligibleBranches: { include: { branch: true } },
          topics: { include: { topic: true } },
        },
        orderBy: { driveDate: 'asc' },
      }),
      prisma.notificationRecipient.findMany({
        where: { userId: studentId },
        include: { notification: true },
        orderBy: { notification: { createdAt: 'desc' } },
        take: 5,
      }),
    ]);

    // 3. Readiness calculation via unified service
    const readiness = await calculateStudentReadiness(studentId);
    const missingProfileFields: string[] = [];
    if (profile.cgpa === null || profile.cgpa === undefined) missingProfileFields.push('CGPA');
    if (!profile.resumeUrl) missingProfileFields.push('Resume');
    if (!profile.branchId) missingProfileFields.push('Branch');
    if (!profile.targetRole) missingProfileFields.push('Target Role');


    // 4. Topic accuracy & weak/strong topics
    const topicMap = new Map<number, { topicId: number; topicName: string; total: number; correct: number }>();
    for (const ans of studentAnswers) {
      const { topicId, topic } = ans.question;
      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, { topicId, topicName: topic.name, total: 0, correct: 0 });
      }
      const s = topicMap.get(topicId)!;
      s.total++;
      if (ans.isCorrect) s.correct++;
    }

    const topicAccuracy = Array.from(topicMap.values()).map((t) => ({
      ...t,
      accuracy: Math.round((t.correct / t.total) * 100),
    }));

    // Weak topics: >= 5 answers and accuracy < 60%
    const weakTopics = topicAccuracy.filter((t) => t.total >= 5 && t.accuracy < 60);
    // Strong topics: accuracy >= 80%
    const strongTopics = topicAccuracy.filter((t) => t.accuracy >= 80);

    // 5. Score over time progress chart data
    const progress = mockAttempts.map((a: any, i: number) => ({
      attemptNumber: i + 1,
      testTitle: a.test?.title || `Test ${i + 1}`,
      percentage: a.totalMarks && a.totalMarks > 0 ? Math.round(((a.score || 0) / a.totalMarks) * 100) : 0,
      date: a.endTime,
    }));

    // 6. Mock tests with availability
    const targetCompanyIds = new Set(myTargets.map((t: any) => t.companyId));
    const now = new Date();

    const formattedMockTests = availableTests.map((t: any) => {
      const isBatchEligible = !t.batchId || t.batchId === profile.batchId;
      const isWindowOpen = (!t.availableFrom || now >= t.availableFrom) && (!t.availableUntil || now <= t.availableUntil);
      const remainingAttempts = Math.max(0, t.maxAttempts - t.attempts.length);
      const isAvailable = isBatchEligible && isWindowOpen && remainingAttempts > 0;

      return {
        id: t.id,
        title: t.title,
        durationMins: t.durationMins,
        availableFrom: t.availableFrom,
        availableUntil: t.availableUntil,
        questionCount: t.questions.length,
        maxAttempts: t.maxAttempts,
        attemptsUsed: t.attempts.length,
        remainingAttempts,
        isAvailable,
        isBatchEligible,
        isWindowOpen,
      };
    });

    // 7. Companies with eligibility and pinned targets
    const formattedCompanies = companies.map((c: any) => {
      const reasons: string[] = [];
      if (c.eligibilityCgpa !== null && (profile.cgpa === null || profile.cgpa < c.eligibilityCgpa)) {
        reasons.push(profile.cgpa === null ? `CGPA not set (requires ${c.eligibilityCgpa}+)` : `CGPA ${profile.cgpa} below required ${c.eligibilityCgpa}`);
      }
      const eligibleBranchIds = c.eligibleBranches.map((eb: any) => eb.branchId);
      if (eligibleBranchIds.length > 0 && (!profile.branchId || !eligibleBranchIds.includes(profile.branchId))) {
        reasons.push(`Branch not eligible`);
      }
      if (profile.placementStatus === 'placed') reasons.push('Already placed');

      const isEligible = reasons.length === 0;
      const isTarget = targetCompanyIds.has(c.id);
      const daysUntilDrive = c.driveDate ? Math.ceil((new Date(c.driveDate).getTime() - Date.now()) / (86400000)) : null;

      return {
        id: c.id,
        name: c.name,
        jobRole: c.jobRole,
        package: c.package,
        driveDate: c.driveDate,
        daysUntilDrive,
        eligibilityCgpa: c.eligibilityCgpa,
        isEligible,
        reasons,
        isTarget,
        eligibleBranches: c.eligibleBranches.map((eb: any) => eb.branch?.name).filter(Boolean),
      };
    }).sort((a: any, b: any) => {
      if (a.isTarget && !b.isTarget) return -1;
      if (!a.isTarget && b.isTarget) return 1;
      return (a.daysUntilDrive ?? 999) - (b.daysUntilDrive ?? 999);
    });

    // 8. Latest notifications
    const formattedNotifications = notifications.map((n: any) => ({
      id: n.notification.id,
      title: n.notification.title,
      message: n.notification.message,
      createdAt: n.notification.createdAt,
      isRead: n.isRead,
    }));
    const unreadNotificationsCount = formattedNotifications.filter((n: any) => !n.isRead).length;

    // Has any attempts taken?
    const hasAttempts = mockAttempts.length > 0 || studentAnswers.length > 0;

    // Rule-based recommendations
    const recommendations: Array<{
      type: string;
      priority: 'high' | 'medium' | 'low';
      title: string;
      message: string;
      action: { label: string; link: string };
    }> = [];

    if (!hasAttempts) {
      recommendations.push({
        type: 'get_started',
        priority: 'high',
        title: 'Start Your First Practice Session',
        message: 'Take a practice session to assess your current knowledge level and begin building your readiness score.',
        action: { label: 'Start Practicing', link: '/practice' },
      });
    }

    for (const weak of weakTopics) {
      recommendations.push({
        type: 'weak_topic',
        priority: 'high',
        title: `Improve: ${weak.topicName}`,
        message: `Your accuracy in ${weak.topicName} is ${weak.accuracy}%. Review concepts and practice more questions.`,
        action: { label: `Practice ${weak.topicName}`, link: `/practice?topic=${weak.topicId}` },
      });
    }

    for (const strong of strongTopics.slice(0, 2)) {
      recommendations.push({
        type: 'strong_topic',
        priority: 'low',
        title: `Maintain Edge: ${strong.topicName}`,
        message: `High performance (${strong.accuracy}%) in ${strong.topicName}. Try hard difficulty to stay sharp.`,
        action: { label: 'Try Hard Questions', link: `/practice?topic=${strong.topicId}&difficulty=hard` },
      });
    }

    if (missingProfileFields.length > 0) {
      recommendations.push({
        type: 'profile_incomplete',
        priority: 'medium',
        title: 'Complete Your Profile',
        message: `Missing: ${missingProfileFields.join(', ')}. Complete your profile to earn up to 10 readiness points.`,
        action: { label: 'Update Profile', link: '/profile' },
      });
    }

    res.json({
      success: true,
      data: {
        recommendations,
        profile: {
          name: user.name,
          email: user.email,
          knowledgeLevel: profile.knowledgeLevel,
          cgpa: profile.cgpa,
          placementStatus: profile.placementStatus,
          targetRole: profile.targetRole,
          resumeUrl: profile.resumeUrl,
          branchName: profile.branch?.name,
          batchName: profile.batch?.name,
          missingProfileFields,
        },
        readiness: {
          score: readiness.score,
          overallScore: readiness.score,
          level: readiness.band,
          readinessLevel: readiness.band,
          band: readiness.band,
          breakdown: {
            aptitude: { points: Math.round(readiness.breakdown.aptitude), maxPoints: 60, testsCount: readiness.details.mockCount },
            coding: { points: Math.round(readiness.breakdown.coding), maxPoints: 30, problemsCount: readiness.details.distinctSolvedProblems },
            profile: { points: readiness.breakdown.profile, maxPoints: 10 },
          },
        },
        topicAccuracy,
        weakTopics,
        strongTopics,
        progress,
        mockTests: formattedMockTests,
        drives: formattedCompanies,
        upcomingDrives: formattedCompanies,
        notifications: formattedNotifications,
        unreadNotificationsCount,
        hasAttempts,
      },
    });
  } catch (err) {
    next(err);
  }
};