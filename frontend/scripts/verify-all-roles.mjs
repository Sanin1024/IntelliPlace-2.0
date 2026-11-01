import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';

const USERS = [
  {
    role: 'student',
    email: 'alice@student.edu',
    password: 'Student@123',
    allowedPaths: [
      '/dashboard',
      '/profile',
      '/resources',
      '/problems',
      '/practice',
      '/resume',
      '/analytics',
      '/tests',
      '/companies',
    ],
    forbiddenPaths: [
      '/trainer/tests',
      '/trainer/questions',
      '/trainer/problems',
      '/trainer/resources',
      '/po/students',
      '/po/companies',
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
    ],
  },
  {
    role: 'trainer1',
    email: 'trainer1@intelliplace.edu',
    password: 'Trainer@123',
    allowedPaths: [
      '/dashboard',
      '/profile',
      '/resources',
      '/problems',
      '/trainer/questions',
      '/trainer/problems',
      '/trainer/tests',
      '/trainer/resources',
      '/tests',
    ],
    forbiddenPaths: [
      '/practice',
      '/resume',
      '/analytics',
      '/po/students',
      '/po/companies',
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
    ],
  },
  {
    role: 'trainer2',
    email: 'trainer2@intelliplace.edu',
    password: 'Trainer@123',
    allowedPaths: [
      '/dashboard',
      '/profile',
      '/resources',
      '/problems',
      '/trainer/questions',
      '/trainer/problems',
      '/trainer/tests',
      '/trainer/resources',
      '/tests',
    ],
    forbiddenPaths: [
      '/practice',
      '/resume',
      '/analytics',
      '/po/students',
      '/po/companies',
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
    ],
  },
  {
    role: 'po',
    email: 'po@intelliplace.edu',
    password: 'Po@12345',
    allowedPaths: [
      '/dashboard',
      '/profile',
      '/companies',
      '/po/students',
      '/po/companies',
    ],
    forbiddenPaths: [
      '/practice',
      '/resume',
      '/analytics',
      '/trainer/questions',
      '/trainer/problems',
      '/trainer/tests',
      '/trainer/resources',
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
    ],
  },
  {
    role: 'admin',
    email: 'admin@intelliplace.edu',
    password: 'Admin@123',
    allowedPaths: [
      '/dashboard',
      '/profile',
      '/admin/branches',
      '/admin/batches',
      '/admin/users',
      '/po/students',
      '/po/companies',
    ],
    forbiddenPaths: [
      '/practice',
      '/resume',
      '/analytics',
    ],
  },
];

async function verifyAllRoles() {
  console.log('================================================================');
  console.log('🛡️  VERIFYING ALL USER ROLES AND PROTECTED ROUTE ENFORCEMENT');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  for (const userConfig of USERS) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    console.log(`\n--- Testing Role: ${userConfig.role} (${userConfig.email}) ---`);

    // 1. Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', userConfig.email);
    await page.fill('input[type="password"]', userConfig.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify allowed paths
    for (const p of userConfig.allowedPaths) {
      totalChecks++;
      try {
        await page.goto(`${FRONTEND_URL}${p}`);
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        const pathname = new URL(currentUrl).pathname;
        const h1 = await page.locator('h1').allInnerTexts().catch(() => []);

        // Allowed pages should NOT redirect to /login or /dashboard (unless allowed page was /dashboard)
        if (p !== '/dashboard' && (pathname === '/dashboard' || pathname === '/login')) {
          console.error(`  ❌ ALLOWED FAIL: ${p} redirected unexpectedly to ${pathname}`);
          failedChecks++;
        } else {
          console.log(`  ✅ ALLOWED OK: ${p} (H1: "${h1[0] || 'rendered'}")`);
          passedChecks++;
        }
      } catch (err) {
        console.error(`  ❌ ERROR on ${p}:`, err.message);
        failedChecks++;
      }
    }

    // Verify forbidden paths are redirected to /dashboard
    for (const p of userConfig.forbiddenPaths) {
      totalChecks++;
      try {
        await page.goto(`${FRONTEND_URL}${p}`);
        await page.waitForTimeout(800);
        const currentUrl = page.url();
        const pathname = new URL(currentUrl).pathname;

        if (pathname === '/dashboard' || pathname === '/login') {
          console.log(`  🔒 BLOCKED OK: ${p} properly redirected to ${pathname}`);
          passedChecks++;
        } else {
          console.error(`  ❌ SECURITY LEAK: ${p} was NOT blocked! Current: ${pathname}`);
          failedChecks++;
        }
      } catch (err) {
        console.error(`  ❌ ERROR checking forbidden ${p}:`, err.message);
        failedChecks++;
      }
    }

    if (pageErrors.length > 0) {
      console.error(`  ⚠️ Page crashes detected for ${userConfig.role}:`, pageErrors);
    }

    await page.close();
  }

  await browser.close();

  console.log('\n================================================================');
  console.log(`RESULTS: Total Checks: ${totalChecks} | Passed: ${passedChecks} | Failed: ${failedChecks}`);
  console.log('================================================================');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

verifyAllRoles().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
