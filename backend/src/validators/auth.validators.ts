import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});