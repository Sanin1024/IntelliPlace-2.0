import { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

/**
 * GET /api/admin/audit-logs
 * List audit events with filters and pagination.
 * Admin-only.
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '25',
      actor,       // actor user ID
      action,      // e.g., "user.create"
      targetType,  // e.g., "user", "branch"
      outcome,     // "success" | "failure"
      from,        // ISO date
      to,          // ISO date
      search,      // search in action or targetId
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 25));

    const where: Prisma.AuditLogWhereInput = {};

    if (actor) where.actorId = actor as string;
    if (targetType) where.targetType = targetType as string;
    if (outcome && ['success', 'failure'].includes(outcome as string)) {
      where.outcome = outcome as string;
    }
    if (action) {
      where.action = { contains: action as string, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { action: { contains: search as string, mode: 'insensitive' } },
        { targetId: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from as string) }),
        ...(to && { lte: new Date(to as string) }),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/audit-logs/actions
 * Distinct action types (for populating the filter dropdown).
 */
export const getAuditActions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });
    res.json({ success: true, data: logs.map((l: any) => l.action) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/audit-logs/:id
 * Single audit event with full metadata.
 */
export const getAuditLogById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!log) throw ApiError.notFound('Audit log not found');

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};