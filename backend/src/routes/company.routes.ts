import { Router } from 'express';
import {
  createCompany, getAllCompanies, getCompanyById,
  updateCompany, deleteCompany, toggleTargetCompany, getMyTargetCompanies,
} from '../controllers/company.controller.js';
import { validate } from '../utils/validate.js';
import {
  createCompanySchema, updateCompanySchema,
  companyIdSchema, targetCompanySchema,
} from '../validators/company.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Student: target companies
router.get('/my-targets', requireRole('student'), getMyTargetCompanies);
router.post('/:id/target', requireRole('student'), validate(targetCompanySchema), toggleTargetCompany);

// Read: all authenticated users
router.get('/', getAllCompanies);
router.get('/:id', validate(companyIdSchema), getCompanyById);

// Write: PO or Admin
router.post('/', requireRole('po', 'admin'), validate(createCompanySchema), createCompany);
router.put('/:id', requireRole('po', 'admin'), validate(updateCompanySchema), updateCompany);
router.delete('/:id', requireRole('po', 'admin'), validate(companyIdSchema), deleteCompany);

export default router;