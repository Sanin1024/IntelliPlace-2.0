import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from './audit.service.js';
import { snapshotReadiness } from './readiness.service.js';

export interface RubricCriterion {
  key: string;
  label: string;
  maxScore: number;
  studentVisible?: boolean;
}

// ============================================================
// RUBRIC MANAGEMENT (Challenge 123)
// ============================================================
export async function createRubric(name: string, criteria: RubricCriterion[], actorId: string) {
  const lastVersion = await prisma.interviewRubric.findFirst({
    where: { name },
    orderBy: { version: 'desc' },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const rubric = await prisma.interviewRubric.create({
    data: {
      name,
      version: nextVersion,
      criteria: criteria as any,
      isActive: true,
      createdBy: actorId,
    },
  });

  await audit(actorId, 'rubric.create', 'interview_rubric', rubric.id, 'success', {
    name,
    version: nextVersion,
  });

  return rubric;
}

// ============================================================
// FEEDBACK SUBMISSION & PRIVACY (Challenges 122, 123, 124, 128, 129)
// ============================================================
export async function submitFeedback(
  interviewId: string,
  data: {
    scores: Record<string, number>;
    studentComments: string;
    confidentialNotes?: string;
    isFinalized: boolean;
  },
  evaluatorId: string
) {
  const interview = await prisma.mockInterview.findUnique({
    where: { id: interviewId },
    include: { rubric: true, feedback: true },
  });

  if (!interview) {
    throw ApiError.notFound('Interview not found.');
  }

  const evaluator = await prisma.user.findUnique({ where: { id: evaluatorId } });
  const isAdmin = evaluator?.role === 'admin';
  if (interview.interviewerId !== evaluatorId && !isAdmin) {
    throw ApiError.forbidden('Only the assigned interviewer or an administrator can submit feedback.');
  }

  if (interview.feedback?.isFinalized) {
    throw ApiError.badRequest('Feedback for this interview is already finalized and cannot be modified.');
  }

  // Validate scores against rubric criteria (Challenge 123)
  if (interview.rubric && Array.isArray(interview.rubric.criteria)) {
    const rubricCriteria = interview.rubric.criteria as any[];
    for (const rc of rubricCriteria) {
      const score = data.scores[rc.key];
      if (score == null || typeof score !== 'number' || score < 0 || score > rc.maxScore) {
        throw ApiError.badRequest(
          `Invalid score for "${rc.label || rc.key}". Must be a number between 0 and ${rc.maxScore}.`
        );
      }
    }
  }

  const feedback = await prisma.interviewFeedback.upsert({
    where: { interviewId },
    update: {
      scores: data.scores as any,
      studentComments: data.studentComments,
      confidentialNotes: data.confidentialNotes,
      isFinalized: data.isFinalized,
      evaluatedBy: evaluatorId,
    },
    create: {
      interviewId,
      scores: data.scores as any,
      studentComments: data.studentComments,
      confidentialNotes: data.confidentialNotes,
      isFinalized: data.isFinalized,
      evaluatedBy: evaluatorId,
    },
  });

  // If finalized, update interview status to completed and trigger readiness update (Challenge 129)
  if (data.isFinalized) {
    if (interview.status !== 'completed') {
      await prisma.mockInterview.update({
        where: { id: interviewId },
        data: { status: 'completed' },
      });

      await prisma.interviewSessionHistory.create({
        data: {
          interviewId,
          action: 'complete',
          actorId: evaluatorId,
          details: { finalized: true },
        },
      });
    }

    // Trigger Readiness v3 snapshot (Challenge 129)
    await snapshotReadiness(interview.studentId).catch(() => {});
  }

  await audit(evaluatorId, 'interview.feedback_submit', 'interview_feedback', feedback.id, 'success', {
    finalized: data.isFinalized,
    interviewId,
  });

  return feedback;
}

/**
 * Returns interview feedback with strict RBAC privacy enforced (Challenges 124, 128).
 * Students never see confidentialNotes, and only see studentVisible criteria.
 */
export async function getFeedbackForUser(interviewId: string, userId: string, role: string) {
  const interview = await prisma.mockInterview.findUnique({
    where: { id: interviewId },
    include: { feedback: true, rubric: true },
  });

  if (!interview) {
    throw ApiError.notFound('Interview not found.');
  }

  if (!interview.feedback) {
    throw ApiError.notFound('No feedback has been recorded for this interview yet.');
  }

  // RBAC Checks
  if (role === 'student') {
    if (interview.studentId !== userId) {
      throw ApiError.forbidden('Forbidden: You can only view feedback for your own interviews.');
    }
    if (!interview.feedback.isFinalized) {
      throw ApiError.forbidden('Interview feedback is still in draft state and has not been finalized by the interviewer.');
    }

    // Student view: confidentialNotes are completely stripped (Challenge 124, 128)
    const rawScores = (interview.feedback.scores as Record<string, number>) || {};
    const visibleScores: Record<string, number> = {};

    if (interview.rubric && Array.isArray(interview.rubric.criteria)) {
      const criteriaList = interview.rubric.criteria as any[];
      for (const rc of criteriaList) {
        if (rc.studentVisible !== false && rawScores[rc.key] != null) {
          visibleScores[rc.key] = rawScores[rc.key];
        }
      }
    } else {
      // Default: expose non-internal scores
      for (const [k, v] of Object.entries(rawScores)) {
        if (!k.toLowerCase().includes('internal') && !k.toLowerCase().includes('confidential')) {
          visibleScores[k] = v;
        }
      }
    }

    return {
      id: interview.feedback.id,
      interviewId: interview.feedback.interviewId,
      scores: visibleScores,
      studentComments: interview.feedback.studentComments,
      confidentialNotes: undefined, // Redacted
      isFinalized: interview.feedback.isFinalized,
      evaluatedAt: interview.feedback.evaluatedAt,
    };
  }

  // Trainer view: can only view own assigned interview feedback
  if (role === 'trainer' && interview.interviewerId !== userId) {
    throw ApiError.forbidden('Forbidden: You are not the assigned interviewer for this interview.');
  }

  // Interviewer, PO, and Admin get full feedback
  return interview.feedback;
}

// ============================================================
// GROWTH ANALYTICS (Challenge 125)
// ============================================================
export async function getInterviewGrowth(studentId: string) {
  const interviews = await prisma.mockInterview.findMany({
    where: {
      studentId,
      status: 'completed',
      feedback: { isFinalized: true },
    },
    include: { feedback: true, rubric: true },
    orderBy: { startTime: 'asc' },
  });

  if (interviews.length === 0) {
    return {
      history: [],
      trends: {},
      summary: { totalInterviews: 0, averagePercentage: 0 },
    };
  }

  const history = interviews.map((iv) => {
    const scores = (iv.feedback!.scores as Record<string, number>) || {};
    const values = Object.values(scores);
    const total = values.reduce((a, b) => a + b, 0);

    // Calculate max score based on rubric or defaults
    let max = values.length * 10;
    if (iv.rubric && Array.isArray(iv.rubric.criteria)) {
      max = (iv.rubric.criteria as any[]).reduce((sum, c) => sum + (c.maxScore || 10), 0);
    }

    const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

    return {
      interviewId: iv.id,
      date: iv.startTime,
      type: iv.type,
      percentage,
      scores,
    };
  });

  // Calculate trends comparing first vs latest interview
  const trends: Record<string, 'improving' | 'declining' | 'stable'> = {};
  if (history.length >= 2) {
    const firstScores = history[0].scores;
    const lastScores = history[history.length - 1].scores;

    for (const key of Object.keys(lastScores)) {
      if (firstScores[key] != null) {
        const delta = lastScores[key] - firstScores[key];
        trends[key] = delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable';
      }
    }
  } else if (history.length === 1) {
    for (const key of Object.keys(history[0].scores)) {
      trends[key] = 'stable';
    }
  }

  const avgPct = Math.round(
    history.reduce((sum, item) => sum + item.percentage, 0) / history.length
  );

  return {
    history,
    trends,
    summary: {
      totalInterviews: history.length,
      averagePercentage: avgPct,
    },
  };
}

