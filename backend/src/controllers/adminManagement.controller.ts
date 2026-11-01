// Challenges 186, 190, 191, 193, 199, 200: Admin Management Controller
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  softDeleteEntity,
  restoreEntity,
  bulkImportStudents,
  updateSystemSetting,
} from '../services/adminManagement.service.js';
import { generatePlacementReportCsv } from '../services/reporting.service.js';
import { processNotificationQueue } from '../services/notificationDispatcher.service.js';

// ---- Soft Delete & Restore (Challenges 186, 200) ----
export const deleteEntity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEntity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!['user', 'company', 'drive'].includes(rawEntity)) {
      throw ApiError.badRequest('Invalid entity type. Must be user, company, or drive.');
    }

    const updated = await softDeleteEntity(rawEntity as 'user' | 'company' | 'drive', id, req.user!.id);
    res.json({ success: true, data: { message: 'Record archived.', entity: rawEntity, id, updated } });
  } catch (err) {
    next(err);
  }
};

export const restoreEntityCtrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEntity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!['user', 'company', 'drive'].includes(rawEntity)) {
      throw ApiError.badRequest('Invalid entity type. Must be user, company, or drive.');
    }

    const updated = await restoreEntity(rawEntity as 'user' | 'company' | 'drive', id, req.user!.id);
    res.json({ success: true, data: { message: 'Record restored.', entity: rawEntity, id, updated } });
  } catch (err) {
    next(err);
  }
};

// ---- Bulk Import (Challenges 190, 191) ----
export const bulkImport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students)) {
      throw ApiError.badRequest('Expected an array of students.');
    }

    const results = await bulkImportStudents(students, req.user!.id);
    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
};

// ---- System Config & History (Challenge 199) ----
export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

export const updateSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key, value } = req.body;
    const updated = await updateSystemSetting(key, String(value), req.user!.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const getSettingHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
    const history = await prisma.systemSettingHistory.findMany({
      where: key ? { key } : undefined,
      orderBy: { changedAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

// ---- Reports (Challenge 193) ----
export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: { batchId?: number; branchId?: number } = {};
    if (req.query.batchId) filters.batchId = parseInt(req.query.batchId as string, 10);
    if (req.query.branchId) filters.branchId = parseInt(req.query.branchId as string, 10);

    const csv = await generatePlacementReportCsv(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="placement_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// ---- Background Job Monitoring & Resilience (Challenges 285, 290) ----
export const getFailedJobs = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const failedJobs = await prisma.notificationRecipient.findMany({
      where: { deliveryStatus: 'failed' },
      include: {
        notification: { select: { title: true, category: true, priority: true } },
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: {
        totalFailed: failedJobs.length,
        jobs: failedJobs.map((j) => ({
          id: j.id,
          notificationId: j.notificationId,
          title: j.notification.title,
          category: j.notification.category,
          channel: j.channel,
          userEmail: j.user.email,
          userName: j.user.name,
          retryCount: j.retryCount,
          lastError: j.lastError,
          createdAt: j.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const retryFailedJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobIds } = req.body || {};
    const whereClause: any = { deliveryStatus: 'failed' };
    if (Array.isArray(jobIds) && jobIds.length > 0) {
      whereClause.id = { in: jobIds };
    }

    const updated = await prisma.notificationRecipient.updateMany({
      where: whereClause,
      data: {
        deliveryStatus: 'pending',
        retryCount: 0,
        lastError: null,
      },
    });

    // Dispatch background processor
    processNotificationQueue().catch(() => {});

    res.json({
      success: true,
      data: {
        message: `Queued ${updated.count} failed jobs for retry.`,
        retriedCount: updated.count,
      },
    });
  } catch (err) {
    next(err);
  }
};


