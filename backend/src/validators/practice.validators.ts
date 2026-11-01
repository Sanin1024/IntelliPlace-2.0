import { z } from 'zod';

export const startPracticeSchema = z.object({
  body: z.object({
    topicId: z.number({ message: 'topicId must be a number' })
      .int().positive('topicId must be positive'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    count: z.number().int().min(1, 'At least 1 question').max(20, 'Maximum 20 questions').default(10),
  }),
});

export const submitAnswerSchema = z.object({
  body: z.object({
    attemptId: z.string().min(1, 'attemptId is required'),
    questionId: z.string().min(1, 'questionId is required'),
    selectedOption: z.enum(['A', 'B', 'C', 'D']),
  }),
});

export const finishPracticeSchema = z.object({
  body: z.object({
    attemptId: z.string().min(1),
  }),
});