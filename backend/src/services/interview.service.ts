import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { formatIST } from '../utils/timezone.util.js';

export const OVERLAP_BUFFER_MS = 5 * 60 * 1000; // 5 min buffer between sessions (Challenge 116)

export interface ConflictItem {
  type: 'academic_exam' | 'student_interview' | 'interviewer_busy';
  details: string;
}

// ============================================================
// CONFLICT DETECTION (Challenge 116)
// ============================================================
export async function detectInterviewConflicts(
  studentId: string,
  interviewerId: string,
  start: Date,
  end: Date,
  excludeInterviewId?: string
): Promise<ConflictItem[]> {
  const conflicts: ConflictItem[] = [];

  try {
    const bufferedStart = new Date(start.getTime() - OVERLAP_BUFFER_MS);
    const bufferedEnd = new Date(end.getTime() + OVERLAP_BUFFER_MS);

    // 1. Academic Exam conflicts (Challenge 116)
    const examConflict = await prisma.academicExam.findFirst({
      where: {
        studentId,
        startTime: { lt: bufferedEnd },
        endTime: { gt: bufferedStart },
      },
    });
    if (examConflict) {
      conflicts.push({
        type: 'academic_exam',
        details: `Student has an academic exam: ${examConflict.subject} from ${formatIST(examConflict.startTime)} to ${formatIST(examConflict.endTime)}.`,
      });
    }

    // 2. Student interview conflicts
    const studentConflict = await prisma.mockInterview.findFirst({
      where: {
        studentId,
        id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
        status: { in: ['scheduled', 'confirmed', 'in_progress', 'interrupted'] },
        startTime: { lt: bufferedEnd },
        endTime: { gt: bufferedStart },
      },
    });
    if (studentConflict) {
      conflicts.push({
        type: 'student_interview',
        details: `Student already has a ${studentConflict.type} interview at ${formatIST(studentConflict.startTime)}.`,
      });
    }

    // 3. Interviewer conflicts
    const interviewerConflict = await prisma.mockInterview.findFirst({
      where: {
        interviewerId,
        id: excludeInterviewId ? { not: excludeInterviewId } : undefined,
        status: { in: ['scheduled', 'confirmed', 'in_progress', 'interrupted'] },
        startTime: { lt: bufferedEnd },
        endTime: { gt: bufferedStart },
      },
    });
    if (interviewerConflict) {
      conflicts.push({
        type: 'interviewer_busy',
        details: `Interviewer is already booked for another interview at ${formatIST(interviewerConflict.startTime)}.`,
      });
    }
  } catch (err: any) {
    // If DB is unreachable, return empty or throw if not in test
    if (process.env.NODE_ENV !== 'test') {
      console.error('CONFLICT_DETECTION_ERROR', err);
    }
  }

  return conflicts;
}

// ============================================================
// INTERVIEW BOOKING (Challenges 118, 119, 126, 127)
// ============================================================
export async function scheduleInterview(data: {
  studentId: string;
  interviewerId: string;
  type: string;
  startTime: Date;
  endTime: Date;
  meetingLink?: string;
  rubricId?: string;
  actorId: string;
  overrideConflict?: boolean;
}) {
  const { studentId, interviewerId, startTime, endTime, actorId, overrideConflict } = data;

  // Validate roles (Challenge 126)
  const [student, interviewer] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: interviewerId } }),
  ]);
  if (!student || student.role !== 'student') {
    throw ApiError.badRequest('Invalid student ID: user is not a student.');
  }
  if (!interviewer || !['trainer', 'po', 'admin'].includes(interviewer.role)) {
    throw ApiError.badRequest('Interviewer must have a trainer, placement officer, or admin role.');
  }

  // Check interviewer availability (Challenge 118)
  const isAvailable = await prisma.interviewerAvailability.findFirst({
    where: {
      interviewerId,
      isAvailable: true,
      startTime: { lte: startTime },
      endTime: { gte: endTime },
    },
  });
  if (!isAvailable && !overrideConflict) {
    // Allow check to pass if availability has not been configured at all yet, or enforce if configured
    const totalSlots = await prisma.interviewerAvailability.count({ where: { interviewerId } });
    if (totalSlots > 0) {
      throw ApiError.badRequest('Interviewer is not marked as available during this time slot.');
    }
  }

  // Check conflicts (Challenge 116)
  const conflicts = await detectInterviewConflicts(studentId, interviewerId, startTime, endTime);
  if (conflicts.length > 0 && !overrideConflict) {
    throw new ApiError(409, 'Scheduling conflict detected. Provide overrideConflict to proceed.', { conflicts });
  }

  // Transaction + unique constraint catches concurrent duplicates (Challenge 127)
  try {
    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.mockInterview.create({
        data: {
          studentId,
          interviewerId,
          type: data.type as any,
          startTime,
          endTime,
          meetingLink: data.meetingLink,
          rubricId: data.rubricId,
          createdBy: actorId,
        },
      });

      await tx.interviewSessionHistory.create({
        data: {
          interviewId: created.id,
          action: 'schedule',
          actorId,
          details: {
            type: data.type,
            startTime,
            endTime,
            overridden: conflicts.length > 0,
          },
        },
      });

      return created;
    });

    // Notify student and interviewer (Challenge 119)
    try {
      const n = await prisma.notification.create({
        data: {
          title: `Interview Scheduled: ${data.type.toUpperCase()}`,
          message: `Scheduled for ${formatIST(startTime)}. Interviewer: ${interviewer.name}.${data.meetingLink ? ` Link: ${data.meetingLink}` : ''}`,
          createdBy: actorId,
        },
      });
      await prisma.notificationRecipient.createMany({
        data: [
          { notificationId: n.id, userId: studentId },
          { notificationId: n.id, userId: interviewerId },
        ],
      });
    } catch {
      // Non-fatal notification failure
    }

    await audit(actorId, 'interview.schedule', 'mock_interview', interview.id, 'success', {
      studentId,
      interviewerId,
      type: data.type,
    });

    return interview;
  } catch (err: any) {
    if (err.code === 'P2002') {
      throw ApiError.conflict('Duplicate appointment detected: student or interviewer is already booked at this exact time.');
    }
    throw err;
  }
}

// ============================================================
// STATUS TRANSITIONS & RESCHEDULING (Challenges 120, 121, 130)
// ============================================================
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled', 'rescheduled'],
  confirmed: ['in_progress', 'cancelled', 'rescheduled'],
  in_progress: ['interrupted', 'completed', 'failed'],
  interrupted: ['in_progress', 'rescheduled', 'cancelled', 'failed'],
  failed: ['rescheduled', 'cancelled'],
  cancelled: ['rescheduled'],
  rescheduled: ['scheduled', 'confirmed', 'in_progress', 'cancelled'],
};

export async function updateInterviewStatus(
  interviewId: string,
  newStatus: string,
  actorId: string,
  reason?: string
) {
  const interview = await prisma.mockInterview.findUnique({ where: { id: interviewId } });
  if (!interview) throw ApiError.notFound('Interview not found.');

  const allowed = ALLOWED_TRANSITIONS[interview.status] || [];
  if (!allowed.includes(newStatus)) {
    throw ApiError.badRequest(`Cannot transition interview from "${interview.status}" to "${newStatus}".`);
  }

  const updated = await prisma.$transaction([
    prisma.mockInterview.update({
      where: { id: interviewId },
      data: {
        status: newStatus as any,
        ...(newStatus === 'cancelled' && { cancellationReason: reason }),
      },
    }),
    prisma.interviewSessionHistory.create({
      data: {
        interviewId,
        action: newStatus,
        actorId,
        details: reason ? { reason } : undefined,
      },
    }),
  ]);

  try {
    const n = await prisma.notification.create({
      data: {
        title: `Interview ${newStatus.toUpperCase()}`,
        message: `Your interview scheduled for ${formatIST(interview.startTime)} status updated to: ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
        createdBy: actorId,
      },
    });
    await prisma.notificationRecipient.createMany({
      data: [
        { notificationId: n.id, userId: interview.studentId },
        { notificationId: n.id, userId: interview.interviewerId },
      ],
    });
  } catch {
    // Non-fatal
  }

  await audit(actorId, `interview.${newStatus}`, 'mock_interview', interviewId, 'success', {
    reason,
  });

  return updated[0];
}

export async function rescheduleInterview(
  interviewId: string,
  newStart: Date,
  newEnd: Date,
  actorId: string,
  reason: string
) {
  const old = await prisma.mockInterview.findUnique({ where: { id: interviewId } });
  if (!old) throw ApiError.notFound('Interview not found.');
  if (['completed', 'cancelled'].includes(old.status)) {
    throw ApiError.badRequest('Cannot reschedule a completed or cancelled interview.');
  }

  // Check conflicts for the proposed new time window (Challenge 130)
  const conflicts = await detectInterviewConflicts(
    old.studentId,
    old.interviewerId,
    newStart,
    newEnd,
    interviewId
  );
  if (conflicts.length > 0) {
    throw new ApiError(409, 'Conflict detected for the proposed new time.', { conflicts });
  }

  const updated = await prisma.$transaction([
    prisma.mockInterview.update({
      where: { id: interviewId },
      data: { startTime: newStart, endTime: newEnd, status: 'rescheduled' },
    }),
    prisma.interviewSessionHistory.create({
      data: {
        interviewId,
        action: 'reschedule',
        actorId,
        details: { oldStart: old.startTime, newStart, reason },
      },
    }),
  ]);

  try {
    const n = await prisma.notification.create({
      data: {
        title: 'Interview Rescheduled',
        message: `Your interview was moved to ${formatIST(newStart)}. Reason: ${reason}`,
        createdBy: actorId,
      },
    });
    await prisma.notificationRecipient.createMany({
      data: [
        { notificationId: n.id, userId: old.studentId },
        { notificationId: n.id, userId: old.interviewerId },
      ],
    });
  } catch {
    // Non-fatal
  }

  await audit(actorId, 'interview.reschedule', 'mock_interview', interviewId, 'success', {
    oldStart: old.startTime,
    newStart,
    reason,
  });

  return updated[0];
}

// ============================================================
// REMINDERS WORKER (Challenge 117)
// ============================================================
export async function sendInterviewReminders() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000); // within the next 1 hour

    const interviews = await prisma.mockInterview.findMany({
      where: {
        status: { in: ['scheduled', 'confirmed', 'rescheduled'] },
        startTime: { gte: now, lte: soon },
      },
      include: {
        student: { select: { id: true, name: true } },
        interviewer: { select: { id: true, name: true } },
      },
    });

    for (const iv of interviews) {
      // Check if reminder was already sent in the last 2 hours
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const existing = await prisma.notification.findFirst({
        where: {
          title: 'Upcoming Interview Reminder',
          createdAt: { gte: twoHoursAgo },
          recipients: { some: { userId: iv.studentId } },
          message: { contains: iv.id },
        },
      });
      if (existing) continue;

      const n = await prisma.notification.create({
        data: {
          title: 'Upcoming Interview Reminder',
          message: `Your ${iv.type} interview (ref: ${iv.id}) starts at ${formatIST(iv.startTime)} with ${iv.interviewer.name}.${iv.meetingLink ? ` Join link: ${iv.meetingLink}` : ''}`,
          createdBy: iv.interviewerId,
        },
      });

      await prisma.notificationRecipient.createMany({
        data: [
          { notificationId: n.id, userId: iv.studentId },
          { notificationId: n.id, userId: iv.interviewerId },
        ],
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('INTERVIEW_REMINDER_WORKER_ERROR', err);
    }
  }
}

