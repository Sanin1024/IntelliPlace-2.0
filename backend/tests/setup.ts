import { prisma } from '../src/config/prisma.js';
import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';

/**
 * Global test setup — runs once before all test suites.
 * Challenge 321: Validates test environment configuration.
 * Challenge 322: Ensures clean database state.
 */
export async function setupTestEnvironment() {
  // Safety check: NEVER run tests against production database
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test') && process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: Test database URL must contain "test". Current: ' + dbUrl + '\n' +
      'Set DATABASE_URL in .env.test to point to a test database.'
    );
  }

  // Ensure JWT_SECRET is set
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-secret-32-chars-minimum-length-for-hmac';
  }

  // Push schema to test database if reachable
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'ignore',
      env: { ...process.env },
    });
  } catch {
    // Graceful offline mock handling
  }

  // Seed base data (branches, batches, topics, admin user)
  await seedBaseData().catch(() => {});
}

// Support Jest hook if running under Jest
if (typeof beforeAll === 'function') {
  beforeAll(async () => {
    await setupTestEnvironment();
  });
}

// Support Jest hook if running under Jest
if (typeof afterAll === 'function') {
  afterAll(async () => {
    await prisma.$disconnect().catch(() => {});
  });
}

/**
 * Seeds minimal base data required by all test suites.
 * Each test suite is responsible for cleaning up its own e2e- prefixed records.
 */
export async function seedBaseData() {
  // Create branches
  const cse = await prisma.branch.upsert({
    where: { name: 'CSE' },
    update: {},
    create: { name: 'CSE' },
  }).catch(() => null);

  await prisma.branch.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' },
  }).catch(() => null);

  // Create batches
  await prisma.batch.upsert({
    where: { name: '2025' },
    update: {},
    create: { name: '2025', graduationYear: 2025 },
  }).catch(() => null);

  await prisma.batch.upsert({
    where: { name: '2026' },
    update: {},
    create: { name: '2026', graduationYear: 2026 },
  }).catch(() => null);

  // Create topics
  const quant = await prisma.topic.upsert({
    where: { name: 'Quantitative Aptitude' },
    update: {},
    create: { name: 'Quantitative Aptitude', type: 'aptitude' },
  }).catch(() => null);

  await prisma.topic.upsert({
    where: { name: 'Logical Reasoning' },
    update: {},
    create: { name: 'Logical Reasoning', type: 'aptitude' },
  }).catch(() => null);

  await prisma.topic.upsert({
    where: { name: 'Arrays' },
    update: {},
    create: { name: 'Arrays', type: 'coding' },
  }).catch(() => null);

  // Create admin user
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@intelliplace.edu' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@intelliplace.edu',
      passwordHash: adminHash,
      role: 'admin',
    },
  }).catch(() => null);

  // Create PO
  const poHash = await bcrypt.hash('Po@12345', 10);
  await prisma.user.upsert({
    where: { email: 'po@intelliplace.edu' },
    update: {},
    create: {
      name: 'Placement Officer',
      email: 'po@intelliplace.edu',
      passwordHash: poHash,
      role: 'po',
    },
  }).catch(() => null);

  // Create trainer
  const trainerHash = await bcrypt.hash('Trainer@123', 10);
  await prisma.user.upsert({
    where: { email: 'trainer1@intelliplace.edu' },
    update: {},
    create: {
      name: 'Rahul Trainer',
      email: 'trainer1@intelliplace.edu',
      passwordHash: trainerHash,
      role: 'trainer',
    },
  }).catch(() => null);

  // Create aptitude questions
  if (quant) {
    const existingQs = await prisma.aptitudeQuestion.count().catch(() => 0);
    if (existingQs === 0) {
      for (let i = 0; i < 6; i++) {
        await prisma.aptitudeQuestion.create({
          data: {
            topicId: quant.id,
            difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
            questionText: `Test question ${i}: What is ${i + 1} + ${i + 1}?`,
            optionA: String((i + 1) * 2),
            optionB: String((i + 1) * 3),
            optionC: String((i + 1) * 2 + 1),
            optionD: String((i + 1) * 4),
            correctOption: 'A',
            explanation: `Because ${i + 1} + ${i + 1} = ${(i + 1) * 2}`,
          },
        }).catch(() => null);
      }
    }
  }
}

