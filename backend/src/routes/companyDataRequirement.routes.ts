import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/companyDataRequirement.controller.js';

const router = Router();
router.use(requireAuth);

// Field Catalog (All supported master profile fields for dynamic configuration)
router.get('/catalog', requireRole('po', 'admin', 'trainer'), c.getFieldCatalog);

// Requirement Templates
router.post('/templates', requireRole('po', 'admin'), c.createRequirementTemplate);
router.get('/templates', requireRole('po', 'admin'), c.listTemplates);
router.get('/templates/:id', requireRole('po', 'admin'), c.getTemplate);

// Drive Specific Requirements
router.post('/drives/:driveId', requireRole('po', 'admin'), c.configureRequirementsForDrive);
router.get('/drives/:driveId', requireRole('po', 'admin', 'trainer'), c.getRequirementsForDrive);

// Dataset Generation & Review
router.post('/drives/:driveId/generate', requireRole('po', 'admin'), c.generateDatasetForDrive);
router.get('/drives/:driveId/datasets', requireRole('po', 'admin', 'trainer'), c.listDriveDatasets);
router.get('/datasets/:datasetId', requireRole('po', 'admin', 'trainer'), c.getDataset);
router.post('/datasets/:datasetId/review', requireRole('po', 'admin', 'trainer'), c.reviewDataset);

// Secure Export (Only for PO / Admin with Approved Status)
router.get('/datasets/:datasetId/export', requireRole('po', 'admin'), c.exportDataset);

export default router;

