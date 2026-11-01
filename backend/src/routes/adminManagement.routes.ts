// Challenges 186, 190, 191, 193, 199, 200: Admin Management Routes
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../utils/validate.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/adminManagement.controller.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// Bulk Import (Challenges 190, 191)
router.post(
  '/students/bulk-import',
  validate(
    z.object({
      body: z.object({
        students: z.array(
          z.object({
            name: z.string().min(1),
            email: z.string().email(),
            universityId: z.string().optional(),
            branchName: z.string().min(1),
            batchName: z.string().min(1),
            admissionYear: z.number().int().optional(),
            cgpa: z.number().min(0).max(10).optional(),
          })
        ),
      }),
    })
  ),
  c.bulkImport
);

// System Config & History (Challenge 199)
router.get('/settings', c.getSettings);
router.put(
  '/settings',
  validate(
    z.object({
      body: z.object({
        key: z.string().min(1),
        value: z.string(),
      }),
    })
  ),
  c.updateSetting
);
router.get('/settings/history', c.getSettingHistory);
router.get('/settings/history/:key', c.getSettingHistory);

// Placement Reports (Challenge 193)
router.get('/reports/placement.csv', c.downloadReport);

// Background Job Monitoring & Dead Letter Queue (Challenges 285, 290)
router.get('/jobs/failed', c.getFailedJobs);
router.post('/jobs/retry', c.retryFailedJobs);

// Soft Delete / Restore (Challenges 186, 200)
// Placed after specific routes so they don't capture named paths
router.delete('/:entity/:id', c.deleteEntity);
router.post('/:entity/:id/restore', c.restoreEntityCtrl);

export default router;

