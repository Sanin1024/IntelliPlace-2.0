import { Router } from 'express';
import {
  getTopicAccuracy, getWeakTopics, getProgressOverTime,
  getReadinessScore, getRecommendations, getBatchAnalytics,
} from '../controllers/analytics.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

// Student self-service + PO/Admin drill-down
router.get('/student/:id/topic-accuracy', getTopicAccuracy);
router.get('/student/:id/weak-topics', getWeakTopics);
router.get('/student/:id/progress', getProgressOverTime);
router.get('/student/:id/readiness', getReadinessScore);
router.get('/student/:id/recommendations', getRecommendations);

// PO/Admin: batch overview
router.get('/batch', requireRole('po', 'admin'), getBatchAnalytics);

export default router;