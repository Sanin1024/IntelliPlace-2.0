import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/codingInterview.controller.js';

const router = Router();
router.use(requireAuth);

// Problems
router.get('/problems', c.getProblems);
router.get('/problems/:slug', c.getProblemBySlug);
router.post('/problems/:slug/submit', c.submitSolution);

// Manual Evaluation (Trainer/Admin)
router.patch('/submissions/:submissionId/evaluate', requireRole('trainer', 'admin'), c.evaluateSubmission);

// Preparation Plans
router.get('/plans', c.getPlans);
router.get('/plans/:id', c.getPlanById);

// Student Dashboard
router.get('/me/dashboard', c.getStudentDashboard);

export default router;

