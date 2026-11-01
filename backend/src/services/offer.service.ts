import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { sendNotification } from './notification.service.js';
import { invalidatePattern } from '../utils/cache.js';
import { invalidateAnalyticsCache } from './analytics.service.js';

export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  issued: ['pending', 'accepted', 'rejected', 'expired', 'revoked'],
  pending: ['accepted', 'rejected', 'expired', 'revoked'],
  accepted: ['withdrawn', 'revoked'],
  rejected: [],
  withdrawn: [],
  expired: [],
  revoked: [],
};

export function isOfferTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/**
 * Centralized placement status calculator (Challenges 165, 169).
 * A student is officially 'placed' ONLY if they have at least one accepted AND verified offer.
 */
export async function recalculatePlacementStatus(studentId: string) {
  try {
    const verifiedAcceptedOffers = await prisma.offer.findMany({
      where: { studentId, status: 'accepted', isVerified: true },
    });

    const newStatus = verifiedAcceptedOffers.length > 0 ? 'placed' : 'in_process';

    const profile = await prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (profile && profile.placementStatus !== newStatus) {
      await prisma.studentProfile.update({
        where: { userId: studentId },
        data: { placementStatus: newStatus as any },
      });
    }
    return newStatus;
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('recalculatePlacementStatus error:', err?.message || err);
    }
    return 'in_process';
  }
}

/**
 * Create Offer (Challenges 161, 162, 167, 171, 175)
 */
export async function createOffer(
  data: {
    studentId: string;
    companyId: string;
    driveId?: string;
    applicationId?: string;
    jobRole: string;
    employmentType: string;
    offerDate: Date;
    joiningDate?: Date;
    acceptanceDeadline?: Date;
    ctc?: number;
    fixedSalary?: number;
    variablePay?: number;
    monthlySalary?: number;
    stipend?: number;
    currency?: string;
    offerLetterUrl?: string;
    offerRefNumber?: string;
    source?: string;
  },
  actorId: string
) {
  // Challenge 162: Duplicate check
  const existing = await prisma.offer.findFirst({
    where: {
      studentId: data.studentId,
      companyId: data.companyId,
      jobRole: data.jobRole,
      driveId: data.driveId || null,
    },
  });
  if (existing) {
    throw ApiError.conflict(
      'Duplicate offer detected: this student already has an offer for this role/drive.'
    );
  }

  const offer = await prisma.offer.create({
    data: {
      ...data,
      employmentType: data.employmentType as any,
      source: data.source || 'on_campus',
      createdBy: actorId,
    },
    include: {
      company: { select: { name: true } },
    },
  });

  await prisma.offerHistory.create({
    data: {
      offerId: offer.id,
      action: 'created',
      newStatus: 'issued',
      actorId,
    },
  });

  // Notify student (Challenge 161)
  await sendNotification({
    title: 'New Offer Received!',
    message: `You have received an offer for ${offer.jobRole} from ${offer.company.name}. Check your Offers page.`,
    category: 'application',
    priority: 'critical',
    recipients: [data.studentId],
    entityType: 'offer',
    entityId: offer.id,
    idempotencyKey: `offer_created:${offer.id}`,
    createdBy: actorId,
  }).catch(() => {});

  // Challenge 288 & 340: Invalidate cached placement analytics
  invalidatePattern('stats:placement');
  invalidateAnalyticsCache();

  return offer;
}

/**
 * Update Offer Status (Challenges 164, 165, 166, 168, 173)
 */
export async function updateOfferStatus(
  offerId: string,
  newStatus: string,
  actorId: string,
  reason?: string
) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { company: { select: { name: true } } },
  });
  if (!offer) throw ApiError.notFound('Offer not found.');

  if (!isOfferTransitionAllowed(offer.status, newStatus)) {
    throw ApiError.badRequest(`Invalid status transition from ${offer.status} to ${newStatus}.`);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.offer.update({
      where: { id: offerId },
      data: {
        status: newStatus as any,
        ...(newStatus === 'rejected' && { rejectionReason: reason || null }),
        ...(newStatus === 'withdrawn' && { withdrawalReason: reason || null }),
        ...(newStatus === 'revoked' && { withdrawalReason: reason || null }),
        updatedBy: actorId,
      },
    });

    await tx.offerHistory.create({
      data: {
        offerId,
        action: newStatus,
        previousStatus: offer.status,
        newStatus,
        actorId,
        details: reason ? { reason } : undefined,
      },
    });

    // Challenge 288: Invalidate cached placement analytics
  invalidatePattern('stats:placement');

  return updated;
  });

  // Policy: One accepted full-time offer (Challenge 173)
  if (newStatus === 'accepted' && result.employmentType === 'full_time') {
    const otherOffers = await prisma.offer.findMany({
      where: {
        studentId: result.studentId,
        id: { not: offerId },
        status: 'accepted',
        employmentType: 'full_time',
      },
    });

    for (const other of otherOffers) {
      await prisma.offer.update({
        where: { id: other.id },
        data: {
          status: 'withdrawn',
          withdrawalReason: 'Auto-withdrawn due to acceptance of another full-time offer.',
        },
      });

      await prisma.offerHistory.create({
        data: {
          offerId: other.id,
          action: 'withdrawn',
          previousStatus: 'accepted',
          newStatus: 'withdrawn',
          actorId: 'system',
          details: { reason: 'Auto-withdrawn due to acceptance of another full-time offer.' },
        },
      });

      await sendNotification({
        title: 'Offer Auto-Withdrawn',
        message: `Your previous offer for "${other.jobRole}" was auto-withdrawn because you accepted another full-time offer.`,
        category: 'application',
        priority: 'high',
        recipients: [result.studentId],
        entityType: 'offer',
        entityId: other.id,
        idempotencyKey: `offer_auto_withdraw:${other.id}`,
        createdBy: 'system',
      }).catch(() => {});
    }
  }

  // Recalculate placement status (Challenge 165)
  await recalculatePlacementStatus(result.studentId);

  // Notify PO if student rejected (Challenge 168)
  if (newStatus === 'rejected') {
    const pos = await prisma.user.findMany({ where: { role: 'po', isActive: true }, select: { id: true } });
    if (pos.length > 0) {
      const student = await prisma.user.findUnique({ where: { id: result.studentId }, select: { name: true } });
      await sendNotification({
        title: 'Offer Rejected by Student',
        message: `${student?.name || 'A student'} rejected the offer for "${result.jobRole}" at ${offer.company.name}.${reason ? ` Reason: ${reason}` : ''}`,
        category: 'application',
        priority: 'high',
        recipients: pos.map((p) => p.id),
        entityType: 'offer',
        entityId: offerId,
        idempotencyKey: `offer_rejected_po:${offerId}`,
        createdBy: actorId,
      }).catch(() => {});
    }
  }

  // Notify student if PO revoked (Challenge 166)
  if (newStatus === 'revoked') {
    await sendNotification({
      title: 'Offer Revoked',
      message: `Your offer for "${result.jobRole}" at ${offer.company.name} has been revoked.${reason ? ` Reason: ${reason}` : ''}`,
      category: 'application',
      priority: 'critical',
      recipients: [result.studentId],
      entityType: 'offer',
      entityId: offerId,
      idempotencyKey: `offer_revoked:${offerId}`,
      createdBy: actorId,
    }).catch(() => {});
  }

  // Challenge 288 & 340: Invalidate cached placement analytics
  invalidatePattern('stats:placement');
  invalidateAnalyticsCache();

  await audit(actorId, `offer.${newStatus}`, 'offer', offerId, 'success', { reason }).catch(() => {});
  return result;
}

/**
 * Verify Offer (Challenge 169)
 * Official verification by placement officer transitions student to 'placed' status.
 */
export async function verifyOffer(offerId: string, actorId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { company: { select: { name: true } } },
  });
  if (!offer) throw ApiError.notFound('Offer not found.');
  if (offer.status !== 'accepted') {
    throw ApiError.badRequest('Only accepted offers can be verified by the placement cell.');
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: { isVerified: true, updatedBy: actorId },
  });

  await prisma.offerHistory.create({
    data: {
      offerId,
      action: 'verified',
      actorId,
    },
  });

  // Official status recalculation -> marks student as 'placed'
  await recalculatePlacementStatus(offer.studentId);

  // Notify student of verified placement
  await sendNotification({
    title: 'Placement Verified & Confirmed! 🎉',
    message: `Your accepted offer for ${offer.jobRole} at ${offer.company.name} has been officially verified by the placement office!`,
    category: 'application',
    priority: 'critical',
    recipients: [offer.studentId],
    entityType: 'offer',
    entityId: offerId,
    idempotencyKey: `offer_verified:${offerId}`,
    createdBy: actorId,
  }).catch(() => {});

  // Challenge 288: Invalidate cached placement analytics
  invalidatePattern('stats:placement');

  return updated;
}

