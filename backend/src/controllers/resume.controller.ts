import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

/**
 * Escapes text to prevent injection into PDF rendering.
 * Strips control characters and limits length.
 */
const sanitize = (text: string, maxLen: number): string => {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .substring(0, maxLen);
};

/**
 * GET /api/students/me/resume-data
 */
export const getResumeData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.studentResumeData.findUnique({
      where: { userId: req.user!.id },
    });
    res.json({ success: true, data: data || null });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/students/me/resume-data
 */
export const saveResumeData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { summary, education, skills, projects, links } = req.body;

    const data = await prisma.studentResumeData.upsert({
      where: { userId: req.user!.id },
      update: {
        summary: summary || null,
        education: education || undefined,
        skills: skills || [],
        projects: projects || undefined,
        links: links || undefined,
      },
      create: {
        userId: req.user!.id,
        summary: summary || null,
        education: education || undefined,
        skills: skills || [],
        projects: projects || undefined,
        links: links || undefined,
      },
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/students/me/resume.pdf
 * Generates a one-page PDF from stored resume data.
 */
export const downloadResumePdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.studentResumeData.findUnique({
      where: { userId: req.user!.id },
    });

    if (!data) {
      throw ApiError.notFound('No resume data found. Build your resume first.');
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { name: true, email: true } },
        branch: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    if (!profile) throw ApiError.notFound('Student profile not found');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    doc.pipe(res);

    // === Header ===
    doc.fontSize(24).font('Helvetica-Bold').text(sanitize(profile.user.name, 100), { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#444444');
    const headerLine = [sanitize(profile.user.email, 100), profile.branch?.name, profile.batch?.name]
      .filter(Boolean).join(' | ');
    doc.text(headerLine, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).strokeColor('#cccccc').stroke();
    doc.moveDown(0.8);

    // === Summary ===
    if (data.summary) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('SUMMARY');
      doc.moveDown(0.2);
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(sanitize(data.summary, 1000), { lineGap: 2 });
      doc.moveDown(0.6);
    }

    // === Education ===
    const education = data.education as any[];
    if (education && education.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('EDUCATION');
      doc.moveDown(0.2);
      for (const edu of education) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#222222');
        doc.text(`${sanitize(edu.degree, 100)} — ${sanitize(edu.institution, 120)}`);
        doc.fontSize(9).font('Helvetica').fillColor('#555555');
        const eduMeta = [edu.year ? sanitize(edu.year, 20) : '', edu.score ? sanitize(edu.score, 30) : '']
          .filter(Boolean).join(' | ');
        if (eduMeta) doc.text(eduMeta);
        doc.moveDown(0.3);
      }
      doc.moveDown(0.3);
    }

    // === Skills ===
    if (data.skills && data.skills.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('SKILLS');
      doc.moveDown(0.2);
      doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
      doc.text(data.skills.map((s: string) => sanitize(s, 60)).join(', '), { lineGap: 2 });
      doc.moveDown(0.6);
    }

    // === Projects ===
    const projects = data.projects as any[];
    if (projects && projects.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('PROJECTS');
      doc.moveDown(0.2);
      for (const proj of projects) {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#222222');
        doc.text(sanitize(proj.title, 100));
        doc.fontSize(9).font('Helvetica').fillColor('#555555');
        if (proj.description) doc.text(sanitize(proj.description, 500), { lineGap: 1 });
        if (proj.techStack) doc.fontSize(8.5).fillColor('#777777').text(`Tech: ${sanitize(proj.techStack, 200)}`);
        doc.moveDown(0.3);
      }
      doc.moveDown(0.3);
    }

    // === Links ===
    const links = data.links as any[];
    if (links && links.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text('LINKS');
      doc.moveDown(0.2);
      for (const link of links) {
        doc.fontSize(9.5).font('Helvetica').fillColor('#333333');
        doc.text(`${sanitize(link.label, 50)}: ${sanitize(link.url, 300)}`);
      }
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};