/**
 * dashboard.spec.js - Dashboard E2E Tests
 * Covers: Dashboard loads, KPIs visible, Leaderboard visible, Activity feed
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    // Ensure test users exist
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
    await loginAs(page, 'Admin');
  });

  test('TC-DASH-01: Dashboard page loads without errors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // No JS errors
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Dashboard header visible
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    expect(errors).toHaveLength(0);
  });

  test('TC-DASH-02: KPI stat cards are visible with real data', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The 4 KPI cards should be present (XP, Tasks, Expenses, Ledger)
    // They all display numeric or text values
    const xpCard = page.getByText(/Accrued Experience/i);
    await expect(xpCard).toBeVisible({ timeout: 8000 });

    const opsCard = page.getByText(/Operations Completed/i);
    await expect(opsCard).toBeVisible();

    const expCard = page.getByText(/Expense Submissions/i);
    await expect(expCard).toBeVisible();

    const ledgerCard = page.getByText(/Disbursed Ledger/i);
    await expect(ledgerCard).toBeVisible();
  });

  test('TC-DASH-03: Activity feed (operations pipeline) section renders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const pipelineSection = page.getByText(/Assigned Operations Pipeline/i);
    await expect(pipelineSection).toBeVisible({ timeout: 8000 });
  });

  test('TC-DASH-04: Achievements section renders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const achievementsSection = page.getByText(/Achievements/i);
    await expect(achievementsSection).toBeVisible({ timeout: 8000 });
  });

  test('TC-DASH-05: Dashboard shows correct role/user info in welcome banner', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Welcome banner should say the user's name
    await expect(page.locator('body')).toContainText(/Welcome Back, Agent/i, { timeout: 8000 });
    await expect(page.locator('body')).toContainText(/Admin/i);
  });

  test('TC-DASH-06: No failed network requests on dashboard load', async ({ page }) => {
    const failedRequests = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && res.url().includes('/api/')) {
        failedRequests.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    expect(failedRequests).toHaveLength(0);
  });
});
