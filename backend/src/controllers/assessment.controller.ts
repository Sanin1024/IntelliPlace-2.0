import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';

// Helper to sync overdue statuses
const syncOverdue = async () => {
  await prisma.preliminaryAssessment.updateMany({
    where: {
      status: { in: ['pending_scheduling', 'scheduled'] },
      deadline: { lt: new Date() }
    },
    data: { status: 'overdue' }
  });
};

// PO: Get all pending/overdue students
export const getPendingStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await syncOverdue();
    const assessments = await prisma.preliminaryAssessment.findMany({
      where: { status: { in: ['pending_scheduling', 'overdue', 'scheduled'] } },
      include: {
        student: {
          select: {
            id: true, name: true, email: true,
            studentProfile: { select: { branch: { select: { name: true } } } }
          }
        },
        slot: { select: { startTime: true, location: true } }
      },
      orderBy: { deadline: 'asc' }
    });
    res.json({ success: true, data: assessments });
  } catch (err) { next(err); }
};

// PO: Get all assessment slots
export const getSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await prisma.assessmentSlot.findMany({
      include: { _count: { select: { assessments: true } } },
      orderBy: { startTime: 'asc' },
    });
    res.json({ success: true, data: slots });
  } catch (err) { next(err); }
};

// PO: Create Assessment Slot
export const createSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startTime, endTime, location, instructions, capacity } = req.body;
    
    // Check conflicts
    const conflict = await prisma.assessmentSlot.findFirst({
      where: {
        OR: [
          { startTime: { lte: new Date(endTime), gte: new Date(startTime) } },
          { endTime: { gte: new Date(startTime), lte: new Date(endTime) } }
        ]
      }
    });
    if (conflict) throw ApiError.badRequest('Scheduling conflict detected for this time window');

    const slot = await prisma.assessmentSlot.create({
      data: { startTime: new Date(startTime), endTime: new Date(endTime), location, instructions, capacity, createdBy: req.user!.id }
    });
    
    await audit(req.user!.id, 'assessment.slot_create', 'assessment_slot', slot.id, 'success');
    res.status(201).json({ success: true, data: slot });
  } catch (err) { next(err); }
};

// PO: Assign student to slot
export const assignSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessmentId = req.params.assessmentId as string;
    const { slotId } = req.body;

    const slot = await prisma.assessmentSlot.findUnique({ where: { id: slotId }, include: { _count: { select: { assessments: true } } } });
    if (!slot) throw ApiError.notFound('Slot not found');
    if (slot._count.assessments >= slot.capacity) throw ApiError.badRequest('Slot is at maximum capacity');

    const assessment = await prisma.preliminaryAssessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) throw ApiError.notFound('Assessment record not found');

    const updated = await prisma.preliminaryAssessment.update({
      where: { id: assessmentId },
      data: { slotId, status: 'scheduled' }
    });

    // Send notification
    await prisma.notification.create({
      data: {
        title: 'Preliminary Assessment Scheduled',
        message: `Your assessment is scheduled for ${new Date(slot.startTime).toLocaleString()} at ${slot.location || 'Online'}.`,
        createdBy: req.user!.id,
        recipients: { create: [{ userId: assessment.studentId }] }
      }
    });

    await audit(req.user!.id, 'assessment.assign', 'preliminary_assessment', assessmentId, 'success', { slotId });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

// PO: Grant Extension / Override
export const grantExtension = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assessmentId = req.params.assessmentId as string;
    const { newDeadline, reason } = req.body;

    const updated = await prisma.preliminaryAssessment.update({
      where: { id: assessmentId },
      data: { 
        deadline: new Date(newDeadline), 
        status: 'pending_scheduling',
        overrideReason: reason,
        overriddenBy: req.user!.id,
        overriddenAt: new Date()
      }
    });

    await audit(req.user!.id, 'assessment.extension', 'preliminary_assessment', assessmentId, 'success', { newDeadline, reason });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};