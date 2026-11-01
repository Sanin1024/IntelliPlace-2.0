import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  updateApplicationStatus,
  withdrawApplication,
  getCompanyApplicantsView,
} from '../services/application.service.js';
import {
  createRound,
  updateRoundProgress,
  detectStudentScheduleConflicts,
  getPendingApplicationsReport,
} from '../services/recruitmentRound.service.js';
import { scheduleInterview } from '../services/interview.service.js';

/**
 * Student: Track own applications and recruitment round progress (Challenge 153)
 */
export const myApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const apps = await prisma.driveApplication.findMany({
      where: { studentId },
      include: {
        drive: {
          select: {
            id: true,
            title: true,
            company: { select: { id: true, name: true, hqLocation: true } },
            registrationDeadline: true,
            status: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        rounds: {
          include: { round: true },
          orderBy: { round: { order: 'asc' } },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    res.json({ success: true, data: apps });
  } catch (err) {
    next(err);
  }
};

/**
 * Student: Withdraw own application (Challenge 160)
 */
export const withdraw = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params['id'] as string;
    const { reason } = req.body || {};
    const result = await withdrawApplication(applicationId, req.user!.id, reason);
    res.json({ success: true, data: { message: 'Application withdrawn successfully', ...result } });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Update application status (Challenges 148, 150)
 */
export const changeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params['id'] as string;
    const { status, reason } = req.body;
    const updated = await updateApplicationStatus(applicationId, status, req.user!.id, reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Get applicants for a drive (Challenge 152)
 */
export const getApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['id'] as string;
    const applicants = await getCompanyApplicantsView(driveId);
    res.json({ success: true, data: applicants });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Add recruitment round to drive (Challenge 156)
 */
export const addRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driveId = req.params['id'] as string;
    const { name, order } = req.body;
    if (!name || order === undefined) {
      throw ApiError.badRequest('Round name and order are required');
    }
    const round = await createRound(driveId, name, Number(order), req.user!.id);
    res.status(201).json({ success: true, data: round });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Update round qualification progress for applicant (Challenge 156)
 */
export const updateRound = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params['applicationId'] as string;
    const roundId = req.params['roundId'] as string;
    const { status } = req.body;

    if (!['qualified', 'rejected'].includes(status)) {
      throw ApiError.badRequest('Status must be qualified or rejected');
    }

    const result = await updateRoundProgress(applicationId, roundId, status, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Schedule mock/technical interview for applicant with conflict check (Challenges 154, 158)
 */
export const scheduleInterviewForApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicationId = req.params['applicationId'] as string;
    const { interviewerId, type, startTime, endTime, meetingLink, rubricId, overrideConflict } = req.body;

    const app = await prisma.driveApplication.findUnique({
      where: { id: applicationId },
      include: { drive: { select: { title: true } } },
    });
    if (!app) throw ApiError.notFound('Application not found.');

    if (!['shortlisted', 'selected'].includes(app.status)) {
      throw ApiError.badRequest('Interviews can only be scheduled for shortlisted or selected applicants.');
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Challenge 158: Conflict detection across student drives & interviews
    const conflicts = await detectStudentScheduleConflicts(app.studentId, start, end);
    if (conflicts.length > 0 && !overrideConflict) {
      throw ApiError.conflict('Student has an existing schedule conflict.');
    }

    const interview = await scheduleInterview({
      studentId: app.studentId,
      interviewerId,
      type: type || 'technical',
      startTime: start,
      endTime: end,
      meetingLink,
      rubricId,
      actorId: req.user!.id,
      overrideConflict: Boolean(overrideConflict),
    });

    // Link interview directly to recruitment application (Challenge 154)
    const linked = await prisma.mockInterview.update({
      where: { id: interview.id },
      data: { applicationId },
    });

    res.status(201).json({ success: true, data: linked });
  } catch (err) {
    next(err);
  }
};

/**
 * PO/Admin: Pending applications aging report (Challenge 157)
 */
export const pendingReport = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await getPendingApplicationsReport();
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};
