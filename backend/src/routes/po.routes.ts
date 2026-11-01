import { Router } from 'express';
import {
  getAllStudents, getStudentDetail, updatePlacementStatus,
  getPOSummary, exportStudentsCSV,
} from '../controllers/po.controller.js';
import { validate } from '../utils/validate.js';
import { studentIdParamSchema, updatePlacementStatusSchema } from '../validators/po.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All PO routes require PO or Admin role
router.use(requireAuth, requireRole('po', 'admin'));

router.get('/summary', getPOSummary);
router.get('/students/export', exportStudentsCSV);
router.get('/students', getAllStudents);
router.get('/students/:id', validate(studentIdParamSchema), getStudentDetail);
router.patch('/students/:id/status', validate(updatePlacementStatusSchema), updatePlacementStatus);

export default router;