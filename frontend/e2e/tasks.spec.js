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
    await expect(page.locator('h1')).toHaveText(/Tasks/);
  });

  test('TC-TASK-02: Admin can create a task via UI', async ({ page }) => {
    await loginAs(page, 'Admin');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Open the "New task" dialog
    const newTaskBtn = page.getByTestId('new-task-btn');
    await expect(newTaskBtn).toBeVisible({ timeout: 5000 });
    await newTaskBtn.click();

    // Modal should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    // Fill title
    const taskTitle = `E2E Task ${Date.now()}`;
    await page.getByTestId('task-title-input').fill(taskTitle);

    // Submit
    await page.getByTestId('task-submit').click();

    // Task appears in board
    await expect(page.getByTestId('task-card').filter({ hasText: taskTitle })).toHaveCount(1, { timeout: 8000 });
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

    // Click "Start" on that task's card
    const card = page.getByTestId('task-card').filter({ hasText: taskTitle });
    await expect(card).toBeVisible({ timeout: 8000 });
    await card.getByTestId('task-start').click();

    await expect(page.locator('body')).toContainText(/Task moved to In progress/i, { timeout: 5000 });
    // The card now offers Complete instead of Start
    await expect(
      page.getByTestId('task-card').filter({ hasText: taskTitle }).getByTestId('task-complete')
    ).toBeVisible({ timeout: 5000 });
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

    // Click the delete (trash) button on that task's card
    const taskCard = page.getByTestId('task-card').filter({ hasText: taskTitle });
    await taskCard.getByTestId('task-delete').click();

    // Confirm delete in modal
    const confirmBtn = page.getByTestId('confirm-delete');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Task should no longer appear
    await expect(page.getByTestId('task-card').filter({ hasText: taskTitle })).toHaveCount(0, { timeout: 5000 });
  });

  test('TC-TASK-08: Task assistant suggests XP and an assignee from similar past tasks (UI)', async ({ page, request }) => {
    const mgrToken = await getToken(request, 'manager');
    const empLogin = await request.post(`${BASE_API}/auth/login`, { data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password } });
    const employeeId = (await empLogin.json()).user.id;
    const auth = { Authorization: `Bearer ${mgrToken}` };

    // Two finished tasks about the same thing, done by the employee and worth 450 XP each.
    const created = [];
    for (const suffix of ['production', 'preview']) {
      const res = await request.post(`${BASE_API}/tasks/`, {
        data: { title: `Configure kubernetes ingress for ${suffix}`, xp: 450, assigned_to_id: employeeId },
        headers: auth,
      });
      const task = await res.json();
      created.push(task.id);
      await request.put(`${BASE_API}/tasks/${task.id}/status`, { data: { status: 'Completed' }, headers: auth });
    }

    try {
      await loginAs(page, 'Manager');
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      await page.getByTestId('new-task-btn').click();
      await page.getByTestId('task-title-input').fill('Configure kubernetes ingress for staging');

      await expect(page.getByTestId('assistant-panel')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('assistant-xp')).toContainText('450');
      await page.getByTestId('assistant-apply-xp').click();
      await expect(page.getByLabel('XP reward')).toHaveValue('450');

      const top = page.getByTestId('assistant-assignee').first();
      await expect(top).toHaveAttribute('data-user-id', String(employeeId));
      await expect(top).toContainText('Finished "Configure kubernetes ingress');
      await top.click();
      await expect(page.getByLabel('Assignee', { exact: true })).toHaveValue(String(employeeId));
    } finally {
      for (const id of created) await request.delete(`${BASE_API}/tasks/${id}`, { headers: auth });
    }
  });

  test('TC-TASK-09: Employee drags their task from To do to In progress (UI drag and drop)', async ({ page, request }) => {
    const mgrToken = await getToken(request, 'manager');
    const empToken = await getToken(request, 'employee');
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: { Authorization: `Bearer ${empToken}` } })).json();
    const auth = { Authorization: `Bearer ${mgrToken}` };
    const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Drag me ${Date.now()}`, xp: 30, assigned_to_id: me.id }, headers: auth })).json();

    try {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await loginAs(page, 'Employee');
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');

      const card = page.getByTestId('column-Todo').locator(`[data-task-id="${task.id}"]`);
      await expect(card).toBeVisible({ timeout: 8000 });
      // hover() scrolls the card into view and waits until it stops moving (filters animate).
      await card.hover({ position: { x: 60, y: 20 } });
      await page.mouse.down();
      const from = await card.boundingBox();
      await page.mouse.move(from.x + 75, from.y + 30, { steps: 3 });
      const to = await page.getByTestId('column-In Progress').boundingBox();
      await page.mouse.move(to.x + to.width / 2, Math.max(to.y, 0) + 80, { steps: 12 });
      await page.mouse.up();

      await expect(page.getByTestId('column-In Progress').locator(`[data-task-id="${task.id}"]`)).toBeVisible({ timeout: 5000 });
      await expect
        .poll(async () => (await (await request.get(`${BASE_API}/tasks/${task.id}`, { headers: auth })).json()).status, { timeout: 5000 })
        .toBe('In Progress');
    } finally {
      await request.delete(`${BASE_API}/tasks/${task.id}`, { headers: auth });
    }
  });

  test('TC-TASK-11: Employees only see tasks assigned to them (UI and API)', async ({ page, request }) => {
    const mgrToken = await getToken(request, 'manager');
    const empToken = await getToken(request, 'employee');
    const auth = { Authorization: `Bearer ${mgrToken}` };
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: { Authorization: `Bearer ${empToken}` } })).json();
    const manager = await (await request.get(`${BASE_API}/users/me`, { headers: auth })).json();
    const stamp = Date.now();
    const mine = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Mine ${stamp}`, xp: 20, assigned_to_id: me.id }, headers: auth })).json();
    const theirs = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Not mine ${stamp}`, xp: 20, assigned_to_id: manager.id }, headers: auth })).json();

    try {
      // API: the list holds only my tasks, and someone else's task can't be opened.
      const list = await (await request.get(`${BASE_API}/tasks/`, { headers: { Authorization: `Bearer ${empToken}` } })).json();
      expect(list.every((t) => t.assigned_to_id === me.id)).toBe(true);
      expect(list.some((t) => t.id === mine.id)).toBe(true);
      expect((await request.get(`${BASE_API}/tasks/${theirs.id}`, { headers: { Authorization: `Bearer ${empToken}` } })).status()).toBe(403);

      // UI: no "All tasks" switch, my task is on the board, theirs is not.
      await loginAs(page, 'Employee');
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      await expect(page.getByTestId('my-task-count')).toContainText('assigned to you');
      await expect(page.getByRole('tab', { name: /All tasks/ })).toHaveCount(0);
      await expect(page.getByTestId('task-card').filter({ hasText: `Mine ${stamp}` })).toHaveCount(1);
      await expect(page.getByTestId('task-card').filter({ hasText: `Not mine ${stamp}` })).toHaveCount(0);
    } finally {
      await request.delete(`${BASE_API}/tasks/${mine.id}`, { headers: auth });
      await request.delete(`${BASE_API}/tasks/${theirs.id}`, { headers: auth });
    }
  });

  test('TC-TASK-10: Reaching a new level shows the celebration (UI)', async ({ page, request }) => {
    const mgrToken = await getToken(request, 'manager');
    const auth = { Authorization: `Bearer ${mgrToken}` };
    const empLogin = await (await request.post(`${BASE_API}/auth/login`, { data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password } })).json();
    const toNext = 500 - (empLogin.user.points % 500);
    const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Level up ${Date.now()}`, xp: Math.max(10, toNext), assigned_to_id: empLogin.user.id }, headers: auth })).json();
    await request.put(`${BASE_API}/tasks/${task.id}/status`, { data: { status: 'In Progress' }, headers: auth });

    await loginAs(page, 'Employee');
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('level-up')).toHaveCount(0); // never on page load

    await page.locator(`[data-task-id="${task.id}"]`).getByTestId('task-complete').click();
    const celebration = page.getByTestId('level-up');
    await expect(celebration).toBeVisible({ timeout: 8000 });
    await expect(celebration).toContainText(`You reached level ${empLogin.user.level + 1}`);
    await page.getByTestId('level-up-close').click();
    await expect(celebration).toHaveCount(0, { timeout: 3000 });
  });
});
