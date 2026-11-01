import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { updateConsent } from '../services/privacy.service.js';
import { audit } from '../services/audit.service.js';

// Student: Manage Consents (Challenge 329)
export const getMyConsents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consents = await prisma.consentRecord.findMany({
      where: { studentId: req.user!.id },
    });
    res.json({ success: true, data: consents });
  } catch (err) {
    next(err);
  }
};

export const updateMyConsent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, isGranted } = req.body;
    const consent = await updateConsent(req.user!.id, type, isGranted);
    res.json({ success: true, data: consent });
  } catch (err) {
    next(err);
  }
};

// Student: Data Requests (Challenge 331)
export const createDataRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, details } = req.body;
    const request = await prisma.dataRequest.create({
      data: { studentId: req.user!.id, type, details },
    });
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    next(err);
  }
};

export const getMyDataRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.dataRequest.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

// Student: View Data Access Logs (Challenge 333)
export const getMyAccessLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.dataAccessLog.findMany({
      where: { targetUserId: req.user!.id },
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

// Admin: Process Data Requests (Challenge 331)
export const reviewDataRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, resolution } = req.body;

    const updated = await prisma.dataRequest.update({
      where: { id },
      data: { status, resolution, reviewedBy: req.user!.id, reviewedAt: new Date() },
    });

    // Notify student
    await prisma.notification.create({
      data: {
        title: 'Data Request Update',
        message: `Your ${updated.type} request has been ${status}. ${resolution || ''}`,
        createdBy: req.user!.id,
        recipients: { create: [{ userId: updated.studentId }] },
      },
    }).catch(() => {});

    await audit(req.user!.id, 'data_request.review', 'data_request', id, 'success', { status }).catch(() => {});
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// Admin: Retention Policies (Challenge 335)
export const getRetentionPolicies = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await prisma.retentionPolicy.findMany();
    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
};

export const updateRetentionPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataCategory, retentionDays, action } = req.body;
    const policy = await prisma.retentionPolicy.upsert({
      where: { dataCategory },
      update: { retentionDays, action },
      create: { dataCategory, retentionDays, action },
    });
    await audit(req.user!.id, 'retention.update', 'retention_policy', policy.id, 'success', {
      dataCategory,
      retentionDays,
    }).catch(() => {});
    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
};

