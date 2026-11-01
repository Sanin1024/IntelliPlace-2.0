import { prisma } from '../config/prisma.js';
import { evaluateEligibility } from './eligibility.service.js';
import { formatIST } from '../utils/timezone.util.js';
import { DriveNotificationType } from '../generated/prisma/enums.js';

const MAX_ATTEMPTS = 3;

// Challenge 20: valid drive states per notification type.
const VALID_STATUS_BY_TYPE: Record<string, string[]> = {
  new_drive:           ['published', 'active'],
  deadline_reminder:   ['published', 'active'],
  schedule_change:     ['published', 'active', 'closed'],
  cancellation:        ['cancelled'],
  withdrawal:          ['withdrawn'],
  registration_closed: ['closed', 'cancelled', 'withdrawn'],
  application_update:  ['published', 'active', 'closed'],
};

// Critical types bypass user preferences (Challenge 14 + 1:
// "ensure important placement announcements reach the intended students").
const CRITICAL_TYPES = ['cancellation', 'withdrawal', 'schedule_change'];

/** Audience for a notification type. */
async function audienceFor(driveId: string, type: string): Promise<string[]> {
  if (type === 'cancellation' || type === 'withdrawal' || type === 'schedule_change') {
    const apps = await prisma.driveApplication.findMany({
      where: { driveId, status: { not: 'withdrawn' } },
      select: { studentId: true },
    });
    return apps.map((a: { studentId: string }) => a.studentId);
  }
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: { eligibleBranches: true, eligibleBatches: true },
  });
  if (!drive) return [];
  return getEligibleStudentIdsLocal(drive);
}

async function getEligibleStudentIdsLocal(drive: any): Promise<string[]> {
  const profiles = await prisma.studentProfile.findMany({
    where: {
      user: { isActive: true, role: 'student' },
      ...(drive.eligibleBranches?.length && {
        branchId: { in: drive.eligibleBranches.map((e: any) => e.branchId) },
      }),
      ...(drive.eligibleBatches?.length && {
        batchId: { in: drive.eligibleBatches.map((e: any) => e.batchId) },
      }),
    },
    include: { branch: true, batch: true },
  });
  const out: string[] = [];
  for (const p of profiles) {
    const r = evaluateEligibility(drive, p);
    if (r.eligible) out.push(p.userId);
  }
  return out;
}

function messageFor(drive: any, type: string): { title: string; message: string } | null {
  const deadline = drive.registrationDeadline
    ? formatIST(drive.registrationDeadline)
    : 'TBD';
  switch (type) {
    case 'new_drive':
      return {
        title: `New Placement Drive: ${drive.title}`,
        message: `${drive.company?.name ?? 'A company'} is hiring for ${drive.jobRole}. Apply before ${deadline}. Check the Drives page for full eligibility details.`,
      };
    case 'deadline_reminder':
      return {
        title: `Deadline Approaching: ${drive.title}`,
        message: `The registration deadline for ${drive.title} (${drive.jobRole}) is ${deadline}. Apply now if you are interested and eligible.`,
      };
    case 'cancellation':
      return {
        title: `Drive Cancelled: ${drive.title}`,
        message: `The placement drive "${drive.title}" has been cancelled. Reason: ${drive.cancellationReason || 'Not specified'}. Your application record is preserved. Contact the placement office for details.`,
      };
    case 'withdrawal':
      return {
        title: `Company Withdrew: ${drive.title}`,
        message: `The company has withdrawn the drive "${drive.title}". Reason: ${drive.withdrawalReason || 'Not specified'}. Registration is closed. Your application record is preserved.`,
      };
    case 'registration_closed':
      return {
        title: `Registration Closed: ${drive.title}`,
        message: `Registrations for "${drive.title}" are now closed (${drive.registrationCloseReason || 'Closed'}).`,
      };
    case 'schedule_change':
      return {
        title: `Schedule Updated: ${drive.title}`,
        message: `The recruitment schedule or round details for "${drive.title}" have been updated. Please check the drive details page.`,
      };
    case 'application_update':
      return {
        title: `Application Update: ${drive.title}`,
        message: `There has been an update regarding your application for "${drive.title}".`,
      };
    default:
      return null;
  }
}

/**
 * Enqueue a drive notification with a dedupKey (Challenges 1, 11).
 * If dedupKey exists, it will not be created again.
 */
export async function enqueueDriveNotification(
  driveId: string,
  type: DriveNotificationType,
  customDedupKey?: string
) {
  const dedupKey = customDedupKey || `${driveId}:${type}`;
  return prisma.driveNotification.upsert({
    where: { dedupKey },
    create: {
      driveId,
      type,
      dedupKey,
      status: 'pending',
    },
    update: {}, // do not overwrite existing
  });
}

/**
 * Process pending drive notifications.
 * Retries failed notifications with attempts < MAX_ATTEMPTS.
 * Suppresses notifications if drive state changed to an invalid state.
 */
export async function processPendingDriveNotifications() {
  const pending = await prisma.driveNotification.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: {
      drive: {
        include: {
          company: true,
          eligibleBranches: true,
          eligibleBatches: true,
        },
      },
    },
  });

  const results: Array<{ id: string; status: string; recipientCount?: number; error?: string }> = [];

  for (const notif of pending) {
    const drive = notif.drive;
    if (!drive) {
      await prisma.driveNotification.update({
        where: { id: notif.id },
        data: { status: 'failed', lastError: 'Drive not found' },
      });
      results.push({ id: notif.id, status: 'failed', error: 'Drive not found' });
      continue;
    }

    const validStatuses = VALID_STATUS_BY_TYPE[notif.type] || [];
    if (!validStatuses.includes(drive.status)) {
      // Suppress pending notification because drive transitioned into invalid state (Challenge 20)
      await prisma.driveNotification.update({
        where: { id: notif.id },
        data: { status: 'suppressed', lastError: `Suppressed: drive status is "${drive.status}"` },
      });
      results.push({ id: notif.id, status: 'suppressed' });
      continue;
    }

    try {
      const rawRecipients = await audienceFor(drive.id, notif.type);

      // Filter by notification preferences if not critical (Challenge 14)
      let finalRecipients = rawRecipients;
      if (!CRITICAL_TYPES.includes(notif.type) && rawRecipients.length > 0) {
        const studentProfiles = await prisma.studentProfile.findMany({
          where: { userId: { in: rawRecipients } },
          select: { userId: true, notificationPrefs: true },
        });

        const allowedSet = new Set<string>();
        for (const sp of studentProfiles) {
          const prefs = (sp.notificationPrefs as any) || { driveAlerts: true, deadlineReminders: true };
          if (notif.type === 'new_drive' && prefs.driveAlerts === false) continue;
          if (notif.type === 'deadline_reminder' && prefs.deadlineReminders === false) continue;
          allowedSet.add(sp.userId);
        }
        finalRecipients = rawRecipients.filter((id) => allowedSet.has(id));
      }

      const msg = messageFor(drive, notif.type);
      if (msg && finalRecipients.length > 0) {
        // Create in-app system notification for all recipients
        const creatorId = drive.createdBy;
        await prisma.$transaction(async (tx: any) => {
          const createdNotif = await tx.notification.create({
            data: {
              title: msg.title,
              message: msg.message,
              createdBy: creatorId,
            },
          });

          await tx.notificationRecipient.createMany({
            data: finalRecipients.map((uid) => ({
              notificationId: createdNotif.id,
              userId: uid,
              isRead: false,
            })),
          });
        });
      }

      await prisma.driveNotification.update({
        where: { id: notif.id },
        data: {
          status: 'sent',
          attempts: notif.attempts + 1,
          sentAt: new Date(),
          recipientCount: finalRecipients.length,
          lastError: null,
        },
      });

      results.push({ id: notif.id, status: 'sent', recipientCount: finalRecipients.length });
    } catch (err: any) {
      const nextAttempts = notif.attempts + 1;
      await prisma.driveNotification.update({
        where: { id: notif.id },
        data: {
          attempts: nextAttempts,
          lastError: err.message || 'Unknown notification dispatch error',
          status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        },
      });
      results.push({ id: notif.id, status: nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending', error: err.message });
    }
  }

  return results;
}

/**
 * Scan for upcoming deadlines within 48h and enqueue reminder notifications (Challenge 1, 14).
 */
export async function sendDeadlineReminders() {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const drives = await prisma.placementDrive.findMany({
    where: {
      status: { in: ['published', 'active'] },
      registrationDeadline: {
        gt: now,
        lte: in48Hours,
      },
      registrationClosedAt: null,
    },
  });

  for (const drive of drives) {
    const dedupKey = `${drive.id}:deadline_reminder`;
    await enqueueDriveNotification(drive.id, 'deadline_reminder', dedupKey);
  }

  await processPendingDriveNotifications();
}
