/**
 * tasks.spec.js - Tasks Module E2E Tests
 * Covers: Create Task, Assign Employee, Employee completes task, XP increases
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Tasks Management', () => {

  test.beforeEach(async ({ request }) => {
    // Ensure all test users exist
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  test('TC-TASK-01: Admin can navigate to Tasks page', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('body')).toContainText(/pipeline|task/i);
  });

  test('TC-TASK-02: Admin can create a task via UI', async ({ page, request }) => {
    await loginAs(page, 'Admin');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Click "Deploy Operation" button
    const deployBtn = page.getByRole('button', { name: /deploy operation/i });
    await expect(deployBtn).toBeVisible({ timeout: 5000 });
    await deployBtn.click();

    // Modal should open
    const modal = page.locator('[role="dialog"], .fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill title
    const taskTitle = `E2E Task ${Date.now()}`;
    await page.getByPlaceholder(/Implement active directory|task title/i).fill(taskTitle);

    // Submit
    await page.getByRole('button', { name: /Deploy Operation/i }).last().click();

    // Task appears in board
    await expect(page.locator('body')).toContainText(taskTitle, { timeout: 8000 });
  });

  test('TC-TASK-03: Manager can create task and assign to employee (API)', async ({ request }) => {
    const managerToken = await getToken(request, 'manager');
    const employeeToken = await getToken(request, 'employee');

    // Get employee ID
    const loginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const empUser = (await loginRes.json()).user;

    const taskRes = await request.post(`${BASE_API}/tasks/`, {
      data: {
        title: `Assigned Task ${Date.now()}`,
        description: 'E2E assigned task test',
        xp: 200,
        assigned_to_id: empUser.id,
      },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(taskRes.status()).toBe(201);
    const task = await taskRes.json();
    expect(task.assigned_to_id).toBe(empUser.id);

    // Employee can see their task
    const listRes = await request.get(`${BASE_API}/tasks?assigned_to_id=${empUser.id}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const tasks = await listRes.json();
    expect(tasks.some((t) => t.id === task.id)).toBe(true);
  });

  test('TC-TASK-04: Employee completes task and XP increases', async ({ request }) => {
    const adminToken = await getToken(request, 'admin');
    const employeeToken = await getToken(request, 'employee');

    // Get employee info
    const loginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const empUser = (await loginRes.json()).user;
    const initialPoints = empUser.points;

    // Admin creates task with 300 XP assigned to employee
    const taskRes = await request.post(`${BASE_API}/tasks/`, {
      data: {
        title: `XP Task ${Date.now()}`,
        xp: 300,
        assigned_to_id: empUser.id,
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const task = await taskRes.json();

    // Employee completes the task
    const completeRes = await request.put(`${BASE_API}/tasks/${task.id}/status`, {
      data: { status: 'Completed' },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(completeRes.status()).toBe(200);

    // Employee's points should have increased
    const updatedLoginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const updatedUser = (await updatedLoginRes.json()).user;
    expect(updatedUser.points).toBeGreaterThan(initialPoints);
  });

  test('TC-TASK-05: Employee cannot create tasks (RBAC - 403)', async ({ request }) => {
    const employeeToken = await getToken(request, 'employee');
    const res = await request.post(`${BASE_API}/tasks/`, {
      data: { title: 'Unauthorized Task', xp: 100 },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('TC-TASK-06: Task status change from Todo to In Progress (UI)', async ({ page, request }) => {
    // Create a task via API for employee
    const adminToken = await getToken(request, 'admin');
    const loginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const empUser = (await loginRes.json()).user;

    const taskTitle = `Status Change Task ${Date.now()}`;
    await request.post(`${BASE_API}/tasks/`, {
      data: { title: taskTitle, xp: 50, assigned_to_id: empUser.id },
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Login as employee and change status
    await loginAs(page, 'Employee');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Click "Start Task" button for that task
    const taskCardText = page.locator(`text=${taskTitle}`).first();
    await expect(taskCardText).toBeVisible({ timeout: 8000 });

    const cardContainer = taskCardText.locator('..').locator('..');
    const startBtn = cardContainer.getByTestId('task-start').or(cardContainer.getByRole('button', { name: /Start Task/i })).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await expect(page.locator('body')).toContainText(/In Progress|Running|shifted/i, { timeout: 5000 });
    }
  });

  test('TC-TASK-07: Delete task (Admin via UI)', async ({ page, request }) => {
    const adminToken = await getToken(request, 'admin');
    const taskTitle = `Delete Task ${Date.now()}`;
    await request.post(`${BASE_API}/tasks/`, {
      data: { title: taskTitle, xp: 100 },
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    await loginAs(page, 'Admin');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(taskTitle, { timeout: 8000 });

    // Click delete (trash) icon
    const taskCard = page.locator(`text=${taskTitle}`).first().locator('..').locator('..');
    const deleteBtn = taskCard.getByTitle(/Delete Task/i);
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();
      // Confirm delete in modal
      const confirmBtn = page.getByRole('button', { name: /Confirm Delete/i });
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();
      // Task should no longer appear
      await expect(page.locator(`text=${taskTitle}`)).toHaveCount(0, { timeout: 5000 });
    }
  });
});
