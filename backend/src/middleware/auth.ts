import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'student' | 'po' | 'trainer' | 'admin';
  name: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim().length === 0) {
      throw ApiError.unauthorized('Missing or invalid authorization header');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const payload = jwt.verify(token, secret) as {
      userId?: string;
      tv?: number;
    };

    if (!payload?.userId) {
      throw ApiError.unauthorized('Invalid token payload');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.isActive) throw ApiError.forbidden('Account is disabled');

    // Challenge 29 & 30: Instant token revocation on tokenVersion mismatch
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion) {
      throw ApiError.unauthorized('Session has been revoked. Please log in again.');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as AuthUser['role'],
      name: user.name,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next(err);
  }
};

const ROLE_HIERARCHY: Record<string, number> = {
  student: 0,
  trainer: 1, // Tutor
  po: 2,      // Placement & Training Officer
  admin: 3
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const userRole = (req.user.role || '').toLowerCase();
    const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
    
    // Check if the user's hierarchy level meets the minimum requirement of any allowed role
    const hasAccess = allowedRoles.some(requiredRole => {
      const requiredLevel = ROLE_HIERARCHY[requiredRole.toLowerCase()] ?? 99;
      return userLevel >= requiredLevel;
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }
    next();
  };
};