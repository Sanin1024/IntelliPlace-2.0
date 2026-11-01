import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';

// ============================================================
// CONSENT MANAGEMENT (Challenge 329)
// ============================================================
export async function checkConsent(studentId: string, type: string): Promise<boolean> {
  try {
    const consent = await prisma.consentRecord.findUnique({
      where: { studentId_type: { studentId, type: type as any } },
    });
    return consent?.isGranted ?? false;
  } catch {
    return false;
  }
}

export async function updateConsent(studentId: string, type: string, isGranted: boolean) {
  const consent = await prisma.consentRecord.upsert({
    where: { studentId_type: { studentId, type: type as any } },
    update: {
      isGranted,
      ...(isGranted ? { grantedAt: new Date(), revokedAt: null } : { revokedAt: new Date() }),
    },
    create: {
      studentId,
      type: type as any,
      isGranted,
      grantedAt: isGranted ? new Date() : null,
      revokedAt: !isGranted ? new Date() : null,
    },
  });

  await audit(studentId, 'consent.update', 'consent_record', consent.id, 'success', { type, isGranted }).catch(() => {});
  return consent;
}

// ============================================================
// DATA ACCESS LOGGING (Challenges 326, 328, 333)
// ============================================================
export async function logDataAccess(
  actorId: string,
  targetUserId: string,
  resourceType: string,
  action: string,
  requestId?: string
) {
  try {
    await prisma.dataAccessLog.create({
      data: { actorId, targetUserId, resourceType, action, requestId },
    });
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('logDataAccess failed:', err?.message || err);
    }
  }
}

// ============================================================
// DATA SHARING LOGGING (Challenge 332)
// ============================================================
export async function logDataShare(
  studentId: string,
  companyId: string,
  driveId: string | null,
  dataTypes: string[],
  sharedBy: string
) {
  // Challenge 329: Verify consent before sharing
  const hasConsent = await checkConsent(studentId, 'placement_sharing');
  if (!hasConsent) {
    throw ApiError.forbidden('Student has not consented to data sharing for placement purposes.');
  }

  const log = await prisma.dataShareLog.create({
    data: { studentId, companyId, driveId, dataTypes, sharedBy },
  });

  await audit(sharedBy, 'data.share', 'data_share_log', studentId, 'success', { companyId, dataTypes }).catch(() => {});
  return log;
}

// ============================================================
// DATA ANONYMIZATION & RETENTION (Challenges 330, 335)
// ============================================================
export async function anonymizeStudent(studentId: string) {
  await prisma.user.update({
    where: { id: studentId },
    data: {
      name: 'Anonymized User',
      email: `anonymized+${studentId}@deleted.intelliplace`,
      isActive: false,
      studentProfile: {
        update: {
          cgpa: null,
          cgpaVerified: false,
          academicStatus: 'rejected',
          resumeUrl: null,
          targetRole: null,
        },
      },
    },
  });
  await audit('system', 'retention.anonymize', 'user', studentId, 'success', {}).catch(() => {});
}

export async function evaluateRetention() {
  try {
    const policies = await prisma.retentionPolicy.findMany({ where: { isActive: true } });
    const now = new Date();

    for (const policy of policies) {
      const cutoff = new Date(now.getTime() - policy.retentionDays * 86400000);

      if (policy.dataCategory === 'Notification') {
        const oldNotifications = await prisma.notification.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
        });
        if (oldNotifications.length > 0) {
          const ids = oldNotifications.map((n) => n.id);
          await prisma.notificationRecipient.deleteMany({
            where: { notificationId: { in: ids } },
          });
          await prisma.notification.deleteMany({
            where: { id: { in: ids } },
          });
          await audit('system', 'retention.execute', 'notification', null, 'success', {
            deleted: oldNotifications.length,
          }).catch(() => {});
        }
      }
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('evaluateRetention failed:', err?.message || err);
    }
  }
}

