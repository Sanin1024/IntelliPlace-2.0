import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const mobileScreenshotsDir = path.resolve(__dirname, '..', 'e2e-screenshots', 'mobile');

if (!fs.existsSync(mobileScreenshotsDir)) {
  fs.mkdirSync(mobileScreenshotsDir, { recursive: true });
}

const loginCredentials = {
  student: { email: 'alice@student.edu', pass: 'Student@123' },
  trainer: { email: 'trainer1@intelliplace.edu', pass: 'Trainer@123' },
  po: { email: 'po@intelliplace.edu', pass: 'Po@12345' },
  admin: { email: 'admin@intelliplace.edu', pass: 'Admin@123' },
};

async function loginUser(page, email, password) {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(500);
}

async function run() {
  console.log('================================================================');
  console.log('📱 MOBILE (375px) & ACCESSIBILITY (AXE) AUDIT');
  console.log(`   Frontend Target: ${FRONTEND_URL}`);
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const mobileResults = [];
  const axeResults = [];
  let allPass = true;

  // -----------------------------------------------------------------
  // 1. MOBILE 375px AUDIT ACROSS ALL ROLES & PAGES
  // -----------------------------------------------------------------
  console.log('--- 1. MOBILE AUDIT AT 375px ---');

  const pageCatalog = [
    // Auth pages
    { role: 'none', path: '/login', name: 'auth-login' },
    { role: 'none', path: '/register', name: 'auth-register' },

    // Student pages
    { role: 'student', path: '/dashboard', name: 'student-dashboard' },
    { role: 'student', path: '/profile', name: 'student-profile' },
    { role: 'student', path: '/resources', name: 'student-resources' },
    { role: 'student', path: '/problems', name: 'student-problems' },
    { role: 'student', path: '/practice', name: 'student-practice' },
    { role: 'student', path: '/tests', name: 'student-tests' },
    { role: 'student', path: '/analytics', name: 'student-analytics' },
    { role: 'student', path: '/companies', name: 'student-companies' },

    // Trainer pages
    { role: 'trainer', path: '/dashboard', name: 'trainer-dashboard' },
    { role: 'trainer', path: '/trainer/questions', name: 'trainer-questions' },
    { role: 'trainer', path: '/trainer/problems', name: 'trainer-problems' },
    { role: 'trainer', path: '/trainer/tests', name: 'trainer-tests' },
    { role: 'trainer', path: '/trainer/resources', name: 'trainer-resources' },

    // PO pages
    { role: 'po', path: '/dashboard', name: 'po-dashboard' },
    { role: 'po', path: '/po/students', name: 'po-students' },
    { role: 'po', path: '/po/companies', name: 'po-companies' },

    // Admin pages
    { role: 'admin', path: '/dashboard', name: 'admin-dashboard' },
    { role: 'admin', path: '/admin/branches', name: 'admin-branches' },
    { role: 'admin', path: '/admin/batches', name: 'admin-batches' },
    { role: 'admin', path: '/admin/users', name: 'admin-users' },
  ];

  // Group by role to minimize logins
  const roleGroups = {};
  for (const pageItem of pageCatalog) {
    if (!roleGroups[pageItem.role]) roleGroups[pageItem.role] = [];
    roleGroups[pageItem.role].push(pageItem);
  }

  for (const [role, items] of Object.entries(roleGroups)) {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    if (role !== 'none') {
      const creds = loginCredentials[role];
      await loginUser(page, creds.email, creds.pass);
    }

    for (const item of items) {
      if (item.path !== '/dashboard' || role === 'none') {
        await page.goto(`${FRONTEND_URL}${item.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);
      }

      // Check 1: scrollWidth <= clientWidth
      const overflowInfo = await page.evaluate(() => {
        const docEl = document.documentElement;
        return {
          scrollWidth: docEl.scrollWidth,
          clientWidth: docEl.clientWidth,
          hasOverflow: docEl.scrollWidth > docEl.clientWidth,
        };
      });

      // Check 2: Tap target heights
      const tapTargetInfo = await page.evaluate(() => {
        const interactiveElements = Array.from(document.querySelectorAll('button, select, a, input:not([type="checkbox"]):not([type="radio"])'));
        const violations = [];
        for (const el of interactiveElements) {
          const rect = el.getBoundingClientRect();
          // Only check visible elements
          if (rect.width > 0 && rect.height > 0 && rect.height < 36) {
            violations.push({
              tag: el.tagName,
              text: (el.innerText || el.getAttribute('aria-label') || el.id || '').slice(0, 30),
              height: rect.height,
            });
          }
        }
        return { total: interactiveElements.length, violations };
      });

      // Check 3: Tables scroll inside own container
      const tableInfo = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        const issues = [];
        for (const t of tables) {
          const parent = t.parentElement;
          if (parent) {
            const style = window.getComputedStyle(parent);
            const parentCanScroll = style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll';
            if (t.scrollWidth > parent.clientWidth && !parentCanScroll) {
              issues.push({ tableWidth: t.scrollWidth, parentWidth: parent.clientWidth });
            }
          }
        }
        return { tableCount: tables.length, issues };
      });

      const shotPath = path.resolve(mobileScreenshotsDir, `${item.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });

      const pagePass = !overflowInfo.hasOverflow && tableInfo.issues.length === 0;
      if (!pagePass) allPass = false;

      mobileResults.push({
        name: item.name,
        path: item.path,
        scrollWidth: overflowInfo.scrollWidth,
        clientWidth: overflowInfo.clientWidth,
        noOverflow: !overflowInfo.hasOverflow,
        tableIssues: tableInfo.issues.length,
        tapViolations: tapTargetInfo.violations.length,
        pass: pagePass,
      });

      const mark = pagePass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
      console.log(`[${mark}] ${item.name.padEnd(22)}: scrollWidth=${overflowInfo.scrollWidth}px (<= ${overflowInfo.clientWidth}px), Tables=${tableInfo.tableCount}, TapIssues=${tapTargetInfo.violations.length}`);
    }

    await context.close();
  }

  // -----------------------------------------------------------------
  // 2. ACCESSIBILITY AUDIT (AXE-CORE)
  // -----------------------------------------------------------------
  console.log('\n--- 2. ACCESSIBILITY AUDIT (AXE-CORE) ---');
  const a11yPages = [
    { name: 'Login Page', path: '/login', role: 'none' },
    { name: 'Student Dashboard', path: '/dashboard', role: 'student' },
    { name: 'Trainer Dashboard', path: '/dashboard', role: 'trainer' },
    { name: 'PO Dashboard', path: '/dashboard', role: 'po' },
    { name: 'Admin Dashboard', path: '/dashboard', role: 'admin' },
  ];

  for (const pInfo of a11yPages) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    if (pInfo.role !== 'none') {
      const creds = loginCredentials[pInfo.role];
      await loginUser(page, creds.email, creds.pass);
    } else {
      await page.goto(`${FRONTEND_URL}${pInfo.path}`, { waitUntil: 'networkidle' });
    }

    // Run axe builder
    const axeBuilder = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']); // Recharts and dynamic SVG palette colors

    const results = await axeBuilder.analyze();
    const violations = results.violations;

    const pass = violations.length === 0;
    if (!pass) allPass = false;

    axeResults.push({
      name: pInfo.name,
      violationsCount: violations.length,
      violations: violations.map(v => ({ id: v.id, impact: v.impact, desc: v.description, nodes: v.nodes.length })),
      pass,
    });

    const mark = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`[${mark}] ${pInfo.name.padEnd(20)}: ${violations.length} WCAG violations found`);
    if (violations.length > 0) {
      for (const v of violations) {
        console.log(`     - [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
      }
    }

    await context.close();
  }

  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY:');
  const mobilePassCount = mobileResults.filter(r => r.pass).length;
  const a11yPassCount = axeResults.filter(r => r.pass).length;
  console.log(`   Mobile Pages Passed (375px): ${mobilePassCount} / ${mobileResults.length}`);
  console.log(`   A11y Dashboards Passed:      ${a11yPassCount} / ${axeResults.length}`);
  console.log('================================================================\n');

  await browser.close();

  if (!allPass) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal audit error:', e);
  process.exit(1);
});
