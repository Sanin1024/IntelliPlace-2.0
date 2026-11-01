import { Router } from 'express';
import {
  createProblem, getAllProblems,
  getProblemById, updateProblem, deleteProblem,
  getRunnerStatus, runCode, submitCode, getSubmissions,
} from '../controllers/problem.controller.js';
import { validate } from '../utils/validate.js';
import {
  createProblemSchema, updateProblemSchema, problemIdSchema,
  codeSubmissionSchema,
} from '../validators/problem.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Runner status check (all authenticated users)
router.get('/runner-status', getRunnerStatus);

// Test-only concurrency endpoint: active only when NODE_ENV === 'test'
if (process.env.NODE_ENV === 'test') {
  router.get('/runner/concurrency', getRunnerStatus);
  router.get('/runner-concurrency', getRunnerStatus);
}

// Read: all authenticated users
router.get('/', getAllProblems);
router.get('/:id', validate(problemIdSchema), getProblemById);

// Submissions (student own, staff all)
router.get('/:id/submissions', validate(problemIdSchema), getSubmissions);

// Run sample cases (student only)
router.post('/:id/run', requireRole('student'), validate(codeSubmissionSchema), runCode);

// Submit code against all test cases (student only)
router.post('/:id/submit', requireRole('student'), validate(codeSubmissionSchema), submitCode);

// Write: trainer and admin
router.post('/', requireRole('trainer', 'admin'), validate(createProblemSchema), createProblem);
router.put('/:id', requireRole('trainer', 'admin'), validate(updateProblemSchema), updateProblem);
router.delete('/:id', requireRole('trainer', 'admin'), validate(problemIdSchema), deleteProblem);

export default router;