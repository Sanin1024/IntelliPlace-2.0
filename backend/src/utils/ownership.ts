import { Request } from 'express';
import { ApiError } from './errors.js';

/**
 * Shared helper to verify that a student cannot access another student's data.
 * If user is a student and user.id !== targetStudentId, throws 403 Forbidden.
 * Trainers, POs, and Admins pass through.
 */
export const ensureStudentOwnership = (
  req: Request,
  targetStudentId: string,
  message = 'You can only view your own data'
): void => {
  if (req.user?.role === 'student' && req.user.id !== targetStudentId) {
    throw ApiError.forbidden(message);
  }
};
