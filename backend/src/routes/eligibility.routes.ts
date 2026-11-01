import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getMyEligibility,
  getEligibilityPreview,
  updateCriteria,
  getCriteriaHistory,
  shortlist,
  overrideEligibility,
  getEligibilityReport,
  getOverrideHistory,
  recordSupplementaryExam,
  upsertEducationHistory,
  verifyEducationHistory,
} from '../controllers/eligibility.controller.js';

const router = Router();
const idParam = z.object({ params: z.object({ id: z.string().min(1) }) });

const criteriaSchema = z.object({
  minCgpa: z.number().min(0).max(10).nullable().optional(),
  minPercentage: z.number().min(0).max(100).nullable().optional(),
  maxActiveBacklogs: z.number().int().min(0).max(20).nullable().optional(),
  maxHistoricalBacklogs: z.number().int().min(0).max(50).nullable().optional(),
  allowPendingSupplementary: z.boolean().optional(),
  maxGapYears: z.number().int().min(0).max(10).nullable().optional(),
  gapBetweenStages: z.array(z.enum(['tenth_twelfth', 'twelfth_ug'])).optional(),
  requiresGapDocumentation: z.boolean().optional(),
  branchRules: z.record(z.string(), z.object({ minCgpa: z.number().min(0).max(10).optional() })).optional(),
  eligibleBranchIds: z.array(z.number().int().positive()).optional().default([]),
  eligibleBatchIds: z.array(z.number().int().positive()).optional().default([]),
  qualifications: z.string().max(500).nullable().optional(),
});

router.use(requireAuth);

// ---------- Student ----------
router.get('/:id/eligibility', requireRole('student'), validate(idParam), getMyEligibility);

// ---------- PO / Admin ----------
router.get('/:id/eligibility-preview', requireRole('po', 'admin'), validate(idParam), getEligibilityPreview);
router.put(
  '/:id/criteria',
  requireRole('po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({ criteria: criteriaSchema, changeReason: z.string().min(10).max(500) }),
    })
  ),
  updateCriteria
);
router.get('/:id/criteria', requireRole('po', 'admin'), validate(idParam), getCriteriaHistory);
router.post(
  '/:id/shortlist',
  requireRole('po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        studentIds: z.array(z.string().min(1)).min(1).max(500),
        conflictOverrideReason: z.string().min(10).max(500).optional(),
      }),
    })
  ),
  shortlist
);
router.post(
  '/:id/eligibility/:studentId/override',
  requireRole('po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1), studentId: z.string().min(1) }),
      body: z.object({ reason: z.string().min(10).max(500) }),
    })
  ),
  overrideEligibility
);
router.get('/:id/eligibility-report', requireRole('po', 'admin'), validate(idParam), getEligibilityReport);
router.get('/:id/override-history', requireRole('admin'), validate(idParam), getOverrideHistory);

// ---------- Supplementary + education history ----------
router.post(
  '/:studentId/supplementary-exams',
  requireRole('po', 'admin'),
  validate(
    z.object({
      params: z.object({ studentId: z.string().min(1) }),
      body: z.object({
        subject: z.string().min(2).max(100),
        semesterNumber: z.number().int().min(1).max(12),
        attemptNumber: z.number().int().min(1).max(5).default(1),
        result: z.enum(['pending', 'passed', 'failed', 'cleared_official']),
      }),
    })
  ),
  recordSupplementaryExam
);

router.put(
  '/:studentId/education-history',
  requireRole('student', 'po', 'admin'),
  validate(
    z.object({
      params: z.object({ studentId: z.string().min(1) }),
      body: z.object({
        level: z.enum(['tenth', 'twelfth', 'diploma', 'undergraduate']),
        institutionName: z.string().max(200).optional(),
        startYear: z.number().int().min(1990).max(2100),
        endYear: z.number().int().min(1990).max(2100),
        gapExplanation: z.string().max(1000).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    // Students may only write their OWN history (ownership guard)
    if (req.user!.role === 'student' && req.params.studentId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'You can only manage your own education history' });
    }
    next();
  },
  upsertEducationHistory
);

router.patch(
  '/education-history/:historyId/verify',
  requireRole('po', 'admin'),
  validate(z.object({ params: z.object({ historyId: z.string().min(1) }) })),
  verifyEducationHistory
);

export default router;

