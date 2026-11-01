import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';

// ============================================================
// CIVIL QUESTION BANK
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

    const questions = await prisma.civilQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10) || 50,
    });

    if (!isStaff) {
      const sanitized = questions.map((q) => {
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
    const { subject, questionText, correctAnswer, explanation, difficulty, marks, optionA, optionB, optionC, optionD, topic, formula, unit } = req.body;

    const question = await prisma.civilQuestion.create({
      data: {
        subject, questionText, correctAnswer, explanation,
        difficulty: difficulty || 'medium',
        marks: marks || 1,
        optionA, optionB, optionC, optionD,
        topic, formula, unit,
        status: 'draft',
        createdBy: req.user!.id,
      },
    });

    await audit(req.user!.id, 'civil_question.create', 'civil_question', question.id, 'success');
    res.status(201).json({ success: true, data: question });
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

    const companies = await prisma.civilCompanyProfile.findMany({
      where,
      orderBy: { companyName: 'asc' },
    });

    res.json({ success: true, data: companies });
  } catch (err) { next(err); }
};

export const getCompanyById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const company = await prisma.civilCompanyProfile.findUnique({ where: { id } });
    if (!company) throw ApiError.notFound('Company not found.');
    res.json({ success: true, data: company });
  } catch (err) { next(err); }
};

export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.civilCompanyProfile.create({
      data: { ...req.body, createdBy: req.user!.id },
    });
    await audit(req.user!.id, 'civil_company.create', 'civil_company_profile', company.id, 'success');
    res.status(201).json({ success: true, data: company });
  } catch (err) { next(err); }
};

// ============================================================
// STUDENT DASHBOARD
// ============================================================

export const getStudentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.user!.id;

    const [careerTracks, mockInterviews, bookmarks, resources] = await Promise.all([
      prisma.studentCareerTrack.count({ where: { studentId } }),
      prisma.mockInterviewSession.count({ where: { studentId, status: 'completed' } }),
      prisma.resourceBookmark.count({ where: { studentId } }),
      prisma.trainingResource.count({ 
        where: { 
          OR: [
            { category: { contains: 'Civil', mode: 'insensitive' } },
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
        mockInterviewsCompleted: mockInterviews,
        bookmarkedResources: bookmarks,
        totalResources: resources,
      },
    });
  } catch (err) { next(err); }
};

