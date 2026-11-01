import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/emns.controller.js';

const router = Router();
router.use(requireAuth, requireRole('po', 'admin'));

router.get('/dashboard', c.getDashboard);
router.post('/trigger/:driveId', c.triggerManualReminder);

export default router;

