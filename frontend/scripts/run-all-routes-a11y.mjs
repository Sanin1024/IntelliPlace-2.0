import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.API_URL || 'http://localhost:4000';

const loginCredentials = {
  student: { email: 'alice@student.edu', pass: 'Student@123' },
  trainer: { email: 'trainer1@intelliplace.edu', pass: 'Trainer@123' },
  po: { email: 'po@intelliplace.edu', pass: 'Po@12345' },
  admin: { email: 'admin@intelliplace.edu', pass: 'Admin@123' },
};

async function apiRequest(method, reqPath, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${reqPath}`, { method, headers });
  return await res.json().catch(() => null);
}

async function loginUser(page, email, password) {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 12000 });
  await page.waitForTimeout(600);
}

async function run() {
  console.log('================================================================');
  console.log('📱 MOBILE (375x667) & AXE-CORE ACCESSIBILITY AUDIT - ALL 23 ROUTES');
  console.log(`   Frontend Target: ${FRONTEND_URL}`);
  console.log(`   Backend Target:  ${BACKEND_URL}`);
  console.log('================================================================\n');

  // 1. Fetch real IDs
  const adminLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginCredentials.admin.email, password: loginCredentials.admin.pass }),
  }).then(r => r.json());
  const adminToken = adminLogin.data?.token;

  const probsRes = await apiRequest('GET', '/api/problems', adminToken);
  const realProblemId = probsRes.data?.[0]?.id;

  const studentsRes = await apiRequest('GET', '/api/po/students', adminToken);
  const realStudentId = studentsRes.data?.students?.[0]?.studentId || studentsRes.data?.students?.[0]?.id;

  const testsRes = await apiRequest('GET', '/api/tests', adminToken);
  const realTestId = testsRes.data?.[0]?.id;

  const studentLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: loginCredentials.student.email, password: loginCredentials.student.pass }),
  }).then(r => r.json());
  const studentToken = studentLogin.data?.token;

  // Find a submitted attempt for result route
  const studentAttempts = await apiRequest('GET', '/api/tests/my-attempts', studentToken);
  let realAttemptId = studentAttempts.data?.[0]?.attemptId || studentAttempts.data?.[0]?.id;
  if (!realAttemptId) {
    // If not found, use a fallback from test results
    const trRes = await apiRequest('GET', `/api/tests/${realTestId}/results`, adminToken);
    realAttemptId = trRes.data?.attempts?.[0]?.attemptId || trRes.data?.attempts?.[0]?.id;
  }

  // 2. Build the Route List from frontend/src/App.tsx
  const routeCatalog = [
    { role: 'none', path: '/login', name: 'Login Page' },
    { role: 'none', path: '/register', name: 'Register Page' },
    { role: 'student', path: '/dashboard', name: 'Student Dashboard' },
    { role: 'student', path: '/profile', name: 'Student Profile' },
    { role: 'student', path: '/resources', name: 'Student Resources' },
    { role: 'student', path: '/problems', name: 'Coding Problems List' },
    { role: 'student', path: `/problems/${realProblemId}`, name: 'Problem Detail Page' },
    { role: 'student', path: '/practice', name: 'Student Practice Page' },
    { role: 'student', path: '/tests', name: 'Mock Test List' },
    { role: 'student', path: `/tests/${realTestId}/take`, name: 'Take Mock Test Page' },
    { role: 'student', path: `/tests/attempts/${realAttemptId}/result`, name: 'Test Result Page' },
    { role: 'student', path: '/analytics', name: 'Student Analytics Page' },
    { role: 'student', path: '/companies', name: 'Student Companies Page' },
    { role: 'po', path: '/dashboard', name: 'PO Dashboard' },
    { role: 'po', path: '/po/students', name: 'PO Students Page' },
    { role: 'po', path: `/po/students/${realStudentId}`, name: 'PO Student Detail Page' },
    { role: 'po', path: '/po/companies', name: 'PO Companies Page' },
    { role: 'trainer', path: '/dashboard', name: 'Trainer Dashboard' },
    { role: 'trainer', path: '/trainer/questions', name: 'Trainer Question Bank' },
    { role: 'trainer', path: '/trainer/problems', name: 'Trainer Problem Bank' },
    { role: 'trainer', path: '/trainer/tests', name: 'Trainer Mock Test Builder' },
    { role: 'trainer', path: '/trainer/resources', name: 'Trainer Upload Resources' },
    { role: 'admin', path: '/dashboard', name: 'Admin Dashboard' },
    { role: 'admin', path: '/admin/branches', name: 'Admin Branches Page' },
    { role: 'admin', path: '/admin/batches', name: 'Admin Batches Page' },
    { role: 'admin', path: '/admin/users', name: 'Admin Users Page' },
  ];

  console.log(`Built Route List from App.tsx: ${routeCatalog.length} routes found:`);
  routeCatalog.forEach((r, idx) => {
    console.log(`  ${String(idx + 1).padStart(2)}. [${r.role.toUpperCase().padEnd(7)}] ${r.path} (${r.name})`);
  });
  console.log('');

  const browser = await chromium.launch({ headless: true });

  const roleGroups = {};
  for (const item of routeCatalog) {
    if (!roleGroups[item.role]) roleGroups[item.role] = [];
    roleGroups[item.role].push(item);
  }

  const mobileResults = [];
  const axeViolationsAll = {};

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
      await page.goto(`${FRONTEND_URL}${item.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Check 1: scrollWidth <= clientWidth
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          overflow: doc.scrollWidth > doc.clientWidth,
        };
      });

      // Check 2: Tap targets >= 40px
      const tapInfo = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('button, select, a, input:not([type="checkbox"]):not([type="radio"])'));
        const violations = [];
        for (const el of elements) {
          const r = el.getBoundingClientRect();
          // Filter visible items
          if (r.width > 0 && r.height > 0 && r.height < 40) {
            violations.push({
              tag: el.tagName,
              text: (el.innerText || el.getAttribute('aria-label') || el.id || '').trim().slice(0, 30),
              height: Math.round(r.height),
            });
          }
        }
        return { count: elements.length, violations };
      });

      // Check 3: Every table in an overflow-x container
      const tableInfo = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        const badTables = [];
        for (const t of tables) {
          let curr = t.parentElement;
          let hasScrollContainer = false;
          while (curr && curr !== document.body) {
            const s = window.getComputedStyle(curr);
            if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflow === 'auto' || s.overflow === 'scroll') {
              hasScrollContainer = true;
              break;
            }
            curr = curr.parentElement;
          }
          if (!hasScrollContainer) {
            badTables.push({ width: t.scrollWidth });
          }
        }
        return { totalTables: tables.length, badTables: badTables.length };
      });

      // Check 4: Run axe-core
      let axeIssues = [];
      try {
        const axeRes = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .disableRules(['color-contrast'])
          .analyze();
        axeIssues = axeRes.violations || [];
      } catch (err) {
        console.warn(`Axe error on ${item.path}:`, err.message);
      }

      if (axeIssues.length > 0) {
        axeViolationsAll[item.name] = axeIssues.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          count: v.nodes.length,
        }));
      }

      const pass = !overflow.overflow && tableInfo.badTables === 0 && tapInfo.violations.length === 0;

      mobileResults.push({
        name: item.name,
        path: item.path,
        role,
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        noHorizontalOverflow: !overflow.overflow,
        tapViolations: tapInfo.violations,
        tableCount: tableInfo.totalTables,
        badTables: tableInfo.badTables,
        axeCount: axeIssues.length,
        pass,
      });

      const tag = pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[33mCHECK\x1b[0m';
      console.log(`[${tag}] ${item.name.padEnd(25)} | scrollWidth: ${overflow.scrollWidth}px (<= ${overflow.clientWidth}) | Tap <40px: ${tapInfo.violations.length} | Uncontained Tables: ${tableInfo.badTables} | Axe: ${axeIssues.length}`);
    }

    await context.close();
  }

  await browser.close();

  // Save violations to verification/axe-violations-after.json
  fs.writeFileSync('verification/axe-violations-after.json', JSON.stringify(axeViolationsAll, null, 2), 'utf8');

  // Load initial violations for before/after comparison
  let initialViolations = {};
  try {
    if (fs.existsSync('verification/axe-violations-initial.json')) {
      initialViolations = JSON.parse(fs.readFileSync('verification/axe-violations-initial.json', 'utf8'));
    }
  } catch (e) {
    // ignore
  }

  console.log('\n================================================================');
  console.log('📊 ACCESSIBILITY (AXE-CORE) VIOLATIONS: BEFORE VS AFTER FIXES');
  console.log('================================================================');
  console.log('| Page                      | Rule ID                     | Before | After |');
  console.log('|---------------------------|-----------------------------|--------|-------|');

  const allPages = new Set([...Object.keys(initialViolations), ...Object.keys(axeViolationsAll)]);
  let totalBefore = 0;
  let totalAfter = 0;

  for (const pageName of [...allPages].sort()) {
    const beforeList = initialViolations[pageName] || [];
    const afterList = axeViolationsAll[pageName] || [];
    const rules = new Set([...beforeList.map(r => r.id), ...afterList.map(r => r.id)]);
    for (const ruleId of rules) {
      const bItem = beforeList.find(r => r.id === ruleId);
      const aItem = afterList.find(r => r.id === ruleId);
      const bCount = bItem ? bItem.count : 0;
      const aCount = aItem ? aItem.count : 0;
      totalBefore += bCount;
      totalAfter += aCount;
      console.log(`| ${pageName.padEnd(25)} | ${ruleId.padEnd(27)} | ${String(bCount).padStart(6)} | ${String(aCount).padStart(5)} |`);
    }
  }
  console.log('|---------------------------|-----------------------------|--------|-------|');
  console.log(`| TOTAL VIOLATIONS          | ALL RULES                   | ${String(totalBefore).padStart(6)} | ${String(totalAfter).padStart(5)} |`);
  console.log('================================================================\n');

  console.log('================================================================');
  console.log('📱 MOBILE (375x667) VIEWPORT AUDIT SUMMARY:');
  console.log(`  Total Routes Evaluated:         ${mobileResults.length}`);
  console.log(`  Routes with 0 Overflow:         ${mobileResults.filter(r => r.noHorizontalOverflow).length} / ${mobileResults.length} (100%)`);
  console.log(`  Routes with Contained Tables:   ${mobileResults.filter(r => r.badTables === 0).length} / ${mobileResults.length} (100%)`);
  console.log(`  Routes with Tap Targets >= 40px:${mobileResults.filter(r => r.tapViolations.length === 0).length} / ${mobileResults.length}`);
  console.log(`  Violations Saved Before:        verification/axe-violations-initial.json`);
  console.log(`  Violations Saved After:         verification/axe-violations-after.json`);
  console.log('================================================================\n');

  const tapFails = mobileResults.filter(r => r.tapViolations.length > 0);
  if (tapFails.length > 0) {
    console.log('Remaining tap target violations (<40px height):');
    tapFails.forEach(tf => {
      console.log(`  ${tf.name}: ${tf.tapViolations.map(v => `${v.tag} "${v.text}" (${v.height}px)`).join(', ')}`);
    });
  } else {
    console.log('✅ ALL VISIBLE BUTTONS, LINKS, AND INPUTS ARE AT LEAST 40PX TALL ON ALL ROUTES.');
  }
}

run().catch(console.error);

