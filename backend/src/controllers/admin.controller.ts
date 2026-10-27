import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, Role } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

// ============================================================
// BRANCHES
// ============================================================

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const existing = await prisma.branch.findUnique({ where: { name } });
    if (existing) throw ApiError.conflict('Branch already exists');

    const branch = await prisma.branch.create({ data: { name } });
    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

export const getAllBranches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true } } },
    });
    res.json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // FIX M6: cast params.id to string to satisfy TypeScript
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Branch not found');

    const branch = await prisma.branch.update({ where: { id }, data: { name } });
    res.json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const existing = await prisma.branch.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) throw ApiError.notFound('Branch not found');

    if (existing._count.students > 0) {
      throw ApiError.badRequest('Cannot delete a branch that has students assigned');
    }

    await prisma.branch.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Branch deleted' } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// BATCHES
// ============================================================

export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, graduationYear } = req.body;
    const existing = await prisma.batch.findUnique({ where: { name } });
    if (existing) throw ApiError.conflict('Batch already exists');

    const batch = await prisma.batch.create({ data: { name, graduationYear } });
    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

export const getAllBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { graduationYear: 'desc' },
      include: { _count: { select: { students: true } } },
    });
    res.json({ success: true, data: batches });
  } catch (err) {
    next(err);
  }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, graduationYear } = req.body;

    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Batch not found');

    const batch = await prisma.batch.update({
      where: { id },
      data: { name, graduationYear },
    });
    res.json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

export const deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const existing = await prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) throw ApiError.notFound('Batch not found');

    if (existing._count.students > 0) {
      throw ApiError.badRequest('Cannot delete a batch that has students assigned');
    }

    await prisma.batch.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Batch deleted' } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// USERS
// ============================================================

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw ApiError.conflict('User with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    // Filter by role if valid
    const where: Prisma.UserWhereInput = {};

    if (role && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw ApiError.notFound('User not found');

    if (user.id === req.user!.id) {
      throw ApiError.badRequest('You cannot disable your own account');
    }

    const nextStatus = typeof isActive === 'boolean' ? isActive : !user.isActive;

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: nextStatus },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};