/**
 * Environment Variable Startup Validation & Redaction
 * Challenge 253: Validate critical environment variables on startup and redact secrets.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'PORT',
  'NODE_ENV',
];

const SENSITIVE_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'SMTP_PASS',
  'VAPID_PRIVATE_KEY',
];

/**
 * Validates that all required environment variables are set.
 * Called on application startup. Exits process if critical vars are missing in production/dev.
 */
export function validateEnv(): void {
  const isTest =
    process.env.NODE_ENV === 'test' ||
    process.execArgv.includes('--test') ||
    process.argv.some((arg) => /test/i.test(arg)) ||
    Boolean(process.env.NODE_TEST_CONTEXT);

  const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    if (!isTest) {
      console.error('❌ FATAL: Missing required environment variables:', missing.join(', '));
      console.error('   Copy .env.example to .env and fill in the values.');
      process.exit(1);
    } else {
      console.warn('⚠️ [Test Mode] Missing env vars (mocked or skipped):', missing.join(', '));
    }
  }

  // Warn about weak JWT secret
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long.');
  }

  // Warn about production secrets in production
  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.JWT_SECRET === 'change-this-to-a-long-random-string' ||
      process.env.JWT_SECRET === 'default_secret'
    ) {
      console.error('❌ FATAL: Default JWT_SECRET detected in production. Change it immediately.');
      process.exit(1);
    }
  }
}

/**
 * Redacts sensitive values from objects before logging.
 */
export function redactSensitive(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const redacted: Record<string, any> = { ...data };
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_ENV_VARS.some((s) => lowerKey.includes(s.toLowerCase().split('_')[0]))) {
      redacted[key] = '[REDACTED]';
    }
    if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

