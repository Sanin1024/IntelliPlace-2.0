import { prisma } from '../config/prisma.js';
import nodemailer from 'nodemailer';
import webpush from 'web-push';
import { getUserPrefs } from './notification.service.js';

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RATE_LIMIT_MS = 100; // 10 items/sec

// Nodemailer transport setup (Challenge 132)
export const emailTransport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    })
  : null;

// Web Push setup (Challenge 133)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@intelliplace.edu',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.warn('VAPID initialization failed:', err);
  }
}

/**
 * Background worker: processes pending email & push deliveries (Challenges 131, 138).
 */
export async function processNotificationQueue() {
  try {
    const pending = await prisma.notificationRecipient.findMany({
      where: {
        deliveryStatus: 'pending',
        channel: { in: ['email', 'push'] },
        retryCount: { lt: MAX_RETRIES },
      },
      include: {
        notification: true,
        user: { select: { email: true, name: true } },
      },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
    });

    for (const item of pending) {
      await processItem(item);
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS)); // Rate-limit pacing (Challenge 138)
    }

    return { processed: pending.length };
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Notification dispatch queue error:', err?.message || err);
    }
    return { processed: 0, error: err?.message };
  }
}

async function processItem(item: any) {
  const { notification, user } = item;

  // Challenge 135: Deadline revalidation before dispatching deadline notifications
  if (notification.category === 'deadline' && notification.entityType === 'drive' && notification.entityId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: notification.entityId },
      select: { status: true, registrationDeadline: true },
    });

    if (
      !drive ||
      drive.status !== 'published' ||
      (drive.registrationDeadline && drive.registrationDeadline < new Date())
    ) {
      await prisma.notificationRecipient.update({
        where: { id: item.id },
        data: {
          deliveryStatus: 'suppressed',
          lastError: 'Drive expired or closed',
        },
      });
      return;
    }
  }

  // Challenge 139 & 140: User preferences check (bypassed if priority is 'critical')
  if (notification.priority !== 'critical') {
    const prefs = await getUserPrefs(item.userId);
    const catPrefs = (prefs as any)[notification.category] || {};
    if (!catPrefs[item.channel]) {
      await prisma.notificationRecipient.update({
        where: { id: item.id },
        data: {
          deliveryStatus: 'suppressed',
          lastError: 'Preference disabled',
        },
      });
      return;
    }
  }

  try {
    if (item.channel === 'email') {
      if (emailTransport) {
        await emailTransport.sendMail({
          from: process.env.SMTP_FROM || '"IntelliPlace" <no-reply@intelliplace.edu>',
          to: user.email,
          subject: notification.title,
          text: notification.message,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <small style="color: #666;">IntelliPlace Automated Notification System</small>
          </div>`,
        });
      } else {
        // Honest limitation: mark as failed if SMTP is not configured
        throw new Error('SMTP_NOT_CONFIGURED');
      }
    } else if (item.channel === 'push') {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: item.userId },
      });

      if (subscriptions.length === 0) {
        await prisma.notificationRecipient.update({
          where: { id: item.id },
          data: {
            deliveryStatus: 'suppressed',
            lastError: 'No active push subscriptions',
          },
        });
        return;
      }

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys as any,
            },
            JSON.stringify({
              title: notification.title,
              body: notification.message,
              data: {
                notificationId: notification.id,
                entityType: notification.entityType,
                entityId: notification.entityId,
              },
            })
          );
        } catch (pushErr: any) {
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            // Subscription has expired or unsubscribed
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }
    }

    // Mark successfully sent
    await prisma.notificationRecipient.update({
      where: { id: item.id },
      data: {
        deliveryStatus: 'sent',
        sentAt: new Date(),
        lastError: null,
      },
    });
  } catch (err: any) {
    // Challenge 137: Retry count tracking and terminal failed status
    const nextRetry = item.retryCount + 1;
    await prisma.notificationRecipient.update({
      where: { id: item.id },
      data: {
        retryCount: nextRetry,
        lastError: err?.message?.slice(0, 250) || 'Delivery failed',
        deliveryStatus: nextRetry >= MAX_RETRIES ? 'failed' : 'pending',
      },
    });
  }
}

