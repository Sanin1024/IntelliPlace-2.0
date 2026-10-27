import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
    description: z.string().optional(),
    jobRole: z.string().min(2, 'Job role is required').max(200),
    package: z.number().positive('Package must be positive').optional(),
    eligibilityCgpa: z.number().min(0).max(10, 'CGPA must be 0-10'),
    driveDate: z.string().datetime('Drive date must be a valid ISO datetime'),
    syllabusText: z.string().optional(),
    eligibleBranchIds: z.array(z.number().int().positive()).min(1, 'At least one eligible branch required'),
    topicIds: z.array(z.number().int().positive()).optional().default([]),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    jobRole: z.string().min(2).max(200).optional(),
    package: z.number().positive().optional(),
    eligibilityCgpa: z.number().min(0).max(10).optional(),
    driveDate: z.string().datetime().optional(),
    syllabusText: z.string().optional(),
    eligibleBranchIds: z.array(z.number().int().positive()).optional(),
    topicIds: z.array(z.number().int().positive()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const companyIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const eligibilityCheckSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const targetCompanySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});