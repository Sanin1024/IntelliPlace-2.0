import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, Role } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';

// ============================================================
// BRANCHES
// ============================================================

export const createBranch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const { name } = req.body;

const existing = await prisma.branch.findUnique({
  where: { name },
});

if (existing) {
  throw ApiError.conflict('Branch already exists');
}

const branch = await prisma.branch.create({
  data: { name },
});

await audit(req.user!.id, 'branch.create', 'branch', branch.id.toString(), 'success', { name });

res.status(201).json({
  success: true,
  data: branch,
});

} catch (err) {
next(err);
}
};

export const getAllBranches = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const branches = await prisma.branch.findMany({
orderBy: { name: 'asc' },
include: {
_count: {
select: { students: true },
},
},
});

res.json({
  success: true,
  data: branches,
});

} catch (err) {
next(err);
}
};

export const updateBranch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const id = parseInt(req.params.id as string, 10);
const { name } = req.body;

if (!Number.isSafeInteger(id) || id <= 0) {
  throw ApiError.badRequest('Invalid branch ID');
}

const existing = await prisma.branch.findUnique({
  where: { id },
});

if (!existing) {
  throw ApiError.notFound('Branch not found');
}

const branch = await prisma.branch.update({
  where: { id },
  data: { name },
});

await audit(req.user!.id, 'branch.update', 'branch', id.toString(), 'success', { name });

res.json({
  success: true,
  data: branch,
});

} catch (err) {
next(err);
}
};

export const deleteBranch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const id = parseInt(req.params.id as string, 10);

if (!Number.isSafeInteger(id) || id <= 0) {
  throw ApiError.badRequest('Invalid branch ID');
}

const existing = await prisma.branch.findUnique({
  where: { id },
  include: {
    _count: {
      select: { students: true },
    },
  },
});

if (!existing) {
  throw ApiError.notFound('Branch not found');
}

if (existing._count.students > 0) {
  throw ApiError.badRequest(
    'Cannot delete a branch that has students assigned'
  );
}

await prisma.branch.delete({
  where: { id },
});

await audit(req.user!.id, 'branch.delete', 'branch', id.toString(), 'success', { name: existing.name });

res.json({
  success: true,
  data: { message: 'Branch deleted' },
});

} catch (err) {
next(err);
}
};

// ============================================================
// BATCHES
// ============================================================

export const createBatch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const { name, graduationYear } = req.body;

const existing = await prisma.batch.findUnique({
  where: { name },
});

if (existing) {
  throw ApiError.conflict('Batch already exists');
}

const batch = await prisma.batch.create({
  data: { name, graduationYear },
});

await audit(req.user!.id, 'batch.create', 'batch', batch.id.toString(), 'success', { name, graduationYear });

res.status(201).json({
  success: true,
  data: batch,
});

} catch (err) {
next(err);
}
};

export const getAllBatches = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const batches = await prisma.batch.findMany({
orderBy: { graduationYear: 'desc' },
include: {
_count: {
select: { students: true },
},
},
});

res.json({
  success: true,
  data: batches,
});

} catch (err) {
next(err);
}
};

export const updateBatch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const id = parseInt(req.params.id as string, 10);
const { name, graduationYear } = req.body;

if (!Number.isSafeInteger(id) || id <= 0) {
  throw ApiError.badRequest('Invalid batch ID');
}

const existing = await prisma.batch.findUnique({
  where: { id },
});

if (!existing) {
  throw ApiError.notFound('Batch not found');
}

const batch = await prisma.batch.update({
  where: { id },
  data: { name, graduationYear },
});

await audit(req.user!.id, 'batch.update', 'batch', id.toString(), 'success', { name, graduationYear });

res.json({
  success: true,
  data: batch,
});

} catch (err) {
next(err);
}
};

export const deleteBatch = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const id = parseInt(req.params.id as string, 10);

if (!Number.isSafeInteger(id) || id <= 0) {
  throw ApiError.badRequest('Invalid batch ID');
}

const existing = await prisma.batch.findUnique({
  where: { id },
  include: {
    _count: {
      select: { students: true },
    },
  },
});

if (!existing) {
  throw ApiError.notFound('Batch not found');
}

if (existing._count.students > 0) {
  throw ApiError.badRequest(
    'Cannot delete a batch that has students assigned'
  );
}

await prisma.batch.delete({
  where: { id },
});

await audit(req.user!.id, 'batch.delete', 'batch', id.toString(), 'success', { name: existing.name, graduationYear: existing.graduationYear });

res.json({
  success: true,
  data: { message: 'Batch deleted' },
});

} catch (err) {
next(err);
}
};

// ============================================================
// USERS
// ============================================================

export const createUser = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const { name, email, password, role } = req.body;

const normalizedEmail = (email || '').trim().toLowerCase();
const normalizedName = (name || '').trim();

const existing = await prisma.user.findUnique({
  where: { email: normalizedEmail },
});

if (existing) {
  throw ApiError.conflict('User with this email already exists');
}

const passwordHash = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
  data: {
    name: normalizedName,
    email: normalizedEmail,
    passwordHash,
    role,
    ...(role === 'student' ? { studentProfile: { create: { knowledgeLevel: 'beginner' } } } : {}),
  },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
  },
});

await audit(
  req.user!.id,
  'user.create',
  'user',
  user.id,
  'success',
  { email: user.email, role: user.role, name: user.name }
);

res.status(201).json({
  success: true,
  data: user,
});

} catch (err) {
next(err);
}
};

// ============================================================
// GET ALL USERS
// Search, role filtering, and server-side pagination
// ============================================================

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Parse and sanitize inputs
    const search = ((req.query.search as string) || '').trim();
    const role = ((req.query.role as string) || '').trim();
    const batch = ((req.query.batch as string) || '').trim();
    const department = ((req.query.department as string) || '').trim();
    const section = ((req.query.section as string) || '').trim();

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));

    const where: Prisma.UserWhereInput = {};

    // 1. Role Filter
    if (role) {
      if (['student', 'po', 'trainer', 'admin'].includes(role.toLowerCase())) {
        where.role = role.toLowerCase() as Role;
      } else {
        // Invalid filter value (e.g. role=hacker) returns empty array, not error
        where.id = '__no_match_invalid_role__';
      }
    }

    // 2. Search Filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Batch, Department & Section Filters (Apply to StudentProfile relation)
    // This safely excludes non-students if a batch/department/section filter is applied
    if (batch || department || section) {
      where.studentProfile = {
        ...(where.studentProfile as any),
        ...(batch && { batch: { name: batch } }),
        ...(department && { 
          branch: { 
            OR: [ 
              { code: { equals: department, mode: 'insensitive' } }, 
              { name: { equals: department, mode: 'insensitive' } } 
            ] 
          } 
        }),
        ...(section && section !== 'NOT_APPLICABLE' ? { section: section } : {}),
        ...(section === 'NOT_APPLICABLE' ? { OR: [{ section: null }, { section: 'NOT_APPLICABLE' }] } : {}),
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { 
          id: true, 
          name: true, 
          email: true, 
          role: true, 
          isActive: true, 
          createdAt: true,
          // Include profile details to display in the table
          studentProfile: {
            select: {
              ktuid: true,
              branch: { select: { name: true, code: true } },
              batch: { select: { name: true } },
              section: true,
            }
          }
        },
        orderBy: [
          { studentProfile: { ktuid: 'asc' } },
          { name: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TOGGLE USER STATUS
// ============================================================

export const toggleUserStatus = async (
req: Request,
res: Response,
next: NextFunction
) => {
try {
const id = req.params.id as string;
const { isActive } = req.body;

const user = await prisma.user.findUnique({
  where: { id },
});

if (!user) {
  throw ApiError.notFound('User not found');
}

if (user.id === req.user!.id) {
  throw ApiError.badRequest('You cannot disable your own account');
}

const nextStatus =
  typeof isActive === 'boolean'
    ? isActive
    : !user.isActive;

const updated = await prisma.user.update({
  where: { id },
  data: { isActive: nextStatus },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
  },
});

await audit(
  req.user!.id,
  'user.toggle_status',
  'user',
  id,
  'success',
  { isActive, targetEmail: user.email, targetRole: user.role }
);

res.json({
  success: true,
  data: updated,
});

} catch (err) {
next(err);
}
};