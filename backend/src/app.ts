import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Fail fast on missing or placeholder JWT_SECRET
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.includes('<') || jwtSecret.length < 32) {
  throw new Error(
    'JWT_SECRET must be configured with a valid secret of at least 32 characters (cannot be a placeholder).'
  );
}

// Validate code runner config
const runnerEnabled = process.env.CODE_RUNNER_ENABLED === 'true';
const runnerLanguages = (process.env.CODE_RUNNER_LANGUAGES || 'python,javascript').split(',').map(s => s.trim());
const timeLimitMs = parseInt(process.env.CODE_TIME_LIMIT_MS || '2000', 10);
const outputLimitBytes = parseInt(process.env.CODE_OUTPUT_LIMIT_BYTES || '65536', 10);
const maxSourceBytes = parseInt(process.env.CODE_MAX_SOURCE_BYTES || '20000', 10);

if (isNaN(timeLimitMs) || timeLimitMs <= 0) {
  throw new Error('CODE_TIME_LIMIT_MS must be a positive integer');
}
if (isNaN(outputLimitBytes) || outputLimitBytes <= 0) {
  throw new Error('CODE_OUTPUT_LIMIT_BYTES must be a positive integer');
}
if (isNaN(maxSourceBytes) || maxSourceBytes <= 0) {
  throw new Error('CODE_MAX_SOURCE_BYTES must be a positive integer');
}

// Existing route imports
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import studentRoutes from './routes/student.routes.js';
import publicRoutes from './routes/public.routes.js';

// Phase 2 route imports
import questionRoutes from './routes/question.routes.js';
import problemRoutes from './routes/problem.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import practiceRoutes from './routes/practice.routes.js';
import notificationRoutes from './routes/notification.routes.js';

// Phase 3 route imports
import testRoutes from './routes/test.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

// Company and Placement Officer route imports
import companyRoutes from './routes/company.routes.js';
import poRoutes from './routes/po.routes.js';
import trainerRoutes from './routes/trainer.routes.js';

import { ApiError } from './utils/errors.js';
import { uploadDir } from './config/multer.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Determine CORS origin
const corsOrigin =
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(helmet());

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// ============================================================
// Static serving of /uploads removed — downloads are authenticated via GET /api/resources/:id/download

// ============================================================
// ROUTE MOUNTING
// ============================================================

// Existing routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/public', publicRoutes);

// Phase 2 routes
app.use('/api/questions', questionRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/notifications', notificationRoutes);

// Phase 3 routes
app.use('/api/tests', testRoutes);
app.use('/api/analytics', analyticsRoutes);

// Company and Placement Officer routes
app.use('/api/companies', companyRoutes);
app.use('/api/po', poRoutes);
app.use('/api/trainer', trainerRoutes);

// ============================================================
// 404 HANDLER
// Must come after all routes
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);

    // Prisma known errors
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
      });
    }

    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference — related record does not exist',
      });
    }

    // Multer upload errors
    if (err.name === 'MulterError' || (err.message && err.message.includes('not allowed'))) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }

    // Custom API errors
    if (err instanceof ApiError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }

    // Fallback for unexpected errors
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(`✅ IntelliPlace backend running on http://localhost:${PORT}`);
  console.log(`   CORS origin: ${corsOrigin}`);
  console.log(`   Code runner: ${runnerEnabled ? 'ENABLED' : 'DISABLED'} (languages: ${runnerLanguages.join(', ')})`);
  console.log('   Existing, Phase 2, Phase 3, company, PO, and coding runner routes registered.');
});


export default app;