import { test } from 'node:test';
import assert from 'node:assert';
import {
  classifyReadinessBand,
  computeReadinessScoreFromInputs,
} from '../src/services/readiness.js';

test('Readiness Band Boundary Unit Tests', async (t) => {
  await t.test('Score 39 maps to Not Ready (<40)', () => {
    assert.strictEqual(classifyReadinessBand(39), 'Not Ready (<40)');
  });

  await t.test('Score 40 maps to Almost Ready (40-70)', () => {
    assert.strictEqual(classifyReadinessBand(40), 'Almost Ready (40-70)');
  });

  await t.test('Score 70 maps to Almost Ready (40-70)', () => {
    assert.strictEqual(classifyReadinessBand(70), 'Almost Ready (40-70)');
  });

  await t.test('Score 71 maps to Ready (>70)', () => {
    assert.strictEqual(classifyReadinessBand(71), 'Ready (>70)');
  });

  await t.test('Student with zero activity and empty profile scores 0 and Not Ready (<40)', () => {
    const res = computeReadinessScoreFromInputs({
      mockAvgPercentage: 0,
      distinctSolved: 0,
      totalCodingProblems: 15,
      hasCgpa: false,
      hasResume: false,
      hasBranch: false,
      hasTargetRole: false,
    });
    assert.strictEqual(res.aptitudeScore, 0);
    assert.strictEqual(res.codingScore, 0);
    assert.strictEqual(res.profileScore, 0);
    assert.strictEqual(res.totalScore, 0);
    assert.strictEqual(res.band, 'Not Ready (<40)');
  });

  await t.test('Student with only full profile points (10/10) scores 10 and Not Ready (<40)', () => {
    const res = computeReadinessScoreFromInputs({
      mockAvgPercentage: 0,
      distinctSolved: 0,
      totalCodingProblems: 15,
      hasCgpa: true,
      hasResume: true,
      hasBranch: true,
      hasTargetRole: true,
    });
    assert.strictEqual(res.profileScore, 10);
    assert.strictEqual(res.totalScore, 10);
    assert.strictEqual(res.band, 'Not Ready (<40)');
  });

  await t.test('Exact 40 boundary with combined components', () => {
    // 50% mock (30 pts) + 0 coding (0 pts) + 10 profile = 40 pts
    const res = computeReadinessScoreFromInputs({
      mockAvgPercentage: 50,
      distinctSolved: 0,
      totalCodingProblems: 15,
      hasCgpa: true,
      hasResume: true,
      hasBranch: true,
      hasTargetRole: true,
    });
    assert.strictEqual(res.totalScore, 40);
    assert.strictEqual(res.band, 'Almost Ready (40-70)');
  });

  await t.test('Exact 70 boundary with combined components', () => {
    // 100% mock (60 pts) + 0 coding (0 pts) + 10 profile = 70 pts
    const res = computeReadinessScoreFromInputs({
      mockAvgPercentage: 100,
      distinctSolved: 0,
      totalCodingProblems: 15,
      hasCgpa: true,
      hasResume: true,
      hasBranch: true,
      hasTargetRole: true,
    });
    assert.strictEqual(res.totalScore, 70);
    assert.strictEqual(res.band, 'Almost Ready (40-70)');
  });

  await t.test('Exact 71 boundary with combined components', () => {
    // 85% mock (51 pts) + 5/15 coding (10 pts) + 10 profile = 71 pts
    const res = computeReadinessScoreFromInputs({
      mockAvgPercentage: 85,
      distinctSolved: 5,
      totalCodingProblems: 15,
      hasCgpa: true,
      hasResume: true,
      hasBranch: true,
      hasTargetRole: true,
    });
    assert.strictEqual(res.totalScore, 71);
    assert.strictEqual(res.band, 'Ready (>70)');
  });
});
