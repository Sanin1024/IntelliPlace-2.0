import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../utils/validate.js';
import { getMyAcademicInfo } from '../controllers/student.controller.js';
import {
  verifyAcademicInfo,
  upsertSemesterResult,
  getMissingResultsReport,
  recordBacklog,
  updateBacklog,
  createTransfer,
  getStaleProfiles,
  sendProfileUpdateReminder,
  getDuplicateAccounts,
  mergeAccounts,
  changeUserRole,
  getPendingCorrectionRequests,
  reviewCorrectionRequest,
} from '../controllers/academicAdmin.controller.js';
import {
  verifyAcademicSchema,
  upsertSemesterResultSchema,
  createBacklogSchema,
  updateBacklogSchema,
  createTransferSchema,
  mergeAccountsSchema,
  changeRoleSchema,
  reviewCorrectionRequestSchema,
} from '../validators/academic.validators.js';

const router = Router();

router.use(requireAuth);

// Student self-service
router.get('/me', requireRole('student'), getMyAcademicInfo);

// Semester & Backlog self-service or admin
router.post(
  '/semesters',
  requireRole('student', 'po', 'admin'),
  validate(upsertSemesterResultSchema),
  upsertSemesterResult
);

router.post(
  '/backlogs',
  requireRole('student', 'po', 'admin'),
  validate(createBacklogSchema),
  recordBacklog
);

router.put(
  '/backlogs/:id',
  requireRole('po', 'admin'),
  validate(updateBacklogSchema),
  updateBacklog
);

// PO / Admin verification
router.put(
  '/verify/:studentId',
  requireRole('po', 'admin'),
  validate(verifyAcademicSchema),
  verifyAcademicInfo
);

router.get(
  '/missing-results',
  requireRole('po', 'admin'),
  getMissingResultsReport
);

router.get(
  '/stale-profiles',
  requireRole('po', 'admin'),
  getStaleProfiles
);

router.post(
  '/stale-profiles/remind',
  requireRole('po', 'admin'),
  sendProfileUpdateReminder
);

// Correction requests
router.get(
  '/correction-requests',
  requireRole('po', 'admin'),
  getPendingCorrectionRequests
);

router.put(
  '/correction-requests/:id',
  requireRole('po', 'admin'),
  validate(reviewCorrectionRequestSchema),
  reviewCorrectionRequest
);

// Admin exclusive actions
router.post(
  '/transfers',
  requireRole('admin'),
  validate(createTransferSchema),
  createTransfer
);

router.get(
  '/duplicates',
  requireRole('admin'),
  getDuplicateAccounts
);

router.post(
  '/merge-accounts',
  requireRole('admin'),
  validate(mergeAccountsSchema),
  mergeAccounts
);

router.post(
  '/change-role',
  requireRole('admin'),
  validate(changeRoleSchema),
  changeUserRole
);

export default router;

