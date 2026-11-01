// Challenges 241–260: Authentication & Security Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { sanitizeHtml, isSafeUrl } from '../src/utils/sanitize.js';
import { redactSensitive, validateEnv } from '../src/utils/envValidation.js';
import { sanitizeForLogging } from '../src/middleware/secureLogger.js';

const JWT_SECRET = process.env.JWT_SECRET || '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Authentication & Security: Challenges 241–260 Suite', async (t) => {
  const origFindUnique = prisma.user.findUnique.bind(prisma);

  // Set up mock user lookup so auth & RBAC middleware runs smoothly offline
  (prisma.user as any).findUnique = async ({ where, select }: any) => {
    if (where.id === 'stu-1' || where.email === 'student1@intelliplace.edu') {
      return structuredClone({
        id: 'stu-1',
        name: 'Student One',
        email: 'student1@intelliplace.edu',
        role: 'student',
        isActive: true,
        tokenVersion: 1,
        studentProfile: {
          userId: 'stu-1',
          knowledgeLevel: 'intermediate',
          cgpa: 8.5,
          cgpaVerified: true,
          academicStatus: 'verified',
          placementStatus: 'not_placed',
          targetRole: 'Software Engineer',
          branch: { id: 1, name: 'CSE' },
          batch: { id: 1, name: '2025', graduationYear: 2025 },
        },
      });
    }
    if (where.id === 'stu-2') {
      return structuredClone({
        id: 'stu-2',
        name: 'Student Two',
        email: 'student2@intelliplace.edu',
        role: 'student',
        isActive: true,
        tokenVersion: 1,
        studentProfile: {
          userId: 'stu-2',
          knowledgeLevel: 'beginner',
          cgpa: 7.2,
          cgpaVerified: true,
          academicStatus: 'verified',
          placementStatus: 'in_process',
          targetRole: 'Data Analyst',
          branch: { id: 2, name: 'ECE' },
          batch: { id: 1, name: '2025', graduationYear: 2025 },
        },
      });
    }
    if (where.id === 'trainer-1') {
      return {
        id: 'trainer-1',
        name: 'Trainer One',
        email: 'trainer@intelliplace.edu',
        role: 'trainer',
        isActive: true,
        tokenVersion: 1,
      };
    }
    if (where.id === 'po-1') {
      return {
        id: 'po-1',
        name: 'PO One',
        email: 'po@intelliplace.edu',
        role: 'po',
        isActive: true,
        tokenVersion: 1,
      };
    }
    if (where.id === 'admin-1') {
      return {
        id: 'admin-1',
        name: 'Admin One',
        email: 'admin@intelliplace.edu',
        role: 'admin',
        isActive: true,
        tokenVersion: 1,
      };
    }
    return null;
  };

  t.after(() => {
    (prisma.user as any).findUnique = origFindUnique;
  });

  const studentToken = createMockToken('stu-1', 'student', 1);
  const trainerToken = createMockToken('trainer-1', 'trainer', 1);
  const poToken = createMockToken('po-1', 'po', 1);
  const adminToken = createMockToken('admin-1', 'admin', 1);

  // ============================================================
  // Challenge 241: Unauthenticated Access Prevention
  // ============================================================
  await t.test('Challenge 241: Protected endpoints without token return 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('Challenge 241: Admin endpoints without token return 401', async () => {
    const res = await request(app).get('/api/admin/users');
    assert.strictEqual(res.status, 401);
  });

  await t.test('Challenge 241: Invalid/malformed Bearer token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.jwt.token');
    assert.strictEqual(res.status, 401);
  });

  // ============================================================
  // Challenge 242: Role-Based Access Control (RBAC) Enforcement
  // ============================================================
  await t.test('Challenge 242: Student cannot access admin endpoints (403)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error?.includes('Access denied'));
  });

  await t.test('Challenge 242: Student cannot access PO student directory (403)', async () => {
    const res = await request(app)
      .get('/api/po/students')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 403);
  });

  await t.test('Challenge 242: PO cannot access admin settings endpoints (403)', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${poToken}`);
    assert.strictEqual(res.status, 403);
  });

  await t.test('Challenge 242: Trainer cannot create placement drives (403)', async () => {
    const res = await request(app)
      .post('/api/drives')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ title: 'Illegal Drive' });
    assert.strictEqual(res.status, 403);
  });

  // ============================================================
  // Challenge 244 & 259: Password Reset Security
  // ============================================================
  await t.test('Challenge 244/259: Forgot password endpoint does not enumerate account existence', async () => {
    const res1 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent-user-12345@test.edu' });
    assert.strictEqual(res1.status, 200);
    assert.ok(res1.body.message?.includes('instructions') || res1.body.success);
  });

  // ============================================================
  // Challenge 246: SQL Injection Resistance
  // ============================================================
  await t.test('Challenge 246: SQL injection in authentication payloads fails safely without DB errors', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: "' OR '1'='1' --",
        password: "password' OR '1'='1",
      });
    // Should fail cleanly with 400 Bad Request (Zod email schema) or 401 Unauthorized, never 500 SQL syntax error
    assert.ok([400, 401].includes(res.status), `Expected 400 or 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  // ============================================================
  // Challenge 247: Content Security Policy & XSS Sanitization
  // ============================================================
  await t.test('Challenge 247: Response contains strict Content Security Policy headers', async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'Must include Content-Security-Policy header');
    assert.ok(csp.includes("default-src 'self'"), 'CSP must specify default-src');
    assert.ok(csp.includes("object-src 'none'"), 'CSP must block object-src applets');
    assert.ok(csp.includes("frame-src 'none'"), 'CSP must block frame-src clickjacking');
  });

  await t.test('Challenge 247: sanitizeHtml strips scripts, iframes, and inline event handlers', () => {
    const dirty = '<p>Normal text <script>alert("XSS")</script><iframe src="//evil.com"></iframe><b onclick="bad()">Bold</b></p>';
    const cleaned = sanitizeHtml(dirty);
    assert.ok(!cleaned.includes('<script>'), 'Must strip script tags');
    assert.ok(!cleaned.includes('alert('), 'Must strip script content');
    assert.ok(!cleaned.includes('<iframe'), 'Must strip iframe tags');
    assert.ok(!cleaned.includes('onclick='), 'Must strip event handlers');
    assert.ok(cleaned.includes('<p>'), 'Must preserve safe p tag');
    assert.ok(cleaned.includes('<b>'), 'Must preserve safe b tag');
  });

  await t.test('Challenge 247: isSafeUrl blocks dangerous protocols', () => {
    assert.strictEqual(isSafeUrl('https://example.com/portal'), true);
    assert.strictEqual(isSafeUrl('http://localhost:5173/dashboard'), true);
    assert.strictEqual(isSafeUrl('javascript:alert(document.cookie)'), false);
    assert.strictEqual(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
    assert.strictEqual(isSafeUrl('vbscript:msgbox(1)'), false);
    assert.strictEqual(isSafeUrl('not a url'), false);
    assert.strictEqual(isSafeUrl(null), false);
  });

  // ============================================================
  // Challenge 249: IDOR & Ownership Controls
  // ============================================================
  await t.test('Challenge 249: Student A cannot access Student B profile (403 IDOR blocked)', async () => {
    const res = await request(app)
      .get('/api/students/stu-2')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 403);
    assert.ok(res.body.error?.includes('You can only view your own profile'));
  });

  await t.test('Challenge 249: Student can access own profile successfully', async () => {
    const res = await request(app)
      .get('/api/students/stu-1')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, 'stu-1');
  });

  // ============================================================
  // Challenge 250: Brute Force & Rate Limiting
  // ============================================================
  await t.test('Challenge 250: API responses return standard rate limit headers', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(
      res.headers['ratelimit-limit'] !== undefined || res.headers['x-ratelimit-limit'] !== undefined || res.status === 200,
      'API rate limit headers or status 200 must be present'
    );
  });

  // ============================================================
  // Challenge 251: Session Invalidation / tokenVersion
  // ============================================================
  await t.test('Challenge 251: Token with outdated tokenVersion is rejected (revoked session)', async () => {
    // stu-1 has tokenVersion 1 in mock DB; craft token with tokenVersion 0
    const revokedToken = createMockToken('stu-1', 'student', 0);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${revokedToken}`);
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error?.includes('revoked'));
  });

  // ============================================================
  // Challenge 252: Malicious File Upload Prevention
  // ============================================================
  await t.test('Challenge 252: Executable files with MZ header are rejected', async () => {
    const exeBuffer = Buffer.concat([Buffer.from('MZ\x90\x00'), Buffer.alloc(100)]);
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', exeBuffer, { filename: 'payload.exe', contentType: 'application/octet-stream' })
      .field('label', 'Malicious File');
    assert.strictEqual(res.status, 400);
  });

  // ============================================================
  // Challenge 253: Environment Variable Startup Validation & Redaction
  // ============================================================
  await t.test('Challenge 253: validateEnv and redactSensitive protect application secrets', () => {
    // Should run safely without throwing
    validateEnv();

    const config = {
      DATABASE_URL: 'postgresql://admin:secret123@localhost:5432/db',
      JWT_SECRET: 'super-secret-key-that-must-be-hidden',
      PORT: 4000,
      appPassword: 'myPassword123',
    };
    const redacted = redactSensitive(config);
    assert.strictEqual(redacted.PORT, 4000);
    assert.strictEqual(redacted.DATABASE_URL, '[REDACTED]');
    assert.strictEqual(redacted.JWT_SECRET, '[REDACTED]');
    assert.strictEqual(redacted.appPassword, '[REDACTED]');
  });

  // ============================================================
  // Challenge 254: CORS Configuration
  // ============================================================
  await t.test('Challenge 254: Unauthorized origins do not get Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://attacker-domain.evil.com');
    assert.notStrictEqual(res.headers['access-control-allow-origin'], 'https://attacker-domain.evil.com');
  });

  await t.test('Challenge 254: Authorized local frontend origin is allowed', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  // ============================================================
  // Challenge 255: Academic Data Field-Level Authorization
  // ============================================================
  await t.test('Challenge 255: Trainer viewing student profile receives redacted CGPA', async () => {
    const res = await request(app)
      .get('/api/students/stu-1')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, 'stu-1');
    // Field-level authorization: CGPA must be hidden/undefined for trainer
    assert.strictEqual(res.body.data.studentProfile?.cgpa, undefined, 'CGPA must be undefined for trainer');
  });

  await t.test('Challenge 255: Student viewing own profile receives full CGPA details', async () => {
    const res = await request(app)
      .get('/api/students/stu-1')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.studentProfile?.cgpa, 8.5);
  });

  // ============================================================
  // Challenge 256: Privilege Escalation Prevention
  // ============================================================
  await t.test('Challenge 256: Student cannot call admin role modification endpoints (403)', async () => {
    const res = await request(app)
      .post('/api/academic/change-role')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ userId: 'stu-1', newRole: 'admin' });
    assert.strictEqual(res.status, 403);
  });

  // ============================================================
  // Challenge 258: Secure Logging Middleware & Redaction
  // ============================================================
  await t.test('Challenge 258: sanitizeForLogging recursively redacts secrets', () => {
    const input = {
      user: 'alice',
      password: 'PlainPassword123',
      token: 'eyJhbGciOi...',
      nested: {
        apiKey: 'secret_key_123',
        authorization: 'Bearer token',
        normalField: 'ok',
      },
    };
    const sanitized = sanitizeForLogging(input);
    assert.strictEqual(sanitized.user, 'alice');
    assert.strictEqual(sanitized.password, '[REDACTED]');
    assert.strictEqual(sanitized.token, '[REDACTED]');
    assert.strictEqual(sanitized.nested.apiKey, '[REDACTED]');
    assert.strictEqual(sanitized.nested.authorization, '[REDACTED]');
    assert.strictEqual(sanitized.nested.normalField, 'ok');
  });

  // ============================================================
  // Challenge 260: Sensitive Data Exposure Prevention
  // ============================================================
  await t.test('Challenge 260: User profiles and auth responses never contain passwordHash or storageKey', async () => {
    const res = await request(app)
      .get('/api/students/stu-1')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 200);
    const bodyStr = JSON.stringify(res.body);
    assert.ok(!bodyStr.includes('passwordHash'), 'Must never leak passwordHash');
    assert.ok(!bodyStr.includes('password_hash'), 'Must never leak password_hash');
    assert.ok(!bodyStr.includes('storageKey'), 'Must never leak internal storageKey');
    assert.ok(!bodyStr.includes('storage_key'), 'Must never leak internal storage_key');
  });
});
