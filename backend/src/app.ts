import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { Prisma, prisma } from './config/prisma.js';
import { validateEnv } from './utils/envValidation.js';
import { secureRequestLogger } from './middleware/secureLogger.js';

dotenv.config();
validateEnv();

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import studentRoutes from './routes/student.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import publicRoutes from './routes/public.routes.js';

import questionRoutes from './routes/question.routes.js';
import problemRoutes from './routes/problem.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import practiceRoutes from './routes/practice.routes.js';
import notificationRoutes from './routes/notification.routes.js';

import testRoutes from './routes/test.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

import companyRoutes from './routes/company.routes.js';
import prepPlanRoutes from './routes/prepPlan.routes.js';
import poRoutes from './routes/po.routes.js';
import trainerRoutes from './routes/trainer.routes.js';
import auditRoutes from './routes/audit.routes.js';
import driveRoutes from './routes/drive.routes.js';
import eligibilityRoutes from './routes/eligibility.routes.js';
import academicRoutes from './routes/academic.routes.js';
import trainingRoutes from './routes/training.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import resumeManagementRoutes from './routes/resumeManagement.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import applicationRoutes from './routes/application.routes.js';
import offerRoutes from './routes/offer.routes.js';
import adminManagementRoutes from './routes/adminManagement.routes.js';
import privacyRoutes from './routes/privacy.routes.js';
import emnsRoutes from './routes/emns.routes.js';
import studentMasterProfileRoutes from './routes/studentMasterProfile.routes.js';
import companyDataRequirementRoutes from './routes/companyDataRequirement.routes.js';
import mechanicalTrainingRoutes from './routes/mechanicalTraining.routes.js';
import civilTrainingRoutes from './routes/civilTraining.routes.js';
import eeeTrainingRoutes from './routes/eeeTraining.routes.js';
import itTrainingRoutes from './routes/itTraining.routes.js';
import { processScheduledReminder } from './services/emns.service.js';
import { evaluateRetention } from './services/privacy.service.js';
import {
  processPendingDriveNotifications,
  sendDeadlineReminders,
} from './services/driveNotification.service.js';
import { sendTrainingReminders } from './services/trainingSchedule.service.js';
import { runAllLinkChecks } from './services/resourceManagement.service.js';
import { sendInterviewReminders } from './services/interview.service.js';
import { processNotificationQueue } from './services/notificationDispatcher.service.js';

// Preliminary assessment and system settings
import settingsRoutes from './routes/settings.routes.js';
import assessmentRoutes from './routes/assessment.routes.js';
import { getMyAssessment } from './controllers/studentAssessment.controller.js';

import { getAdminDashboardStats } from './controllers/dashboardStats.controller.js';
import { requireAuth, requireRole } from './middleware/auth.js';

import { ApiError } from './utils/errors.js';
import './config/multer.js';

dotenv.config();

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const jwtSecret = process.env.JWT_SECRET;

const isPlaceholderJwt =
  !jwtSecret ||
  jwtSecret.includes('<') ||
  jwtSecret.length < 32 ||
  /replace[-_]with|your[-_]super[-_]secret|placeholder|change_me/i.test(
    jwtSecret
  );

if (isPlaceholderJwt) {
  throw new Error(
    'JWT_SECRET must be configured with a valid secret of at least 32 characters (cannot be a placeholder or default string).'
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
  throw new Error(
    'DATABASE_URL must be configured with a valid PostgreSQL connection string.'
  );
}

if (process.env.NODE_ENV === 'production') {
  if (databaseUrl.includes('intelliplace_dev_only')) {
    throw new Error(
      'DATABASE_URL contains default development credentials which are forbidden in production.'
    );
  }

  if (jwtSecret.length < 64) {
    throw new Error(
      'In production, JWT_SECRET must be at least 64 characters (recommended 64-byte hex string).'
    );
  }
}

// ============================================================
// CODE RUNNER CONFIGURATION
// ============================================================

const runnerEnabled = process.env.CODE_RUNNER_ENABLED === 'true';

const runnerLanguages = (
  process.env.CODE_RUNNER_LANGUAGES || 'python,javascript'
)
  .split(',')
  .map((language) => language.trim())
  .filter(Boolean);

const timeLimitMs = Number.parseInt(
  process.env.CODE_TIME_LIMIT_MS || '2000',
  10
);

const outputLimitBytes = Number.parseInt(
  process.env.CODE_OUTPUT_LIMIT_BYTES || '65536',
  10
);

const maxSourceBytes = Number.parseInt(
  process.env.CODE_MAX_SOURCE_BYTES || '20000',
  10
);

if (!Number.isSafeInteger(timeLimitMs) || timeLimitMs <= 0) {
  throw new Error('CODE_TIME_LIMIT_MS must be a positive integer');
}

if (!Number.isSafeInteger(outputLimitBytes) || outputLimitBytes <= 0) {
  throw new Error('CODE_OUTPUT_LIMIT_BYTES must be a positive integer');
}

if (!Number.isSafeInteger(maxSourceBytes) || maxSourceBytes <= 0) {
  throw new Error('CODE_MAX_SOURCE_BYTES must be a positive integer');
}

// ============================================================
// EXPRESS APPLICATION
// ============================================================

const app = express();

const PORT = process.env.PORT || 4000;

const corsOrigin =
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

// ============================================================
// PROXY CONFIGURATION (Challenge 212)
// ============================================================

app.set('trust proxy', 1);

// ============================================================
// MIDDLEWARE (Challenges 201, 212, 213, 216)
// ============================================================

// 1. Security Headers (Challenge 247)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", 'http://localhost:4000', 'http://localhost:5173'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"], // Block Flash/Java applets
        frameSrc: ["'none'"], // Block iframes (clickjacking protection)
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// 2. CORS
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// 3. Body parsing middleware (payload size limits - Challenge 216)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Secure Request Logger (Challenge 258)
app.use(secureRequestLogger);

// 4. Request Correlation ID (Challenge 201)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// 5. Rate Limiting (Challenge 213)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Uploaded files are not publicly accessible through static URLs.
// Resource downloads must use authenticated API endpoints.

// ============================================================
// ROUTE MOUNTING
// ============================================================

// Health and authentication
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// ============================================================
// ADMINISTRATION
// ============================================================

// System settings: admin-only
app.use(
  '/api/admin/settings',
  requireAuth,
  requireRole('admin'),
  settingsRoutes
);

// Audit logs: admin-only
app.use(
  '/api/admin/audit-logs',
  requireAuth,
  requireRole('admin'),
  auditRoutes
);

// Dashboard statistics: admin-only
app.get(
  '/api/admin/dashboard-stats',
  requireAuth,
  requireRole('admin'),
  getAdminDashboardStats
);

// General administration routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminManagementRoutes);

// ============================================================
// PRELIMINARY ASSESSMENTS
// ============================================================

// Assessment scheduling and management.
// Apply the appropriate authentication and role restrictions
// inside assessment.routes.ts for each route.
app.use('/api/assessments', assessmentRoutes);

// Get the authenticated student's preliminary assessment.
// Register this explicit route before the general student router.
app.get(
  '/api/students/me/assessment',
  requireAuth,
  requireRole('student'),
  getMyAssessment
);

// ============================================================
// STUDENT ROUTES
// ============================================================

app.use('/api/students', studentRoutes);

// Resume routes share the student API prefix.
// Example: /api/students/resume
app.use('/api/students', resumeRoutes);

// ============================================================
// PUBLIC ROUTES
// ============================================================

app.use('/api/public', publicRoutes);

// ============================================================
// PHASE 2 ROUTES
// ============================================================

app.use('/api/questions', questionRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/notifications', notificationRoutes);

// ============================================================
// PHASE 3 ROUTES
// ============================================================

app.use('/api/tests', testRoutes);
app.use('/api/analytics', analyticsRoutes);

// ============================================================
// COMPANIES, PREPARATION PLANS, AND PLACEMENT OFFICERS
// ============================================================

app.use('/api/companies', prepPlanRoutes);
app.use('/api/companies', companyRoutes);

app.use('/api/drives', driveRoutes);
app.use('/api/drives', eligibilityRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/reco', recommendationRoutes);
app.use('/api/resumes', resumeManagementRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/privacy', privacyRoutes); // Challenges 326–335: Data Privacy & Compliance
app.use('/api/emns', emnsRoutes); // Enterprise Mass Notification System (EMNS)
app.use('/api/master-profile', studentMasterProfileRoutes); // Centralized Student Master Profile
app.use('/api/company-requirements', companyDataRequirementRoutes); // Dynamic Company-Specific Data Generation
app.use('/api/mechanical-training', mechanicalTrainingRoutes); // Mechanical Engineering Placement Training Module
app.use('/api/civil-training', civilTrainingRoutes); // Civil Engineering Placement Training Module
app.use('/api/eee-training', eeeTrainingRoutes); // Electrical and Electronics Engineering Placement Training Module
app.use('/api/it-training', itTrainingRoutes); // Information Technology Placement Training Module

// Admin retry endpoint for drive notifications
app.post(
  '/api/admin/drives/notifications/retry-pending',
  requireAuth,
  requireRole('admin'),
  async (_req, res, next) => {
    try {
      const results = await processPendingDriveNotifications();
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }
);

app.use('/api/po', poRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/trainers', trainerRoutes);

// ============================================================
// 404 HANDLER
// Must come after all application routes.
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER & SANITIZATION
// ============================================================

/**
 * Strips database credentials, passwords, and bearer tokens
 * from error strings before logging.
 */
function sanitizeErrorForLogging(err: any): string {
  if (!err) return '';

  const errorText =
    typeof err === 'string'
      ? err
      : err.stack || err.message || String(err);

  return errorText
    .replace(
      /(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi,
      '$1[REDACTED]$2'
    )
    .replace(
      /(Bearer\s+)[a-zA-Z0-9_\-.]{10,}/gi,
      '$1[REDACTED]'
    )
    .replace(/(JWT_SECRET=)[^\s]+/gi, '$1[REDACTED]');
}

/**
 * Strips internal connection strings and credentials
 * from client-facing error messages.
 */
function sanitizeClientErrorMessage(message: string): string {
  if (!message) return 'Request failed';

  return message
    .replace(
      /(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi,
      '$1[REDACTED]$2'
    )
    .replace(
      /(Bearer\s+)[a-zA-Z0-9_\-.]{10,}/gi,
      '$1[REDACTED]'
    );
}

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }

    const requestId = (req.headers['x-request-id'] as string) || undefined;
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] ${timestamp} RequestID: ${requestId} Path: ${req.path}`, sanitizeErrorForLogging(err));

    // Custom API errors (Challenge 207)
    if (err instanceof ApiError) {
      return res.status(err.status).json({
        success: false,
        error: sanitizeClientErrorMessage(err.message),
        ...(err.details ? { details: err.details } : {}),
        requestId,
      });
    }

    // Prisma: unique constraint violation (Challenge 211)
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Conflict: A record with this value already exists.',
        requestId,
      });
    }

    // Prisma: record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found.',
        requestId,
      });
    }

    // Prisma: invalid related record
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference — related record does not exist',
        requestId,
      });
    }

    // Prisma validation error
    if (err instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data format provided.',
        requestId,
      });
    }

    // Zod validation error
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors,
        requestId,
      });
    }

    // File upload errors
    if (
      err.name === 'MulterError' ||
      (typeof err.message === 'string' &&
        err.message.includes('not allowed'))
    ) {
      return res.status(400).json({
        success: false,
        error: sanitizeClientErrorMessage(err.message),
        requestId,
      });
    }

    // Database connection errors
    if (
      err.code === 'ECONNREFUSED' ||
      err.name === 'PrismaClientInitializationError' ||
      (typeof err.message === 'string' &&
        (err.message.includes('ECONNREFUSED') ||
          err.message.includes("Can't reach database server")))
    ) {
      return res.status(503).json({
        success: false,
        error:
          'Database service is unavailable. Please ensure PostgreSQL is running and DATABASE_URL is correct.',
        requestId,
      });
    }

    // Unexpected server errors (Challenge 201)
    const status =
      Number.isInteger(err.status) &&
      err.status >= 400 &&
      err.status < 600
        ? err.status
        : 500;

    return res.status(status).json({
      success: false,
      error:
        status >= 500
          ? 'Internal Server Error'
          : sanitizeClientErrorMessage(
              err.message || 'Request failed'
            ),
      requestId,
    });
  }
);

// ============================================================
// PROCESS-LEVEL SAFETY (Challenge 217)
// ============================================================
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// ============================================================
// START SERVER
// ============================================================

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.execArgv.includes('--test') ||
  process.argv.some((arg) => /test/i.test(arg)) ||
  Boolean(process.env.NODE_TEST_CONTEXT);

if (!isTestEnv) {
  app.listen(PORT, () => {
    console.log(
      `IntelliPlace backend running on http://localhost:${PORT}`
    );

    console.log(`CORS origin: ${corsOrigin}`);

    console.log(
      `Code runner: ${runnerEnabled ? 'ENABLED' : 'DISABLED'} ` +
        `(languages: ${runnerLanguages.join(', ')})`
    );

    console.log(
      'Routes registered: health, auth, admin, admin settings, ' +
        'audit logs, dashboard stats, students, resumes, public, ' +
        'assessments, questions, problems, resources, practice, ' +
        'notifications, tests, analytics, companies, placement officers, ' +
        'and trainers.'
    );

    console.log(
      'Authentication rate limiting: isolated login (failed attempts only) and registration policies active.'
    );

    // Background retry pass for drive notifications and deadline reminders
    setInterval(() => {
      processPendingDriveNotifications().catch((e: any) =>
        console.error('notif-retry-failed', e?.message || e)
      );
      sendDeadlineReminders().catch((e: any) =>
        console.error('reminders-failed', e?.message || e)
      );
      sendTrainingReminders().catch((e: any) =>
        console.error('training-reminders-failed', e?.message || e)
      );
      runAllLinkChecks().catch((e: any) =>
        console.error('link-checks-failed', e?.message || e)
      );
      sendInterviewReminders().catch((e: any) =>
        console.error('interview-reminders-failed', e?.message || e)
      );
      processNotificationQueue().catch((e: any) =>
        console.error('notif-dispatch-failed', e?.message || e)
      );
      evaluateRetention().catch((e: any) =>
        console.error('retention-evaluation-failed', e?.message || e)
      );
    }, 10 * 60 * 1000).unref();

    // Enterprise Mass Notification System (EMNS) Worker: Runs every minute
    setInterval(async () => {
      try {
        const dueSchedules = await prisma.notificationSchedule.findMany({
          where: {
            status: 'pending',
            scheduledAt: { lte: new Date() },
          },
          take: 10,
        });

        for (const s of dueSchedules) {
          processScheduledReminder(s.id).catch((err: any) => {
            console.error(`EMNS Error processing schedule ${s.id}:`, err?.message || err);
            prisma.notificationSchedule
              .updateMany({
                where: { id: s.id, status: 'processing' },
                data: { status: 'pending', lockedAt: null },
              })
              .catch(() => {});
          });
        }
      } catch (err: any) {
        console.error('EMNS Worker loop failed:', err?.message || err);
      }
    }, 60 * 1000).unref();
  });
}

export default app;