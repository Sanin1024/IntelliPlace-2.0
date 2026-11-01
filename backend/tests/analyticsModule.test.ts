// Challenges 336–350: Reporting & Analytics Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  getPlacementStats,
  getBranchWiseStats,
  getCompanyWiseStats,
  getSalaryAnalytics,
  getAssessmentAnalytics,
  invalidateAnalyticsCache,
} from '../src/services/analytics.service.js';
import { getCache, setCache } from '../src/utils/cache.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';
process.env.JWT_SECRET = JWT_SECRET;

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Reporting & Analytics: Challenges 336–350 Suite', async (t) => {
  const TS = Date.now();

  // Deterministic in-memory fixtures for offline / CI resilience
  const mockStudents = [
    {
      userId: `stu-1-${TS}`,
      academicStatus: 'verified',
      placementStatus: 'placed',
      branchId: 101,
      batchId: 2025,
      cgpa: 8.8,
      user: { id: `stu-1-${TS}`, name: 'Student One', email: `stu1-${TS}@test.edu`, role: 'student', isActive: true, deletedAt: null },
      branch: { id: 101, name: 'CSE' },
      batch: { id: 2025, name: '2025' },
    },
    {
      userId: `stu-2-${TS}`,
      academicStatus: 'verified',
      placementStatus: 'not_placed',
      branchId: 102,
      batchId: 2025,
      cgpa: 7.6,
      user: { id: `stu-2-${TS}`, name: 'Student Two', email: `stu2-${TS}@test.edu`, role: 'student', isActive: true, deletedAt: null },
      branch: { id: 102, name: 'IT' },
      batch: { id: 2025, name: '2025' },
    },
    {
      userId: `stu-3-${TS}`,
      academicStatus: 'verified',
      placementStatus: 'placed',
      branchId: 101,
      batchId: 2025,
      cgpa: 9.1,
      user: { id: `stu-3-${TS}`, name: 'Student Three', email: `stu3-${TS}@test.edu`, role: 'student', isActive: true, deletedAt: null },
      branch: { id: 101, name: 'CSE' },
      batch: { id: 2025, name: '2025' },
    },
  ];

  const mockBranches = [
    { id: 101, name: 'CSE', _count: { students: 2 } },
    { id: 102, name: 'IT', _count: { students: 1 } },
  ];

  const mockCompanies = [
    {
      id: `comp-google-${TS}`,
      name: 'Google LLC',
      drives: [{ id: 'drive-1', title: 'SWE Drive', status: 'completed' }],
      offers: [
        { studentId: `stu-1-${TS}`, ctc: 24, status: 'accepted', isVerified: true },
        { studentId: `stu-3-${TS}`, ctc: 28, status: 'accepted', isVerified: true },
      ],
    },
    {
      id: `comp-amazon-${TS}`,
      name: 'Amazon Corp',
      drives: [{ id: 'drive-2', title: 'SDE Drive', status: 'completed' }],
      offers: [
        // Duplicate offer for stu-1 to verify distinct placement counting (Challenge 337)
        { studentId: `stu-1-${TS}`, ctc: 22, status: 'accepted', isVerified: true },
      ],
    },
  ];

  const mockApplications = [
    { studentId: `stu-1-${TS}`, status: 'selected' },
    { studentId: `stu-2-${TS}`, status: 'shortlisted' },
    { studentId: `stu-3-${TS}`, status: 'selected' },
  ];

  const mockOffers = [
    { id: 'off-1', studentId: `stu-1-${TS}`, companyId: `comp-google-${TS}`, ctc: 24, status: 'accepted', isVerified: true, company: { name: 'Google LLC' }, jobRole: 'SWE', student: { studentProfile: { branchId: 101, batchId: 2025 } } },
    { id: 'off-2', studentId: `stu-1-${TS}`, companyId: `comp-amazon-${TS}`, ctc: 22, status: 'accepted', isVerified: true, company: { name: 'Amazon Corp' }, jobRole: 'SDE', student: { studentProfile: { branchId: 101, batchId: 2025 } } },
    { id: 'off-3', studentId: `stu-3-${TS}`, companyId: `comp-google-${TS}`, ctc: 28, status: 'accepted', isVerified: true, company: { name: 'Google LLC' }, jobRole: 'SWE', student: { studentProfile: { branchId: 101, batchId: 2025 } } },
  ];

  const mockAttempts = [
    { score: 85, totalMarks: 100, studentId: `stu-1-${TS}` },
    { score: 45, totalMarks: 100, studentId: `stu-2-${TS}` },
    { score: 92, totalMarks: 100, studentId: `stu-3-${TS}` },
  ];

  // Intercept Prisma operations with deterministic mock fallbacks
  const origUserFindUnique = prisma.user.findUnique.bind(prisma);

  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.id === 'admin-ana-1') {
      return { id: 'admin-ana-1', name: 'Analytics Admin', email: 'admin@ana.edu', role: 'admin', isActive: true, tokenVersion: 1 };
    }
    if (where.id === 'po-ana-1') {
      return { id: 'po-ana-1', name: 'Analytics PO', email: 'po@ana.edu', role: 'po', isActive: true, tokenVersion: 1 };
    }
    if (where.id === 'stu-ana-1') {
      return { id: 'stu-ana-1', name: 'Analytics Student', email: 'stu@ana.edu', role: 'student', isActive: true, tokenVersion: 1 };
    }
    try {
      return await origUserFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.studentProfile as any).count = async ({ where }: any) => {
    if (where?.academicStatus === 'verified') {
      return mockStudents.filter((s) => s.academicStatus === 'verified').length;
    }
    return mockStudents.length;
  };

  (prisma.studentProfile as any).findMany = async () => mockStudents;

  (prisma.driveApplication as any).findMany = async () => mockApplications;

  (prisma.offer as any).findMany = async ({ where }: any) => {
    if (where?.ctc?.not !== undefined) {
      return mockOffers.filter((o) => o.ctc !== null);
    }
    return mockOffers;
  };

  (prisma.branch as any).findMany = async () => mockBranches;

  (prisma.company as any).findMany = async () => mockCompanies;

  (prisma.testAttempt as any).findMany = async () => mockAttempts;

  const adminToken = createMockToken('admin-ana-1', 'admin');
  const poToken = createMockToken('po-ana-1', 'po');
  const studentToken = createMockToken('stu-ana-1', 'student');

  // Invalidate any lingering caches before suite runs
  invalidateAnalyticsCache();

  // ============================================================
  // Test 1: Unique Placed vs Total Offers (Challenges 336, 337, 342, 344)
  // ============================================================
  await t.test('Challenges 336, 337, 342: Unique placed candidates vs total offers and recruitment funnel', async () => {
    invalidateAnalyticsCache();
    const stats = await getPlacementStats({});

    assert.ok(stats.totalStudents >= 3, 'Total students count should be at least 3');
    assert.ok(stats.eligibleStudents >= 3, 'Eligible students should be at least 3');

    // stu-1 has 2 offers, stu-3 has 1 offer => totalOffers = 3, but uniquePlacedStudents = 2!
    assert.strictEqual(stats.totalOffers, 3, 'Total offers should equal 3');
    assert.strictEqual(stats.uniquePlacedStudents, 2, 'Unique placed students must be exactly 2 (Set deduplication)');

    // Funnel steps
    assert.strictEqual(stats.uniqueApplicants, 3, 'All 3 students applied');
    assert.strictEqual(stats.shortlistedStudents, 3, 'Shortlisted students should equal 3');
    assert.strictEqual(stats.selectedStudents, 2, 'Selected students should equal 2');

    // Placement percentage calculation: (uniquePlaced / eligible) * 100
    const expectedPercentage = Math.round((2 / stats.eligibleStudents) * 100);
    assert.strictEqual(stats.placementPercentage, expectedPercentage, 'Placement % must match mathematical formula');
  });

  // ============================================================
  // Test 2: Branch-wise Placement Analytics (Challenge 338, 349)
  // ============================================================
  await t.test('Challenge 338: Branch-wise stats return correct grouped structure without N+1', async () => {
    invalidateAnalyticsCache();
    const res = await request(app)
      .get('/api/analytics/branch-wise')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Data should be an array of branch records');

    const cse = res.body.data.find((b: any) => b.branchName === 'CSE');
    assert.ok(cse, 'CSE branch must be present');
    assert.strictEqual(cse.totalStudents, 2);
    assert.ok(cse.placedStudents >= 1, 'Placed students in CSE should be at least 1');
    assert.ok(cse.placementPercentage > 0, 'CSE placement percentage should be positive');

    const it = res.body.data.find((b: any) => b.branchName === 'IT');
    assert.ok(it, 'IT branch must be present');
    assert.strictEqual(it.totalStudents, 1);
  });

  // ============================================================
  // Test 3: Company-wise Recruitment Analytics (Challenge 339)
  // ============================================================
  await t.test('Challenge 339: Company-wise recruitment statistics include drive and offer metrics', async () => {
    invalidateAnalyticsCache();
    const res = await request(app)
      .get('/api/analytics/company-wise')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const google = res.body.data.find((c: any) => c.companyName === 'Google LLC');
    assert.ok(google, 'Google LLC must be present');
    assert.strictEqual(google.totalDrives, 1);
    assert.strictEqual(google.totalOffers, 2);
    assert.strictEqual(google.uniquePlacedStudents, 2);
    assert.strictEqual(google.averageCtc, 26, 'Average CTC for Google should be (24+28)/2 = 26 LPA');
  });

  // ============================================================
  // Test 4: Salary Package Analytics (Challenge 341)
  // ============================================================
  await t.test('Challenge 341: Salary analytics calculates avg, median, min, max correctly', async () => {
    invalidateAnalyticsCache();
    const res = await request(app)
      .get('/api/analytics/salary')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const salary = res.body.data;
    assert.strictEqual(salary.count, 3);
    assert.strictEqual(salary.min, 22);
    assert.strictEqual(salary.max, 28);
    assert.strictEqual(salary.median, 24);
    assert.strictEqual(salary.avg, 24.67);
  });

  // ============================================================
  // Test 5: Assessment Performance Analytics (Challenge 343)
  // ============================================================
  await t.test('Challenge 343: Assessment analytics aggregate mock test performance and pass rates', async () => {
    invalidateAnalyticsCache();
    const res = await request(app)
      .get('/api/analytics/assessment')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const assessment = res.body.data;
    assert.strictEqual(assessment.totalAttempts, 3);
    assert.strictEqual(assessment.uniqueStudents, 3);
    // (85 + 45 + 92) / 3 = 222 / 3 = 74%
    assert.strictEqual(assessment.avgScore, 74);
    // 2 out of 3 scored >= 50% => 67%
    assert.strictEqual(assessment.passRate, 67);
  });

  // ============================================================
  // Test 6: Formatted Report Exports (Challenges 345, 346)
  // ============================================================
  await t.test('Challenges 345, 346: Export reports in CSV, Excel (.xlsx), and PDF formats', async () => {
    const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    };

    // 1. CSV Export
    const csvRes = await request(app)
      .get('/api/analytics/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers['content-type'].includes('text/csv'));
    assert.ok(csvRes.text.includes('Student Name,Email,Branch,Batch,CGPA,Placement Status'));
    assert.ok(csvRes.text.includes('Student One'));

    // 2. Excel Export (.xlsx)
    const excelRes = await request(app)
      .get('/api/analytics/export/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .parse(binaryParser);

    assert.strictEqual(excelRes.status, 200);
    assert.ok(excelRes.headers['content-type'].includes('spreadsheetml.sheet'));
    assert.ok(Buffer.isBuffer(excelRes.body));
    // xlsx starts with PK (0x50, 0x4B)
    assert.strictEqual(excelRes.body[0], 0x50);
    assert.strictEqual(excelRes.body[1], 0x4b);

    // 3. PDF Export (.pdf)
    const pdfRes = await request(app)
      .get('/api/analytics/export/pdf')
      .set('Authorization', `Bearer ${adminToken}`)
      .parse(binaryParser);

    assert.strictEqual(pdfRes.status, 200);
    assert.ok(pdfRes.headers['content-type'].includes('application/pdf'));
    assert.ok(Buffer.isBuffer(pdfRes.body));
    const pdfHeader = pdfRes.body.subarray(0, 4).toString('utf8');
    assert.strictEqual(pdfHeader, '%PDF');
  });

  // ============================================================
  // Test 7: Cache Invalidation Hook (Challenge 340)
  // ============================================================
  await t.test('Challenge 340: invalidateAnalyticsCache sweeps cached analytics keys', async () => {
    const testKey = 'analytics:test_cache_key';
    setCache(testKey, { sample: 'data' }, 300);
    assert.ok(getCache(testKey), 'Cache key should exist before invalidation');

    invalidateAnalyticsCache();
    assert.strictEqual(getCache(testKey), null, 'Cache key should be null after invalidateAnalyticsCache()');
  });

  // ============================================================
  // Test 8: RBAC & Security Enforcement (Challenge 350)
  // ============================================================
  await t.test('Challenge 350: RBAC prevents unauthorized student access to PO/Admin analytics', async () => {
    // 1. Student access blocked with 403 Forbidden
    const stuRes = await request(app)
      .get('/api/analytics/stats')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(stuRes.status, 403, 'Students must receive 403 on PO/Admin analytics');

    const stuExportRes = await request(app)
      .get('/api/analytics/export/excel')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(stuExportRes.status, 403, 'Students must receive 403 on Excel exports');

    // 2. Unauthenticated access blocked with 401 Unauthorized
    const unauthRes = await request(app).get('/api/analytics/stats');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated requests must receive 401');
  });
});
