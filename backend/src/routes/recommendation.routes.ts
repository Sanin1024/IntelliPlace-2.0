import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/recommendation.controller.js';

const router = Router();
router.use(requireAuth);

// Student Skill Profiling & Declarations (Ch 66, 67, 73)
router.get('/skills', requireRole('student'), c.getSkills);
router.post('/skills/declared', requireRole('student'), c.upsertDeclaredSkills);
router.delete('/skills/declared/:skill', requireRole('student'), c.deleteDeclaredSkill);

// Career Alignment (Ch 72)
router.get('/career-goal', requireRole('student'), c.getCareer);
router.post('/career-goal', requireRole('student'), c.updateCareerGoal);

// Recommendations (Ch 68, 70, 71, 72, 77)
router.get('/recommendations', requireRole('student'), c.fetchRecommendations);
router.post('/recommendations/:resourceId/dismiss', requireRole('student'), c.dismissReco);
router.post('/regenerate', requireRole('student'), c.regenerateReco);

// Readiness v2 & Growth Analytics (Ch 79, 80)
router.get('/readiness', requireRole('student'), c.fetchReadiness);
router.get('/readiness/history', requireRole('student'), c.fetchReadinessHistory);
router.get('/growth', requireRole('student'), c.fetchGrowth);

// Assessment Integrity Flags & Admin Coverage (Ch 74, 75)
router.get('/integrity-flags', requireRole('po', 'admin'), c.listIntegrityFlags);
router.patch('/integrity-flags/:id', requireRole('po', 'admin'), c.updateIntegrityFlag);
router.get('/coverage', requireRole('po', 'admin'), c.fetchCoverage);

export default router;

