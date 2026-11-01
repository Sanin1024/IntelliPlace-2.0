import { Router } from 'express';
import { getAuditLogs, getAuditActions, getAuditLogById } from '../controllers/audit.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Admin-only
router.use(requireAuth, requireRole('admin'));

router.get('/actions', getAuditActions);
router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;