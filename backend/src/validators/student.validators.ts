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
  }),
});