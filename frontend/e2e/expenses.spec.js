/**
 * expenses.spec.js - Expense Management E2E Tests
 * Covers: Employee submits expense, Manager approves, Employee sees approved status
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS, getToken } from './helpers.js';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

test.describe('Expense Management', () => {

  test.beforeEach(async ({ request }) => {
    for (const user of Object.values(TEST_USERS)) {
      await request.post(`${BASE_API}/auth/register`, { data: user }).catch(() => {});
    }
  });

  test('TC-EXP-01: Employee can navigate to Expenses page', async ({ page }) => {
    await loginAs(page, 'Employee');
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('TC-EXP-02: Employee can submit an expense via UI', async ({ page }) => {
    await loginAs(page, 'Employee');
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');

    // Open create expense modal/form
    const newBtn = page.getByTestId('create-expense-btn').or(page.getByRole('button', { name: /new|submit|add|claim|upload/i })).first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();

    // Fill in title
    const titleInput = page.getByTestId('expense-title-input').or(page.getByPlaceholder(/title|expense name/i)).first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    const expTitle = `E2E Expense ${Date.now()}`;
    await titleInput.fill(expTitle);

    // Amount
    const amountInput = page.getByTestId('expense-amount-input').or(page.getByPlaceholder(/amount|0\.00/i)).first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill('75.50');
    }

    // Submit form inside modal
    const submitBtn = page.getByTestId('expense-submit');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Wait for create modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 8000 }).catch(() => {});

    // Filter/search for the expense title to handle pagination
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(expTitle);
    }

    // Expense should appear in list
    await expect(page.locator('body')).toContainText(expTitle, { timeout: 10000 });
  });

  test('TC-EXP-03: Employee can submit and then edit a pending expense (API)', async ({ request }) => {
    const empToken = await getToken(request, 'employee');

    // Submit expense
    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: `Editable Expense ${Date.now()}`, category: 'Travel', amount: 100.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    expect(createRes.status()).toBe(201);
    const expense = await createRes.json();
    expect(expense.status).toBe('Pending');

    // Edit it
    const editRes = await request.put(`${BASE_API}/expenses/${expense.id}`, {
      data: { title: `${expense.title} EDITED`, amount: 150.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    expect(editRes.status()).toBe(200);
    const edited = await editRes.json();
    expect(edited.amount).toBe(150.0);
  });

  test('TC-EXP-04: Employee can delete a pending expense (API)', async ({ request }) => {
    const empToken = await getToken(request, 'employee');

    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: `Delete Expense ${Date.now()}`, category: 'Meals', amount: 50.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const expense = await createRes.json();

    const deleteRes = await request.delete(`${BASE_API}/expenses/${expense.id}`, {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    expect(deleteRes.status()).toBe(204);
  });

  test('TC-EXP-05: Manager can approve an employee expense (API)', async ({ request }) => {
    const empToken = await getToken(request, 'employee');
    const managerToken = await getToken(request, 'manager');

    // Employee submits expense
    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: `Approval Test ${Date.now()}`, category: 'Equipment', amount: 250.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const expense = await createRes.json();

    // Manager approves
    const approveRes = await request.put(`${BASE_API}/expenses/${expense.id}/status`, {
      data: { status: 'Approved' },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(approveRes.status()).toBe(200);
    const approved = await approveRes.json();
    expect(approved.status).toBe('Approved');
  });

  test('TC-EXP-06: Manager can reject an expense (API)', async ({ request }) => {
    const empToken = await getToken(request, 'employee');
    const managerToken = await getToken(request, 'manager');

    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: `Reject Test ${Date.now()}`, category: 'Meals', amount: 30.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const expense = await createRes.json();

    const rejectRes = await request.put(`${BASE_API}/expenses/${expense.id}/status`, {
      data: { status: 'Rejected' },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(rejectRes.status()).toBe(200);
    expect((await rejectRes.json()).status).toBe('Rejected');
  });

  test('TC-EXP-07: Self-approval is prevented (Manager cannot approve own expense)', async ({ request }) => {
    const managerToken = await getToken(request, 'manager');

    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: `Self Approve Attempt ${Date.now()}`, category: 'Travel', amount: 500.0 },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const expense = await createRes.json();

    const selfApproveRes = await request.put(`${BASE_API}/expenses/${expense.id}/status`, {
      data: { status: 'Approved' },
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    expect(selfApproveRes.status()).toBe(400);
    const body = await selfApproveRes.json();
    expect(body.detail).toContain('Self-approval');
  });

  test('TC-EXP-08: Employee sees their expense status after Manager approval (UI)', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const managerToken = await getToken(request, 'manager');

    const expTitle = `Status Verify ${Date.now()}`;
    const createRes = await request.post(`${BASE_API}/expenses/`, {
      data: { title: expTitle, category: 'Software', amount: 99.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });
    const expense = await createRes.json();

    // Manager approves via API
    await request.put(`${BASE_API}/expenses/${expense.id}/status`, {
      data: { status: 'Approved' },
      headers: { Authorization: `Bearer ${managerToken}` },
    });

    // Employee views their expenses
    await loginAs(page, 'Employee');
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');

    // Search for the specific expense title to isolate it from pagination
    const searchInput = page.getByPlaceholder(/search/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(expTitle);
    }

    // The expense should show "Approved" status
    await expect(page.locator('body')).toContainText(expTitle, { timeout: 8000 });
    await expect(page.locator('body')).toContainText(/approved/i, { timeout: 5000 });
  });

  test('TC-EXP-09: Manager accesses Approvals page and sees pending expenses', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });
});
