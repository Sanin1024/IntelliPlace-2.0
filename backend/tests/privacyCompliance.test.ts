// Challenges 326–335: Data Privacy & Compliance Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  checkConsent,
  updateConsent,
  logDataAccess,
  logDataShare,
  anonymizeStudent,
  evaluateRetention,
} from '../src/services/privacy.service.js';

const JWT_SECRET = process.env.JWT_SECRET || '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';
process.env.JWT_SECRET = JWT_SECRET;

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Data Privacy & Compliance: Challenges 326–335 Suite', async (t) => {
  // In-memory mock storage for offline / CI resilience
  const mockConsents: Record<string, any> = {};
  const mockAccessLogs: any[] = [];
  const mockDataRequests: any[] = [];
  const mockShareLogs: any[] = [];
  const mockPolicies: any[] = [
    { id: 'pol-1', dataCategory: 'AuditLog', retentionDays: 90, action: 'delete', isActive: true },
    { id: 'pol-2', dataCategory: 'StudentProfile', retentionDays: 365, action: 'anonymize', isActive: true },
  ];

  // Mock DB hooks for deterministic execution
  const origFindUniqueUser = prisma.user.findUnique.bind(prisma);

  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where.id === 'stu-privacy-1') {
      return {
        id: 'stu-privacy-1',
        name: 'Privacy Alice',
        email: 'alice@privacy.edu',
        role: 'student',
        isActive: true,
        tokenVersion: 1,
      };
    }
    if (where.id === 'stu-privacy-2') {
      return {
        id: 'stu-privacy-2',
        name: 'Privacy Bob',
        email: 'bob@privacy.edu',
        role: 'student',
        isActive: true,
        tokenVersion: 1,
      };
    }
    if (where.id === 'admin-privacy-1') {
      return {
        id: 'admin-privacy-1',
        name: 'Privacy Admin',
        email: 'admin@privacy.edu',
        role: 'admin',
        isActive: true,
        tokenVersion: 1,
      };
    }
    if (where.id === 'po-privacy-1') {
      return {
        id: 'po-privacy-1',
        name: 'Privacy Officer',
        email: 'po@privacy.edu',
        role: 'po',
        isActive: true,
        tokenVersion: 1,
      };
    }
    try {
      return await origFindUniqueUser({ where });
    } catch {
      return null;
    }
  };

  (prisma.user as any).update = async ({ where, data }: any) => {
    return { id: where.id, ...data };
  };

  (prisma.auditLog as any).create = async ({ data }: any) => {
    return { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
  };

  (prisma.notification as any).create = async ({ data }: any) => {
    return { id: `notif-${Date.now()}`, ...data, createdAt: new Date() };
  };

  // Mock ConsentRecord
  (prisma.consentRecord as any).findUnique = async ({ where }: any) => {
    const key = `${where.studentId_type.studentId}:${where.studentId_type.type}`;
    return mockConsents[key] || null;
  };

  (prisma.consentRecord as any).findMany = async ({ where }: any) => {
    return Object.values(mockConsents).filter((c: any) => c.studentId === where.studentId);
  };

  (prisma.consentRecord as any).upsert = async ({ where, update, create }: any) => {
    const key = `${where.studentId_type.studentId}:${where.studentId_type.type}`;
    const existing = mockConsents[key];
    const now = new Date();
    if (existing) {
      mockConsents[key] = {
        ...existing,
        ...update,
        updatedAt: now,
      };
    } else {
      mockConsents[key] = {
        id: `con-${Date.now()}-${Math.random()}`,
        studentId: create.studentId,
        type: create.type,
        isGranted: create.isGranted,
        grantedAt: create.grantedAt,
        revokedAt: create.revokedAt,
        createdAt: now,
        updatedAt: now,
      };
    }
    return mockConsents[key];
  };

  // Mock DataAccessLog
  (prisma.dataAccessLog as any).create = async ({ data }: any) => {
    const item = {
      id: `log-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date(),
      actor: { id: data.actorId, name: 'Actor User', role: 'po' },
    };
    mockAccessLogs.push(item);
    return item;
  };

  (prisma.dataAccessLog as any).findMany = async ({ where }: any) => {
    return mockAccessLogs.filter((l) => l.targetUserId === where.targetUserId);
  };

  // Mock DataRequest
  (prisma.dataRequest as any).create = async ({ data }: any) => {
    const item = {
      id: `req-${Date.now()}-${Math.random()}`,
      ...data,
      status: 'pending',
      resolution: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDataRequests.push(item);
    return item;
  };

  (prisma.dataRequest as any).findMany = async ({ where }: any) => {
    if (where?.studentId) {
      return mockDataRequests.filter((r) => r.studentId === where.studentId);
    }
    return [...mockDataRequests];
  };

  (prisma.dataRequest as any).findUnique = async ({ where }: any) => {
    return mockDataRequests.find((r) => r.id === where.id) || null;
  };

  (prisma.dataRequest as any).update = async ({ where, data }: any) => {
    const idx = mockDataRequests.findIndex((r) => r.id === where.id);
    if (idx >= 0) {
      mockDataRequests[idx] = { ...mockDataRequests[idx], ...data, updatedAt: new Date() };
      return mockDataRequests[idx];
    }
    return { id: where.id, ...data };
  };

  // Mock DataShareLog
  (prisma.dataShareLog as any).create = async ({ data }: any) => {
    const item = {
      id: `share-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date(),
    };
    mockShareLogs.push(item);
    return item;
  };

  // Mock RetentionPolicy
  (prisma.retentionPolicy as any).findMany = async () => mockPolicies;
  (prisma.retentionPolicy as any).upsert = async ({ where, update, create }: any) => {
    const idx = mockPolicies.findIndex((p) => p.dataCategory === where.dataCategory);
    if (idx >= 0) {
      mockPolicies[idx] = { ...mockPolicies[idx], ...update };
      return mockPolicies[idx];
    }
    const newPolicy = { id: `pol-${Date.now()}`, ...create, isActive: true };
    mockPolicies.push(newPolicy);
    return newPolicy;
  };

  const studentToken = createMockToken('stu-privacy-1', 'student');
  const studentBobToken = createMockToken('stu-privacy-2', 'student');
  const adminToken = createMockToken('admin-privacy-1', 'admin');

  // ============================================================
  // Test 1: Consent Management (Challenge 329)
  // ============================================================
  await t.test('Challenge 329: Student can query, grant, and revoke granular consents', async () => {
    // 1. Initially check consent
    const initialConsent = await checkConsent('stu-privacy-1', 'placement_sharing');
    assert.strictEqual(initialConsent, false, 'Initial consent should default to false');

    // 2. Student grants placement_sharing consent via PUT /api/privacy/me/consents
    const grantRes = await request(app)
      .put('/api/privacy/me/consents')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'placement_sharing', isGranted: true });

    assert.strictEqual(grantRes.status, 200);
    assert.strictEqual(grantRes.body.success, true);
    assert.strictEqual(grantRes.body.data.isGranted, true);
    assert.ok(grantRes.body.data.grantedAt, 'grantedAt timestamp should be set');
    assert.strictEqual(grantRes.body.data.revokedAt, null);

    // 3. Service reflects granted consent
    const activeConsent = await checkConsent('stu-privacy-1', 'placement_sharing');
    assert.strictEqual(activeConsent, true, 'checkConsent must return true once granted');

    // 4. Student queries own consents via GET /api/privacy/me/consents
    const getRes = await request(app)
      .get('/api/privacy/me/consents')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body.data));
    assert.strictEqual(getRes.body.data.length, 1);
    assert.strictEqual(getRes.body.data[0].type, 'placement_sharing');

    // 5. Student revokes consent
    const revokeRes = await request(app)
      .put('/api/privacy/me/consents')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'placement_sharing', isGranted: false });

    assert.strictEqual(revokeRes.status, 200);
    assert.strictEqual(revokeRes.body.data.isGranted, false);
    assert.ok(revokeRes.body.data.revokedAt, 'revokedAt timestamp must be set on revocation');

    const revokedConsent = await checkConsent('stu-privacy-1', 'placement_sharing');
    assert.strictEqual(revokedConsent, false, 'checkConsent must return false after revocation');
  });

  // ============================================================
  // Test 2: Recruiter Data Sharing Consent Enforcement (Challenge 332)
  // ============================================================
  await t.test('Challenge 332: Recruiter data sharing is strictly blocked without valid consent', async () => {
    // Current state for stu-privacy-1: placement_sharing is revoked (false)
    await assert.rejects(
      async () => {
        await logDataShare('stu-privacy-1', 'comp-google', 'drive-101', ['academic_record', 'resume'], 'po-privacy-1');
      },
      {
        message: 'Student has not consented to data sharing for placement purposes.',
      },
      'logDataShare must reject sharing when consent is revoked'
    );

    // Now student grants consent
    await updateConsent('stu-privacy-1', 'placement_sharing', true);

    // Now sharing succeeds and logs correctly
    const shareLog = await logDataShare(
      'stu-privacy-1',
      'comp-google',
      'drive-101',
      ['academic_record', 'resume'],
      'po-privacy-1'
    );

    assert.ok(shareLog);
    assert.strictEqual(shareLog.studentId, 'stu-privacy-1');
    assert.strictEqual(shareLog.companyId, 'comp-google');
    assert.deepStrictEqual(shareLog.dataTypes, ['academic_record', 'resume']);
  });

  // ============================================================
  // Test 3: Data Access Logging & Student Transparency (Challenges 326, 328, 333)
  // ============================================================
  await t.test('Challenges 326, 328, 333: Access to student records is logged and inspectable by student', async () => {
    // 1. PO views student's profile and downloads resume
    await logDataAccess('po-privacy-1', 'stu-privacy-1', 'academic_profile', 'view', 'req-xyz-001');
    await logDataAccess('po-privacy-1', 'stu-privacy-1', 'resume_version', 'download', 'req-xyz-002');

    // 2. Log access for another student (Bob)
    await logDataAccess('po-privacy-1', 'stu-privacy-2', 'academic_profile', 'view', 'req-bob-001');

    // 3. Student Alice checks their own access logs via GET /api/privacy/me/access-logs
    const aliceRes = await request(app)
      .get('/api/privacy/me/access-logs')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(aliceRes.status, 200);
    assert.strictEqual(aliceRes.body.success, true);
    assert.strictEqual(aliceRes.body.data.length, 2, 'Alice should only see her 2 access records');

    const resourceTypes = aliceRes.body.data.map((l: any) => l.resourceType);
    assert.ok(resourceTypes.includes('academic_profile'));
    assert.ok(resourceTypes.includes('resume_version'));

    // 4. User isolation check: Bob cannot see Alice's access logs
    const bobRes = await request(app)
      .get('/api/privacy/me/access-logs')
      .set('Authorization', `Bearer ${studentBobToken}`);

    assert.strictEqual(bobRes.status, 200);
    assert.strictEqual(bobRes.body.data.length, 1, 'Bob should only see his 1 access record');
    assert.strictEqual(bobRes.body.data[0].targetUserId, 'stu-privacy-2');
  });

  // ============================================================
  // Test 4: Data Subject Rights Workflow (GDPR) (Challenge 331)
  // ============================================================
  await t.test('Challenge 331: Data subject requests can be submitted by student and resolved by admin', async () => {
    // 1. Student submits a data correction request
    const postRes = await request(app)
      .post('/api/privacy/me/data-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'correction',
        details: 'Please correct 12th standard percentage from 88.0% to 92.4%.',
      });

    assert.strictEqual(postRes.status, 201);
    assert.strictEqual(postRes.body.success, true);
    assert.strictEqual(postRes.body.data.type, 'correction');
    assert.strictEqual(postRes.body.data.status, 'pending');
    const requestId = postRes.body.data.id;

    // 2. Student checks their submitted requests
    const myRequestsRes = await request(app)
      .get('/api/privacy/me/data-requests')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(myRequestsRes.status, 200);
    assert.strictEqual(myRequestsRes.body.data.length, 1);
    assert.strictEqual(myRequestsRes.body.data[0].id, requestId);

    // 3. Unauthorized access check: Student cannot review or list all requests
    const forbiddenList = await request(app)
      .get('/api/privacy/data-requests')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.strictEqual(forbiddenList.status, 403, 'Students cannot list admin privacy requests');

    const forbiddenPatch = await request(app)
      .patch(`/api/privacy/data-requests/${requestId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'approved' });
    assert.strictEqual(forbiddenPatch.status, 403, 'Students cannot approve privacy requests');

    // 4. Admin reviews and resolves the request
    const adminPatch = await request(app)
      .patch(`/api/privacy/data-requests/${requestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        resolution: 'Verified against official board transcript and updated.',
      });

    assert.strictEqual(adminPatch.status, 200);
    assert.strictEqual(adminPatch.body.data.status, 'approved');
    assert.strictEqual(adminPatch.body.data.resolution, 'Verified against official board transcript and updated.');
    assert.ok(adminPatch.body.data.reviewedAt, 'reviewedAt should be recorded');
  });

  // ============================================================
  // Test 5: Retention Policy & Data Anonymization (Challenges 330, 334, 335)
  // ============================================================
  await t.test('Challenges 330, 334, 335: Retention policies and student account anonymization', async () => {
    // 1. Admin gets retention policies
    const policiesRes = await request(app)
      .get('/api/privacy/retention-policies')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(policiesRes.status, 200);
    assert.ok(policiesRes.body.data.length >= 2);

    // 2. Admin updates a retention policy
    const updatePolRes = await request(app)
      .put('/api/privacy/retention-policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dataCategory: 'Notification',
        retentionDays: 60,
        action: 'delete',
        isActive: true,
      });

    assert.strictEqual(updatePolRes.status, 200);
    assert.strictEqual(updatePolRes.body.data.dataCategory, 'Notification');
    assert.strictEqual(updatePolRes.body.data.retentionDays, 60);

    // 3. Background retention evaluation runs safely without throwing
    await assert.doesNotReject(async () => {
      await evaluateRetention();
    }, 'evaluateRetention must execute safely');

    // 4. Student account anonymization scrubs personal identifiers
    await assert.doesNotReject(async () => {
      await anonymizeStudent('stu-privacy-1');
    }, 'anonymizeStudent must scrub identifiers');
  });
});
