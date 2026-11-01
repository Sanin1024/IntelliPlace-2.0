import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    ktuid: z
      .string()
      .min(10)
      .max(15)
      .toUpperCase()
      .optional()
      .nullable(),
    knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    universityId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9\-_]{3,30}$/, 'University ID must be 3-30 alphanumeric characters')
      .optional()
      .nullable(),
    branchId: z.number().int().positive().optional().nullable(),
    batchId: z.number().int().positive().optional().nullable(),
    admissionYear: z.number().int().min(2000).max(2100).optional().nullable(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10, 'Reset token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
});
