/**
 * rbac.spec.js - Role-Based Access Control E2E Tests
 * Covers: Admin access, Manager restrictions, Employee restrictions
 * Both backend API and frontend route guard validation.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('RBAC - Role-Based Access Control', () => {

  test.beforeEach(async ({ request }) => {
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  // ─── Admin Access ───────────────────────────────────────────────────────────

  test('TC-RBAC-01: Admin can access /admin/users', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    // Should NOT redirect to /dashboard
    expect(page.url()).toContain('/admin/users');
  });

  test('TC-RBAC-02: Admin can access /admin/projects', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin/projects');
  });

  test('TC-RBAC-03: Admin can access /admin/reports', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin/reports');
  });

  test('TC-RBAC-04: Admin API access to reports summary', async ({ request }) => {
    const token = await getToken(request, 'admin');
    const res = await request.get(`${BASE_API}/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('users_count');
    expect(data).toHaveProperty('tasks');
    expect(data).toHaveProperty('expenses');
  });

  // ─── Manager Restrictions ───────────────────────────────────────────────────

  test('TC-RBAC-05: Manager is redirected away from /admin/users (frontend)', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/admin/users');
    // Should redirect to /dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('TC-RBAC-06: Manager is redirected away from /admin/reports (frontend)', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('TC-RBAC-07: Manager cannot access reports API (backend 403)', async ({ request }) => {
    const token = await getToken(request, 'manager');
    const res = await request.get(`${BASE_API}/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('TC-RBAC-08: Manager can access /approvals page', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/approvals');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  // ─── Employee Restrictions ──────────────────────────────────────────────────

  test('TC-RBAC-09: Employee is redirected away from /admin/users (frontend)', async ({ page }) => {
    await loginAs(page, 'Employee');
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('TC-RBAC-10: Employee is redirected away from /admin/projects (frontend)', async ({ page }) => {
    await loginAs(page, 'Employee');
    await page.goto('/admin/projects');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('TC-RBAC-11: Employee is redirected away from /approvals (frontend)', async ({ page }) => {
    await loginAs(page, 'Employee');
    await page.goto('/approvals');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('TC-RBAC-12: Employee cannot list projects via API (backend 403)', async ({ request }) => {
    const token = await getToken(request, 'employee');
    const res = await request.get(`${BASE_API}/projects/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('TC-RBAC-13: Employee cannot create tasks via API (backend 403)', async ({ request }) => {
    const token = await getToken(request, 'employee');
    const res = await request.post(`${BASE_API}/tasks/`, {
      data: { title: 'Forbidden Task', xp: 100 },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('TC-RBAC-14: Unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get(`${BASE_API}/tasks/`);
    expect(res.status()).toBe(401);
  });

  test('TC-RBAC-15: Employee can only see own expenses (not others)', async ({ request }) => {
    const empToken = await getToken(request, 'employee');
    const adminToken = await getToken(request, 'admin');

    // Admin creates an expense
    await request.post(`${BASE_API}/expenses/`, {
      data: { title: 'Admin Private Expense', category: 'Equipment', amount: 9999.0 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Employee lists expenses - should NOT see admin's expense
    const listRes = await request.get(`${BASE_API}/expenses/`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const expenses = await listRes.json();
    expect(expenses.every((e) => e.title !== 'Admin Private Expense')).toBe(true);
  });

  // ─── Shell / UI-level RBAC ──────────────────────────────────────────────────

  test('TC-RBAC-16: Manager sees an access-denied toast when redirected from /admin/users', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
    await expect(page.getByText("Your Manager role doesn't have access to that page.")).toBeVisible({ timeout: 5000 });
  });

  test('TC-RBAC-17: Navigation only shows links the role can open', async ({ page }) => {
    await loginAs(page, 'Employee');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const label of ['Dashboard', 'Tasks', 'Expenses', 'Leaderboard']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    for (const label of ['Approvals', 'Users', 'Projects', 'Reports']) {
      await expect(nav.getByRole('link', { name: new RegExp(`^${label}`) })).toHaveCount(0);
    }

    // A signed-in user is bounced away from /login, so clear the session before switching roles.
    await page.evaluate(() => localStorage.clear());
    await loginAs(page, 'Admin');
    const adminNav = page.getByRole('navigation', { name: 'Main' });
    for (const label of ['Users', 'Projects', 'Reports']) {
      await expect(adminNav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(adminNav.getByRole('link', { name: /^Approvals/ })).toBeVisible();
  });

  test('TC-RBAC-18: Signing out from the profile menu returns to /login', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.getByTestId('profile-menu').click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test('TC-RBAC-19: Admin users page exposes role and status controls', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid^="user-role-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="user-status-"]').first()).toHaveAttribute('role', 'switch');
  });
});
