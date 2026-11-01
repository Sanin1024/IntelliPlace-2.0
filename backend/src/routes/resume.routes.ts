import { Router } from 'express';
import { getResumeData, saveResumeData, downloadResumePdf } from '../controllers/resume.controller.js';
import { validate } from '../utils/validate.js';
import { saveResumeDataSchema } from '../validators/resume.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireRole('student'));

router.get('/me/resume-data', getResumeData);
router.put('/me/resume-data', validate(saveResumeDataSchema), saveResumeData);
router.get('/me/resume.pdf', downloadResumePdf);

export default router;