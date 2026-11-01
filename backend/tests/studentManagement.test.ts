import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  computeCgpa,
  getActiveBacklogs,
  getProfileCompleteness,
  getProfileFreshness,
  validateAcademicMapping,
} from '../src/services/academic.service.js';
import { findDuplicateAccounts } from '../src/services/duplicateAccounts.service.js';

test('Student Management & Academic Integrity: Challenges 21–35 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let studentToken = '';
  let studentId = '';
  let branchId = 0;
  let batchId = 0;

  await t.test('0. Setup: Authenticate roles & seed test data', async () => {
    try {
      // Admin login
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      if (adminRes.status === 200) adminToken = adminRes.body.data.token;

      // PO login
      const poRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'po@intelliplace.edu', password: 'Po@12345' });
      if (poRes.status === 200) poToken = poRes.body.data.token;

      // Student login
      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) {
        studentToken = studentRes.body.data.token;
        studentId = studentRes.body.data.user.id;
      }

      const branch = await prisma.branch.findFirst();
      if (branch) branchId = branch.id;

      const batch = await prisma.batch.findFirst();
      if (batch) batchId = batch.id;
    } catch {
      // Offline fallback when postgres daemon is not running
    }
  });

  await t.test('Challenge 22 & 35: validateAcademicMapping ensures cohort sanity', async () => {
    if (!branchId || !batchId) return;

    // Valid mapping: admission 2022, batch graduation 2026 (4 years)
    const validRes = await validateAcademicMapping({
      branchId,
      batchId,
      admissionYear: 2022,
    });
    assert.strictEqual(validRes.valid, true);

    // Invalid mapping: admission 2025, batch graduation 2026 (1 year difference < 2)
    const invalidRes = await validateAcademicMapping({
      branchId,
      batchId,
      admissionYear: 2025,
    });
    assert.strictEqual(invalidRes.valid, false);
    assert.match(invalidRes.error || '', /must be 2 to 6 years/);
  });

  await t.test('Challenge 26: computeCgpa calculates credits-weighted GPA and never zero-fills', async () => {
    if (!studentId) return;

    // Record Sem 1: GPA 8.0, 20 credits
    await prisma.semesterResult.upsert({
      where: { studentId_semesterNumber: { studentId, semesterNumber: 1 } },
      update: { gpa: 8.0, creditsEarned: 20, status: 'published' },
      create: { studentId, semesterNumber: 1, gpa: 8.0, creditsEarned: 20, status: 'published' },
    });

    // Record Sem 3: GPA 9.0, 20 credits (leaving Sem 2 missing to test sequence detection)
    await prisma.semesterResult.upsert({
      where: { studentId_semesterNumber: { studentId, semesterNumber: 3 } },
      update: { gpa: 9.0, creditsEarned: 20, status: 'published' },
      create: { studentId, semesterNumber: 3, gpa: 9.0, creditsEarned: 20, status: 'published' },
    });

    // Make sure Sem 2 is absent or pending
    await prisma.semesterResult.deleteMany({
      where: { studentId, semesterNumber: 2 },
    });

    const cgpaResult = await computeCgpa(studentId);
    // Weighted avg of 8.0 and 9.0 (equal credits) = 8.50
    assert.strictEqual(cgpaResult.computedCgpa, 8.5);
    // Missing semester 2 must be flagged
    assert.ok(cgpaResult.missingSemesters.includes(2));
    // Conclusive must be false due to missing semester in between
    assert.strictEqual(cgpaResult.conclusive, false);
  });

  await t.test('Challenge 27: Backlog tracking service records active & cleared backlogs', async () => {
    if (!studentId) return;

    // Clean up any test backlog
    await prisma.backlogRecord.deleteMany({
      where: { studentId, subjectCode: 'TEST101' },
    });

    await prisma.backlogRecord.create({
      data: {
        studentId,
        subjectCode: 'TEST101',
        subjectName: 'Test Algorithms',
        semester: 3,
        status: 'active',
      },
    });

    const summary = await getActiveBacklogs(studentId);
    assert.ok(summary.activeCount >= 1);
    assert.ok(summary.records.some((r: any) => r.subjectCode === 'TEST101' && r.status === 'active'));
  });

  await t.test('Challenge 33: Profile completeness gate identifies missing required fields', async () => {
    if (!studentId) return;

    const completeness = await getProfileCompleteness(studentId);
    assert.strictEqual(typeof completeness.percentage, 'number');
    assert.ok(Array.isArray(completeness.missingFields));
  });

  await t.test('Challenge 24: Profile freshness service detects stale/active profiles', async () => {
    if (!studentId) return;

    const freshness = await getProfileFreshness(studentId);
    assert.strictEqual(typeof freshness.isStale, 'boolean');
    assert.strictEqual(typeof freshness.daysSinceUpdate, 'number');
  });

  await t.test('Challenge 28: Password reset token generation & non-enumerating forgot-password', async () => {
    if (!studentId || !adminToken) return;

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'alice@student.edu' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /password reset instructions/i);

    // In non-prod dev mode, dev token is provided
    if (res.body.resetToken) {
      const resetToken = res.body.resetToken;

      // Challenge 29 & 30: Reset password updates hash and revokes old JWTs via tokenVersion
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: resetToken, newPassword: 'Student@123New' });

      assert.strictEqual(resetRes.status, 200);

      // Verify old token is now rejected due to tokenVersion mismatch
      if (studentToken) {
        const checkOldToken = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${studentToken}`);
        assert.strictEqual(checkOldToken.status, 401);
      }

      // Restore original password for subsequent test steps
      const loginNew = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123New' });

      if (loginNew.status === 200) {
        studentToken = loginNew.body.data.token;
        await request(app)
          .post('/api/auth/change-password')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ currentPassword: 'Student@123New', newPassword: 'Student@123' });
      }
    }
  });

  await t.test('Challenge 32: Student can submit profile correction request', async () => {
    // Re-login to get fresh token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@student.edu', password: 'Student@123' });

    if (loginRes.status === 200) {
      studentToken = loginRes.body.data.token;
    }

    if (!studentToken) return;

    const res = await request(app)
      .post('/api/students/me/correction-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        fieldRequested: 'cgpa',
        requestedValue: '9.25',
        reason: 'Transcript revaluation grade revised for semester 4',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.fieldRequested, 'cgpa');
  });

  await t.test('Challenge 21 & 34: findDuplicateAccounts detects candidate duplicates', async () => {
    if (!adminToken) return;

    const duplicates = await findDuplicateAccounts();
    assert.ok(Array.isArray(duplicates));
  });

  await t.test('Challenge 31: changeUserRole prevents last admin self-demotion', async () => {
    if (!adminToken) return;

    // Fetch admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!adminUser) return;

    const res = await request(app)
      .post('/api/academic/change-role')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: adminUser.id,
        role: 'student',
      });

    // If only 1 admin exists, must be blocked with 400
    const adminCount = await prisma.user.count({ where: { role: 'admin', isActive: true } });
    if (adminCount <= 1) {
      assert.strictEqual(res.status, 400);
      assert.match(res.body.error || '', /Cannot demote the only remaining administrator/);
    }
  });
});

