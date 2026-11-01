import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/studentMasterProfile.controller.js';

const router = Router();
router.use(requireAuth);

// Student Self-Service Master Profile
router.get('/me', requireRole('student'), c.getMyMasterProfile);
router.put('/me', requireRole('student'), c.updateMyMasterProfile);
router.post('/me/submit', requireRole('student'), c.submitMyMasterProfile);

// Child Sections CRUD
router.post('/skills', requireRole('student'), c.addTechnicalSkill);
router.delete('/skills/:id', requireRole('student'), c.deleteTechnicalSkill);

router.post('/projects', requireRole('student'), c.addProject);
router.delete('/projects/:id', requireRole('student'), c.deleteProject);

router.post('/internships', requireRole('student'), c.addInternship);
router.delete('/internships/:id', requireRole('student'), c.deleteInternship);

router.post('/certifications', requireRole('student'), c.addCertification);
router.delete('/certifications/:id', requireRole('student'), c.deleteCertification);

router.post('/documents', requireRole('student'), c.addDocument);
router.delete('/documents/:id', requireRole('student'), c.deleteDocument);

// Placement Training Officer / PO / Admin Verification
router.get(
  '/verification/queue',
  requireRole('po', 'admin', 'trainer'),
  c.getVerificationQueue
);
router.get(
  '/verification/:studentId',
  requireRole('po', 'admin', 'trainer'),
  c.getProfileForVerification
);
router.post(
  '/verification/:studentId',
  requireRole('po', 'admin', 'trainer'),
  c.verifyStudentProfile
);

export default router;

