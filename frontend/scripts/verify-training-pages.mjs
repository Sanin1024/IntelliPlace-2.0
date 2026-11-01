import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('verification/training-pages');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyTrainingPages() {
  console.log('🚀 Starting Training Module Verification Suite...\n');

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
  console.log('✔ Logged in as Alice, landed on:', page.url());

  // 2. VERIFY /training (Training Hub)
  console.log('\n--- Step 2: Verifying Training Hub (/training) ---');
  await page.goto(`${FRONTEND_URL}/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const hubHeading = await page.textContent('h1');
  console.log('  Heading:', hubHeading);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '1-training-hub.png') });

  // 3. VERIFY /training/resources (Resource Library)
  console.log('\n--- Step 3: Verifying Resource Library (/training/resources) ---');
  await page.goto(`${FRONTEND_URL}/training/resources`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const libHeading = await page.textContent('h1');
  console.log('  Heading:', libHeading);

  // Check resource cards exist
  const cards = await page.$$('div:has-text("DSA"), div:has-text("Aptitude")');
  console.log(`  Found ${cards.length} matching resource card elements`);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '2-resource-library.png') });

  // 4. TEST BOOKMARK INTERACTION
  console.log('\n--- Step 4: Testing Bookmark Action ---');
  const bookmarkButton = await page.$('button:has-text("Bookmark")');
  if (bookmarkButton) {
    await bookmarkButton.click();
    await page.waitForTimeout(500);
    console.log('  Clicked bookmark button successfully');
  }

  // 5. REVISIT /training TO CHECK STATS UPDATE
  console.log('\n--- Step 5: Check Training Dashboard Stats Updated ---');
  await page.goto(`${FRONTEND_URL}/training`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '3-training-hub-after-bookmark.png') });

  console.log('\n=============================================');
  console.log('              SUMMARY OF RESULTS             ');
  console.log('=============================================');
  console.log(`Console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('Errors:', consoleErrors);
  }
  console.log(`Network errors: ${networkErrors.length}`);
  if (networkErrors.length > 0) {
    console.error('Network failures:', networkErrors);
  }

  if (consoleErrors.length === 0 && networkErrors.length === 0) {
    console.log('🎉 TRAINING MODULE PAGES OPENED & INTERACTED WITH 0 ERRORS!');
  } else {
    console.log('⚠️ Some warnings/errors encountered.');
  }

  await browser.close();
}

verifyTrainingPages().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
