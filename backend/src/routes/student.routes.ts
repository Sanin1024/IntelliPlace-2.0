import { Router } from 'express';
import { getMyProfile, updateMyProfile, getStudentById, getStudentDashboardSummary } from '../controllers/student.controller.js';
import { validate } from '../utils/validate.js';
import { updateProfileSchema } from '../validators/student.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All student routes require authentication
router.use(requireAuth);

router.get('/me/dashboard', getStudentDashboardSummary);
router.get('/me', getMyProfile);
router.put('/me', validate(updateProfileSchema), updateMyProfile);

// View a specific student (student can only view self; PO/admin can view all)
router.get(
  '/:id',
  requireRole('student', 'po', 'admin'),
  getStudentById
);

export default router;