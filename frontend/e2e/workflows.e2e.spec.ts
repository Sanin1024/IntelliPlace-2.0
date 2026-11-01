import { test, expect } from '@playwright/test';

/**
 * Challenge 312: End-to-end workflow testing.
 * Tests complete user journeys across multiple modules.
 */

test.describe('Complete Student Journey', () => {
  test('Student can register, login, and view dashboard', async ({ page }) => {
    // Register
    await page.goto('http://localhost:5173/register');
    await page.fill('input[name="name"]', 'E2E Test Student');
    await page.fill('input[name="email"]', `e2e-workflow-${Date.now()}@test.com`);
    await page.fill('input[name="password"]', 'E2ETest@12345');
    await page.fill('input[name="confirmPassword"]', 'E2ETest@12345');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome back');
  });

  test('Student can login and navigate to placement drives', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    
    // Navigate to drives
    await page.click('text=Placement Drives');
    await page.waitForURL('**/drives');
    await expect(page.locator('h1')).toContainText('Placement Drives');
  });

  test('Student can view their applications', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    await page.click('text=My Applications');
    await page.waitForURL('**/applications/my-applications');
    await expect(page.locator('h1')).toContainText('My Applications');
  });
});

test.describe('PO Journey', () => {
  test('PO can login and view student list', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'po@intelliplace.edu');
    await page.fill('input[type="password"]', 'Po@12345');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('text=Students');
    await page.waitForURL('**/po/students');
    await expect(page.locator('h1')).toContainText('Student Management');
  });
});

test.describe('Admin Journey', () => {
  test('Admin can login and view audit logs', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@intelliplace.edu');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/dashboard');
    await page.click('text=Audit Logs');
    await page.waitForURL('**/admin/audit-logs');
    await expect(page.locator('h1')).toContainText('Audit Logs');
  });
});

test.describe('Unauthorized Access', () => {
  test('Student cannot access admin pages', async ({ page }) => {
    // Login as student
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'alice@student.edu');
    await page.fill('input[type="password"]', 'Student@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    
    // Try to access admin page directly
    await page.goto('http://localhost:5173/admin/users');
    
    // Should be redirected to unauthorized or dashboard
    await page.waitForURL(/.*(dashboard|unauthorized)/);
    await expect(page.locator('h1')).not.toContainText('Manage Users');
  });
});

