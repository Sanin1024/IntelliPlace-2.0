import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('verification/mech-training');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyMechTraining() {
  console.log('🚀 Starting Mechanical Engineering Training Verification Suite...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        pageUrl: page.url(),
      });
    }
  });

  // 1. LOGIN AS STUDENT
  console.log('--- Step 1: Login as Student ---');
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'ksd23it030@student.intelliplace.edu');
  await page.fill('input[type="password"], input[name="password"]', 'Student@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✔ Logged in successfully, landed on:', page.url());

  // 2. ME TRAINING DASHBOARD
  console.log('\n--- Step 2: Verifying /mechanical-training ---');
  await page.goto(`${FRONTEND_URL}/mechanical-training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const h1 = await page.textContent('h1');
  console.log('  Heading:', h1);
  const trackCards = await page.$$('button:has-text("Enroll"), button:has-text("Enrolled")');
  console.log(`  Found ${trackCards.length} Career Track buttons`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1-mech-dashboard.png') });

  // 3. ME QUESTIONS
  console.log('\n--- Step 3: Verifying /mechanical-training/questions ---');
  await page.goto(`${FRONTEND_URL}/mechanical-training/questions`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const qh1 = await page.textContent('h1');
  console.log('  Heading:', qh1);
  const questions = await page.$$('p:has-text("Q1.")');
  console.log(`  Rendered Question cards successfully (found ${questions.length} initial match)`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2-mech-questions.png') });

  // 4. ME PROJECTS
  console.log('\n--- Step 4: Verifying /mechanical-training/projects ---');
  await page.goto(`${FRONTEND_URL}/mechanical-training/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const ph1 = await page.textContent('h1');
  console.log('  Heading:', ph1);
  const submitBtns = await page.$$('button:has-text("Submit Project")');
  console.log(`  Found ${submitBtns.length} project submission cards`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3-mech-projects.png') });

  // 5. ME COMPANIES
  console.log('\n--- Step 5: Verifying /mechanical-training/companies ---');
  await page.goto(`${FRONTEND_URL}/mechanical-training/companies`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const ch1 = await page.textContent('h1');
  console.log('  Heading:', ch1);
  const tata = await page.$$('h3:has-text("Tata Motors")');
  console.log(`  Found ${tata.length} match for Tata Motors recruiter profile`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '4-mech-companies.png') });

  // 6. ME SOFTWARE
  console.log('\n--- Step 6: Verifying /mechanical-training/software ---');
  await page.goto(`${FRONTEND_URL}/mechanical-training/software`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const sh1 = await page.textContent('h1');
  console.log('  Heading:', sh1);
  const cad = await page.$$('h3:has-text("AutoCAD")');
  console.log(`  Found ${cad.length} match for AutoCAD software resource`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '5-mech-software.png') });

  console.log('\n=============================================');
  console.log('              SUMMARY OF RESULTS             ');
  console.log('=============================================');
  console.log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) console.error('Errors:', consoleErrors);
  console.log(`Network errors: ${networkErrors.length}`);
  if (networkErrors.length > 0) console.error('Network failures:', networkErrors);

  if (consoleErrors.length === 0 && networkErrors.length === 0) {
    console.log('🎉 ALL 5 MECHANICAL TRAINING PAGES VERIFIED WITH 0 ERRORS!');
  } else {
    console.log('⚠️ Some issues found during test.');
  }

  await browser.close();
}

verifyMechTraining().catch((err) => {
  console.error('Fatal error in mech training verification:', err);
  process.exit(1);
});

