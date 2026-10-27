import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

/**
 * POST /api/notifications
 * PO or Admin creates an announcement.
 * If batchId is provided, sends only to students in that batch.
 * Otherwise, sends to all students.
 */
export const createNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, batchId } = req.body;
    const createdBy = req.user!.id;

    // Determine recipients
    let studentIds: string[];

    if (batchId) {
      // Verify batch exists
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw ApiError.badRequest('Batch not found');

      // Get students in this batch
      const students = await prisma.studentProfile.findMany({
        where: { batchId },
        select: { userId: true },
      });
      studentIds = students.map((s) => s.userId);
    } else {
      // All students
      const students = await prisma.user.findMany({
        where: { role: 'student', isActive: true },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    }

    if (studentIds.length === 0) {
      throw ApiError.badRequest('No recipients found for this notification');
    }

    // Create notification with recipients in a transaction
    const notification = await prisma.$transaction(async (tx) => {
      const notif = await tx.notification.create({
        data: {
          title,
          message,
          createdBy,
        },
      });

      // Create recipient records
      await tx.notificationRecipient.createMany({
        data: studentIds.map((userId) => ({
          notificationId: notif.id,
          userId,
        })),
      });

      return notif;
    });

    res.status(201).json({
      success: true,
      data: {
        ...notification,
        recipientCount: studentIds.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/my
 * Get current user's notifications (last 50).
 */
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const notifications = await prisma.notificationRecipient.findMany({
      where: { userId },
      include: {
        notification: {
          select: {
            id: true,
            title: true,
            message: true,
            createdAt: true,
            creator: { select: { name: true } },
          },
        },
      },
      orderBy: { notification: { createdAt: 'desc' } },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read.
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notificationId = req.params['notificationId'] as string;
    const userId = req.user!.id;

    const recipient = await prisma.notificationRecipient.findUnique({
      where: {
        notificationId_userId: { notificationId, userId },
      },
    });

    if (!recipient) throw ApiError.notFound('Notification not found');
    if (recipient.isRead) {
      return res.json({ success: true, data: { message: 'Already read' } });
    }

    await prisma.notificationRecipient.update({
      where: { notificationId_userId: { notificationId, userId } },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read.
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
};