import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { sendNotification } from './notification.service.js';
import { invalidateAnalyticsCache } from './analytics.service.js';

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  applied: ['shortlisted', 'rejected', 'withdrawn'],
  shortlisted: ['selected', 'rejected', 'withdrawn'],
  selected: ['rejected', 'withdrawn'], // Allow correction/reversal
  rejected: ['shortlisted', 'selected'], // Allow resurrection if mistaken
  withdrawn: ['applied'], // Allow re-application in edge cases
};

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/**
 * Centralized application status update (Challenges 148, 150, 151, 155, 159).
 * Updates DriveApplication, ShortlistDecision, and logs history in one transaction.
 */
export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  actorId: string,
  reason?: string
) {
  const app = await prisma.driveApplication.findUnique({
    where: { id: applicationId },
    include: { drive: { select: { title: true, id: true } } },
  });
  if (!app) throw ApiError.notFound('Application not found.');

  if (!isTransitionAllowed(app.status, newStatus)) {
    throw ApiError.badRequest(`Invalid status transition from ${app.status} to ${newStatus}.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updateData: any = { status: newStatus as any };
    if (newStatus === 'withdrawn') {
      updateData.withdrawnAt = new Date();
      updateData.withdrawalReason = reason || 'Withdrawn by user';
    }

    const updated = await tx.driveApplication.update({
      where: { id: applicationId },
      data: updateData,
    });

    // Sync ShortlistDecision (Challenge 155)
    if (['selected', 'rejected', 'withdrawn'].includes(newStatus)) {
      const mappedAction = newStatus === 'selected' ? 'offer' : newStatus === 'rejected' ? 'reject' : 'withdraw';
      await tx.shortlistDecision.updateMany({
        where: { driveId: app.driveId, studentId: app.studentId },
        data: { action: mappedAction as any },
      });
    }

    // Log immutable activity history (Challenge 159)
    await tx.applicationActivityLog.create({
      data: {
        applicationId,
        action: newStatus,
        previousStatus: app.status,
        newStatus,
        actorId,
        details: reason ? { reason } : undefined,
      },
    });

    return updated;
  });

  // Notify student (Challenge 149)
  if (app.studentId !== actorId) {
    await sendNotification({
      title: `Application Update: ${app.drive.title}`,
      message: `Your application status is now: ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
      category: 'application',
      priority: newStatus === 'selected' ? 'critical' : 'high',
      recipients: [app.studentId],
      entityType: 'application',
      entityId: applicationId,
      idempotencyKey: `app_status:${applicationId}:${newStatus}`,
      createdBy: actorId,
    }).catch(() => {});
  }

  await audit(actorId, `application.${newStatus}`, 'drive_application', applicationId, 'success', {
    driveId: app.driveId,
    studentId: app.studentId,
    reason,
  }).catch(() => {});

  // Challenge 340: Invalidate analytics cache on application status change
  invalidateAnalyticsCache();

  return result;
}

/**
 * Student withdrawal workflow (Challenge 160).
 */
export async function withdrawApplication(
  applicationId: string,
  studentId: string,
  reason?: string
) {
  const app = await prisma.driveApplication.findUnique({ where: { id: applicationId } });
  if (!app) throw ApiError.notFound('Application not found.');
  if (app.studentId !== studentId) throw ApiError.forbidden('Not your application.');
  if (app.status === 'withdrawn') throw ApiError.badRequest('Already withdrawn.');
  if (app.status === 'selected') {
    throw ApiError.badRequest('Cannot withdraw a selected application. Contact the Placement Officer.');
  }

  // Use centralized updater for consistency
  await updateApplicationStatus(applicationId, 'withdrawn', studentId, reason);

  // Notify POs (Challenge 160)
  const pos = await prisma.user.findMany({ where: { role: 'po', isActive: true }, select: { id: true } });
  if (pos.length > 0) {
    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
    await sendNotification({
      title: 'Application Withdrawn',
      message: `${student?.name || 'A student'} withdrew their application for drive ref ${app.driveId}.${reason ? ` Reason: ${reason}` : ''}`,
      category: 'application',
      priority: 'high',
      recipients: pos.map((p) => p.id),
      entityType: 'application',
      entityId: applicationId,
      idempotencyKey: `app_withdraw_po:${applicationId}`,
      createdBy: studentId,
    }).catch(() => {});
  }

  return { success: true };
}

/**
 * Company applicant view (Challenge 152).
 * Aggregates profile, academic context, and resume link.
 */
export async function getCompanyApplicantsView(driveId: string) {
  const apps = await prisma.driveApplication.findMany({
    where: { driveId, status: { not: 'withdrawn' } },
    include: {
      student: { select: { id: true, name: true, email: true } },
      resumeVersion: { select: { id: true, label: true, version: true } },
    },
    orderBy: { appliedAt: 'desc' },
  });

  const studentIds = apps.map((a) => a.studentId);
  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { in: studentIds } },
    include: {
      branch: { select: { name: true } },
      batch: { select: { name: true } },
    },
  });
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return apps.map((app) => {
    const profile = profileMap.get(app.studentId);
    return {
      applicationId: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      student: {
        id: app.student.id,
        name: app.student.name,
        email: app.student.email,
        branch: profile?.branch?.name,
        batch: profile?.batch?.name,
        cgpa: profile?.cgpa,
      },
      resume: app.resumeVersion
        ? {
            id: app.resumeVersion.id,
            label: app.resumeLabelAtSubmit || app.resumeVersion.label,
            version: app.resumeVersion.version,
          }
        : null,
    };
  });
}

