import { z } from 'zod';

export const verifyAcademicSchema = z.object({
  body: z.object({
    status: z.enum(['verified', 'rejected', 'requires_correction']),
    reason: z.string().trim().max(500).optional().nullable(),
  }),
});

export const upsertSemesterResultSchema = z.object({
  body: z.object({
    studentId: z.string().uuid().optional(), // optional if student self-service or admin url
    semesterNumber: z.number().int().min(1).max(12),
    gpa: z.number().min(0).max(10).optional().nullable(),
    creditsEarned: z.number().int().min(0).max(50).optional().nullable(),
    creditsAttempted: z.number().int().min(0).max(50).optional().nullable(),
    status: z.enum(['published', 'pending', 'unavailable']).default('published'),
  }),
});

export const createBacklogSchema = z.object({
  body: z.object({
    studentId: z.string().uuid().optional(),
    subjectCode: z.string().trim().min(2).max(20),
    subjectName: z.string().trim().min(2).max(100),
    semester: z.number().int().min(1).max(12),
    status: z.enum(['active', 'cleared']).default('active'),
    isVerified: z.boolean().default(false),
  }),
});

export const updateBacklogSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'cleared']),
    isVerified: z.boolean().optional(),
  }),
});

export const createTransferSchema = z.object({
  body: z.object({
    studentId: z.string().uuid(),
    toBranchId: z.number().int().positive(),
    toBatchId: z.number().int().positive(),
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
  }),
});

export const submitCorrectionRequestSchema = z.object({
  body: z.object({
    fieldRequested: z.enum(['universityId', 'branchId', 'batchId', 'admissionYear', 'cgpa', 'other']),
    requestedValue: z.string().trim().min(1).max(255),
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
    documentUrl: z.string().url().optional().nullable(),
  }),
});

export const reviewCorrectionRequestSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional().nullable(),
  }),
});

export const changeRoleSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    role: z.enum(['student', 'po', 'trainer', 'admin']),
  }),
});

export const mergeAccountsSchema = z.object({
  body: z.object({
    primaryUserId: z.string().uuid(),
    duplicateUserId: z.string().uuid(),
  }),
});

