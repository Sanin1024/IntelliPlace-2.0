import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/civilTraining.controller.js';

const router = Router();
router.use(requireAuth);

// Question Bank
router.get('/questions', c.getQuestions);
router.post('/questions', requireRole('trainer', 'po', 'admin'), c.createQuestion);

// Company Preparation
router.get('/companies', c.getCompanies);
router.get('/companies/:id', c.getCompanyById);
router.post('/companies', requireRole('po', 'admin'), c.createCompany);

// Student Dashboard
router.get('/me/dashboard', c.getStudentDashboard);

export default router;

