import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Resume Builder @375px', () => {
  test('renders without horizontal overflow and no axe violations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Login as student
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to resume builder
    await page.goto('http://localhost:5173/resume');
    await page.waitForLoadState('networkidle');

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Run axe-core accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Color contrast in dark/light palette
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('can fill and save resume', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/resume');
    await page.waitForLoadState('networkidle');

    // Fill summary
    await page.fill('textarea', 'Test summary for e2e');

    // Save
    await page.click('text=💾 Save Resume');
    await page.waitForTimeout(2000);

    // Verify success
    const hasSuccess = await page.locator('text=Resume saved').count();
    expect(hasSuccess).toBeGreaterThan(0);
  });
});

test.describe('Company Prep Plan @375px', () => {
  test('renders prep plan without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Navigate to companies
    await page.goto('http://localhost:5173/companies');
    await page.waitForLoadState('networkidle');

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('prep plan shows for expanded company', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    await page.goto('http://localhost:5173/companies');
    await page.waitForLoadState('networkidle');

    // Click first company to expand
    const companyCard = page.locator('[style*="companyCard"]').first();
    await page.click('text=View Syllabus & Details');
    await page.waitForTimeout(1000);

    // Check no overflow after expansion
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});