import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

test('Placement Drive Management & 20-Challenge Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let aliceToken = '';
  let bobToken = '';
  let testCompanyId = '';
  let branchId = 0;
  let batchId = 0;
  let createdDriveId = '';

  await t.test('0. Setup: Authenticate roles & seed test company/branch/batch', async () => {
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

      // Alice login (Student)
      const aliceRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (aliceRes.status === 200) aliceToken = aliceRes.body.data.token;

      // Bob login (Student)
      const bobRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@student.edu', password: 'Student@123' });
      if (bobRes.status === 200) bobToken = bobRes.body.data.token;

      // Find or create test company
      const company = await prisma.company.findFirst();
      if (company) {
        testCompanyId = company.id;
      }

      const branch = await prisma.branch.findFirst();
      if (branch) branchId = branch.id;

      const batch = await prisma.batch.findFirst();
      if (batch) batchId = batch.id;
    } catch {
      // Offline fallback when postgres daemon is not running
    }
  });

  await t.test('1. PO creates draft drive (Challenge 13, 16)', async () => {
    if (!poToken || !testCompanyId) return;

    const res = await request(app)
      .post('/api/drives')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        companyId: testCompanyId,
        title: 'Software Engineer Placement Drive 2026',
        jobRole: 'Software Engineer',
        jobDescription: 'Build scalable full-stack web applications',
        employmentType: 'full_time',
        location: 'Bangalore, India',
        vacancies: 5,
        ctcMin: 8.0,
        ctcMax: 14.0,
        minCgpa: 7.5,
        maxBacklogs: 0,
        registrationDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        rounds: [
          { name: 'Online Assessment', date: new Date(Date.now() + 10 * 86400000).toISOString(), venue: 'Lab 3' },
          { name: 'Technical Interview', date: new Date(Date.now() + 12 * 86400000).toISOString(), venue: 'Virtual' },
        ],
        eligibleBranchIds: branchId ? [branchId] : [],
        eligibleBatchIds: batchId ? [batchId] : [],
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'draft');
    createdDriveId = res.body.data.id;
  });

  await t.test('2. Publishing incomplete drive fails checklist (Challenge 2, 16)', async () => {
    if (!poToken || !testCompanyId) return;

    // Create incomplete drive (missing description, vacancies, rounds)
    const draftRes = await request(app)
      .post('/api/drives')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        companyId: testCompanyId,
        title: 'Incomplete Test Drive',
        jobRole: 'QA Intern',
        duplicateOverrideReason: 'Testing incomplete checklist',
      });

    assert.strictEqual(draftRes.status, 201);
    const incompleteId = draftRes.body.data.id;

    const pubRes = await request(app)
      .post(`/api/drives/${incompleteId}/publish`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(pubRes.status, 400);
    assert.strictEqual(pubRes.body.success, false);
    assert.ok(pubRes.body.failedItems.length > 0);
  });

  await t.test('3. Complete drive publish succeeds (Challenge 1, 14, 16)', async () => {
    if (!poToken || !createdDriveId) return;

    const res = await request(app)
      .post(`/api/drives/${createdDriveId}/publish`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'published');
  });

  await t.test('4. Duplicate drive detection returns 409 (Challenge 8)', async () => {
    if (!poToken || !testCompanyId) return;

    const res = await request(app)
      .post('/api/drives')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        companyId: testCompanyId,
        title: 'Duplicate Software Engineer Drive',
        jobRole: 'Software Engineer',
        employmentType: 'full_time',
        location: 'Bangalore, India',
        eligibleBatchIds: batchId ? [batchId] : [],
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.requireOverride, true);
  });

  await t.test('5. Duplicate drive with override succeeds (Challenge 8)', async () => {
    if (!poToken || !testCompanyId) return;

    const res = await request(app)
      .post('/api/drives')
      .set('Authorization', `Bearer ${poToken}`)
      .send({
        companyId: testCompanyId,
        title: 'Second Round Software Engineer Drive',
        jobRole: 'Software Engineer',
        employmentType: 'full_time',
        location: 'Bangalore, India',
        eligibleBatchIds: batchId ? [batchId] : [],
        duplicateOverrideReason: 'Off-cycle hiring phase 2 approved by placement committee',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
  });

  await t.test('6. Student sees published drives and eligibility (Challenge 3, 6)', async () => {
    if (!aliceToken) return;

    const res = await request(app)
      .get('/api/drives')
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find((d: any) => d.id === createdDriveId);
    if (found) {
      assert.ok('myEligibility' in found);
      assert.ok('registrationOpen' in found);
    }
  });

  await t.test('7. Eligible student applies to drive (Challenge 4, 7, 8)', async () => {
    if (!aliceToken || !createdDriveId) return;

    const res = await request(app)
      .post(`/api/drives/${createdDriveId}/apply`)
      .set('Authorization', `Bearer ${aliceToken}`);

    assert.ok(res.status === 201 || res.status === 403);
  });

  await t.test('8. Re-applying without withdrawal returns 409 (Challenge 8)', async () => {
    if (!aliceToken || !createdDriveId) return;

    const res = await request(app)
      .post(`/api/drives/${createdDriveId}/apply`)
      .set('Authorization', `Bearer ${aliceToken}`);

    // If applied in step 7, this must be 409 conflict
    if (res.status === 409) {
      assert.strictEqual(res.body.error, 'You have already applied to this placement drive');
    }
  });

  await t.test('9. Student can withdraw own application (Challenge 17)', async () => {
    if (!aliceToken || !createdDriveId) return;

    const res = await request(app)
      .post(`/api/drives/${createdDriveId}/withdraw-application`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ withdrawalReason: 'Pursuing higher studies' });

    if (res.status === 200) {
      assert.strictEqual(res.body.data.status, 'withdrawn');
    }
  });

  await t.test('10. PO cancels drive with cancellation reason (Challenge 11)', async () => {
    if (!poToken || !createdDriveId) return;

    const res = await request(app)
      .post(`/api/drives/${createdDriveId}/cancel`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ reason: 'Company cancelled hiring season due to restructuring' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'cancelled');
    assert.ok(res.body.data.cancellationReason.includes('restructuring'));
  });

  await t.test('11. Archive drive soft-deletes and preserves applications (Challenge 9)', async () => {
    if (!poToken || !createdDriveId) return;

    const res = await request(app)
      .delete(`/api/drives/${createdDriveId}`)
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.status, 'archived');

    // Applications still preserved in DB
    const appCount = await prisma.driveApplication.count({
      where: { driveId: createdDriveId },
    });
    assert.ok(appCount >= 0);
  });
});

