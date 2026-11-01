import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import {
  computeCgpa,
  getActiveBacklogs,
  getProfileCompleteness,
  getProfileFreshness,
  validateAcademicMapping,
} from '../services/academic.service.js';
import {
  findDuplicateAccounts,
  mergeAccounts as executeMergeAccounts,
} from '../services/duplicateAccounts.service.js';
import { reevaluateStudentForAppliedDrives } from '../services/eligibilityEngine.service.js';
import { AcademicVerificationStatus, SemesterResultStatus, TransferStatus } from '../generated/prisma/enums.js';

/**
 * Challenge 23: PO / Admin verifies or rejects student academic profile.
 * PUT /api/academic/verify/:studentId
 */
export const verifyAcademicInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.studentId as string;
    const { status, reason } = req.body;
    const adminId = req.user!.id;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
      include: { user: true },
    });

    if (!profile) throw ApiError.notFound('Student profile not found');

    const isVerified = status === AcademicVerificationStatus.verified;

    const updated = await prisma.$transaction(async (tx: any) => {
      const up = await tx.studentProfile.update({
        where: { userId: studentId },
        data: {
          academicStatus: status,
          cgpaVerified: isVerified,
          academicUpdatedAt: new Date(),
        },
      });

      await tx.academicVerificationHistory.create({
        data: {
          studentId,
          action: 'STATUS_UPDATE',
          status,
          reason: reason || null,
          performedBy: adminId,
        },
      });

      // Notify student
      const notif = await tx.notification.create({
        data: {
          title: `Academic Profile ${status === 'verified' ? 'Verified' : 'Verification Update'}`,
          message: status === 'verified'
            ? 'Your academic credentials and CGPA have been officially verified by the placement cell.'
            : `Your academic profile status was updated to: ${status}. ${reason ? `Reason: ${reason}` : ''}`,
          createdBy: adminId,
        },
      });

      await tx.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: studentId,
        },
      });

      return up;
    });

    // Recompute CGPA to ensure accurate stats
    const cgpaResult = await computeCgpa(studentId);

    // Challenge 47: Re-evaluate student across all applied drives
    await reevaluateStudentForAppliedDrives(studentId);

    await audit(adminId, 'ACADEMIC_VERIFIED', 'student_profile', studentId, 'success', {
      previousStatus: profile.academicStatus,
      newStatus: status,
      reason,
      cgpaResult,
    });

    res.json({
      success: true,
      message: `Student academic status updated to ${status}.`,
      data: { profile: updated, cgpaResult },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 26: Upsert a semester result (never zero-fills missing semesters).
 * POST /api/academic/semesters
 */
export const upsertSemesterResult = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, semesterNumber, gpa, creditsEarned, creditsAttempted, status } = req.body;
    const actorId = req.user!.id;

    const targetStudentId = studentId || (req.user!.role === 'student' ? req.user!.id : null);
    if (!targetStudentId) {
      throw ApiError.badRequest('studentId is required.');
    }

    const isAdminOrPo = req.user!.role === 'admin' || req.user!.role === 'po';
    const finalStatus: SemesterResultStatus = status || (isAdminOrPo ? 'published' : 'pending');

    const result = await prisma.semesterResult.upsert({
      where: {
        studentId_semesterNumber: {
          studentId: targetStudentId,
          semesterNumber,
        },
      },
      update: {
        gpa: gpa ?? null,
        creditsEarned: creditsEarned ?? null,
        creditsAttempted: creditsAttempted ?? null,
        status: finalStatus,
        verifiedAt: isAdminOrPo ? new Date() : undefined,
        verifiedBy: isAdminOrPo ? actorId : undefined,
      },
      create: {
        studentId: targetStudentId,
        semesterNumber,
        gpa: gpa ?? null,
        creditsEarned: creditsEarned ?? null,
        creditsAttempted: creditsAttempted ?? null,
        status: finalStatus,
        verifiedAt: isAdminOrPo ? new Date() : null,
        verifiedBy: isAdminOrPo ? actorId : null,
      },
    });

    // Recompute CGPA
    const cgpaResult = await computeCgpa(targetStudentId);
    if (cgpaResult.computedCgpa != null) {
      await prisma.studentProfile.update({
        where: { userId: targetStudentId },
        data: {
          cgpa: cgpaResult.computedCgpa,
          academicUpdatedAt: new Date(),
        },
      });
    }

    // Challenge 47: Re-evaluate student across all applied drives
    await reevaluateStudentForAppliedDrives(targetStudentId);

    await audit(actorId, 'UPSERT_SEMESTER_RESULT', 'semester_result', result.id, 'success', {
      studentId: targetStudentId,
      semesterNumber,
      gpa,
      status: finalStatus,
    });

    res.json({
      success: true,
      message: `Semester ${semesterNumber} result recorded.`,
      data: { result, cgpaResult },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 26: List students with missing or pending semester results.
 * GET /api/academic/missing-results
 */
export const getMissingResultsReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: {
          select: {
            universityId: true,
            cgpa: true,
            academicStatus: true,
            branch: { select: { name: true } },
            batch: { select: { name: true, graduationYear: true } },
            semesters: {
              select: {
                semesterNumber: true,
                gpa: true,
                status: true,
              },
              orderBy: { semesterNumber: 'asc' },
            },
          },
        },
      },
    });

    const report: any[] = [];

    for (const s of students) {
      const sems = s.studentProfile?.semesters || [];
      const published = sems.filter((sem: any) => sem.status === 'published' && sem.gpa !== null);
      if (published.length === 0) {
        report.push({
          studentId: s.id,
          name: s.name,
          email: s.email,
          universityId: s.studentProfile?.universityId ?? null,
          branch: s.studentProfile?.branch?.name ?? null,
          batch: s.studentProfile?.batch?.name ?? null,
          issue: 'No published semester results',
          missingSemesters: [1],
        });
      } else {
        const maxSem = Math.max(...published.map((p: any) => p.semesterNumber));
        const pubSet = new Set(published.map((p: any) => p.semesterNumber));
        const missing: number[] = [];
        for (let i = 1; i <= maxSem; i++) {
          if (!pubSet.has(i)) missing.push(i);
        }
        if (missing.length > 0) {
          report.push({
            studentId: s.id,
            name: s.name,
            email: s.email,
            universityId: s.studentProfile?.universityId ?? null,
            branch: s.studentProfile?.branch?.name ?? null,
            batch: s.studentProfile?.batch?.name ?? null,
            issue: `Missing semester(s): ${missing.join(', ')}`,
            missingSemesters: missing,
          });
        }
      }
    }

    res.json({ success: true, count: report.length, data: report });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 27: Record a student backlog.
 * POST /api/academic/backlogs
 */
export const recordBacklog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, subjectCode, subjectName, semester, status, isVerified } = req.body;
    const actorId = req.user!.id;
    const targetStudentId = studentId || (req.user!.role === 'student' ? req.user!.id : null);

    if (!targetStudentId) throw ApiError.badRequest('studentId is required.');

    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'po';

    const backlog = await prisma.backlogRecord.create({
      data: {
        studentId: targetStudentId,
        subjectCode: subjectCode.trim().toUpperCase(),
        subjectName: subjectName.trim(),
        semester,
        status: status || 'active',
        isVerified: isAdmin ? (isVerified ?? true) : false,
      },
    });

    await audit(actorId, 'RECORD_BACKLOG', 'backlog_record', backlog.id, 'success', {
      studentId: targetStudentId,
      subjectCode,
      status,
    });

    // Challenge 47: Re-evaluate student across all applied drives
    await reevaluateStudentForAppliedDrives(targetStudentId);

    res.status(201).json({ success: true, data: backlog });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 27: Update backlog status (e.g. mark cleared).
 * PUT /api/academic/backlogs/:id
 */
export const updateBacklog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status, isVerified } = req.body;
    const actorId = req.user!.id;
    const isAdmin = req.user!.role === 'admin' || req.user!.role === 'po';

    const existing = await prisma.backlogRecord.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Backlog record not found');

    const updated = await prisma.backlogRecord.update({
      where: { id },
      data: {
        status,
        clearedAt: status === 'cleared' ? new Date() : null,
        isVerified: isAdmin ? (isVerified ?? existing.isVerified) : existing.isVerified,
      },
    });

    await audit(actorId, 'UPDATE_BACKLOG', 'backlog_record', id, 'success', {
      previousStatus: existing.status,
      newStatus: status,
    });

    // Challenge 47: Re-evaluate student across all applied drives
    await reevaluateStudentForAppliedDrives(existing.studentId);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 25 & 35: Create branch/batch transfer for a student (Admin only).
 * POST /api/academic/transfers
 */
export const createTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, toBranchId, toBatchId, reason } = req.body;
    const adminId = req.user!.id;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: studentId },
    });

    if (!profile) throw ApiError.notFound('Student profile not found');
    if (!profile.branchId || !profile.batchId) {
      throw ApiError.badRequest('Student does not have existing branch/batch assigned.');
    }

    const mappingValidation = await validateAcademicMapping({
      branchId: toBranchId,
      batchId: toBatchId,
      admissionYear: profile.admissionYear ?? undefined,
    });

    if (!mappingValidation.valid) {
      throw ApiError.badRequest(mappingValidation.error || 'Invalid destination cohort.');
    }

    const transfer = await prisma.$transaction(async (tx: any) => {
      const rec = await tx.studentTransfer.create({
        data: {
          studentId,
          fromBranchId: profile.branchId!,
          toBranchId,
          fromBatchId: profile.batchId!,
          toBatchId,
          reason,
          status: TransferStatus.approved,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });

      // Update student profile and reset verification to force re-review in new branch
      await tx.studentProfile.update({
        where: { userId: studentId },
        data: {
          branchId: toBranchId,
          batchId: toBatchId,
          academicStatus: AcademicVerificationStatus.requires_correction,
          cgpaVerified: false,
          academicUpdatedAt: new Date(),
        },
      });

      // Notify student
      const notif = await tx.notification.create({
        data: {
          title: 'Department / Batch Transfer Approved',
          message: `Your academic department/batch transfer was approved. Reason: ${reason}. Please verify your profile info.`,
          createdBy: adminId,
        },
      });

      await tx.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: studentId,
        },
      });

      return rec;
    });

    await audit(adminId, 'STUDENT_TRANSFER', 'student_transfer', transfer.id, 'success', {
      studentId,
      fromBranchId: profile.branchId,
      toBranchId,
      fromBatchId: profile.batchId,
      toBatchId,
      reason,
    });

    // Challenge 47: Re-evaluate student across all applied drives
    await reevaluateStudentForAppliedDrives(studentId);

    res.status(201).json({
      success: true,
      message: 'Student transfer completed and cohort updated.',
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 24: List stale student profiles (> 180 days without update).
 * GET /api/academic/stale-profiles
 */
export const getStaleProfiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thresholdDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const staleStudents = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { academicUpdatedAt: { lt: thresholdDate } },
          { academicUpdatedAt: null, profileUpdatedAt: { lt: thresholdDate } },
          { academicUpdatedAt: null, profileUpdatedAt: null, updatedAt: { lt: thresholdDate } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      count: staleStudents.length,
      data: staleStudents.map((s: any) => ({
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        universityId: s.universityId,
        branch: s.branch?.name ?? null,
        batch: s.batch?.name ?? null,
        academicStatus: s.academicStatus,
        lastUpdated: s.academicUpdatedAt || s.profileUpdatedAt || s.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 24: Broadcast profile update reminders to stale profiles.
 * POST /api/academic/stale-profiles/remind
 */
export const sendProfileUpdateReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thresholdDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const adminId = req.user!.id;

    const staleProfiles = await prisma.studentProfile.findMany({
      where: {
        OR: [
          { academicUpdatedAt: { lt: thresholdDate } },
          { academicUpdatedAt: null, profileUpdatedAt: { lt: thresholdDate } },
          { academicUpdatedAt: null, profileUpdatedAt: null, updatedAt: { lt: thresholdDate } },
        ],
      },
      select: { userId: true },
    });

    if (staleProfiles.length === 0) {
      return res.json({ success: true, message: 'No stale profiles found.', recipientCount: 0 });
    }

    const notif = await prisma.notification.create({
      data: {
        title: 'Action Required: Update Your Academic Profile',
        message: 'Your placement profile has not been updated in over 6 months. Please verify your CGPA, semesters, and resume to remain eligible for upcoming placement drives.',
        createdBy: adminId,
      },
    });

    await prisma.notificationRecipient.createMany({
      data: staleProfiles.map((p: any) => ({
        notificationId: notif.id,
        userId: p.userId,
      })),
      skipDuplicates: true,
    });

    await audit(adminId, 'SEND_STALE_PROFILE_REMINDERS', 'notification', notif.id, 'success', {
      recipientCount: staleProfiles.length,
    });

    res.json({
      success: true,
      message: `Sent profile update reminders to ${staleProfiles.length} students.`,
      recipientCount: staleProfiles.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 21 & 34: List duplicate candidate accounts.
 * GET /api/academic/duplicates
 */
export const getDuplicateAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const duplicates = await findDuplicateAccounts();
    res.json({ success: true, count: duplicates.length, data: duplicates });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 34: Admin merge duplicate accounts.
 * POST /api/academic/merge-accounts
 */
export const mergeAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { primaryUserId, duplicateUserId } = req.body;
    const adminId = req.user!.id;

    const result = await executeMergeAccounts(primaryUserId, duplicateUserId, adminId, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 31: Admin-only role change endpoint with self-demotion protection and token revocation.
 * POST /api/academic/change-role
 */
export const changeUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.body;
    const adminId = req.user!.id;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw ApiError.notFound('User not found');

    // Prevent last admin from demoting themselves
    if (targetUser.id === adminId && role !== 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin', isActive: true } });
      if (adminCount <= 1) {
        throw ApiError.badRequest('Cannot demote the only remaining administrator.');
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        tokenVersion: { increment: 1 }, // Invalidates active tokens with previous role
      },
      select: { id: true, name: true, email: true, role: true, tokenVersion: true },
    });

    await audit(adminId, 'ROLE_CHANGED', 'user', userId, 'success', {
      previousRole: targetUser.role,
      newRole: role,
    });

    res.json({
      success: true,
      message: `User role changed to ${role}. Active sessions invalidated.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 32: List pending profile correction requests.
 * GET /api/academic/correction-requests
 */
export const getPendingCorrectionRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.profileCorrectionRequest.findMany({
      where: { status: 'pending' },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            branch: { select: { name: true } },
            batch: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    next(err);
  }
};

/**
 * Challenge 32: Review profile correction request (approve or reject).
 * PUT /api/academic/correction-requests/:id
 */
export const reviewCorrectionRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { status, rejectionReason } = req.body;
    const adminId = req.user!.id;

    const request = await prisma.profileCorrectionRequest.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!request) throw ApiError.notFound('Correction request not found');
    if (request.status !== 'pending') {
      throw ApiError.badRequest(`Request is already ${request.status}`);
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.profileCorrectionRequest.update({
        where: { id },
        data: {
          status,
          rejectionReason: status === 'rejected' ? rejectionReason : null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      // If approved, apply the requested change
      if (status === 'approved') {
        const updateData: any = {};
        if (request.fieldRequested === 'universityId') {
          updateData.universityId = request.requestedValue.toUpperCase();
        } else if (request.fieldRequested === 'branchId') {
          updateData.branchId = parseInt(request.requestedValue, 10);
        } else if (request.fieldRequested === 'batchId') {
          updateData.batchId = parseInt(request.requestedValue, 10);
        } else if (request.fieldRequested === 'admissionYear') {
          updateData.admissionYear = parseInt(request.requestedValue, 10);
        } else if (request.fieldRequested === 'cgpa') {
          updateData.cgpa = parseFloat(request.requestedValue);
          updateData.cgpaVerified = true;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.academicUpdatedAt = new Date();
          await tx.studentProfile.update({
            where: { userId: request.studentId },
            data: updateData,
          });
        }
      }

      // Notify student
      const notif = await tx.notification.create({
        data: {
          title: `Profile Correction ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: status === 'approved'
            ? `Your request to change ${request.fieldRequested} to "${request.requestedValue}" has been approved and applied.`
            : `Your request to change ${request.fieldRequested} was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
          createdBy: adminId,
        },
      });

      await tx.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: request.studentId,
        },
      });
    });

    await audit(adminId, 'REVIEW_CORRECTION_REQUEST', 'profile_correction_request', id, 'success', {
      studentId: request.studentId,
      fieldRequested: request.fieldRequested,
      status,
      rejectionReason,
    });

    // Challenge 47: Re-evaluate student across all applied drives if correction was approved
    if (status === 'approved') {
      await reevaluateStudentForAppliedDrives(request.studentId);
    }

    res.json({
      success: true,
      message: `Correction request has been ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};
