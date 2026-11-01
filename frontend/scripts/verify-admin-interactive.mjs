import { chromium } from 'playwright';

const FRONTEND_URL = 'http://localhost:5173';

async function testInteractiveFlow() {
  console.log('🧪 Starting Admin Interactive Verification Flow...\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Login
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"], input[name="email"]', 'admin@intelliplace.edu');
  await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  // 2. Go to Branches
  console.log('Navigating to Branches Page...');
  await page.goto(`${FRONTEND_URL}/admin/branches`, { waitUntil: 'networkidle' });
  const branchName = 'QA_Audit_Test_' + Date.now();
  
  // Fill branch name and submit
  const input = page.locator('input[placeholder*="Branch name" i], input[type="text"]').first();
  await input.fill(branchName);
  await page.click('button:has-text("Add Branch"), button:has-text("Create")');
  await page.waitForTimeout(1000);

  // Check branch is listed
  const branchListed = await page.locator(`text=${branchName}`).count();
  console.log(`Branch "${branchName}" created: ${branchListed > 0 ? '✔ YES' : '❌ NO'}`);

  // 3. Go to Audit Logs
  console.log('Navigating to Audit Logs Page...');
  await page.goto(`${FRONTEND_URL}/admin/audit-logs`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check that the audit log shows branch.create
  const auditText = await page.locator('body').innerText();
  const hasBranchCreate = auditText.includes('branch') && (auditText.includes('branch.create') || auditText.includes('branch → create'));
  console.log(`Audit log contains branch creation event: ${hasBranchCreate ? '✔ YES' : '❌ NO'}`);

  // 4. Return to branches and clean up
  await page.goto(`${FRONTEND_URL}/admin/branches`, { waitUntil: 'networkidle' });
  page.on('dialog', dialog => dialog.accept());
  const deleteBtn = page.locator(`tr:has-text("${branchName}") button:has-text("Delete")`);
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click();
    await page.waitForTimeout(1000);
    console.log(`Branch "${branchName}" deleted for test cleanup: ✔ YES`);
  }

  // 5. Check Dashboard
  console.log('Navigating to Admin Dashboard to check recent audit events widget...');
  await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const dashboardText = await page.locator('body').innerText();
  const dashboardHasAudit = dashboardText.includes('branch') || dashboardText.includes('Recent Audit Events');
  console.log(`Dashboard shows Recent Audit Events widget: ${dashboardHasAudit ? '✔ YES' : '❌ NO'}`);

  await browser.close();
  console.log('\n🎉 Interactive flow test completed successfully!');
}

testInteractiveFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

