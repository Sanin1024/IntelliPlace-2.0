import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

/**
 * Helper: check if a test is currently available to a student.
 */
const isTestAvailable = (test: any, studentProfile: any): boolean => {
  const now = new Date();
  if (!test.isActive) return false;
  if (test.availableFrom && now < new Date(test.availableFrom)) return false;
  if (test.availableUntil && now > new Date(test.availableUntil)) return false;
  if (test.batchId && studentProfile?.batchId !== test.batchId) return false;
  return true;
};

/**
 * Helper: compute remaining attempts for a student on a test.
 */
const getRemainingAttempts = async (testId: string, studentId: string, maxAttempts: number) => {
  const attemptCount = await prisma.testAttempt.count({
    where: { testId, studentId, attemptType: 'mock' },
  });
  return Math.max(0, maxAttempts - attemptCount);
};

// ============================================================
// TRAINER: CREATE TEST
// ============================================================

export const createTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title, description, durationMins, batchId,
      availableFrom, availableUntil, maxAttempts, questionIds,
    } = req.body;

    // Verify all question IDs exist
    const questions = await prisma.aptitudeQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });
    if (questions.length !== questionIds.length) {
      throw ApiError.badRequest('One or more question IDs are invalid');
    }

    // Verify batch if provided
    if (batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw ApiError.badRequest('Batch not found');
    }

    const test = await prisma.mockTest.create({
      data: {
        title,
        description: description || null,
        durationMins,
        batchId: batchId || null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        maxAttempts: maxAttempts || 1,
        createdBy: req.user!.id,
        questions: {
          create: questionIds.map((questionId: string) => ({ questionId })),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              select: { id: true, questionText: true, difficulty: true, topic: { select: { name: true } } },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });

    res.status(201).json({ success: true, data: test });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET ALL TESTS (role-aware)
// ============================================================

export const getAllTests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStaff = ['trainer', 'admin'].includes(req.user!.role);

    if (isStaff) {
      // Trainer/Admin: see all tests they created (or all for admin)
      const tests = await prisma.mockTest.findMany({
        where: req.user!.role === 'admin' ? {} : { createdBy: req.user!.id },
        include: {
          questions: { select: { questionId: true } },
          batch: { select: { id: true, name: true } },
          _count: { select: { attempts: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({
        success: true,
        data: tests.map((t: any) => ({ ...t, questionCount: t.questions.length })),
      });
    }

    // Student: see only available tests + their attempt info
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
    });

    const allTests = await prisma.mockTest.findMany({
      where: { isActive: true },
      include: {
        questions: { select: { questionId: true } },
        batch: { select: { id: true, name: true } },
        attempts: {
          where: { studentId: req.user!.id, attemptType: 'mock' },
          select: { id: true, status: true, score: true, totalMarks: true, startTime: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const testsWithAvailability = await Promise.all(
      allTests.map(async (test: any) => {
        const available = isTestAvailable(test, studentProfile);
        const remainingAttempts = available
          ? await getRemainingAttempts(test.id, req.user!.id, test.maxAttempts)
          : 0;

        return {
          id: test.id,
          title: test.title,
          description: test.description,
          durationMins: test.durationMins,
          batch: test.batch,
          availableFrom: test.availableFrom,
          availableUntil: test.availableUntil,
          questionCount: test.questions.length,
          maxAttempts: test.maxAttempts,
          attemptsUsed: test.maxAttempts - remainingAttempts,
          remainingAttempts,
          available,
          myAttempts: test.attempts,
        };
      })
    );

    res.json({ success: true, data: testsWithAvailability });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET TEST BY ID (role-aware)
// ============================================================

export const getTestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const isStaff = ['trainer', 'admin'].includes(req.user!.role);

    const test = await prisma.mockTest.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                difficulty: true,
                // Include correctOption only for staff
                ...(isStaff ? { correctOption: true, explanation: true } : {}),
                topic: { select: { id: true, name: true } },
              },
            },
          },
        },
        batch: { select: { id: true, name: true } },
        creator: { select: { name: true } },
        _count: { select: { attempts: true } },
      },
    });

    if (!test) throw ApiError.notFound('Test not found');

    res.json({ success: true, data: test });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TRAINER: UPDATE TEST
// ============================================================

export const updateTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    const { availableFrom, availableUntil, ...updateData } = req.body;

    const existing = await prisma.mockTest.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Test not found');

    // Only creator or admin can update
    if (req.user!.role !== 'admin' && existing.createdBy !== req.user!.id) {
      throw ApiError.forbidden('You can only update tests you created');
    }

    const test = await prisma.mockTest.update({
      where: { id },
      data: {
        ...updateData,
        ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom) : null }),
        ...(availableUntil !== undefined && { availableUntil: availableUntil ? new Date(availableUntil) : null }),
      },
      include: { questions: { select: { questionId: true } } },
    });

    res.json({ success: true, data: test });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TRAINER: DELETE TEST
// ============================================================

export const deleteTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const existing = await prisma.mockTest.findUnique({
      where: { id },
      include: { _count: { select: { attempts: true } } },
    });
    if (!existing) throw ApiError.notFound('Test not found');

    if (req.user!.role !== 'admin' && existing.createdBy !== req.user!.id) {
      throw ApiError.forbidden('You can only delete tests you created');
    }

    if (existing._count.attempts > 0) {
      throw ApiError.badRequest(
        'Cannot delete a test that has student attempts. Deactivate it instead.'
      );
    }

    await prisma.mockTest.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Test deleted' } });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TRAINER: VIEW RESULTS FOR A TEST
// ============================================================

export const getTestResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const test = await prisma.mockTest.findUnique({
      where: { id },
      select: { id: true, title: true, createdBy: true },
    });
    if (!test) throw ApiError.notFound('Test not found');

    if (req.user!.role !== 'admin' && test.createdBy !== req.user!.id) {
      throw ApiError.forbidden('You can only view results for tests you created');
    }

    const attempts = await prisma.testAttempt.findMany({
      where: { testId: id, attemptType: 'mock', status: 'submitted' },
      include: {
        student: {
          select: {
            id: true, name: true, email: true,
            studentProfile: { select: { branch: { select: { name: true } }, batch: { select: { name: true } } } },
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    const stats = {
      totalAttempts: attempts.length,
      avgScore: attempts.length > 0
        ? Math.round((attempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / attempts.length) * 10) / 10
        : 0,
      highestScore: attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score || 0)) : 0,
      lowestScore: attempts.length > 0 ? Math.min(...attempts.map((a: any) => a.score || 0)) : 0,
    };

    res.json({ success: true, data: { test, attempts, stats } });
  } catch (err) {
    next(err);
  }
};