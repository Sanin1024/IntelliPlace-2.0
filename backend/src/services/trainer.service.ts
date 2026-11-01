// Challenge 176–179, 181, 185: Trainer Service (Assignments, Conflicts, Performance, Interventions, Evaluations)
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';

// ============================================================
// ASSIGNMENT & CONFLICTS (Challenges 176, 177, 179)
// ============================================================

export async function assignTrainerToBatch(data: {
  trainerId: string;
  batchId: number;
  role?: string;
  actorId: string;
}) {
  const { trainerId, batchId, actorId, role = 'primary' } = data;

  const trainer = await prisma.user.findUnique({ where: { id: trainerId } });
  if (!trainer || trainer.role !== 'trainer') {
    throw ApiError.badRequest('Invalid trainer ID or user is not a trainer.');
  }

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw ApiError.notFound('Batch not found.');
  }

  // Check existing assignment
  const existing = await prisma.trainerBatchAssignment.findUnique({
    where: {
      trainerId_batchId: {
        trainerId,
        batchId,
      },
    },
  });

  if (existing) {
    if (existing.isActive) {
      throw ApiError.conflict('Trainer is already assigned to this batch.');
    }
    // Reactivate
    const updated = await prisma.trainerBatchAssignment.update({
      where: { id: existing.id },
      data: { isActive: true, role: role as any, assignedBy: actorId, assignedAt: new Date() },
    });
    await audit(actorId, 'trainer.assign_batch', 'trainer_batch_assignment', updated.id, 'success', {
      trainerId,
      batchId,
      reactivated: true,
    });
    return updated;
  }

  const assignment = await prisma.trainerBatchAssignment.create({
    data: {
      trainerId,
      batchId,
      role: role as any,
      assignedBy: actorId,
    },
  });

  await audit(actorId, 'trainer.assign_batch', 'trainer_batch_assignment', assignment.id, 'success', {
    trainerId,
    batchId,
  });

  return assignment;
}

export async function detectScheduleConflicts(
  batchId: number,
  trainerId: string,
  startTime: Date,
  endTime: Date
) {
  const conflicts: Array<{ type: string; details: string }> = [];

  try {
    // 1. Academic Timetable Conflict (Challenge 179)
    const dayOfWeek = startTime.getDay(); // 0=Sun, 6=Sat
    const startStr = startTime.toTimeString().slice(0, 5); // HH:mm
    const endStr = endTime.toTimeString().slice(0, 5); // HH:mm

    const timetableConflicts = await prisma.academicTimetable.findMany({
      where: {
        batchId,
        dayOfWeek,
      },
    });

    for (const tt of timetableConflicts) {
      // Overlap: tt.startTime < endStr && tt.endTime > startStr
      if (tt.startTime < endStr && tt.endTime > startStr) {
        conflicts.push({
          type: 'academic_timetable',
          details: `Batch has an academic class: ${tt.subject} (${tt.startTime}-${tt.endTime}).`,
        });
        break;
      }
    }

    // 2. Trainer Overlap (Challenge 177)
    const trainerSessions = await prisma.trainingSession.findMany({
      where: {
        trainers: { some: { trainerId } },
        cancelledAt: null,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        scheduledAt: true,
        durationMins: true,
      },
    });

    for (const s of trainerSessions) {
      const sStart = s.startTime || s.scheduledAt;
      const sEnd = s.endTime || new Date(sStart.getTime() + (s.durationMins || 60) * 60000);
      if (sStart < endTime && sEnd > startTime) {
        conflicts.push({
          type: 'trainer_overlap',
          details: `Trainer is already assigned to another session: ${s.title} at ${sStart.toISOString()}.`,
        });
        break;
      }
    }

    // 3. Batch Overlap
    const batchSessions = await prisma.trainingSession.findMany({
      where: {
        assignments: { some: { student: { studentProfile: { batchId } } } },
        cancelledAt: null,
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        scheduledAt: true,
        durationMins: true,
      },
    });

    for (const s of batchSessions) {
      const sStart = s.startTime || s.scheduledAt;
      const sEnd = s.endTime || new Date(sStart.getTime() + (s.durationMins || 60) * 60000);
      if (sStart < endTime && sEnd > startTime) {
        conflicts.push({
          type: 'batch_overlap',
          details: `Batch has another training session at this time: ${s.title}.`,
        });
        break;
      }
    }
  } catch (err) {
    console.warn('detectScheduleConflicts error (offline mode safe):', (err as Error).message);
  }

  return conflicts;
}

// ============================================================
// STUDENT PERFORMANCE & INTERVENTION (Challenges 178, 185)
// ============================================================

export async function getBatchPerformance(batchId: number) {
  try {
    const students = await prisma.studentProfile.findMany({
      where: { batchId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const performance = [];
    for (const s of students) {
      const attempts = await prisma.testAttempt.findMany({
        where: { studentId: s.userId, status: 'submitted' },
        select: { score: true, totalMarks: true },
      });

      const avgScore =
        attempts.length > 0
          ? Math.round(
              attempts.reduce(
                (acc, a) => acc + ((a.score || 0) / (a.totalMarks || 1)) * 100,
                0
              ) / attempts.length
            )
          : null;

      const completedModules = await prisma.moduleProgress.count({
        where: { studentId: s.userId, status: 'completed' },
      });

      performance.push({
        studentId: s.userId,
        name: s.user.name,
        email: s.user.email,
        avgScore,
        completedModules,
        attendance: 100,
      });
    }

    return performance;
  } catch (err) {
    console.warn('getBatchPerformance error (offline mode safe):', (err as Error).message);
    return [];
  }
}

export async function identifyStrugglingStudents(batchId: number, threshold = 50) {
  const performance = await getBatchPerformance(batchId);
  return performance.filter((p) => p.avgScore !== null && p.avgScore < threshold);
}

// ============================================================
// TRAINER EVALUATION (Challenge 181)
// ============================================================

export async function generateTrainerEvaluation(trainerId: string, period: string) {
  // 1. Avg Student Feedback
  const feedback = await prisma.trainerFeedback.findMany({
    where: { trainerId },
    select: { ratings: true },
  });

  let avgFeedback = 0;
  if (feedback.length > 0) {
    const allScores = feedback.flatMap((f) =>
      typeof f.ratings === 'object' && f.ratings !== null
        ? Object.values(f.ratings as Record<string, number>).filter((v) => typeof v === 'number')
        : []
    );
    avgFeedback =
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : 0;
  }

  // 2. Training Completion Rate
  const sessions = await prisma.trainingSession.count({
    where: { trainers: { some: { trainerId } }, cancelledAt: null },
  });

  const completedSessions = await prisma.trainingSession.count({
    where: {
      trainers: { some: { trainerId } },
      assignments: { some: { status: 'completed' } },
    },
  });

  const completionRate = sessions > 0 ? Math.round((completedSessions / sessions) * 100) : 0;
  const metrics = { avgFeedback, completionRate, totalSessions: sessions };

  return prisma.trainerEvaluation.upsert({
    where: { trainerId_period: { trainerId, period } },
    update: { metrics },
    create: { trainerId, period, metrics },
  });
}

