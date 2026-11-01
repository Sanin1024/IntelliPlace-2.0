import { prisma } from '../config/prisma.js';

export interface AnswerEvaluation {
  isCorrect: boolean | null;
  marksAwarded: number;
  maxMarks: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * CENTRALIZED SCORING ENGINE (Challenge 94) — the ONLY place marks are computed.
 * Question types: single-select MCQ, multiple-select (partial or all-or-nothing),
 * unanswered. Negative marking is per-test. Deterministic + idempotent:
 * identical inputs always yield identical marks.
 */
export function evaluateAnswer(input: {
  isMultiSelect: boolean;
  correctOption?: string | null;   // single-select
  correctOptions?: string[];       // multi-select
  selectedOption?: string | null;
  selectedOptions?: string[];
  maxMarks: number;
  negativeMarks: number;
  partialPolicy: 'all_or_nothing' | 'proportional';
}): AnswerEvaluation {
  const { isMultiSelect, maxMarks, negativeMarks } = input;

  // Unanswered → 0, never negative (Ch 94: "correctly handle unanswered")
  if (isMultiSelect) {
    const selected = new Set((input.selectedOptions || []).filter(Boolean));
    const correct = new Set(input.correctOptions || []);
    if (selected.size === 0) return { isCorrect: null, marksAwarded: 0, maxMarks };
    if (selected.size === correct.size && [...selected].every((s) => correct.has(s))) {
      return { isCorrect: true, marksAwarded: maxMarks, maxMarks };
    }
    const hasWrong = [...selected].some((s) => !correct.has(s));
    if (hasWrong) {
      return { isCorrect: false, marksAwarded: negativeMarks > 0 ? -negativeMarks : 0, maxMarks };
    }
    // Subset, no wrong → partial if configured
    if (input.partialPolicy === 'proportional' && correct.size > 0) {
      return { isCorrect: false, marksAwarded: round2(maxMarks * (selected.size / correct.size)), maxMarks };
    }
    return { isCorrect: false, marksAwarded: 0, maxMarks };
  }

  // Single-select
  if (!input.selectedOption) return { isCorrect: null, marksAwarded: 0, maxMarks };
  const correct = input.selectedOption === input.correctOption;
  return {
    isCorrect: correct,
    marksAwarded: correct ? maxMarks : (negativeMarks > 0 ? -negativeMarks : 0),
    maxMarks,
  };
}

/**
 * Recompute an attempt's score from its stored answers (Ch 93/100).
 * Fully idempotent — safe to run any number of times.
 */
export async function recomputeAttempt(attemptId: string, opts: { force?: boolean } = {}) {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM test_attempts WHERE id = ${attemptId} FOR UPDATE`;
    if (locked.length === 0) throw new Error('Attempt not found');

    const attempt = await tx.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: { include: { questions: true } },
        answers: { include: { question: true } },
      },
    });
    if (!attempt) throw new Error('Attempt not found');
    if (!attempt.test) {
      // Practice attempt: score = correct count (existing behavior preserved)
      const correct = attempt.answers.filter((a) => a.isCorrect).length;
      await tx.testAttempt.update({
        where: { id: attemptId },
        data: { score: correct, totalMarks: attempt.answers.length, evaluationStatus: 'evaluated', processedAt: new Date() },
      });
      return { score: correct, totalMarks: attempt.answers.length };
    }

    const marksByQuestion = new Map(
      attempt.test.questions.map((q) => [q.questionId, q.marks])
    );
    const negative = attempt.test.negativeMarks || 0;

    let totalScore = 0;
    let totalMax = 0;
    for (const q of attempt.test.questions) totalMax += q.marks;

    for (const answer of attempt.answers) {
      const maxMarks = marksByQuestion.get(answer.questionId) ?? 1;
      const evaluation = evaluateAnswer({
        isMultiSelect: answer.question.isMultiSelect,
        correctOption: answer.question.correctOption,
        correctOptions: answer.question.correctOptions,
        selectedOption: answer.selectedOption,
        selectedOptions: answer.selectedOptions,
        maxMarks, negativeMarks: negative,
        partialPolicy: 'proportional',
      });
      totalScore += evaluation.marksAwarded;
      await tx.studentAnswer.update({
        where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
        data: { isCorrect: evaluation.isCorrect, marksAwarded: evaluation.marksAwarded },
      });
    }

    const updated = await tx.testAttempt.update({
      where: { id: attemptId },
      data: {
        score: round2(totalScore),
        totalMarks: totalMax,
        evaluationStatus: 'evaluated',
        processedAt: new Date(),
        ...(attempt.status === 'in_progress' && { status: 'submitted', endTime: new Date() }),
      },
    });
    return { score: updated.score, totalMarks: updated.totalMarks };
  });
}

