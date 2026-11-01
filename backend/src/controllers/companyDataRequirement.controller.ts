import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  configureDriveRequirement,
  getDriveRequirement,
  generateCompanyDataset,
  reviewPlacementDataset,
  exportCompanyDataset,
} from '../services/companyDataRequirement.service.js';
import { MASTER_PROFILE_FIELDS } from '../services/studentMasterProfile.service.js';

export const getFieldCatalog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const catalog = Object.values(MASTER_PROFILE_FIELDS).map((f) => ({
      key: f.key,
      section: f.section,
      label: f.label,
      isMandatory: f.isMandatory,
    }));
    const sections = Array.from(new Set(catalog.map((c) => c.section)));
    res.json({ success: true, data: { fields: catalog, sections } });
  } catch (err) {
    next(err);
  }
};

export const createRequirementTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, companyName, description, fields } = req.body;
    const template = await createTemplate({
      name,
      companyName,
      description,
      fields,
      createdBy: req.user!.id,
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
};

export const getTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const template = await getTemplateById(id);
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

export const configureRequirementsForDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['driveId'] as string;
    const { fields, instructions, templateId } = req.body;
    const requirement = await configureDriveRequirement(driveId, {
      fields,
      instructions,
      templateId,
    });
    res.json({ success: true, data: requirement, message: 'Drive data requirements configured.' });
  } catch (err) {
    next(err);
  }
};

export const getRequirementsForDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['driveId'] as string;
    const requirement = await getDriveRequirement(driveId);
    res.json({ success: true, data: requirement });
  } catch (err) {
    next(err);
  }
};

export const generateDatasetForDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['driveId'] as string;
    const { scope } = req.body || {};
    const dataset = await generateCompanyDataset(driveId, req.user!.id, scope);
    res.status(201).json({
      success: true,
      data: dataset,
      message: `Company dataset v${dataset.version} generated successfully. Complete: ${dataset.completeCount}, Missing: ${dataset.missingCount}.`,
    });
  } catch (err) {
    next(err);
  }
};

export const listDriveDatasets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['driveId'] as string;
    const datasets = await prisma.generatedPlacementDataset.findMany({
      where: { driveId },
      orderBy: { version: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        exportHistory: { orderBy: { exportedAt: 'desc' } },
      },
    });
    res.json({ success: true, data: datasets });
  } catch (err) {
    next(err);
  }
};

export const getDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datasetId = req.params['datasetId'] as string;
    const dataset = await prisma.generatedPlacementDataset.findUnique({
      where: { id: datasetId },
      include: {
        requirement: true,
        drive: { include: { company: true } },
        reviewer: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        exportHistory: { orderBy: { exportedAt: 'desc' } },
      },
    });
    if (!dataset) throw ApiError.notFound('Generated dataset not found.');
    res.json({ success: true, data: dataset });
  } catch (err) {
    next(err);
  }
};

export const reviewDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datasetId = req.params['datasetId'] as string;
    const { status, comments } = req.body;
    if (!['APPROVED', 'REVISION_REQUIRED', 'UNDER_REVIEW', 'REVOKED'].includes(status)) {
      throw ApiError.badRequest('Invalid dataset review status.');
    }

    const updated = await reviewPlacementDataset(datasetId, req.user!.id, {
      status,
      comments,
    });

    res.json({
      success: true,
      data: updated,
      message: `Dataset status transitioned to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};

export const exportDataset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const datasetId = req.params['datasetId'] as string;
    const format = (req.query.format as 'xlsx' | 'csv' | 'pdf') || 'xlsx';
    const sharedWith = req.query.sharedWith as string;

    const result = await exportCompanyDataset(datasetId, req.user!.id, format, sharedWith);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (err) {
    next(err);
  }
};
