import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

const router = Router();

// Public: list branches (for student profile dropdowns)
router.get('/branches', async (req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: branches });
  } catch (err) {
    console.error('GET /public/branches error:', err);
    res.status(500).json({ success: false, error: 'Failed to load branches' });
  }
});

// Public: list batches
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({ orderBy: { graduationYear: 'desc' } });
    res.json({ success: true, data: batches });
  } catch (err) {
    console.error('GET /public/batches error:', err);
    res.status(500).json({ success: false, error: 'Failed to load batches' });
  }
});

// Public: list topics
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const topics = await prisma.topic.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: topics });
  } catch (err) {
    console.error('GET /public/topics error:', err);
    res.status(500).json({ success: false, error: 'Failed to load topics' });
  }
});

export default router;