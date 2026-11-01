// Institutional Context: LBS College of Engineering (APJKTU 2019 Scheme) Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { parseKTUID, validateAndParseKTUID, DEPARTMENT_MAP } from '../src/services/ktu.service.js';
import { getPlacementStats } from '../src/services/analytics.service.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';
process.env.JWT_SECRET = JWT_SECRET;

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Institutional Context (LBSCEK APJKTU 2019 Scheme) Test Suite', async (t) => {
  const TS = Date.now();

  // Test fixtures
  const mockBranches = [
    { id: 101, name: 'Computer Science and Engineering', code: 'CS', isActive: true },
    { id: 102, name: 'Mechanical Engineering', code: 'ME', isActive: true },
    { id: 103, name: 'Civil Engineering', code: 'CE', isActive: true },
    { id: 104, name: 'Electronics and Communication Engineering', code: 'EC', isActive: true },
    { id: 105, name: 'Electrical and Electronics Engineering', code: 'EE', isActive: true },
    { id: 106, name: 'Information Technology', code: 'IT', isActive: true },
    { id: 107, name: 'Computer Science and Business Systems', code: 'CSBS', isActive: true },
    { id: 108, name: 'Artificial Intelligence and Data Science', code: 'CAID', isActive: true },
  ];

  const mockUsers: Record<string, any> = {
    'admin-inst-1': {
      id: 'admin-inst-1',
      name: 'Inst Admin',
      email: 'admin@lbscek.ac.in',
      role: 'admin',
      isActive: true,
      tokenVersion: 1,
    },
    'po-inst-1': {
      id: 'po-inst-1',
      name: 'Inst PO',
      email: 'po@lbscek.ac.in',
      role: 'po',
      isActive: true,
      tokenVersion: 1,
    },
    'stu-inst-reg': {
      id: 'stu-inst-reg',
      name: 'Rahul K',
      email: `rahul-${TS}@lbscek.ac.in`,
      role: 'student',
      isActive: true,
      tokenVersion: 1,
    },
  };

  const mockProfiles: Record<string, any> = {
    'stu-inst-reg': {
      userId: 'stu-inst-reg',
      ktuid: 'KSD23CS007',
      entryType: 'REGULAR',
      admissionYear: 2023,
      graduatingBatch: '2027',
      academicScheme: 'APJKTU_2019',
      currentSemester: 4,
      cgpa: 8.75,
      branchId: 101,
      batchId: 2027,
      placementStatus: 'placed',
      academicStatus: 'verified',
      branch: mockBranches[0],
      user: mockUsers['stu-inst-reg'],
    },
  };

  const adminToken = createMockToken('admin-inst-1', 'admin');
  const poToken = createMockToken('po-inst-1', 'po');
  const studentToken = createMockToken('stu-inst-reg', 'student');

  // Preserve original Prisma methods
  const origUserFindUnique = prisma.user.findUnique.bind(prisma);
  const origUserCreate = prisma.user.create.bind(prisma);
  const origStudentProfileFindFirst = prisma.studentProfile.findFirst.bind(prisma);
  const origStudentProfileFindUnique = prisma.studentProfile.findUnique.bind(prisma);
  const origStudentProfileFindMany = prisma.studentProfile.findMany.bind(prisma);
  const origStudentProfileCount = prisma.studentProfile.count.bind(prisma);
  const origBranchFindFirst = prisma.branch.findFirst.bind(prisma);
  const origBranchFindMany = prisma.branch.findMany.bind(prisma);
  const origOfferFindMany = prisma.offer.findMany.bind(prisma);
  const origOfferAggregate = (prisma.offer as any).aggregate?.bind(prisma);
  const origDriveAppFindMany = prisma.driveApplication.findMany.bind(prisma);
  const origAuditLogCreate = prisma.auditLog.create.bind(prisma);

  // Setup mock fallbacks for deterministic unit/API execution
  (prisma.user as any).findUnique = async ({ where }: any) => {
    let userObj: any = null;
    if (where?.id && mockUsers[where.id]) {
      userObj = { ...mockUsers[where.id] };
    } else if (where?.email) {
      const match = Object.values(mockUsers).find((u) => u.email === where.email);
      if (match) userObj = { ...match };
    }
    if (userObj) {
      if (mockProfiles[userObj.id]) {
        userObj.studentProfile = mockProfiles[userObj.id];
      }
      return userObj;
    }
    try {
      return await origUserFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.user as any).create = async ({ data }: any) => {
    const newId = `user-created-${Date.now()}`;
    const newUser = {
      id: newId,
      name: data.name,
      email: data.email,
      role: data.role || 'student',
      isActive: true,
      tokenVersion: 1,
      studentProfile: data.studentProfile?.create
        ? {
            userId: newId,
            ...data.studentProfile.create,
            branch: mockBranches.find((b) => b.id === data.studentProfile.create.branchId) || mockBranches[0],
          }
        : undefined,
    };
    mockUsers[newId] = newUser;
    if (newUser.studentProfile) {
      mockProfiles[newId] = newUser.studentProfile;
    }
    return newUser;
  };

  (prisma.studentProfile as any).findFirst = async ({ where }: any) => {
    if (where?.ktuid) {
      const found = Object.values(mockProfiles).find((p) => p.ktuid === where.ktuid);
      if (found) return found;
    }
    try {
      return await origStudentProfileFindFirst({ where });
    } catch {
      return null;
    }
  };

  (prisma.studentProfile as any).findUnique = async ({ where }: any) => {
    if (where?.userId && mockProfiles[where.userId]) {
      return mockProfiles[where.userId];
    }
    try {
      return await origStudentProfileFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.branch as any).findFirst = async ({ where }: any) => {
    if (where?.code) {
      const match = mockBranches.find((b) => b.code === where.code);
      if (match) return match;
    }
    if (where?.OR) {
      for (const cond of where.OR) {
        if (cond.code) {
          const match = mockBranches.find((b) => b.code === cond.code);
          if (match) return match;
        }
        if (cond.name) {
          const match = mockBranches.find((b) => b.name === cond.name);
          if (match) return match;
        }
      }
    }
    try {
      return await origBranchFindFirst({ where });
    } catch {
      return null;
    }
  };

  (prisma.branch as any).findMany = async () => mockBranches;

  (prisma.studentProfile as any).findMany = async ({ where }: any) => {
    let list = Object.values(mockProfiles);
    if (where?.graduatingBatch) {
      list = list.filter((p) => p.graduatingBatch === where.graduatingBatch);
    }
    if (where?.entryType) {
      list = list.filter((p) => p.entryType === where.entryType);
    }
    return list;
  };

  (prisma.studentProfile as any).count = async ({ where }: any) => {
    let list = Object.values(mockProfiles);
    if (where?.academicStatus) {
      list = list.filter((p) => p.academicStatus === where.academicStatus);
    }
    if (where?.graduatingBatch) {
      list = list.filter((p) => p.graduatingBatch === where.graduatingBatch);
    }
    if (where?.entryType) {
      list = list.filter((p) => p.entryType === where.entryType);
    }
    return list.length;
  };

  (prisma.driveApplication as any).findMany = async () => [];
  (prisma.offer as any).findMany = async () => [];
  (prisma.offer as any).aggregate = async () => ({ _avg: { ctc: 0 }, _min: { ctc: 0 }, _max: { ctc: 0 } });
  (prisma.auditLog as any).create = async () => ({ id: 'mock-audit' });

  t.after(() => {
    (prisma.user as any).findUnique = origUserFindUnique;
    (prisma.user as any).create = origUserCreate;
    (prisma.studentProfile as any).findFirst = origStudentProfileFindFirst;
    (prisma.studentProfile as any).findUnique = origStudentProfileFindUnique;
    (prisma.studentProfile as any).findMany = origStudentProfileFindMany;
    (prisma.studentProfile as any).count = origStudentProfileCount;
    (prisma.branch as any).findFirst = origBranchFindFirst;
    (prisma.branch as any).findMany = origBranchFindMany;
    (prisma.offer as any).findMany = origOfferFindMany;
    if (origOfferAggregate) (prisma.offer as any).aggregate = origOfferAggregate;
    (prisma.driveApplication as any).findMany = origDriveAppFindMany;
    (prisma.auditLog as any).create = origAuditLogCreate;
  });

  // ============================================================
  // Test 1: parseKTUID - Regular Entry Format
  // ============================================================
  await t.test('1. parseKTUID correctly parses regular entry KTUID for LBSCEK', () => {
    const res = parseKTUID('KSD23CS007');
    assert.strictEqual(res.isLateral, false, 'Should identify as regular entry');
    assert.strictEqual(res.collegeCode, 'KSD', 'College code must be KSD');
    assert.strictEqual(res.admissionYear, 2023, 'Admission year must be 2023');
    assert.strictEqual(res.departmentCode, 'CS', 'Department code must be CS');
    assert.strictEqual(res.departmentName, 'Computer Science and Engineering');
    assert.strictEqual(res.studentNumber, '007', 'Student number must be 007');
    assert.strictEqual(res.fullKTUID, 'KSD23CS007');
  });

  // ============================================================
  // Test 2: parseKTUID - Lateral Entry Format
  // ============================================================
  await t.test('2. parseKTUID correctly parses lateral entry KTUID (prefix L)', () => {
    const res = parseKTUID('LKSD23EE019');
    assert.strictEqual(res.isLateral, true, 'Should identify as lateral entry');
    assert.strictEqual(res.collegeCode, 'KSD');
    assert.strictEqual(res.admissionYear, 2023);
    assert.strictEqual(res.departmentCode, 'EE');
    assert.strictEqual(res.departmentName, 'Electrical and Electronics Engineering');
    assert.strictEqual(res.studentNumber, '019');
    assert.strictEqual(res.fullKTUID, 'LKSD23EE019');
  });

  // ============================================================
  // Test 3: parseKTUID - New 2024 Departments (CAID & CSBS)
  // ============================================================
  await t.test('3. parseKTUID supports newly introduced departments (CAID & CSBS) for 2024+', () => {
    // Artificial Intelligence & Data Science (2024)
    const caid = parseKTUID('KSD24CAID049');
    assert.strictEqual(caid.departmentCode, 'CAID');
    assert.strictEqual(caid.departmentName, 'Artificial Intelligence and Data Science');
    assert.strictEqual(caid.admissionYear, 2024);

    // Computer Science & Business Systems (2024)
    const csbs = parseKTUID('KSD24CSBS012');
    assert.strictEqual(csbs.departmentCode, 'CSBS');
    assert.strictEqual(csbs.departmentName, 'Computer Science and Business Systems');
    assert.strictEqual(csbs.admissionYear, 2024);

    // Rejection of modern branch before valid introductory year (2024)
    assert.throws(
      () => parseKTUID('KSD23CAID049'),
      /only available from 2024/,
      'Should reject CAID for 2023 admission year'
    );

    assert.throws(
      () => parseKTUID('KSD22CSBS005'),
      /only available from 2024/,
      'Should reject CSBS for 2022 admission year'
    );
  });

  // ============================================================
  // Test 4: parseKTUID - Rejection of Invalid KTUID Formats
  // ============================================================
  await t.test('4. parseKTUID rejects malformed or non-LBSCEK register numbers', () => {
    // Non-KSD college code (e.g. TVE = College of Engineering Trivandrum)
    assert.throws(
      () => parseKTUID('TVE23CS001'),
      /Invalid KTUID format/,
      'Must reject non-LBSCEK college codes'
    );

    // Invalid department code
    assert.throws(
      () => parseKTUID('KSD23ZZ001'),
      /Invalid KTUID format/,
      'Must reject unknown department code ZZ'
    );

    // Incomplete KTUID
    assert.throws(
      () => parseKTUID('KSD23CS'),
      /Invalid KTUID format/,
      'Must reject KTUID missing student sequence number'
    );

    // Empty string
    assert.throws(
      () => parseKTUID(''),
      /KTUID is required/,
      'Must reject empty KTUID'
    );
  });

  // ============================================================
  // Test 5: validateAndParseKTUID - Graduating Batch & DB Consistency
  // ============================================================
  await t.test('5. validateAndParseKTUID calculates graduating batch and validates consistency', async () => {
    // Regular: 2023 + 4 = 2027 graduating batch
    const regRes = await validateAndParseKTUID('KSD23ME014');
    assert.strictEqual(regRes.admissionYear, 2023);
    assert.strictEqual(regRes.graduatingBatch, '2027', 'Regular entry graduating batch must be admissionYear + 4');
    assert.strictEqual(regRes.branchId, 102);

    // Lateral: 2023 + 3 = 2026 graduating batch
    const latRes = await validateAndParseKTUID('LKSD23EE019');
    assert.strictEqual(latRes.admissionYear, 2023);
    assert.strictEqual(latRes.graduatingBatch, '2026', 'Lateral entry graduating batch must be admissionYear + 3');
    assert.strictEqual(latRes.branchId, 105);

    // Branch mismatch check: passing branchId 101 (CS) for an ME KTUID must reject
    await assert.rejects(
      async () => await validateAndParseKTUID('KSD23ME014', 101),
      /does not match/,
      'Must reject registration when branchId does not match KTUID department'
    );

    // Duplicate check: KSD23CS007 is already registered in mockProfiles
    await assert.rejects(
      async () => await validateAndParseKTUID('KSD23CS007'),
      /already registered/,
      'Must reject duplicate KTUID registration with 409 Conflict'
    );
  });

  // ============================================================
  // Test 6: API Integration - Student Registration with KTUID
  // ============================================================
  await t.test('6. POST /api/auth/register validates KTUID and populates academic fields', async () => {
    // 1. Valid registration with KTUID
    const regPayload = {
      name: 'Ananya Nair',
      email: `ananya-${TS}@lbscek.ac.in`,
      password: 'Password@123',
      ktuid: 'KSD23IT045',
    };

    const res = await request(app).post('/api/auth/register').send(regPayload);

    assert.strictEqual(res.status, 201, 'Should successfully register student');
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token, 'Should return auth token');
    assert.strictEqual(res.body.data.user.email, regPayload.email);

    // 2. Registration with invalid KTUID format must fail with 400
    const invalidPayload = {
      name: 'Bad KTU Student',
      email: `bad-${TS}@lbscek.ac.in`,
      password: 'Password@123',
      ktuid: 'INVALID_KTUID_FORMAT',
    };

    const badRes = await request(app).post('/api/auth/register').send(invalidPayload);
    assert.strictEqual(badRes.status, 400, 'Should reject invalid KTUID format with 400');
  });

  // ============================================================
  // Test 7: API Integration - Student Profile KTU Academic Info
  // ============================================================
  await t.test('7. GET /api/students/me returns KTU academic information', async () => {
    const res = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200, 'Profile fetch must return 200');
    assert.strictEqual(res.body.success, true);
    const profile = res.body.data.studentProfile;
    assert.ok(profile, 'Response must include studentProfile');
    assert.strictEqual(profile.ktuid, 'KSD23CS007');
    assert.strictEqual(profile.entryType, 'REGULAR');
    assert.strictEqual(profile.admissionYear, 2023);
    assert.strictEqual(profile.graduatingBatch, '2027');
    assert.strictEqual(profile.academicScheme, 'APJKTU_2019');
    assert.strictEqual(profile.currentSemester, 4);
    assert.strictEqual(profile.branch.code, 'CS');
  });

  // ============================================================
  // Test 8: Analytics Filtering by graduatingBatch & entryType
  // ============================================================
  await t.test('8. Placement Analytics filters by graduatingBatch and entryType', async () => {
    // 1. Service direct invocation with graduatingBatch filter
    const stats2027 = await getPlacementStats({ graduatingBatch: '2027' });
    assert.ok(stats2027, 'Should compute placement stats for graduating batch 2027');
    assert.strictEqual(stats2027.totalStudents, 2, 'Batch 2027 should have 2 registered students (Rahul + Ananya)');

    const stats2028 = await getPlacementStats({ graduatingBatch: '2028' });
    assert.strictEqual(stats2028.totalStudents, 0, 'Batch 2028 should have 0 registered students');

    // 2. Service direct invocation with entryType filter
    const regularStats = await getPlacementStats({ entryType: 'REGULAR' });
    assert.strictEqual(regularStats.totalStudents, 2, 'Should have 2 regular entry students');

    const lateralStats = await getPlacementStats({ entryType: 'LATERAL' });
    assert.strictEqual(lateralStats.totalStudents, 0, 'Should have 0 lateral entry students');

    // 3. HTTP GET /api/analytics/stats with query filters
    const apiRes = await request(app)
      .get('/api/analytics/stats?graduatingBatch=2027&entryType=REGULAR')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(apiRes.status, 200, 'Analytics endpoint should accept graduatingBatch & entryType');
    assert.strictEqual(apiRes.body.success, true);
    assert.ok(apiRes.body.data.placementPercentage !== undefined);
  });
});
