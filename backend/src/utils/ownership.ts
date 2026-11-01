import { Request } from 'express';
import { ApiError } from './errors.js';

/**
 * Shared helper to verify that a student cannot access another student's data,
 * and unauthorized roles (like trainers) cannot access private student records.
 * - Admin and PO pass through (authorized for student management/placement).
 * - Student is permitted ONLY if user.id === targetStudentId.
 * - Any other role or mismatched student throws 403 Forbidden.
 */
export const ensureStudentOwnership = (
  req: Request,
  targetStudentId: string,
  message = 'You can only view your own data'
): void => {
  if (!req.user) {
    throw ApiError.unauthorized('Not authenticated');
  }

  // Admin and Placement Officer are authorized to view student records
  if (req.user.role === 'admin' || req.user.role === 'po') {
    return;
  }

  // Student can only access their own records
  if (req.user.role === 'student' && req.user.id === targetStudentId) {
    return;
  }

  throw ApiError.forbidden(message);
};

