// Challenges 221–240: Database Management & Integrity Suite
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import app from '../src/app.js';
import { prisma, Prisma } from '../src/config/prisma.js';
import { safeTransaction } from '../src/utils/transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

test('Database Management & Integrity: Challenges 221–240 Suite', async (t) => {

  // ============================================================
  // Challenge 221 & 222: Relational Integrity & Schema Normalization
  // ============================================================
  await t.test('Challenge 221/222: Normalized models and foreign keys exist across schema', () => {
    assert.ok(schemaContent.includes('model PlacementDrive {'), 'PlacementDrive model must be defined');
    assert.ok(schemaContent.includes('model DriveApplication {'), 'DriveApplication model must be defined');
    assert.ok(schemaContent.includes('model Offer {'), 'Offer model must be defined');
    assert.ok(schemaContent.includes('model TestAttempt {'), 'TestAttempt model must be defined');
    assert.ok(schemaContent.includes('model NotificationRecipient {'), 'NotificationRecipient model must be defined');
    assert.ok(schemaContent.includes('model AuditLog {'), 'AuditLog model must be defined');
  });

  // ============================================================
  // Challenge 223: Unique Constraint Enforcements
  // ============================================================
  await t.test('Challenge 223: Unique constraints prevent duplicate applications and accounts', () => {
    assert.ok(
      schemaContent.includes('@@unique([driveId, studentId])'),
      'DriveApplication must have unique constraint on [driveId, studentId]'
    );
    assert.ok(
      schemaContent.includes('@@unique([notificationId, userId, channel])'),
      'NotificationRecipient must have unique constraint on [notificationId, userId, channel]'
    );
    assert.ok(
      /email\s+String\s+@unique/.test(schemaContent),
      'User must enforce unique email constraint'
    );
  });

  // ============================================================
  // Challenge 227: Nullable Field Hardening & Safe Defaults
  // ============================================================
  await t.test('Challenge 227: MockTest and PlacementDrive have strict defaults and non-nullable fields', () => {
    assert.ok(
      schemaContent.includes('durationMins       Int                @default(30) @map("duration_mins")'),
      'MockTest.durationMins must be non-nullable Int with default 30'
    );
    assert.ok(
      schemaContent.includes('isActive           Boolean            @default(true) @map("is_active")'),
      'MockTest.isActive must be non-nullable Boolean with default true'
    );
    assert.ok(
      schemaContent.includes('status                  DriveStatus              @default(draft)'),
      'PlacementDrive.status must be non-nullable DriveStatus with default draft'
    );
  });

  // ============================================================
  // Challenge 228: Composite & Foreign Key Index Optimization
  // ============================================================
  await t.test('Challenge 228: Composite indexes are defined for high-volume query paths', () => {
    // TestAttempt indexes
    assert.ok(
      schemaContent.includes('@@index([studentId, status])'),
      'TestAttempt must have composite index on [studentId, status]'
    );
    assert.ok(
      schemaContent.includes('@@index([testId, status])'),
      'TestAttempt must have composite index on [testId, status]'
    );

    // DriveApplication indexes
    assert.ok(
      schemaContent.includes('@@index([driveId, status])'),
      'DriveApplication must have composite index on [driveId, status]'
    );
    assert.ok(
      schemaContent.includes('@@index([studentId, status])'),
      'DriveApplication must have composite index on [studentId, status]'
    );

    // NotificationRecipient index
    assert.ok(
      schemaContent.includes('@@index([userId, isRead])'),
      'NotificationRecipient must have composite index on [userId, isRead]'
    );

    // AuditLog index
    assert.ok(
      schemaContent.includes('@@index([action, createdAt])'),
      'AuditLog must have composite index on [action, createdAt]'
    );
  });

  // ============================================================
  // Challenge 229 & 230: Concurrency, Deadlock Retries & Safe Transactions
  // ============================================================
  await t.test('Challenge 229: safeTransaction automatically retries on deadlock (P2034)', async () => {
    const origTransaction = prisma.$transaction.bind(prisma);
    let attempts = 0;

    try {
      (prisma as any).$transaction = async (fn: any, opts: any) => {
        attempts++;
        if (attempts < 3) {
          const err: any = new Error('Database deadlock encountered');
          err.code = 'P2034';
          throw err;
        }
        return fn({} as any);
      };

      const result = await safeTransaction(async (tx) => ({ recovered: true, txAvailable: !!tx }));
      assert.strictEqual(attempts, 3, 'Should have retried twice and succeeded on 3rd attempt');
      assert.strictEqual(result.recovered, true);
    } finally {
      (prisma as any).$transaction = origTransaction;
    }
  });

  await t.test('Challenge 229: safeTransaction automatically retries on write conflict (P2037)', async () => {
    const origTransaction = prisma.$transaction.bind(prisma);
    let attempts = 0;

    try {
      (prisma as any).$transaction = async (fn: any, opts: any) => {
        attempts++;
        if (attempts < 2) {
          const err: any = new Error('Write conflict encountered');
          err.code = 'P2037';
          throw err;
        }
        return fn({} as any);
      };

      const result = await safeTransaction(async () => 'success_after_conflict');
      assert.strictEqual(attempts, 2, 'Should have retried once on P2037');
      assert.strictEqual(result, 'success_after_conflict');
    } finally {
      (prisma as any).$transaction = origTransaction;
    }
  });

  await t.test('Challenge 229: safeTransaction throws after MAX_RETRIES exhausted', async () => {
    const origTransaction = prisma.$transaction.bind(prisma);
    let attempts = 0;

    try {
      (prisma as any).$transaction = async () => {
        attempts++;
        const err: any = new Error('Persistent deadlock');
        err.code = 'P2034';
        throw err;
      };

      await assert.rejects(
        async () => {
          await safeTransaction(async () => {});
        },
        /Transaction failed after multiple retries due to deadlocks/
      );
      assert.strictEqual(attempts, 3, 'Must attempt exactly 3 times before giving up');
    } finally {
      (prisma as any).$transaction = origTransaction;
    }
  });

  await t.test('Challenge 229: safeTransaction immediately re-throws non-retryable errors', async () => {
    const origTransaction = prisma.$transaction.bind(prisma);
    let attempts = 0;

    try {
      (prisma as any).$transaction = async () => {
        attempts++;
        const err: any = new Error('Unique constraint violation');
        err.code = 'P2002';
        throw err;
      };

      await assert.rejects(
        async () => {
          await safeTransaction(async () => {});
        },
        (err: any) => {
          assert.strictEqual(err.code, 'P2002');
          return true;
        }
      );
      assert.strictEqual(attempts, 1, 'Non-retryable error should not be retried');
    } finally {
      (prisma as any).$transaction = origTransaction;
    }
  });

  await t.test('Challenge 230: safeTransaction passes isolation level and timeout to prisma.$transaction', async () => {
    const origTransaction = prisma.$transaction.bind(prisma);
    let capturedOptions: any = null;

    try {
      (prisma as any).$transaction = async (fn: any, opts: any) => {
        capturedOptions = opts;
        return fn({} as any);
      };

      await safeTransaction(async () => 'ok', {
        timeout: 15000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      assert.strictEqual(capturedOptions.timeout, 15000);
      assert.strictEqual(capturedOptions.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    } finally {
      (prisma as any).$transaction = origTransaction;
    }
  });

  // ============================================================
  // Challenges 231, 232, 240: Cascade Rules & Historical Preservation
  // ============================================================
  await t.test('Challenge 231/232/240: DriveApplication restricts deletion of Drive and Student', () => {
    // Verify onDelete: Restrict on DriveApplication
    assert.ok(
      schemaContent.includes('drive                     PlacementDrive    @relation(fields: [driveId], references: [id], onDelete: Restrict)'),
      'DriveApplication relation to PlacementDrive must specify onDelete: Restrict'
    );
    assert.ok(
      schemaContent.includes('student                   User              @relation(fields: [studentId], references: [id], onDelete: Restrict)'),
      'DriveApplication relation to User must specify onDelete: Restrict'
    );
  });

  await t.test('Challenge 231/232/240: Offer restricts drive deletion and sets null on application deletion', () => {
    assert.ok(
      schemaContent.includes('drive              PlacementDrive?   @relation(fields: [driveId], references: [id], onDelete: Restrict)'),
      'Offer relation to PlacementDrive must specify onDelete: Restrict'
    );
    assert.ok(
      schemaContent.includes('application        DriveApplication? @relation(fields: [applicationId], references: [id], onDelete: SetNull)'),
      'Offer relation to DriveApplication must specify onDelete: SetNull'
    );
  });

  await t.test('Challenge 231/240: InterviewFeedback preserves audit trail with onDelete: SetNull', () => {
    assert.ok(
      schemaContent.includes('interview         MockInterview? @relation(fields: [interviewId], references: [id], onDelete: SetNull)'),
      'InterviewFeedback relation to MockInterview must specify onDelete: SetNull'
    );
  });

  // ============================================================
  // Challenges 233 & 234: Backup & Restoration Scripts
  // ============================================================
  await t.test('Challenge 233: Backup script exists and contains pg_dump compressed pipeline', () => {
    const backupScriptPath = path.resolve(__dirname, '../scripts/backup-db.sh');
    assert.ok(fs.existsSync(backupScriptPath), 'scripts/backup-db.sh must exist');
    const content = fs.readFileSync(backupScriptPath, 'utf-8');
    assert.ok(content.includes('pg_dump'), 'Must call pg_dump');
    assert.ok(content.includes('gzip'), 'Must compress with gzip');
    assert.ok(content.includes('DATABASE_URL'), 'Must reference DATABASE_URL');
  });

  await t.test('Challenge 234: Restore script exists and contains safe recreation pipeline', () => {
    const restoreScriptPath = path.resolve(__dirname, '../scripts/restore-db.sh');
    assert.ok(fs.existsSync(restoreScriptPath), 'scripts/restore-db.sh must exist');
    const content = fs.readFileSync(restoreScriptPath, 'utf-8');
    assert.ok(content.includes('dropdb'), 'Must support dropping database');
    assert.ok(content.includes('createdb'), 'Must recreate clean database');
    assert.ok(content.includes('psql'), 'Must stream into psql');
    assert.ok(content.includes('gunzip'), 'Must decompress with gunzip');
  });

  // ============================================================
  // Challenge 235 & 237: Timestamp Tracking & Audit Preservation
  // ============================================================
  await t.test('Challenge 235/237: Critical entities track UTC timestamps and audit trails', () => {
    assert.ok(/createdAt\s+DateTime\s+@default\(now\(\)\)/.test(schemaContent), 'Entities must have createdAt with default(now)');
    assert.ok(/updatedAt\s+DateTime\s+@updatedAt/.test(schemaContent), 'Entities must have updatedAt');
    assert.ok(schemaContent.includes('deletedAt'), 'Soft deletion must be supported with deletedAt');
  });

  // ============================================================
  // Challenge 239: Database Health Check Integration
  // ============================================================
  await t.test('Challenge 239: /api/health reports database health status gracefully', async () => {
    const res = await request(app).get('/api/health');
    assert.ok([200, 503].includes(res.status), `Health endpoint must return 200 or 503, got ${res.status}`);
    assert.ok(['ok', 'degraded'].includes(res.body.status), 'Health response must indicate status');
    assert.strictEqual(res.body.service, 'intelliplace-backend');
    assert.ok(['ok', 'disconnected'].includes(res.body.database), 'Database health status must be reported');
  });
});
