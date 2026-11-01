import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  loginLimiter,
  registerLimiter,
  resetLimiterKeys,
  LOGIN_MAX,
} from '../src/middleware/rateLimiter.js';

test('Authentication Rate Limiting & Security Suite', async (t) => {
  // Ensure limiters are clean before starting tests
  await resetLimiterKeys(loginLimiter);
  await resetLimiterKeys(registerLimiter);

  let adminToken = '';

  await t.test('1. Valid admin login succeeds with 200 and issues token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@intelliplace.edu',
        password: 'Admin@123',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data?.token);
    assert.strictEqual(res.body.data?.user?.email, 'admin@intelliplace.edu');
    assert.strictEqual(res.body.data?.user?.role, 'admin');

    adminToken = res.body.data.token;
  });

  await t.test('2. Successful logins do NOT consume the failed-login rate-limit counter', async () => {
    // Send 12 consecutive successful logins (exceeding LOGIN_MAX if successes were counted)
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@intelliplace.edu',
          password: 'Admin@123',
        });
      assert.strictEqual(res.status, 200, `Login attempt ${i + 1} should succeed with 200`);
    }
  });

  await t.test('3. Invalid credentials return 401 and are counted', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@intelliplace.edu',
        password: 'WrongPassword@999',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'Invalid email or password');
  });

  await t.test('4. Repeated failed login attempts eventually trigger HTTP 429 Too Many Requests', async () => {
    // We already performed 1 failed attempt above.
    // Send additional failed attempts up to LOGIN_MAX
    const remainingToLimit = LOGIN_MAX - 1;
    for (let i = 0; i < remainingToLimit; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@intelliplace.edu',
          password: 'WrongPassword@999',
        });
      assert.strictEqual(res.status, 401, `Failed attempt ${i + 2} should return 401`);
    }

    // The next failed attempt must trigger 429
    const blockedRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@intelliplace.edu',
        password: 'WrongPassword@999',
      });

    assert.strictEqual(blockedRes.status, 429, 'Next attempt should be blocked with 429');
    assert.strictEqual(blockedRes.body.success, false);
    assert.strictEqual(
      blockedRes.body.error,
      'Too many failed login attempts. Please try again later.'
    );
    assert.ok(
      blockedRes.body.retryAfter > 0,
      'Response body should contain retryAfter seconds'
    );
    assert.ok(
      blockedRes.headers['retry-after'],
      'Response headers should contain Retry-After'
    );
    assert.ok(
      blockedRes.headers['ratelimit-limit'],
      'Response headers should contain RateLimit-Limit'
    );
  });

  await t.test('5. Login and registration policies are independent (registration remains unblocked)', async () => {
    // Even though login is currently in 429 for this IP, registration must NOT be blocked!
    const uniqueEmail = `test-ratelimit-${Date.now()}@student.edu`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Rate Limit Test User',
        email: uniqueEmail,
        password: 'Student@123',
        knowledgeLevel: 'beginner',
      });

    assert.strictEqual(
      res.status,
      201,
      'Registration must succeed even when login rate limit is active'
    );
    assert.strictEqual(res.body.success, true);
  });

  await t.test('6. POST /api/auth/reset-limiter is gated properly', async () => {
    // 6a. Unauthenticated reset fails with 401
    const unauthRes = await request(app)
      .post('/api/auth/reset-limiter')
      .send({});
    assert.strictEqual(unauthRes.status, 401);

    // 6b. Student token reset fails with 403
    const studentRes = await request(app)
      .post('/api/auth/login')
      .set('x-test-reset-limiter', 'true') // unblock login for student
      .send({
        email: 'alice@student.edu',
        password: 'Student@123',
      });
    const studentToken = studentRes.body.data.token;

    const studentResetRes = await request(app)
      .post('/api/auth/reset-limiter')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    assert.strictEqual(studentResetRes.status, 403);

    // 6c. Admin token reset succeeds with 200
    const adminResetRes = await request(app)
      .post('/api/auth/reset-limiter')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    assert.strictEqual(adminResetRes.status, 200);
    assert.strictEqual(adminResetRes.body.success, true);

    // 6d. Login should now be immediately unblocked
    const unblockedRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@intelliplace.edu',
        password: 'Admin@123',
      });
    assert.strictEqual(unblockedRes.status, 200);
  });

  // Final cleanup
  await resetLimiterKeys(loginLimiter);
  await resetLimiterKeys(registerLimiter);

  // Clean up any registered test users to keep database clean
  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: 'ratelimit-' } },
      select: { id: true },
    });
    const ids = testUsers.map((u) => u.id);
    if (ids.length > 0) {
      await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  } catch (err) {
    console.warn('Failed to clean up test users in auth test:', err);
  }
});

