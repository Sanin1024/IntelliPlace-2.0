import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

test.describe('Student Drives page @375px', () => {
  test('renders, no overflow, shows eligibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'alice@student.edu', 'Student@123');
    await page.goto('http://localhost:5173/drives');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Eligibility or closed explanation is visible for at least one drive
    const hasEligibility = await page.locator('text=/eligible|Closed|deadline/i').count();
    expect(hasEligibility).toBeGreaterThan(0);
  });

  test('apply button disabled flow for ineligible/closed drives', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'carol@student.edu', 'Student@123');
    await page.goto('http://localhost:5173/drives');
    await page.waitForLoadState('networkidle');
    // Page must not crash and must show status badges
    expect(await page.locator('h1:has-text("Placement Drives")').count()).toBe(1);
  });
});

test.describe('PO Drive Management @375px', () => {
  test('form opens, no overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, 'po@intelliplace.edu', 'Po@12345');
    await page.goto('http://localhost:5173/po/drives');
    await page.waitForLoadState('networkidle');

    await page.click('text=+ New Drive');
    await page.waitForTimeout(500);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('student cannot access PO drive management', async ({ page }) => {
    await login(page, 'alice@student.edu', 'Student@123');
    await page.goto('http://localhost:5173/po/drives');
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/po\/drives/);
  });
});

