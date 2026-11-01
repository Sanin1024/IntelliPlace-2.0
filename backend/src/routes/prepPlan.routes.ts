import { Router } from 'express';
import { getCompanyPrepPlan } from '../controllers/prepPlan.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/:id/prep-plan', requireAuth, requireRole('student'), getCompanyPrepPlan);

export default router;