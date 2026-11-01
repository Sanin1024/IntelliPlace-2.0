import { Router } from 'express';
import {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getPrefs,
  updatePrefs,
  subscribePush,
  getDeliveryStats,
  retryFailed,
} from '../controllers/notification.controller.js';
import { validate } from '../utils/validate.js';
import { createNotificationSchema } from '../validators/notification.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Create manual notification — PO or Admin only (Challenge 136)
router.post(
  '/',
  requireRole('po', 'admin'),
  validate(createNotificationSchema),
  createNotification
);

// Get my notifications with filtering & pagination (Challenge 145)
router.get('/my', getMyNotifications);

// Mark single as read (Challenge 141)
router.patch('/:id/read', markAsRead);
router.patch('/:notificationId/read', markAsRead);

// Mark all as read
router.patch('/read-all', markAllAsRead);

// Notification preferences (Challenge 140)
router.get('/preferences', getPrefs);
router.put('/preferences', updatePrefs);

// Web Push subscription (Challenge 133)
router.post('/push/subscribe', subscribePush);

// PO/Admin: Monitoring & Delivery Controls (Challenges 131, 137)
router.get('/admin/stats', requireRole('po', 'admin'), getDeliveryStats);
router.post('/admin/retry', requireRole('po', 'admin'), retryFailed);

export default router;
