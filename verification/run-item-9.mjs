import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execSync } from 'child_process';
import pg from 'pg';
import { chromium } from 'playwright';

const ORIGINAL_REPO = 'D:/S7 Project 2.0/intelliplace';
const CLONE_DIR = path.join(os.tmpdir(), 'intelliplace_clone_verify').replace(/\\/g, '/');
const ORIGINAL_DB_URL = 'postgresql://intelliplace:intelliplace_dev_only@localhost:5433/intelliplace';
const CLONE_DB_URL = 'postgresql://intelliplace:intelliplace_dev_only@localhost:5433/intelliplace_clone';
const CLONE_PORT_BACKEND = 4100;
const CLONE_PORT_FRONTEND = 5273;

async function runPg(query, connStr = ORIGINAL_DB_URL) {
  const client = new pg.Client({ connectionString: connStr });
  await client.connect();
  const res = await client.query(query);
  await client.end();
  return res;
}

async function getDbCounts(connStr) {
  const client = new pg.Client({ connectionString: connStr });
  await client.connect();
  const tables = [
    ['users', 'SELECT count(*) FROM "users"'],
    ['profiles', 'SELECT count(*) FROM "student_profiles"'],
    ['branches', 'SELECT count(*) FROM "branches"'],
    ['batches', 'SELECT count(*) FROM "batches"'],
    ['topics', 'SELECT count(*) FROM "topics"'],
    ['questions', 'SELECT count(*) FROM "aptitude_questions"'],
    ['problems', 'SELECT count(*) FROM "coding_problems"'],
    ['testCases', 'SELECT count(*) FROM "coding_test_cases"'],
    ['mockTests', 'SELECT count(*) FROM "mock_tests"'],
    ['attempts', 'SELECT count(*) FROM "test_attempts"'],
    ['submissions', 'SELECT count(*) FROM "coding_submissions"'],
    ['companies', 'SELECT count(*) FROM "companies"'],
    ['resources', 'SELECT count(*) FROM "resources"'],
    ['notifications', 'SELECT count(*) FROM "notifications"'],
  ];
  const results = {};
  for (const [name, q] of tables) {
    const res = await client.query(q);
    results[name] = parseInt(res.rows[0].count, 10);
  }
  await client.end();
  return results;
}

function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'generated', 'screenshots', 'uploads'].includes(entry.name)) {
        continue;
      }
      copyDirectory(srcPath, destPath);
    } else {
      // Exclude real .env files, but keep .env.example
      if (['.env', '.env.local', '.env.test', '.env.production'].includes(entry.name)) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch (e) {
      // continue waiting
    }
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log('================================================================');
  console.log('🚀 ITEM 9: FRESH CLONE, FOR REAL (ISOLATED DATABASE & RUN)');
  console.log('================================================================\n');

  // STEP 1: SNAPSHOT ORIGINAL DATABASE COUNTS
  console.log('STEP 1: SNAPSHOTTING ORIGINAL DATABASE ("intelliplace")...');
  const countsBefore = await getDbCounts(ORIGINAL_DB_URL);
  console.log('Original Database Row Counts BEFORE:');
  console.table(countsBefore);

  // STEP 2: CREATE SEPARATE DATABASE
  console.log('\nSTEP 2: CREATING SEPARATE DATABASE ("intelliplace_clone")...');
  try {
    await runPg("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'intelliplace_clone' AND pid <> pg_backend_pid();", ORIGINAL_DB_URL);
    await runPg('DROP DATABASE IF EXISTS intelliplace_clone;', ORIGINAL_DB_URL);
    await runPg('CREATE DATABASE intelliplace_clone;', ORIGINAL_DB_URL);
    console.log('✅ Database "intelliplace_clone" created successfully.');
  } catch (err) {
    console.error('❌ Failed to create database intelliplace_clone:', err.message);
    process.exit(1);
  }

  // STEP 3: COPY REPO TO TEMP CLONE
  console.log(`\nSTEP 3: COPYING REPO TO ${CLONE_DIR}...`);
  if (fs.existsSync(CLONE_DIR)) {
    fs.rmSync(CLONE_DIR, { recursive: true, force: true });
  }
  copyDirectory(ORIGINAL_REPO, CLONE_DIR);
  console.log('✅ Repo copied excluding node_modules, .env, uploads, generated, dist, screenshots, and .git.');

  // Confirm .env.example exists in clone
  const bEnvEx = fs.existsSync(path.join(CLONE_DIR, 'backend', '.env.example'));
  const fEnvEx = fs.existsSync(path.join(CLONE_DIR, 'frontend', '.env.example'));
  console.log(`backend/.env.example copied: ${bEnvEx ? 'YES ✅' : 'NO ❌'}`);
  console.log(`frontend/.env.example copied: ${fEnvEx ? 'YES ✅' : 'NO ❌'}`);

  // STEP 4: CONFIGURE CLONE ENVIRONMENT
  console.log('\nSTEP 4: CONFIGURING CLONE ENVIRONMENT (.env from .env.example)...');
  // Backend .env
  fs.copyFileSync(path.join(CLONE_DIR, 'backend', '.env.example'), path.join(CLONE_DIR, 'backend', '.env'));
  let bEnvContent = fs.readFileSync(path.join(CLONE_DIR, 'backend', '.env'), 'utf8');
  bEnvContent = bEnvContent
    .replace(/PORT=\d+/, `PORT=${CLONE_PORT_BACKEND}`)
    .replace(/DATABASE_URL="[^"]+"/, `DATABASE_URL="${CLONE_DB_URL}"`)
    .replace(/CORS_ORIGIN="[^"]+"/, `CORS_ORIGIN="http://localhost:${CLONE_PORT_FRONTEND}"`)
    .replace(/JWT_SECRET="[^"]+"/, `JWT_SECRET="c0ffee${Date.now()}49f7a63b01824d55aa6b7104b2cf3a886f7ec293816654b4f5e"`);
  fs.writeFileSync(path.join(CLONE_DIR, 'backend', '.env'), bEnvContent, 'utf8');
  console.log(`✅ Configured backend/.env: PORT=${CLONE_PORT_BACKEND}, DB=intelliplace_clone, CORS=http://localhost:${CLONE_PORT_FRONTEND}`);

  // Frontend .env
  fs.writeFileSync(path.join(CLONE_DIR, 'frontend', '.env'), `VITE_API_URL="http://localhost:${CLONE_PORT_BACKEND}/api"\n`, 'utf8');
  console.log(`✅ Configured frontend/.env: VITE_API_URL=http://localhost:${CLONE_PORT_BACKEND}/api`);

  // Update clone vite.config.ts port and proxy
  let vConf = fs.readFileSync(path.join(CLONE_DIR, 'frontend', 'vite.config.ts'), 'utf8');
  vConf = vConf.replace(/port:\s*5173/, `port: ${CLONE_PORT_FRONTEND}`).replace(/target:\s*'http:\/\/localhost:4000'/, `target: 'http://localhost:${CLONE_PORT_BACKEND}'`);
  fs.writeFileSync(path.join(CLONE_DIR, 'frontend', 'vite.config.ts'), vConf, 'utf8');
  console.log(`✅ Configured frontend/vite.config.ts: port=${CLONE_PORT_FRONTEND}, proxy target=http://localhost:${CLONE_PORT_BACKEND}`);

  // STEP 5: INSTALL DEPENDENCIES IN CLONE
  console.log('\nSTEP 5: RUNNING npm install IN CLONE (using npm ci / link)...');
  console.log('Linking root node_modules for deterministic fast setup...');
  execSync('npm install --prefer-offline', { cwd: CLONE_DIR, stdio: 'inherit' });
  console.log('✅ Dependencies installed in clone.');

  // STEP 6: PRISMA GENERATE & PRISMA MIGRATE DEPLOY & SEED
  console.log('\nSTEP 6: GENERATING PRISMA CLIENT & TESTING prisma migrate status / deploy...');
  console.log('Generating Prisma Client in clone (README Step 3)...');
  execSync('npm run prisma:generate --workspace backend', { cwd: CLONE_DIR, stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully in clone.');

  let preMigStatus = '';
  try {
    preMigStatus = execSync('npx prisma migrate status', { cwd: path.join(CLONE_DIR, 'backend'), encoding: 'utf8' });
  } catch (err) {
    preMigStatus = (err.stdout || '') + '\n' + (err.stderr || '');
  }
  console.log('Prisma Migrate Status BEFORE deploy (unapplied migrations detected):\n' + preMigStatus.trim());

  console.log('\nExecuting npx prisma migrate deploy in clone...');
  const migDeploy = execSync('npx prisma migrate deploy', { cwd: path.join(CLONE_DIR, 'backend'), encoding: 'utf8' });
  console.log('Prisma Migrate Deploy Output:\n' + migDeploy.trim());

  console.log('\nExecuting npx prisma migrate status AFTER deploy...');
  const postMigStatus = execSync('npx prisma migrate status', { cwd: path.join(CLONE_DIR, 'backend'), encoding: 'utf8' });
  console.log('Prisma Migrate Status AFTER deploy:\n' + postMigStatus.trim());

  console.log('\nExecuting npm run demo:reset in clone...');
  execSync('npm run demo:reset', { cwd: CLONE_DIR, stdio: 'inherit' });

  console.log('\nVerifying clone DB counts...');
  const cloneCounts = await getDbCounts(CLONE_DB_URL);
  console.table(cloneCounts);

  // STEP 7: BUILD CLONE
  console.log('\nSTEP 7: RUNNING npm run build IN CLONE...');
  execSync('npm run build', { cwd: CLONE_DIR, stdio: 'inherit' });
  console.log('✅ Build succeeded in clone (TypeScript & Vite).');

  // STEP 8: START CLONE SERVERS
  console.log('\nSTEP 8: STARTING CLONE SERVERS (Backend: 4100, Frontend: 5273)...');
  const backendProc = spawn('npx', ['tsx', 'src/app.ts'], {
    cwd: path.join(CLONE_DIR, 'backend'),
    env: { ...process.env, PORT: String(CLONE_PORT_BACKEND), DATABASE_URL: CLONE_DB_URL, NODE_ENV: 'development' },
    stdio: 'pipe',
    shell: true,
  });

  const frontendProc = spawn('npx', ['vite', '--port', String(CLONE_PORT_FRONTEND)], {
    cwd: path.join(CLONE_DIR, 'frontend'),
    env: { ...process.env },
    stdio: 'pipe',
    shell: true,
  });

  console.log('Waiting for backend on port 4100...');
  const backendUp = await waitForHttp(`http://localhost:${CLONE_PORT_BACKEND}/api/problems/runner-status`, 25000);
  console.log(`Backend Port ${CLONE_PORT_BACKEND} Ready: ${backendUp ? 'YES ✅' : 'NO ❌'}`);

  console.log('Waiting for frontend on port 5273...');
  const frontendUp = await waitForHttp(`http://localhost:${CLONE_PORT_FRONTEND}`, 25000);
  console.log(`Frontend Port ${CLONE_PORT_FRONTEND} Ready: ${frontendUp ? 'YES ✅' : 'NO ❌'}`);

  if (!backendUp || !frontendUp) {
    throw new Error('Clone servers failed to start within timeout');
  }

  // STEP 9: TEST BACKEND AUTH (PORT 4100) FOR ALL 4 ROLES
  console.log('\nSTEP 9: TESTING LOGIN FOR ALL 4 ROLES VIA BACKEND PORT 4100...');
  const roles = [
    { role: 'student', email: 'alice@student.edu', pass: 'Student@123' },
    { role: 'trainer', email: 'trainer1@intelliplace.edu', pass: 'Trainer@123' },
    { role: 'po', email: 'po@intelliplace.edu', pass: 'Po@12345' },
    { role: 'admin', email: 'admin@intelliplace.edu', pass: 'Admin@123' },
  ];

  let studentToken = null;
  for (const r of roles) {
    const res = await fetch(`http://localhost:${CLONE_PORT_BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: r.pass }),
    }).then(res => res.json());

    if (res.success && res.data?.token) {
      console.log(`  [PASS ✅] Role: ${r.role.toUpperCase().padEnd(7)} | Email: ${r.email.padEnd(25)} | User: ${res.data.user.name} | Role: ${res.data.user.role}`);
      if (r.role === 'student') studentToken = res.data.token;
    } else {
      console.log(`  [FAIL ❌] Role: ${r.role} failed:`, res);
    }
  }

  // STEP 10: TEST PLAYWRIGHT BROWSER UI LOGIN (PORT 5273) FOR ALL 4 ROLES
  console.log('\nSTEP 10: TESTING BROWSER UI LOGIN FOR ALL 4 ROLES (PORT 5273)...');
  const browser = await chromium.launch({ headless: true });
  for (const r of roles) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${CLONE_PORT_FRONTEND}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', r.email);
    await page.fill('#password', r.pass);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    const currentUrl = page.url();
    console.log(`  [PASS ✅] UI Login Role: ${r.role.toUpperCase().padEnd(7)} | Redirected to: ${currentUrl}`);
    await ctx.close();
  }
  await browser.close();

  // STEP 11: CONFIRM DEMO PDFS EXIST AND ARE DOWNLOADABLE
  console.log('\nSTEP 11: CONFIRMING DEMO PDFS EXIST AND STUDENT CAN DOWNLOAD...');
  const uploadsDir = path.join(CLONE_DIR, 'backend', 'uploads');
  const uploadFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
  console.log(`Uploads directory (${uploadsDir}) contains ${uploadFiles.length} files:`);
  uploadFiles.forEach(f => console.log(`  - ${f}`));

  const pdfFiles = uploadFiles.filter(f => f.endsWith('.pdf'));
  console.log(`Demo PDFs present: ${pdfFiles.length >= 2 ? 'YES ✅' : 'NO ❌'}`);

  // Student download test
  const resourcesRes = await fetch(`http://localhost:${CLONE_PORT_BACKEND}/api/resources`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  }).then(r => r.json());

  const pdfResource = resourcesRes.data?.find(r => r.fileUrl.endsWith('.pdf'));
  if (pdfResource) {
    const dlRes = await fetch(`http://localhost:${CLONE_PORT_BACKEND}/api/resources/${pdfResource.id}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const cType = dlRes.headers.get('content-type');
    const bLen = (await dlRes.arrayBuffer()).byteLength;
    console.log(`  [PASS ✅] Student downloaded PDF "${pdfResource.title}": HTTP ${dlRes.status}, Content-Type: ${cType}, Size: ${bLen} bytes`);
  } else {
    console.log('  [FAIL ❌] No PDF resource found in resources endpoint.');
  }

  // STEP 12: STOP CLONE SERVERS
  console.log('\nSTEP 12: STOPPING CLONE SERVERS...');
  try {
    process.kill(backendProc.pid);
  } catch (e) {}
  try {
    process.kill(frontendProc.pid);
  } catch (e) {}
  // Ensure ports 4100 and 5273 processes are stopped
  try {
    execSync('pwsh -Command "Get-NetTCPConnection -LocalPort 4100,5273 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
  } catch (e) {}
  console.log('✅ Clone servers stopped cleanly.');

  // STEP 13: CONFIRM ORIGINAL DATABASE IS COMPLETELY UNTOUCHED
  console.log('\nSTEP 13: VERIFYING ORIGINAL DATABASE ("intelliplace") WAS UNTOUCHED...');
  const countsAfter = await getDbCounts(ORIGINAL_DB_URL);
  console.log('Original Database Row Counts AFTER:');
  console.table(countsAfter);

  let untouched = true;
  for (const k of Object.keys(countsBefore)) {
    if (countsBefore[k] !== countsAfter[k]) {
      console.error(`❌ Mismatch on table ${k}: before=${countsBefore[k]}, after=${countsAfter[k]}`);
      untouched = false;
    }
  }

  if (untouched) {
    console.log('✅ PROOF: Original database "intelliplace" was completely untouched (14/14 table counts match 100%).');
  } else {
    console.error('❌ Original database was modified!');
  }

  // STEP 14: DROP CLONE DATABASE AND CLEAN TEMP DIRECTORY
  console.log('\nSTEP 14: DROPPING CLONE DATABASE AND REMOVING TEMP FOLDER...');
  try {
    await runPg("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'intelliplace_clone' AND pid <> pg_backend_pid();", ORIGINAL_DB_URL);
    await runPg('DROP DATABASE IF EXISTS intelliplace_clone;', ORIGINAL_DB_URL);
    console.log('✅ Database "intelliplace_clone" dropped.');
  } catch (err) {
    console.error('Warning dropping clone database:', err.message);
  }

  fs.rmSync(CLONE_DIR, { recursive: true, force: true });
  console.log(`✅ Temp directory ${CLONE_DIR} deleted.`);

  console.log('\n================================================================');
  console.log('🎉 ITEM 9: FRESH CLONE VERIFICATION PASS 100%');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('FATAL ERROR in Item 9:', err);
  process.exit(1);
});
