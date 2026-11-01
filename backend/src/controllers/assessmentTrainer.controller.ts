import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { executeSubmission, validateTestCases, codingMarks } from '../services/codeExecutor.service.js';
import { recomputeAttempt } from '../services/scoring.service.js';

// ---- Duplicate check (Ch 96) ----
export const checkDuplicateQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { testId, questionIds } = req.body;
    const existing = testId
      ? await prisma.mockTestQuestion.findMany({ where: { testId }, select: { questionId: true } })
      : [];
    const existingSet = new Set(existing.map((e) => e.questionId));
    const ids = Array.isArray(questionIds) ? questionIds : [];
    const dups = ids.filter((id: string, i: number) => ids.indexOf(id) !== i || existingSet.has(id));
    res.json({ success: true, data: { duplicates: [...new Set(dups)], duplicateFound: dups.length > 0 } });
  } catch (err) { next(err); }
};

// ---- Balanced generation preview (Ch 97) ----
export const generateQuestionSet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rules } = req.body; // [{topicId, difficulty, count}]
    const candidates: any[] = [];
    const warnings: string[] = [];
    let totalMarks = 0;

    for (const rule of (rules || [])) {
      const pool = await prisma.aptitudeQuestion.findMany({
        where: { topicId: rule.topicId, difficulty: rule.difficulty },
        select: { id: true, questionText: true },
      });
      if (pool.length < rule.count) {
        warnings.push(`Insufficient ${rule.difficulty} questions for topic ${rule.topicId}: need ${rule.count}, bank has ${pool.length}`);
      }
      const sampled = pool.sort(() => Math.random() - 0.5).slice(0, rule.count);
      candidates.push(...sampled);
      totalMarks += rule.count; // 1 mark default per question unless overridden
    }

    res.json({
      success: true,
      data: {
        questionIds: candidates.map((c) => c.id),
        count: candidates.length,
        totalMarks,
        distribution: (rules || []).map((r: any) => ({ ...r, available: true })),
        warnings,
        canCreate: warnings.length === 0 && candidates.length > 0,
      },
    });
  } catch (err) { next(err); }
};

// ---- Test-case validation (Ch 89) ----
export const validateProblemTestCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { referenceCode, language } = req.body;
    const report = await validateTestCases(id, referenceCode, language || 'python');
    await audit(req.user!.id, 'problem.testcase_validation', 'coding_problem', id, 'success', {
      casesValidated: report.length,
    });
    res.json({ success: true, data: report });
  } catch (err: any) { next(ApiError.badRequest(err.message)); }
};

// ---- Programming submission (Ch 88, 94) ----
export const submitCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const problemId = req.params['id'] as string;
    const { code, language } = req.body;
    const studentId = req.user!.id;

    const execution = await executeSubmission(problemId, code, language || 'python');
    const problem = await prisma.codingProblem.findUnique({ where: { id: problemId } });

    const submission = await prisma.codingSubmission.create({
      data: {
        problemId,
        studentId,
        code,
        language: language || 'python',
        passedTestCases: execution.passed,
        totalTestCases: execution.total,
        isPassed: execution.passed === execution.total && execution.total > 0,
      },
    });

    // Student-safe result: per-case pass/fail + error types, NEVER expected outputs (Ch 90)
    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        passed: execution.passed,
        total: execution.total,
        isPassed: submission.isPassed,
        marks: codingMarks(execution, 100, problem?.partialMarks || false), // marks scale set by module context
        errorType: execution.errorType,
        results: execution.results.map((r) => ({
          index: r.index,
          passed: r.passed,
          errorType: r.errorType,
          stderr: r.stderr,
          durationMs: r.durationMs,
        })),
        metadata: execution.metadata,
      },
    });
  } catch (err: any) { next(ApiError.badRequest(err.message)); }
};

// ---- Activity review (Ch 91) ----
export const getAttemptActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params['id'] as string;
    const logs = await prisma.attemptActivityLog.findMany({
      where: { attempt: { testId } },
      include: {
        student: { select: { name: true, email: true } },
        attempt: { select: { id: true, status: true, score: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const byStudent = new Map<string, any>();
    for (const l of logs) {
      const e = byStudent.get(l.studentId) || {
        studentId: l.studentId,
        name: l.student.name,
        email: l.student.email,
        tabSwitches: 0,
        focusLoss: 0,
        warnings: 0,
        events: [],
      };
      if (l.eventType === 'tab_switch' || l.eventType === 'window_blur') e.tabSwitches++;
      if (l.eventType === 'focus_loss') e.focusLoss++;
      if (l.eventType === 'warning_shown') e.warnings++;
      e.events.push({ type: l.eventType, at: l.createdAt });
      byStudent.set(l.studentId, e);
    }
    res.json({
      success: true,
      data: {
        students: [...byStudent.values()],
        note: 'Activity is evidence for human review — not proof of cheating.',
      },
    });
  } catch (err) { next(err); }
};

// ---- Question versioning + post-publication edits (Ch 99) ----
export const updateQuestionVersioned = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { changeReason, ...updates } = req.body;
    if (!changeReason || changeReason.trim().length < 10) {
      throw ApiError.badRequest('A change reason of at least 10 characters is required');
    }

    const question = await prisma.aptitudeQuestion.findUnique({
      where: { id },
      include: { mockTests: { include: { test: true } } },
    });
    if (!question) throw ApiError.notFound('Question not found');

    const usedInActive = question.mockTests.filter((mt) =>
      ['published', 'in_progress'].includes(mt.test.status)
    );
    if (usedInActive.length > 0) {
      const hasLiveAttempts = await prisma.testAttempt.count({
        where: { testId: { in: usedInActive.map((u) => u.testId) }, status: 'in_progress' },
      });
      if (hasLiveAttempts > 0) {
        throw ApiError.badRequest(
          `${hasLiveAttempts} student(s) are currently attempting assessments containing this question. Wait for active attempts to finish before editing.`
        );
      }
    }

    // Archive snapshot (previous version preserved — Ch 99)
    const lastVersion = await prisma.questionVersion.findFirst({
      where: { questionId: id },
      orderBy: { version: 'desc' },
    });
    await prisma.questionVersion.create({
      data: {
        questionId: id,
        version: (lastVersion?.version ?? 0) + 1,
        snapshot: {
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          correctOptions: question.correctOptions,
          isMultiSelect: question.isMultiSelect,
          difficulty: question.difficulty,
          explanation: question.explanation,
        } as any,
        changeReason,
        archivedBy: req.user!.id,
      },
    });

    const updated = await prisma.aptitudeQuestion.update({ where: { id }, data: updates });

    // Notify affected students + flag re-evaluation need when evaluation rules changed
    const evaluationChanged = updates.correctOption !== undefined || updates.correctOptions !== undefined;
    if (evaluationChanged && usedInActive.length > 0) {
      const attempts = await prisma.testAttempt.findMany({
        where: { testId: { in: usedInActive.map((u) => u.testId) }, status: 'submitted' },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      if (attempts.length) {
        const n = await prisma.notification.create({
          data: {
            title: 'Assessment Question Corrected',
            message: 'A question in one of your submitted assessments was corrected. Your result may be re-evaluated; check your results page.',
            createdBy: req.user!.id,
          },
        });
        await prisma.notificationRecipient.createMany({
          data: attempts.map((a) => ({ notificationId: n.id, userId: a.studentId })),
        });
      }
    }

    await audit(req.user!.id, 'question.versioned_update', 'aptitude_question', id, 'success', {
      changeReason,
      evaluationChanged,
      affectedTests: usedInActive.length,
    });

    res.json({
      success: true,
      data: { question: updated, evaluationChanged, reevaluationRequired: evaluationChanged },
    });
  } catch (err) { next(err); }
};

export const recalculateTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testId = req.params['id'] as string;
    const attempts = await prisma.testAttempt.findMany({
      where: { testId, status: 'submitted' },
      select: { id: true },
    });
    const results = [];
    for (const a of attempts) {
      try {
        results.push({ attemptId: a.id, ...(await recomputeAttempt(a.id, { force: true })) });
      } catch (e: any) {
        results.push({ attemptId: a.id, error: e.message });
      }
    }
    await audit(req.user!.id, 'assessment.recalculate_results', 'mock_test', testId, 'success', {
      attempts: attempts.length,
    });
    res.json({ success: true, data: { recalculated: results.length, results } });
  } catch (err) { next(err); }
};

// ---- Publish results (Ch 92 manual mode) ----
export const publishResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    await prisma.mockTest.update({ where: { id }, data: { resultsPublishedAt: new Date() } });
    await audit(req.user!.id, 'assessment.results_published', 'mock_test', id, 'success');
    res.json({ success: true, data: { message: 'Results published to students' } });
  } catch (err) { next(err); }
};

// ---- Sync monitor + reconcile (Ch 100) ----
export const getSyncStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await prisma.testAttempt.findMany({
      where: { status: 'submitted' },
      include: {
        test: { select: { title: true } },
        student: { select: { name: true } },
        answers: true,
      },
      orderBy: { endTime: 'desc' },
      take: 200,
    });
    const inconsistent = attempts
      .filter((a) => a.evaluationStatus !== 'evaluated')
      .map((a) => ({
        attemptId: a.id,
        test: a.test?.title,
        student: a.student.name,
        evaluationStatus: a.evaluationStatus,
        score: a.score,
        answers: a.answers.length,
      }));
    res.json({
      success: true,
      data: {
        totalSubmitted: attempts.length,
        pendingOrFailed: inconsistent.length,
        inconsistent,
        note: 'Student dashboards compute analytics from student_answers on read — always synchronized by construction. This monitor flags attempts whose stored aggregate needs reconciliation.',
      },
    });
  } catch (err) { next(err); }
};

export const reconcileAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attemptId = req.params['attemptId'] as string;
    const result = await recomputeAttempt(attemptId, { force: true });
    res.json({ success: true, data: result });
  } catch (err: any) { next(ApiError.badRequest(err.message)); }
};

// ---- Lazy lifecycle sync (Ch 99) — call from test listing ----
export const syncTestStatuses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.mockTest.updateMany({
      where: { status: 'in_progress', availableUntil: { lt: new Date() } },
      data: { status: 'completed' },
    });
    next();
  } catch (err) { next(err); }
};

