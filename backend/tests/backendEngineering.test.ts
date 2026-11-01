// Challenges 201–220: Backend & API Engineering Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { getPaginationParams, buildPaginationMeta } from '../src/utils/pagination.js';
import { asyncHandler } from '../src/utils/asyncHandler.js';

test('Backend & API Engineering: Challenges 201–220 Suite', async (t) => {
  // ============================================================
  // Challenge 201: Request ID Generation & Propagation
  // ============================================================
  await t.test('Challenge 201: API generates and returns X-Request-Id header', async () => {
    const res = await request(app).get('/api/health');
    assert.ok([200, 503].includes(res.status), `Status must be 200 or 503, got ${res.status}`);
    assert.ok(res.headers['x-request-id'], 'Header X-Request-Id must be defined');
    assert.strictEqual(typeof res.headers['x-request-id'], 'string');
  });

  await t.test('Challenge 201: API preserves incoming X-Request-Id header', async () => {
    const customId = 'test-trace-uuid-12345';
    const res = await request(app).get('/api/health').set('x-request-id', customId);
    assert.ok([200, 503].includes(res.status), `Status must be 200 or 503, got ${res.status}`);
    assert.strictEqual(res.headers['x-request-id'], customId, 'Header must mirror incoming correlation ID');
  });

  // ============================================================
  // Challenge 201, 207, 211: Standardized Error Responses
  // ============================================================
  await t.test('Challenge 201/207: Unknown route returns 404 with standardized JSON', async () => {
    const res = await request(app).get('/api/nonexistent-system-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.error.includes('Route not found'));
  });

  await t.test('Challenge 207: Malformed JSON payload returns 400 error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ "email": "bad json format');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Challenge 210: Zod validation failure returns 400 with details and requestId', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-a-valid-email', password: '123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.details, 'Zod details array must be present');
  });

  await t.test('Challenge 207: Invalid credentials return 401, not 500 or 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent.user@intelliplace.edu', password: 'WrongPassword@123' });
    // In live DB mode this returns 401; in offline mode it returns 503 (database unavailable). Neither is 200 or 500 unhandled!
    assert.ok([401, 503].includes(res.status), `Status must be 401 (or 503 offline), got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  // ============================================================
  // Challenge 214: Standardized Pagination Utility Logic
  // ============================================================
  await t.test('Challenge 214: getPaginationParams parses and bounds page and limit', () => {
    const p1 = getPaginationParams({ page: '2', limit: '25' });
    assert.strictEqual(p1.page, 2);
    assert.strictEqual(p1.limit, 25);
    assert.strictEqual(p1.skip, 25);

    // Bounding tests: negative or NaN values
    const p2 = getPaginationParams({ page: '-5', limit: '0' });
    assert.strictEqual(p2.page, 1);
    assert.strictEqual(p2.limit, 10); // default
    assert.strictEqual(p2.skip, 0);

    // Max limit constraint (100)
    const p3 = getPaginationParams({ limit: '500' });
    assert.strictEqual(p3.limit, 100);

    // Meta calculation
    const meta = buildPaginationMeta(2, 20, 85);
    assert.strictEqual(meta.page, 2);
    assert.strictEqual(meta.limit, 20);
    assert.strictEqual(meta.total, 85);
    assert.strictEqual(meta.totalPages, 5); // ceil(85/20) = 5
  });

  // ============================================================
  // Challenge 215 & 217: Async Handler Utility
  // ============================================================
  await t.test('Challenge 215/217: asyncHandler catches async rejections and forwards to next()', async () => {
    let capturedError: any = null;
    const mockNext = (err: any) => {
      capturedError = err;
    };

    const faultyController = async () => {
      throw new Error('Async promise rejection test');
    };

    const wrapped = asyncHandler(faultyController);
    wrapped({} as any, {} as any, mockNext);

    // Allow promise tick to resolve
    await new Promise((resolve) => setImmediate(resolve));
    assert.ok(capturedError instanceof Error);
    assert.strictEqual(capturedError.message, 'Async promise rejection test');
  });

  // ============================================================
  // Challenge 213: Rate Limiting Header Verification
  // ============================================================
  await t.test('Challenge 213: Rate limiter standard headers are present on API responses', async () => {
    const res = await request(app).get('/api/health');
    assert.ok([200, 503].includes(res.status), `Status must be 200 or 503, got ${res.status}`);
    assert.ok(
      res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
      'Rate limit headers must be provided'
    );
  });
});
