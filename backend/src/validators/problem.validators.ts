import { z } from 'zod';

const testCaseSchema = z.object({
  input: z.string().min(1, 'Test case input is required'),
  expectedOutput: z.string().min(1, 'Test case expected output is required'),
  isHidden: z.boolean().default(true),
});

export const createProblemSchema = z.object({
  body: z.object({
    topicId: z.number().int().positive(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    sampleInput: z.string().min(1, 'Sample input is required'),
    sampleOutput: z.string().min(1, 'Sample output is required'),
    tags: z.array(z.string()).optional().default([]),
    testCases: z.array(testCaseSchema).min(1, 'At least one test case is required'),
    slug: z.string().min(1).max(120).optional(), // Auto-generated from the title when omitted
    branchId: z.number({ message: 'branchId must be a number' })
      .int().positive('branchId must be positive')
      .nullable().optional(), // Department scoping: null/omitted => global
  }),
});

export const updateProblemSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    topicId: z.number().int().positive().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    title: z.string().min(3).max(200).optional(),
    description: z.string().min(10).optional(),
    sampleInput: z.string().optional(),
    sampleOutput: z.string().optional(),
    tags: z.array(z.string()).optional(),
    testCases: z.array(testCaseSchema).optional(),
    branchId: z.number({ message: 'branchId must be a number' })
      .int().positive('branchId must be positive')
      .nullable().optional(), // Department scoping: null resets to global
  }),
});

export const problemIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const codeSubmissionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    language: z.string().min(1).refine(
      (lang) => {
        const allowed = (process.env.CODE_RUNNER_LANGUAGES || 'python,javascript')
          .split(',')
          .map((s) => s.trim().toLowerCase());
        return allowed.includes(lang.toLowerCase());
      },
      { message: 'Language not supported' }
    ),
    code: z
      .string()
      .min(1, 'Code cannot be empty')
      .refine(
        (val) => {
          const maxBytes = parseInt(process.env.CODE_MAX_SOURCE_BYTES || '20000', 10);
          return Buffer.byteLength(val, 'utf8') <= maxBytes;
        },
        {
          message: `Source code exceeds maximum allowed size of ${process.env.CODE_MAX_SOURCE_BYTES || '20000'} bytes`,
        }
      ),
  }),
});