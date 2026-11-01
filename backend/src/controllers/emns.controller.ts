import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { processScheduledReminder } from '../services/emns.service.js';

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drives = await prisma.placementDrive.findMany({
      where: { status: { in: ['published', 'active'] }, deletedAt: null },
      include: {
        company: { select: { name: true } },
        eligibleBranches: true,
        eligibleBatches: true,
        _count: { select: { applications: true } },
        campaign: { include: { schedules: true } },
      },
    });

    const dashboardData = await Promise.all(
      drives.map(async (d) => {
        // Calculate eligible non-applicants count
        const applications = await prisma.driveApplication.findMany({
          where: { driveId: d.id, status: { not: 'withdrawn' } },
          select: { studentId: true },
        });
        const appliedIds = new Set(applications.map((a) => a.studentId));

        const branchIds = d.eligibleBranches.map((b) => b.branchId);
        const batchIds = d.eligibleBatches.map((b) => b.batchId);

        const candidates = await prisma.studentProfile.findMany({
          where: {
            user: { isActive: true, role: 'student', deletedAt: null },
            ...(branchIds.length > 0 && { branchId: { in: branchIds } }),
            ...(batchIds.length > 0 && { batchId: { in: batchIds } }),
          },
          select: { userId: true },
        });

        const eligibleCount = candidates.filter((c) => !appliedIds.has(c.userId)).length;
        const pendingSchedules = d.campaign?.schedules.filter((s) => s.status === 'pending') || [];
        const nextReminder = pendingSchedules.sort(
          (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
        )[0];

        return {
          driveId: d.id,
          companyName: d.company?.name || 'Unknown Company',
          jobTitle: d.title,
          deadline: d.registrationDeadline,
          totalApplications: d._count.applications,
          eligibleNonApplicants: eligibleCount,
          nextReminder: nextReminder
            ? {
                type: nextReminder.reminderType,
                scheduledAt: nextReminder.scheduledAt,
              }
            : null,
          status: d.status,
        };
      })
    );

    res.json({ success: true, data: dashboardData });
  } catch (err) {
    next(err);
  }
};

/**
 * Manual trigger for a reminder campaign (Challenge 9)
 */
export const triggerManualReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['driveId'] as string;
    const reminderType = (req.body?.reminderType as string) || 'manual';

    const campaign = await prisma.notificationCampaign.upsert({
      where: { driveId },
      update: {},
      create: { driveId },
    });

    const schedule = await prisma.notificationSchedule.create({
      data: {
        campaignId: campaign.id,
        reminderType: reminderType || 'manual',
        scheduledAt: new Date(),
        status: 'pending',
      },
    });

    // Process immediately
    const result = await processScheduledReminder(schedule.id);

    res.json({ success: true, data: { message: 'Manual reminder triggered', ...result } });
  } catch (err) {
    next(err);
  }
};
