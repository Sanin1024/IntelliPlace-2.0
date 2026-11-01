import { prisma } from '../config/prisma.js';

export const DEFAULT_PREFS = {
  placement_drive: { in_app: true, email: true, push: true },
  application: { in_app: true, email: true, push: true },
  interview: { in_app: true, email: true, push: true },
  deadline: { in_app: true, email: true, push: true },
  eligibility: { in_app: true, email: true, push: true },
  company_update: { in_app: true, email: false, push: false },
  system_announcement: { in_app: true, email: false, push: false },
};

export async function getUserPrefs(userId: string) {
  try {
    const record = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (record && record.prefs && typeof record.prefs === 'object') {
      return { ...DEFAULT_PREFS, ...(record.prefs as any) };
    }
  } catch {
    // Return defaults if database is unreachable or offline
  }
  return DEFAULT_PREFS;
}

/**
 * Centralized notification creation (Challenges 131, 134, 136, 139, 143, 144).
 * Prevents duplicates via unique idempotencyKey.
 * Writes in_app, email, and push recipient records -> background dispatcher handles delivery.
 */
export async function sendNotification(params: {
  title: string;
  message: string;
  category?: string;
  priority?: string;
  recipients: string[];
  entityType?: string;
  entityId?: string;
  idempotencyKey: string;
  scheduledAt?: Date;
  createdBy: string;
  scheduleId?: string;
}) {
  const {
    idempotencyKey,
    recipients,
    category = 'system_announcement',
    priority = 'normal',
    createdBy,
  } = params;

  // Challenge 136: Explicit recipients array check first
  if (!recipients || recipients.length === 0) {
    return { skipped: true, reason: 'no_recipients' };
  }

  // Challenge 134: Idempotency check prevents duplicates
  try {
    const existing = await prisma.notification.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return { skipped: true, notification: existing, reason: 'duplicate_idempotency_key' };
    }
  } catch {
    // If DB is offline in test mode, proceed or return
  }

  // Handle createdBy: if 'system', find admin user id or null
  let validCreatedById: string | null = null;
  try {
    if (createdBy && createdBy !== 'system') {
      const user = await prisma.user.findUnique({ where: { id: createdBy }, select: { id: true } });
      if (user) validCreatedById = user.id;
    }
    if (!validCreatedById) {
      const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } });
      validCreatedById = admin?.id || null;
    }
  } catch {
    validCreatedById = null;
  }

  try {
    const notification = await prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: {
          title: params.title,
          message: params.message,
          category: category as any,
          priority: priority as any,
          entityType: params.entityType,
          entityId: params.entityId,
          idempotencyKey,
          scheduledAt: params.scheduledAt,
          createdBy: validCreatedById,
          scheduleId: params.scheduleId,
        },
      });

      // 1. In-App channel (instantly sent & available)
      const inAppRecords = recipients.map((userId) => ({
        notificationId: notif.id,
        userId,
        channel: 'in_app' as const,
        deliveryStatus: 'sent' as const,
        sentAt: new Date(),
      }));

      // 2. Email channel (queued as pending for dispatcher)
      const emailRecords = recipients.map((userId) => ({
        notificationId: notif.id,
        userId,
        channel: 'email' as const,
        deliveryStatus: 'pending' as const,
      }));

      // 3. Push channel (queued as pending for dispatcher)
      const pushRecords = recipients.map((userId) => ({
        notificationId: notif.id,
        userId,
        channel: 'push' as const,
        deliveryStatus: 'pending' as const,
      }));

      await tx.notificationRecipient.createMany({
        data: [...inAppRecords, ...emailRecords, ...pushRecords],
        skipDuplicates: true,
      });

      return notif;
    });

    return { skipped: false, notification };
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('sendNotification transaction error:', err?.message || err);
    }
    return { skipped: true, reason: 'database_unavailable', error: err?.message };
  }
}

/**
 * Delivery statistics for administrative monitoring (Challenge 131)
 */
export async function getNotificationDeliveryStats() {
  const stats = await prisma.notificationRecipient.groupBy({
    by: ['deliveryStatus', 'channel'],
    _count: { _all: true },
  });
  return stats;
}

/**
 * Retry failed deliveries (Challenge 137)
 */
export async function retryFailedNotifications() {
  const result = await prisma.notificationRecipient.updateMany({
    where: { deliveryStatus: 'failed', retryCount: { lt: 3 } },
    data: { deliveryStatus: 'pending' },
  });
  return { queuedForRetry: result.count };
}
