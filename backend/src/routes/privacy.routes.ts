import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/privacy.controller.js';
import { prisma } from '../config/prisma.js';

const router = Router();
router.use(requireAuth);

// Student endpoints (Challenges 329, 331, 333)
router.get('/me/consents', requireRole('student'), c.getMyConsents);
router.put(
  '/me/consents',
  requireRole('student'),
  validate(
    z.object({
      body: z.object({
        type: z.enum(['placement_sharing', 'marketing_communications', 'data_processing']),
        isGranted: z.boolean(),
      }),
    })
  ),
  c.updateMyConsent
);

router.get('/me/data-requests', requireRole('student'), c.getMyDataRequests);
router.post(
  '/me/data-requests',
  requireRole('student'),
  validate(
    z.object({
      body: z.object({
        type: z.enum(['correction', 'deletion', 'data_export']),
        details: z.string().min(10),
      }),
    })
  ),
  c.createDataRequest
);

router.get('/me/access-logs', requireRole('student'), c.getMyAccessLogs);

// Admin endpoints (Challenges 331, 335)
router.get('/data-requests', requireRole('admin'), async (_req, res, next) => {
  try {
    const requests = await prisma.dataRequest.findMany({
      include: { student: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
});
router.patch('/data-requests/:id', requireRole('admin'), c.reviewDataRequest);

router.get('/retention-policies', requireRole('admin'), c.getRetentionPolicies);
router.put('/retention-policies', requireRole('admin'), c.updateRetentionPolicy);

export default router;

