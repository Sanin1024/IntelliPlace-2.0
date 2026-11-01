import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  loginLimiter,
  registerLimiter,
  resetLimiterKeys,
} from '../src/middleware/rateLimiter.js';

test('Comprehensive Role-Based Access Control & Authorization Security Suite', async (t) => {
  // Ensure clean rate limits
  await resetLimiterKeys(loginLimiter);
  await resetLimiterKeys(registerLimiter);

  let adminToken = '';
  let poToken = '';
  let trainerToken = '';
  let aliceToken = '';
  let bobToken = '';

  let aliceId = '';
  let bobId = '';
  let createdQuestionId = '';

  // Setup: Obtain tokens for all 4 roles using existing verified seed accounts
  await t.test('0. Setup: Authenticate accounts across all four roles', async () => {
    // Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.data.token;

    // PO
    const poRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'po@intelliplace.edu', password: 'Po@12345' });
    assert.strictEqual(poRes.status, 200);
    poToken = poRes.body.data.token;

    // Trainer
    const trainerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'trainer1@intelliplace.edu', password: 'Trainer@123' });
    assert.strictEqual(trainerRes.status, 200);
    trainerToken = trainerRes.body.data.token;

    // Student 1 (Alice)
    const aliceRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@student.edu', password: 'Student@123' });
    assert.strictEqual(aliceRes.status, 200);
    aliceToken = aliceRes.body.data.token;
    aliceId = aliceRes.body.data.user.id;

    // Student 2 (Bob)
    const bobRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@student.edu', password: 'Student@123' });
    assert.strictEqual(bobRes.status, 200);
    bobToken = bobRes.body.data.token;
    bobId = bobRes.body.data.user.id;
  });

  // 1. Unauthenticated and invalid token tests
  await t.test('1. Unauthenticated & invalid token requests are rejected with 401', async () => {
    const resNoAuth = await request(app).get('/api/admin/users');
    assert.strictEqual(resNoAuth.status, 401);
    assert.strictEqual(resNoAuth.body.success, false);

    const resInvalidToken = await request(app)
      .get('/api/students/me')
      .set('Authorization', 'Bearer invalid.bogus.jwt');
    assert.strictEqual(resInvalidToken.status, 401);
    assert.strictEqual(resInvalidToken.body.success, false);
  });

  // 2. Student self-service access
  await t.test('2. Student can access own profile and personal dashboard', async () => {
    const resProfile = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(resProfile.status, 200);
    assert.strictEqual(resProfile.body.data.id, aliceId);
    assert.strictEqual(resProfile.body.data.email, 'alice@student.edu');

    const resDash = await request(app)
      .get('/api/students/me/dashboard')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(resDash.status, 200);
    assert.strictEqual(resDash.body.success, true);
  });

  // 3. IDOR Prevention: Student accessing another student's data
  await t.test('3. IDOR Prevention: Student cannot access another student profile or analytics', async () => {
    // Alice attempting to fetch Bob's profile
    const idorProfile = await request(app)
      .get(`/api/students/${bobId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(idorProfile.status, 403, 'Student must not view another student profile');
    assert.strictEqual(idorProfile.body.success, false);

    // Alice attempting to fetch Bob's readiness score
    const idorReadiness = await request(app)
      .get(`/api/analytics/student/${bobId}/readiness`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(idorReadiness.status, 403, 'Student must not view another student readiness');
    assert.strictEqual(idorReadiness.body.success, false);

    // Alice attempting to fetch Bob's topic accuracy
    const idorAccuracy = await request(app)
      .get(`/api/analytics/student/${bobId}/topic-accuracy`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(idorAccuracy.status, 403, 'Student must not view another student accuracy');
    assert.strictEqual(idorAccuracy.body.success, false);
  });

  // 4. Privilege Escalation Prevention: Student modifying protected attributes or accessing admin endpoints
  await t.test('4. Privilege Escalation Prevention: Student cannot access admin or PO endpoints', async () => {
    // Student attempting admin user creation
    const adminAction = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'Hacker Admin',
        email: 'hacker@admin.edu',
        password: 'Password@123',
        role: 'admin',
      });
    assert.strictEqual(adminAction.status, 403);
    assert.strictEqual(adminAction.body.success, false);

    // Student attempting to change placement status via PO route
    const poAction = await request(app)
      .patch(`/api/po/students/${aliceId}/status`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ placementStatus: 'placed' });
    assert.strictEqual(poAction.status, 403);
    assert.strictEqual(poAction.body.success, false);

    // Student attempting to delete a resource
    const deleteAction = await request(app)
      .delete('/api/resources/any-id')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(deleteAction.status, 403);
    assert.strictEqual(deleteAction.body.success, false);
  });

  // 5. Pre-attempt assessment question protection
  await t.test('5. Pre-attempt question secrecy: Student GET /api/tests/:id does not leak questions', async () => {
    const testListRes = await request(app)
      .get('/api/tests')
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(testListRes.status, 200);

    const firstTest = testListRes.body.data?.[0];
    assert.ok(firstTest?.id, 'At least one seeded test must exist');

    const testDetailRes = await request(app)
      .get(`/api/tests/${firstTest.id}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    assert.strictEqual(testDetailRes.status, 200);
    assert.strictEqual(
      testDetailRes.body.data.questions,
      undefined,
      'Questions array must NOT be exposed to students before starting attempt'
    );
    assert.ok(typeof testDetailRes.body.data.questionCount === 'number');
  });

  // 6. Trainer Role Boundaries
  await t.test('6. Trainer Role: Can manage training assets but cannot access admin or student private data', async () => {
    // Authorized: Trainer summary
    const summaryRes = await request(app)
      .get('/api/trainer/summary')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.strictEqual(summaryRes.status, 200);
    assert.ok(summaryRes.body.data?.counts);

    // Authorized: Trainer create question
    const quantTopic = await prisma.topic.findFirst({ where: { type: 'aptitude' } });
    assert.ok(quantTopic, 'Aptitude topic exists');

    const createQRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        topicId: quantTopic.id,
        difficulty: 'easy',
        questionText: 'Security test question: What is 2 + 2?',
        optionA: '3',
        optionB: '4',
        optionC: '5',
        optionD: '6',
        correctOption: 'B',
        explanation: '2 + 2 equals 4',
      });
    assert.strictEqual(createQRes.status, 201);
    createdQuestionId = createQRes.body.data.id;

    // Forbidden: Trainer cannot access admin users
    const adminRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.strictEqual(adminRes.status, 403);

    // Forbidden: Trainer cannot access student private profile
    const studentProfileRes = await request(app)
      .get(`/api/students/${aliceId}`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.strictEqual(studentProfileRes.status, 403);

    // Forbidden: Trainer cannot access student readiness analytics
    const readinessRes = await request(app)
      .get(`/api/analytics/student/${aliceId}/readiness`)
      .set('Authorization', `Bearer ${trainerToken}`);
    assert.strictEqual(readinessRes.status, 403);
  });

  // 7. Cross-Trainer Resource Protection
  await t.test('7. Object-Level Authorization: Trainer cannot delete resources uploaded by another user', async () => {
    // Find a resource uploaded by admin or another trainer
    const otherResource = await prisma.resource.findFirst({
      where: { NOT: { uploader: { email: 'trainer1@intelliplace.edu' } } },
    });

    if (otherResource) {
      const deleteRes = await request(app)
        .delete(`/api/resources/${otherResource.id}`)
        .set('Authorization', `Bearer ${trainerToken}`);
      assert.strictEqual(deleteRes.status, 403, 'Trainer cannot delete another user resource');
    }
  });

  // 8. Placement Officer Role Boundaries
  await t.test('8. Placement Officer: Can manage placement/students but cannot perform admin operations', async () => {
    // Authorized: PO can list all students
    const studentsRes = await request(app)
      .get('/api/po/students')
      .set('Authorization', `Bearer ${poToken}`);
    assert.strictEqual(studentsRes.status, 200);
    assert.ok(Array.isArray(studentsRes.body.data?.students));

    // Authorized: PO can view individual student readiness
    const poReadiness = await request(app)
      .get(`/api/analytics/student/${aliceId}/readiness`)
      .set('Authorization', `Bearer ${poToken}`);
    assert.strictEqual(poReadiness.status, 200);
    assert.ok(poReadiness.body.data?.readinessScore !== undefined);

    // Forbidden: PO cannot create branches (admin only)
    const createBranchRes = await request(app)
      .post('/api/admin/branches')
      .set('Authorization', `Bearer ${poToken}`)
      .send({ name: 'UNAUTHORIZED_BRANCH' });
    assert.strictEqual(createBranchRes.status, 403);

    // Forbidden: PO cannot create questions (trainer/admin only)
    const createQRes = await request(app)
      .post('/api/questions')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        topicId: 1,
        difficulty: 'easy',
        questionText: 'PO question',
        optionA: '1', optionB: '2', optionC: '3', optionD: '4',
        correctOption: 'A',
      });
    assert.strictEqual(createQRes.status, 403);
  });

  // 9. Administrator Authorized Scope & Self-Protection
  await t.test('9. Admin: Full authorization, with self-protection against disabling own account', async () => {
    // Authorized: Admin view users
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(usersRes.status, 200);

    // Admin self-protection: cannot disable own account
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@intelliplace.edu' } });
    assert.ok(adminUser);

    const toggleSelfRes = await request(app)
      .patch(`/api/admin/users/${adminUser.id}/toggle`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    assert.strictEqual(toggleSelfRes.status, 400);
    assert.strictEqual(toggleSelfRes.body.error, 'You cannot disable your own account');
  });

  // 10. Attempt Result BOLA Protection
  await t.test('10. BOLA: Attempt results are restricted to student owner and test creator', async () => {
    // Find an attempt by Alice
    const aliceAttempt = await prisma.testAttempt.findFirst({
      where: { studentId: aliceId, status: 'submitted' },
    });

    if (aliceAttempt) {
      // Alice can view own attempt result
      const aliceView = await request(app)
        .get(`/api/tests/attempts/${aliceAttempt.id}/result`)
        .set('Authorization', `Bearer ${aliceToken}`);
      assert.strictEqual(aliceView.status, 200);
      assert.strictEqual(aliceView.body.data.attemptId, aliceAttempt.id);

      // Bob cannot view Alice's attempt result (403 Forbidden)
      const bobView = await request(app)
        .get(`/api/tests/attempts/${aliceAttempt.id}/result`)
        .set('Authorization', `Bearer ${bobToken}`);
      assert.strictEqual(bobView.status, 403, 'Student cannot view another student attempt result');

      // Admin can view attempt result (200 OK)
      const adminView = await request(app)
        .get(`/api/tests/attempts/${aliceAttempt.id}/result`)
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(adminView.status, 200);
    }
  });

  // Cleanup: Delete the question created during tests to keep DB counts clean
  if (createdQuestionId) {
    try {
      await prisma.aptitudeQuestion.delete({ where: { id: createdQuestionId } });
    } catch {
      // ignore
    }
  }

  await resetLimiterKeys(loginLimiter);
  await resetLimiterKeys(registerLimiter);
});
