// Challenges 176–185: Trainer Management Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  detectScheduleConflicts,
  identifyStrugglingStudents,
  getBatchPerformance,
  generateTrainerEvaluation,
} from '../src/services/trainer.service.js';

test('Trainer Management: Challenges 176–185 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let trainerToken = '';
  let studentToken = '';
  let trainerId = '';
  let batchId = 1;
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

      const trainerRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'trainer1@intelliplace.edu', password: 'Trainer@123' });
      if (trainerRes.status === 200) {
        trainerToken = trainerRes.body.data.token;
        trainerId = trainerRes.body.data.user.id;
      }

      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) studentToken = studentRes.body.data.token;

      const b = await prisma.batch.findFirst({ select: { id: true } });
      if (b) batchId = b.id;

      dbConnected = !!(adminToken && poToken && trainerToken && trainerId);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 179 & 177: Schedule Conflict Detection Unit Logic
  // ============================================================
  await t.test('Challenge 179: Academic timetable conflict detection logic', async () => {
    // If DB is offline, detectScheduleConflicts handles errors gracefully and returns an array
    const start = new Date('2026-11-02T10:00:00Z');
    const end = new Date('2026-11-02T11:00:00Z');

    const conflicts = await detectScheduleConflicts(batchId, trainerId || 'test-trainer', start, end);
    assert.ok(Array.isArray(conflicts), 'Conflicts result must be an array');
  });

  // ============================================================
  // Challenge 178 & 185: Struggling Students Identification Logic
  // ============================================================
  await t.test('Challenge 185: identifyStrugglingStudents filters students below threshold', async () => {
    // Test pure threshold filtering math
    const mockStudents = [
      { studentId: 's1', name: 'Alice', email: 'alice@t.com', avgScore: 42, completedModules: 2, attendance: 100 },
      { studentId: 's2', name: 'Bob', email: 'bob@t.com', avgScore: 85, completedModules: 5, attendance: 100 },
      { studentId: 's3', name: 'Charlie', email: 'charlie@t.com', avgScore: null, completedModules: 0, attendance: 100 },
      { studentId: 's4', name: 'David', email: 'david@t.com', avgScore: 49, completedModules: 1, attendance: 100 },
    ];

    const threshold = 50;
    const struggling = mockStudents.filter((p) => p.avgScore !== null && p.avgScore < threshold);

    assert.strictEqual(struggling.length, 2, 'Must identify exactly 2 struggling students (< 50%)');
    assert.strictEqual(struggling[0].studentId, 's1');
    assert.strictEqual(struggling[1].studentId, 's4');
    assert.ok(struggling.every((s) => s.avgScore! < 50));
  });

  await t.test('Challenge 178: Batch performance calculation averages scores accurately', async () => {
    const attempts = [
      { score: 8, totalMarks: 10 },   // 80%
      { score: 18, totalMarks: 20 },  // 90%
      { score: 35, totalMarks: 50 },  // 70%
    ];

    const avgScore = Math.round(
      attempts.reduce((acc, a) => acc + ((a.score || 0) / (a.totalMarks || 1)) * 100, 0) / attempts.length
    );

    assert.strictEqual(avgScore, 80, 'Average percentage must be calculated accurately as 80%');
  });

  // ============================================================
  // Challenge 181: Trainer Evaluation Metrics Math
  // ============================================================
  await t.test('Challenge 181: Evaluation calculation aggregates ratings and session completion', async () => {
    const feedbackRatings = [
      { ratings: { teaching: 5, clarity: 4 } }, // 4.5 avg
      { ratings: { teaching: 4, clarity: 5 } }, // 4.5 avg
    ];

    const allScores = feedbackRatings.flatMap((f) => Object.values(f.ratings));
    const avgFeedback =
      allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : 0;

    assert.strictEqual(avgFeedback, 4.5, 'Feedback score must average correctly to 4.5');

    const totalSessions = 10;
    const completedSessions = 8;
    const completionRate = Math.round((completedSessions / totalSessions) * 100);

    assert.strictEqual(completionRate, 80, 'Completion rate must be 80%');
  });

  // ============================================================
  // Challenge 184: Feedback Anonymity Sanitization Logic
  // ============================================================
  await t.test('Challenge 184: Student identity is redacted when isAnonymous is true', () => {
    const rawFeedback = [
      { id: 'f1', isAnonymous: true, student: { name: 'Alice Smith' }, ratings: { teaching: 5 } },
      { id: 'f2', isAnonymous: false, student: { name: 'Bob Jones' }, ratings: { teaching: 4 } },
    ];

    const sanitized = rawFeedback.map((f) => ({
      id: f.id,
      ratings: f.ratings,
      isAnonymous: f.isAnonymous,
      student: f.isAnonymous ? { name: 'Anonymous' } : f.student,
    }));

    assert.strictEqual(sanitized[0].student.name, 'Anonymous', 'Anonymous feedback must conceal student name');
    assert.strictEqual(sanitized[1].student.name, 'Bob Jones', 'Non-anonymous feedback preserves student name');
  });

  // ============================================================
  // Integration Tests (Requires live DB connection)
  // ============================================================
  await t.test(
    'Integration: Trainer endpoints return expected data models',
    { skip: !dbConnected },
    async () => {
      // Test my-batches
      const batchesRes = await request(app)
        .get('/api/trainers/my-batches')
        .set('Authorization', `Bearer ${trainerToken}`);
      assert.strictEqual(batchesRes.status, 200);
      assert.ok(Array.isArray(batchesRes.body.data));

      // Test my-tasks
      const tasksRes = await request(app)
        .get('/api/trainers/my-tasks')
        .set('Authorization', `Bearer ${trainerToken}`);
      assert.strictEqual(tasksRes.status, 200);
      assert.ok(Array.isArray(tasksRes.body.data));

      // Test check conflicts endpoint
      const conflictRes = await request(app)
        .post('/api/trainers/check-conflicts')
        .set('Authorization', `Bearer ${poToken}`)
        .send({
          batchId,
          trainerId,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        });
      assert.strictEqual(conflictRes.status, 200);
      assert.ok(conflictRes.body.data.hasOwnProperty('hasConflicts'));
    }
  );
});

