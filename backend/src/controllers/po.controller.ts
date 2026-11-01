import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { calculateStudentReadiness } from '../services/readiness.js';
import { audit } from '../services/audit.service.js';

/**
 * GET /api/po/students
 * PO/Admin: List all students with filters + readiness summary.
 */
export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, batchId, placementStatus, knowledgeLevel, search } = req.query;

    const where: any = {};
    if (branchId) where.branchId = parseInt(branchId as string);
    if (batchId) where.batchId = parseInt(batchId as string);
    if (placementStatus && ['not_placed', 'in_process', 'placed'].includes(placementStatus as string)) {
      where.placementStatus = placementStatus;
    }
    if (knowledgeLevel && ['beginner', 'intermediate', 'advanced'].includes(knowledgeLevel as string)) {
      where.knowledgeLevel = knowledgeLevel;
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const profiles = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
      orderBy: {
        ktuid: 'asc',
      },
    });

    // Challenge 239: N+1 Elimination - Batch fetch attempts and coding submissions
    const studentIds = profiles.map((p: any) => p.userId);

    const allAttempts = studentIds.length > 0
      ? await prisma.testAttempt.findMany({
          where: { studentId: { in: studentIds }, status: 'submitted' },
          select: { studentId: true, score: true, totalMarks: true, attemptType: true },
        })
      : [];

    const attemptsByStudent = new Map<string, any[]>();
    for (const a of allAttempts) {
      const list = attemptsByStudent.get(a.studentId) || [];
      list.push(a);
      attemptsByStudent.set(a.studentId, list);
    }

    const codingCounts = studentIds.length > 0
      ? await prisma.codingSubmission.groupBy({
          by: ['studentId'],
          _count: { id: true },
          where: { studentId: { in: studentIds } },
        })
      : [];

    const codingCountByStudent = new Map<string, number>(
      codingCounts.map((c: any) => [c.studentId, c._count.id])
    );

    // Compute readiness + stats for each student using batched data
    const studentsWithStats = await Promise.all(
      profiles.map(async (profile: any) => {
        const attempts = attemptsByStudent.get(profile.userId) || [];
        const mockAttempts = attempts.filter((a: any) => a.attemptType === 'mock');
        const practiceAttempts = attempts.filter((a: any) => a.attemptType === 'practice');

        const avgMockScore = mockAttempts.length > 0
          ? Math.round(
              mockAttempts.reduce((sum: number, a: any) =>
                sum + (a.totalMarks && a.totalMarks > 0 ? ((a.score || 0) / a.totalMarks) * 100 : 0),
              0) / mockAttempts.length
            )
          : null;

        const readiness = await calculateStudentReadiness(profile.userId);
        const codingSubmissions = codingCountByStudent.get(profile.userId) || 0;

        return {
          studentId: profile.userId,
          ktuid: profile.ktuid,
          name: profile.user.name,
          email: profile.user.email,
          branch: profile.branch?.name,
          batch: profile.batch?.name,
          cgpa: profile.cgpa,
          knowledgeLevel: profile.knowledgeLevel,
          placementStatus: profile.placementStatus,
          targetRole: profile.targetRole,
          totalAttempts: attempts.length,
          mockTestsTaken: mockAttempts.length,
          practiceSessions: practiceAttempts.length,
          avgMockScore,
          codingProblemsAttempted: codingSubmissions,
          distinctSolvedCodingProblems: readiness.details.distinctSolvedProblems,
          readinessScore: readiness.score,
          readinessBand: readiness.band,
          readinessLevel: readiness.band,
          level: readiness.band,
          band: readiness.band,
        };
      })
    );

    // Summary stats
    const summary = {
      totalStudents: studentsWithStats.length,
      placed: studentsWithStats.filter((s: any) => s.placementStatus === 'placed').length,
      inProcess: studentsWithStats.filter((s: any) => s.placementStatus === 'in_process').length,
      notPlaced: studentsWithStats.filter((s: any) => s.placementStatus === 'not_placed').length,
      avgReadiness: studentsWithStats.length > 0
        ? Math.round(studentsWithStats.reduce((sum: number, s: any) => sum + s.readinessScore, 0) / studentsWithStats.length)
        : 0,
    };

    res.json({ success: true, data: { students: studentsWithStats, summary } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/po/students/:id
 * PO/Admin: Drill down into a specific student.
 */
export const getStudentDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    if (!profile) throw ApiError.notFound('Student not found');

    // Get target companies
    const targetCompanies = await prisma.studentTargetCompany.findMany({
      where: { userId: studentId },
      include: {
        company: { select: { id: true, name: true, driveDate: true } },
      },
    });

    // Get test attempts
    const attempts = await prisma.testAttempt.findMany({
      where: { studentId, status: 'submitted' },
      include: { test: { select: { title: true } } },
      orderBy: { endTime: 'desc' },
      take: 20,
    });

    // Get topic accuracy (reuse logic)
    const answers = await prisma.studentAnswer.findMany({
      where: {
        attempt: { studentId, status: 'submitted' },
        isCorrect: { not: null },
      },
      include: {
        question: {
          select: {
            topicId: true,
            topic: { select: { id: true, name: true } },
          },
        },
      },
    });

    const topicMap = new Map<string, { name: string; total: number; correct: number }>();
    for (const answer of answers) {
      const key = answer.question.topicId.toString();
      if (!topicMap.has(key)) {
        topicMap.set(key, { name: answer.question.topic.name, total: 0, correct: 0 });
      }
      const stat = topicMap.get(key)!;
      stat.total++;
      if (answer.isCorrect) stat.correct++;
    }

    const topicAccuracy = Array.from(topicMap.entries()).map(([id, t]) => ({
      topicId: parseInt(id),
      topicName: t.name,
      total: t.total,
      correct: t.correct,
      accuracy: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        profile: {
          studentId: profile.userId,
          name: profile.user.name,
          email: profile.user.email,
          branch: profile.branch?.name,
          batch: profile.batch?.name,
          cgpa: profile.cgpa,
          knowledgeLevel: profile.knowledgeLevel,
          placementStatus: profile.placementStatus,
          targetRole: profile.targetRole,
          resumeUrl: profile.resumeUrl,
        },
        targetCompanies: targetCompanies.map((tc: any) => tc.company),
        attempts: attempts.map((a: any) => ({
          attemptId: a.id,
          testTitle: a.test?.title || 'Practice Session',
          attemptType: a.attemptType,
          score: a.score,
          totalMarks: a.totalMarks,
          percentage: a.totalMarks && a.totalMarks > 0
            ? Math.round(((a.score || 0) / a.totalMarks) * 100)
            : 0,
          endTime: a.endTime,
        })),
        topicAccuracy,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/po/students/:id/status
 * PO/Admin: Update a student's placement status.
 */
export const updatePlacementStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['id'] as string;
    const { placementStatus } = req.body;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: { select: { name: true } } },
    });
    if (!profile) throw ApiError.notFound('Student profile not found');

    const updated = await prisma.studentProfile.update({
      where: { userId: studentId },
      data: { placementStatus },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await audit(
      req.user!.id,
      'student.placement_status_change',
      'student_profile',
      studentId,
      'success',
      { newStatus: placementStatus, studentName: profile.user?.name }
    );

    res.json({
      success: true,
      data: {
        studentId: updated.userId,
        name: updated.user.name,
        placementStatus: updated.placementStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/po/summary
 * Aggregated analytics for Placement Officer dashboard
 * Allowed roles: po, admin
 */
export const getPOSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.studentProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    const [allAttempts, allCodingSubmissions, allCompanies, totalCodingProblems] = await Promise.all([
      prisma.testAttempt.findMany({
        where: { status: 'submitted' },
        select: { studentId: true, score: true, totalMarks: true, attemptType: true },
      }),
      prisma.codingSubmission.findMany({
        where: { isPassed: true },
        select: { studentId: true, problemId: true },
      }),
      prisma.company.findMany({
        include: {
          eligibleBranches: true,
          targetStudents: true,
        },
        orderBy: { driveDate: 'asc' },
      }),
      prisma.codingProblem.count(),
    ]);

    const attemptsByStudent = new Map<string, any[]>();
    for (const att of allAttempts) {
      if (!attemptsByStudent.has(att.studentId)) attemptsByStudent.set(att.studentId, []);
      attemptsByStudent.get(att.studentId)!.push(att);
    }

    const solvedProblemsByStudent = new Map<string, Set<string>>();
    for (const sub of allCodingSubmissions) {
      if (!solvedProblemsByStudent.has(sub.studentId)) solvedProblemsByStudent.set(sub.studentId, new Set<string>());
      solvedProblemsByStudent.get(sub.studentId)!.add(sub.problemId);
    }

    const byPlacementStatus = { not_placed: 0, in_process: 0, placed: 0 };
    const byKnowledgeLevel = { beginner: 0, intermediate: 0, advanced: 0 };
    const readinessBands = { notReady: 0, almostReady: 0, ready: 0 };

    const batchMap = new Map<string, { totalReadiness: number; count: number }>();
    const branchMap = new Map<string, { totalReadiness: number; count: number }>();

    const studentList = await Promise.all(
      profiles.map(async (p: any) => {
        const readiness = await calculateStudentReadiness(p.userId);
        const readinessScore = readiness.score;

        if (p.placementStatus in byPlacementStatus) {
          byPlacementStatus[p.placementStatus as keyof typeof byPlacementStatus]++;
        }
        if (p.knowledgeLevel in byKnowledgeLevel) {
          byKnowledgeLevel[p.knowledgeLevel as keyof typeof byKnowledgeLevel]++;
        }

        if (readinessScore < 40) readinessBands.notReady++;
        else if (readinessScore <= 70) readinessBands.almostReady++;
        else readinessBands.ready++;

        const batchName = p.batch?.name || 'Unassigned';
        if (!batchMap.has(batchName)) batchMap.set(batchName, { totalReadiness: 0, count: 0 });
        const bObj = batchMap.get(batchName)!;
        bObj.totalReadiness += readinessScore;
        bObj.count++;

        const branchName = p.branch?.name || 'Unassigned';
        if (!branchMap.has(branchName)) branchMap.set(branchName, { totalReadiness: 0, count: 0 });
        const brObj = branchMap.get(branchName)!;
        brObj.totalReadiness += readinessScore;
        brObj.count++;

        return {
          id: p.userId,
          name: p.user?.name || 'Unknown',
          email: p.user?.email || '',
          branch: p.branch?.name || 'N/A',
          batch: p.batch?.name || 'N/A',
          cgpa: p.cgpa,
          placementStatus: p.placementStatus,
          knowledgeLevel: p.knowledgeLevel,
          readinessScore,
          readinessLevel: readiness.band,
          level: readiness.band,
          band: readiness.band,
          attemptsCount: (attemptsByStudent.get(p.userId) || []).length,
        };
      })
    );

    const batchReadiness = Array.from(batchMap.entries()).map(([batchName, data]) => ({
      batchName,
      avgReadiness: Math.round(data.totalReadiness / data.count),
      studentCount: data.count,
    }));

    const branchReadiness = Array.from(branchMap.entries()).map(([branchName, data]) => ({
      branchName,
      avgReadiness: Math.round(data.totalReadiness / data.count),
      studentCount: data.count,
    }));

    const attentionStudents = [...studentList]
      .sort((a, b) => a.readinessScore - b.readinessScore)
      .slice(0, 5);

    const upcomingDrives = allCompanies.map((c: any) => {
      const eligibleBranchIds = c.eligibleBranches.map((eb: any) => eb.branchId);
      const eligibleCount = profiles.filter((sp: any) => {
        const cgpaOk = c.eligibilityCgpa === null || (sp.cgpa !== null && sp.cgpa >= c.eligibilityCgpa);
        const branchOk = eligibleBranchIds.length === 0 || (sp.branchId && eligibleBranchIds.includes(sp.branchId));
        return cgpaOk && branchOk && sp.placementStatus !== 'placed';
      }).length;

      return {
        id: c.id,
        name: c.name,
        jobRole: c.jobRole,
        package: c.package,
        driveDate: c.driveDate,
        daysUntilDrive: c.driveDate ? Math.ceil((new Date(c.driveDate).getTime() - Date.now()) / (86400000)) : null,
        eligibilityCgpa: c.eligibilityCgpa,
        targetedCount: c.targetStudents.length,
        eligibleCount,
      };
    });

    res.json({
      success: true,
      data: {
        totalStudents: profiles.length,
        counts: {
          totalStudents: profiles.length,
        },
        byPlacementStatus,
        byKnowledgeLevel,
        readinessBands,
        batchReadiness,
        branchReadiness,
        upcomingDrives,
        attentionStudents,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/po/students/export
 * Export filtered student roster to CSV
 */
export const exportStudentsCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, batchId, placementStatus, search } = req.query;

    const where: any = {};
    if (branchId) where.branchId = parseInt(branchId as string);
    if (batchId) where.batchId = parseInt(batchId as string);
    if (placementStatus && ['not_placed', 'in_process', 'placed'].includes(placementStatus as string)) {
      where.placementStatus = placementStatus;
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const profiles = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        batch: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const sanitizeCSVCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Neutralize formula injection: prefix any cell beginning with = + - @ tab or CR with a single quote
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['Name', 'Email', 'Branch', 'Batch', 'CGPA', 'Placement Status', 'Knowledge Level', 'Target Role', 'Resume URL'];
    const rows = profiles.map((p: any) => [
      sanitizeCSVCell(p.user?.name || ''),
      sanitizeCSVCell(p.user?.email || ''),
      sanitizeCSVCell(p.branch?.name || ''),
      sanitizeCSVCell(p.batch?.name || ''),
      p.cgpa !== null && p.cgpa !== undefined ? sanitizeCSVCell(p.cgpa) : '""',
      sanitizeCSVCell(p.placementStatus || ''),
      sanitizeCSVCell(p.knowledgeLevel || ''),
      sanitizeCSVCell(p.targetRole || ''),
      sanitizeCSVCell(p.resumeUrl || ''),
    ]);

    const csvContent = [headers.map(sanitizeCSVCell).join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_roster.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};