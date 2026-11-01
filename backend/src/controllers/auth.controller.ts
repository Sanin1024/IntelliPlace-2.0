import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';
import { audit } from '../services/audit.service.js';
import { validateAcademicMapping } from '../services/academic.service.js';
import { validateAndParseKTUID } from '../services/ktu.service.js';

const SALT_ROUNDS = 10;

const generateToken = (userId: string, tokenVersion: number = 0): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId, tv: tokenVersion }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};

/**
 * POST /api/auth/register
 * Challenge 21 & 22: Validates universityId, academic mapping, and catches duplicate P2002.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      email,
      password,
      ktuid,
      knowledgeLevel,
      universityId,
      branchId,
      batchId,
      admissionYear,
    } = req.body;

    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedName = (name || '').trim();
    const normalizedUnivId = universityId ? universityId.trim().toUpperCase() : null;

    // Validate KTUID and extract institutional academic info if provided
    let ktuData: any = null;
    if (ktuid) {
      ktuData = await validateAndParseKTUID(
        ktuid,
        branchId ? parseInt(branchId as string, 10) : undefined
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingEmail) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Check if universityId already exists
    if (normalizedUnivId) {
      const existingUniv = await prisma.studentProfile.findUnique({
        where: { universityId: normalizedUnivId },
      });
      if (existingUniv) {
        throw ApiError.conflict(`An account with university ID "${normalizedUnivId}" already exists.`);
      }
    }

    // Validate academic mapping if branch and batch are supplied
    if (branchId && batchId) {
      const validation = await validateAcademicMapping({
        branchId,
        batchId,
        admissionYear,
      });
      if (!validation.valid) {
        throw ApiError.badRequest(validation.error || 'Invalid academic cohort mapping');
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      const user = await prisma.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          passwordHash,
          role: 'student',
          studentProfile: {
            create: {
              knowledgeLevel: knowledgeLevel || 'beginner',
              universityId: normalizedUnivId || ktuData?.fullKTUID || null,
              ktuid: ktuData ? ktuData.fullKTUID : null,
              entryType: ktuData ? (ktuData.isLateral ? 'LATERAL' : 'REGULAR') : 'REGULAR',
              branchId: ktuData ? ktuData.branchId : (branchId || null),
              batchId: batchId || null,
              admissionYear: ktuData ? ktuData.admissionYear : (admissionYear || null),
              graduatingBatch: ktuData ? ktuData.graduatingBatch : null,
              academicScheme: 'APJKTU_2019',
              academicStatus: 'pending',
              profileUpdatedAt: new Date(),
              academicUpdatedAt: new Date(),
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          tokenVersion: true,
          studentProfile: {
            select: {
              universityId: true,
              ktuid: true,
              entryType: true,
              graduatingBatch: true,
              academicScheme: true,
              branchId: true,
              batchId: true,
              admissionYear: true,
              academicStatus: true,
            },
          },
        },
      });

      const token = generateToken(user.id, user.tokenVersion);

      await audit(
        user.id,
        'USER_REGISTERED',
        'user',
        user.id,
        'success',
        { email: user.email, universityId: normalizedUnivId, ip: req.ip }
      );

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (createErr: any) {
      if (createErr.code === 'P2002') {
        const target = createErr.meta?.target;
        if (Array.isArray(target) && target.includes('university_id')) {
          throw ApiError.conflict('An account with this university ID already exists');
        }
        throw ApiError.conflict('An account with this email or university ID already exists');
      }
      throw createErr;
    }
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
    const normalizedEmail = (email || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        studentProfile: {
          select: {
            knowledgeLevel: true,
            cgpa: true,
            cgpaVerified: true,
            placementStatus: true,
            universityId: true,
            academicStatus: true,
            admissionYear: true,
          },
        },
      },
    });

    if (!user) {
      await audit(normalizedEmail, 'auth.login_failure', 'user', normalizedEmail, 'failure', {
        reason: 'User not found',
      });
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      await audit(user.id, 'auth.login_failure', 'user', user.id, 'failure', {
        reason: 'Account disabled',
      });
      throw ApiError.forbidden('Your account has been disabled. Contact admin.');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    } catch {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      await audit(user.id, 'auth.login_failure', 'user', user.id, 'failure', {
        reason: 'Invalid credentials',
      });
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Challenge 257: Audit successful login
    await audit(user.id, 'auth.login_success', 'user', user.id, 'success');

    const token = generateToken(user.id, user.tokenVersion);

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
            cgpaVerified: true,
            academicStatus: true,
            placementStatus: true,
            universityId: true,
            admissionYear: true,
            branchId: true,
            batchId: true,
            resumeUrl: true,
            targetRole: true,
            branch: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true, graduationYear: true } },
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

/**
 * POST /api/auth/forgot-password
 * Challenge 28: Non-enumerating, sha256-hashed reset tokens.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    let devToken: string | undefined;

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      await audit(
        user.id,
        'PASSWORD_RESET_REQUESTED',
        'user',
        user.id,
        'success',
        { ip: req.ip }
      );

      devToken = rawToken;
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
      ...(process.env.NODE_ENV !== 'production' && devToken ? { resetToken: devToken } : {}),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Challenge 28 & 29: Single-use token verification and instant token revocation via tokenVersion.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetTokenRecord || !resetTokenRecord.user) {
      throw ApiError.badRequest('Invalid or expired password reset token.');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction(async (tx: any) => {
      // Mark token used
      await tx.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: new Date() },
      });

      // Update password & bump tokenVersion (killing all existing sessions)
      await tx.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          passwordHash: newHash,
          tokenVersion: { increment: 1 },
        },
      });

      // Send confirmation notification
      const notif = await tx.notification.create({
        data: {
          title: 'Password Reset Successful',
          message: 'Your account password was successfully reset. If you did not make this change, contact support immediately.',
          createdBy: resetTokenRecord.userId,
        },
      });

      await tx.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: resetTokenRecord.userId,
        },
      });
    });

    await audit(
      resetTokenRecord.userId,
      'PASSWORD_RESET_COMPLETED',
      'user',
      resetTokenRecord.userId,
      'success',
      { ip: req.ip }
    );

    res.json({
      success: true,
      message: 'Password reset successful. All active sessions have been invalidated. Please log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Challenge 29 & 30: Authenticated password change with tokenVersion invalidation.
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw ApiError.badRequest('Current password is incorrect.');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
      },
    });

    await audit(
      userId,
      'PASSWORD_CHANGED',
      'user',
      userId,
      'success',
      { ip: req.ip }
    );

    const newToken = generateToken(updated.id, updated.tokenVersion);

    res.json({
      success: true,
      message: 'Password changed successfully. Other sessions have been signed out.',
      data: { token: newToken },
    });
  } catch (err) {
    next(err);
  }
};
