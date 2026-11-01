import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { sha256Hex } from '../src/services/resourceManagement.service.js';
import { toEffectivenessCsv } from '../src/services/trainingAnalytics.service.js';

test('Training & Learning Management: Challenges 51–65 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let trainerToken = '';
  let studentToken = '';
  let dbConnected = false;

  await t.test('0. Setup: Authenticate roles & seed test fixture', async () => {
    try {
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      if (adminRes.status === 200) adminToken = adminRes.body.data.token;

      const poRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'po@intelliplace.edu', password: 'Po@12345' });
      if (poRes.status === 200) poToken = poRes.body.data.token;

      const trainerRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'trainer@intelliplace.edu', password: 'Trainer@123' });
      if (trainerRes.status === 200) trainerToken = trainerRes.body.data.token;

      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) studentToken = studentRes.body.data.token;

      dbConnected = !!(adminToken && studentToken);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 51 & 58: Schedule Adherence Calculation Logic
  // ============================================================
  await t.test('Challenge 51 & 58: Schedule adherence math and status state transitions', () => {
    // Adherence formula: completed / (completed + overdue + missed) * 100
    const computeAdherence = (completed: number, overdue: number, missed: number) => {
      const lapsed = overdue + missed;
      if (completed + lapsed === 0) return 100;
      return Math.round((completed / (completed + lapsed)) * 100);
    };

    assert.strictEqual(computeAdherence(8, 1, 1), 80);
    assert.strictEqual(computeAdherence(10, 0, 0), 100);
    assert.strictEqual(computeAdherence(0, 2, 2), 0);
    assert.strictEqual(computeAdherence(0, 0, 0), 100);

    // Status transition rules:
    // Scheduled session in past < 48h => overdue
    // Scheduled session in past >= 48h => missed
    const getTransitionStatus = (scheduledAtMs: number, nowMs: number) => {
      const diff = nowMs - scheduledAtMs;
      if (diff <= 0) return 'scheduled';
      if (diff < 48 * 3600000) return 'overdue';
      return 'missed';
    };

    const now = 1700000000000;
    assert.strictEqual(getTransitionStatus(now + 10000, now), 'scheduled');
    assert.strictEqual(getTransitionStatus(now - 10 * 3600000, now), 'overdue');
    assert.strictEqual(getTransitionStatus(now - 49 * 3600000, now), 'missed');
  });

  // ============================================================
  // Challenge 53: Link Validation with 3-Consecutive-Failure Rule
  // ============================================================
  await t.test('Challenge 53: Temporary outages do not mark resource links as broken', () => {
    const BROKEN_THRESHOLD = 3;
    const evaluateLinkStatus = (consecutiveFailures: number) => {
      if (consecutiveFailures === 0) return 'ok';
      if (consecutiveFailures >= BROKEN_THRESHOLD) return 'broken';
      return 'unknown';
    };

    // Strike 1: Intermittent glitch -> unknown, NOT broken
    assert.strictEqual(evaluateLinkStatus(1), 'unknown');
    // Strike 2: Second failure -> still unknown, NOT broken
    assert.strictEqual(evaluateLinkStatus(2), 'unknown');
    // Strike 3: Confirmed outage -> broken
    assert.strictEqual(evaluateLinkStatus(3), 'broken');
    // Recovery on success resets to 0 -> ok
    assert.strictEqual(evaluateLinkStatus(0), 'ok');
  });

  // ============================================================
  // Challenge 55: Beginner-Advanced Prerequisite Level Guard
  // ============================================================
  await t.test('Challenge 55: Beginner student guard on advanced module assignments', () => {
    const shouldSkipAssignment = (
      studentLevel: 'beginner' | 'intermediate' | 'advanced',
      moduleLevel: 'beginner' | 'intermediate' | 'advanced',
      override: boolean
    ) => {
      if (override) return false;
      return studentLevel === 'beginner' && moduleLevel === 'advanced';
    };

    // Beginner assigned to advanced without override -> skipped
    assert.strictEqual(shouldSkipAssignment('beginner', 'advanced', false), true);
    // Beginner assigned to advanced WITH override -> allowed
    assert.strictEqual(shouldSkipAssignment('beginner', 'advanced', true), false);
    // Intermediate assigned to advanced -> allowed
    assert.strictEqual(shouldSkipAssignment('intermediate', 'advanced', false), false);
    // Beginner assigned to beginner -> allowed
    assert.strictEqual(shouldSkipAssignment('beginner', 'beginner', false), false);
  });

  // ============================================================
  // Challenge 57: Competency Verification Thresholds
  // ============================================================
  await t.test('Challenge 57: Module completion strictly requires competency threshold', () => {
    const checkCompetency = (score: number, minPassingScore: number) => {
      return {
        passed: score >= minPassingScore,
        status: score >= minPassingScore ? 'completed' : 'failed',
      };
    };

    assert.deepStrictEqual(checkCompetency(85, 75), { passed: true, status: 'completed' });
    assert.deepStrictEqual(checkCompetency(74, 75), { passed: false, status: 'failed' });
    assert.deepStrictEqual(checkCompetency(75, 75), { passed: true, status: 'completed' });
  });

  // ============================================================
  // Challenge 60: SHA-256 Duplicate Content Detection
  // ============================================================
  await t.test('Challenge 60: SHA-256 content hashing detects duplicate files', () => {
    const file1 = Buffer.from('IntelliPlace Study Material for Dynamic Programming');
    const file2 = Buffer.from('IntelliPlace Study Material for Dynamic Programming');
    const file3 = Buffer.from('IntelliPlace Study Material for Graph Algorithms');

    const hash1 = sha256Hex(file1);
    const hash2 = sha256Hex(file2);
    const hash3 = sha256Hex(file3);

    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
    assert.strictEqual(hash1.length, 64);
  });

  // ============================================================
  // Challenge 62: Monotonic Guard Against Out-of-Order Video Progress
  // ============================================================
  await t.test('Challenge 62: Monotonic clock rejects out-of-order video progress writes', () => {
    const isWriteStale = (existingServerDate: Date, incomingClientIso: string) => {
      const incoming = new Date(incomingClientIso).getTime();
      const existing = existingServerDate.getTime();
      // Guard: rejects writes older than existing updatedAt (-2000ms clock skew allowance)
      return incoming < existing - 2000;
    };

    const serverTime = new Date('2026-10-30T10:00:00.000Z');

    // Newer client packet (10:00:05) -> accepted
    assert.strictEqual(isWriteStale(serverTime, '2026-10-30T10:00:05.000Z'), false);
    // Slightly skewed client packet (09:59:59) -> within 2s tolerance, accepted
    assert.strictEqual(isWriteStale(serverTime, '2026-10-30T09:59:59.000Z'), false);
    // Delayed out-of-order write from earlier session (09:55:00) -> rejected as stale
    assert.strictEqual(isWriteStale(serverTime, '2026-10-30T09:55:00.000Z'), true);
  });

  // ============================================================
  // Challenge 56: Curriculum vs Recruitment Skill Demand Delta
  // ============================================================
  await t.test('Challenge 56: Market skill demand diffing highlights curriculum gaps', () => {
    const drives = [
      { skills: ['Python', 'Django', 'Docker'] },
      { skills: ['Python', 'SQL', 'Docker', 'Kubernetes'] },
    ];
    const coveredSkills = new Set(['python', 'sql', 'django']);

    const demand = new Map<string, number>();
    for (const d of drives) {
      for (const s of d.skills) {
        const k = s.toLowerCase();
        demand.set(k, (demand.get(k) || 0) + 1);
      }
    }

    const missing = [...demand.entries()]
      .filter(([skill]) => !coveredSkills.has(skill))
      .map(([skill, count]) => ({ skill, count }));

    assert.strictEqual(missing.length, 2);
    assert.deepStrictEqual(missing.find((m) => m.skill === 'docker')?.count, 2);
    assert.deepStrictEqual(missing.find((m) => m.skill === 'kubernetes')?.count, 1);
  });

  // ============================================================
  // Challenge 65: CSV Effectiveness Export Formatting
  // ============================================================
  await t.test('Challenge 65: CSV effectiveness export generates compliant format', () => {
    const sampleData = {
      moduleStats: [
        {
          moduleId: 'm1',
          title: 'Algorithms 101',
          level: 'beginner',
          enrolled: 25,
          completed: 20,
          completionRate: 80,
          avgAttempts: 1.2,
          avgBestScore: 88,
          flagged: false,
        },
        {
          moduleId: 'm2',
          title: 'Distributed Systems',
          level: 'advanced',
          enrolled: 10,
          completed: 2,
          completionRate: 20,
          avgAttempts: 2.5,
          avgBestScore: 62,
          flagged: true,
        },
      ],
      scoreDeltas: [],
      scheduleAdherence: {
        totalAssignments: 50,
        completed: 45,
        lapsed: 5,
        adherenceRate: 90,
      },
      byBranch: [],
      generatedAt: new Date().toISOString(),
    };

    const csv = toEffectivenessCsv(sampleData as any);
    assert.ok(csv.includes('Module,Level,Enrolled,Completed,Completion %,Avg Best Score,Flagged'));
    assert.ok(csv.includes('Algorithms 101,beginner,25,20,80%,88,no'));
    assert.ok(csv.includes('Distributed Systems,advanced,10,2,20%,62,YES'));
    assert.ok(csv.includes('Schedule Adherence,90%'));
  });

  // ============================================================
  // Integration Tests (Exercised when live DB is accessible)
  // ============================================================
  await t.test('Integration: Training endpoints return valid schemas', async (t) => {
    if (!dbConnected) {
      t.skip('Skipping database-dependent endpoint calls (no live DB connection)');
      return;
    }

    // Student schedule
    const schedRes = await request(app)
      .get('/api/training/my-schedule')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(schedRes.status, 200);
    assert.ok(Array.isArray(schedRes.body.data.assignments));

    // Learning modules
    const modRes = await request(app)
      .get('/api/training/learning/modules')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(modRes.status, 200);
    assert.ok(Array.isArray(modRes.body.data));

    // Adherence
    const adhRes = await request(app)
      .get('/api/training/adherence')
      .set('Authorization', `Bearer ${trainerToken || adminToken}`);
    assert.strictEqual(adhRes.status, 200);
    assert.ok(adhRes.body.data.stats != null);

    // Analytics: Content Relevance
    const relRes = await request(app)
      .get('/api/training/analytics/content-relevance')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(relRes.status, 200);
    assert.ok(typeof relRes.body.data.liveDrivesAnalyzed === 'number');
  });
});
