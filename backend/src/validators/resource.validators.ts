import { z } from 'zod';

// For multer uploads, body fields are strings (multipart/form-data)
export const uploadResourceSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().optional(),
    topicId: z.string().optional(), // Convert to number in controller
  }),
});

export const resourceIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});