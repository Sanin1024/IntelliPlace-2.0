import { z } from 'zod';

export const roundSchema = z.object({
  name: z.string().optional(),
  date: z.string().optional(),
  venue: z.string().optional(),
  meetingLink: z.string().optional(),
  description: z.string().optional(),
});

export const createDriveSchema = z.object({
  body: z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    title: z.string().min(2, 'Drive title is required').max(200),
    jobRole: z.string().min(2, 'Job role is required').max(200),
    jobDescription: z.string().optional(),
    responsibilities: z.string().optional(),
    requiredSkills: z.array(z.string()).optional().default([]),
    qualifications: z.string().optional(),
    experienceRequired: z.string().optional(),
    employmentType: z.string().optional().default('full_time'),
    location: z.string().optional(),
    vacancies: z.number().int().positive().optional().nullable(),
    ctcMin: z.number().nonnegative().optional().nullable(),
    ctcMax: z.number().nonnegative().optional().nullable(),
    monthlySalary: z.number().nonnegative().optional().nullable(),
    stipend: z.number().nonnegative().optional().nullable(),
    benefits: z.string().optional(),
    selectionProcess: z.string().optional(),
    minCgpa: z.number().min(0).max(10).optional().nullable(),
    maxBacklogs: z.number().int().nonnegative().optional().nullable(),
    registrationDeadline: z.string().datetime().optional().nullable(),
    rounds: z.array(roundSchema).optional().default([]),
    eligibleBranchIds: z.array(z.number().int().positive()).optional().default([]),
    eligibleBatchIds: z.array(z.number().int().positive()).optional().default([]),
    duplicateOverrideReason: z.string().optional(),
    conflictOverrideReason: z.string().optional(),
  }),
});

export const updateDriveSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    companyId: z.string().min(1).optional(),
    title: z.string().min(2).max(200).optional(),
    jobRole: z.string().min(2).max(200).optional(),
    jobDescription: z.string().optional(),
    responsibilities: z.string().optional(),
    requiredSkills: z.array(z.string()).optional(),
    qualifications: z.string().optional(),
    experienceRequired: z.string().optional(),
    employmentType: z.string().optional(),
    location: z.string().optional(),
    vacancies: z.number().int().positive().optional().nullable(),
    ctcMin: z.number().nonnegative().optional().nullable(),
    ctcMax: z.number().nonnegative().optional().nullable(),
    monthlySalary: z.number().nonnegative().optional().nullable(),
    stipend: z.number().nonnegative().optional().nullable(),
    benefits: z.string().optional(),
    selectionProcess: z.string().optional(),
    minCgpa: z.number().min(0).max(10).optional().nullable(),
    maxBacklogs: z.number().int().nonnegative().optional().nullable(),
    registrationDeadline: z.string().datetime().optional().nullable(),
    rounds: z.array(roundSchema).optional(),
    eligibleBranchIds: z.array(z.number().int().positive()).optional(),
    eligibleBatchIds: z.array(z.number().int().positive()).optional(),
    duplicateOverrideReason: z.string().optional(),
    conflictOverrideReason: z.string().optional(),
  }),
});

export const cancelDriveSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(2, 'Cancellation reason is required').max(1000),
  }),
});

export const withdrawDriveSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(2, 'Withdrawal reason is required').max(1000),
  }),
});

export const applyDriveSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      eligibilityOverrideReason: z.string().optional(),
    })
    .optional(),
});

export const withdrawApplicationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z
    .object({
      withdrawalReason: z.string().optional(),
    })
    .optional(),
});

export const updateApplicationStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    applicationId: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['applied', 'shortlisted', 'selected', 'rejected', 'withdrawn']),
    eligibilityOverrideReason: z.string().optional(),
  }),
});

export const notificationPrefsSchema = z.object({
  body: z.object({
    driveAlerts: z.boolean().optional(),
    deadlineReminders: z.boolean().optional(),
    trainingReminders: z.boolean().optional(),
  }),
});

export const driveIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

