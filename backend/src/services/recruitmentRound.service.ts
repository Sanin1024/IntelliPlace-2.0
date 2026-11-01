import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { updateApplicationStatus } from './application.service.js';

// ============================================================
// ROUND MANAGEMENT (Challenge 156)
// ============================================================
export async function createRound(driveId: string, name: string, order: number, actorId: string) {
  const drive = await prisma.placementDrive.findUnique({ where: { id: driveId } });
  if (!drive) throw ApiError.notFound('Placement drive not found.');

  return prisma.recruitmentRound.create({
    data: { driveId, name, order },
  });
}

/**
 * Update student progress for a specific round (Challenge 156).
 * If 'qualified', advances to next round or 'selected'.
 * If 'rejected', updates overall application status to 'rejected'.
 */
export async function updateRoundProgress(
  applicationId: string,
  roundId: string,
  status: 'qualified' | 'rejected',
  actorId: string
) {
  const progress = await prisma.applicationRoundProgress.findUnique({
    where: { applicationId_roundId: { applicationId, roundId } },
    include: { round: true, application: true },
  });
  if (!progress) throw ApiError.notFound('Round progress record not found.');

  await prisma.applicationRoundProgress.update({
    where: { id: progress.id },
    data: { status: status as any },
  });

  // Update overall application status based on round result
  if (status === 'rejected') {
    await updateApplicationStatus(
      applicationId,
      'rejected',
      actorId,
      `Rejected in ${progress.round.name}`
    );
  } else if (status === 'qualified') {
    // Check if there is a subsequent round
    const nextRound = await prisma.recruitmentRound.findFirst({
      where: {
        driveId: progress.application.driveId,
        order: { gt: progress.round.order },
      },
      orderBy: { order: 'asc' },
    });

    if (!nextRound) {
      // Cleared the final round -> Selected!
      await updateApplicationStatus(
        applicationId,
        'selected',
        actorId,
        `Cleared final round: ${progress.round.name}`
      );
    } else {
      // Progress to next round
      await prisma.applicationRoundProgress.upsert({
        where: { applicationId_roundId: { applicationId, roundId: nextRound.id } },
        update: { status: 'pending' },
        create: { applicationId, roundId: nextRound.id, status: 'pending' },
      });
      await updateApplicationStatus(
        applicationId,
        'shortlisted',
        actorId,
        `Advanced to ${nextRound.name}`
      );
    }
  }

  return { success: true, status };
}

/**
 * Detect student schedule conflicts across drives (Challenge 158).
 */
export async function detectStudentScheduleConflicts(
  studentId: string,
  newStartTime: Date,
  newEndTime: Date,
  excludeInterviewId?: string
) {
  try {
    const conflicts = await prisma.mockInterview.findMany({
      where: {
        studentId,
        id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
        status: { in: ['scheduled', 'confirmed', 'rescheduled'] },
        startTime: { lt: newEndTime },
        endTime: { gt: newStartTime },
      },
      include: {
        application: {
          include: { drive: { select: { title: true } } },
        },
      },
    });

    return conflicts.map((c) => ({
      interviewId: c.id,
      driveTitle: c.application?.drive?.title || 'Standalone Interview',
      startTime: c.startTime,
      endTime: c.endTime,
      type: c.type,
    }));
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('detectStudentScheduleConflicts error:', err?.message || err);
    }
    return [];
  }
}

/**
 * Pending applications report for Placement Officers (Challenge 157).
 */
export async function getPendingApplicationsReport() {
  try {
    const pending = await prisma.driveApplication.findMany({
      where: {
        status: 'applied',
        drive: { status: { in: ['published', 'active', 'closed'] as any } },
      },
      include: {
        student: { select: { name: true, email: true } },
        drive: { select: { title: true, company: { select: { name: true } } } },
      },
      orderBy: { appliedAt: 'asc' },
    });

    return pending.map((app) => ({
      applicationId: app.id,
      studentName: app.student.name,
      studentEmail: app.student.email,
      driveTitle: app.drive.title,
      companyName: app.drive.company.name,
      appliedAt: app.appliedAt,
      daysPending: Math.max(0, Math.floor((Date.now() - app.appliedAt.getTime()) / 86400000)),
    }));
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('getPendingApplicationsReport error:', err?.message || err);
    }
    return [];
  }
}
