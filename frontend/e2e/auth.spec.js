/**
 * auth.spec.js - Authentication E2E Tests
 * Covers: Register, Login, Logout, Protected Route, Invalid Login
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

// Unique gmail for UI registration test
const REG_TIMESTAMP = Date.now();
const REG_EMAIL = `regtest${REG_TIMESTAMP}@gmail.com`;

test.describe('Authentication', () => {

  test('TC-AUTH-01: Register a new Employee account via UI', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // First name and Gmail address (fields are labelled)
    await page.getByLabel('First name').fill('Testuser');
    await page.getByLabel('Gmail address').fill(REG_EMAIL);

    // Password (there are two password fields with placeholder "••••••••")
    const passwordInputs = page.getByPlaceholder('••••••••');
    await passwordInputs.nth(0).fill('SecurePass123!');
    await passwordInputs.nth(1).fill('SecurePass123!');

    // Check "I'm not a robot"
    await page.locator('#robot-check').check();

    // Submit - button says "Create account"
    await page.getByTestId('register-submit').click();

    // Should redirect to login page after successful registration
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test('TC-AUTH-02: Duplicate registration is rejected (API)', async ({ request }) => {
    const payload = {
      email: `dup${Date.now()}@gmail.com`,
      first_name: 'Dupuser',
      password: 'SecurePass123!',
      role: 'Employee',
    };
    const r1 = await request.post(`${BASE_API}/auth/register`, { data: payload });
    expect(r1.status()).toBe(201);

    const r2 = await request.post(`${BASE_API}/auth/register`, { data: payload });
    expect(r2.status()).toBe(400);
    const body = await r2.json();
    expect(body.detail).toContain('already exists');
  });

  test('TC-AUTH-03: Invalid credentials are rejected on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Select Employee role
    await page.getByRole('button', { name: 'Employee', exact: true }).click();
    await page.locator('input[type="email"]').fill('nobody.test.ghost@gmail.com');
    await page.getByPlaceholder('••••••••').fill('WrongPassword123!');
    await page.locator('#robot-check').check();
    await page.getByTestId('login-submit').click();

    // Should stay on login page
    await expect(page).not.toHaveURL(/dashboard/, { timeout: 6000 });
    // Error message or wrong role message appears
    await expect(page.locator('body')).toContainText(/incorrect|invalid|failed|wrong|denied|credentials|error/i, { timeout: 6000 });
  });

  test('TC-AUTH-04: Valid Employee login succeeds and redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'Employee');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('TC-AUTH-05: Valid Manager login succeeds and redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'Manager');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('TC-AUTH-06: Valid Admin login succeeds and redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'Admin');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('TC-AUTH-07: Logout via navbar dropdown clears session', async ({ page }) => {
    await loginAs(page, 'Employee');
    await expect(page).toHaveURL(/dashboard/);

    // Open the profile menu in the header and sign out
    await page.getByTestId('profile-menu').click();
    const signOut = page.getByRole('menuitem', { name: /sign out/i });
    await expect(signOut).toBeVisible({ timeout: 5000 });
    await signOut.click();

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test('TC-AUTH-08: Unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Navigate to login first to clear storage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/, { timeout: 8000 });
  });

  test('TC-AUTH-09: Refresh token rotation works (API)', async ({ request }) => {
    const loginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    expect(loginRes.status()).toBe(200);
    const { refresh_token } = await loginRes.json();

    const refreshRes = await request.post(`${BASE_API}/auth/refresh`, {
      data: { refresh_token },
    });
    expect(refreshRes.status()).toBe(200);
    const data = await refreshRes.json();
    expect(data.access_token).toBeTruthy();
    expect(data.refresh_token).toBeTruthy();
    // New refresh token should differ from old one (rotation)
    expect(data.refresh_token).not.toBe(refresh_token);
  });

  test('TC-AUTH-10: Admin cannot register themselves (blocked by backend and frontend)', async ({ request }) => {
    const res = await request.post(`${BASE_API}/auth/register`, {
      data: {
        email: `newadmin${Date.now()}@gmail.com`,
        first_name: 'Newadmin',
        password: 'SecurePass123!',
        role: 'Admin',
      },
    });
    expect(res.status()).toBe(422); // Pydantic validation error
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('Admin');
  });
});
