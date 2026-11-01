import { Router } from 'express';
import {
  getTopicAccuracy,
  getWeakTopics,
  getProgressOverTime,
  getReadinessScore,
  getRecommendations,
  getBatchAnalytics,
  getStats,
  getBranchStats,
  getCompanyStats,
  getSalaryStats,
  getAssessmentStats,
  exportCsv,
  exportExcel,
  exportPdf,
} from '../controllers/analytics.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

// Student self-service + PO/Admin drill-down (trainers not permitted)
router.get('/student/:id/topic-accuracy', requireRole('student', 'po', 'admin'), getTopicAccuracy);
router.get('/student/:id/weak-topics', requireRole('student', 'po', 'admin'), getWeakTopics);
router.get('/student/:id/progress', requireRole('student', 'po', 'admin'), getProgressOverTime);
router.get('/student/:id/readiness', requireRole('student', 'po', 'admin'), getReadinessScore);
router.get('/student/:id/recommendations', requireRole('student', 'po', 'admin'), getRecommendations);

// PO/Admin: batch overview
router.get('/batch', requireRole('po', 'admin'), getBatchAnalytics);

// PO/Admin: Centralized Placement & Recruitment Analytics (Challenges 336–344, 347–350)
router.get('/stats', requireRole('po', 'admin'), getStats);
router.get('/branch-wise', requireRole('po', 'admin'), getBranchStats);
router.get('/company-wise', requireRole('po', 'admin'), getCompanyStats);
router.get('/salary', requireRole('po', 'admin'), getSalaryStats);
router.get('/assessment', requireRole('po', 'admin'), getAssessmentStats);

// PO/Admin: Formatted Exports (Challenges 345, 346)
router.get('/export/csv', requireRole('po', 'admin'), exportCsv);
router.get('/export/excel', requireRole('po', 'admin'), exportExcel);
router.get('/export/pdf', requireRole('po', 'admin'), exportPdf);

export default router;
