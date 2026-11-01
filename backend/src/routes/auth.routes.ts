import { Router } from 'express';
import {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/auth.controller.js';
import { validate } from '../utils/validate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetLimiterKeys,
} from '../middleware/rateLimiter.js';

export { loginLimiter, registerLimiter, forgotPasswordLimiter };

const router = Router();

// Apply dedicated registration rate limiter
router.post('/register', registerLimiter, validate(registerSchema), register);

// Password recovery endpoints (Challenges 28 & 29)
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword);

// Maintenance / test reset endpoint: enabled ONLY in non-production environments
// and strictly gated behind admin authentication (requires valid admin JWT).
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/reset-limiter',
    requireAuth,
    requireRole('admin'),
    async (req, res) => {
      try {
        if (typeof (loginLimiter as any).getKey === 'function') {
          const k = await (loginLimiter as any).getKey(req);
          if (k) {
            await (loginLimiter as any).resetKey(k);
          }
        }
        await resetLimiterKeys(loginLimiter, req.ip);
        await resetLimiterKeys(registerLimiter, req.ip);
      } catch {
        // ignore errors during key reset
      }
      res.json({ success: true, message: 'Rate limiter reset' });
    }
  );
}

// Apply dedicated login rate limiter
router.post(
  '/login',
  async (req, res, next) => {
    // Optional testing header: allowed only in non-production environments
    if (
      process.env.NODE_ENV !== 'production' &&
      req.headers['x-test-reset-limiter'] === 'true'
    ) {
      await resetLimiterKeys(loginLimiter, req.ip);
    }
    next();
  },
  loginLimiter,
  validate(loginSchema),
  login
);

router.get('/me', requireAuth, me);

export default router;