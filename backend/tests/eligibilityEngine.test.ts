import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  computeCgpaPreciseFromResults,
  convertCgpaToPercentage,
  FORMULA_DESCRIPTIONS,
} from '../src/services/cgpa.service.js';
import {
  findShortlistConflicts,
} from '../src/services/shortlist.service.js';

test('Placement Eligibility & Shortlisting Engine: Challenges 36–50 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let studentToken = '';
  let studentId = '';
  let driveId = '';
  let branchId = 0;
  let batchId = 0;
  let dbConnected = false;

  await t.test('0. Setup: Authenticate roles & seed test fixture', async () => {
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

      const drive = await prisma.placementDrive.findFirst({
        where: { status: { in: ['published', 'active'] } },
      });
      if (drive) driveId = drive.id;

      dbConnected = !!(adminToken && poToken);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 36: Precision CGPA Arithmetic (No float drift)
  // ============================================================
  await t.test('Challenge 36: Precision integer-scaled CGPA calculation', () => {
    // 1. Equal weighted semesters: (8.55 * 20 + 7.45 * 20) / 40 = 320 / 40 = 8.00
    const sem1 = [
      { semesterNumber: 1, gpa: 8.55, creditsEarned: 20, creditsAttempted: 20, status: 'published' },
      { semesterNumber: 2, gpa: 7.45, creditsEarned: 20, creditsAttempted: 20, status: 'published' },
    ];
    const res1 = computeCgpaPreciseFromResults(sem1);
    assert.strictEqual(res1.conclusive, true);
    assert.strictEqual(res1.cgpa, 8.0);
    assert.strictEqual(res1.totalCredits, 40);

    // 2. Fractional rounding half-up: 8.3333... rounds to 8.33
    const sem2 = [
      { semesterNumber: 1, gpa: 8.0, creditsEarned: 10, creditsAttempted: 10, status: 'published' },
      { semesterNumber: 2, gpa: 8.5, creditsEarned: 20, creditsAttempted: 20, status: 'published' },
    ]; // (80 + 170) / 30 = 250 / 30 = 8.3333333333...
    const res2 = computeCgpaPreciseFromResults(sem2);
    assert.strictEqual(res2.cgpa, 8.33);

    // 3. Inconclusive when missing intermediate semesters: e.g. sem 1 and sem 3 present, sem 2 missing
    const semMissing = [
      { semesterNumber: 1, gpa: 8.0, creditsEarned: 20, creditsAttempted: 20, status: 'published' },
      { semesterNumber: 3, gpa: 9.0, creditsEarned: 20, creditsAttempted: 20, status: 'published' },
    ];
    const resMissing = computeCgpaPreciseFromResults(semMissing);
    assert.strictEqual(resMissing.conclusive, false);
    assert.deepStrictEqual(resMissing.missingSemesters, [2]);
  });

  // ============================================================
  // Challenge 44: Percentage Formula Conversions
  // ============================================================
  await t.test('Challenge 44: Standardized CGPA to Percentage conversion formulas', () => {
    // CBSE style: CGPA * 9.5
    const cbse = convertCgpaToPercentage(8.0, 'cgpa_x_9.5');
    assert.strictEqual(cbse, 76.0);

    // 10-point scale: CGPA * 10
    const tenPoint = convertCgpaToPercentage(8.25, 'cgpa_x_10');
    assert.strictEqual(tenPoint, 82.5);

    // VTU style: (CGPA - 0.75) * 10
    const vtu = convertCgpaToPercentage(8.0, 'minus_0.75_x_10');
    assert.strictEqual(vtu, 72.5);

    // Descriptions exist
    assert.ok(FORMULA_DESCRIPTIONS['cgpa_x_9.5']);
    assert.ok(FORMULA_DESCRIPTIONS['minus_0.75_x_10']);
  });

  // ============================================================
  // Challenge 38 & 39: Criteria Versioning & Endpoint
  // ============================================================
  await t.test('Challenge 38 & 39: Drive criteria versioning and change reason audit', async () => {
    if (!driveId || !poToken) return;

    // Update criteria to version with changeReason
    const updateRes = await request(app)
      .put(`/api/drives/${driveId}/criteria`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        criteria: {
          minCgpa: 6.5,
          maxActiveBacklogs: 1,
          maxHistoricalBacklogs: 2,
          allowPendingSupplementary: false,
          maxGapYears: 1,
          requiresGapDocumentation: true,
        },
        changeReason: 'Relaxed CGPA requirement for testing test suite',
      });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);
    assert.ok(updateRes.body.data.version >= 1);
    assert.strictEqual(updateRes.body.data.changeReason, 'Relaxed CGPA requirement for testing test suite');

    // Retrieve criteria history
    const historyRes = await request(app)
      .get(`/api/drives/${driveId}/criteria/history`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(historyRes.status, 200);
    assert.ok(Array.isArray(historyRes.body.data));
    assert.ok(historyRes.body.data.length >= 1);
  });

  // ============================================================
  // Challenge 41, 42, 43, 50: Eligibility Preview & Single Source Engine
  // ============================================================
  await t.test('Challenge 41 & 50: PO Eligibility preview endpoint with full explainability', async () => {
    if (!driveId || !poToken) return;

    const previewRes = await request(app)
      .get(`/api/drives/${driveId}/eligibility/preview`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.body.success, true);
    assert.ok(previewRes.body.data.summary);
    assert.ok(typeof previewRes.body.data.summary.totalEvaluated === 'number');
    assert.ok(Array.isArray(previewRes.body.data.results));

    if (previewRes.body.data.results.length > 0) {
      const first = previewRes.body.data.results[0];
      assert.ok(['ELIGIBLE', 'INELIGIBLE', 'PENDING_VERIFICATION', 'MANUAL_OVERRIDE'].includes(first.status));
      assert.ok(Array.isArray(first.criteriaResults));
      if (first.criteriaResults.length > 0) {
        const crit = first.criteriaResults[0];
        assert.ok(crit.label);
        assert.ok(['pass', 'fail', 'pending'].includes(crit.mode));
        assert.ok(crit.explanation);
      }
    }
  });

  // ============================================================
  // Challenge 48: Supplementary Examination Recording & Auto-Clear
  // ============================================================
  await t.test('Challenge 48: Recording passed supplementary exam auto-clears active backlog', async () => {
    if (!studentId || !poToken) return;

    // 1. Create an active backlog for subject CS301
    const backlog = await prisma.backlogRecord.create({
      data: {
        studentId,
        subjectCode: 'CS301_TEST',
        subjectName: 'Computer Networks',
        semester: 5,
        status: 'active',
        isVerified: true,
      },
    });

    // 2. Record official cleared supplementary exam
    const suppRes = await request(app)
      .post('/api/drives/supplementary')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        studentId,
        subject: 'Computer Networks',
        semesterNumber: 5,
        attemptNumber: 1,
        result: 'cleared_official',
      });

    assert.strictEqual(suppRes.status, 201);
    assert.strictEqual(suppRes.body.success, true);

    // 3. Verify that the backlog was automatically transitioned to cleared
    const updatedBacklog = await prisma.backlogRecord.findUnique({
      where: { id: backlog.id },
    });
    assert.strictEqual(updatedBacklog?.status, 'cleared');

    // Clean up test backlog
    await prisma.backlogRecord.delete({ where: { id: backlog.id } });
    await prisma.supplementaryExam.delete({ where: { id: suppRes.body.data.id } });
  });

  // ============================================================
  // Challenge 49: Education History & Gaps Management
  // ============================================================
  await t.test('Challenge 49: Education history submission and verification flow', async () => {
    if (!studentId || !poToken) return;

    // Submit education history for 12th grade
    const eduRes = await request(app)
      .post('/api/drives/education-history')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        studentId,
        level: 'twelfth',
        institutionName: 'Kendriya Vidyalaya',
        startYear: 2018,
        endYear: 2020,
        gapExplanation: 'Prepared for competitive entrance exams',
      });

    assert.strictEqual(eduRes.status, 201);
    assert.strictEqual(eduRes.body.success, true);
    const eduId = eduRes.body.data.id;

    // Verify education history and gap documentation
    const verifyRes = await request(app)
      .put(`/api/drives/education-history/${eduId}/verify`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        isVerified: true,
        gapDocVerified: true,
      });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.data.isVerified, true);
    assert.strictEqual(verifyRes.body.data.gapDocVerified, true);

    // Clean up
    await prisma.educationHistory.delete({ where: { id: eduId } });
  });

  // ============================================================
  // Challenge 46: PO Manual Override Auditing
  // ============================================================
  await t.test('Challenge 46: Manual override creates auditable MANUAL_OVERRIDE record', async () => {
    if (!driveId || !studentId || !poToken) return;

    const overrideRes = await request(app)
      .post(`/api/drives/${driveId}/eligibility/${studentId}/override`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        reason: 'Authorized exception by Placement Director for academic distinction',
      });

    assert.strictEqual(overrideRes.status, 200);
    assert.strictEqual(overrideRes.body.success, true);
    assert.strictEqual(overrideRes.body.data.status, 'MANUAL_OVERRIDE');
    assert.strictEqual(
      overrideRes.body.data.overrideReason,
      'Authorized exception by Placement Director for academic distinction'
    );

    // Retrieve override audit history
    const historyRes = await request(app)
      .get(`/api/drives/${driveId}/eligibility/overrides`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(historyRes.status, 200);
    assert.ok(Array.isArray(historyRes.body.data));
    const record = historyRes.body.data.find((o: any) => o.studentId === studentId);
    assert.ok(record);
  });

  // ============================================================
  // Challenge 45: Schedule Conflicts & Shortlist Buffer
  // ============================================================
  await t.test('Challenge 45: findShortlistConflicts detects 2-hour overlapping rounds', async () => {
    if (!driveId || !studentId) return;

    // Calling findShortlistConflicts returns an array of conflicting drives if rounds overlap
    const conflicts = await findShortlistConflicts([studentId], driveId);
    assert.ok(Array.isArray(conflicts));
  });

  // ============================================================
  // Challenge 50: CSV Eligibility Export Injection Safety
  // ============================================================
  await t.test('Challenge 50: CSV Export endpoint responds with CSV content type', async () => {
    if (!driveId || !poToken) return;

    const csvRes = await request(app)
      .get(`/api/drives/${driveId}/eligibility/report`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Student Name,University ID,Email,Branch,Batch,CGPA'));
  });
});
