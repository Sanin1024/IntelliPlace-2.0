import { Router } from 'express';
import { getPendingStudents, getSlots, createSlot, assignSlot, grantExtension } from '../controllers/assessment.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// PO Routes
router.get('/slots', requireRole('po', 'admin'), getSlots);
router.get('/pending', requireRole('po', 'admin'), getPendingStudents);
router.post('/slots', requireRole('po', 'admin'), createSlot);
router.patch('/:assessmentId/assign', requireRole('po', 'admin'), assignSlot);
router.patch('/:assessmentId/extension', requireRole('po', 'admin'), grantExtension);

export default router;