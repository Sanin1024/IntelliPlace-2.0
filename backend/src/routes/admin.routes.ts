import { Router } from 'express';
import {
  createBranch, getAllBranches, updateBranch, deleteBranch,
  createBatch, getAllBatches, updateBatch, deleteBatch,
  createUser, getAllUsers, toggleUserStatus,
} from '../controllers/admin.controller.js';
import { validate } from '../utils/validate.js';
import {
  createBranchSchema, updateBranchSchema, deleteBranchSchema,
  createBatchSchema, updateBatchSchema, deleteBatchSchema,
  createUserSchema, toggleUserSchema,
} from '../validators/admin.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireRole('admin'));

// Branch routes
router.post('/branches', validate(createBranchSchema), createBranch);
router.get('/branches', getAllBranches);
router.put('/branches/:id', validate(updateBranchSchema), updateBranch);
// FIX L3: DELETE uses its own schema (params only, no body required)
router.delete('/branches/:id', validate(deleteBranchSchema), deleteBranch);

// Batch routes
router.post('/batches', validate(createBatchSchema), createBatch);
router.get('/batches', getAllBatches);
router.put('/batches/:id', validate(updateBatchSchema), updateBatch);
router.delete('/batches/:id', validate(deleteBatchSchema), deleteBatch);

// User management
router.post('/users', validate(createUserSchema), createUser);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', validate(toggleUserSchema), toggleUserStatus);

export default router;