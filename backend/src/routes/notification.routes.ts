import { Router } from 'express';
import {
  createNotification, getMyNotifications,
  markAsRead, markAllAsRead,
} from '../controllers/notification.controller.js';
import { validate } from '../utils/validate.js';
import { createNotificationSchema, markReadSchema } from '../validators/notification.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Create notification — PO or Admin only
router.post(
  '/',
  requireRole('po', 'admin'),
  validate(createNotificationSchema),
  createNotification,
);

// Get my notifications — any authenticated user
router.get('/my', getMyNotifications);

// Mark all as read
router.patch('/read-all', markAllAsRead);

// Mark single as read
router.patch('/:notificationId/read', validate(markReadSchema), markAsRead);

export default router;