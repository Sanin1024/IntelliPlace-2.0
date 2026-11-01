import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import {
  getAllDrives,
  getDriveById,
  createDrive,
  updateDrive,
  publishDrive,
  cancelDrive,
  withdrawDrive,
  archiveDrive,
  restoreDrive,
  getDriveChecklist,
  getEligibleStudentsPreview,
} from '../controllers/drive.controller.js';
import {
  applyToDrive,
  withdrawApplication,
  getDriveApplications,
  updateApplicationStatus,
} from '../controllers/driveApplication.controller.js';
import {
  createDriveSchema,
  updateDriveSchema,
  cancelDriveSchema,
  withdrawDriveSchema,
  applyDriveSchema,
  withdrawApplicationSchema,
  updateApplicationStatusSchema,
} from '../validators/drive.validators.js';

const router = Router();

router.use(requireAuth);

// List all drives (filtered by role)
router.get('/', getAllDrives);

// Create drive (PO/Admin)
router.post(
  '/',
  requireRole('po', 'admin'),
  validate(createDriveSchema),
  createDrive
);

// Get single drive details
router.get('/:id', getDriveById);

// Update drive (PO/Admin)
router.put(
  '/:id',
  requireRole('po', 'admin'),
  validate(updateDriveSchema),
  updateDrive
);

// Publish drive (PO/Admin)
router.post(
  '/:id/publish',
  requireRole('po', 'admin'),
  publishDrive
);

// Cancel drive (PO/Admin)
router.post(
  '/:id/cancel',
  requireRole('po', 'admin'),
  validate(cancelDriveSchema),
  cancelDrive
);

// Withdraw drive by company (PO/Admin)
router.post(
  '/:id/withdraw',
  requireRole('po', 'admin'),
  validate(withdrawDriveSchema),
  withdrawDrive
);

// Archive drive (DELETE = soft-delete archive, PO/Admin)
router.delete(
  '/:id',
  requireRole('po', 'admin'),
  archiveDrive
);

// Restore archived drive (Admin only)
router.post(
  '/:id/restore',
  requireRole('admin'),
  restoreDrive
);

// Get drive publication checklist
router.get(
  '/:id/checklist',
  requireRole('po', 'admin'),
  getDriveChecklist
);

// Preview eligible students (PO/Admin)
router.get(
  '/:id/eligible-students',
  requireRole('po', 'admin'),
  getEligibleStudentsPreview
);

// Applications
router.post(
  '/:id/apply',
  requireRole('student', 'po', 'admin'),
  validate(applyDriveSchema),
  applyToDrive
);

router.post(
  '/:id/withdraw-application',
  requireRole('student', 'po', 'admin'),
  validate(withdrawApplicationSchema),
  withdrawApplication
);

router.get(
  '/:id/applications',
  requireRole('po', 'admin'),
  getDriveApplications
);

router.patch(
  '/:id/applications/:applicationId',
  requireRole('po', 'admin'),
  validate(updateApplicationStatusSchema),
  updateApplicationStatus
);

export default router;

