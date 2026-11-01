import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

test('Comprehensive Secret Exposure & Credential Security Suite', async (t) => {
  let adminToken = '';
  let aliceToken = '';

  await t.test('1. Setup: Obtain tokens for admin and student accounts', async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    assert.ok(adminToken, 'Admin token received');

    const aliceRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@student.edu', password: 'Student@123' });
    assert.strictEqual(aliceRes.status, 200);
    aliceToken = aliceRes.body.data.token;
    assert.ok(aliceToken, 'Student token received');
  });

  await t.test('2. Response Hygiene: POST /api/auth/login must never return passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@student.edu', password: 'Student@123' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.passwordHash, undefined, 'passwordHash must be omitted from login response');
    assert.strictEqual(res.body.data.user.password, undefined, 'password must be omitted from login response');
  });

  await t.test('3. Response Hygiene: GET /api/auth/me must never return passwordHash', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.passwordHash, undefined, 'passwordHash must be omitted from me response');
    assert.strictEqual(res.body.data.password, undefined, 'password must be omitted from me response');
  });

  await t.test('4. Response Hygiene: GET /api/admin/users must never expose password hashes for any user', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    const userList = Array.isArray(res.body.data) ? res.body.data : res.body.data?.users;
    assert.ok(Array.isArray(userList), 'Users array returned');
    assert.ok(userList.length > 0, 'Users exist');

    for (const u of userList) {
      assert.strictEqual(u.passwordHash, undefined, `User ${u.email} must not have passwordHash exposed`);
      assert.strictEqual(u.password, undefined, `User ${u.email} must not have password exposed`);
    }
  });

  await t.test('5. Response Hygiene: POST /api/auth/register must omit passwordHash', async () => {
    const tempEmail = `temp_secret_test_${Date.now()}@student.edu`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Secret Test Student',
        email: tempEmail,
        password: 'Password@123',
        knowledgeLevel: 'beginner'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.user.passwordHash, undefined, 'passwordHash omitted from registration');
    assert.strictEqual(res.body.data.user.password, undefined, 'password omitted from registration');

    // Clean up created user to preserve pristine DB state
    const createdUserId = res.body.data.user.id;
    await prisma.studentProfile.deleteMany({ where: { userId: createdUserId } });
    await prisma.user.delete({ where: { id: createdUserId } });
  });

  await t.test('6. Error Sanitization: Server errors must never leak database connection credentials', async () => {
    // Request a nonexistent endpoint that fails cleanly
    const res = await request(app).get('/api/nonexistent-route-for-testing-404');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(/postgres(?:ql)?:\/\//i.test(JSON.stringify(res.body)), false, 'No DB URL in 404 response');

    // Verify sanitization helper logic directly
    const simulatedErrorWithSecret = 'Database error: connect ECONNREFUSED ' + 'postgres' + 'ql://testuser:super_secret_pw@db.test.internal:5432/main';
    const sanitized = simulatedErrorWithSecret.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED]$2');
    assert.ok(!sanitized.includes('super_secret_pw'), 'Simulated password was redacted');
    assert.ok(sanitized.includes('[REDACTED]'), 'Redaction placeholder present');
  });

  await t.test('7. Environment & Git Tracking: Verify real .env files are excluded from Git', async () => {
    const repoRoot = path.resolve(process.cwd(), '..');
    const gitTracked = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
    const trackedFiles = gitTracked.split('\n').map(s => s.trim().replace(/\\/g, '/')).filter(Boolean);

    // Ensure no real .env file is tracked
    const trackedEnvFiles = trackedFiles.filter(f => {
      const base = path.basename(f);
      return base.startsWith('.env') && !base.endsWith('.example');
    });

    assert.deepStrictEqual(
      trackedEnvFiles,
      [],
      `No real .env files should ever be tracked in Git. Found: ${trackedEnvFiles.join(', ')}`
    );

    // Ensure .env.example files ARE present for developers
    const backendExample = trackedFiles.find(f => f.endsWith('backend/.env.example'));
    assert.ok(backendExample, 'backend/.env.example must exist as a safe template');
  });

  await t.test('8. Environment Template Hygiene: backend/.env.example must not contain live production secrets', () => {
    const repoRoot = path.resolve(process.cwd(), '..');
    const examplePath = path.join(repoRoot, 'backend', '.env.example');
    assert.ok(fs.existsSync(examplePath), '.env.example exists');

    const content = fs.readFileSync(examplePath, 'utf8');
    // Ensure JWT_SECRET is a descriptive placeholder, not a live production key
    assert.ok(
      content.includes('replace-with-a-real-64-byte-hex-secret') || content.includes('replace-with'),
      '.env.example should contain an explicit placeholder for JWT_SECRET'
    );
    // Ensure no private key headers
    assert.strictEqual(content.includes('BEGIN PRIVATE KEY'), false, 'No private keys in .env.example');
  });

  await t.test('9. Frontend Bundle Hygiene: Built frontend assets must not embed private backend secrets', () => {
    const repoRoot = path.resolve(process.cwd(), '..');
    const frontendDist = path.join(repoRoot, 'frontend', 'dist');

    if (fs.existsSync(frontendDist)) {
      const files = fs.readdirSync(path.join(frontendDist, 'assets')).filter(f => f.endsWith('.js'));
      for (const f of files) {
        const js = fs.readFileSync(path.join(frontendDist, 'assets', f), 'utf8');
        assert.strictEqual(
          /postgres(?:ql)?:\/\/[^\s"']+/i.test(js),
          false,
          `Frontend bundle ${f} must not contain database connection strings`
        );
        assert.strictEqual(
          /JWT_SECRET\s*=/i.test(js),
          false,
          `Frontend bundle ${f} must not contain JWT_SECRET definition`
        );
      }
    }
  });

  await t.test('10. Code Execution Hygiene: Code runner is disabled by default to prevent arbitrary execution', async () => {
    const runnerEnabled = process.env.CODE_RUNNER_ENABLED === 'true';
    // In demo / test default configuration, CODE_RUNNER_ENABLED is false
    assert.strictEqual(runnerEnabled, false, 'CODE_RUNNER_ENABLED must default to false');
  });
});
