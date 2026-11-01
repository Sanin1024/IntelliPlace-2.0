import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  getUserPrefs,
  sendNotification,
  getNotificationDeliveryStats,
  retryFailedNotifications,
} from '../services/notification.service.js';

/**
 * POST /api/notifications
 * PO or Admin creates an announcement (Challenges 134, 136).
 */
export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, batchId, category, priority, recipients: explicitRecipients } = req.body;
    const createdBy = req.user!.id;

    let targetUserIds: string[] = [];

    if (Array.isArray(explicitRecipients) && explicitRecipients.length > 0) {
      targetUserIds = explicitRecipients;
    } else if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: Number(batchId) } });
      if (!batch) throw ApiError.badRequest('Batch not found');

      const students = await prisma.studentProfile.findMany({
        where: { batchId: Number(batchId) },
        select: { userId: true },
      });
      targetUserIds = students.map((s) => s.userId);
    } else {
      const students = await prisma.user.findMany({
        where: { role: 'student', isActive: true },
        select: { id: true },
      });
      targetUserIds = students.map((s) => s.id);
    }

    if (targetUserIds.length === 0) {
      throw ApiError.badRequest('No recipients found for this notification');
    }

    const idempotencyKey = req.body.idempotencyKey || `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await sendNotification({
      title,
      message,
      category: category || 'system_announcement',
      priority: priority || 'normal',
      recipients: targetUserIds,
      idempotencyKey,
      createdBy,
    });

    res.status(201).json({
      success: true,
      data: {
        ...result.notification,
        recipientCount: targetUserIds.length,
        skipped: result.skipped,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/my
 * Full history API with pagination & filters (Challenges 141, 145).
 */
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20));
    const { category, priority, unreadOnly } = req.query;

    const where: any = {
      userId,
      channel: 'in_app', // In-app is the user's primary interactive feed
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    if (category) {
      where.notification = { ...where.notification, category: category as any };
    }

    if (priority) {
      where.notification = { ...where.notification, priority: priority as any };
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notificationRecipient.findMany({
        where,
        include: {
          notification: {
            select: {
              id: true,
              title: true,
              message: true,
              category: true,
              priority: true,
              entityType: true,
              entityId: true,
              createdAt: true,
              creator: { select: { id: true, name: true, role: true } },
            },
          },
        },
        orderBy: { notification: { createdAt: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificationRecipient.count({ where }),
      prisma.notificationRecipient.count({
        where: { userId, channel: 'in_app', isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read (supports either recipient ID or notification ID).
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = (req.params['notificationId'] || req.params['id']) as string;
    const userId = req.user!.id;

    // Update by either recipient record ID or notification ID
    const updated = await prisma.notificationRecipient.updateMany({
      where: {
        userId,
        OR: [{ id }, { notificationId: id }],
      },
      data: {
        isRead: true,
        deliveryStatus: 'read',
        readAt: new Date(),
      },
    });

    if (updated.count === 0) {
      throw ApiError.notFound('Notification not found or unauthorized');
    }

    res.json({ success: true, data: { markedCount: updated.count } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user.
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const result = await prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        deliveryStatus: 'read',
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { message: 'All notifications marked as read', count: result.count },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/preferences
 * Retrieve current user's delivery preferences (Challenge 140).
 */
export const getPrefs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prefs = await getUserPrefs(req.user!.id);
    res.json({ success: true, data: prefs });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/preferences
 * Update current user's delivery preferences (Challenge 140).
 */
export const updatePrefs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const prefs = req.body;

    const updated = await prisma.notificationPreference.upsert({
      where: { userId },
      update: { prefs },
      create: { userId, prefs },
    });

    res.json({ success: true, data: updated.prefs });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/push/subscribe
 * Register Web Push subscription (Challenge 133).
 */
export const subscribePush = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys) {
      throw ApiError.badRequest('Endpoint and keys are required for push subscription');
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { keys, userId },
      create: { endpoint, keys, userId },
    });

    res.status(201).json({ success: true, message: 'Push subscription registered' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/admin/stats
 * PO / Admin delivery monitoring statistics (Challenge 131).
 */
export const getDeliveryStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getNotificationDeliveryStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/notifications/admin/retry
 * Retry failed deliveries (Challenge 137).
 */
export const retryFailed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await retryFailedNotifications();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
