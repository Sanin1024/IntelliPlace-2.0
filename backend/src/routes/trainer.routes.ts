import { Router } from 'express';
import { getTrainerSummary } from '../controllers/trainer.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Trainer and Admin only
router.use(requireAuth, requireRole('trainer', 'admin'));

router.get('/summary', getTrainerSummary);

export default router;
