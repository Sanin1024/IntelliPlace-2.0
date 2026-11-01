import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { upload } from '../config/multer.js';

// ============================================================
// CAREER TRACKS
// ============================================================

export const getCareerTracks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tracks = await prisma.careerTrack.findMany({
      where: { isActive: true },
      include: { _count: { select: { resources: true, projects: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: tracks });
  } catch (err) { next(err); }
};

export const enrollInCareerTrack = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trackId = req.params.trackId as string;
    const studentId = req.user!.id;

    const track = await prisma.careerTrack.findUnique({ where: { id: trackId } });
    if (!track || !track.isActive) throw ApiError.notFound('Career track not found.');

    const enrollment = await prisma.studentCareerTrack.upsert({
      where: { studentId_careerTrackId: { studentId, careerTrackId: trackId } },
      update: {},
      create: { studentId, careerTrackId: trackId },
    });

    res.status(201).json({ success: true, data: enrollment });
  } catch (err) { next(err); }
};

export const getMyCareerTracks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await prisma.studentCareerTrack.findMany({
      where: { studentId: req.user!.id },
      include: { careerTrack: true },
    });
    res.json({ success: true, data: enrollments });
  } catch (err) { next(err); }
};

// ============================================================
// ENGINEERING SUBJECTS & TOPICS
// ============================================================

export const getSubjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjects = await prisma.engineeringSubject.findMany({
      where: { isActive: true },
      include: { _count: { select: { questions: true, topics: true } } },
      orderBy: { category: 'asc' },
    });
    res.json({ success: true, data: subjects });
  } catch (err) { next(err); }
};

// ============================================================
// MECHANICAL QUESTION BANK & ASSESSMENT
// ============================================================

export const getQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, difficulty, status, limit } = req.query;
    const isStaff = ['trainer', 'po', 'admin'].includes(req.user!.role);

    const where: any = {};
    if (subjectId) where.subjectId = parseInt(subjectId as string, 10);
    if (difficulty) where.difficulty = difficulty;
    
    // Students only see published questions; staff can see all
    if (!isStaff) {
      where.status = 'published';
    } else if (status) {
      where.status = status;
    }

    const questions = await prisma.mechanicalQuestion.findMany({
      where,
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10) || 50,
    });

    // Strip correct answers and explanations for students
    if (!isStaff) {
      const sanitized = questions.map(q => {
        const { correctAnswer, explanation, formula, ...rest } = q;
        return rest;
      });
      return res.json({ success: true, data: sanitized });
    }

    res.json({ success: true, data: questions });
  } catch (err) { next(err); }
};

export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId, questionText, correctAnswer, explanation, difficulty, marks, negativeMarks, optionA, optionB, optionC, optionD, topic, questionType, formula, unit, careerTrackId } = req.body;

    const subject = await prisma.engineeringSubject.findUnique({ where: { id: subjectId } });
    if (!subject) throw ApiError.badRequest('Subject not found.');

    const question = await prisma.mechanicalQuestion.create({
      data: {
        subjectId, questionText, correctAnswer, explanation,
        difficulty: difficulty || 'medium',
        marks: marks || 1,
        negativeMarks: negativeMarks || 0,
        optionA, optionB, optionC, optionD,
        topic, questionType: questionType || 'mcq',
        formula, unit, careerTrackId,
        status: 'draft',
        createdBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'mech_question.create', 'mechanical_question', question.id, 'success');
    res.status(201).json({ success: true, data: question });
  } catch (err) { next(err); }
};

export const publishQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const question = await prisma.mechanicalQuestion.update({
      where: { id },
      data: { status: 'published' },
    });
    await audit(req.user!.id, 'mech_question.publish', 'mechanical_question', id, 'success');
    res.json({ success: true, data: question });
  } catch (err) { next(err); }
};

// ============================================================
// ENGINEERING PROJECTS
// ============================================================

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { domain, careerTrackId, difficulty } = req.query;
    const where: any = { status: 'published' };
    if (domain) where.domain = { contains: domain as string, mode: 'insensitive' };
    if (careerTrackId) where.careerTrackId = careerTrackId as string;
    if (difficulty) where.difficulty = difficulty as string;

    const projects = await prisma.engineeringProject.findMany({
      where,
      include: { 
        careerTrack: { select: { name: true } },
        _count: { select: { submissions: true } } 
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
};

export const submitProject = [
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const { notes } = req.body;
      const studentId = req.user!.id;
      const file = req.file;

      const project = await prisma.engineeringProject.findUnique({ where: { id: projectId } });
      if (!project) throw ApiError.notFound('Project not found.');

      const existing = await prisma.projectSubmission.findUnique({
        where: { projectId_studentId: { projectId, studentId } },
      });
      if (existing && existing.status === 'under_review') {
        throw ApiError.badRequest('You already have a submission under review.');
      }

      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;

      const submission = await prisma.projectSubmission.upsert({
        where: { projectId_studentId: { projectId, studentId } },
        update: {
          fileUrl, fileName, notes,
          status: 'under_review',
          submittedAt: new Date(),
          evaluatedAt: null,
          marks: null,
          feedback: null,
        },
        create: {
          projectId, studentId,
          fileUrl, fileName, notes,
          status: 'under_review',
          submittedAt: new Date(),
        },
      });

      await audit(studentId, 'mech_project.submit', 'project_submission', submission.id, 'success');
      res.status(201).json({ success: true, data: submission });
    } catch (err) { next(err); }
  },
];

export const evaluateProjectSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const submissionId = req.params.submissionId as string;
    const { marks, feedback, status } = req.body;

    const submission = await prisma.projectSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw ApiError.notFound('Submission not found.');

    const updated = await prisma.projectSubmission.update({
      where: { id: submissionId },
      data: {
        marks, feedback, status: status || 'approved',
        evaluatedAt: new Date(),
        evaluatedBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'mech_project.evaluate', 'project_submission', submissionId, 'success', { marks, status });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ============================================================
// PRACTICAL ASSESSMENTS
// ============================================================

export const getPracticalAssessments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessments = await prisma.practicalAssessment.findMany({
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
      const { reportText } = req.body;
      const studentId = req.user!.id;
      const file = req.file;

      const assessment = await prisma.practicalAssessment.findUnique({ where: { id: assessmentId } });
      if (!assessment) throw ApiError.notFound('Assessment not found.');

      const fileUrl = file ? `/uploads/${file.filename}` : null;
      const fileName = file ? file.originalname : null;

      const submission = await prisma.practicalSubmission.upsert({
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

    const updated = await prisma.practicalSubmission.update({
      where: { id: submissionId },
      data: {
        marks, feedback, rubricScores,
        status: status || 'approved',
        evaluatedAt: new Date(),
        evaluatedBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'mech_practical.evaluate', 'practical_submission', submissionId, 'success');
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

    const companies = await prisma.mechanicalCompanyProfile.findMany({
      where,
      orderBy: { companyName: 'asc' },
    });

    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const company = await prisma.mechanicalCompanyProfile.findUnique({ where: { id } });
    if (!company) throw ApiError.notFound('Company not found.');
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.mechanicalCompanyProfile.create({
      data: { ...req.body, createdBy: req.user!.id },
    });
    await audit(req.user!.id, 'mech_company.create', 'mechanical_company_profile', company.id, 'success');
    res.status(201).json({ success: true, data: company });
  } catch (err) { next(err); }
};

// ============================================================
// MOCK INTERVIEWS
// ============================================================

export const getMyMockInterviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const interviews = await prisma.mockInterviewSession.findMany({
      where: { studentId: req.user!.id },
      include: { 
        interviewer: { select: { name: true, role: true } },
        careerTrack: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json({ success: true, data: interviews });
  } catch (err) { next(err); }
};

export const scheduleMockInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, interviewerId, interviewType, careerTrackId, scheduledAt, duration } = req.body;

    const interview = await prisma.mockInterviewSession.create({
      data: {
        studentId, interviewerId,
        interviewType,
        careerTrackId,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 30,
        status: 'scheduled',
      },
    });

    await audit(req.user!.id, 'mech_mock_interview.schedule', 'mock_interview_session', interview.id, 'success');
    res.status(201).json({ success: true, data: interview });
  } catch (err) { next(err); }
};

export const evaluateMockInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { technicalScore, communicationScore, overallScore, feedback, strengths, improvementAreas, questionsAsked, studentResponses } = req.body;

    const updated = await prisma.mockInterviewSession.update({
      where: { id },
      data: {
        technicalScore, communicationScore, overallScore,
        feedback, strengths, improvementAreas,
        questionsAsked, studentResponses,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    await audit(req.user!.id, 'mech_mock_interview.evaluate', 'mock_interview_session', id, 'success');
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// ============================================================
// ENGINEERING SOFTWARE
// ============================================================

export const getSoftware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, isFree } = req.query;
    const where: any = {};
    if (category) where.category = category as string;
    if (isFree === 'true') where.isFree = true;

    const software = await prisma.engineeringSoftware.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: software });
  } catch (err) { next(err); }
};

// ============================================================
// STUDENT TRAINING DASHBOARD
// ============================================================

export const getStudentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [careerTracks, projectSubmissions, practicalSubmissions, mockInterviews, bookmarks, resources] = await Promise.all([
      prisma.studentCareerTrack.count({ where: { studentId } }),
      prisma.projectSubmission.count({ where: { studentId, status: 'approved' } }),
      prisma.practicalSubmission.count({ where: { studentId, status: 'approved' } }),
      prisma.mockInterviewSession.count({ where: { studentId, status: 'completed' } }),
      prisma.resourceBookmark.count({ where: { studentId } }),
      prisma.trainingResource.count({ 
        where: { 
          OR: [
            { category: { contains: 'Mechanical', mode: 'insensitive' } },
            { category: { contains: 'Engineering', mode: 'insensitive' } },
          ],
          status: 'published' 
        } 
      }),
    ]);

    res.json({
      success: true,
      data: {
        careerTracksEnrolled: careerTracks,
        projectsCompleted: projectSubmissions,
        practicalsCompleted: practicalSubmissions,
        mockInterviewsCompleted: mockInterviews,
        bookmarkedResources: bookmarks,
        totalResources: resources,
      },
    });
  } catch (err) { next(err); }
};

