import { prisma } from '../src/config/prisma.js';

interface ExpectedCounts {
  users: number;
  profiles: number;
  branches: number;
  batches: number;
  topics: number;
  questions: number;
  problems: number;
  testCases: number;
  mockTests: number;
  attempts: number;
  submissions: number;
  companies: number;
  resources: number;
  notifications: number;
}

const BASE_EXPECTED: ExpectedCounts = {
  users: 9,
  profiles: 5,
  branches: 3,
  batches: 2,
  topics: 5,
  questions: 16,
  problems: 6,
  testCases: 13,
  mockTests: 1,
  attempts: 0,
  submissions: 0,
  companies: 3,
  resources: 0,
  notifications: 1,
};

const DEMO_EXPECTED: ExpectedCounts = {
  users: 9,
  profiles: 5,
  branches: 3,
  batches: 2,
  topics: 5,
  questions: 67,
  problems: 15,
  testCases: 63,
  mockTests: 4,
  attempts: 13,
  submissions: 12,
  companies: 8,
  resources: 6,
  notifications: 5,
};

async function checkDatabaseCounts() {
  console.log('================================================================');
  console.log('📊 DATABASE CLEANLINESS & COUNTS VERIFICATION');
  console.log('================================================================');

  const actual: ExpectedCounts = {
    users: await prisma.user.count(),
    profiles: await prisma.studentProfile.count(),
    branches: await prisma.branch.count(),
    batches: await prisma.batch.count(),
    topics: await prisma.topic.count(),
    questions: await prisma.aptitudeQuestion.count(),
    problems: await prisma.codingProblem.count(),
    testCases: await prisma.codingTestCase.count(),
    mockTests: await prisma.mockTest.count(),
    attempts: await prisma.testAttempt.count(),
    submissions: await prisma.codingSubmission.count(),
    companies: await prisma.company.count(),
    resources: await prisma.resource.count(),
    notifications: await prisma.notification.count(),
  };

  // Determine mode based on mockTests count or command line arg
  const isDemo = process.argv.includes('--demo') || actual.mockTests > 1 || actual.problems > 6;
  const expected = isDemo ? DEMO_EXPECTED : BASE_EXPECTED;
  const modeName = isDemo ? 'Base + Demo Seed (demo:reset)' : 'Base Seed (seed:reset)';

  console.log(`Mode: ${modeName}\n`);
  console.log('| Entity / Table       | Expected | Actual   | Status |');
  console.log('|----------------------|----------|----------|--------|');

  let hasMismatch = false;
  const keys = Object.keys(expected) as Array<keyof ExpectedCounts>;

  for (const key of keys) {
    const expVal = expected[key];
    const actVal = actual[key];
    const match = expVal === actVal;
    if (!match) hasMismatch = true;
    const status = match ? 'PASS ✅' : 'FAIL ❌';
    console.log(`| ${key.padEnd(20)} | ${String(expVal).padEnd(8)} | ${String(actVal).padEnd(8)} | ${status} |`);
  }

  console.log('================================================================');

  if (hasMismatch) {
    console.error('\n❌ DATABASE COUNT MISMATCH DETECTED! Uncleaned test records or missing seeds.');
    process.exit(1);
  } else {
    console.log(`\n\x1b[32m✅ ALL ${keys.length} ENTITY COUNTS MATCH EXPECTED CLEAN DATASET EXACTLY!\x1b[0m\n`);
    process.exit(0);
  }
}

checkDatabaseCounts()
  .catch((err) => {
    console.error('Fatal error checking DB counts:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
