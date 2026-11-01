import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { upload } from '../config/multer.js';

// ============================================================
// IT QUESTION BANK
// ============================================================

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

    const questions = await prisma.iTQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10) || 50,
    });

    if (!isStaff) {
      const sanitized = questions.map(q => {
        const { correctAnswer, explanation, codeSnippet, sqlQuery, ...rest } = q;
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
      optionA, optionB, optionC, optionD, topic, codeSnippet, sqlQuery, careerTrackId
    } = req.body;

    const question = await prisma.iTQuestion.create({
      data: {
        subject, questionText, correctAnswer, explanation,
        difficulty: difficulty || 'medium',
        marks: marks || 1,
        optionA, optionB, optionC, optionD,
        topic, codeSnippet, sqlQuery, careerTrackId,
        status: 'draft',
        createdBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'it_question.create', 'it_question', question.id, 'success');
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
};

// ============================================================
// IT PRACTICAL ASSESSMENTS
// ============================================================

export const getPracticalAssessments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.iTPracticalAssessment.findMany({
      where: { status: 'published' },
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
      const { reportText, repoUrl, codeSubmission } = req.body;
      const studentId = req.user!.id;
      const file = req.file;

      const assessment = await prisma.iTPracticalAssessment.findUnique({ where: { id: assessmentId } });
      if (!assessment) throw ApiError.notFound('Assessment not found.');

      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;

      const submission = await prisma.iTPracticalSubmission.upsert({
        where: { assessmentId_studentId: { assessmentId, studentId } },
        update: {
          fileUrl, fileName, reportText, repoUrl, codeSubmission,
          status: 'under_review',
          submittedAt: new Date(),
        },
        create: {
          assessmentId, studentId,
          fileUrl, fileName, reportText, repoUrl, codeSubmission,
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

    const updated = await prisma.iTPracticalSubmission.update({
      where: { id: submissionId },
      data: {
        marks, feedback, rubricScores,
        status: status || 'approved',
        evaluatedAt: new Date(),
        evaluatedBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'it_practical.evaluate', 'it_practical_submission', submissionId, 'success');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ============================================================
// COMPANY PREPARATION
// ============================================================

export const getCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { industry } = req.query;
    const where: any = {};
    if (industry) where.industry = { contains: industry as string, mode: 'insensitive' };

    const companies = await prisma.iTCompanyProfile.findMany({
      where,
      orderBy: { companyName: 'asc' },
    });

    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const company = await prisma.iTCompanyProfile.findUnique({ where: { id } });
    if (!company) throw ApiError.notFound('Company not found.');
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.iTCompanyProfile.create({
      data: { ...req.body, createdBy: req.user!.id },
    });
    await audit(req.user!.id, 'it_company.create', 'it_company_profile', company.id, 'success');
    res.status(201).json({ success: true, data: company });
  } catch (err) { next(err); }
};

// ============================================================
// STUDENT DASHBOARD
// ============================================================

export const getStudentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [careerTracks, practicalSubmissions, mockInterviews, bookmarks, resources] = await Promise.all([
      prisma.studentCareerTrack.count({ where: { studentId } }),
      prisma.iTPracticalSubmission.count({ where: { studentId, status: 'approved' } }),
      prisma.mockInterviewSession.count({ where: { studentId, status: 'completed' } }),
      prisma.resourceBookmark.count({ where: { studentId } }),
      prisma.trainingResource.count({ 
        where: { 
          OR: [
            { category: { contains: 'IT', mode: 'insensitive' } },
            { category: { contains: 'Programming', mode: 'insensitive' } },
            { category: { contains: 'Web', mode: 'insensitive' } },
            { category: { contains: 'Cloud', mode: 'insensitive' } },
            { category: { contains: 'Software', mode: 'insensitive' } },
          ],
          status: 'published' 
        } 
      }),
    ]);

    res.json({
      success: true,
      data: {
        careerTracksEnrolled: careerTracks,
        practicalsCompleted: practicalSubmissions,
        mockInterviewsCompleted: mockInterviews,
        bookmarkedResources: bookmarks,
        totalResources: resources,
      },
    });
  } catch (err) { next(err); }
};

