import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getStudentById,
  getStudentDashboardSummary,
  getNotificationPrefs,
  updateNotificationPrefs,
  getMyAcademicInfo,
  submitCorrectionRequest,
  getMyCorrectionRequests,
} from '../controllers/student.controller.js';
import { validate } from '../utils/validate.js';
import { updateProfileSchema } from '../validators/student.validators.js';
import { notificationPrefsSchema } from '../validators/drive.validators.js';
import { submitCorrectionRequestSchema } from '../validators/academic.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All student routes require authentication
router.use(requireAuth);

// Student self-service
router.get('/me/dashboard', requireRole('student'), getStudentDashboardSummary);
router.get('/me/notification-preferences', requireRole('student'), getNotificationPrefs);
router.put(
  '/me/notification-preferences',
  requireRole('student'),
  validate(notificationPrefsSchema),
  updateNotificationPrefs
);
router.get('/me/academic', requireRole('student'), getMyAcademicInfo);
router.get('/me/correction-requests', requireRole('student'), getMyCorrectionRequests);
router.post(
  '/me/correction-requests',
  requireRole('student'),
  validate(submitCorrectionRequestSchema),
  submitCorrectionRequest
);
router.get('/me', requireRole('student'), getMyProfile);
router.put('/me', requireRole('student'), validate(updateProfileSchema), updateMyProfile);

// View a specific student (student can only view self; PO/admin view all; trainers view limited - Challenge 255)
router.get(
  '/:id',
  requireRole('student', 'trainer', 'po', 'admin'),
  getStudentById
);

export default router;
