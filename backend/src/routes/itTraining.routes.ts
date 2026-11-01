import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/itTraining.controller.js';

const router = Router();
router.use(requireAuth);

// Question Bank
router.get('/questions', c.getQuestions);
router.post('/questions', requireRole('trainer', 'po', 'admin'), c.createQuestion);

// Practical Assessments
router.get('/practical-assessments', c.getPracticalAssessments);
router.post('/practical-assessments/:id/submit', requireRole('student'), ...c.submitPractical);
router.patch('/submissions/practical/:submissionId/evaluate', requireRole('trainer', 'po', 'admin'), c.evaluatePractical);

// Company Preparation
router.get('/companies', c.getCompanies);
router.get('/companies/:id', c.getCompanyById);
router.post('/companies', requireRole('po', 'admin'), c.createCompany);

// Student Dashboard
router.get('/me/dashboard', c.getStudentDashboard);

export default router;

