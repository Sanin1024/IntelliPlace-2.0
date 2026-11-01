import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/interview.controller.js';

const router = Router();
router.use(requireAuth);

const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Scheduling (Challenges 116, 118, 119, 126, 127)
router.post(
  '/',
  requireRole('po', 'admin', 'trainer'),
  validate(
    z.object({
      body: z.object({
        studentId: z.string().min(1),
        interviewerId: z.string().min(1),
        type: z.enum(['technical', 'hr', 'aptitude', 'group_discussion', 'managerial']),
        startTime: z.string(),
        endTime: z.string(),
        meetingLink: z.string().url().optional(),
        rubricId: z.string().optional(),
        overrideConflict: z.boolean().optional(),
      }),
    })
  ),
  c.createInterview
);

router.patch(
  '/:id/status',
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        status: z.string(),
        reason: z.string().optional(),
      }),
    })
  ),
  c.changeStatus
);

router.post(
  '/:id/reschedule',
  requireRole('po', 'admin', 'trainer', 'student'),
  validate(
    z.object({
      params: z.object({ id: z.string().min(1) }),
      body: z.object({
        newStartTime: z.string(),
        newEndTime: z.string(),
        reason: z.string().min(3),
      }),
    })
  ),
  c.reschedule
);

router.get('/conflicts', c.checkConflicts);

// Availability & Academic Exams (Challenges 116, 118)
router.post(
  '/availability',
  requireRole('trainer', 'po', 'admin'),
  validate(
    z.object({
      body: z.object({
        slots: z
          .array(
            z.object({
              startTime: z.string(),
              endTime: z.string(),
            })
          )
          .min(1),
      }),
    })
  ),
  c.setAvailability
);

router.get('/availability', c.getMyAvailability);

router.post(
  '/exams',
  requireRole('student'),
  validate(
    z.object({
      body: z.object({
        subject: z.string().min(2),
        startTime: z.string(),
        endTime: z.string(),
      }),
    })
  ),
  c.addAcademicExam
);

router.get('/exams', requireRole('student'), c.getMyAcademicExams);

// Rubrics (Challenge 123)
router.post(
  '/rubrics',
  requireRole('po', 'admin'),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2),
        criteria: z.array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            maxScore: z.number().positive(),
            studentVisible: z.boolean().optional(),
          })
        ),
      }),
    })
  ),
  c.createRubricController
);

router.get('/rubrics', c.listRubrics);

// Feedback (Challenges 122, 123, 124, 128)
router.post(
  '/:id/feedback',
  requireRole('trainer', 'admin', 'po'),
  validate(idParamSchema),
  c.submitFeedbackController
);

router.get('/:id/feedback', validate(idParamSchema), c.getFeedbackController);

// Schedule & Growth Analytics (Challenges 119, 125)
router.get('/my-schedule', c.mySchedule);
router.get('/my-growth', c.myGrowth);

export default router;

