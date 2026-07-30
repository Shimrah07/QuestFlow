/**
 * projects.spec.js - Projects Module E2E Tests
 * Covers: Admin/Manager Create, Edit, Archive, Search projects
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';
const PROJ_NAME = `E2E Project ${Date.now()}`;

test.describe('Projects Management', () => {

  test.beforeEach(async ({ request }) => {
    // Ensure test users exist
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  test('TC-PROJ-01: Admin can navigate to Manage Projects page', async ({ page, request }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // Projects page header
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).toContainText(/project/i);
  });

  test('TC-PROJ-02: Admin can create a project', async ({ page, request }) => {
    await loginAs(page, 'Admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // Fill in project name using stable testid selector
    const nameInput = page.getByTestId('project-name-input').or(page.getByPlaceholder(/name|project name/i)).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill(PROJ_NAME);

    // Description
    const descInput = page.getByTestId('project-description-input').or(page.getByPlaceholder(/description/i)).first();
    if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descInput.fill('E2E test project description');
    }

    // Submit
    const submitBtn = page.getByTestId('create-project').or(page.getByRole('button', { name: /create|save|submit|deploy/i })).first();
    await submitBtn.click();

    // Project should appear in list
    await expect(page.locator('body')).toContainText(PROJ_NAME, { timeout: 8000 });
  });

  test('TC-PROJ-03: Admin can edit a project (via API setup + UI edit)', async ({ page, request }) => {
    // Create project via API
    const token = await getToken(request, 'admin');
    const createRes = await request.post(`${BASE_API}/projects/`, {
      data: { name: `Edit Target ${Date.now()}`, description: 'Original desc' },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(createRes.status()).toBe(201);
    const project = await createRes.json();

    await loginAs(page, 'Admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // Filter project list to find the project card
    const searchInput = page.getByTestId('project-search').or(page.getByPlaceholder(/search/i)).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(project.name);
    }

    // Click edit button for the filtered project
    const editBtn = page.getByTestId('edit-project-btn').or(page.getByTitle(/Edit Project/i)).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Modal should be open
    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Update name field inside edit modal
    const nameInput = page.getByTestId('edit-project-name-input').or(page.getByPlaceholder(/name/i)).first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.clear();
    await nameInput.fill(`${project.name} EDITED`);

    // Submit edit form
    const submitBtn = page.getByTestId('edit-project-submit').or(page.getByRole('button', { name: /Update Project|save/i })).first();
    await submitBtn.click();
    await expect(page.locator('body')).toContainText(/EDITED|Project updated successfully/i, { timeout: 8000 });
  });

  test('TC-PROJ-04: Admin can archive (soft-delete) a project', async ({ page, request }) => {
    const token = await getToken(request, 'admin');
    const createRes = await request.post(`${BASE_API}/projects/`, {
      data: { name: `Archive Target ${Date.now()}`, description: 'To be archived' },
      headers: { Authorization: `Bearer ${token}` },
    });
    const project = await createRes.json();

    // Archive via API (DELETE which soft-deletes)
    const archiveRes = await request.delete(`${BASE_API}/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(archiveRes.status()).toBe(200);
    const archived = await archiveRes.json();
    expect(archived.status).toBe('Archived');

    // Verify project still exists (not hard deleted)
    const getRes = await request.get(`${BASE_API}/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.status()).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.status).toBe('Archived');
  });

  test('TC-PROJ-05: Search filter on projects page works', async ({ page, request }) => {
    // Create a uniquely named project
    const token = await getToken(request, 'admin');
    const uniqueName = `UNIQUE_SEARCH_${Date.now()}`;
    await request.post(`${BASE_API}/projects/`, {
      data: { name: uniqueName, description: 'Searchable' },
      headers: { Authorization: `Bearer ${token}` },
    });

    await loginAs(page, 'Admin');
    await page.goto('/admin/projects');
    await page.waitForLoadState('networkidle');

    // Use search input
    const searchInput = page.getByTestId('project-search').or(page.getByPlaceholder(/search/i)).first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(uniqueName);

    // Result should contain the project
    await expect(page.locator('body')).toContainText(uniqueName, { timeout: 5000 });
  });

  test('TC-PROJ-06: Employee cannot access admin/projects page (RBAC)', async ({ page, request }) => {
    await request.post(`${BASE_API}/auth/register`, { data: TEST_USERS.employee }).catch(() => {});
    await loginAs(page, 'Employee');

    await page.goto('/admin/projects');
    // Should redirect to dashboard (RBAC guard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });
});
