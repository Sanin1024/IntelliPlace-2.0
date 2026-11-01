// Enterprise Mass Notification System (EMNS) Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  scheduleDriveReminders,
  cancelDriveReminders,
  getEligibleNonApplicants,
  processScheduledReminder,
} from '../src/services/emns.service.js';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  '038ed8a689d234bbc6fecc18d199ac3808ab4d2e6f9aad074c81212918461198c6503bf00a8bf1862689486ee74282dda5460eddf7d9eb3598119ce013dfac85';
process.env.JWT_SECRET = JWT_SECRET;

function createMockToken(userId: string, role: string, tokenVersion: number = 1): string {
  return jwt.sign({ userId, role, tv: tokenVersion }, JWT_SECRET, { expiresIn: '1h' });
}

test('Enterprise Mass Notification System (EMNS) Suite', async (t) => {
  const TS = Date.now();
  const driveId = `drive-emns-${TS}`;
  const campaignId = `campaign-emns-${TS}`;
  const futureDeadline = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days out

  // In-memory test state
  const mockUsers: Record<string, any> = {
    'po-emns-1': { id: 'po-emns-1', name: 'PO Sharma', email: 'po@emns.edu', role: 'po', isActive: true, tokenVersion: 1 },
    'admin-emns-1': { id: 'admin-emns-1', name: 'Admin Verma', email: 'admin@emns.edu', role: 'admin', isActive: true, tokenVersion: 1 },
    'stu-emns-1': { id: 'stu-emns-1', name: 'Student One', email: `stu1-${TS}@emns.edu`, role: 'student', isActive: true, tokenVersion: 1 },
    'stu-emns-2': { id: 'stu-emns-2', name: 'Student Two', email: `stu2-${TS}@emns.edu`, role: 'student', isActive: true, tokenVersion: 1 },
  };

  const mockStudents: any[] = [
    {
      userId: 'stu-emns-1',
      branchId: 101,
      batchId: 2025,
      cgpa: 8.5,
      user: mockUsers['stu-emns-1'],
    },
    {
      userId: 'stu-emns-2',
      branchId: 101,
      batchId: 2025,
      cgpa: 7.9,
      user: mockUsers['stu-emns-2'],
    },
  ];

  const mockDrive: any = {
    id: driveId,
    title: 'Google SWE Placement Drive',
    status: 'published',
    companyId: 'comp-google',
    registrationDeadline: futureDeadline,
    company: { name: 'Google LLC' },
    eligibleBranches: [{ driveId, branchId: 101 }],
    eligibleBatches: [{ driveId, batchId: 2025 }],
    _count: { applications: 0 },
    deletedAt: null,
  };

  let mockCampaign: any = {
    id: campaignId,
    driveId,
    drive: mockDrive,
    schedules: [] as any[],
  };

  const mockApplications: any[] = [];
  const mockNotifications: any[] = [];

  const poToken = createMockToken('po-emns-1', 'po');
  const studentToken = createMockToken('stu-emns-1', 'student');

  // Intercept Prisma operations
  const origUserFindUnique = prisma.user.findUnique.bind(prisma);
  const origUserFindFirst = prisma.user.findFirst.bind(prisma);
  const origDriveFindUnique = prisma.placementDrive.findUnique.bind(prisma);
  const origDriveFindMany = prisma.placementDrive.findMany.bind(prisma);
  const origCampaignUpsert = prisma.notificationCampaign.upsert.bind(prisma);
  const origCampaignFindUnique = prisma.notificationCampaign.findUnique.bind(prisma);
  const origScheduleDeleteMany = prisma.notificationSchedule.deleteMany.bind(prisma);
  const origScheduleCreateMany = prisma.notificationSchedule.createMany.bind(prisma);
  const origScheduleCreate = prisma.notificationSchedule.create.bind(prisma);
  const origScheduleUpdateMany = prisma.notificationSchedule.updateMany.bind(prisma);
  const origScheduleUpdate = prisma.notificationSchedule.update.bind(prisma);
  const origScheduleFindUnique = prisma.notificationSchedule.findUnique.bind(prisma);
  const origScheduleFindMany = prisma.notificationSchedule.findMany.bind(prisma);
  const origAppFindMany = prisma.driveApplication.findMany.bind(prisma);
  const origProfileFindMany = prisma.studentProfile.findMany.bind(prisma);
  const origNotifFindUnique = prisma.notification.findUnique.bind(prisma);
  const origNotifFindMany = prisma.notification.findMany.bind(prisma);
  const origTransaction = prisma.$transaction.bind(prisma);

  (prisma.user as any).findUnique = async ({ where }: any) => {
    if (where?.id && mockUsers[where.id]) return mockUsers[where.id];
    if (where?.email) {
      const match = Object.values(mockUsers).find((u) => u.email === where.email);
      if (match) return match;
    }
    try {
      return await origUserFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.user as any).findFirst = async ({ where }: any) => {
    if (where?.role) {
      const match = Object.values(mockUsers).find((u) => u.role === where.role);
      if (match) return match;
    }
    try {
      return await origUserFindFirst({ where });
    } catch {
      return null;
    }
  };

  (prisma.placementDrive as any).findUnique = async ({ where }: any) => {
    if (where?.id === driveId) return mockDrive;
    try {
      return await origDriveFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.placementDrive as any).findMany = async () => [
    {
      ...mockDrive,
      campaign: mockCampaign,
      _count: { applications: mockApplications.length },
    },
  ];

  (prisma.notificationCampaign as any).upsert = async ({ where, create }: any) => {
    if (!mockCampaign || mockCampaign.driveId !== where.driveId) {
      mockCampaign = {
        id: `campaign-${Date.now()}`,
        driveId: where.driveId,
        drive: mockDrive,
        schedules: [],
      };
    }
    return mockCampaign;
  };

  (prisma.notificationCampaign as any).findUnique = async ({ where }: any) => {
    if (where?.driveId === driveId || where?.id === mockCampaign.id) {
      return mockCampaign;
    }
    try {
      return await origCampaignFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.notificationSchedule as any).deleteMany = async ({ where }: any) => {
    if (where?.campaignId === mockCampaign.id) {
      mockCampaign.schedules = mockCampaign.schedules.filter(
        (s: any) => !(s.status === 'pending')
      );
    }
    return { count: 0 };
  };

  (prisma.notificationSchedule as any).createMany = async ({ data }: any) => {
    for (const item of data) {
      const sched = {
        id: `sched-${mockCampaign.schedules.length + 1}-${Date.now()}`,
        ...item,
        processedAt: null,
        lockedAt: null,
      };
      mockCampaign.schedules.push(sched);
    }
    return { count: data.length };
  };

  (prisma.notificationSchedule as any).create = async ({ data }: any) => {
    const sched = {
      id: `sched-single-${Date.now()}`,
      ...data,
      processedAt: null,
      lockedAt: null,
    };
    mockCampaign.schedules.push(sched);
    return sched;
  };

  (prisma.notificationSchedule as any).updateMany = async ({ where, data }: any) => {
    let count = 0;
    for (const s of mockCampaign.schedules) {
      if (where.id && s.id !== where.id) continue;
      if (where.campaignId && s.campaignId !== where.campaignId) continue;
      if (where.status && s.status !== where.status) continue;
      Object.assign(s, data);
      count++;
    }
    return { count };
  };

  (prisma.notificationSchedule as any).update = async ({ where, data }: any) => {
    const s = mockCampaign.schedules.find((item: any) => item.id === where.id);
    if (s) {
      Object.assign(s, data);
      return s;
    }
    return null;
  };

  (prisma.notificationSchedule as any).findUnique = async ({ where }: any) => {
    const s = mockCampaign.schedules.find((item: any) => item.id === where.id);
    if (s) {
      return {
        ...s,
        campaign: mockCampaign,
      };
    }
    try {
      return await origScheduleFindUnique({ where });
    } catch {
      return null;
    }
  };

  (prisma.notificationSchedule as any).findMany = async ({ where }: any) => {
    let list = mockCampaign.schedules;
    if (where?.status) {
      list = list.filter((s: any) => s.status === where.status);
    }
    return list;
  };

  (prisma.driveApplication as any).findMany = async ({ where }: any) => {
    return mockApplications.filter((a) => a.driveId === where.driveId && a.status !== 'withdrawn');
  };

  (prisma.studentProfile as any).findMany = async () => mockStudents;

  (prisma.notification as any).findUnique = async ({ where }: any) => {
    if (where?.idempotencyKey) {
      return mockNotifications.find((n) => n.idempotencyKey === where.idempotencyKey) || null;
    }
    return null;
  };

  (prisma.notification as any).findMany = async ({ where }: any) => {
    let list = mockNotifications;
    if (where?.entityId) {
      list = list.filter((n) => n.entityId === where.entityId);
    }
    if (where?.category) {
      list = list.filter((n) => n.category === where.category);
    }
    return list;
  };

  (prisma as any).$transaction = async (fn: any) => {
    const tx = {
      notification: {
        create: async ({ data }: any) => {
          const newNotif = {
            id: `notif-${Date.now()}`,
            ...data,
            createdAt: new Date(),
            recipients: [] as any[],
          };
          mockNotifications.push(newNotif);
          return newNotif;
        },
      },
      notificationRecipient: {
        createMany: async ({ data }: any) => {
          const lastNotif = mockNotifications[mockNotifications.length - 1];
          if (lastNotif) {
            lastNotif.recipients.push(...data);
          }
          return { count: data.length };
        },
      },
    };
    return await fn(tx);
  };

  t.after(() => {
    (prisma.user as any).findUnique = origUserFindUnique;
    (prisma.user as any).findFirst = origUserFindFirst;
    (prisma.placementDrive as any).findUnique = origDriveFindUnique;
    (prisma.placementDrive as any).findMany = origDriveFindMany;
    (prisma.notificationCampaign as any).upsert = origCampaignUpsert;
    (prisma.notificationCampaign as any).findUnique = origCampaignFindUnique;
    (prisma.notificationSchedule as any).deleteMany = origScheduleDeleteMany;
    (prisma.notificationSchedule as any).createMany = origScheduleCreateMany;
    (prisma.notificationSchedule as any).create = origScheduleCreate;
    (prisma.notificationSchedule as any).updateMany = origScheduleUpdateMany;
    (prisma.notificationSchedule as any).update = origScheduleUpdate;
    (prisma.notificationSchedule as any).findUnique = origScheduleFindUnique;
    (prisma.notificationSchedule as any).findMany = origScheduleFindMany;
    (prisma.driveApplication as any).findMany = origAppFindMany;
    (prisma.studentProfile as any).findMany = origProfileFindMany;
    (prisma.notification as any).findUnique = origNotifFindUnique;
    (prisma.notification as any).findMany = origNotifFindMany;
    (prisma as any).$transaction = origTransaction;
  });

  // ============================================================
  // Test 1: Challenge 3 - Schedule Reminders on Publish
  // ============================================================
  await t.test('1. scheduleDriveReminders populates reminder intervals for published drive', async () => {
    const campaign = await scheduleDriveReminders(driveId, futureDeadline);
    assert.ok(campaign, 'Campaign should be created');
    assert.ok(mockCampaign.schedules.length >= 6, 'Should generate all default reminder intervals (initial, 7d, 3d, 24h, 6h, 1h)');

    const reminderTypes = mockCampaign.schedules.map((s: any) => s.reminderType);
    assert.ok(reminderTypes.includes('initial'), 'Must include initial reminder');
    assert.ok(reminderTypes.includes('7d'), 'Must include 7d reminder');
    assert.ok(reminderTypes.includes('3d'), 'Must include 3d reminder');
    assert.ok(reminderTypes.includes('24h'), 'Must include 24h reminder');
    assert.ok(reminderTypes.includes('6h'), 'Must include 6h reminder');
    assert.ok(reminderTypes.includes('1h'), 'Must include 1h reminder');
  });

  // ============================================================
  // Test 2: Challenge 2 & 6 - Dynamic Non-Applicant Query
  // ============================================================
  await t.test('2. getEligibleNonApplicants dynamically queries eligible students who have not applied', async () => {
    // Both students are initially non-applicants
    const candidates = await getEligibleNonApplicants(driveId);
    assert.strictEqual(candidates.length, 2, 'Both students should be eligible non-applicants');
    assert.ok(candidates.includes('stu-emns-1'));
    assert.ok(candidates.includes('stu-emns-2'));
  });

  // ============================================================
  // Test 3: Challenge 3 & 4 - Process Scheduled Reminder
  // ============================================================
  await t.test('3. processScheduledReminder sends notifications to eligible non-applicants and marks completed', async () => {
    const initialSchedule = mockCampaign.schedules.find((s: any) => s.reminderType === 'initial');
    assert.ok(initialSchedule, 'Initial schedule must exist');

    const result = await processScheduledReminder(initialSchedule.id);
    assert.strictEqual(result.processed, true, 'Schedule should be processed successfully');
    assert.strictEqual(result.recipients, 2, 'Should send to both eligible non-applicants');

    // Verify schedule status is completed
    assert.strictEqual(initialSchedule.status, 'completed', 'Schedule status must update to completed');
    assert.ok(initialSchedule.processedAt, 'Schedule processedAt timestamp must be recorded');

    // Verify notification was created with multi-channel delivery (in_app, email, push)
    assert.strictEqual(mockNotifications.length, 1);
    assert.strictEqual(mockNotifications[0].recipients.length, 6, '2 recipients x 3 channels (in_app + email + push)');
  });

  // ============================================================
  // Test 4: Challenge 6 - Dynamic Send-Time Exclusion of Applicants
  // ============================================================
  await t.test('4. Dynamic send-time revalidation excludes students who applied before subsequent reminders', async () => {
    // Student 1 applies for the drive
    mockApplications.push({ driveId, studentId: 'stu-emns-1', status: 'submitted' });

    // Next schedule (7d) is processed
    const schedule7d = mockCampaign.schedules.find((s: any) => s.reminderType === '7d');
    assert.ok(schedule7d, '7d schedule must exist');

    const result = await processScheduledReminder(schedule7d.id);
    assert.strictEqual(result.processed, true);
    assert.strictEqual(result.recipients, 1, 'Only Student 2 should receive the reminder (Student 1 applied)');

    // Verify notification recipients
    const latestNotif = mockNotifications[mockNotifications.length - 1];
    const userIds = latestNotif.recipients.map((r: any) => r.userId);
    assert.ok(!userIds.includes('stu-emns-1'), 'Applied Student 1 must not receive 7d reminder');
    assert.ok(userIds.includes('stu-emns-2'), 'Non-applied Student 2 must receive 7d reminder');
  });

  // ============================================================
  // Test 5: Challenge 7 - Atomic Lock & Idempotency
  // ============================================================
  await t.test('5. Atomic lock and idempotency prevent duplicate processing of reminder schedules', async () => {
    const completedSchedule = mockCampaign.schedules.find((s: any) => s.status === 'completed');
    assert.ok(completedSchedule);

    // Attempting to re-process an already completed schedule must abort gracefully
    const retryResult = await processScheduledReminder(completedSchedule.id);
    assert.strictEqual(retryResult.processed, false);
    assert.strictEqual(retryResult.reason, 'locked_or_completed');
  });

  // ============================================================
  // Test 6: Challenge 11 - Drive Cancellation Cancels Schedules
  // ============================================================
  await t.test('6. cancelDriveReminders marks all remaining pending schedules as cancelled', async () => {
    await cancelDriveReminders(driveId);

    const pending = mockCampaign.schedules.filter((s: any) => s.status === 'pending');
    assert.strictEqual(pending.length, 0, 'No schedules should remain pending after drive cancellation');

    const cancelled = mockCampaign.schedules.filter((s: any) => s.status === 'cancelled');
    assert.ok(cancelled.length > 0, 'Pending schedules must transition to cancelled');
  });

  // ============================================================
  // Test 7: Challenge 8 & 9 - PO EMNS Dashboard Endpoint
  // ============================================================
  await t.test('7. GET /api/emns/dashboard returns live campaign statistics for PO/Admin', async () => {
    const res = await request(app)
      .get('/api/emns/dashboard')
      .set('Authorization', `Bearer ${poToken}`);

    assert.strictEqual(res.status, 200, 'PO should have access to EMNS dashboard');
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Dashboard data should be an array of drives');

    const driveStat = res.body.data.find((d: any) => d.driveId === driveId);
    assert.ok(driveStat, 'Target drive must be present in dashboard metrics');
    assert.strictEqual(driveStat.companyName, 'Google LLC');
    assert.strictEqual(driveStat.jobTitle, 'Google SWE Placement Drive');
    assert.strictEqual(driveStat.totalApplications, 1, 'Total applications should reflect applied count');
    assert.strictEqual(driveStat.eligibleNonApplicants, 1, 'Eligible non-applicants count should be 1');
  });

  // ============================================================
  // Test 8: Challenge 8 - RBAC Security on EMNS Dashboard
  // ============================================================
  await t.test('8. RBAC restricts EMNS dashboard access from student accounts', async () => {
    const stuRes = await request(app)
      .get('/api/emns/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(stuRes.status, 403, 'Students must receive 403 Forbidden on EMNS dashboard');

    const unauthRes = await request(app).get('/api/emns/dashboard');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated requests must receive 401 Unauthorized');
  });

  // ============================================================
  // Test 9: Challenge 9 - Manual Reminder Trigger
  // ============================================================
  await t.test('9. POST /api/emns/trigger/:driveId allows PO to trigger immediate reminder campaign', async () => {
    // Reset drive status to published
    mockDrive.status = 'published';

    const res = await request(app)
      .post(`/api/emns/trigger/${driveId}`)
      .set('Authorization', `Bearer ${poToken}`)
      .send({ reminderType: 'manual_urgent' });

    assert.strictEqual(res.status, 200, 'Manual reminder trigger should return 200');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.processed, true);
    assert.strictEqual(res.body.data.recipients, 1); // Student 2 is remaining non-applicant
  });
});
