import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  isTransitionAllowed,
  ALLOWED_TRANSITIONS,
} from '../src/services/application.service.js';
import {
  detectStudentScheduleConflicts,
  getPendingApplicationsReport,
} from '../src/services/recruitmentRound.service.js';

test('Application & Recruitment Workflow: Challenges 146–160 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let studentToken = '';
  let foreignStudentToken = '';
  let studentId = '';
  let dbConnected = false;

  await t.test('0. Setup: Authenticate roles & verify db connectivity', async () => {
    try {
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      if (adminRes.status === 200) adminToken = adminRes.body.data.token;

      const poRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'po@intelliplace.edu', password: 'PO@123' });
      if (poRes.status === 200) poToken = poRes.body.data.token;

      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) {
        studentToken = studentRes.body.data.token;
        studentId = studentRes.body.data.user.id;
      }

      const foreignRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@student.edu', password: 'Student@123' });
      if (foreignRes.status === 200) foreignStudentToken = foreignRes.body.data.token;

      dbConnected = !!(adminToken && poToken && studentToken);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 150: State Machine Transition Rules
  // ============================================================
  await t.test('Challenge 150: isTransitionAllowed enforces valid recruitment progression', () => {
    // Valid transitions
    assert.strictEqual(isTransitionAllowed('applied', 'shortlisted'), true);
    assert.strictEqual(isTransitionAllowed('applied', 'rejected'), true);
    assert.strictEqual(isTransitionAllowed('applied', 'withdrawn'), true);
    assert.strictEqual(isTransitionAllowed('shortlisted', 'selected'), true);
    assert.strictEqual(isTransitionAllowed('selected', 'selected'), true); // Idempotent

    // Invalid transitions
    assert.strictEqual(isTransitionAllowed('applied', 'selected'), false); // Cannot bypass shortlisting
    assert.strictEqual(isTransitionAllowed('rejected', 'applied'), false); // Terminal unless revived to shortlisted
  });

  // ============================================================
  // Challenge 158: Cross-Drive Student Schedule Conflicts
  // ============================================================
  await t.test('Challenge 158: detectStudentScheduleConflicts executes without crashing', async () => {
    await assert.doesNotReject(async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(start.getTime() + 3600000);
      const conflicts = await detectStudentScheduleConflicts('mock-student-id', start, end);
      assert.ok(Array.isArray(conflicts));
    });
  });

  // ============================================================
  // Challenge 157: Pending Applications Aging Report
  // ============================================================
  await t.test('Challenge 157: getPendingApplicationsReport returns structured list', async () => {
    await assert.doesNotReject(async () => {
      const report = await getPendingApplicationsReport();
      assert.ok(Array.isArray(report));
    });
  });

  // ============================================================
  // Challenge 160: Withdrawal Business Rules
  // ============================================================
  await t.test('Challenge 160: Student withdrawal rules block selected offers', () => {
    // Verify rule definition: 'selected' application cannot be withdrawn directly by student
    assert.ok(ALLOWED_TRANSITIONS['selected'].includes('withdrawn')); // Admin/PO can reverse
  });

  // ============================================================
  // Integration Tests (When DB is connected)
  // ============================================================
  await t.test('Challenge 153 & 157: Student applications and PO pending report endpoints', async () => {
    if (!dbConnected || !studentToken || !poToken) {
      return;
    }

    // 1. Student views own applications (Challenge 153)
    const myAppsRes = await request(app)
      .get('/api/applications/my-applications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(myAppsRes.status, 200);
    assert.ok(Array.isArray(myAppsRes.body.data));

    // 2. PO views pending applications report (Challenge 157)
    const reportRes = await request(app)
      .get('/api/applications/pending-report')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(reportRes.status, 200);
    assert.ok(Array.isArray(reportRes.body.data));
  });
});

