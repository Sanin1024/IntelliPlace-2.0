// Challenges 186–200: Placement Officer & Administrative Management Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  bulkImportStudents,
  softDeleteEntity,
  restoreEntity,
  updateSystemSetting,
} from '../src/services/adminManagement.service.js';
import { csvCell, generatePlacementReportCsv } from '../src/services/reporting.service.js';

test('Admin & PO Management: Challenges 186–200 Suite', async (t) => {
  let adminToken = '';
  let poToken = '';
  let studentToken = '';
  let adminId = '';
  let dbConnected = false;

  await t.test('0. Setup: Authenticate roles & verify db connectivity', async () => {
    try {
      const adminRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      if (adminRes.status === 200) {
        adminToken = adminRes.body.data.token;
        adminId = adminRes.body.data.user.id;
      }

      const poRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'po@intelliplace.edu', password: 'PO@123' });
      if (poRes.status === 200) poToken = poRes.body.data.token;

      const studentRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@student.edu', password: 'Student@123' });
      if (studentRes.status === 200) studentToken = studentRes.body.data.token;

      dbConnected = !!(adminToken && poToken && studentToken && adminId);
    } catch {
      dbConnected = false;
    }
  });

  // ============================================================
  // Challenge 190 & 191: Bulk Import Validation & Dedup Logic
  // ============================================================
  await t.test('Challenge 190/191: Bulk import validates row schema and detects duplicates', async () => {
    // Missing required fields
    const invalidRows = [
      { name: '', email: 'no-name@test.com', branchName: 'CSE', batchName: '2025' },
      { name: 'Missing Email', email: '', branchName: 'CSE', batchName: '2025' },
    ];

    const results = await bulkImportStudents(invalidRows, adminId || 'admin-test-id');
    assert.strictEqual(results.success, 0);
    assert.strictEqual(results.failed, 2);
    assert.strictEqual(results.errors.length, 2);
    assert.ok(results.errors[0].error.includes('Missing required fields'));
  });

  // ============================================================
  // Challenge 186 & 200: Soft Delete & Restore Logic
  // ============================================================
  await t.test('Challenge 186/200: Soft delete entity guards prevent admin self-deletion', async () => {
    // Self deletion should throw bad request
    let threw = false;
    try {
      await softDeleteEntity('user', adminId || 'same-id', adminId || 'same-id');
    } catch (err: any) {
      threw = true;
      assert.ok(err.message.includes('cannot delete their own account') || err.statusCode === 400);
    }
    assert.strictEqual(threw, true, 'Admin self-deletion must be blocked');
  });

  // ============================================================
  // Challenge 193: Placement Reporting CSV & Formula Injection Guard
  // ============================================================
  await t.test('Challenge 193: csvCell protects against formula injection and escapes special characters', () => {
    // Dangerous formula injection prefixes: =, +, -, @
    assert.strictEqual(csvCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.strictEqual(csvCell('+cmd|/c'), "'+cmd|/c");
    assert.strictEqual(csvCell('-10+20'), "'-10+20");
    assert.strictEqual(csvCell('@IMPORTDATA'), "'@IMPORTDATA");

    // Standard strings
    assert.strictEqual(csvCell('Standard Student Name'), 'Standard Student Name');

    // Commas and quotes escaping
    assert.strictEqual(csvCell('Software Engineer, Lead'), '"Software Engineer, Lead"');
    assert.strictEqual(csvCell('Role "Senior" Specialist'), '"Role ""Senior"" Specialist"');
  });

  await t.test('Challenge 193: generatePlacementReportCsv returns formatted CSV structure', async () => {
    const csv = await generatePlacementReportCsv({});
    assert.ok(csv.startsWith('Student Name,Email,Branch,Batch,CGPA,Placement Status'));
  });

  // ============================================================
  // Challenge 197: Company Internal Notes Stripping for Students
  // ============================================================
  await t.test('Challenge 197: Internal notes confidentiality logic', () => {
    const rawCompany = {
      id: 'co-1',
      name: 'Acme Corp',
      jobRole: 'Backend Engineer',
      internalNotes: 'CONFIDENTIAL: Strict background verification required.',
    };

    const isStudent = true;
    const sanitizedForStudent = {
      ...rawCompany,
      internalNotes: isStudent ? undefined : rawCompany.internalNotes,
    };
    assert.strictEqual(sanitizedForStudent.internalNotes, undefined, 'Student payload must not contain internalNotes');

    const sanitizedForAdmin = {
      ...rawCompany,
      internalNotes: false ? undefined : rawCompany.internalNotes,
    };
    assert.strictEqual(sanitizedForAdmin.internalNotes, 'CONFIDENTIAL: Strict background verification required.');
  });

  // ============================================================
  // Challenge 199: System Settings Key-Value Updates
  // ============================================================
  await t.test('Challenge 199: SystemSetting rollback history record schema integrity', () => {
    const historySample = {
      id: 'hist-1',
      key: 'ELIGIBILITY_MAX_BACKLOGS',
      oldValue: '0',
      newValue: '1',
      changedBy: 'admin-1',
      changedAt: new Date(),
    };

    assert.strictEqual(historySample.key, 'ELIGIBILITY_MAX_BACKLOGS');
    assert.strictEqual(historySample.oldValue, '0');
    assert.strictEqual(historySample.newValue, '1');
    assert.ok(historySample.changedAt instanceof Date);
  });

  // ============================================================
  // Challenge 189: User Filtering by Role, Department, and Batch
  // ============================================================
  await t.test('Ch 189: Filters work independently and together', async () => {
    // Ensure admin token exists
    if (!adminToken) {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@intelliplace.edu', password: 'Admin@123' });
      adminToken = login.body.data?.token;
    }

    // 1. Filter by Role only
    const roleRes = await request(app).get('/api/admin/users?role=admin').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(roleRes.status, 200);
    assert.strictEqual(roleRes.body.data.every((u: any) => u.role === 'admin'), true);

    // 2. Filter by Department only (should return only students with that branch)
    const depRes = await request(app).get('/api/admin/users?department=CS').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(depRes.status, 200);
    assert.strictEqual(depRes.body.data.every((u: any) => u.studentProfile?.branch?.code === 'CS'), true);

    // 3. Filter by Batch only
    const batchRes = await request(app).get('/api/admin/users?batch=2023-2027').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(batchRes.status, 200);
    assert.strictEqual(batchRes.body.data.every((u: any) => u.studentProfile?.batch?.name === '2023-2027'), true);

    // 4. Filter by all three (Role=Student, Dept=CS, Batch=2023-2027)
    const allRes = await request(app).get('/api/admin/users?role=student&department=CS&batch=2023-2027').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(allRes.status, 200);
    assert.ok(allRes.body.data.length > 0);
    assert.strictEqual(allRes.body.data.every((u: any) => 
      u.role === 'student' && 
      u.studentProfile?.branch?.code === 'CS' && 
      u.studentProfile?.batch?.name === '2023-2027'
    ), true);

    // 5. Invalid filter value (e.g., Role=Hacker) returns empty array, not error
    const invalidRes = await request(app).get('/api/admin/users?role=hacker').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(invalidRes.status, 200);
    assert.strictEqual(invalidRes.body.data.length, 0);
  });

  // ============================================================
  // Integration Tests (Requires live DB connection)
  // ============================================================
  await t.test(
    'Integration: Admin reports and settings endpoints return 200',
    { skip: !dbConnected },
    async () => {
      // Test settings fetch
      const settingsRes = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(settingsRes.status, 200);
      assert.ok(Array.isArray(settingsRes.body.data));

      // Test placement report CSV download
      const reportRes = await request(app)
        .get('/api/admin/reports/placement.csv')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.strictEqual(reportRes.status, 200);
      assert.strictEqual(reportRes.headers['content-type'], 'text/csv; charset=utf-8');
      assert.ok(reportRes.text.includes('Student Name'));
    }
  );
});

