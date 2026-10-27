import { Router } from 'express';
import {
  createTest, getAllTests, getTestById,
  updateTest, deleteTest, getTestResults,
} from '../controllers/test.controller.js';
import {
  startAttempt, saveAnswer, submitAttempt,
  getAttemptResult, getMyAttempts,
} from '../controllers/testAttempt.controller.js';
import { validate } from '../utils/validate.js';
import {
  createTestSchema, updateTestSchema, testIdSchema,
  startAttemptSchema, saveAnswerSchema, submitAttemptSchema, attemptIdSchema,
} from '../validators/test.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All test routes require authentication
router.use(requireAuth);

// ============================================================
// TEST CRUD — Trainer/Admin
// ============================================================

router.post('/', requireRole('trainer'), validate(createTestSchema), createTest);
router.get('/', getAllTests); // Role-aware response
router.get('/my-attempts', getMyAttempts); // Student: attempt history
router.get('/:id', validate(testIdSchema), getTestById); // Role-aware
router.put('/:id', requireRole('trainer'), validate(updateTestSchema), updateTest);
router.delete('/:id', requireRole('trainer'), validate(testIdSchema), deleteTest);
router.get('/:id/results', requireRole('trainer', 'admin'), validate(testIdSchema), getTestResults);

// ============================================================
// ATTEMPT — Student
// ============================================================

router.post('/:id/start', requireRole('student'), validate(startAttemptSchema), startAttempt);
router.patch('/attempts/:attemptId/answer', requireRole('student'), validate(saveAnswerSchema), saveAnswer);
router.post('/attempts/:attemptId/submit', requireRole('student'), validate(submitAttemptSchema), submitAttempt);
router.get('/attempts/:attemptId/result', validate(attemptIdSchema), getAttemptResult);

export default router;