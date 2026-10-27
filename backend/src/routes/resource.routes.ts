import { Router } from 'express';
import {
  uploadResource, getAllResources, deleteResource, downloadResource,
} from '../controllers/resource.controller.js';
import { validate } from '../utils/validate.js';
import { uploadResourceSchema, resourceIdSchema } from '../validators/resource.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../config/multer.js';

const router = Router();

router.use(requireAuth);

// List resources — all authenticated users
router.get('/', getAllResources);

// Download resource file stream — all authenticated users
router.get('/:id/download', downloadResource);

// Upload — trainer only, uses multer middleware
router.post(
  '/',
  requireRole('trainer'),
  upload.single('file'), // field name must be "file"
  validate(uploadResourceSchema),
  uploadResource,
);

// Delete — trainer (own uploads) or admin
router.delete('/:id', validate(resourceIdSchema), deleteResource);

export default router;