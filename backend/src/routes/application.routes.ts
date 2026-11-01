import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/application.controller.js';

const router = Router();
router.use(requireAuth);

// Student
router.get('/my-applications', requireRole('student'), c.myApplications);
router.post('/:id/withdraw', requireRole('student'), c.withdraw);

// PO & Admin
router.get('/drive/:id/applicants', requireRole('po', 'admin'), c.getApplicants);
router.patch(
  '/:id/status',
  requireRole('po', 'admin'),
  validate(
    z.object({
      body: z.object({
        status: z.enum(['shortlisted', 'selected', 'rejected', 'withdrawn', 'applied']),
        reason: z.string().optional(),
      }),
    })
  ),
  c.changeStatus
);

router.post('/drive/:id/rounds', requireRole('po', 'admin'), c.addRound);
router.patch(
  '/:applicationId/rounds/:roundId',
  requireRole('po', 'admin'),
  validate(
    z.object({
      body: z.object({
        status: z.enum(['qualified', 'rejected']),
      }),
    })
  ),
  c.updateRound
);

router.post(
  '/:applicationId/schedule-interview',
  requireRole('po', 'admin'),
  c.scheduleInterviewForApp
);
router.get('/pending-report', requireRole('po', 'admin'), c.pendingReport);

export default router;

