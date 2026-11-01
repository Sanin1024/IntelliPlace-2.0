import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

/**
 * GET /api/admin/dashboard-stats
 * Aggregated platform stats for the Admin Dashboard.
 */
export const getAdminDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      studentCount,
      trainerCount,
      poCount,
      adminCount,
      recentUsers,
      branchCount,
      batchCount,
      questionCount,
      problemCount,
      testCount,
      resourceCount,
      companyCount,
      attemptCount,
      submittedAttempts,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'trainer' } }),
      prisma.user.count({ where: { role: 'po' } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.branch.count(),
      prisma.batch.count(),
      prisma.aptitudeQuestion.count(),
      prisma.codingProblem.count(),
      prisma.mockTest.count(),
      prisma.resource.count(),
      prisma.company.count(),
      prisma.testAttempt.count(),
      prisma.testAttempt.count({ where: { status: 'submitted' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { name: true, role: true } } },
      }),
    ]);

    // Students per branch
    const studentsByBranch = await prisma.studentProfile.groupBy({
      by: ['branchId'],
      _count: { userId: true },
    });
    const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
    const branchMap = new Map(branches.map((b: any) => [b.id, b.name]));
    const branchStats = studentsByBranch.map((sb: any) => ({
      branchName: (sb.branchId ? branchMap.get(sb.branchId) : null) || 'Unknown',
      studentCount: sb._count.userId,
    }));

    // Students per batch
    const studentsByBatch = await prisma.studentProfile.groupBy({
      by: ['batchId'],
      _count: { userId: true },
    });
    const batches = await prisma.batch.findMany({ select: { id: true, name: true } });
    const batchMap = new Map(batches.map((b: any) => [b.id, b.name]));
    const batchStats = studentsByBatch.map((sb: any) => ({
      batchName: (sb.batchId ? batchMap.get(sb.batchId) : null) || 'Unassigned',
      studentCount: sb._count.userId,
    }));

    // DB connectivity — if we got here, DB is up
    const dbStatus = 'connected';
    const lastChecked = new Date().toISOString();

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          byRole: {
            student: studentCount,
            trainer: trainerCount,
            po: poCount,
            admin: adminCount,
          },
          recent: recentUsers,
        },
        institution: {
          branches: branchCount,
          batches: batchCount,
          studentsByBranch: branchStats,
          studentsByBatch: batchStats,
        },
        content: {
          questions: questionCount,
          problems: problemCount,
          tests: testCount,
          resources: resourceCount,
          companies: companyCount,
        },
        activity: {
          totalAttempts: attemptCount,
          submittedAttempts,
        },
        system: {
          apiStatus: 'online',
          dbStatus,
          lastChecked,
        },
        recentAuditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
};