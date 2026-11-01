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
    negativeMarks: z.number().min(0).default(0).optional(),
    shuffleQuestions: z.boolean().default(false).optional(),
    shuffleOptions: z.boolean().default(false).optional(),
    generationMode: z.enum(['fixed', 'balanced']).default('fixed').optional(),
    questionRules: z.any().optional(),
    showResults: z.enum(['after_submit', 'after_deadline', 'manual']).default('after_submit').optional(),
    securityConfig: z.any().optional(),
    status: z.enum(['draft', 'published', 'in_progress', 'completed', 'archived']).default('draft').optional(),
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
    negativeMarks: z.number().min(0).optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    generationMode: z.enum(['fixed', 'balanced']).optional(),
    questionRules: z.any().optional(),
    showResults: z.enum(['after_submit', 'after_deadline', 'manual']).optional(),
    securityConfig: z.any().optional(),
    status: z.enum(['draft', 'published', 'in_progress', 'completed', 'archived']).optional(),
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
    selectedOption: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
    selectedOptions: z.array(z.enum(['A', 'B', 'C', 'D'])).max(4).optional(),
  }),
});

export const submitAttemptSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({
    idempotencyKey: z.string().optional(),
    clientSubmittedAt: z.string().optional(),
  }).optional(),
});

export const attemptIdSchema = z.object({
  params: z.object({ attemptId: z.string().min(1) }),
});