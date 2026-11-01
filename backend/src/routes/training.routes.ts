import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../config/multer.js';
import * as c from '../controllers/training.controller.js';

const router = Router();
router.use(requireAuth);

const idParam = z.object({ params: z.object({ id: z.string().min(1) }) });

// ---------- Student ----------
router.get('/my-schedule', requireRole('student'), c.mySchedule);
router.patch(
  '/assignments/:assignmentId/status',
  validate(
    z.object({
      params: z.object({ assignmentId: z.string().min(1) }),
      body: z.object({ status: z.enum(['completed']) }),
    })
  ),
  c.updateAssignmentStatus
);
router.get('/learning/my-recommendations', requireRole('student'), c.myRecommendations);
router.get('/learning/my-competencies', requireRole('student'), c.myCompetencies);
router.get('/learning/competencies/:studentId', requireRole('po', 'admin'), c.myCompetencies);
router.post('/learning/modules/:id/enroll', requireRole('student'), validate(idParam), c.enrollInModule);
router.post('/learning/modules/:id/evaluate', requireRole('student'), validate(idParam), c.evaluateMyModule);

// ---------- Modules (read: all authenticated) ----------
router.get('/learning/modules', c.listModules);

// ---------- Trainer/PO/Admin ----------
router.post(
  '/sessions',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      body: z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(2000).optional(),
        topicId: z.number().int().positive().optional(),
        moduleId: z.string().optional(),
        scheduledAt: z.string().datetime(),
        durationMins: z.number().int().min(15).max(480).default(60),
        learningObjectives: z.array(z.string().max(200)).max(10).optional(),
        location: z.string().max(200).optional(),
        meetingLink: z.string().url().optional(),
      }),
    })
  ),
  c.createSession
);

router.post(
  '/sessions/:id/assign',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        studentIds: z.array(z.string()).optional(),
        batchId: z.number().int().positive().optional(),
        levelOverrideReason: z.string().min(10).max(500).optional(),
      }),
    })
  ),
  c.assignStudents
);

router.post(
  '/sessions/:id/reschedule',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({ newScheduledAt: z.string().datetime(), reason: z.string().min(5).max(500) }),
    })
  ),
  c.reschedule
);

router.post('/sessions/:id/cancel', requireRole('trainer', 'po', 'admin'), validate(idParam), c.cancelSession);
router.get('/adherence', requireRole('trainer', 'po', 'admin'), c.adherenceOverview);

router.post(
  '/learning/modules',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      body: z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(2000).optional(),
        level: z.enum(['beginner', 'intermediate', 'advanced']),
        topicId: z.number().int().positive().optional(),
        branchId: z.number({ message: 'branchId must be a number' })
          .int().positive('branchId must be positive')
          .nullable().optional(), // Department scoping: null/omitted => global
        resourceId: z.string().optional(),
        assessmentTestId: z.string().optional(),
        codingProblemId: z.string().optional(),
        minPassingScore: z.number().int().min(0).max(100).default(60),
        orderIndex: z.number().int().default(0),
        requiredSkills: z.array(z.string().max(60)).max(20).optional(),
        prerequisiteModuleIds: z.array(z.string()).optional(),
      }),
    })
  ),
  c.createModule
);

router.post(
  '/learning/modules/:id/prereq-exception',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({ studentId: z.string().min(1), reason: z.string().min(10).max(500) }),
    })
  ),
  c.prereqException
);

router.patch(
  '/learning/modules/:moduleId/verify/:studentId',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      params: z.object({ moduleId: z.string().min(1), studentId: z.string().min(1) }),
      body: z.object({ passed: z.boolean(), note: z.string().max(500).optional() }),
    })
  ),
  c.trainerVerifyModule
);

// ---------- Resource management (trainer owner / admin) ----------
router.post(
  '/resources/check-duplicate',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      body: z.object({
        title: z.string().min(3),
        sourceUrl: z.string().url().optional(),
        contentHash: z.string().optional(),
      }),
    })
  ),
  c.checkDuplicate
);

router.post(
  '/resources/:id/new-version',
  requireRole('trainer', 'admin'),
  upload.single('file'),
  c.newResourceVersion
);

router.patch(
  '/resources/:id/content-status',
  requireRole('trainer', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({ contentStatus: z.enum(['updated', 'under_review', 'outdated']) }),
    })
  ),
  c.updateContentStatus
);

router.patch(
  '/resources/:id/visibility',
  requireRole('trainer', 'admin'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        visibility: z.enum(['public', 'institution', 'training_group', 'restricted']),
        license: z.string().max(300).optional(),
        attribution: z.string().max(500).optional(),
        alternatives: z.array(z.string().url()).max(5).optional(),
        branchId: z.number({ message: 'branchId must be a number' })
          .int().positive('branchId must be positive')
          .nullable().optional(), // Department scoping: null resets to global
      }),
    })
  ),
  c.updateVisibility
);

router.get('/resources/stale', requireRole('trainer', 'po', 'admin'), c.staleResources);
router.post('/resources/link-checks/run', requireRole('trainer', 'po', 'admin'), c.runLinkChecks);
router.get('/resources/:id/link-status', validate(idParam), c.linkStatus);

// ---------- Secure download + video progress ----------
router.get('/resources/:id/download', validate(idParam), c.downloadResource);
router.get('/resources/:id/video-progress', requireRole('student'), validate(idParam), c.getVideoProgress);
router.put(
  '/resources/:id/video-progress',
  requireRole('student'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        positionSeconds: z.number().int().min(0).max(86400),
        durationSeconds: z.number().int().min(0).max(86400).optional(),
        clientUpdatedAt: z.string().datetime(),
      }),
    })
  ),
  c.saveVideoProgress
);

// ---------- Analytics ----------
router.get('/analytics/effectiveness', requireRole('trainer', 'po', 'admin'), c.effectiveness);
router.get('/analytics/content-relevance', requireRole('trainer', 'po', 'admin'), c.contentRelevance);
router.get('/analytics/report.csv', requireRole('po', 'admin'), c.effectivenessReport);
router.post('/reminders/run', requireRole('admin'), c.runReminders);

// ---------- Training Resource Hub & Discovery ----------
// Student Routes
router.get('/resources', c.getResources);
router.get('/dashboard', c.getTrainingDashboard);
router.post('/resources/:resourceId/bookmark', c.toggleBookmark);
router.patch('/resources/:resourceId/progress', c.updateProgress);

// Admin/PO Routes
router.post('/ingest', requireRole('admin', 'po'), c.ingestResources);
router.get('/providers', requireRole('admin'), c.getProviders);

export default router;

