import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { uploadDir } from '../config/multer.js';
import {
  getStudentBranchContext,
  branchScopeFilter,
  assertStudentCanAccessContent,
  resolveBranchIdOrThrow,
} from '../middleware/departmentAccess.js';
import { canAccessResource } from '../services/resourceManagement.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/resources
 * Trainer uploads a file (multipart/form-data).
 * Expects: title, description (optional), topicId (optional), file
 */
export const uploadResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, topicId, branchId } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!file) {
      throw ApiError.badRequest('No file uploaded. Attach a file in the "file" field.');
    }

    // Validate topic if provided
    let topicIdNum: number | null = null;
    if (topicId) {
      topicIdNum = parseInt(topicId, 10);
      if (isNaN(topicIdNum)) throw ApiError.badRequest('topicId must be a number');
      const topic = await prisma.topic.findUnique({ where: { id: topicIdNum } });
      if (!topic) throw ApiError.badRequest('Topic not found');
    }

    // Department scoping: null/empty => global (all departments)
    const resolvedBranchId = await resolveBranchIdOrThrow(branchId);

    // Construct the public URL for the file
    const fileUrl = `/uploads/${file.filename}`;

    const resource = await prisma.resource.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        topicId: topicIdNum,
        branchId: resolvedBranchId,
        uploadedBy: req.user!.id,
      },
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: resource });
  } catch (err) {
    // If validation fails after file was already saved, clean up
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    if (uploadedFile) {
      const fullPath = path.join(__dirname, '..', '..', 'uploads', uploadedFile.filename);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    next(err);
  }
};

/**
 * GET /api/resources?topicId=&search=
 * All authenticated users can list resources.
 */
export const getAllResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : undefined;
    const search = req.query.search as string | undefined;
    const type = req.query.type as string | undefined; // Filter by file extension

    const where: any = {};
    if (topicId) where.topicId = topicId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Department scoping: students only see global resources + their own department's
    if (!['trainer', 'admin', 'po'].includes(req.user?.role || '')) {
      const branchCtx = await getStudentBranchContext(req);
      const branchFilter = branchScopeFilter(branchCtx);
      where.OR = search ? [...where.OR, branchFilter] : branchFilter.OR;
    }

    const resources = await prisma.resource.findMany({
      where,
      include: {
        topic: { select: { id: true, name: true } },
        branch: { select: { id: true, code: true, name: true } },
        uploader: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Optional: filter by file type (extension)
    let filtered = resources;
    if (type) {
      filtered = resources.filter((r: { fileUrl: string }) => {
        const ext = r.fileUrl.split('.').pop()?.toLowerCase();
        if (type === 'video') return ['mp4', 'avi', 'mkv'].includes(ext || '');
        if (type === 'pdf') return ext === 'pdf';
        if (type === 'document') return ['doc', 'docx', 'txt', 'md'].includes(ext || '');
        if (type === 'presentation') return ['ppt', 'pptx'].includes(ext || '');
        return true;
      });
    }

    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/resources/:id
 * Only the uploader (trainer) or admin can delete.
 */
export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) throw ApiError.notFound('Resource not found');

    // Check ownership
    const isOwner = resource.uploadedBy === req.user!.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('You can only delete resources you uploaded');
    }

    // Delete the physical file
    const filename = resource.fileUrl.replace('/uploads/', '');
    const fullPath = path.join(__dirname, '..', '..', 'uploads', filename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await prisma.resource.delete({ where: { id } });
    res.json({ success: true, data: { message: 'Resource deleted' } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/resources/:id/download
 * Authenticated stream download with security headers & path traversal check
 */
export const downloadResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params['id'] as string;
    if (!id || id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw ApiError.badRequest('Invalid resource identifier');
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: { branch: { select: { id: true, code: true } } },
    });
    if (!resource) throw ApiError.notFound('Resource not found');

    // Department + visibility authorization (backend-enforced, works for direct API calls)
    const allowed = await canAccessResource(req.user!, id);
    if (!allowed) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    await assertStudentCanAccessContent(req, resource.branchId);

    const filename = path.basename(resource.fileUrl);
    // Path check: make sure the resolved path stays inside uploadDir
    const safePath = path.resolve(uploadDir, filename);
    const normalizedUploadDir = path.resolve(uploadDir);

    if (!safePath.startsWith(normalizedUploadDir + path.sep) && safePath !== normalizedUploadDir) {
      throw ApiError.badRequest('Path traversal attempt rejected');
    }

    if (!fs.existsSync(safePath)) {
      throw ApiError.notFound('File not found on disk');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(safePath);
    stream.on('error', (streamErr) => {
      next(streamErr);
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};