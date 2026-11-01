import { prisma } from '../config/prisma.js';
import { audit } from './audit.service.js';

const MISSED_AFTER_HOURS = 48;
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * Status state machine (Ch 51): scheduled → overdue (time passed) → missed
 * (48h past). rescheduled shares the overdue transition. Never touches
 * completed/cancelled.
 */
export async function syncAssignmentStatuses(): Promise<void> {
  const now = new Date();
  const missedCutoff = new Date(now.getTime() - MISSED_AFTER_HOURS * 3600000);

  // Transition scheduled/rescheduled past due to overdue
  const overdueSessions = await prisma.trainingSession.findMany({
    where: { scheduledAt: { lt: now }, cancelledAt: null },
    select: { id: true },
  });
  const overdueSessionIds = overdueSessions.map((s) => s.id);

  if (overdueSessionIds.length > 0) {
    await prisma.trainingAssignment.updateMany({
      where: {
        sessionId: { in: overdueSessionIds },
        status: { in: ['scheduled', 'rescheduled'] },
      },
      data: { status: 'overdue' },
    });
  }

  // Transition overdue past 48h to missed
  const missedSessions = await prisma.trainingSession.findMany({
    where: { scheduledAt: { lt: missedCutoff } },
    select: { id: true },
  });
  const missedSessionIds = missedSessions.map((s) => s.id);

  if (missedSessionIds.length > 0) {
    await prisma.trainingAssignment.updateMany({
      where: {
        sessionId: { in: missedSessionIds },
        status: 'overdue',
      },
      data: { status: 'missed' },
    });
  }
}

export async function getStudentSchedule(studentId: string) {
  await syncAssignmentStatuses();
  const assignments = await prisma.trainingAssignment.findMany({
    where: { studentId, session: { cancelledAt: null } },
    include: {
      session: {
        include: {
          topic: { select: { name: true } },
          module: { select: { id: true, title: true, level: true } },
        },
      },
    },
    orderBy: { session: { scheduledAt: 'asc' } },
  });

  const completed = assignments.filter((a) => a.status === 'completed').length;
  const overdue = assignments.filter((a) => a.status === 'overdue').length;
  const missed = assignments.filter((a) => a.status === 'missed').length;
  const open = completed + overdue + missed;

  return {
    assignments,
    stats: {
      total: assignments.length,
      completed,
      overdue,
      missed,
      upcoming: assignments.filter((a) => ['scheduled', 'rescheduled'].includes(a.status)).length,
      // Adherence = completed / (completed + overdue + missed) — scheduled-but-future excluded (Ch 51)
      adherence: open > 0 ? Math.round((completed / open) * 100) : null,
    },
  };
}

export async function getFallingBehind(threshold = 2) {
  await syncAssignmentStatuses();
  const grouped = await prisma.trainingAssignment.groupBy({
    by: ['studentId'],
    where: { status: { in: ['overdue', 'missed'] }, session: { cancelledAt: null } },
    _count: { _all: true },
  });
  const behind = grouped.filter((g) => g._count._all >= threshold);
  return Promise.all(
    behind.map(async (g) => {
      const student = await prisma.user.findUnique({
        where: { id: g.studentId },
        include: { studentProfile: { include: { branch: true, batch: true } } },
      });
      return {
        studentId: g.studentId,
        name: student?.name,
        email: student?.email,
        branch: student?.studentProfile?.branch?.name,
        batch: student?.studentProfile?.batch?.name,
        overdueOrMissed: g._count._all,
      };
    })
  );
}

export async function rescheduleSession(
  sessionId: string,
  newScheduledAt: Date,
  reason: string,
  actorId: string
) {
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: { assignments: { include: { student: { select: { id: true } } } } },
  });
  if (!session) throw new Error('Session not found');
  if (session.cancelledAt) throw new Error('Cannot reschedule a cancelled session');

  await prisma.$transaction([
    prisma.trainingSession.update({ where: { id: sessionId }, data: { scheduledAt: newScheduledAt } }),
    prisma.trainingAssignment.updateMany({
      where: { sessionId, status: { in: ['scheduled', 'overdue', 'missed', 'rescheduled'] } },
      data: { status: 'rescheduled', lastRemindedAt: null }, // reset so reminders fire for the new time
    }),
  ]);

  // Notify assigned students (Ch 51)
  if (session.assignments.length > 0) {
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    const n = await prisma.notification.create({
      data: {
        title: `Training Rescheduled: ${session.title}`,
        message: `Moved to ${newScheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Reason: ${reason}`,
        createdBy: actorId || adminUser?.id || session.createdBy,
      },
    });
    const recipients = session.assignments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
      .map((a) => ({ notificationId: n.id, userId: a.studentId }));

    if (recipients.length > 0) {
      await prisma.notificationRecipient.createMany({
        data: recipients,
      });
    }
  }

  await audit(actorId, 'training.reschedule', 'training_session', sessionId, 'success', {
    newScheduledAt,
    reason,
  });
}

/**
 * Reminder pass (Ch 59): upcoming (≤24h) + overdue. Deduped by
 * lastRemindedAt cooldown; skips completed/cancelled/rescheduled-future;
 * respects the trainingReminders preference (critical overdue ignores pref).
 */
export async function sendTrainingReminders() {
  await syncAssignmentStatuses();
  const now = Date.now();

  const upcoming = await prisma.trainingAssignment.findMany({
    where: {
      status: 'scheduled',
      session: { cancelledAt: null, scheduledAt: { gte: new Date(), lte: new Date(now + 24 * 3600000) } },
      OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: new Date(now - REMINDER_COOLDOWN_MS) } }],
    },
    include: { session: { select: { title: true, scheduledAt: true, location: true, meetingLink: true } } },
  });

  const overdue = await prisma.trainingAssignment.findMany({
    where: {
      status: 'overdue',
      session: { cancelledAt: null },
      OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lt: new Date(now - REMINDER_COOLDOWN_MS) } }],
    },
    include: { session: { select: { title: true, scheduledAt: true, location: true, meetingLink: true } } },
  });

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) return { sent: 0 };

  let sent = 0;
  for (const a of [...upcoming, ...overdue]) {
    const isOverdue = a.status === 'overdue';
    // Preference check (non-critical only)
    if (!isOverdue) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: a.studentId },
        select: { notificationPrefs: true },
      });
      if ((profile?.notificationPrefs as any)?.trainingReminders === false) continue;
    }

    const n = await prisma.notification.create({
      data: {
        title: isOverdue ? `Overdue Training: ${a.session.title}` : `Upcoming Training: ${a.session.title}`,
        message: isOverdue
          ? `Your training activity "${a.session.title}" is overdue. Complete it or contact your trainer.`
          : `"${a.session.title}" starts ${a.session.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${a.session.location ? ` at ${a.session.location}` : ''}.`,
        createdBy: admin.id,
      },
    });
    await prisma.notificationRecipient.createMany({ data: [{ notificationId: n.id, userId: a.studentId }] });
    await prisma.trainingAssignment.update({ where: { id: a.id }, data: { lastRemindedAt: new Date() } });
    sent++;
  }
  return { sent };
}
