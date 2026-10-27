import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

// 1. Read backend/.env
const envPath = path.join(backendDir, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const parseEnv = (content) => {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    let val = rest.join('=');
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    result[key.trim()] = val.trim();
  }
  return result;
};

const parsedEnv = parseEnv(envContent);
console.log('=== CHECKING backend/.env ===');
console.log(`backend/.env NODE_ENV = ${parsedEnv.NODE_ENV}`);
console.log(`backend/.env CODE_RUNNER_ENABLED = ${parsedEnv.CODE_RUNNER_ENABLED}`);

if (parsedEnv.NODE_ENV !== 'development') {
  console.error('FAIL: backend/.env NODE_ENV is not development');
  process.exit(1);
}
if (parsedEnv.CODE_RUNNER_ENABLED !== 'false') {
  console.error('FAIL: backend/.env CODE_RUNNER_ENABLED is not false');
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForServer(port, maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.status === 200) return true;
    } catch (e) {
      // wait
    }
    await sleep(200);
  }
  throw new Error(`Server on port ${port} failed to start`);
}

// 2. Test with NODE_ENV=development
console.log('\n=== TESTING NODE_ENV=development ===');
const devProc = spawn('node', ['dist/app.js'], {
  cwd: backendDir,
  env: { ...process.env, NODE_ENV: 'development', PORT: '4021' },
  stdio: 'pipe',
});

try {
  await waitForServer(4021);
  const resDev = await fetch('http://localhost:4021/api/auth/reset-limiter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log(`POST /api/auth/reset-limiter with NODE_ENV=development -> status ${resDev.status}`);
  if (resDev.status !== 404) {
    console.error(`FAIL: expected 404, got ${resDev.status}`);
    process.exit(1);
  } else {
    console.log('PASS: Returned 404 under NODE_ENV=development');
  }
} finally {
  devProc.kill('SIGKILL');
  await sleep(300);
}

// 3. Test with NODE_ENV=test
console.log('\n=== TESTING NODE_ENV=test ===');
const testProc = spawn('node', ['dist/app.js'], {
  cwd: backendDir,
  env: { ...process.env, NODE_ENV: 'test', PORT: '4022' },
  stdio: 'pipe',
});

try {
  await waitForServer(4022);

  // Test without token -> 401
  const resNoToken = await fetch('http://localhost:4022/api/auth/reset-limiter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log(`POST /api/auth/reset-limiter with NODE_ENV=test (no token) -> status ${resNoToken.status}`);
  if (resNoToken.status !== 401) {
    console.error(`FAIL: expected 401, got ${resNoToken.status}`);
    process.exit(1);
  } else {
    console.log('PASS: Returned 401 under NODE_ENV=test without token');
  }

  // Login as admin to get token
  const loginRes = await fetch('http://localhost:4022/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@intelliplace.edu', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.data.token;

  // Test with admin token -> 200
  const resAdmin = await fetch('http://localhost:4022/api/auth/reset-limiter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  console.log(`POST /api/auth/reset-limiter with NODE_ENV=test (admin token) -> status ${resAdmin.status}`);
  if (resAdmin.status !== 200) {
    console.error(`FAIL: expected 200, got ${resAdmin.status}`);
    process.exit(1);
  } else {
    console.log('PASS: Returned 200 under NODE_ENV=test with admin token');
  }
} finally {
  testProc.kill('SIGKILL');
  await sleep(300);
}

console.log('\n=== ALL PART 0 ITEM 1 CHECKS PASSED ===');
process.exit(0);
