import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  createOffer,
  updateOfferStatus,
  verifyOffer,
} from '../services/offer.service.js';
import { getPlacementStats } from '../services/placementAnalytics.service.js';

/**
 * Student: View all received offers with history and company details (Challenge 163)
 */
export const myOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const offers = await prisma.offer.findMany({
      where: { studentId },
      include: {
        company: {
          select: { id: true, name: true, hqLocation: true, website: true },
        },
        drive: {
          select: { id: true, title: true },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { offerDate: 'desc' },
    });

    res.json({ success: true, data: offers });
  } catch (err) {
    next(err);
  }
};

/**
 * Student: Submit off-campus offer for verification (Challenge 171)
 */
export const submitOffCampus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;
    const {
      companyId,
      jobRole,
      employmentType,
      offerDate,
      joiningDate,
      ctc,
      fixedSalary,
      variablePay,
      monthlySalary,
      stipend,
      currency,
      offerLetterUrl,
      offerRefNumber,
    } = req.body;

    if (!companyId || !jobRole || !employmentType) {
      throw ApiError.badRequest('companyId, jobRole, and employmentType are required');
    }

    const offer = await createOffer(
      {
        studentId,
        companyId,
        jobRole,
        employmentType,
        offerDate: new Date(offerDate || Date.now()),
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        ctc: ctc ? Number(ctc) : undefined,
        fixedSalary: fixedSalary ? Number(fixedSalary) : undefined,
        variablePay: variablePay ? Number(variablePay) : undefined,
        monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
        stipend: stipend ? Number(stipend) : undefined,
        currency: currency || 'INR',
        offerLetterUrl,
        offerRefNumber,
        source: 'off_campus',
      },
      studentId
    );

    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
};

/**
 * Student: Accept or Reject an offer (Challenges 164, 168, 173)
 */
export const decideOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offerId = req.params['id'] as string;
    const { action, reason } = req.body; // 'accepted' | 'rejected'

    if (!['accepted', 'rejected'].includes(action)) {
      throw ApiError.badRequest('Action must be accepted or rejected');
    }

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw ApiError.notFound('Offer not found');
    if (offer.studentId !== req.user!.id) {
      throw ApiError.forbidden('You are not authorized to decide on this offer');
    }

    const updated = await updateOfferStatus(offerId, action, req.user!.id, reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Issue on-campus offer (Challenges 161, 162, 167)
 */
export const createOfferAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offer = await createOffer(req.body, req.user!.id);
    res.status(201).json({ success: true, data: offer });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Officially verify accepted offer (Challenge 169)
 */
export const verifyOfferAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offerId = req.params['id'] as string;
    const updated = await verifyOffer(offerId, req.user!.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Revoke or withdraw an offer (Challenge 166)
 */
export const revokeOfferAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offerId = req.params['id'] as string;
    const { action, reason } = req.body; // 'revoked' | 'withdrawn'

    if (!['revoked', 'withdrawn'].includes(action)) {
      throw ApiError.badRequest('Action must be revoked or withdrawn');
    }
    if (!reason || reason.trim().length < 5) {
      throw ApiError.badRequest('A clear reason (at least 5 characters) is required for revocation');
    }

    const updated = await updateOfferStatus(offerId, action, req.user!.id, reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Admin / PO: Placement Analytics (Challenges 170, 174, 175)
 */
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {};
    if (req.query['branchId']) filters.branchId = parseInt(req.query['branchId'] as string, 10);
    if (req.query['batchId']) filters.batchId = parseInt(req.query['batchId'] as string, 10);

    const stats = await getPlacementStats(filters);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

