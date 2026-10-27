import { z } from 'zod';

export const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    message: z.string().min(5, 'Message must be at least 5 characters').max(2000),
    // Optional targeting
    batchId: z.number().int().positive().nullable().optional(), // If set, only that batch
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    notificationId: z.string().min(1),
  }),
});