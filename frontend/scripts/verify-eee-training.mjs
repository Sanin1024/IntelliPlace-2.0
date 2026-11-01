import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('verification/eee-training');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyEEETraining() {
  console.log('🚀 Starting Electrical and Electronics Engineering (EEE) Verification Suite...\n');

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

  try {
    // 1. LOGIN AS STUDENT
    console.log('--- Step 1: Login as Student ---');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', 'ksd23it030@student.intelliplace.edu');
    await page.fill('input[type="password"], input[name="password"]', 'Student@123');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✔ Logged in successfully, landed on:', page.url());

    // 2. EEE TRAINING DASHBOARD
    console.log('\n--- Step 2: EEE Training Dashboard ---');
    await page.goto(`${FRONTEND_URL}/eee-training`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('✔ EEE Dashboard loaded');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-eee-dashboard.png') });

    // 3. EEE QUESTION BANK
    console.log('\n--- Step 3: EEE Question Bank ---');
    await page.goto(`${FRONTEND_URL}/eee-training/questions`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('✔ EEE Question Bank loaded');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-eee-questions.png') });

    // 4. EEE COMPANIES PAGE
    console.log('\n--- Step 4: EEE Companies Preparation ---');
    await page.goto(`${FRONTEND_URL}/eee-training/companies`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('✔ EEE Companies page loaded');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-eee-companies.png') });

    console.log('\n=============================================');
    console.log('            VERIFICATION SUMMARY             ');
    console.log('=============================================');
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log(`  - [${e.url}] ${e.text}`));
    }

    console.log(`Network Errors: ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      networkErrors.forEach((e) => console.log(`  - [${e.status}] ${e.url}`));
    }

    if (consoleErrors.length === 0 && networkErrors.length === 0) {
      console.log('\n🎉 ALL CHECKS PASSED: EEE Placement Training Module is fully functioning!\n');
    } else {
      console.log('\n⚠️ Some issues detected during verification.\n');
    }
  } catch (err) {
    console.error('❌ Verification failed with exception:', err);
  } finally {
    await browser.close();
  }
}

verifyEEETraining();

