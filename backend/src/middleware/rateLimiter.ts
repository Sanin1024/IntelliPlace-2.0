import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options } from 'express-rate-limit';

/**
 * Safely parse a positive integer from environment variables.
 * Falls back to defaultValue if undefined or invalid.
 */
function parsePositiveInt(val: string | undefined, defaultValue: number): number {
  if (!val) return defaultValue;
  const parsed = Number.parseInt(val, 10);
  if (Number.isSafeInteger(parsed) && parsed > 0) {
    return parsed;
  }
  console.warn(`[RateLimitConfig] Invalid value "${val}" for rate limit setting. Falling back to ${defaultValue}`);
  return defaultValue;
}

const isProd = process.env.NODE_ENV === 'production';

// Configuration: Defaults to 15 minutes window
export const LOGIN_WINDOW_MS = parsePositiveInt(
  process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);

// Max failed login attempts per window: default 10
export const LOGIN_MAX = parsePositiveInt(
  process.env.AUTH_LOGIN_RATE_LIMIT_MAX,
  10
);

// Registration window: default 15 minutes
export const REGISTER_WINDOW_MS = parsePositiveInt(
  process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS,
  15 * 60 * 1000
);

// Max registration attempts per window: 10 in production, 20 in development
export const REGISTER_MAX = parsePositiveInt(
  process.env.AUTH_REGISTER_RATE_LIMIT_MAX,
  isProd ? 10 : 20
);

/**
 * Standard 429 JSON response handler adhering to RFC 6585 and RFC 7231 Retry-After.
 */
const rateLimitHandler = (
  errorMessage: string,
  defaultWindowMs: number
) => {
  return (req: Request, res: Response, _next: NextFunction, options: Options) => {
    const retryAfterHeader = res.getHeader('Retry-After');
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(String(retryAfterHeader), 10)
      : Math.ceil(defaultWindowMs / 1000);

    return res.status(options.statusCode || 429).json({
      success: false,
      error: errorMessage,
      retryAfter: Number.isSafeInteger(retryAfterSeconds) ? retryAfterSeconds : Math.ceil(defaultWindowMs / 1000),
    });
  };
};

/**
 * Rate limiter for POST /api/auth/login.
 *
 * Key protections:
 * 1. skipSuccessfulRequests: true - Successful logins do NOT consume the failed attempt allowance.
 * 2. Only counts failed requests (401, 400, etc.) to defend against brute-force password guessing.
 * 3. Skips CORS OPTIONS preflights.
 * 4. Sends standard headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset).
 */
export const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  limit: LOGIN_MAX,
  skipSuccessfulRequests: true,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many requests: too many failed login attempts. Please try again later.',
    LOGIN_WINDOW_MS
  ),
});

/**
 * Rate limiter for POST /api/auth/register.
 *
 * Dedicated policy protecting against automated account registration / spam.
 * Operates independently from loginLimiter.
 */
export const registerLimiter = rateLimit({
  windowMs: REGISTER_WINDOW_MS,
  limit: REGISTER_MAX,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many registration attempts. Please try again later.',
    REGISTER_WINDOW_MS
  ),
});

/**
 * Challenge 28: Rate limiter for POST /api/auth/forgot-password.
 * Protects against password reset spam and enumeration attempts (5 req / 15 min in prod).
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProd ? 5 : 50,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many password reset attempts. Please try again later.',
    15 * 60 * 1000
  ),
});

/**
 * Helper to reset rate-limit keys during automated tests or authorized administrative maintenance.
 */
export async function resetLimiterKeys(limiter: any, ip?: string): Promise<void> {
  if (!limiter) return;

  if (limiter.store && typeof limiter.store.resetAll === 'function') {
    try {
      await limiter.store.resetAll();
    } catch {}
  }

  if (typeof limiter.resetKey === 'function') {
    const targets = new Set<string>();
    if (ip) targets.add(ip);
    targets.add('127.0.0.1');
    targets.add('::1');
    targets.add('::ffff:127.0.0.1');
    targets.add('::/56');
    targets.add('unknown');

    for (const target of targets) {
      try {
        await limiter.resetKey(target);
      } catch {
        // Ignore key errors for non-existent keys
      }
    }
  }
}
