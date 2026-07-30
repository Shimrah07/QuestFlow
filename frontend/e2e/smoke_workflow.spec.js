/**
 * smoke_workflow.spec.js - Complete Business Workflow E2E Test
 * 
 * This is the most important test. It simulates the FULL business workflow:
 * 
 * Admin → Create Project → Create Task → Assign Employee
 * → Employee Login → Complete Task → Verify XP
 * → Employee Submit Expense → Manager Login → Approve Expense
 * → Employee verifies Approved → Admin archives Project
 * → Verify everything still works.
 */
import { test, expect } from '@playwright/test';
import { TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Complete Business Workflow (Smoke Test)', () => {

  let adminToken;
  let managerToken;
  let employeeToken;
  let employeeUserId;
  let employeeInitialPoints;
  let projectId;
  let taskId;
  let expenseId;

  test.beforeAll(async ({ request }) => {
    // Ensure all test users exist
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }

    // Get tokens
    adminToken = await getToken(request, 'admin');
    managerToken = await getToken(request, 'manager');
    employeeToken = await getToken(request, 'employee');

    // Get employee user info
    const empLoginRes = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const empData = await empLoginRes.json();
    employeeUserId = empData.user.id;
    employeeInitialPoints = empData.user.points;
  });

  // ─── Step 1: Admin creates a Project ──────────────────────────────────────

  test('SMOKE-01: Admin creates a project', async ({ request }) => {
    const res = await request.post(`${BASE_API}/projects/`, {
      data: {
        name: `Smoke Workflow Project ${Date.now()}`,
        description: 'Complete business workflow smoke test project',
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(201);
    const project = await res.json();
    expect(project.status).toBe('Active');
    projectId = project.id;
  });

  // ─── Step 2: Admin creates a Task assigned to Employee ───────────────────

  test('SMOKE-02: Admin creates task assigned to employee', async ({ request }) => {
    const res = await request.post(`${BASE_API}/tasks/`, {
      data: {
        title: `Smoke Task ${Date.now()}`,
        description: 'Workflow smoke test task',
        xp: 500,
        assigned_to_id: employeeUserId,
        project_id: projectId,
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(201);
    const task = await res.json();
    expect(task.assigned_to_id).toBe(employeeUserId);
    expect(task.project_id).toBe(projectId);
    taskId = task.id;
  });

  // ─── Step 3: Employee can see their assigned task ─────────────────────────

  test('SMOKE-03: Employee sees assigned task in task list', async ({ request }) => {
    const res = await request.get(`${BASE_API}/tasks/`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status()).toBe(200);
    const tasks = await res.json();
    expect(tasks.some((t) => t.id === taskId)).toBe(true);
  });

  // ─── Step 4: Employee completes the task → XP awarded ────────────────────

  test('SMOKE-04: Employee completes task and XP increases', async ({ request }) => {
    // First move to In Progress
    const progressRes = await request.put(`${BASE_API}/tasks/${taskId}/status`, {
      data: { status: 'In Progress' },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(progressRes.status()).toBe(200);

    // Then complete it
    const completeRes = await request.put(`${BASE_API}/tasks/${taskId}/status`, {
      data: { status: 'Completed' },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(completeRes.status()).toBe(200);

    // Verify XP via fresh login
    const freshLogin = await request.post(`${BASE_API}/auth/login`, {
      data: { email: TEST_USERS.employee.email, password: TEST_USERS.employee.password },
    });
    const updatedUser = (await freshLogin.json()).user;
    expect(updatedUser.points).toBeGreaterThan(employeeInitialPoints);
    // XP should have increased by 500 (the task xp)
    expect(updatedUser.points - employeeInitialPoints).toBeGreaterThanOrEqual(500);
  });

  // ─── Step 5: Employee submits expense ─────────────────────────────────────

  test('SMOKE-05: Employee submits an expense claim', async ({ request }) => {
    const res = await request.post(`${BASE_API}/expenses/`, {
      data: {
        title: `Smoke Expense ${Date.now()}`,
        category: 'Travel',
        amount: 199.99,
      },
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status()).toBe(201);
    const expense = await res.json();
    expect(expense.status).toBe('Pending');
    expenseId = expense.id;
  });

  // ─── Step 6: Manager approves the expense ────────────────────────────────

  test('SMOKE-06: Manager approves employee expense', async ({ request }) => {
    const res = await request.put(`${BASE_API}/expenses/${expenseId}/status`, {
      data: { status: 'Approved' },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('Approved');
  });

  // ─── Step 7: Employee verifies expense is Approved ───────────────────────

  test('SMOKE-07: Employee verifies expense is now Approved', async ({ request }) => {
    const res = await request.get(`${BASE_API}/expenses/${expenseId}`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('Approved');
  });

  // ─── Step 8: Admin archives the project ──────────────────────────────────

  test('SMOKE-08: Admin archives the project', async ({ request }) => {
    const res = await request.delete(`${BASE_API}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('Archived');
  });

  // ─── Step 9: Task still exists after project archive ─────────────────────

  test('SMOKE-09: Completed task still accessible after project archival', async ({ request }) => {
    const res = await request.get(`${BASE_API}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const task = await res.json();
    expect(task.status).toBe('Completed');
    expect(task.project_id).toBe(projectId);
  });

  // ─── Step 10: Leaderboard reflects XP changes ────────────────────────────

  test('SMOKE-10: Leaderboard shows updated XP after task completion', async ({ request }) => {
    const res = await request.get(`${BASE_API}/users/leaderboard`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    expect(res.status()).toBe(200);
    const leaderboard = await res.json();
    const empEntry = leaderboard.find((u) => u.id === employeeUserId);
    expect(empEntry).toBeTruthy();
    expect(empEntry.points).toBeGreaterThan(employeeInitialPoints);
  });

  // ─── Step 11: Admin reports endpoint shows correct aggregates ─────────────

  test('SMOKE-11: Admin system reports show correct aggregated data', async ({ request }) => {
    const res = await request.get(`${BASE_API}/reports/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(200);
    const summary = await res.json();
    expect(summary.users_count).toBeGreaterThan(0);
    expect(summary.tasks.completed).toBeGreaterThan(0);
    expect(summary.expenses.approved_amount).toBeGreaterThan(0);
  });
});
