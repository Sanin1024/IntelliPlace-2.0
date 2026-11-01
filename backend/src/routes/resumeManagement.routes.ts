import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/resumeFile.controller.js';

const router = Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});

// 1. Public token download (unauthenticated, token authorized - Challenge 112)
router.get('/link/:token', c.downloadByShareLink);

// 2. All following routes require authentication
router.use(requireAuth);

// Student resume version list & recommendations
router.get('/versions', requireRole('student'), c.listMyResumes);
router.get('/recommendations', requireRole('student'), c.getMyRecommendations);

// Placement Officer / Admin Stale Resume Report & Reminder (Challenge 115)
router.get('/stale-report', requireRole('po', 'admin'), c.getStaleResumes);
router.post('/:studentId/remind', requireRole('po', 'admin'), c.remindStudent);
router.post('/remind/:studentId', requireRole('po', 'admin'), c.remindStudent);

// Student upload (Challenges 101, 102, 103, 109, 110)
router.post('/upload', requireRole('student'), memoryUpload.single('file'), c.uploadResume);

// Version actions
router.patch('/:id/activate', requireRole('student'), c.activateVersion);
router.patch('/:id/label', requireRole('student'), c.setLabel);
router.post('/:id/confirm-parsed', requireRole('student'), c.confirmParsedData);

// Analysis & Download & Link generation (owner or authorized staff)
router.get('/:id/analysis', c.getAnalysis);
router.get('/:id/download', c.downloadVersion);
router.post('/:id/link', c.generateShareLink);

export default router;

