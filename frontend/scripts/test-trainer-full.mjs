import { chromium } from 'playwright';

async function testTrainerInteraction(email) {
  console.log(`\n========================================`);
  console.log(`Testing Full Workflow for: ${email}`);
  console.log(`========================================`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log(`[PAGE CRASH]: ${err.message}\n${err.stack}`);
    consoleErrors.push(err.message);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  try {
    // 1. Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'Trainer@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // 2. Click sidebar navigation to Mock Tests
    console.log('Clicking sidebar Mock Tests link...');
    const navMockTests = page.locator('aside nav a[href="/trainer/tests"]');
    await navMockTests.click();
    await page.waitForURL('**/trainer/tests', { timeout: 5000 });

    const titleText = await page.locator('h1').innerText();
    console.log('Page Title:', titleText);

    // 3. Click "+ Create Test" button
    console.log('Clicking "+ Create Test"...');
    await page.click('text=+ Create Test');
    await page.waitForTimeout(1000);

    // 4. Fill form
    const uniqueTitle = `E2E Test by ${email} - ${Date.now()}`;
    await page.fill('input[placeholder*="Infosys"]', uniqueTitle);
    await page.fill('input[type="number"]', '30');

    // Wait for questions to load
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    await firstCheckbox.check();
    console.log('Checked first question checkbox');

    // Submit form
    console.log('Submitting create test form...');
    await page.click('button[type="submit"]:has-text("Create Test")');
    await page.waitForTimeout(2000);

    // Check if created test is in list
    const body = await page.locator('body').innerText();
    if (body.includes(uniqueTitle)) {
      console.log(`SUCCESS: Found created test "${uniqueTitle}" in list!`);
    } else {
      throw new Error(`Created test title not found in list: ${uniqueTitle}`);
    }

    // Toggle active/inactive on a test card
    const deactivateBtn = page.locator('button:has-text("Deactivate")').first();
    if (await deactivateBtn.count() > 0) {
      console.log('Toggling test status to Inactive...');
      await deactivateBtn.click();
      await page.waitForTimeout(1000);
      const isInactive = await page.locator('text=Inactive').count() > 0;
      console.log('Status is now Inactive:', isInactive);
    }

    // View results for first test with attempts
    const resultsBtn = page.locator('button:has-text("📊 Results")').first();
    if (await resultsBtn.count() > 0) {
      console.log('Clicking "📊 Results"...');
      await resultsBtn.click();
      await page.waitForTimeout(1500);

      const resultsH1 = await page.locator('h1').innerText();
      console.log('Results page header:', resultsH1);

      // Back to tests
      await page.click('button:has-text("← Back to Tests")');
      await page.waitForTimeout(1000);
      console.log('Back button worked cleanly');
    }

    // Test direct results link from dashboard
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForTimeout(1000);
    const viewResultsLink = page.locator('table a:has-text("View Results")').first();
    if (await viewResultsLink.count() > 0) {
      console.log('Clicking "View Results" from dashboard table...');
      await viewResultsLink.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`URL after clicking View Results: ${url}`);
      const directH1 = await page.locator('h1').innerText();
      console.log('Direct results header:', directH1);
    }

    if (consoleErrors.length > 0) {
      console.error(`Console errors encountered for ${email}:`, consoleErrors);
    } else {
      console.log(`Clean run without console or page errors for ${email}!`);
    }

  } catch (err) {
    console.error(`Error in test for ${email}:`, err);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  await testTrainerInteraction('trainer1@intelliplace.edu');
  await testTrainerInteraction('trainer2@intelliplace.edu');
  console.log('\n✅ ALL TRAINER TESTS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
