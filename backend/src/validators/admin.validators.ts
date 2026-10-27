import { z } from 'zod';

// ============================================================
// SHARED SCHEMAS
// ============================================================

// For auto-increment IDs (branches, batches)
const numericIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a positive integer'),
  }),
});

// For UUID/CUID string IDs (users, questions, etc.)
// Use .min(1) instead of .uuid() — Prisma may generate CUIDs
const stringIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
});

// ============================================================
// BRANCHES
// ============================================================

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  }),
});

export const updateBranchSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(2).max(50),
  }),
});

export const deleteBranchSchema = numericIdSchema;

// ============================================================
// BATCHES
// ============================================================

export const createBatchSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    graduationYear: z.number().int().min(2020).max(2035),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/),
  }),
  body: z.object({
    name: z.string().min(2).max(50),
    graduationYear: z.number().int().min(2020).max(2035),
  }),
});

export const deleteBatchSchema = numericIdSchema;

// ============================================================
// USERS
// ============================================================

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['po', 'trainer', 'admin']),
  }),
});

// FIX for H5: Accept both UUID and CUID formats
export const toggleUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    isActive: z.boolean().optional(),
  }).optional(),
});