import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { ensureStudentOwnership } from '../utils/ownership.js';
import { calculateStudentReadiness } from '../services/readiness.js';
import { getAcademicContext, computeCgpa } from '../services/academic.service.js';
import { reevaluateStudentForAppliedDrives } from '../services/eligibilityEngine.service.js';
import { audit } from '../services/audit.service.js';
import { logDataAccess } from '../services/privacy.service.js';

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
            cgpaVerified: true,
            academicStatus: true,
            universityId: true,
            ktuid: true,
            entryType: true,
            admissionYear: true,
            graduatingBatch: true,
            academicScheme: true,
            currentSemester: true,
            academicUpdatedAt: true,
            profileUpdatedAt: true,
            placementStatus: true,
            resumeUrl: true,
            targetRole: true,
            branch: { select: { id: true, name: true, code: true } },
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
 * Update own profile (Challenge 32: Self-service vs restricted field governance)
 */
export const updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { name, branchId, batchId, knowledgeLevel, cgpa, resumeUrl, targetRole, universityId, admissionYear } = req.body;

    const currentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!currentProfile) throw ApiError.notFound('Profile not found');

    // Challenge 32: If verified, restricted academic fields cannot be changed via regular profile update
    const isRestrictedLocked = currentProfile.academicStatus === 'verified';
    if (isRestrictedLocked) {
      if (branchId !== undefined && branchId !== currentProfile.branchId) {
        throw ApiError.badRequest('Branch cannot be edited directly after verification. Please submit a Profile Correction Request.');
      }
      if (batchId !== undefined && batchId !== currentProfile.batchId) {
        throw ApiError.badRequest('Batch cannot be edited directly after verification. Please submit a Profile Correction Request.');
      }
      if (universityId !== undefined && universityId !== currentProfile.universityId) {
        throw ApiError.badRequest('University ID cannot be edited directly after verification. Please submit a Profile Correction Request.');
      }
    }

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
    const profileData: any = {
      profileUpdatedAt: new Date(),
    };
    if (branchId !== undefined) profileData.branchId = branchId;
    if (batchId !== undefined) profileData.batchId = batchId;
    if (knowledgeLevel) profileData.knowledgeLevel = knowledgeLevel;
    if (resumeUrl !== undefined) profileData.resumeUrl = resumeUrl;
    if (targetRole !== undefined) profileData.targetRole = targetRole;
    if (admissionYear !== undefined) profileData.admissionYear = admissionYear;
    if (universityId !== undefined) profileData.universityId = universityId ? universityId.trim().toUpperCase() : null;

    // If student manually edits CGPA, reset verified status (Challenge 23)
    if (cgpa !== undefined && cgpa !== currentProfile.cgpa) {
      profileData.cgpa = cgpa;
      profileData.cgpaVerified = false;
      profileData.academicStatus = 'requires_correction';
      profileData.academicUpdatedAt = new Date();
    }

    const updated = await prisma.studentProfile.update({
      where: { userId },
      data: profileData,
      select: {
        knowledgeLevel: true,
        cgpa: true,
        cgpaVerified: true,
        academicStatus: true,
        universityId: true,
        admissionYear: true,
        placementStatus: true,
        resumeUrl: true,
        targetRole: true,
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true, graduationYear: true } },
      },
    });

    // Challenge 47: If CGPA changed, re-evaluate across all applied drives
    if (cgpa !== undefined && cgpa !== currentProfile.cgpa) {
      await reevaluateStudentForAppliedDrives(userId);
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('An account with this University ID already exists.');
    }
    next(err);
  }
};

/**
 * GET /api/students/:id
 * A student can only view their own data.
 * PO and Admin can view any student.
 * Trainers see limited academic info (CGPA redacted - Challenge 255).
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Security check: students can only view their own profile (Challenge 249/255)
    if (req.user?.role === 'student' && id !== req.user.id) {
      throw ApiError.forbidden('You can only view your own profile');
    }

    const isTrainer = req.user?.role === 'trainer';

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
            cgpa: !isTrainer, // Challenge 255: Hide CGPA from trainers
            cgpaVerified: !isTrainer,
            academicStatus: !isTrainer,
            universityId: true,
            ktuid: true,
            entryType: true,
            admissionYear: true,
            graduatingBatch: true,
            academicScheme: true,
            currentSemester: true,
            placementStatus: true,
            resumeUrl: true,
            targetRole: true,
            branch: { select: { id: true, name: true, code: true } },
            batch: { select: { id: true, name: true, graduationYear: true } },
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('Student not found');
    if (!user.studentProfile) throw ApiError.notFound('This user is not a student');

    // Challenge 255: Field-level authorization - ensure sensitive academic fields are never leaked to trainers
    if (isTrainer) {
      delete (user.studentProfile as any).cgpa;
      delete (user.studentProfile as any).cgpaVerified;
      delete (user.studentProfile as any).academicStatus;
    }

    await audit(req.user!.id, 'student.profile_view', 'student_profile', id, 'success', {
      viewerRole: req.user!.role,
    });

    // Challenge 326: Audit data access log for academic profile inspection
    await logDataAccess(
      req.user!.id,
      id,
      'academic_profile',
      'view',
      req.headers['x-request-id'] as string | undefined
    );

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

    // Department scoping: students only see global tests + their own department's
    const studentBranchScope =
      profile.branchId !== null && profile.branchId !== undefined
        ? { OR: [{ branchId: null as number | null }, { branchId: profile.branchId }] }
        : { branchId: null as number | null };

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
      // Department scoping: readiness denominator counts only problems the student can actually access
      prisma.codingProblem.count({ where: studentBranchScope }),
      prisma.studentAnswer.findMany({
        where: { attempt: { studentId, status: 'submitted' }, isCorrect: { not: null } },
        include: { question: { select: { topicId: true, topic: { select: { id: true, name: true } } } } },
      }),
      prisma.studentTargetCompany.findMany({
        where: { userId: studentId },
        select: { companyId: true },
      }),
      prisma.mockTest.findMany({
        where: { isActive: true, ...studentBranchScope },
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

/**
 * GET /api/students/me/notification-preferences
 */
export const getNotificationPrefs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      select: { notificationPrefs: true },
    });
    const defaultPrefs = { driveAlerts: true, deadlineReminders: true };
    const prefs = (profile?.notificationPrefs as any) || defaultPrefs;
    res.json({ success: true, data: { ...defaultPrefs, ...prefs } });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/students/me/notification-preferences
 */
export const updateNotificationPrefs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { driveAlerts, deadlineReminders } = req.body;
    const profile = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data: {
        notificationPrefs: {
          driveAlerts: driveAlerts ?? true,
          deadlineReminders: deadlineReminders ?? true,
        },
      },
      select: { notificationPrefs: true },
    });
    res.json({ success: true, data: profile.notificationPrefs });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 23, 24, 26, 27, 33: Student gets complete academic breakdown.
 * GET /api/students/me/academic
 */
export const getMyAcademicInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const context = await getAcademicContext(studentId);

    const [semesters, backlogsList, transfers, correctionRequests] = await Promise.all([
      prisma.semesterResult.findMany({
        where: { studentId },
        orderBy: { semesterNumber: 'asc' },
      }),
      prisma.backlogRecord.findMany({
        where: { studentId },
        orderBy: { semester: 'asc' },
      }),
      prisma.studentTransfer.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.profileCorrectionRequest.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const formattedSemesters = semesters.map((s) => ({
      ...s,
      sgpa: s.gpa,
      credits: s.creditsEarned,
    }));

    const formattedBacklogs = {
      activeCount: context.backlogs?.activeCount ?? backlogsList.filter((b) => b.status === 'active').length,
      activeUnverified: backlogsList.filter((b) => b.status === 'active' && !b.isVerified).length,
      clearedCount: context.backlogs?.clearedCount ?? backlogsList.filter((b) => b.status === 'cleared').length,
      allVerified: context.backlogs?.allVerified ?? true,
      records: backlogsList.map((b) => ({
        ...b,
        subject: b.subjectName || b.subjectCode,
        semesterNumber: b.semester,
      })),
    };

    const formattedCompleteness = {
      ...context.completeness,
      missing: (context.completeness?.missingFields || []).map((f: string) => ({
        field: f,
        label: f.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        link: '/profile',
      })),
    };

    const formattedCgpa = {
      ...(context.cgpaInfo as any),
      cgpa: context.cgpaInfo?.effectiveCgpa ?? context.cgpaInfo?.computedCgpa ?? null,
    };

    res.json({
      success: true,
      data: {
        ...context,
        semesters: formattedSemesters,
        backlogs: formattedBacklogs,
        cgpa: formattedCgpa,
        completeness: formattedCompleteness,
        transfers,
        correctionRequests,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 32: Submit profile correction request for restricted fields.
 * POST /api/students/me/correction-requests
 */
export const submitCorrectionRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const { fieldRequested, requestedValue, reason, documentUrl } = req.body;

    const request = await prisma.profileCorrectionRequest.create({
      data: {
        studentId,
        fieldRequested,
        requestedValue,
        reason,
        documentUrl: documentUrl || null,
        status: 'pending',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Correction request submitted to placement administration for review.',
      data: request,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 32: Get my correction requests history.
 * GET /api/students/me/correction-requests
 */
export const getMyCorrectionRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const requests = await prisma.profileCorrectionRequest.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

