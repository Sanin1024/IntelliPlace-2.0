import { z } from 'zod';

// ============================================================
// MOCK TEST CRUD
// ============================================================

export const createTestSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().optional(),
    durationMins: z.number().int().min(5, 'Duration must be at least 5 minutes').max(180),
    batchId: z.number().int().positive().nullable().optional(),
    availableFrom: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
    maxAttempts: z.number().int().min(1).max(5).default(1),
    questionIds: z.array(z.string().min(1)).min(1, 'At least one question is required'),
  }),
});

export const updateTestSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().optional(),
    durationMins: z.number().int().min(5).max(180).optional(),
    batchId: z.number().int().positive().nullable().optional(),
    availableFrom: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
    maxAttempts: z.number().int().min(1).max(5).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const testIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// ============================================================
// TEST ATTEMPTS (Student)
// ============================================================

export const startAttemptSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const saveAnswerSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({
    questionId: z.string().min(1),
    selectedOption: z.enum(['A', 'B', 'C', 'D']),
  }),
});

export const submitAttemptSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
});

export const attemptIdSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
});