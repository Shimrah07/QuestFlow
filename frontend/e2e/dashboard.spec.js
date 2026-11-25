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

    // The 4 KPI tiles: tasks done, open tasks, pending claims, approved spend
    for (const id of ['kpi-completed', 'kpi-open', 'kpi-pending', 'kpi-approved']) {
      await expect(page.getByTestId(id)).toBeVisible({ timeout: 8000 });
    }
    // XP progress panel
    await expect(page.getByTestId('xp-panel')).toBeVisible();
  });

  test('TC-DASH-03: Open tasks section renders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const openTasks = page.getByRole('heading', { name: /open tasks/i });
    await expect(openTasks).toBeVisible({ timeout: 8000 });
  });

  test('TC-DASH-04: Achievements section renders', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const achievementsSection = page.getByRole('heading', { name: 'Achievements' });
    await expect(achievementsSection).toBeVisible({ timeout: 8000 });
  });

  test('TC-DASH-05: Dashboard shows correct role/user info in welcome banner', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Greeting heading says the user's name, with their role underneath
    await expect(page.locator('h1')).toContainText(/Good (morning|afternoon|evening), Admin/i, { timeout: 8000 });
    await expect(page.locator('main')).toContainText(/Admin · Level/i);
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

  test('TC-DASH-07: Insights row shows forecast, projects at risk, workload and spend', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible({ timeout: 8000 });
    for (const id of ['insight-forecast', 'insight-projects', 'insight-workload', 'insight-spend']) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    await expect(page.getByTestId('insight-spend')).toContainText('$');
  });
});
