/**
 * notifications.spec.js - Server-side notifications E2E tests
 * The backend creates notifications when events happen and pushes them to the browser over a
 * server-sent-events stream, so they should appear without reloading or refocusing the page.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Notifications', () => {
  test.beforeEach(async ({ request }) => {
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  test('TC-NOTIF-01: Employee gets a new task and an approved claim pushed live, and can open them', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const mgrToken = await getToken(request, 'manager');
    const adminToken = await getToken(request, 'admin');
    const emp = { Authorization: `Bearer ${empToken}` };
    const mgr = { Authorization: `Bearer ${mgrToken}` };
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json();
    const stamp = Date.now();

    const claim = await (await request.post(`${BASE_API}/expenses/`, { data: { title: `Notif claim ${stamp}`, category: 'Meals', amount: 23.4 }, headers: emp })).json();
    let taskId;

    try {
      await loginAs(page, 'Employee');
      await page.waitForLoadState('networkidle');

      // Events happen elsewhere while the page just sits there.
      const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Notif task ${stamp}`, xp: 70, assigned_to_id: me.id }, headers: mgr })).json();
      taskId = task.id;
      await request.put(`${BASE_API}/expenses/${claim.id}/status`, { data: { status: 'Approved' }, headers: mgr });

      await page.getByTestId('notif-bell').click();
      const taskNote = page.getByTestId('notif-item').filter({ hasText: `Notif task ${stamp}` });
      await expect(taskNote).toContainText('New task assigned to you', { timeout: 10000 });
      await expect(page.getByTestId('notif-item').filter({ hasText: `Notif claim ${stamp}` })).toContainText('Claim approved', { timeout: 10000 });

      await taskNote.click();
      await expect(page).toHaveURL(/\/tasks$/);

      // Read state is saved on the server.
      const saved = await (await request.get(`${BASE_API}/notifications/`, { headers: emp })).json();
      expect(saved.find((n) => n.description?.startsWith(`Notif task ${stamp}`)).is_read).toBe(true);
    } finally {
      if (taskId) await request.delete(`${BASE_API}/tasks/${taskId}`, { headers: mgr });
      await request.delete(`${BASE_API}/expenses/${claim.id}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    }
  });

  test('TC-NOTIF-02: Manager is asked to review new claims, the employee hears when the manager marks their task done, and nobody is told about their own action', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const mgrToken = await getToken(request, 'manager');
    const emp = { Authorization: `Bearer ${empToken}` };
    const mgr = { Authorization: `Bearer ${mgrToken}` };
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json();
    const stamp = Date.now();
    let claimId;
    let taskId;

    try {
      await loginAs(page, 'Manager');
      await page.waitForLoadState('networkidle');

      claimId = (await (await request.post(`${BASE_API}/expenses/`, { data: { title: `Taxi ${stamp}`, category: 'Travel', amount: 18.2 }, headers: emp })).json()).id;
      await page.getByTestId('notif-bell').click();
      await expect(page.getByTestId('notif-item').filter({ hasText: `Taxi ${stamp}` })).toContainText('New claim to review', { timeout: 10000 });
      await page.keyboard.press('Escape');

      // The manager completes the employee's task on the board.
      const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Done by manager ${stamp}`, xp: 20, assigned_to_id: me.id }, headers: mgr })).json();
      taskId = task.id;
      await request.put(`${BASE_API}/tasks/${task.id}/status`, { data: { status: 'In Progress' }, headers: mgr });
      await page.goto('/tasks');
      await page.waitForLoadState('networkidle');
      await page.locator(`[data-task-id="${task.id}"]`).getByTestId('task-complete').click();
      await expect(page.locator(`[data-task-id="${task.id}"]`).getByTestId('task-complete')).toHaveCount(0, { timeout: 5000 });

      // The employee is told; the manager who did it is not.
      await expect
        .poll(async () => (await (await request.get(`${BASE_API}/notifications/`, { headers: emp })).json()).some((n) => n.title === 'Your task was marked done' && n.description.startsWith(`Done by manager ${stamp}`)), { timeout: 5000 })
        .toBe(true);
      const mine = await (await request.get(`${BASE_API}/notifications/`, { headers: mgr })).json();
      expect(mine.some((n) => n.description?.startsWith(`Done by manager ${stamp}`))).toBe(false);
    } finally {
      if (taskId) await request.delete(`${BASE_API}/tasks/${taskId}`, { headers: mgr });
      if (claimId) await request.delete(`${BASE_API}/expenses/${claimId}`, { headers: emp });
    }
  });
});
