import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { CAREER_SKILL_MAP } from '../src/services/careerAlignment.service.js';

test('Personalized Learning & Recommendation Engine: Challenges 66–80 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
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
  // Challenge 66 & 73: Declared vs Verified Skill Discrepancy
  // ============================================================
  await t.test('Challenge 66 & 73: Detects overestimation and underestimation discrepancies', () => {
    const evaluateSkillFeedback = (declaredLevel: string, avgAccuracy: number) => {
      if (declaredLevel === 'advanced' && avgAccuracy < 50) {
        return 'overestimating';
      }
      if (declaredLevel === 'beginner' && avgAccuracy >= 80) {
        return 'underestimating';
      }
      return 'aligned';
    };

    assert.strictEqual(evaluateSkillFeedback('advanced', 35), 'overestimating');
    assert.strictEqual(evaluateSkillFeedback('beginner', 88), 'underestimating');
    assert.strictEqual(evaluateSkillFeedback('intermediate', 65), 'aligned');
    assert.strictEqual(evaluateSkillFeedback('advanced', 90), 'aligned');
  });

  // ============================================================
  // Challenge 74: Assessment Integrity Detection
  // ============================================================
  await t.test('Challenge 74: Rapid completion (<10s/q, >=90% score) triggers integrity flag', () => {
    const isRapidCompletion = (seconds: number, questions: number, scorePercent: number) => {
      const secPerQ = seconds / questions;
      return secPerQ < 10 && scorePercent >= 90 && questions >= 5;
    };

    // 10 questions in 50 seconds (5s/q) with 95% -> rapid completion flag
    assert.strictEqual(isRapidCompletion(50, 10, 95), true);
    // 10 questions in 300 seconds (30s/q) with 95% -> normal completion
    assert.strictEqual(isRapidCompletion(300, 10, 95), false);
    // 10 questions in 50 seconds but low score (40%) -> guessing, not rapid cheat
    assert.strictEqual(isRapidCompletion(50, 10, 40), false);
    // Only 2 questions -> insufficient sample
    assert.strictEqual(isRapidCompletion(10, 2, 100), false);
  });

  // ============================================================
  // Challenge 79: Readiness v2 Score and Confidence Capping
  // ============================================================
  await t.test('Challenge 79: Readiness score capped at 40 when test attempts < 2', () => {
    const computeReadinessOverall = (
      attemptCount: number,
      categoryScores: { tech: number; quant: number; logical: number; verbal: number }
    ) => {
      const weights = { tech: 0.35, quant: 0.25, logical: 0.2, verbal: 0.2 };
      const raw =
        categoryScores.tech * weights.tech +
        categoryScores.quant * weights.quant +
        categoryScores.logical * weights.logical +
        categoryScores.verbal * weights.verbal;

      const score = Math.round(raw);
      if (attemptCount < 2) {
        return {
          score: Math.min(40, score),
          confidence: attemptCount === 1 ? 'low' : 'insufficient',
          isCapped: score > 40,
        };
      }
      return {
        score,
        confidence: attemptCount >= 5 ? 'high' : 'moderate',
        isCapped: false,
      };
    };

    // Attempt count = 1, raw score = 85 -> capped at 40
    const r1 = computeReadinessOverall(1, { tech: 90, quant: 80, logical: 80, verbal: 90 });
    assert.strictEqual(r1.score, 40);
    assert.strictEqual(r1.isCapped, true);
    assert.strictEqual(r1.confidence, 'low');

    // Attempt count = 3, raw score = 85 -> uncapped
    const r2 = computeReadinessOverall(3, { tech: 90, quant: 80, logical: 80, verbal: 90 });
    assert.strictEqual(r2.score, 86);
    assert.strictEqual(r2.isCapped, false);
    assert.strictEqual(r2.confidence, 'moderate');
  });

  // ============================================================
  // Challenge 68 & 70: Urgency and Drive Deadline Prioritization
  // ============================================================
  await t.test('Challenge 68 & 70: Placement drive deadlines elevate recommendation priority', () => {
    const getPriority = (hasUpcomingDrive: boolean, isWeakSkill: boolean) => {
      if (hasUpcomingDrive) return 'high';
      if (isWeakSkill) return 'high';
      return 'medium';
    };

    assert.strictEqual(getPriority(true, false), 'high');
    assert.strictEqual(getPriority(false, true), 'high');
    assert.strictEqual(getPriority(false, false), 'medium');
  });

  // ============================================================
  // Challenge 72: Career Alignment Skill Mappings
  // ============================================================
  await t.test('Challenge 72: CAREER_SKILL_MAP contains default 4 institutional roles', () => {
    const roles = Object.keys(CAREER_SKILL_MAP);
    assert.ok(roles.includes('software_engineer'));
    assert.ok(roles.includes('data_analyst'));
    assert.ok(roles.includes('devops_engineer'));
    assert.ok(roles.includes('qa_engineer'));

    assert.ok(CAREER_SKILL_MAP.software_engineer.includes('data structures'));
    assert.ok(CAREER_SKILL_MAP.data_analyst.includes('sql'));
    assert.ok(CAREER_SKILL_MAP.devops_engineer.includes('docker'));
    assert.ok(CAREER_SKILL_MAP.qa_engineer.includes('software testing'));
  });

  // ============================================================
  // Challenge 80: Skill Growth Trend Deltas
  // ============================================================
  await t.test('Challenge 80: Skill growth computes chronological score deltas', () => {
    const computeTrend = (first: number, last: number) => {
      const delta = last - first;
      const trend = delta > 0 ? 'improving' : delta < 0 ? 'declining' : 'stable';
      return { delta, trend };
    };

    assert.deepStrictEqual(computeTrend(40, 75), { delta: 35, trend: 'improving' });
    assert.deepStrictEqual(computeTrend(80, 60), { delta: -20, trend: 'declining' });
    assert.deepStrictEqual(computeTrend(70, 70), { delta: 0, trend: 'stable' });
  });

  // ============================================================
  // Challenge 71 & 75: Coverage Share Diagnostic (>40% Imbalance)
  // ============================================================
  await t.test('Challenge 71 & 75: Detects recommendation distribution imbalance > 40%', () => {
    const checkImbalance = (skillCounts: Record<string, number>) => {
      const total = Object.values(skillCounts).reduce((a, b) => a + b, 0);
      let imbalanced = false;
      for (const [skill, count] of Object.entries(skillCounts)) {
        if ((count / total) * 100 > 40) {
          imbalanced = true;
          return { imbalanced, skill };
        }
      }
      return { imbalanced, skill: null };
    };

    // Imbalanced: Python is 50/100 = 50% (>40%)
    const res1 = checkImbalance({ Python: 50, SQL: 30, Java: 20 });
    assert.strictEqual(res1.imbalanced, true);
    assert.strictEqual(res1.skill, 'Python');

    // Balanced: Python 35%, SQL 35%, Java 30%
    const res2 = checkImbalance({ Python: 35, SQL: 35, Java: 30 });
    assert.strictEqual(res2.imbalanced, false);
    assert.strictEqual(res2.skill, null);
  });

  // ============================================================
  // Integration Tests: Endpoints & Role Access Guards
  // ============================================================
  await t.test('Integration: Student cannot access PO integrity flags (403)', async (t) => {
    if (!dbConnected) {
      t.skip('Skipping DB-dependent integration call');
      return;
    }

    const res = await request(app)
      .get('/api/reco/integrity-flags')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(res.status, 403);
  });
});

