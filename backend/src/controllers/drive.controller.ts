import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import {
  evaluateEligibility,
  checkRegistrationOpen,
  getPublicationChecklist,
  isTransitionAllowed,
} from '../services/eligibility.service.js';
import { findDuplicateDrives } from '../services/driveDuplicate.service.js';
import { detectScheduleConflicts } from '../services/driveConflict.service.js';
import {
  enqueueDriveNotification,
  processPendingDriveNotifications,
} from '../services/driveNotification.service.js';
import { diffDriveRounds, DriveRound } from '../utils/driveRoundDiff.js';
import {
  getProfileCompleteness,
  getActiveBacklogs,
  computeCgpa,
} from '../services/academic.service.js';
import { sanitizeHtml, isSafeUrl } from '../utils/sanitize.js';
import { scheduleDriveReminders, cancelDriveReminders } from '../services/emns.service.js';

// ============================================================
// GET ALL DRIVES
// ============================================================
export const getAllDrives = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStudent = req.user!.role === 'student';
    const statusQuery = req.query['status'] as string | undefined;

    const whereClause: any = {};
    if (isStudent) {
      // Students cannot see draft or archived drives
      whereClause.status = { in: ['published', 'active', 'closed', 'cancelled', 'withdrawn'] };
    } else if (statusQuery) {
      whereClause.status = statusQuery;
    } else {
      // PO/Admin view excludes archived by default unless requested
      whereClause.status = { not: 'archived' };
    }

    const drives = await prisma.placementDrive.findMany({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            website: true,
            hqLocation: true,
            contactEmail: true,
            contactPhone: true,
            description: true,
          },
        },
        eligibleBranches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        eligibleBatches: {
          include: { batch: { select: { id: true, name: true, graduationYear: true } } },
        },
        _count: {
          select: {
            applications: { where: { status: { not: 'withdrawn' } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (isStudent) {
      const studentId = req.user!.id;
      const [studentProfile, completeness, backlogs, cgpaRes] = await Promise.all([
        prisma.studentProfile.findUnique({
          where: { userId: studentId },
          include: { branch: true, batch: true },
        }),
        getProfileCompleteness(studentId),
        getActiveBacklogs(studentId),
        computeCgpa(studentId),
      ]);

      const studentData = {
        ...studentProfile,
        cgpa: cgpaRes.effectiveCgpa ?? studentProfile?.cgpa ?? null,
        activeBacklogs: backlogs.activeCount,
        cgpaVerified: studentProfile?.cgpaVerified ?? false,
        academicStatus: studentProfile?.academicStatus ?? 'pending',
        isProfileComplete: completeness.isComplete,
        missingFields: completeness.missingFields,
      };

      const studentApplications = await prisma.driveApplication.findMany({
        where: { studentId },
      });
      const appMap = new Map(studentApplications.map((a) => [a.driveId, a]));

      const drivesWithEligibility = drives.map((d: any) => {
        const eligibility = evaluateEligibility(d, studentData);
        const activeCount = d._count.applications;
        const regStatus = checkRegistrationOpen(d, activeCount);
        const myApp = appMap.get(d.id) || null;

        return {
          ...d,
          eligibleBranches: d.eligibleBranches.map((eb: any) => eb.branch),
          eligibleBatches: d.eligibleBatches.map((eb: any) => eb.batch),
          applicantCount: activeCount,
          myEligibility: eligibility,
          registrationOpen: regStatus.open,
          registrationClosedReason: regStatus.reason,
          myApplication: myApp,
        };
      });

      return res.json({ success: true, data: drivesWithEligibility });
    }

    // PO/Admin response
    const formatted = drives.map((d: any) => ({
      ...d,
      eligibleBranches: d.eligibleBranches.map((eb: any) => eb.branch),
      eligibleBatches: d.eligibleBatches.map((eb: any) => eb.batch),
      applicantCount: d._count.applications,
      checklist: d.status === 'draft' ? getPublicationChecklist(d) : undefined,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET DRIVE BY ID
// ============================================================
export const getDriveById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const isStudent = req.user!.role === 'student';

    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        company: true,
        eligibleBranches: {
          include: { branch: { select: { id: true, name: true } } },
        },
        eligibleBatches: {
          include: { batch: { select: { id: true, name: true, graduationYear: true } } },
        },
        changeHistory: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            applications: { where: { status: { not: 'withdrawn' } } },
          },
        },
      },
    });

    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (isStudent && (drive.status === 'draft' || drive.status === 'archived')) {
      throw ApiError.forbidden('Drive is not currently accessible');
    }

    const activeCount = drive._count.applications;
    const regStatus = checkRegistrationOpen(drive, activeCount);

    if (isStudent) {
      const studentId = req.user!.id;
      const [studentProfile, completeness, backlogs, cgpaRes] = await Promise.all([
        prisma.studentProfile.findUnique({
          where: { userId: studentId },
          include: { branch: true, batch: true },
        }),
        getProfileCompleteness(studentId),
        getActiveBacklogs(studentId),
        computeCgpa(studentId),
      ]);

      const studentData = {
        ...studentProfile,
        cgpa: cgpaRes.effectiveCgpa ?? studentProfile?.cgpa ?? null,
        activeBacklogs: backlogs.activeCount,
        cgpaVerified: studentProfile?.cgpaVerified ?? false,
        academicStatus: studentProfile?.academicStatus ?? 'pending',
        isProfileComplete: completeness.isComplete,
        missingFields: completeness.missingFields,
      };

      const eligibility = evaluateEligibility(drive, studentData);
      const myApplication = await prisma.driveApplication.findUnique({
        where: { driveId_studentId: { driveId: id, studentId: req.user!.id } },
        include: {
          resumeVersion: {
            select: {
              id: true,
              version: true,
              label: true,
              originalName: true,
              uploadedAt: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        data: {
          ...drive,
          eligibleBranches: drive.eligibleBranches.map((eb) => eb.branch),
          eligibleBatches: drive.eligibleBatches.map((eb) => eb.batch),
          applicantCount: activeCount,
          myEligibility: eligibility,
          registrationOpen: regStatus.open,
          registrationClosedReason: regStatus.reason,
          myApplication,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...drive,
        eligibleBranches: drive.eligibleBranches.map((eb) => eb.branch),
        eligibleBatches: drive.eligibleBatches.map((eb) => eb.batch),
        applicantCount: activeCount,
        registrationOpen: regStatus.open,
        registrationClosedReason: regStatus.reason,
        checklist: getPublicationChecklist(drive),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CREATE DRIVE (PO/Admin)
// ============================================================
export const createDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      companyId,
      title,
      jobRole,
      jobDescription,
      responsibilities,
      requiredSkills,
      qualifications,
      experienceRequired,
      employmentType = 'full_time',
      location,
      vacancies,
      ctcMin,
      ctcMax,
      monthlySalary,
      stipend,
      benefits,
      selectionProcess,
      minCgpa,
      maxBacklogs,
      registrationDeadline,
      rounds,
      eligibleBranchIds = [],
      eligibleBatchIds = [],
      duplicateOverrideReason,
      conflictOverrideReason,
    } = req.body;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw ApiError.badRequest('Referenced company does not exist');

    // Challenge 8: Check for duplicates
    const duplicates = await findDuplicateDrives({
      companyId,
      jobRole,
      employmentType,
      location,
      batchIds: eligibleBatchIds,
    });

    if (duplicates.length > 0 && !duplicateOverrideReason) {
      return res.status(409).json({
        success: false,
        error: 'Potential duplicate drive detected for this company, role, and batch.',
        duplicateCount: duplicates.length,
        duplicates: duplicates.map((d: any) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          company: d.company.name,
        })),
        requireOverride: true,
      });
    }

    // Challenge 12: Check schedule conflicts
    const conflicts = await detectScheduleConflicts({
      rounds: rounds || [],
      branchIds: eligibleBranchIds,
      batchIds: eligibleBatchIds,
    });

    if (conflicts.length > 0 && !conflictOverrideReason) {
      return res.status(409).json({
        success: false,
        error: 'Recruitment round schedule conflict detected with another active drive.',
        conflictCount: conflicts.length,
        conflicts,
        requireOverride: true,
      });
    }

    const drive = await prisma.placementDrive.create({
      data: {
        companyId,
        title,
        jobRole,
        jobDescription: sanitizeHtml(jobDescription),
        responsibilities: sanitizeHtml(responsibilities),
        requiredSkills: requiredSkills || [],
        qualifications: sanitizeHtml(qualifications),
        experienceRequired,
        employmentType,
        location,
        vacancies,
        ctcMin,
        ctcMax,
        monthlySalary,
        stipend,
        benefits,
        selectionProcess: sanitizeHtml(selectionProcess),
        minCgpa,
        maxBacklogs,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        rounds: rounds || [],
        duplicateOverrideReason: duplicateOverrideReason || null,
        conflictOverrideReason: conflictOverrideReason || null,
        status: 'draft',
        createdBy: req.user!.id,
        eligibleBranches: {
          create: eligibleBranchIds.map((branchId: number) => ({ branchId })),
        },
        eligibleBatches: {
          create: eligibleBatchIds.map((batchId: number) => ({ batchId })),
        },
      },
      include: {
        company: true,
        eligibleBranches: { include: { branch: true } },
        eligibleBatches: { include: { batch: true } },
      },
    });

    await audit(req.user!.id, 'drive.create', 'placement_drive', drive.id, 'success', {
      title,
      company: company.name,
      jobRole,
    });

    res.status(201).json({ success: true, data: drive });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// UPDATE DRIVE (PO/Admin)
// ============================================================
export const updateDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const {
      eligibleBranchIds,
      eligibleBatchIds,
      registrationDeadline,
      rounds,
      duplicateOverrideReason,
      conflictOverrideReason,
      ...updateData
    } = req.body;

    const existing = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        eligibleBranches: true,
        eligibleBatches: true,
      },
    });
    if (!existing) throw ApiError.notFound('Placement drive not found');
    if (existing.status === 'archived') {
      throw ApiError.badRequest('Archived drives cannot be edited. Restore first.');
    }

    // Challenge 5: Diff rounds and record change history + notify
    if (rounds !== undefined) {
      const oldRounds = Array.isArray(existing.rounds) ? (existing.rounds as DriveRound[]) : [];
      const diff = diffDriveRounds(oldRounds, rounds);

      if (diff.hasChanges) {
        await prisma.driveChangeHistory.create({
          data: {
            driveId: id,
            changedBy: req.user!.id,
            changeType: diff.primaryChangeType as any,
            previousValue: oldRounds as any,
            newValue: rounds as any,
          },
        });

        if (existing.status === 'published' || existing.status === 'active') {
          // Enqueue schedule change notification to registered students
          const dedupKey = `${id}:schedule_change:${Date.now()}`;
          await enqueueDriveNotification(id, 'schedule_change', dedupKey);
          processPendingDriveNotifications().catch(() => {});
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (eligibleBranchIds !== undefined) {
        await tx.driveEligibleBranch.deleteMany({ where: { driveId: id } });
        if (eligibleBranchIds.length > 0) {
          await tx.driveEligibleBranch.createMany({
            data: eligibleBranchIds.map((branchId: number) => ({ driveId: id, branchId })),
          });
        }
      }

      if (eligibleBatchIds !== undefined) {
        await tx.driveEligibleBatch.deleteMany({ where: { driveId: id } });
        if (eligibleBatchIds.length > 0) {
          await tx.driveEligibleBatch.createMany({
            data: eligibleBatchIds.map((batchId: number) => ({ driveId: id, batchId })),
          });
        }
      }

      return await tx.placementDrive.update({
        where: { id },
        data: {
          ...updateData,
          ...(rounds !== undefined && { rounds }),
          ...(registrationDeadline !== undefined && {
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          }),
          ...(duplicateOverrideReason !== undefined && { duplicateOverrideReason }),
          ...(conflictOverrideReason !== undefined && { conflictOverrideReason }),
        },
        include: {
          company: true,
          eligibleBranches: { include: { branch: true } },
          eligibleBatches: { include: { batch: true } },
        },
      });
    });

    await audit(req.user!.id, 'drive.update', 'placement_drive', id, 'success', {
      changedFields: Object.keys(req.body),
    });

    // Challenge 11: EMNS deadline reminder rescheduling
    if (req.body.registrationDeadline !== undefined) {
      const newDeadline = req.body.registrationDeadline ? new Date(req.body.registrationDeadline) : null;
      if (newDeadline && ['published', 'active'].includes(updated.status)) {
        await scheduleDriveReminders(updated.id, newDeadline).catch((err) => {
          console.error('EMNS scheduleDriveReminders failed on update:', err);
        });
      } else if (!newDeadline) {
        await cancelDriveReminders(updated.id).catch(() => {});
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PUBLISH DRIVE (PO/Admin)
// ============================================================
export const publishDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        company: true,
        eligibleBranches: true,
        eligibleBatches: true,
      },
    });

    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (!isTransitionAllowed(drive.status, 'published')) {
      throw ApiError.badRequest(`Cannot transition drive from status "${drive.status}" to "published"`);
    }

    // Challenge 2, 16: Checklist validation gate
    const checklist = getPublicationChecklist(drive);
    const failures = checklist.filter((item) => !item.ok);

    if (failures.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Drive does not satisfy all publication requirements.',
        failedItems: failures,
        checklist,
      });
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
      data: { status: 'published' },
      include: {
        company: true,
        eligibleBranches: { include: { branch: true } },
        eligibleBatches: { include: { batch: true } },
      },
    });

    // Materialize criteria v1 if none exists yet (Challenges 38, 39)
    const existingCriteria = await prisma.driveEligibilityCriteria.findFirst({
      where: { driveId: id, supersededAt: null },
    });
    if (!existingCriteria) {
      const branchIds = updated.eligibleBranches.map((eb: any) => eb.branchId);
      const batchIds = updated.eligibleBatches.map((eb: any) => eb.batchId);
      await prisma.driveEligibilityCriteria.create({
        data: {
          driveId: id,
          version: 1,
          criteria: {
            minCgpa: updated.minCgpa != null ? Number(updated.minCgpa) : null,
            maxActiveBacklogs: updated.maxBacklogs ?? 0,
            eligibleBranchIds: branchIds,
            eligibleBatchIds: batchIds,
          },
          changeReason: 'Initial criteria materialized on drive publication',
          createdBy: req.user!.id,
        },
      });
    }

    // Challenge 1, 14: Enqueue and dispatch new drive notification
    await enqueueDriveNotification(id, 'new_drive', `${id}:new_drive`);
    const dispatchResults = await processPendingDriveNotifications();

    // Challenge 3: Schedule EMNS automated reminders if deadline exists
    if (updated.registrationDeadline) {
      await scheduleDriveReminders(updated.id, updated.registrationDeadline).catch((err) => {
        console.error('EMNS scheduleDriveReminders failed on publish:', err);
      });
    }

    // Recommendation freshness watermark (Ch 72/77): all students' recommendations
    // regenerate lazily on their next /reco/recommendations fetch
    await prisma.systemSetting.upsert({
      where: { key: 'RECO_DRIVE_WATERMARK' },
      update: { value: new Date().toISOString(), updatedBy: req.user!.id },
      create: { key: 'RECO_DRIVE_WATERMARK', value: new Date().toISOString(), updatedBy: req.user!.id },
    });

    await audit(req.user!.id, 'drive.publish', 'placement_drive', id, 'success', {
      title: drive.title,
      company: drive.company.name,
    });

    res.json({
      success: true,
      data: updated,
      checklist,
      notificationDispatch: dispatchResults,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// CANCEL DRIVE (PO/Admin)
// ============================================================
export const cancelDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { reason } = req.body;

    const drive = await prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (!isTransitionAllowed(drive.status, 'cancelled')) {
      throw ApiError.badRequest(`Cannot transition drive from "${drive.status}" to "cancelled"`);
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: req.user!.id,
        cancellationReason: reason,
        registrationClosedAt: new Date(),
        registrationCloseReason: 'cancelled',
      },
    });

    // Challenge 11: Dedup key driveId:cancellation guarantees never duplicate
    await enqueueDriveNotification(id, 'cancellation', `${id}:cancellation`);
    await processPendingDriveNotifications();

    // Challenge 11: Cancel EMNS pending reminders
    await cancelDriveReminders(id).catch(() => {});

    await audit(req.user!.id, 'drive.cancel', 'placement_drive', id, 'success', { reason });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// WITHDRAW DRIVE (PO/Admin)
// ============================================================
export const withdrawDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { reason } = req.body;

    const drive = await prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (!isTransitionAllowed(drive.status, 'withdrawn')) {
      throw ApiError.badRequest(`Cannot transition drive from "${drive.status}" to "withdrawn"`);
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
      data: {
        status: 'withdrawn',
        withdrawnAt: new Date(),
        withdrawnBy: req.user!.id,
        withdrawalReason: reason,
        registrationClosedAt: new Date(),
        registrationCloseReason: 'withdrawn',
      },
    });

    await enqueueDriveNotification(id, 'withdrawal', `${id}:withdrawal`);
    await processPendingDriveNotifications();

    // Challenge 11: Cancel EMNS pending reminders
    await cancelDriveReminders(id).catch(() => {});

    await audit(req.user!.id, 'drive.withdraw', 'placement_drive', id, 'success', { reason });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ARCHIVE DRIVE (DELETE = Archive only, Challenge 9)
// ============================================================
export const archiveDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const drive = await prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (!isTransitionAllowed(drive.status, 'archived')) {
      throw ApiError.badRequest(`Cannot archive drive from status "${drive.status}". Close, cancel, or withdraw it first.`);
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
      },
    });

    // Challenge 11: Cancel EMNS pending reminders
    await cancelDriveReminders(id).catch(() => {});

    await audit(req.user!.id, 'drive.archive', 'placement_drive', id, 'success', {});

    res.json({ success: true, data: updated, message: 'Drive archived successfully. Application records preserved.' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// RESTORE DRIVE (Admin only, Challenge 9)
// ============================================================
export const restoreDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const drive = await prisma.placementDrive.findUnique({ where: { id } });
    if (!drive) throw ApiError.notFound('Placement drive not found');

    if (drive.status !== 'archived') {
      throw ApiError.badRequest('Only archived drives can be restored');
    }

    const updated = await prisma.placementDrive.update({
      where: { id },
      data: {
        status: 'draft',
        archivedAt: null,
      },
    });

    await audit(req.user!.id, 'drive.restore', 'placement_drive', id, 'success', {});

    res.json({ success: true, data: updated, message: 'Drive restored to draft status.' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET PUBLICATION CHECKLIST
// ============================================================
export const getDriveChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        eligibleBranches: true,
        eligibleBatches: true,
      },
    });

    if (!drive) throw ApiError.notFound('Placement drive not found');

    const checklist = getPublicationChecklist(drive);
    res.json({ success: true, data: checklist });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PREVIEW ELIGIBLE STUDENTS (Challenge 2)
// ============================================================
export const getEligibleStudentsPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const drive = await prisma.placementDrive.findUnique({
      where: { id },
      include: {
        eligibleBranches: true,
        eligibleBatches: true,
      },
    });

    if (!drive) throw ApiError.notFound('Placement drive not found');

    const students = await prisma.studentProfile.findMany({
      where: {
        user: { isActive: true, role: 'student' },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true, graduationYear: true } },
        backlogs: { where: { status: 'active' }, select: { id: true } },
      },
    });

    const evaluated = students.map((s: any) => {
      const studentData = {
        ...s,
        activeBacklogs: s.backlogs ? s.backlogs.length : 0,
      };
      const result = evaluateEligibility(drive, studentData);
      return {
        studentId: s.userId,
        name: s.user.name,
        email: s.user.email,
        branch: s.branch?.name || null,
        batch: s.batch?.name || null,
        cgpa: s.cgpa,
        eligible: result.eligible,
        reasons: result.reasons,
        missingProfileInfo: result.missingProfileInfo,
      };
    });

    const eligibleCount = evaluated.filter((e) => e.eligible).length;
    res.json({
      success: true,
      data: {
        totalEvaluated: evaluated.length,
        eligibleCount,
        ineligibleCount: evaluated.length - eligibleCount,
        students: evaluated,
      },
    });
  } catch (err) {
    next(err);
  }
};
