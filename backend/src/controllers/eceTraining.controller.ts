import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { upload } from '../config/multer.js';

// ============================================================
// ECE (ELECTRONICS & COMMUNICATION ENGINEERING) TRAINING MODULE
// Mirrors the EEE module; access is gated at the route level to
// students of the EC department (see eceTraining.routes.ts).
// ============================================================

// ------------------------------------------------------------
// ECE QUESTION BANK
// ------------------------------------------------------------

export const getQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, difficulty, status, limit } = req.query;
    const isStaff = ['trainer', 'po', 'admin'].includes(req.user!.role);

    const where: any = {};
    if (subject) where.subject = { contains: subject as string, mode: 'insensitive' };
    if (difficulty) where.difficulty = difficulty;

    if (!isStaff) {
      where.status = 'published';
    } else if (status) {
      where.status = status;
    }

    const questions = await prisma.eCEQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10) || 50,
    });

    if (!isStaff) {
      const sanitized = questions.map((q) => {
        const { correctAnswer, explanation, formula, hdlCode, ...rest } = q;
        return rest;
      });
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data: questions });
  } catch (err) { next(err); }
};

export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      subject, questionText, correctAnswer, explanation, difficulty, marks,
      optionA, optionB, optionC, optionD, topic, formula, unit, careerTrackId,
      questionType, negativeMarks,
    } = req.body;

    const question = await prisma.eCEQuestion.create({
      data: {
        subject, questionText, correctAnswer, explanation,
        difficulty: difficulty || 'medium',
        marks: marks || 1,
        negativeMarks: negativeMarks ?? 0,
        questionType: questionType || 'mcq',
        optionA, optionB, optionC, optionD,
        topic, formula, unit, careerTrackId,
        status: 'draft',
        createdBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'ece_question.create', 'ece_question', question.id, 'success');
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
};

// ------------------------------------------------------------
// ECE PRACTICAL ASSESSMENTS
// ------------------------------------------------------------

export const getPracticalAssessments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isStaff = ['trainer', 'po', 'admin'].includes(req.user!.role);
    const assessments = await prisma.eCEPracticalAssessment.findMany({
      where: isStaff ? {} : { status: 'published' },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: assessments });
  } catch (err) { next(err); }
};

export const submitPractical = [
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessmentId = req.params.id as string;
      const { reportText } = req.body;
      const studentId = req.user!.id;
      const file = req.file;

      const assessment = await prisma.eCEPracticalAssessment.findUnique({ where: { id: assessmentId } });
      if (!assessment) throw ApiError.notFound('Assessment not found.');

      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;

      const submission = await prisma.eCEPracticalSubmission.upsert({
        where: { assessmentId_studentId: { assessmentId, studentId } },
        update: {
          fileUrl, fileName, reportText,
          status: 'under_review',
          submittedAt: new Date(),
        },
        create: {
          assessmentId, studentId,
          fileUrl, fileName, reportText,
          status: 'under_review',
          submittedAt: new Date(),
        },
      });

      res.status(201).json({ success: true, data: submission });
    } catch (err) { next(err); }
  },
];

export const evaluatePractical = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.submissionId as string;
    const { marks, feedback, rubricScores, status } = req.body;

    const updated = await prisma.eCEPracticalSubmission.update({
      where: { id: submissionId },
      data: {
        marks, feedback, rubricScores,
        status: status || 'approved',
        evaluatedAt: new Date(),
        evaluatedBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'ece_practical.evaluate', 'ece_practical_submission', submissionId, 'success');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ------------------------------------------------------------
// ECE COMPANY PREPARATION
// ------------------------------------------------------------

export const getCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { industry } = req.query;
    const where: any = {};
    if (industry) where.industry = { contains: industry as string, mode: 'insensitive' };

    const companies = await prisma.eCECompanyProfile.findMany({
      where,
      orderBy: { companyName: 'asc' },
    });

    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const company = await prisma.eCECompanyProfile.findUnique({ where: { id } });
    if (!company) throw ApiError.notFound('Company not found.');
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.eCECompanyProfile.create({
      data: { ...req.body, createdBy: req.user!.id },
    });
    await audit(req.user!.id, 'ece_company.create', 'ece_company_profile', company.id, 'success');
    res.status(201).json({ success: true, data: company });
  } catch (err) { next(err); }
};

// ------------------------------------------------------------
// STUDENT DASHBOARD
// ------------------------------------------------------------

export const getStudentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [practicalSubmissions, mockInterviews, bookmarks, resources] = await Promise.all([
      prisma.eCEPracticalSubmission.count({ where: { studentId, status: 'approved' } }),
      prisma.mockInterviewSession.count({ where: { studentId, status: 'completed' } }),
      prisma.resourceBookmark.count({ where: { studentId } }),
      prisma.trainingResource.count({
        where: {
          OR: [
            { category: { contains: 'ECE', mode: 'insensitive' } },
            { category: { contains: 'Electronics', mode: 'insensitive' } },
            { category: { contains: 'Communication', mode: 'insensitive' } },
            { category: { contains: 'Embedded', mode: 'insensitive' } },
            { category: { contains: 'VLSI', mode: 'insensitive' } },
          ],
          status: 'published'
        }
      }),
    ]);

    res.json({
      success: true,
      data: {
        practicalsCompleted: practicalSubmissions,
        mockInterviewsCompleted: mockInterviews,
        bookmarkedResources: bookmarks,
        totalResources: resources,
      },
    });
  } catch (err) { next(err); }
};
