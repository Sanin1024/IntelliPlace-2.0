import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  scheduleInterview,
  updateInterviewStatus,
  rescheduleInterview,
  detectInterviewConflicts,
} from '../services/interview.service.js';
import {
  createRubric,
  submitFeedback,
  getFeedbackForUser,
  getInterviewGrowth,
} from '../services/interviewEvaluation.service.js';

// ============================================================
// SCHEDULING (Challenges 116, 118, 119, 126, 127, 130)
// ============================================================

export const createInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      studentId,
      interviewerId,
      type,
      startTime,
      endTime,
      meetingLink,
      rubricId,
      overrideConflict,
    } = req.body;

    const interview = await scheduleInterview({
      studentId,
      interviewerId,
      type,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      meetingLink,
      rubricId,
      actorId: req.user!.id,
      overrideConflict,
    });

    res.status(201).json({ success: true, data: interview });
  } catch (err) {
    next(err);
  }
};

export const changeStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { status, reason } = req.body;

    const updated = await updateInterviewStatus(id, status, req.user!.id, reason);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const reschedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { newStartTime, newEndTime, reason } = req.body;

    const updated = await rescheduleInterview(
      id,
      new Date(newStartTime),
      new Date(newEndTime),
      req.user!.id,
      reason
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const checkConflicts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, interviewerId, startTime, endTime, excludeInterviewId } = req.query as {
      studentId: string;
      interviewerId: string;
      startTime: string;
      endTime: string;
      excludeInterviewId?: string;
    };

    if (!studentId || !interviewerId || !startTime || !endTime) {
      throw ApiError.badRequest('studentId, interviewerId, startTime, and endTime are required.');
    }

    const conflicts = await detectInterviewConflicts(
      studentId,
      interviewerId,
      new Date(startTime),
      new Date(endTime),
      excludeInterviewId
    );

    res.json({ success: true, data: { conflicts, hasConflict: conflicts.length > 0 } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// AVAILABILITY & EXAMS (Challenges 116, 118)
// ============================================================

export const setAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slots } = req.body; // [{ startTime, endTime }]
    const created = await prisma.interviewerAvailability.createMany({
      data: slots.map((s: any) => ({
        interviewerId: req.user!.id,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        isAvailable: true,
      })),
    });

    res.status(201).json({ success: true, data: { count: created.count } });
  } catch (err) {
    next(err);
  }
};

export const getMyAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await prisma.interviewerAvailability.findMany({
      where: { interviewerId: req.user!.id },
      orderBy: { startTime: 'asc' },
    });
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

export const addAcademicExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, startTime, endTime } = req.body;
    const exam = await prisma.academicExam.create({
      data: {
        studentId: req.user!.id,
        subject,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

export const getMyAcademicExams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const exams = await prisma.academicExam.findMany({
      where: { studentId: req.user!.id },
      orderBy: { startTime: 'asc' },
    });
    res.json({ success: true, data: exams });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// RUBRICS & FEEDBACK (Challenges 122, 123, 124, 128)
// ============================================================

export const createRubricController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, criteria } = req.body;
    const rubric = await createRubric(name, criteria, req.user!.id);
    res.status(201).json({ success: true, data: rubric });
  } catch (err) {
    next(err);
  }
};

export const listRubrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rubrics = await prisma.interviewRubric.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: rubrics });
  } catch (err) {
    next(err);
  }
};

export const submitFeedbackController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const feedback = await submitFeedback(id, req.body, req.user!.id);
    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

export const getFeedbackController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const feedback = await getFeedbackForUser(id, req.user!.id, req.user!.role);
    res.json({ success: true, data: feedback });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// SCHEDULE & ANALYTICS (Challenges 119, 125, 128)
// ============================================================

export const mySchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role;
    const userId = req.user!.id;

    let whereClause: any = {};
    if (userRole === 'student') {
      whereClause.studentId = userId;
    } else if (userRole === 'trainer') {
      whereClause.interviewerId = userId;
    } else if (req.query['studentId']) {
      whereClause.studentId = req.query['studentId'] as string;
    }

    if (req.query['status']) {
      whereClause.status = req.query['status'] as string;
    }

    const interviews = await prisma.mockInterview.findMany({
      where: whereClause,
      include: {
        student: { select: { id: true, name: true, email: true } },
        interviewer: { select: { id: true, name: true, email: true } },
        rubric: true,
        feedback: {
          select: {
            id: true,
            isFinalized: true,
            evaluatedAt: true,
            studentComments: true,
            // Only expose scores/notes to non-students or redacted below
            ...(userRole !== 'student' && { confidentialNotes: true, scores: true }),
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ success: true, data: interviews });
  } catch (err) {
    next(err);
  }
};

export const myGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetStudentId =
      req.user!.role === 'student'
        ? req.user!.id
        : (req.query['studentId'] as string) || req.user!.id;

    const growth = await getInterviewGrowth(targetStudentId);
    res.json({ success: true, data: growth });
  } catch (err) {
    next(err);
  }
};

