import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import {
  getStudentBranchContext,
  branchScopeFilter,
  assertStudentCanAccessContent,
} from '../middleware/departmentAccess.js';

// ============================================================
// PROBLEM BANK
// ============================================================

export const getProblems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { difficulty, topicId, company, search } = req.query;
    const where: any = { status: 'published' };
    
    if (difficulty) where.difficulty = difficulty;
    if (topicId) where.topicId = parseInt(topicId as string, 10);
    if (company) where.companyTags = { has: company as string };
    if (search) where.title = { contains: search as string, mode: 'insensitive' };

    // Department scoping: students only see global problems + their own department's
    if (!['trainer', 'admin', 'po'].includes(req.user?.role || '')) {
      const branchCtx = await getStudentBranchContext(req);
      Object.assign(where, branchScopeFilter(branchCtx));
    }

    const problems = await prisma.codingProblem.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        tags: true,
        companyTags: true,
        topic: { select: { name: true } }
      },
      orderBy: { title: 'asc' }
    });

    res.json({ success: true, data: problems });
  } catch (err) { next(err); }
};

export const getProblemBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const problem = await prisma.codingProblem.findUnique({
      where: { slug: slug as string },
      include: {
        testCases: { where: { isHidden: false } }
      }
    });

    if (!problem || problem.status !== 'published') {
      throw ApiError.notFound('Problem not found.');
    }

    // Department scoping: block direct access to another department's problem
    await assertStudentCanAccessContent(req, problem.branchId);

    res.json({ success: true, data: problem });
  } catch (err) { next(err); }
};

export const submitSolution = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { code, language } = req.body;
    const studentId = req.user!.id;

    const problem = await prisma.codingProblem.findUnique({
      where: { slug: slug as string },
      include: { testCases: true }
    });
    if (!problem) throw ApiError.notFound('Problem not found.');

    // Department scoping: block submissions against another department's problem
    await assertStudentCanAccessContent(req, problem.branchId);

    // Manual Evaluation Workflow: Save as pending review
    const submission = await prisma.codingSubmission.create({
      data: {
        problemId: problem.id,
        studentId,
        code,
        language: language || 'python',
        passedTestCases: 0,
        totalTestCases: problem.testCases ? problem.testCases.length : 0,
        isPassed: false, // Awaiting manual review
      }
    });

    await audit(studentId, 'coding.submit', 'coding_submission', submission.id, 'success', { problemId: problem.id });
    res.status(201).json({ 
      success: true, 
      data: submission,
      message: 'Submission received. It is pending manual review by a trainer.' 
    });
  } catch (err) { next(err); }
};

export const evaluateSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params;
    const { isPassed, passedTestCases, feedback } = req.body;

    const submission = await prisma.codingSubmission.findUnique({ where: { id: submissionId as string } });
    if (!submission) throw ApiError.notFound('Submission not found.');

    const updated = await prisma.codingSubmission.update({
      where: { id: submissionId as string },
      data: { isPassed, passedTestCases: passedTestCases ?? 0 }
    });

    await audit(req.user!.id, 'coding.evaluate', 'coding_submission', submissionId as string, 'success', { isPassed, feedback });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ============================================================
// PREPARATION PLANS
// ============================================================

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Department scoping: students only see global plans + their own department's
    const where: any = { status: 'published' };
    if (!['trainer', 'admin', 'po'].includes(req.user?.role || '')) {
      const branchCtx = await getStudentBranchContext(req);
      Object.assign(where, branchScopeFilter(branchCtx));
    }

    const plans = await prisma.interviewPreparationPlan.findMany({
      where,
      include: { _count: { select: { tasks: true } } }
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
};

export const getPlanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const plan = await prisma.interviewPreparationPlan.findUnique({
      where: { id: id as string },
      include: { 
        tasks: { 
          include: { problem: { select: { title: true, slug: true, difficulty: true } } },
          orderBy: { dayNumber: 'asc' } 
        } 
      }
    });
    if (!plan) throw ApiError.notFound('Plan not found.');

    // Department scoping: block direct access to another department's preparation plan
    await assertStudentCanAccessContent(req, plan.branchId);

    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
};

export const getStudentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [attempted, solved, plans] = await Promise.all([
      prisma.codingSubmission.count({ where: { studentId } }),
      prisma.codingSubmission.count({ where: { studentId, isPassed: true } }),
      prisma.studentPreparationEnrollment.count({ where: { studentId } })
    ]);

    res.json({
      success: true,
      data: {
        attempted,
        solved,
        acceptanceRate: attempted > 0 ? Math.round((solved / attempted) * 100) : 0,
        activePlans: plans
      }
    });
  } catch (err) { next(err); }
};

