import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/offer.controller.js';

const router = Router();
router.use(requireAuth);

// Student Endpoints (Challenges 163, 164, 168, 171)
router.get('/my-offers', requireRole('student'), c.myOffers);
router.post('/off-campus', requireRole('student'), c.submitOffCampus);
router.post(
  '/:id/decide',
  requireRole('student'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        action: z.enum(['accepted', 'rejected']),
        reason: z.string().optional(),
      }),
    })
  ),
  c.decideOffer
);

// PO & Admin Endpoints (Challenges 161, 166, 169)
router.post('/', requireRole('po', 'admin'), c.createOfferAdmin);
router.post(
  '/:id/verify',
  requireRole('po', 'admin'),
  validate(z.object({ params: z.object({ id: z.string().min(1) }) })),
  c.verifyOfferAdmin
);
router.post(
  '/:id/revoke',
  requireRole('po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        action: z.enum(['revoked', 'withdrawn']),
        reason: z.string().min(5),
      }),
    })
  ),
  c.revokeOfferAdmin
);

// Placement Analytics (Challenges 170, 174, 175)
router.get('/stats', requireRole('po', 'admin'), c.getStats);

export default router;

