import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { prisma } = await import('../dist/config/prisma.js');

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

async function main() {
  console.log('================================================================');
  console.log('🧪 VERIFY TEST-ONLY HOOKS IN DEVELOPMENT MODE');
  console.log('================================================================');

  // 1. Log in through the API as Alice
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@student.edu', password: 'Student@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data?.token) {
    throw new Error('Failed to log in as Alice: ' + JSON.stringify(loginData));
  }
  const token = loginData.data.token;
  console.log('✅ Logged in as Alice via API');

  // 2. Check runner concurrency endpoint in development mode -> MUST BE 404
  const concRes1 = await fetch(`${BASE_URL}/api/problems/runner-concurrency`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const concRes2 = await fetch(`${BASE_URL}/api/problems/runner/concurrency`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`GET /api/problems/runner-concurrency -> Status: ${concRes1.status} (Expected 404)`);
  console.log(`GET /api/problems/runner/concurrency -> Status: ${concRes2.status} (Expected 404)`);

  if (concRes1.status !== 404 || concRes2.status !== 404) {
    console.error('❌ FAIL: Concurrency endpoint is accessible in development mode!');
    process.exit(1);
  }
  console.log('✅ PASS: Concurrency endpoints returned 404 in development mode');

  // 3. Test submit rate limit with bypass header
  const problem = await prisma.codingProblem.findFirst({ where: { title: { contains: 'Array' } } });
  if (!problem) throw new Error('Array problem not found');

  console.log('\nSending 11 rapid submits with header {"x-bypass-submit-rate-limit": "true"}...');
  const submitStatuses = [];

  for (let i = 1; i <= 11; i++) {
    const res = await fetch(`${BASE_URL}/api/problems/${problem.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-bypass-submit-rate-limit': 'true',
      },
      body: JSON.stringify({
        language: 'python',
        code: 'print(15)',
      }),
    });
    submitStatuses.push(res.status);
    console.log(`  Submit #${i} (with bypass header) -> HTTP ${res.status}`);
  }

  const eleventhStatus = submitStatuses[10];
  console.log(`\n11th Submit Status: ${eleventhStatus}`);

  if (eleventhStatus === 429) {
    console.log('✅ PASS: 11th submit returned 429 Too Many Requests (bypass header was IGNORED in development mode!)');
  } else {
    console.error(`❌ FAIL: Expected HTTP 429 on 11th submit, got ${eleventhStatus}`);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('✅ ITEM 6 PROOF COMPLETE: Hooks are inactive outside NODE_ENV===test');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('Verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
