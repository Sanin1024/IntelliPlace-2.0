import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireDepartmentBranch } from '../middleware/departmentAccess.js';
import * as c from '../controllers/mechanicalTraining.controller.js';

const router = Router();
router.use(requireAuth);

// Department-level access control: only students of the ME department (and staff) may use this module
router.use(requireDepartmentBranch('ME'));

// Career Tracks
router.get('/career-tracks', c.getCareerTracks);
router.post('/career-tracks/:trackId/enroll', c.enrollInCareerTrack);
router.get('/me/career-tracks', c.getMyCareerTracks);

// Subjects
router.get('/subjects', c.getSubjects);

// Question Bank
router.get('/questions', c.getQuestions);
router.post('/questions', requireRole('trainer', 'po', 'admin'), c.createQuestion);
router.patch('/questions/:id/publish', requireRole('trainer', 'po', 'admin'), c.publishQuestion);

// Projects
router.get('/projects', c.getProjects);
router.post('/projects/:id/submit', requireRole('student'), ...c.submitProject);
router.patch('/submissions/project/:submissionId/evaluate', requireRole('trainer', 'po', 'admin'), c.evaluateProjectSubmission);

// Practical Assessments
router.get('/practical-assessments', c.getPracticalAssessments);
router.post('/practical-assessments/:id/submit', requireRole('student'), ...c.submitPractical);
router.patch('/submissions/practical/:submissionId/evaluate', requireRole('trainer', 'po', 'admin'), c.evaluatePractical);

// Company Preparation
router.get('/companies', c.getCompanies);
router.get('/companies/:id', c.getCompanyById);
router.post('/companies', requireRole('po', 'admin'), c.createCompany);

// Mock Interviews
router.get('/me/mock-interviews', c.getMyMockInterviews);
router.post('/mock-interviews', requireRole('po', 'admin', 'trainer'), c.scheduleMockInterview);
router.patch('/mock-interviews/:id/evaluate', requireRole('po', 'admin', 'trainer'), c.evaluateMockInterview);

// Engineering Software
router.get('/software', c.getSoftware);

// Student Dashboard
router.get('/me/dashboard', c.getStudentDashboard);

export default router;

