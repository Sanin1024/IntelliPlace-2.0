import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  getStudentBranchContext,
  branchScopeFilter,
  assertStudentCanAccessContent,
  resolveBranchIdOrThrow,
} from '../middleware/departmentAccess.js';
import {
  codeRunner,
  checkSubmitRateLimit,
  getActiveConcurrency,
  getPeakConcurrency,
} from '../services/codeRunner.js';

type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * POST /api/problems
 * Trainer creates a coding problem with test cases.
 */
export const createProblem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      topicId, difficulty, title, description,
      sampleInput, sampleOutput, tags, testCases, branchId, slug,
    } = req.body;

    // Verify topic exists and is a coding topic
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw ApiError.badRequest('Topic not found');
    if (topic.type !== 'coding') {
      throw ApiError.badRequest('Topic must be of type "coding" for coding problems');
    }

    // Department scoping: null => global (all departments)
    const resolvedBranchId = await resolveBranchIdOrThrow(branchId);

    // Slug: use the provided one or derive a unique slug from the title
    let resolvedSlug: string = (slug || '').trim();
    if (!resolvedSlug) {
      const base = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'problem';
      resolvedSlug = `${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    }
    const slugConflict = await prisma.codingProblem.findUnique({ where: { slug: resolvedSlug } });
    if (slugConflict) throw ApiError.badRequest('A problem with this slug already exists');

    const problem = await prisma.codingProblem.create({
      data: {
        topicId, difficulty, title, description,
        slug: resolvedSlug,
        sampleInput, sampleOutput,
        tags: tags || [],
        branchId: resolvedBranchId,
        testCases: {
          create: testCases.map((tc: { input: string; expectedOutput: string; isHidden?: boolean }) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden ?? true,
          })),
        },
      },
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        testCases: true,
      },
    });

    res.status(201).json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/problems?topicId=&difficulty=&search=&page=&limit=
 * Trainer/Admin: sees all test cases.
 * Student: hidden test cases are stripped.
 */
export const getAllProblems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;
    const isStaff = req.user!.role === 'trainer' || req.user!.role === 'admin';

    const where: {
      topicId?: number;
      difficulty?: Difficulty;
      OR?: any;
    } = {};

    if (topicId) where.topicId = topicId;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      where.difficulty = difficulty as Difficulty;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Department scoping: students only see global problems + their own department's
    // (PO manages content across all departments, so PO is exempt from scoping)
    if (!['trainer', 'admin', 'po'].includes(req.user!.role)) {
      const branchCtx = await getStudentBranchContext(req);
      const branchFilter = branchScopeFilter(branchCtx);
      where.OR = search
        ? [...where.OR, branchFilter]
        : branchFilter.OR;
    }

    const [problems, total] = await Promise.all([
      prisma.codingProblem.findMany({
        where,
        include: {
          topic: { select: { id: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          testCases: isStaff ? true : { where: { isHidden: false } },
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.codingProblem.count({ where }),
    ]);

    // For students: also strip expectedOutput from visible test cases
    const formatted = problems.map((p) => {
      if (isStaff) return p;
      return {
        ...p,
        testCases: (p.testCases as any[]).map((tc: { id: string; input: string; isHidden: boolean }) => ({
          id: tc.id,
          input: tc.input,
          isHidden: tc.isHidden,
        })),
      };
    });

    res.json({
      success: true,
      data: formatted,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/problems/:id
 * Students see only sample I/O; trainers see all test cases.
 */
export const getProblemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const isStaff = req.user!.role === 'trainer' || req.user!.role === 'admin';

    const problem = await prisma.codingProblem.findUnique({
      where: { id },
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        testCases: isStaff ? true : { where: { isHidden: false } },
        _count: { select: { submissions: true } },
      },
    });

    if (!problem) throw ApiError.notFound('Problem not found');

    // Department scoping: block direct by-id access from other departments
    await assertStudentCanAccessContent(req, problem.branchId);

    // Strip expectedOutput for students
    let responseData: any = problem;
    if (!isStaff) {
      responseData = {
        ...problem,
        testCases: (problem.testCases as any[]).map((tc: { id: string; input: string; isHidden: boolean }) => ({
          id: tc.id,
          input: tc.input,
          isHidden: tc.isHidden,
        })),
      };
    }

    res.json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/problems/:id
 * Trainer updates a problem. If testCases provided, replaces all.
 */
export const updateProblem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { testCases, ...updateData } = req.body;

    const existing = await prisma.codingProblem.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Problem not found');

    // Department scoping: validate + apply when provided (null resets to global)
    if ('branchId' in updateData) {
      updateData.branchId = await resolveBranchIdOrThrow(updateData.branchId);
    }

    // If testCases are provided, delete old ones and create new ones
    if (testCases && testCases.length > 0) {
      await prisma.codingTestCase.deleteMany({ where: { problemId: id } });
      await prisma.codingTestCase.createMany({
        data: testCases.map((tc: { input: string; expectedOutput: string; isHidden?: boolean }) => ({
          problemId: id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden ?? true,
        })),
      });
    }

    const problem = await prisma.codingProblem.update({
      where: { id },
      data: updateData,
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        testCases: true,
      },
    });

    res.json({ success: true, data: problem });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/problems/:id
 */
export const deleteProblem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.codingProblem.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!existing) throw ApiError.notFound('Problem not found');

    // If submissions exist, refuse deletion (no isActive field in schema)
    if (existing._count.submissions > 0) {
      throw ApiError.badRequest(
        'Cannot delete a problem that has submissions. Archive it manually.'
      );
    }

    await prisma.codingProblem.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Problem deleted' } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/problems/runner-status
 * Check if the flag-gated local runner is enabled and which languages are configured.
 */
export const getRunnerStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSimulatedDisabled = req.headers['x-test-disable-runner'] === 'true';
    const enabled = process.env.CODE_RUNNER_ENABLED === 'true' && !isSimulatedDisabled;
    const rawLanguages = process.env.CODE_RUNNER_LANGUAGES || 'python,javascript';
    const languages = rawLanguages.split(',').map((s) => s.trim()).filter(Boolean);

    res.json({
      success: true,
      data: {
        enabled,
        languages,
        activeConcurrency: getActiveConcurrency(),
        peakConcurrency: getPeakConcurrency(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/problems/:id/run
 * Student runs code against non-hidden sample test cases only. Nothing is saved to DB.
 */
export const runCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isSimulatedDisabled = req.headers['x-test-disable-runner'] === 'true';
    if (process.env.CODE_RUNNER_ENABLED !== 'true' || isSimulatedDisabled) {
      return res.status(503).json({
        success: false,
        error: 'Code execution runner is disabled on this server. Contact administrator.',
      });
    }

    const id = req.params['id'] as string;
    const { language, code } = req.body;

    const problem = await prisma.codingProblem.findUnique({
      where: { id },
      include: {
        testCases: {
          where: { isHidden: false },
        },
      },
    });

    if (!problem) throw ApiError.notFound('Problem not found');
    if (problem.testCases.length === 0) {
      throw ApiError.badRequest('No sample test cases configured for this problem');
    }

    // Department scoping: block code execution against other departments' problems
    await assertStudentCanAccessContent(req, problem.branchId);

    const runResult = await codeRunner.run(language, code, problem.testCases);

    res.json({
      success: true,
      data: runResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/problems/:id/submit
 * Student submits code against ALL test cases.
 * Saves CodingSubmission, returns verdict + results.
 * Hidden cases hide input and expectedOutput.
 */
export const submitCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    // Rate-limit submits per user: max 10 per minute
    const bypassRateLimit = process.env.NODE_ENV === 'test' && req.headers['x-bypass-submit-rate-limit'] === 'true';
    if (!bypassRateLimit) {
      const rateCheck = checkSubmitRateLimit(studentId);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: `Submission rate limit exceeded. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        });
      }
    }

    const isSimulatedDisabled = req.headers['x-test-disable-runner'] === 'true';
    if (process.env.CODE_RUNNER_ENABLED !== 'true' || isSimulatedDisabled) {
      return res.status(503).json({
        success: false,
        error: 'Code execution runner is disabled on this server. Contact administrator.',
      });
    }

    const id = req.params['id'] as string;
    const { language, code } = req.body;

    const problem = await prisma.codingProblem.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { isHidden: 'asc' }, // Visible first, then hidden
        },
      },
    });

    if (!problem) throw ApiError.notFound('Problem not found');

    // Department scoping: block submissions against other departments' problems
    await assertStudentCanAccessContent(req, problem.branchId);

    const runResult = await codeRunner.run(language, code, problem.testCases);

    // Save CodingSubmission record in database
    const submission = await prisma.codingSubmission.create({
      data: {
        problemId: id,
        studentId,
        code,
        language,
        passedTestCases: runResult.passedTestCases,
        totalTestCases: runResult.totalTestCases,
        isPassed: runResult.passed,
      },
    });

    // Sanitize results: never leak input or expectedOutput for hidden test cases
    const sanitizedResults = runResult.results.map((r) => {
      if (r.isHidden) {
        return {
          testCaseNumber: r.testCaseNumber,
          verdict: r.verdict,
          passed: r.passed,
          isHidden: true,
          executionTimeMs: r.executionTimeMs,
        };
      }
      return r;
    });

    res.status(201).json({
      success: true,
      data: {
        submissionId: submission.id,
        verdict: runResult.verdict,
        passed: runResult.passed,
        passedTestCases: runResult.passedTestCases,
        totalTestCases: runResult.totalTestCases,
        results: sanitizedResults,
        createdAt: submission.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/problems/:id/submissions
 * Student: can only view own submissions.
 * Trainer / Admin: can view all submissions for the problem.
 */
export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const isStaff = ['trainer', 'admin'].includes(req.user!.role);

    // Department scoping: students cannot list submissions of another department's problem
    if (!isStaff) {
      const problem = await prisma.codingProblem.findUnique({
        where: { id },
        select: { branchId: true },
      });
      if (problem) await assertStudentCanAccessContent(req, problem.branchId);
    }

    const submissions = await prisma.codingSubmission.findMany({
      where: {
        problemId: id,
        ...(isStaff ? {} : { studentId: req.user!.id }),
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};