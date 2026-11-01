import { z } from 'zod';

export const createQuestionSchema = z.object({
  body: z.object({
    topicId: z.number({ message: 'topicId must be a number' })
      .int().positive('topicId must be positive'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    questionText: z.string().min(5, 'Question text must be at least 5 characters'),
    optionA: z.string().min(1, 'Option A is required'),
    optionB: z.string().min(1, 'Option B is required'),
    optionC: z.string().min(1, 'Option C is required'),
    optionD: z.string().min(1, 'Option D is required'),
    correctOption: z.enum(['A', 'B', 'C', 'D']),
    explanation: z.string().optional(),
    branchId: z.number({ message: 'branchId must be a number' })
      .int().positive('branchId must be positive')
      .nullable().optional(), // Department scoping: null/omitted => global
  }),
});

export const updateQuestionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Question ID is required'),
  }),
  body: z.object({
    topicId: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    questionText: z.string().min(5).optional(),
    optionA: z.string().min(1).optional(),
    optionB: z.string().min(1).optional(),
    optionC: z.string().min(1).optional(),
    optionD: z.string().min(1).optional(),
    correctOption: z.enum(['A', 'B', 'C', 'D']).optional(),
    explanation: z.string().optional(),
    branchId: z.number({ message: 'branchId must be a number' })
      .int().positive('branchId must be positive')
      .nullable().optional(), // Department scoping: null resets to global
  }),
});

export const questionIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Question ID is required'),
  }),
});