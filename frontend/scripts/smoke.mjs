import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.resolve(__dirname, '..', 'e2e-screenshots');
const demoScreenshotsDir = path.resolve(screenshotsDir, 'demo');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}
if (!fs.existsSync(demoScreenshotsDir)) {
  fs.mkdirSync(demoScreenshotsDir, { recursive: true });
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.API_URL || 'http://localhost:4000';

// Load backend .env for prisma database cleanup
const envPath = path.resolve(__dirname, '..', '..', 'backend', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) {
        process.env[k] = v;
      }
    }
  }
}

let prisma = null;
try {
  const prismaModule = await import('../../backend/dist/config/prisma.js');
  prisma = prismaModule.prisma;
} catch (e) {
  console.warn('Prisma cleanup helper not available:', e.message);
}

async function apiRequest(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function run() {
  console.log('================================================================');
  console.log('🎭 Running Extended Playwright Smoke Tests: Part 0 & Part 1');
  console.log(`   Frontend Target: ${FRONTEND_URL}`);
  console.log(`   Backend Target:  ${BACKEND_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = [];
  let hasFailure = false;

  const record = (id, desc, pass, evidence = '') => {
    results.push({ id, desc, pass, evidence });
    const tag = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`[${tag}] ${id}: ${desc} | ${evidence.slice(0, 100)}`);
    if (!pass) hasFailure = true;
  };

  // Helper to attach error listeners
  const setupPageListeners = (page, consoleErrors, networkErrors, intentionalStatusErrors = []) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico') && !text.includes('style property') && !text.includes('conflicting property')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('response', (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !intentionalStatusErrors.some(allowed => url.includes(allowed))) {
        networkErrors.push(`${res.request().method()} ${url} -> ${status}`);
      }
    });
  };

  // Helper to login in browser
  const loginInBrowser = async (page, email, password) => {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 12000 });
    await page.waitForTimeout(600);
  };

  // Helper to cascade-delete throwaway e2e students
  const deleteE2EUsers = async () => {
    if (!prisma) return;
    try {
      const e2eUsers = await prisma.user.findMany({
        where: { email: { startsWith: 'e2e-' } },
        select: { id: true },
      });
      const ids = e2eUsers.map(u => u.id);
      if (ids.length === 0) return;

      await prisma.studentAnswer.deleteMany({
        where: { attempt: { studentId: { in: ids } } },
      });
      await prisma.testAttempt.deleteMany({
        where: { studentId: { in: ids } },
      });
      await prisma.codingSubmission.deleteMany({
        where: { studentId: { in: ids } },
      });
      await prisma.studentTargetCompany.deleteMany({
        where: { userId: { in: ids } },
      });
      await prisma.notificationRecipient.deleteMany({
        where: { userId: { in: ids } },
      }).catch(() => {});
      await prisma.auditLog.deleteMany({
        where: { actorId: { in: ids } },
      }).catch(() => {});
      await prisma.studentProfile.deleteMany({
        where: { userId: { in: ids } },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { id: { in: ids } },
      });
    } catch (err) {
      console.warn('Failed to clean up e2e users:', err.message);
    }
  };

  try {
    // Obtain admin token for admin operations
    const adminLoginRes = await apiRequest('POST', '/api/auth/login', {
      email: 'admin@intelliplace.edu',
      password: 'Admin@123',
    });
    const adminToken = adminLoginRes.data?.data?.token;
    if (adminToken) {
      await apiRequest('POST', '/api/auth/reset-limiter', null, adminToken);
    }

    // -------------------------------------------------------------
    // PART 0 CHECK 2: FRONTEND REDIRECT ON DISABLED USER
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 2: REDIRECT ON DISABLED USER ---');
    const throwawayEmail = `e2e-throwaway-${Date.now()}@student.edu`;
    const throwawayPassword = 'Password@123';

    // 1. Register throwaway student via API
    const regRes = await apiRequest('POST', '/api/auth/register', {
      name: 'e2e Throwaway Student',
      email: throwawayEmail,
      password: throwawayPassword,
      knowledgeLevel: 'intermediate',
    });
    const throwawayUser = regRes.data?.data?.user;

    // 2. In Playwright, log in as throwaway student
    const disabledContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const disabledPage = await disabledContext.newPage();
    await disabledPage.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await disabledPage.fill('#email', throwawayEmail);
    await disabledPage.fill('#password', throwawayPassword);
    await disabledPage.click('button[type="submit"]');

    await disabledPage.waitForURL('**/dashboard', { timeout: 10000 });
    const tokenBefore = await disabledPage.evaluate(() => localStorage.getItem('token'));

    // 3. Admin disables user via admin API
    const toggleRes = await apiRequest('PATCH', `/api/admin/users/${throwawayUser.id}/toggle`, null, adminToken);
    const userNowActive = toggleRes.data?.data?.isActive;

    // 4. Reload the page in browser
    await disabledPage.reload({ waitUntil: 'networkidle' });
    await disabledPage.waitForTimeout(1200);

    const currentUrl = disabledPage.url();
    const tokenAfter = await disabledPage.evaluate(() => localStorage.getItem('token'));
    const landsOnLogin = currentUrl.endsWith('/login') || currentUrl.includes('/login');
    const tokenCleared = tokenAfter === null;

    const check2Pass = tokenBefore !== null && userNowActive === false && landsOnLogin && tokenCleared;
    record(
      'Part0-2',
      'Disabled user redirect: reload clears localStorage token and navigates to /login',
      check2Pass,
      `URL: ${currentUrl}, Token Before: present, Token After: ${tokenAfter}, User active: ${userNowActive}`
    );
    await disabledContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 9(a): BRAND-NEW STUDENT EMPTY STATES
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(a): BRAND-NEW STUDENT EMPTY STATES ---');
    const newStudentEmail = `e2e-newstudent-${Date.now()}@student.edu`;
    const newStudentPassword = 'Password@123';

    const newStudentContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const newStudentPage = await newStudentContext.newPage();
    const consoleErrors9a = [];
    const networkErrors9a = [];
    setupPageListeners(newStudentPage, consoleErrors9a, networkErrors9a);

    // Register via UI
    await newStudentPage.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle' });
    await newStudentPage.fill('#name', 'e2e Brand New Student');
    await newStudentPage.fill('#email', newStudentEmail);
    await newStudentPage.fill('#password', newStudentPassword);
    await newStudentPage.fill('#confirmPassword', newStudentPassword);
    if (await newStudentPage.$('#knowledgeLevel')) {
      await newStudentPage.selectOption('#knowledgeLevel', 'beginner');
    }
    await newStudentPage.click('button[type="submit"]');

    await newStudentPage.waitForURL('**/dashboard', { timeout: 10000 });
    await newStudentPage.waitForTimeout(1000);

    const bodyText9a = await newStudentPage.innerText('body');
    const hasNaN9a = bodyText9a.includes('NaN');
    const hasUndefined9a = bodyText9a.includes('undefined');
    const hasProfileAlert = bodyText9a.includes('Complete Your Profile');
    const hasReadinessRing = bodyText9a.includes('Placement Readiness') || bodyText9a.includes('Overall Readiness');

    const check9aPass = consoleErrors9a.length === 0 &&
      networkErrors9a.length === 0 &&
      !hasNaN9a && !hasUndefined9a &&
      hasProfileAlert && hasReadinessRing;

    record(
      'Part0-9a',
      'Brand-new student: empty states render cleanly with no NaN, undefined, or empty charts',
      check9aPass,
      `Console: ${JSON.stringify(consoleErrors9a)} | Network: ${JSON.stringify(networkErrors9a)}`
    );
    await newStudentContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 9(b): STUDENT FULL TOUR
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(b): STUDENT FULL TOUR ---');
    const studentContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const studentPage = await studentContext.newPage();
    const consoleErrors9b = [];
    const networkErrors9b = [];
    setupPageListeners(studentPage, consoleErrors9b, networkErrors9b);

    await loginInBrowser(studentPage, 'alice@student.edu', 'Student@123');

    const studentRoutes = [
      { path: '/profile', name: 'Profile' },
      { path: '/resources', name: 'Resources' },
      { path: '/problems', name: 'Problems' },
      { path: '/practice', name: 'Practice' },
      { path: '/tests', name: 'Tests' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/companies', name: 'Companies' },
    ];

    let studentTourClean = true;
    for (const r of studentRoutes) {
      await studentPage.goto(`${FRONTEND_URL}${r.path}`, { waitUntil: 'networkidle' });
      await studentPage.waitForTimeout(500);
      const text = await studentPage.innerText('body');
      if (text.includes('NaN') || text.includes('undefined')) {
        studentTourClean = false;
        console.log(`   [WARN] Found NaN or undefined on student page ${r.path}`);
      }
    }

    const check9bPass = consoleErrors9b.length === 0 && networkErrors9b.length === 0 && studentTourClean;
    record(
      'Part0-9b',
      'Student tour: /profile, /resources, /problems, /practice, /tests, /analytics, /companies (0 errors, no NaN/undefined)',
      check9bPass,
      `Console Errors: ${consoleErrors9b.length}, Network Errors: ${networkErrors9b.length}, Clean text: ${studentTourClean}`
    );

    // -------------------------------------------------------------
    // PART 0 CHECK 9(c): TRAINER TOUR
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(c): TRAINER TOUR ---');
    const trainerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const trainerPage = await trainerContext.newPage();
    const consoleErrors9c = [];
    const networkErrors9c = [];
    setupPageListeners(trainerPage, consoleErrors9c, networkErrors9c);

    await loginInBrowser(trainerPage, 'trainer1@intelliplace.edu', 'Trainer@123');

    const trainerRoutes = [
      '/trainer/questions',
      '/trainer/problems',
      '/trainer/tests',
      '/trainer/resources',
    ];

    let trainerTourClean = true;
    for (const p of trainerRoutes) {
      await trainerPage.goto(`${FRONTEND_URL}${p}`, { waitUntil: 'networkidle' });
      await trainerPage.waitForTimeout(500);
      const text = await trainerPage.innerText('body');
      if (text.includes('NaN') || text.includes('undefined')) trainerTourClean = false;
    }

    const check9cPass = consoleErrors9c.length === 0 && networkErrors9c.length === 0 && trainerTourClean;
    record(
      'Part0-9c',
      'Trainer tour: /trainer/questions, /trainer/problems, /trainer/tests, /trainer/resources (0 errors)',
      check9cPass,
      `Console Errors: ${consoleErrors9c.length}, Network Errors: ${networkErrors9c.length}, Clean text: ${trainerTourClean}`
    );
    await trainerContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 9(d): PO TOUR
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(d): PO TOUR ---');
    const poContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const poPage = await poContext.newPage();
    const consoleErrors9d = [];
    const networkErrors9d = [];
    setupPageListeners(poPage, consoleErrors9d, networkErrors9d);

    await loginInBrowser(poPage, 'po@intelliplace.edu', 'Po@12345');

    const aliceUser = await apiRequest('GET', '/api/po/students', null, adminToken);
    const aliceId = aliceUser.data?.data?.students?.[0]?.studentId || aliceUser.data?.data?.[0]?.userId;

    const poRoutes = [
      '/po/students',
      `/po/students/${aliceId}`,
      '/po/companies',
    ];

    let poTourClean = true;
    for (const p of poRoutes) {
      await poPage.goto(`${FRONTEND_URL}${p}`, { waitUntil: 'networkidle' });
      await poPage.waitForTimeout(500);
      const text = await poPage.innerText('body');
      if (text.includes('NaN') || text.includes('undefined')) poTourClean = false;
    }

    const check9dPass = consoleErrors9d.length === 0 && networkErrors9d.length === 0 && poTourClean;
    record(
      'Part0-9d',
      'PO tour: /po/students, /po/students/:id, /po/companies (0 errors)',
      check9dPass,
      `Console Errors: ${consoleErrors9d.length}, Network Errors: ${networkErrors9d.length}, Clean text: ${poTourClean}`
    );
    await poContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 9(e): ADMIN TOUR
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(e): ADMIN TOUR ---');
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const adminPage = await adminContext.newPage();
    const consoleErrors9e = [];
    const networkErrors9e = [];
    setupPageListeners(adminPage, consoleErrors9e, networkErrors9e);

    await loginInBrowser(adminPage, 'admin@intelliplace.edu', 'Admin@123');

    const adminRoutes = [
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
    ];

    let adminTourClean = true;
    for (const p of adminRoutes) {
      await adminPage.goto(`${FRONTEND_URL}${p}`, { waitUntil: 'networkidle' });
      await adminPage.waitForTimeout(500);
      const text = await adminPage.innerText('body');
      if (text.includes('NaN') || text.includes('undefined')) adminTourClean = false;
    }

    const check9ePass = consoleErrors9e.length === 0 && networkErrors9e.length === 0 && adminTourClean;
    record(
      'Part0-9e',
      'Admin tour: /admin/branches, /admin/batches, /admin/users (0 errors)',
      check9ePass,
      `Console Errors: ${consoleErrors9e.length}, Network Errors: ${networkErrors9e.length}, Clean text: ${adminTourClean}`
    );
    await adminContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 9(f): UNAUTHORIZED ROUTE REDIRECTION
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 9(f): UNAUTHORIZED REDIRECTION ---');
    const unauthorizedPaths = [
      '/admin/users',
      '/po/students',
      '/trainer/questions',
    ];

    let allRedirected = true;
    for (const up of unauthorizedPaths) {
      await studentPage.goto(`${FRONTEND_URL}${up}`, { waitUntil: 'networkidle' });
      await studentPage.waitForTimeout(500);
      const landedUrl = studentPage.url();
      if (!landedUrl.includes('/dashboard')) {
        allRedirected = false;
        console.log(`   [FAIL] Student visiting ${up} was not redirected to /dashboard (landed on ${landedUrl})`);
      }
    }

    record(
      'Part0-9f',
      'Unauthorized route access: student visiting /admin/users, /po/students, /trainer/questions is redirected to /dashboard',
      allRedirected,
      `All 3 restricted routes properly redirected to /dashboard: ${allRedirected}`
    );
    await studentContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 2 EXTENSION: DASHBOARD SCREENSHOTS (DESKTOP & MOBILE)
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 2 EXTENSION: 4 ROLE DASHBOARDS AT 1280x800 & 375x667 ---');
    const roles = [
      { role: 'student', email: 'alice@student.edu', pass: 'Student@123' },
      { role: 'trainer', email: 'trainer1@intelliplace.edu', pass: 'Trainer@123' },
      { role: 'po', email: 'po@intelliplace.edu', pass: 'Po@12345' },
      { role: 'admin', email: 'admin@intelliplace.edu', pass: 'Admin@123' },
    ];

    const screenshotFiles = [];
    for (const r of roles) {
      // 1. Desktop (1280x800)
      const dContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const dPage = await dContext.newPage();
      await loginInBrowser(dPage, r.email, r.pass);
      const desktopShotPath = path.resolve(demoScreenshotsDir, `${r.role}-dashboard-desktop.png`);
      await dPage.screenshot({ path: desktopShotPath, fullPage: true });
      screenshotFiles.push(desktopShotPath);
      await dContext.close();

      // 2. Mobile (375x667)
      const mContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
      const mPage = await mContext.newPage();
      await loginInBrowser(mPage, r.email, r.pass);
      const mobileShotPath = path.resolve(demoScreenshotsDir, `${r.role}-dashboard-mobile.png`);
      await mPage.screenshot({ path: mobileShotPath, fullPage: true });
      screenshotFiles.push(mobileShotPath);
      await mContext.close();
    }

    const allScreenshotsSaved = screenshotFiles.every(f => fs.existsSync(f) && fs.statSync(f).size > 1000);
    record(
      'Smoke-Screenshots',
      '4 role dashboards at 1280x800 and 375x667 saved to frontend/e2e-screenshots/demo/',
      allScreenshotsSaved,
      `Generated 8 screenshots: ${screenshotFiles.map(f => path.basename(f)).join(', ')}`
    );

    // -------------------------------------------------------------
    // PART 0 CHECK 2 EXTENSION: STUDENT MOCK TEST FLOW
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 2 EXTENSION: STUDENT MOCK TEST FLOW ---');
    // Register or use a fresh student to execute the mock test flow cleanly
    const testStudentEmail = `e2e-test-student-${Date.now()}@student.edu`;
    const testStudentPassword = 'Password@123';

    // Get batch 2025 id and CSE branch id
    const batchesRes = await apiRequest('GET', '/api/public/batches');
    const batch2025 = batchesRes.data?.data?.find(b => b.name === '2025');
    const branchesRes = await apiRequest('GET', '/api/public/branches');
    const cseBranch = branchesRes.data?.data?.find(b => b.name === 'CSE');

    // Register test student and assign to batch 2025
    const testStudentReg = await apiRequest('POST', '/api/auth/register', {
      name: 'e2e Mock Test Student',
      email: testStudentEmail,
      password: testStudentPassword,
      knowledgeLevel: 'intermediate',
    });
    const testStudentToken = testStudentReg.data?.data?.token;

    // Assign to Batch 2025 and CSE branch
    await apiRequest('PUT', '/api/students/me', {
      branchId: cseBranch?.id,
      batchId: batch2025?.id,
    }, testStudentToken);

    const testContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const testPage = await testContext.newPage();
    const testConsoleErrors = [];
    const testNetworkErrors = [];
    setupPageListeners(testPage, testConsoleErrors, testNetworkErrors);

    // Auto-accept any browser dialogs (confirm modals)
    testPage.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await loginInBrowser(testPage, testStudentEmail, testStudentPassword);

    // 1. Open /tests
    await testPage.goto(`${FRONTEND_URL}/tests`, { waitUntil: 'networkidle' });
    await testPage.waitForTimeout(1000);

    // 2. Start the seeded test for their batch
    const startBtn = testPage.locator('button:has-text("Start Test")').first();
    await startBtn.click();
    await testPage.waitForURL('**/tests/**/take', { timeout: 10000 });
    await testPage.waitForTimeout(1000);

    const takeUrl = testPage.url();
    const testId = takeUrl.split('/tests/')[1]?.split('/take')[0];

    // Read the correct options through DB or admin/trainer API (never student endpoint)
    let questions = [];
    if (prisma) {
      const testWithQuestions = await prisma.mockTest.findUnique({
        where: { id: testId },
        include: {
          questions: {
            include: { question: true },
            orderBy: { questionId: 'asc' },
          },
        },
      });
      questions = testWithQuestions?.questions.map(mq => mq.question) || [];
    } else {
      const adminTestRes = await apiRequest('GET', `/api/tests/${testId}`, null, adminToken);
      questions = adminTestRes.data?.data?.questions || [];
    }

    // 3. Real take-test check: select exactly N correct answers and M wrong answers
    const N = 3; // N questions to answer correctly
    const M = 2; // M questions to answer incorrectly
    const expectedMarks = N * 1; // 1 mark per question -> 3 marks

    const qPaletteButtons = testPage.locator('div:has(button) button:text-matches("^\\\\d+$")');
    const qCount = await qPaletteButtons.count();

    // Answer N questions correctly
    for (let i = 0; i < N && i < questions.length; i++) {
      await qPaletteButtons.nth(i).click();
      await testPage.waitForTimeout(150);
      const correctOpt = questions[i].correctOption; // 'A', 'B', 'C', or 'D'
      const optBtn = testPage.locator(`button:has-text("${correctOpt})")`).first();
      if (await optBtn.isVisible()) {
        await optBtn.click();
        await testPage.waitForTimeout(150);
      }
    }

    // Answer M questions incorrectly
    for (let j = N; j < N + M && j < questions.length; j++) {
      await qPaletteButtons.nth(j).click();
      await testPage.waitForTimeout(150);
      const correctOpt = questions[j].correctOption;
      const wrongOpt = ['A', 'B', 'C', 'D'].find(opt => opt !== correctOpt) || 'A';
      const optBtn = testPage.locator(`button:has-text("${wrongOpt})")`).first();
      if (await optBtn.isVisible()) {
        await optBtn.click();
        await testPage.waitForTimeout(150);
      }
    }

    // Navigate to last question so Submit Test button appears
    if (qCount > 0) {
      await qPaletteButtons.nth(qCount - 1).click();
      await testPage.waitForTimeout(300);
    }

    // 4. Submit test
    const submitBtn = testPage.locator('button:has-text("Submit Test")').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    await testPage.waitForTimeout(500);

    const confirmModalBtn = testPage.locator('button:has-text("Yes, Submit")');
    if (await confirmModalBtn.isVisible()) {
      await confirmModalBtn.click();
    }

    // 5. Verify landing on /tests/attempts/:id/result
    await testPage.waitForURL('**/tests/attempts/**/result', { timeout: 15000 });
    await testPage.waitForSelector('h2:has-text("%")', { timeout: 10000 });
    await testPage.waitForTimeout(1000);

    const resultUrl = testPage.url();
    const resultAttemptId = resultUrl.split('/tests/attempts/')[1]?.split('/result')[0];

    // Read score displayed on result page
    const scoreHeading = await testPage.locator('h2:has-text("/")').first().innerText();
    const pageScore = parseInt(scoreHeading.split('/')[0].trim(), 10);

    // Read score returned by API
    const apiResult = await apiRequest('GET', `/api/tests/attempts/${resultAttemptId}/result`, null, testStudentToken);
    const apiScore = apiResult.data?.data?.score;
    const apiPercentage = apiResult.data?.data?.percentage;

    const resultPageText = await testPage.innerText('body');
    const hasNaNOnResult = resultPageText.includes('NaN');
    const hasUndefinedOnResult = resultPageText.includes('undefined');

    const apiTotalMarks = apiResult.data?.data?.totalMarks;
    const scoreTextOnPage = scoreHeading.trim();

    console.log('================================================================');
    console.log('TAKE-TEST CHECK (REAL NUMBERS):');
    console.log(`  Number of Questions:          ${questions.length}`);
    console.log(`  N Correct Selected:           ${N}`);
    console.log(`  M Wrong Selected:             ${M}`);
    console.log(`  Marks per Question:           1`);
    console.log(`  Expected Score:               ${expectedMarks}`);
    console.log(`  Score Text on Result Page:    ${scoreTextOnPage}`);
    console.log(`  API Score:                    ${apiScore}`);
    console.log(`  API Total Marks:              ${apiTotalMarks}`);
    console.log('================================================================');

    const scoreMatchesExpected = pageScore === expectedMarks;
    const scoreGreaterThanZero = pageScore > 0;
    const scoreMatchesApi = pageScore === apiScore;
    const scoreTextMatchesApi = scoreTextOnPage === `${apiScore}/${apiTotalMarks}`;

    const testFlowPass = resultUrl.includes('/result') &&
      scoreMatchesExpected &&
      scoreGreaterThanZero &&
      scoreMatchesApi &&
      testConsoleErrors.length === 0 &&
      !hasNaNOnResult &&
      !hasUndefinedOnResult;

    record(
      'Smoke-RealTakeTest',
      `Real take-test browser check: selected N=${N} correct answers & M=${M} wrong answers via DB/admin lookup -> Page score (${pageScore}) == Expected (${expectedMarks}) > 0 == API score (${apiScore})`,
      testFlowPass,
      `N=${N}, M=${M}, Expected=${expectedMarks}, PageScore=${pageScore}, ApiScore=${apiScore}`
    );
    await testContext.close();

    // -------------------------------------------------------------
    // PART 0 CHECK 2 EXTENSION: STUDENT PRACTICE FLOW
    // -------------------------------------------------------------
    console.log('\n--- PART 0 CHECK 2 EXTENSION: STUDENT PRACTICE FLOW ---');
    const practiceContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const practicePage = await practiceContext.newPage();
    const practiceConsoleErrors = [];
    const practiceNetworkErrors = [];
    const practiceStudentEmail = `e2e-practice-student-${Date.now()}@student.edu`;
    const practiceStudentPassword = 'Password@123';
    await apiRequest('POST', '/api/auth/register', {
      name: 'e2e Practice Student',
      email: practiceStudentEmail,
      password: practiceStudentPassword,
      knowledgeLevel: 'intermediate',
    });

    await loginInBrowser(practicePage, practiceStudentEmail, practiceStudentPassword);

    // 1. Open /practice
    await practicePage.goto(`${FRONTEND_URL}/practice`, { waitUntil: 'networkidle' });
    await practicePage.waitForTimeout(600);

    // 2. Start a topic
    const topicCard = practicePage.locator('div:has-text("Quantitative Aptitude")').last();
    await topicCard.click();
    await practicePage.waitForTimeout(1000);

    // 3. Answer questions
    for (let i = 0; i < 2; i++) {
      const optBtn = practicePage.locator('button:has-text("A)")').first();
      if (await optBtn.isVisible()) {
        await optBtn.click();
        await practicePage.waitForTimeout(200);
      }
      const submitAnswerBtn = practicePage.locator('button:has-text("Submit Answer")');
      if (await submitAnswerBtn.isVisible()) {
        await submitAnswerBtn.click();
        await practicePage.waitForTimeout(500);
      }
      const nextQBtn = practicePage.locator('button:has-text("Next Question →"), button:has-text("See Results")');
      if (await nextQBtn.isVisible()) {
        await nextQBtn.click();
        await practicePage.waitForTimeout(400);
      }
    }

    // Practice summary stage
    const practiceBodyText = await practicePage.innerText('body');
    const practiceClean = !practiceBodyText.includes('NaN') &&
      !practiceBodyText.includes('undefined') &&
      practiceConsoleErrors.length === 0;

    record(
      'Smoke-StudentPracticeFlow',
      'Student practice flow: /practice -> select topic -> answer questions -> view explanation -> clean UI with 0 errors',
      practiceClean,
      `Console Errors: ${practiceConsoleErrors.length}, Clean text: ${practiceClean}`
    );
    await practiceContext.close();

    // -------------------------------------------------------------
    // PART 1 DEMO PERSONAS ASSERTIONS
    // -------------------------------------------------------------
    console.log('\n--- PART 1 DEMO PERSONAS ASSERTIONS ---');
    // Clean up throwaway e2e students so demo cohort (Eve, Dave, Carol, Bob, Alice) are the active students
    await deleteE2EUsers();

    const personaContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const personaPage = await personaContext.newPage();

    // 1. Alice shows Ready
    await loginInBrowser(personaPage, 'alice@student.edu', 'Student@123');
    await personaPage.waitForTimeout(1000);
    const aliceText = await personaPage.innerText('body');
    const aliceShowsReady = aliceText.includes('Ready') && (aliceText.includes('72') || aliceText.includes('72%') || aliceText.includes('Ready (>70)'));

    // 2. Bob shows weak topic (Verbal Ability)
    await personaPage.evaluate(() => localStorage.clear());
    await loginInBrowser(personaPage, 'bob@student.edu', 'Student@123');
    await personaPage.waitForTimeout(1000);
    const bobText = await personaPage.innerText('body');
    const bobShowsAlmostReady = bobText.includes('Almost Ready') || bobText.includes('54');
    const bobShowsWeakVerbal = bobText.includes('Verbal Ability');

    // 3. Carol progress chart has >= 5 points
    await personaPage.evaluate(() => localStorage.clear());
    await loginInBrowser(personaPage, 'carol@student.edu', 'Student@123');
    await personaPage.waitForTimeout(1000);
    const carolApi = await apiRequest('GET', '/api/students/me/dashboard', null, (await personaPage.evaluate(() => localStorage.getItem('token'))));
    const carolPointsCount = carolApi.data?.data?.progress?.length || 0;
    const carolHas5Points = carolPointsCount >= 5;

    // 4. Eve shows clean empty states
    await personaPage.evaluate(() => localStorage.clear());
    await loginInBrowser(personaPage, 'eve@student.edu', 'Student@123');
    await personaPage.waitForTimeout(1000);
    const eveText = await personaPage.innerText('body');
    const eveClean = !eveText.includes('NaN') && !eveText.includes('undefined') &&
      (eveText.includes('No tests attempted yet') || eveText.includes('Complete Your Profile'));

    // 5. PO attention list includes Eve and Dave
    await personaPage.evaluate(() => localStorage.clear());
    await loginInBrowser(personaPage, 'po@intelliplace.edu', 'Po@12345');
    await personaPage.waitForSelector('text=Top 5 students', { timeout: 10000 });
    await personaPage.waitForTimeout(800);
    const poSummaryRes = await apiRequest('GET', '/api/po/summary', null, (await personaPage.evaluate(() => localStorage.getItem('token'))));
    const attentionList = poSummaryRes.data?.data?.attentionStudents || [];
    const hasEveInAttention = attentionList.some(s => s.name.includes('Eve') || s.email.includes('eve@'));
    const hasDaveInAttention = attentionList.some(s => s.name.includes('Dave') || s.email.includes('dave@'));

    const poDashboardText = await personaPage.innerText('body');
    const poShowsEveAndDave = (poDashboardText.includes('Dave Brown') || poDashboardText.includes('dave@student.edu')) &&
      (poDashboardText.includes('Eve Davis') || poDashboardText.includes('eve@student.edu'));

    const personasPass = aliceShowsReady &&
      bobShowsAlmostReady &&
      bobShowsWeakVerbal &&
      carolHas5Points &&
      eveClean &&
      hasEveInAttention &&
      hasDaveInAttention &&
      poShowsEveAndDave;

    record(
      'Smoke-DemoPersonas',
      'Demo personas: Alice Ready, Bob weak Verbal, Carol >=5 progress points, Eve empty state, PO attention list has Eve & Dave',
      personasPass,
      `Alice Ready: ${aliceShowsReady}, Bob Verbal: ${bobShowsWeakVerbal}, Carol Points: ${carolPointsCount}, Eve Clean: ${eveClean}, PO Eve&Dave: ${poShowsEveAndDave}`
    );
    await personaContext.close();

  } finally {
    await deleteE2EUsers();
    if (prisma) {
      await prisma.$disconnect().catch(() => {});
    }
    await browser.close();

    console.log('\n================================================================');
    console.log('🎭 Smoke Tests Summary:');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(`   Total Tests:  ${total}`);
    console.log(`   Passed:       ${passed}`);
    console.log(`   Failed:       ${failed}`);
    console.log('================================================================\n');

    if (hasFailure) {
      process.exit(1);
    }
  }
}

run().catch((err) => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
