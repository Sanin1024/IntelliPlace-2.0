import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/trainer.controller.js';

const router = Router();
router.use(requireAuth);

// Summary metrics (existing)
router.get('/summary', requireRole('trainer', 'admin'), c.getTrainerSummary);

// PO/Admin: Assignment (Challenges 176, 177)
router.post(
  '/assign-batch',
  requireRole('po', 'admin'),
  validate(
    z.object({
      body: z.object({
        trainerId: z.string().min(1),
        batchId: z.number().int().positive(),
        role: z.enum(['primary', 'assistant']).default('primary'),
      }),
    })
  ),
  c.assignBatch
);

router.post(
  '/check-conflicts',
  requireRole('po', 'admin'),
  validate(
    z.object({
      body: z.object({
        batchId: z.number().int().positive(),
        trainerId: z.string().min(1),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
      }),
    })
  ),
  c.checkConflicts
);

// Trainer: Self-service (Challenges 176, 182, 184)
router.get('/my-batches', requireRole('trainer'), c.myBatches);
router.get('/my-tasks', requireRole('trainer'), c.myTasks);
router.patch('/tasks/:id/acknowledge', requireRole('trainer'), c.acknowledgeTask);
router.get('/my-feedback', requireRole('trainer'), c.getMyFeedback);

// Trainer/PO/Admin: Student monitoring (Challenges 178, 185)
router.get(
  '/batch/:batchId/performance',
  requireRole('trainer', 'po', 'admin'),
  c.batchPerformance
);

router.post(
  '/interventions',
  requireRole('trainer', 'po'),
  validate(
    z.object({
      body: z.object({
        studentId: z.string().min(1),
        severity: z.enum(['low', 'medium', 'high']).default('medium'),
        reason: z.string().min(5),
        action: z.string().optional(),
        followUpDate: z.string().datetime().optional().nullable(),
      }),
    })
  ),
  c.createIntervention
);

// Student: Feedback (Challenge 184)
router.post(
  '/feedback',
  requireRole('student'),
  validate(
    z.object({
      body: z.object({
        trainerId: z.string().min(1),
        sessionId: z.string().optional().nullable(),
        ratings: z.record(z.string(), z.number()),
        comments: z.string().optional().nullable(),
        isAnonymous: z.boolean().default(true),
      }),
    })
  ),
  c.submitFeedback
);

// Admin: Evaluation (Challenge 181)
router.get('/:trainerId/evaluation', requireRole('admin'), c.getEvaluation);

export default router;
