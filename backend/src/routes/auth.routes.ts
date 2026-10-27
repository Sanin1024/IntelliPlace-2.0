import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me } from '../controllers/auth.controller.js';
import { validate } from '../utils/validate.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const isEnforced = process.env.RATE_LIMIT_ENFORCE === 'true';
const isTestEnv = process.env.NODE_ENV === 'test' && !isEnforced;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestEnv ? 1000 : 10, // 10 failed attempts per 15 mins
  skipSuccessfulRequests: true,

  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many failed login attempts. Please try again after 15 minutes.',
  },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.',
  },
});

router.post('/register', registerLimiter, validate(registerSchema), register);

// Registered ONLY when NODE_ENV === 'test' AND requires admin JWT
if (process.env.NODE_ENV === 'test') {
  router.post(
    '/reset-limiter',
    requireAuth,
    requireRole('admin'),
    async (req, res) => {
      try {
        if (typeof (loginLimiter as any).resetKey === 'function') {
          if (typeof (loginLimiter as any).getKey === 'function') {
            try {
              const k = await (loginLimiter as any).getKey(req);
              if (k) await (loginLimiter as any).resetKey(k);
            } catch (e) {
              // ignore
            }
          }
          await (loginLimiter as any).resetKey(req.ip);
          await (loginLimiter as any).resetKey('::1');
          await (loginLimiter as any).resetKey('::/56');
          await (loginLimiter as any).resetKey('127.0.0.1');
          await (loginLimiter as any).resetKey('::ffff:127.0.0.1');
        }
      } catch (err) {
        // ignore
      }
      res.json({ success: true, message: 'Rate limiter reset' });
    }
  );
}

router.post(
  '/login',
  async (req, res, next) => {
    if (process.env.NODE_ENV === 'test' && req.headers['x-test-reset-limiter'] === 'true') {
      try {
        if (typeof (loginLimiter as any).resetKey === 'function') {
          await (loginLimiter as any).resetKey(req.ip);
          await (loginLimiter as any).resetKey('::1');
          await (loginLimiter as any).resetKey('127.0.0.1');
          await (loginLimiter as any).resetKey('::ffff:127.0.0.1');
        }
      } catch (err) {
        // ignore
      }
    }
    next();
  },
  loginLimiter,
  validate(loginSchema),
  login
);
router.get('/me', requireAuth, me);

export default router;