import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'set-cookie',
  'vapid',
];

/**
 * Request logging middleware that redacts sensitive information.
 * Challenge 258: Never log passwords, tokens, or credentials.
 */
export function secureRequestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.headers['x-request-id'],
    userAgent: req.headers['user-agent']?.toString().slice(0, 100),
  };

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // In test environment, keep console clean unless debugging
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (status >= 400) {
      console.warn(`[API] ${status} ${req.method} ${req.path} ${duration}ms`, logData);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${status} ${req.method} ${req.path} ${duration}ms`);
    }
  });

  next();
}

/**
 * Sanitizes an object for safe logging by recursively redacting sensitive keys.
 */
export function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForLogging);

  const sanitized: Record<string, any> = { ...obj };
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  return sanitized;
}

