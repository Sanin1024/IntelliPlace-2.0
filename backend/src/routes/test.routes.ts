import { Router } from 'express';
import {
  createTest, getAllTests, getTestById,
  updateTest, deleteTest, getTestResults,
} from '../controllers/test.controller.js';
import {
  startAttempt, saveAnswer, savePosition, submitAttempt,
  getAttemptResult, getMyAttempts, recordActivity, grantExtraTime,
} from '../controllers/testAttempt.controller.js';
import {
  checkDuplicateQuestions, generateQuestionSet, validateProblemTestCases,
  submitCode, getAttemptActivity, updateQuestionVersioned,
  recalculateTestResults, publishResults, getSyncStatus, reconcileAttempt,
  syncTestStatuses,
} from '../controllers/assessmentTrainer.controller.js';
import { validate } from '../utils/validate.js';
import {
  createTestSchema, updateTestSchema, testIdSchema,
  startAttemptSchema, saveAnswerSchema, submitAttemptSchema, attemptIdSchema,
} from '../validators/test.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All test routes require authentication
router.use(requireAuth);

// ============================================================
// ADMIN (Sync Monitor & Reconcile - Ch 100)
// ============================================================
router.get('/admin/sync-status', requireRole('admin'), getSyncStatus);
router.post('/admin/reconcile/:attemptId', requireRole('admin'), reconcileAttempt);

// ============================================================
// TRAINER / ADMIN / PO ACTIONS (Defined before :id param routes)
// ============================================================
router.post('/check-duplicates', requireRole('trainer', 'po', 'admin'), checkDuplicateQuestions);
router.post('/generate-questions', requireRole('trainer', 'po', 'admin'), validate(z.object({
  body: z.object({
    rules: z.array(z.object({
      topicId: z.number().int().positive(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      count: z.number().int().min(1).max(50),
    })).min(1),
  }),
})), generateQuestionSet);
router.post('/problems/:id/validate', requireRole('trainer'), validateProblemTestCases);
router.post('/problems/:id/submit-code', requireRole('student'), validate(z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    code: z.string().min(1).max(50000),
    language: z.enum(['python', 'javascript']).default('python'),
  }),
})), submitCode);
router.put('/questions/:id/versioned', requireRole('trainer', 'admin'), updateQuestionVersioned);

// ============================================================
// STUDENT ATTEMPT ROUTES (Defined before :id param routes)
// ============================================================
router.get('/my-attempts', getMyAttempts); // Student: attempt history
router.patch('/attempts/:attemptId/answer', requireRole('student'), validate(saveAnswerSchema), saveAnswer);
router.patch('/attempts/:attemptId/position', requireRole('student'), validate(z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({ questionIndex: z.number().int().min(0).max(200) }),
})), savePosition);
router.post('/attempts/:attemptId/activity', requireRole('student'), validate(z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({
    events: z.array(z.object({
      type: z.enum(['tab_switch', 'focus_loss', 'window_blur', 'warning_shown', 'session_recovered', 'autosave_failed', 'submission_retry']),
      at: z.string().optional(),
      details: z.record(z.string(), z.any()).optional(),
    })).min(1).max(20),
  }),
})), recordActivity);
router.post('/attempts/:attemptId/submit', requireRole('student'), validate(submitAttemptSchema), submitAttempt);
router.get('/attempts/:attemptId/result', validate(attemptIdSchema), getAttemptResult);
router.patch('/attempts/:attemptId/extra-time', requireRole('trainer', 'admin'), validate(z.object({
  params: z.object({ attemptId: z.string().min(1) }),
  body: z.object({
    extraTimeMins: z.number().int().min(1).max(120),
    reason: z.string().min(10).max(500),
  }),
})), grantExtraTime);

// ============================================================
// TEST SPECIFIC ROUTES (with :id parameter)
// ============================================================
router.get('/:id/activity', requireRole('trainer', 'po', 'admin'), getAttemptActivity);
router.post('/:id/recalculate', requireRole('trainer', 'admin'), recalculateTestResults);
router.post('/:id/publish-results', requireRole('trainer', 'admin'), publishResults);
router.post('/:id/start', requireRole('student'), validate(startAttemptSchema), startAttempt);
router.get('/:id/results', requireRole('trainer', 'admin'), validate(testIdSchema), getTestResults);

// ============================================================
// TEST CRUD — Trainer/Admin
// ============================================================
router.post('/', requireRole('trainer', 'admin'), validate(createTestSchema), createTest);
router.get('/', syncTestStatuses, getAllTests); // Role-aware response with lazy status sync
router.get('/:id', validate(testIdSchema), getTestById); // Role-aware
router.put('/:id', requireRole('trainer', 'admin'), validate(updateTestSchema), updateTest);
router.delete('/:id', requireRole('trainer', 'admin'), validate(testIdSchema), deleteTest);

export default router;
