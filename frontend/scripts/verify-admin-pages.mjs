import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.resolve('verification/admin-pages');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyAdminPages() {
  console.log('🚀 Starting Admin Pages Verification Suite...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
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
        pageUrl: page.url()
      });
    }
  });

  // 1. LOGIN
  console.log('--- Step 1: Login as Admin ---');
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'admin@intelliplace.edu');
  await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('✔ Logged in successfully, landed on:', page.url());

  const pagesToVerify = [
    {
      name: 'Admin Dashboard',
      path: '/dashboard',
      expectedSelectors: [
        'h1',
        'text=Admin Dashboard',
        'text=API:',
        'text=DB:',
        'text=Users',
        'text=Platform Content'
      ],
      screenshotName: '1-admin-dashboard.png'
    },
    {
      name: 'Audit Logs',
      path: '/admin/audit-logs',
      expectedSelectors: [
        'h1',
        'text=Audit Logs',
        'input[placeholder*="Search"]',
        'select',
        'table'
      ],
      screenshotName: '2-admin-audit-logs.png'
    },
    {
      name: 'User Management',
      path: '/admin/users',
      expectedSelectors: [
        'h1',
        'text=Users',
        'table'
      ],
      screenshotName: '3-admin-users.png'
    },
    {
      name: 'Branch Management',
      path: '/admin/branches',
      expectedSelectors: [
        'h1',
        'text=Branches',
        'button, input'
      ],
      screenshotName: '4-admin-branches.png'
    },
    {
      name: 'Batch Management',
      path: '/admin/batches',
      expectedSelectors: [
        'h1',
        'text=Batches',
        'button, input'
      ],
      screenshotName: '5-admin-batches.png'
    }
  ];

  const results = [];

  for (const p of pagesToVerify) {
    console.log(`\n--- Verifying: ${p.name} (${p.path}) ---`);
    const initialNetworkErrorCount = networkErrors.length;
    const initialConsoleErrorCount = consoleErrors.length;

    await page.goto(`${FRONTEND_URL}${p.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800); // let animations / chart settle

    const currentUrl = page.url();
    const heading = await page.locator('h1').textContent().catch(() => 'NO_H1_FOUND');

    let allSelectorsFound = true;
    for (const selector of p.expectedSelectors) {
      const count = await page.locator(selector).count();
      if (count === 0) {
        console.log(`  ⚠ Missing expected selector: "${selector}"`);
        allSelectorsFound = false;
      }
    }

    const screenshotPath = path.join(SCREENSHOT_DIR, p.screenshotName);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const newConsoleErrors = consoleErrors.slice(initialConsoleErrorCount);
    const newNetworkErrors = networkErrors.slice(initialNetworkErrorCount);

    const pagePassed = allSelectorsFound && newConsoleErrors.length === 0 && newNetworkErrors.length === 0;

    results.push({
      name: p.name,
      path: p.path,
      heading: heading?.trim(),
      passed: pagePassed,
      consoleErrors: newConsoleErrors,
      networkErrors: newNetworkErrors,
      screenshot: screenshotPath
    });

    console.log(`  Heading: "${heading?.trim()}"`);
    console.log(`  Selectors verified: ${allSelectorsFound ? '✔ All found' : '❌ Some missing'}`);
    console.log(`  Console errors: ${newConsoleErrors.length}`);
    console.log(`  Network errors (HTTP 4xx/5xx): ${newNetworkErrors.length}`);
    console.log(`  Screenshot saved: ${screenshotPath}`);
    console.log(`  Status: ${pagePassed ? '✅ PASSED' : '❌ FAILED'}`);
  }

  // Also verify sidebar navigation links render properly for Admin
  console.log('\n--- Verifying Admin Navigation Sidebar Links ---');
  const navLinks = await page.locator('aside nav a').all();
  const navItems = [];
  for (const link of navLinks) {
    const text = await link.innerText();
    const href = await link.getAttribute('href');
    navItems.push({ text: text.trim().replace(/\s+/g, ' '), href });
  }
  console.log('Sidebar Navigation Items for Admin:');
  navItems.forEach((item, idx) => console.log(`  ${idx + 1}. [${item.text}] -> ${item.href}`));

  await browser.close();

  console.log('\n=============================================');
  console.log('              SUMMARY OF RESULTS             ');
  console.log('=============================================');
  let overallPass = true;
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name.padEnd(20)} [${r.path}] - Heading: "${r.heading}"`);
    if (r.consoleErrors.length > 0) {
      console.log(`     Console errors:`, r.consoleErrors);
      overallPass = false;
    }
    if (r.networkErrors.length > 0) {
      console.log(`     Network errors:`, r.networkErrors);
      overallPass = false;
    }
  }

  if (overallPass) {
    console.log('\n🎉 ALL ADMIN PAGES OPENED AND VERIFIED SUCCESSFULLY WITH 0 CONSOLE AND 0 NETWORK ERRORS!');
  } else {
    console.log('\n❌ SOME CHECKS FAILED. See details above.');
    process.exit(1);
  }
}

verifyAdminPages().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

