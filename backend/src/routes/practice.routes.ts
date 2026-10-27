import { Router } from 'express';
import { startPractice, submitAnswer, finishPractice } from '../controllers/practice.controller.js';
import { validate } from '../utils/validate.js';
import {
  startPracticeSchema, submitAnswerSchema, finishPracticeSchema,
} from '../validators/practice.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All practice routes: authenticated students only
router.use(requireAuth, requireRole('student'));

router.post('/start', validate(startPracticeSchema), startPractice);
router.post('/answer', validate(submitAnswerSchema), submitAnswer);
router.post('/finish', validate(finishPracticeSchema), finishPractice);

export default router;