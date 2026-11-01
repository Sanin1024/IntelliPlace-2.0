import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

// Student: Get my assessment status
export const getMyAssessment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enforce Mandatory Student Master Profile Completion & Verification
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      select: { masterStatus: true, completionPercentage: true },
    });

    if (profile && profile.masterStatus !== 'VERIFIED') {
      throw ApiError.forbidden(
        `Placement Training Officer assessment requires a complete and verified Student Master Profile. Current status: ${profile.masterStatus}. Please complete your profile onboarding and await officer verification.`
      );
    }

    const assessment = await prisma.preliminaryAssessment.findUnique({
      where: { studentId: req.user!.id },
      include: { slot: true },
    });

    if (!assessment) throw ApiError.notFound('No preliminary assessment assigned');

    // Check if overdue
    if (
      (assessment.status === 'pending_scheduling' || assessment.status === 'scheduled') &&
      assessment.deadline < new Date()
    ) {
      await prisma.preliminaryAssessment.update({
        where: { id: assessment.id },
        data: { status: 'overdue' },
      });
      assessment.status = 'overdue';
    }

    res.json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
};
