import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    branchId: z.number().int().positive().nullable().optional(),
    batchId: z.number().int().positive().nullable().optional(),
    knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    cgpa: z.number().min(0).max(10).nullable().optional(),
    resumeUrl: z.string().url().nullable().optional(),
    targetRole: z.string().max(100).nullable().optional(),
    universityId: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9\-_]{3,30}$/, 'University ID must be 3-30 alphanumeric characters')
      .nullable()
      .optional(),
    admissionYear: z.number().int().min(2000).max(2100).nullable().optional(),
  }),
});
