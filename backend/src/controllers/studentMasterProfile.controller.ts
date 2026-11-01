import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  getStudentMasterProfile,
  updateStudentMasterProfile,
  submitStudentMasterProfile,
  reviewStudentMasterProfile,
  getProfilesForVerification,
} from '../services/studentMasterProfile.service.js';

export const getMyMasterProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await getStudentMasterProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const updateMyMasterProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await updateStudentMasterProfile(req.user!.id, req.body);
    res.json({ success: true, data: updated, message: 'Profile updated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const submitMyMasterProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submitted = await submitStudentMasterProfile(req.user!.id);
    res.json({
      success: true,
      data: submitted,
      message: 'Master Profile submitted for Placement Training Officer verification.',
    });
  } catch (err) {
    next(err);
  }
};

export const getVerificationQueue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, branchId, batchId, search, page, limit } = req.query;
    const result = await getProfilesForVerification({
      status: status as string,
      branchId: branchId ? Number(branchId) : undefined,
      batchId: batchId ? Number(batchId) : undefined,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getProfileForVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['studentId'] as string;
    const profile = await getStudentMasterProfile(studentId);
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const verifyStudentProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params['studentId'] as string;
    const { status, comments, sectionApprovals } = req.body;

    if (!['VERIFIED', 'REVISION_REQUIRED', 'UNDER_REVIEW'].includes(status)) {
      throw ApiError.badRequest('Invalid verification status action.');
    }

    const updated = await reviewStudentMasterProfile(req.user!.id, studentId, {
      status,
      comments,
      sectionApprovals,
    });

    res.json({
      success: true,
      data: updated,
      message: `Profile status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};

// Child section handlers
export const addTechnicalSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, name, proficiency } = req.body;
    if (!name) throw ApiError.badRequest('Skill name is required.');

    const skill = await prisma.studentTechnicalSkill.create({
      data: {
        studentId: req.user!.id,
        category: category || 'programming_language',
        name: name.trim(),
        proficiency: proficiency || 'intermediate',
      },
    });

    res.status(201).json({ success: true, data: skill });
  } catch (err) {
    next(err);
  }
};

export const deleteTechnicalSkill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.studentTechnicalSkill.deleteMany({
      where: { id, studentId: req.user!.id },
    });
    res.json({ success: true, message: 'Skill deleted.' });
  } catch (err) {
    next(err);
  }
};

export const addProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, domain, technologies, duration, isTeam, contribution, projectUrl, githubUrl } = req.body;
    if (!title || !description) throw ApiError.badRequest('Project title and description are required.');

    const project = await prisma.studentProject.create({
      data: {
        studentId: req.user!.id,
        title,
        description,
        domain,
        technologies: Array.isArray(technologies) ? technologies : [],
        duration,
        isTeam: !!isTeam,
        contribution,
        projectUrl,
        githubUrl,
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.studentProject.deleteMany({
      where: { id, studentId: req.user!.id },
    });
    res.json({ success: true, message: 'Project deleted.' });
  } catch (err) {
    next(err);
  }
};

export const addInternship = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organization, role, type, startDate, endDate, durationMonths, responsibilities, technologies, certificateUrl } = req.body;
    if (!organization || !role || !startDate) {
      throw ApiError.badRequest('Organization, role, and start date are required.');
    }

    const internship = await prisma.studentInternship.create({
      data: {
        studentId: req.user!.id,
        organization,
        role,
        type: type || 'internship',
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        durationMonths: durationMonths ? Number(durationMonths) : null,
        responsibilities,
        technologies: Array.isArray(technologies) ? technologies : [],
        certificateUrl,
      },
    });

    res.status(201).json({ success: true, data: internship });
  } catch (err) {
    next(err);
  }
};

export const deleteInternship = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.studentInternship.deleteMany({
      where: { id, studentId: req.user!.id },
    });
    res.json({ success: true, message: 'Internship entry removed.' });
  } catch (err) {
    next(err);
  }
};

export const addCertification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, issuer, issueDate, expiryDate, credentialId, verificationUrl, certificateUrl, category } = req.body;
    if (!title || !issuer || !issueDate) {
      throw ApiError.badRequest('Certification title, issuer, and issue date are required.');
    }

    const cert = await prisma.studentCertification.create({
      data: {
        studentId: req.user!.id,
        title,
        issuer,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        credentialId,
        verificationUrl,
        certificateUrl,
        category: category || 'certification',
      },
    });

    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
};

export const deleteCertification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.studentCertification.deleteMany({
      where: { id, studentId: req.user!.id },
    });
    res.json({ success: true, message: 'Certification entry removed.' });
  } catch (err) {
    next(err);
  }
};

export const addDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, title, fileUrl, fileSize, mimeType } = req.body;
    if (!type || !title || !fileUrl) {
      throw ApiError.badRequest('Document type, title, and file URL are required.');
    }

    const doc = await prisma.studentDocument.create({
      data: {
        studentId: req.user!.id,
        type,
        title,
        fileUrl,
        fileSize: fileSize ? Number(fileSize) : null,
        mimeType,
      },
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.studentDocument.deleteMany({
      where: { id, studentId: req.user!.id },
    });
    res.json({ success: true, message: 'Document removed.' });
  } catch (err) {
    next(err);
  }
};

