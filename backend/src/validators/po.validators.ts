import { z } from 'zod';

export const studentFilterSchema = z.object({
  query: z.object({
    branchId: z.string().optional(),
    batchId: z.string().optional(),
    placementStatus: z.string().optional(),
    knowledgeLevel: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const studentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Student ID is required'),
  }),
});

export const updatePlacementStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    placementStatus: z.enum(['not_placed', 'in_process', 'placed']),
  }),
});