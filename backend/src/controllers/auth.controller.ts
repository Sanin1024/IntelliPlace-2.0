import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

const SALT_ROUNDS = 10;

const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

/**
 * POST /api/auth/register
 * Always creates a student. Ignores any role field in the body.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, knowledgeLevel } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ALWAYS create as student — role is never taken from request body
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'student',
        studentProfile: {
          create: {
            knowledgeLevel: knowledgeLevel || 'beginner',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            placementStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been disabled. Contact admin.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const token = generateToken(user.id);

    // Never return passwordHash
    const { passwordHash, ...userWithoutHash } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutHash,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns current user info from token
 */
export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            placementStatus: true,
            branchId: true,
            batchId: true,
            resumeUrl: true,
            targetRole: true,
          },
        },
      },
    });

    if (!user) throw ApiError.notFound('User not found');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};