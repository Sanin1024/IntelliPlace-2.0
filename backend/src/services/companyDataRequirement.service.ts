import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { logDataShare } from './privacy.service.js';
import { MASTER_PROFILE_FIELDS } from './studentMasterProfile.service.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface RequestedFieldDefinition {
  fieldKey: string;
  label: string;
  customColumnName?: string;
  required: boolean;
  order: number;
}

/**
 * Create or Update Reusable Company Data Requirement Template.
 */
export async function createTemplate(data: {
  name: string;
  companyName?: string;
  description?: string;
  fields: RequestedFieldDefinition[];
  createdBy: string;
}) {
  if (!data.name || !data.fields || data.fields.length === 0) {
    throw ApiError.badRequest('Template name and at least one requested field are required.');
  }

  const template = await prisma.companyDataRequirementTemplate.create({
    data: {
      name: data.name,
      companyName: data.companyName,
      description: data.description,
      fields: data.fields.sort((a, b) => a.order - b.order) as any,
      createdBy: data.createdBy,
    },
  });

  return template;
}

export async function getTemplates() {
  return await prisma.companyDataRequirementTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplateById(id: string) {
  const template = await prisma.companyDataRequirementTemplate.findUnique({
    where: { id },
  });
  if (!template) throw ApiError.notFound('Requirement template not found.');
  return template;
}

/**
 * Configure Company-Specific Data Requirements for an individual Placement Drive.
 */
export async function configureDriveRequirement(
  driveId: string,
  data: {
    fields: RequestedFieldDefinition[];
    instructions?: string;
    templateId?: string;
  }
) {
  const drive = await prisma.placementDrive.findUnique({ where: { id: driveId } });
  if (!drive) throw ApiError.notFound('Placement drive not found.');

  if (!data.fields || data.fields.length === 0) {
    throw ApiError.badRequest('At least one company requested field must be configured.');
  }

  const sortedFields = [...data.fields].sort((a, b) => a.order - b.order);

  const requirement = await prisma.placementDriveDataRequirement.upsert({
    where: { driveId },
    update: {
      fields: sortedFields as any,
      instructions: data.instructions,
      templateId: data.templateId,
    },
    create: {
      driveId,
      fields: sortedFields as any,
      instructions: data.instructions,
      templateId: data.templateId,
    },
  });

  return requirement;
}

export async function getDriveRequirement(driveId: string) {
  const requirement = await prisma.placementDriveDataRequirement.findUnique({
    where: { driveId },
    include: {
      drive: { select: { id: true, title: true, company: { select: { id: true, name: true } } } },
    },
  });
  return requirement;
}

/**
 * One-Click Company-Specific Dataset Generation.
 * Extracts ONLY explicitly requested fields in configured order for drive candidates.
 */
export async function generateCompanyDataset(
  driveId: string,
  officerId: string,
  scope: 'applied_students' | 'all_eligible' = 'applied_students'
) {
  const requirement = await prisma.placementDriveDataRequirement.findUnique({
    where: { driveId },
    include: {
      drive: {
        include: {
          company: true,
          eligibleBranches: true,
          eligibleBatches: true,
        },
      },
    },
  });

  if (!requirement) {
    throw ApiError.badRequest(
      'Company data requirements have not been configured for this placement drive. Configure requested fields first.'
    );
  }

  const requestedFields: RequestedFieldDefinition[] = (requirement.fields as any[]) || [];
  if (requestedFields.length === 0) {
    throw ApiError.badRequest('No fields configured for extraction in this requirement.');
  }

  // 1. Resolve Target Students
  let studentIds: string[] = [];
  if (scope === 'applied_students') {
    const applications = await prisma.driveApplication.findMany({
      where: { driveId, status: { not: 'withdrawn' } },
      select: { studentId: true },
    });
    studentIds = applications.map((a) => a.studentId);
  } else {
    const branchIds = requirement.drive.eligibleBranches.map((b) => b.branchId);
    const batchIds = requirement.drive.eligibleBatches.map((b) => b.batchId);
    const candidates = await prisma.studentProfile.findMany({
      where: {
        user: { isActive: true, role: 'student', deletedAt: null },
        ...(branchIds.length > 0 && { branchId: { in: branchIds } }),
        ...(batchIds.length > 0 && { batchId: { in: batchIds } }),
      },
      select: { userId: true },
    });
    studentIds = candidates.map((c) => c.userId);
  }

  // 2. Fetch Verified Student Master Profiles
  const profiles = await prisma.studentProfile.findMany({
    where: { userId: { in: studentIds } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      branch: true,
      batch: true,
      technicalSkills: true,
      projects: true,
      internships: true,
      certifications: true,
      documents: true,
    },
  });

  // 3. Map ONLY Requested Fields in Configured Order (Strict Data Minimization)
  let completeCount = 0;
  let missingCount = 0;

  const datasetRecords = profiles.map((p) => {
    const recordRow: Record<string, any> = {};
    const missingInRecord: string[] = [];

    for (const field of requestedFields) {
      const colName = field.customColumnName || field.label;
      const def = MASTER_PROFILE_FIELDS[field.fieldKey];

      let value: any = '';
      if (def) {
        value = def.extractor(p);
      } else if ((p as any)[field.fieldKey] !== undefined) {
        value = (p as any)[field.fieldKey];
      }

      const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
      if (field.required && isEmpty) {
        missingInRecord.push(colName);
      }

      recordRow[colName] = isEmpty ? '' : value;
    }

    const isRecordComplete = missingInRecord.length === 0;
    if (isRecordComplete) {
      completeCount++;
    } else {
      missingCount++;
    }

    return {
      studentId: p.userId,
      studentName: p.user?.name || '',
      ktuid: p.ktuid || p.universityId || '',
      isVerified: p.masterStatus === 'VERIFIED',
      fields: recordRow,
      missingFields: missingInRecord,
      isComplete: isRecordComplete,
    };
  });

  // 4. Calculate Version & Status
  const previous = await prisma.generatedPlacementDataset.findMany({
    where: { driveId },
    orderBy: { version: 'desc' },
    take: 1,
  });
  const nextVersion = previous.length > 0 ? previous[0].version + 1 : 1;

  const initialStatus = missingCount > 0 ? 'INCOMPLETE' : 'GENERATED';

  // 5. Persist Generated Dataset
  const dataset = await prisma.generatedPlacementDataset.create({
    data: {
      requirementId: requirement.id,
      driveId,
      version: nextVersion,
      status: initialStatus,
      scope,
      totalStudents: profiles.length,
      completeCount,
      missingCount,
      data: datasetRecords,
      reviewedBy: officerId,
      reviewedAt: new Date(),
    },
  });

  await audit(officerId, 'placement.dataset_generated', 'placement_dataset', dataset.id, 'success', {
    driveId,
    version: nextVersion,
    totalStudents: profiles.length,
    missingCount,
  });

  return dataset;
}

/**
 * Review, Approve or Reject a Generated Dataset before external company sharing.
 */
export async function reviewPlacementDataset(
  datasetId: string,
  officerId: string,
  action: {
    status: 'APPROVED' | 'REVISION_REQUIRED' | 'UNDER_REVIEW' | 'REVOKED';
    comments?: string;
  }
) {
  const dataset = await prisma.generatedPlacementDataset.findUnique({
    where: { id: datasetId },
    include: { drive: true },
  });

  if (!dataset) throw ApiError.notFound('Generated dataset not found.');

  const isApproval = action.status === 'APPROVED';

  const updated = await prisma.generatedPlacementDataset.update({
    where: { id: datasetId },
    data: {
      status: action.status,
      reviewComments: action.comments || null,
      reviewedBy: officerId,
      reviewedAt: new Date(),
      approvedBy: isApproval ? officerId : dataset.approvedBy,
      approvedAt: isApproval ? new Date() : dataset.approvedAt,
    },
  });

  await audit(officerId, 'placement.dataset_reviewed', 'placement_dataset', datasetId, 'success', {
    status: action.status,
    comments: action.comments,
  });

  return updated;
}

/**
 * Export Approved Dataset to Excel, CSV, or PDF.
 * Enforces Placement Training Officer approval before permitting file generation.
 */
export async function exportCompanyDataset(
  datasetId: string,
  officerId: string,
  format: 'xlsx' | 'csv' | 'pdf',
  sharedWith?: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const dataset = await prisma.generatedPlacementDataset.findUnique({
    where: { id: datasetId },
    include: {
      requirement: true,
      drive: { include: { company: true } },
    },
  });

  if (!dataset) throw ApiError.notFound('Dataset not found.');

  // Strict Security Gate: Only APPROVED datasets can be exported or shared
  if (dataset.status !== 'APPROVED') {
    throw ApiError.forbidden(
      `Dataset must be approved by Placement Training Officer before export or sharing. Current status: ${dataset.status}`
    );
  }

  const requestedFields: RequestedFieldDefinition[] = (dataset.requirement.fields as any[]) || [];
  const records = (dataset.data as any[]) || [];
  const companyName = dataset.drive.company?.name || 'Company';
  const driveTitle = dataset.drive.title;
  const sanitizedTitle = driveTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Record export history
  await prisma.datasetExportHistory.create({
    data: {
      datasetId,
      format,
      exportedBy: officerId,
      sharedWith: sharedWith || companyName,
    },
  });

  // Track data share for compliance (GDPR/Data Privacy Challenge 332)
  for (const r of records) {
    if (r.studentId) {
      await logDataShare(
        r.studentId,
        dataset.drive.companyId,
        dataset.driveId,
        ['company_dataset_export', format],
        officerId
      ).catch(() => {});
    }
  }

  // 1. EXCEL EXPORT
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IntelliPlace Placement Portal';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Candidate Data');

    const columns = requestedFields.map((f) => ({
      header: f.customColumnName || f.label,
      key: f.customColumnName || f.label,
      width: Math.max(15, (f.customColumnName || f.label).length + 4),
    }));

    sheet.columns = columns;

    // Header styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Dark Blue
    };

    // Add candidate rows
    for (const r of records) {
      sheet.addRow(r.fields);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = `${companyName}_${sanitizedTitle}_v${dataset.version}.xlsx`;
    return { buffer, fileName, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }

  // 2. CSV EXPORT
  if (format === 'csv') {
    const headers = requestedFields.map((f) => f.customColumnName || f.label);
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Formula injection protection
      if (/^[=+@-]$/.test(str[0] || '')) str = `'${str}`;
      return `"${str}"`;
    };

    let csvContent = headers.map(escapeCsv).join(',') + '\n';
    for (const r of records) {
      const row = headers.map((h) => escapeCsv(r.fields[h]));
      csvContent += row.join(',') + '\n';
    }

    const buffer = Buffer.from(csvContent, 'utf-8');
    const fileName = `${companyName}_${sanitizedTitle}_v${dataset.version}.csv`;
    return { buffer, fileName, mimeType: 'text/csv' };
  }

  // 3. PDF EXPORT
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const fileName = `${companyName}_${sanitizedTitle}_v${dataset.version}.pdf`;
      resolve({ buffer, fileName, mimeType: 'application/pdf' });
    });
    doc.on('error', reject);

    doc.fontSize(16).text(`IntelliPlace — Verified Candidate Dataset`, { align: 'center' });
    doc.fontSize(11).text(`Company: ${companyName} | Drive: ${driveTitle} | Version: ${dataset.version}`, { align: 'center' });
    doc.moveDown();

    const headers = requestedFields.map((f) => f.customColumnName || f.label);
    doc.fontSize(9).text(`Total Candidates: ${records.length} | Export Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Table Header
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text(headers.slice(0, 8).join('  |  '));
    doc.moveDown(0.5);

    // Rows
    doc.font('Helvetica');
    for (const r of records.slice(0, 50)) {
      const line = headers.slice(0, 8).map((h) => String(r.fields[h] || '').substring(0, 20)).join('  |  ');
      doc.text(line);
    }

    doc.end();
  });
}
