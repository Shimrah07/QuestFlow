/**
 * quests.spec.js - Quests E2E tests
 * Weekly quests advance as tasks are completed; team quests are created by managers, completed
 * by project work, and pay their bonus to contributors. The test database keeps state between
 * runs, so assertions compare before and after rather than absolute values.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Quests', () => {
  test.beforeEach(async ({ request }) => {
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  test('TC-QUEST-01: Completing a task advances the weekly "Finish 3 tasks" quest', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const mgrToken = await getToken(request, 'manager');
    const emp = { Authorization: `Bearer ${empToken}` };
    const mgr = { Authorization: `Bearer ${mgrToken}` };
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json();
    const finish3 = async () => (await (await request.get(`${BASE_API}/quests/`, { headers: emp })).json()).weekly.find((q) => q.code === 'finish-3');

    const before = await finish3();
    const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Quest step ${Date.now()}`, xp: 15, assigned_to_id: me.id }, headers: mgr })).json();
    await request.put(`${BASE_API}/tasks/${task.id}/status`, { data: { status: 'Completed' }, headers: emp });
    const after = await finish3();

    if (before.completed) {
      expect(after).toMatchObject({ completed: true, progress: 3 }); // already done this week: stays done, no second bonus
    } else {
      expect(after.progress).toBe(before.progress + 1);
    }

    await loginAs(page, 'Employee');
    await page.goto('/quests');
    await page.waitForLoadState('networkidle');
    const card = page.locator('[data-testid="weekly-quest"][data-code="finish-3"]');
    await expect(card).toBeVisible();
    await expect(card.getByTestId('weekly-progress')).toContainText(after.completed ? 'Bonus earned' : `${after.progress} task`);
  });

  test('TC-QUEST-02: Manager sets a team quest; the employee completes it and is paid their share', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const mgrToken = await getToken(request, 'manager');
    const emp = { Authorization: `Bearer ${empToken}` };
    const mgr = { Authorization: `Bearer ${mgrToken}` };
    const me = await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json();
    const project = (await (await request.get(`${BASE_API}/projects/`, { headers: mgr })).json()).find((p) => p.status === 'Active');

    // The manager creates the quest through the dialog.
    await loginAs(page, 'Manager');
    await page.goto('/quests');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('new-team-quest').click();
    await page.getByTestId('team-quest-project').selectOption(String(project.id));
    await page.getByTestId('team-quest-target').fill('1');
    await page.getByTestId('team-quest-reward').fill('100');
    await page.getByTestId('team-quest-submit').click();
    const card = page.getByTestId('team-quest').filter({ hasText: `Finish 1 ${project.name} task` }).first();
    await expect(card).toBeVisible({ timeout: 8000 });
    const questId = Number(await card.getAttribute('data-quest-id'));

    // The employee finishes a task in that project.
    const pointsBefore = (await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json()).points;
    const task = await (await request.post(`${BASE_API}/tasks/`, { data: { title: `Team quest work ${Date.now()}`, xp: 20, assigned_to_id: me.id, project_id: project.id }, headers: mgr })).json();
    await request.put(`${BASE_API}/tasks/${task.id}/status`, { data: { status: 'Completed' }, headers: emp });

    const quest = (await (await request.get(`${BASE_API}/quests/`, { headers: emp })).json()).team.find((q) => q.id === questId);
    expect(quest).toMatchObject({ status: 'completed', my_contribution: 1, my_reward: 100 });
    const pointsAfter = (await (await request.get(`${BASE_API}/users/me`, { headers: emp })).json()).points;
    expect(pointsAfter - pointsBefore).toBeGreaterThanOrEqual(20 + 100); // task XP + team share (plus any weekly bonus)

    const notes = await (await request.get(`${BASE_API}/notifications/`, { headers: emp })).json();
    expect(notes.some((n) => n.title === `Team quest complete: Finish 1 ${project.name} task`)).toBe(true);

    // The manager's page shows it as completed after a reload.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(/Recent \(/).click();
    await expect(page.locator(`[data-quest-id="${questId}"]`).getByTestId('team-quest-status')).toHaveText('Completed');
  });

  test('TC-QUEST-03: Employees cannot create team quests', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const res = await request.post(`${BASE_API}/quests/team`, {
      data: { project_id: 1, target: 1, reward_xp: 100, ends_at: new Date(Date.now() + 86400000).toISOString() },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    expect(res.status()).toBe(403);

    await loginAs(page, 'Employee');
    await page.goto('/quests');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Quests', level: 1 })).toBeVisible();
    await expect(page.getByTestId('new-team-quest')).toHaveCount(0);
  });
});
