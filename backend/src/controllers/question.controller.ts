import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import {
  getStudentBranchContext,
  branchScopeFilter,
  assertStudentCanAccessContent,
  resolveBranchIdOrThrow,
} from '../middleware/departmentAccess.js';

type Difficulty = 'easy' | 'medium' | 'hard';
type CorrectOption = 'A' | 'B' | 'C' | 'D';

/**
 * POST /api/questions
 * Trainer creates an aptitude question.
 */
export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      topicId, difficulty, questionText,
      optionA, optionB, optionC, optionD,
      correctOption, explanation, branchId,
    } = req.body;

    // Verify topic exists and is an aptitude topic
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw ApiError.badRequest('Topic not found');
    if (topic.type !== 'aptitude') {
      throw ApiError.badRequest('Topic must be of type "aptitude" for aptitude questions');
    }

    // Department scoping: null => global (all departments)
    const resolvedBranchId = await resolveBranchIdOrThrow(branchId);

    const question = await prisma.aptitudeQuestion.create({
      data: {
        topicId, difficulty, questionText,
        optionA, optionB, optionC, optionD,
        correctOption, explanation: explanation || null,
        branchId: resolvedBranchId,
      },
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/questions?topicId=&difficulty=&search=&page=&limit=
 * Trainer/Admin: full list. Student: also allowed (for browsing).
 */
export const getAllQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const search = req.query.search as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const skip = (page - 1) * limit;

    const where: {
      topicId?: number;
      difficulty?: Difficulty;
      questionText?: { contains: string; mode: 'insensitive' };
      OR?: Array<{ branchId: number | null }>;
    } = {};

    if (topicId) where.topicId = topicId;
    if (difficulty && ['easy', 'medium', 'hard'].includes(difficulty)) {
      where.difficulty = difficulty as Difficulty;
    }
    if (search) {
      where.questionText = { contains: search, mode: 'insensitive' };
    }

    // Department scoping: students only see global questions + their own department's
    // (PO manages content across all departments, so PO is exempt from scoping)
    const exemptFromBranchScoping = ['trainer', 'admin', 'po'].includes(req.user?.role || '');
    if (!exemptFromBranchScoping) {
      const branchCtx = await getStudentBranchContext(req);
      Object.assign(where, branchScopeFilter(branchCtx));
    }

    const [questions, total] = await Promise.all([
      prisma.aptitudeQuestion.findMany({
        where,
        include: {
          topic: { select: { id: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.aptitudeQuestion.count({ where }),
    ]);

    // Answer-key visibility for staff only (original behavior preserved)
    const isStaff = ['trainer', 'admin'].includes(req.user?.role || '');
    const sanitizedQuestions = questions.map((q: any) => {
      if (isStaff) return q;
      const { correctOption, explanation, ...rest } = q;
      return rest;
    });

    res.json({
      success: true,
      data: sanitizedQuestions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/questions/:id
 */
export const getQuestionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const question = await prisma.aptitudeQuestion.findUnique({
      where: { id },
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    if (!question) throw ApiError.notFound('Question not found');

    // Department scoping: block direct by-id access from other departments
    await assertStudentCanAccessContent(req, question.branchId);

    const isStaff = ['trainer', 'admin'].includes(req.user?.role || '');
    let sanitizedQuestion: any = question;
    if (!isStaff) {
      const { correctOption, explanation, ...rest } = question;
      sanitizedQuestion = rest;
    }

    res.json({ success: true, data: sanitizedQuestion });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/questions/:id
 * Trainer updates a question.
 */
export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const updateData = req.body;

    const existing = await prisma.aptitudeQuestion.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Question not found');

    // Department scoping: validate + apply when provided (null resets to global)
    if ('branchId' in updateData) {
      updateData.branchId = await resolveBranchIdOrThrow(updateData.branchId);
    }

    // If topicId is being changed, verify it's valid
    if (updateData.topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: updateData.topicId } });
      if (!topic) throw ApiError.badRequest('Topic not found');
    }

    const question = await prisma.aptitudeQuestion.update({
      where: { id },
      data: updateData,
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/questions/:id
 * Trainer deletes a question.
 * Blocked if question is used in any mock test.
 */
export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.aptitudeQuestion.findUnique({
      where: { id },
      include: { _count: { select: { mockTests: true } } },
    });
    if (!existing) throw ApiError.notFound('Question not found');

    if (existing._count.mockTests > 0) {
      throw ApiError.badRequest(
        'Cannot delete a question that is used in mock tests. Remove it from tests first.'
      );
    }

    await prisma.aptitudeQuestion.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Question deleted' } });
  } catch (err) {
    next(err);
  }
};