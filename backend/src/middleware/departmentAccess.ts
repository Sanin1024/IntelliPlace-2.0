import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

// ============================================================
// DEPARTMENT-BASED ACCESS CONTROL
// ------------------------------------------------------------
// Every content row in IntelliPlace may optionally be tied to a
// Branch (= department). Rows with branchId = null are GLOBAL:
// visible to students of every department. Rows with a branchId
// are visible ONLY to students of that branch (and to staff).
//
// Enforcement happens in the backend — on list queries (rows are
// filtered out) AND on direct by-id access (403) — so students
// cannot retrieve other departments' content even via crafted
// direct API requests.
// ============================================================

export interface StudentBranchContext {
  branchId: number | null;
  branchCode: string | null;
}

const NO_BRANCH: StudentBranchContext = { branchId: null, branchCode: null };

// Per-request cache so several checks within one request cost one DB round-trip
const ctxCache = new WeakMap<Request, StudentBranchContext>();

/**
 * Resolve the authenticated student's branch context.
 * Returns null when the requester is NOT a student (staff never gets scoped).
 */
export async function getStudentBranchContext(req: Request): Promise<StudentBranchContext | null> {
  if (!req.user || req.user.role !== 'student') return null;
  const cached = ctxCache.get(req);
  if (cached) return cached;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: req.user.id },
    select: { branchId: true, branch: { select: { code: true } } },
  });

  const ctx: StudentBranchContext = profile
    ? { branchId: profile.branchId, branchCode: profile.branch?.code ?? null }
    : NO_BRANCH;
  ctxCache.set(req, ctx);
  return ctx;
}

/**
 * Prisma `where` fragment restricting a content list to
 * (global rows) OR (rows of the student's own department).
 * Students without a branch see only global rows.
 */
export function branchScopeFilter(branchCtx: StudentBranchContext | null): {
  OR: Array<{ branchId: number | null }>;
} {
  const branchId = branchCtx?.branchId ?? null;
  return branchId !== null
    ? { OR: [{ branchId: null }, { branchId }] }
    : { OR: [{ branchId: null }] };
}

/**
 * Point check: may a student access one content row?
 * Global content (branchId null/undefined) is always allowed.
 */
export function canAccessBranch(
  studentBranchId: number | null,
  contentBranchId: number | null | undefined
): boolean {
  return contentBranchId === null || contentBranchId === undefined || contentBranchId === studentBranchId;
}

/**
 * Controller-side guard for direct by-id access.
 * Staff pass through; students must own the branch (or content must be global).
 */
export async function assertStudentCanAccessContent(
  req: Request,
  contentBranchId: number | null | undefined
): Promise<void> {
  if (!req.user || req.user.role !== 'student') return;
  const ctx = await getStudentBranchContext(req);
  if (!canAccessBranch(ctx?.branchId ?? null, contentBranchId)) {
    throw ApiError.forbidden('This content is not available for your department.');
  }
}

/**
 * Route-level middleware for department-exclusive sub-apps
 * (e.g. /api/mechanical-training — content whose department is
 * implicit in the module itself).
 *
 * - Staff (trainer / po / admin) always pass.
 * - Students pass only when their branch code is in `branchCodes`.
 * - Students without a department get a clear 403.
 */
export const requireDepartmentBranch = (...branchCodes: string[]) => {
  const allowed = branchCodes.map((c) => c.toUpperCase());
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      if (req.user.role !== 'student') return next(); // staff bypass

      const ctx = await getStudentBranchContext(req);
      const code = ctx?.branchCode ?? null;

      if (!code) {
        return res.status(403).json({
          success: false,
          error:
            'Your account is not linked to a department yet. Please contact the placement office to complete your profile.',
        });
      }
      if (!allowed.includes(code.toUpperCase())) {
        return res.status(403).json({
          success: false,
          error: 'This training module is reserved for another department.',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate that a branchId (if provided on create/update) exists.
 * Returns the parsed id or null. Throws 400 on unknown branch.
 */
export async function resolveBranchIdOrThrow(branchId: unknown): Promise<number | null> {
  if (branchId === undefined || branchId === null || branchId === '') return null;
  const parsed = typeof branchId === 'string' ? parseInt(branchId, 10) : Number(branchId);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    throw ApiError.badRequest('branchId must be a positive integer');
  }
  const branch = await prisma.branch.findUnique({ where: { id: parsed } });
  if (!branch) throw ApiError.badRequest('Branch not found');
  return parsed;
}
