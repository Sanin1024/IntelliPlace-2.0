import { prisma } from '../config/prisma.js';
import { evaluateForDrive } from './eligibilityEngine.service.js';
import { sendNotification } from './notification.service.js';
import { formatIST } from '../utils/timezone.util.js';

export const DEFAULT_INTERVALS = [
  { type: 'initial', offsetMs: 0 },
  { type: '7d', offsetMs: -7 * 24 * 60 * 60 * 1000 },
  { type: '3d', offsetMs: -3 * 24 * 60 * 60 * 1000 },
  { type: '24h', offsetMs: -24 * 60 * 60 * 1000 },
  { type: '6h', offsetMs: -6 * 60 * 60 * 1000 },
  { type: '1h', offsetMs: -1 * 60 * 60 * 1000 },
];

/**
 * Challenge 3: Schedule automated deadline reminders when drive is published.
 */
export async function scheduleDriveReminders(driveId: string, deadline: Date) {
  const campaign = await prisma.notificationCampaign.upsert({
    where: { driveId },
    update: {},
    create: { driveId },
  });

  // Clear old pending schedules if any (e.g., deadline changed)
  await prisma.notificationSchedule.deleteMany({
    where: { campaignId: campaign.id, status: 'pending' },
  });

  const schedules: {
    campaignId: string;
    reminderType: string;
    scheduledAt: Date;
    status: 'pending';
  }[] = [];

  for (const interval of DEFAULT_INTERVALS) {
    const scheduledAt =
      interval.type === 'initial'
        ? new Date()
        : new Date(deadline.getTime() + interval.offsetMs);

    // Only schedule future reminders (or immediate initial)
    if (
      scheduledAt.getTime() >= Date.now() - 60000 &&
      (interval.type === 'initial' || scheduledAt.getTime() < deadline.getTime())
    ) {
      schedules.push({
        campaignId: campaign.id,
        reminderType: interval.type,
        scheduledAt,
        status: 'pending',
      });
    }
  }

  if (schedules.length > 0) {
    await prisma.notificationSchedule.createMany({ data: schedules });
  }

  return campaign;
}

/**
 * Challenge 11: Cancel all pending reminders for a drive.
 */
export async function cancelDriveReminders(driveId: string) {
  const campaign = await prisma.notificationCampaign.findUnique({ where: { driveId } });
  if (!campaign) return;

  await prisma.notificationSchedule.updateMany({
    where: { campaignId: campaign.id, status: 'pending' },
    data: { status: 'cancelled' },
  });
}

/**
 * Challenge 2 & 6: Dynamically fetch eligible, non-applied students AT SEND TIME.
 */
export async function getEligibleNonApplicants(driveId: string): Promise<string[]> {
  const drive = await prisma.placementDrive.findUnique({
    where: { id: driveId },
    include: { eligibleBranches: true, eligibleBatches: true },
  });
  if (!drive) return [];

  // Get all active applications for this drive
  const applications = await prisma.driveApplication.findMany({
    where: { driveId, status: { not: 'withdrawn' } },
    select: { studentId: true },
  });
  const appliedIds = new Set(applications.map((a) => a.studentId));

  // Get all students in eligible branches/batches
  const branchIds = drive.eligibleBranches.map((b) => b.branchId);
  const batchIds = drive.eligibleBatches.map((b) => b.batchId);

  const candidates = await prisma.studentProfile.findMany({
    where: {
      user: { isActive: true, role: 'student', deletedAt: null },
      ...(branchIds.length > 0 && { branchId: { in: branchIds } }),
      ...(batchIds.length > 0 && { batchId: { in: batchIds } }),
    },
    include: { user: { select: { isActive: true } } },
  });

  const eligibleNonApplicants: string[] = [];
  for (const c of candidates) {
    if (appliedIds.has(c.userId)) continue; // Challenge 6: Exclude if already applied

    // Re-evaluate eligibility (CGPA, backlogs, etc.)
    const ev = await evaluateForDrive(c.userId, driveId).catch(() => null);
    if (!ev || ev.status === 'ELIGIBLE' || ev.status === 'MANUAL_OVERRIDE') {
      eligibleNonApplicants.push(c.userId);
    }
  }

  return eligibleNonApplicants;
}

/**
 * Challenge 3 & 4: Process a due schedule (called by worker or manual trigger).
 */
export async function processScheduledReminder(scheduleId: string) {
  // 1. Atomic lock: pending -> processing
  const updated = await prisma.notificationSchedule.updateMany({
    where: { id: scheduleId, status: 'pending' },
    data: { status: 'processing', lockedAt: new Date() },
  });

  if (updated.count === 0) return { processed: false, reason: 'locked_or_completed' };

  const schedule = await prisma.notificationSchedule.findUnique({
    where: { id: scheduleId },
    include: { campaign: { include: { drive: true } } },
  });

  if (!schedule || !schedule.campaign?.drive) {
    await prisma.notificationSchedule.update({
      where: { id: scheduleId },
      data: { status: 'cancelled' },
    });
    return { processed: false, reason: 'not_found' };
  }

  const drive = schedule.campaign.drive;

  // Challenge 11: Stop if drive is no longer active/published or past deadline
  if (
    !['published', 'active'].includes(drive.status) ||
    (drive.registrationDeadline && drive.registrationDeadline.getTime() < Date.now())
  ) {
    await prisma.notificationSchedule.update({
      where: { id: scheduleId },
      data: { status: 'cancelled', processedAt: new Date() },
    });
    return { processed: false, reason: 'drive_inactive_or_expired' };
  }

  // Challenge 6: Get live list of eligible non-applicants AT SEND TIME
  const recipients = await getEligibleNonApplicants(drive.id);

  if (recipients.length === 0) {
    await prisma.notificationSchedule.update({
      where: { id: scheduleId },
      data: { status: 'completed', processedAt: new Date() },
    });
    return { processed: true, recipients: 0 };
  }

  // Challenge 5: Personalized content
  const priority =
    schedule.reminderType === '1h' || schedule.reminderType === '6h' ? 'critical' : 'high';
  const timeLeft =
    schedule.reminderType === '1h'
      ? '1 hour'
      : schedule.reminderType === '6h'
      ? '6 hours'
      : schedule.reminderType === '24h'
      ? '24 hours'
      : schedule.reminderType === '3d'
      ? '3 days'
      : schedule.reminderType === '7d'
      ? '7 days'
      : schedule.reminderType === 'initial'
      ? 'Initial Announcement'
      : 'Soon';

  const deadlineStr = drive.registrationDeadline
    ? formatIST(drive.registrationDeadline)
    : 'TBD';

  const message =
    schedule.reminderType === 'initial'
      ? `New placement drive published: ${drive.title}. You are eligible to apply. Registration deadline: ${deadlineStr}.`
      : `Reminder: Application closing in ${timeLeft}. You are eligible for ${drive.title} but haven't applied. Deadline: ${deadlineStr}.`;

  const title =
    schedule.reminderType === 'initial'
      ? `📢 New Placement Drive: ${drive.title}`
      : `⏳ ${timeLeft} Left: ${drive.title}`;

  // Challenge 7: Idempotency key prevents duplicate sends if worker crashes/restarts
  const idempotencyKey = `emns:${drive.id}:${schedule.id}`;

  await sendNotification({
    title,
    message,
    category: 'deadline',
    priority,
    recipients,
    entityType: 'drive',
    entityId: drive.id,
    idempotencyKey,
    createdBy: 'system',
    scheduleId: schedule.id,
  });

  await prisma.notificationSchedule.update({
    where: { id: scheduleId },
    data: { status: 'completed', processedAt: new Date() },
  });

  return { processed: true, recipients: recipients.length };
}

