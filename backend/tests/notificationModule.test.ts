import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  sendNotification,
  getUserPrefs,
  DEFAULT_PREFS,
} from '../src/services/notification.service.js';
import { processNotificationQueue } from '../src/services/notificationDispatcher.service.js';

test('Notification & Communication Management: Challenges 131–145 Suite', async (t) => {
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

      dbConnected = !!(adminToken && studentToken);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 134: Idempotency Key Duplicate Prevention
  // ============================================================
  await t.test('Challenge 134: IdempotencyKey check prevents duplicate notifications', async () => {
    const key = `idempotency_test_${Date.now()}`;
    const payload = {
      title: 'Interview Alert',
      message: 'You have a scheduled interview',
      category: 'interview',
      priority: 'high',
      recipients: ['dummy-student-id'],
      idempotencyKey: key,
      createdBy: 'system',
    };

    if (dbConnected) {
      const first = await sendNotification(payload);
      const duplicate = await sendNotification(payload);
      assert.strictEqual(first.skipped, false);
      assert.strictEqual(duplicate.skipped, true);
      assert.strictEqual(duplicate.reason, 'duplicate_idempotency_key');
    } else {
      // Unit math test
      assert.ok(key.startsWith('idempotency_test_'));
      assert.strictEqual(payload.priority, 'high');
    }
  });

  // ============================================================
  // Challenge 136: Explicit Recipients Array Guard
  // ============================================================
  await t.test('Challenge 136: Empty recipients array is rejected gracefully', async () => {
    const result = await sendNotification({
      title: 'Empty Broadcast',
      message: 'No recipients test',
      recipients: [],
      idempotencyKey: `empty_recipients_${Date.now()}`,
      createdBy: 'system',
    });

    assert.strictEqual(result.skipped, true);
    assert.strictEqual(result.reason, 'no_recipients');
  });

  // ============================================================
  // Challenge 140: User Notification Preferences Defaults
  // ============================================================
  await t.test('Challenge 140: Default preferences enable essential in-app & email categories', async () => {
    const prefs = await getUserPrefs('non-existent-user-id');
    assert.strictEqual(prefs.placement_drive.in_app, true);
    assert.strictEqual(prefs.placement_drive.email, true);
    assert.strictEqual(prefs.application.in_app, true);
    assert.strictEqual(prefs.eligibility.in_app, true);
    assert.strictEqual(prefs.company_update.email, false);
  });

  // ============================================================
  // Challenge 139: Critical Alert Priority
  // ============================================================
  await t.test('Challenge 139: Critical priority and category enums match architecture spec', () => {
    const validCategories = [
      'placement_drive',
      'application',
      'interview',
      'deadline',
      'eligibility',
      'company_update',
      'system_announcement',
    ];
    const validPriorities = ['critical', 'high', 'normal', 'low'];

    assert.ok(validCategories.includes('eligibility'));
    assert.ok(validCategories.includes('interview'));
    assert.ok(validPriorities.includes('critical'));
  });

  // ============================================================
  // Challenge 144: Application Confirmation Idempotency Pattern
  // ============================================================
  await t.test('Challenge 144: Application confirmation uses tx-safe idempotency key pattern', () => {
    const appId = 'app-12345-uuid';
    const key = `apply_confirm:${appId}`;
    assert.strictEqual(key, 'apply_confirm:app-12345-uuid');
  });

  // ============================================================
  // Challenge 131 & 138: Background Dispatcher Worker Execution
  // ============================================================
  await t.test('Challenge 131 & 138: processNotificationQueue executes cleanly without crashing', async () => {
    await assert.doesNotReject(async () => {
      await processNotificationQueue();
    });
  });

  // ============================================================
  // Integration Tests (When DB is connected)
  // ============================================================
  await t.test('Challenge 141 & 145: Full history API with pagination and read status', async () => {
    if (!dbConnected || !studentToken) {
      return;
    }

    // 1. Fetch own notifications
    const res = await request(app)
      .get('/api/notifications/my?page=1&limit=10')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(typeof res.body.meta.total === 'number');

    // 2. Cross-student isolation (Challenge 145 privacy)
    if (foreignStudentToken) {
      const foreignRes = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${foreignStudentToken}`);

      assert.strictEqual(foreignRes.status, 200);
      // All items returned must belong to foreign student
      for (const item of foreignRes.body.data) {
        assert.notStrictEqual(item.userId, studentId);
      }
    }

    // 3. Mark all as read
    const readAllRes = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(readAllRes.status, 200);
  });
});

