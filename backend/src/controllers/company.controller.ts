import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';

/**
 * Helper: compute eligibility for a student against a company.
 * Returns { eligible, reasons[] }
 */
const checkEligibility = (
  company: any,
  profile: any
): { eligible: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // Check CGPA
  if (company.eligibilityCgpa !== null && company.eligibilityCgpa !== undefined) {
    if (profile?.cgpa === null || profile?.cgpa === undefined) {
      reasons.push(`CGPA not set (required: ${company.eligibilityCgpa}+)`);
    } else if (profile.cgpa < company.eligibilityCgpa) {
      reasons.push(
        `CGPA ${profile.cgpa} is below required ${company.eligibilityCgpa}`
      );
    }
  }

  // Check branch
  if (company.eligibleBranches && company.eligibleBranches.length > 0) {
    const eligibleBranchIds = company.eligibleBranches.map((eb: any) => eb.branchId);
    if (!profile?.branchId || !eligibleBranchIds.includes(profile.branchId)) {
      const branchNames = company.eligibleBranches
        .map((eb: any) => eb.branch?.name)
        .join(', ');
      reasons.push(`Your branch is not eligible (allowed: ${branchNames})`);
    }
  }

  // Check drive date
  if (company.driveDate && new Date(company.driveDate) < new Date()) {
    reasons.push('Drive date has passed');
  }

  // Check if already placed
  if (profile?.placementStatus === 'placed') {
    reasons.push('You are already placed');
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
};

// ============================================================
// PO/ADMIN: CREATE COMPANY
// ============================================================

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, description, jobRole, package: pkg,
      eligibilityCgpa, driveDate, syllabusText,
      eligibleBranchIds, topicIds,
      website, hqLocation, contactEmail, contactPhone,
    } = req.body;

    // Check duplicate name
    const existing = await prisma.company.findUnique({ where: { name } });
    if (existing) throw ApiError.conflict('A company with this name already exists');

    // Verify branches exist
    const branches = await prisma.branch.findMany({
      where: { id: { in: eligibleBranchIds } },
    });
    if (branches.length !== eligibleBranchIds.length) {
      throw ApiError.badRequest('One or more branch IDs are invalid');
    }

    // Verify topics if provided
    if (topicIds && topicIds.length > 0) {
      const topics = await prisma.topic.findMany({
        where: { id: { in: topicIds } },
      });
      if (topics.length !== topicIds.length) {
        throw ApiError.badRequest('One or more topic IDs are invalid');
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        website: website || null,
        hqLocation: hqLocation || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        description: description || null,
        jobRole,
        package: pkg || null,
        eligibilityCgpa,
        driveDate: new Date(driveDate),
        syllabusText: syllabusText || null,
        eligibleBranches: {
          create: eligibleBranchIds.map((branchId: number) => ({ branchId })),
        },
        ...(topicIds && topicIds.length > 0 && {
          topics: {
            create: topicIds.map((topicId: number) => ({ topicId })),
          },
        }),
      },
      include: {
        eligibleBranches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        topics: { include: { topic: { select: { id: true, name: true } } },
        },
      },
    });

    await audit(
      req.user!.id,
      'company.create',
      'company',
      company.id,
      'success',
      { name, jobRole, driveDate }
    );

    res.status(201).json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET ALL COMPANIES (role-aware)
// ============================================================

export const getAllCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStudent = req.user!.role === 'student';
    const includeDeleted = req.query.includeDeleted === 'true' && req.user!.role === 'admin';

    const companies = await prisma.company.findMany({
      where: includeDeleted ? undefined : { deletedAt: null },
      include: {
        eligibleBranches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        topics: { include: { topic: { select: { id: true, name: true } } },
        },
        _count: { select: { targetStudents: true } },
      },
      orderBy: { driveDate: 'asc' },
    });

    // If student, add eligibility status for each company
    if (isStudent) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: req.user!.id },
      });

      const companiesWithEligibility = companies.map((c: any) => {
        const eligibility = checkEligibility(c, profile);
        const daysUntilDrive = c.driveDate
          ? Math.ceil((new Date(c.driveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          id: c.id,
          name: c.name,
          description: c.description,
          jobRole: c.jobRole,
          package: c.package,
          eligibilityCgpa: c.eligibilityCgpa,
          driveDate: c.driveDate,
          daysUntilDrive,
          syllabusText: c.syllabusText,
          eligibleBranches: c.eligibleBranches.map((eb: any) => eb.branch),
          topics: c.topics.map((t: any) => t.topic),
          targetCount: c._count.targetStudents,
          myEligibility: eligibility,
        };
      });

      return res.json({ success: true, data: companiesWithEligibility });
    }

    // PO/Admin: see all data including target counts
    res.json({
      success: true,
      data: companies.map((c: any) => ({
        ...c,
        eligibleBranches: c.eligibleBranches.map((eb: any) => eb.branch || eb),
        topics: c.topics.map((t: any) => t.topic || t),
        targetCount: c._count?.targetStudents ?? 0,
        daysUntilDrive: c.driveDate
          ? Math.ceil((new Date(c.driveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET COMPANY BY ID
// ============================================================

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        eligibleBranches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        topics: { include: { topic: { select: { id: true, name: true } } },
        },
        _count: { select: { targetStudents: true } },
      },
    });

    if (!company) throw ApiError.notFound('Company not found');

    let eligibility = null;
    const isStudent = req.user!.role === 'student';
    if (isStudent) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: req.user!.id },
      });
      eligibility = checkEligibility(company, profile);
    }

    const sanitizedCompany = {
      ...company,
      internalNotes: isStudent ? undefined : company.internalNotes,
      myEligibility: eligibility,
    };

    res.json({ success: true, data: sanitizedCompany });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PO/ADMIN: UPDATE COMPANY
// ============================================================

export const updateCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { eligibleBranchIds, topicIds, driveDate, ...updateData } = req.body;

    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Company not found');

    const company = await prisma.$transaction(async (tx) => {
      // Update branches if provided
      if (eligibleBranchIds) {
        await tx.companyEligibleBranch.deleteMany({ where: { companyId: id } });
        await tx.companyEligibleBranch.createMany({
          data: eligibleBranchIds.map((branchId: number) => ({ companyId: id, branchId })),
        });
      }

      // Update topics if provided
      if (topicIds) {
        await tx.companyTopic.deleteMany({ where: { companyId: id } });
        if (topicIds.length > 0) {
          await tx.companyTopic.createMany({
            data: topicIds.map((topicId: number) => ({ companyId: id, topicId })),
          });
        }
      }

      return await tx.company.update({
        where: { id },
        data: {
          ...updateData,
          ...(driveDate && { driveDate: new Date(driveDate) }),
        },
        include: {
          eligibleBranches: { include: { branch: { select: { id: true, name: true } } } },
          topics: { include: { topic: { select: { id: true, name: true } } } },
        },
      });
    });

    await audit(
      req.user!.id,
      'company.update',
      'company',
      id,
      'success',
      { name: company.name, jobRole: company.jobRole, driveDate: company.driveDate, changedFields: Object.keys(req.body) }
    );

    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PO/ADMIN: DELETE COMPANY
// ============================================================

export const deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { targetStudents: true } } },
    });
    if (!existing) throw ApiError.notFound('Company not found');

    if (existing._count.targetStudents > 0) {
      throw ApiError.badRequest(
        'Students have marked this as a target company. Deactivate it instead of deleting.'
      );
    }

    await prisma.company.delete({ where: { id } });

    await audit(req.user!.id, 'company.delete', 'company', id, 'success', { name: existing.name });

    res.json({ success: true, data: { message: 'Company deleted' } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// STUDENT: MARK/UNMARK TARGET COMPANY
// ============================================================

export const toggleTargetCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const userId = req.user!.id;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) throw ApiError.notFound('Company not found');

    const existing = await prisma.studentTargetCompany.findUnique({
      where: { userId_companyId: { userId, companyId: id } },
    });

    if (existing) {
      await prisma.studentTargetCompany.delete({
        where: { userId_companyId: { userId, companyId: id } },
      });
      res.json({
        success: true,
        data: { isTarget: false, message: 'Removed from target companies' },
      });
    } else {
      await prisma.studentTargetCompany.create({
        data: { userId, companyId: id },
      });
      res.json({
        success: true,
        data: { isTarget: true, message: 'Added to target companies' },
      });
    }
  } catch (err) {
    next(err);
  }
};

// ============================================================
// STUDENT: GET MY TARGET COMPANIES
// ============================================================

export const getMyTargetCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const targets = await prisma.studentTargetCompany.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            jobRole: true,
            driveDate: true,
            package: true,
          },
        },
      },
      orderBy: { company: { driveDate: 'asc' } },
    });

    res.json({
      success: true,
      data: targets.map((t: any) => ({
        companyId: t.companyId,
        ...t.company,
        daysUntilDrive: t.company.driveDate
          ? Math.ceil(
              (new Date(t.company.driveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
};