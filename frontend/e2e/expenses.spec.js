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

    // Open the "New claim" dialog
    const newBtn = page.getByTestId('create-expense-btn');
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();

    // Fill in title, category and amount
    const titleInput = page.getByTestId('expense-title-input');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    const expTitle = `E2E Expense ${Date.now()}`;
    await titleInput.fill(expTitle);
    await page.getByTestId('expense-category-select').selectOption('Travel');
    await page.getByTestId('expense-amount-input').fill('75.50');

    // Submit (button lives in the dialog footer, linked to the form)
    const submitBtn = page.getByTestId('expense-submit');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await submitBtn.click();

    // Dialog closes after a successful submit
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 8000 });

    // Search for the title to get past pagination
    await page.getByRole('searchbox', { name: 'Search claims' }).fill(expTitle);

    // The claim appears as a pending row
    const row = page.getByTestId('expense-row').filter({ hasText: expTitle });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(/pending/i);
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
    await page.getByRole('searchbox', { name: 'Search claims' }).fill(expTitle);

    // The row shows the Approved status
    const row = page.getByTestId('expense-row').filter({ hasText: expTitle });
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row).toContainText(/approved/i, { timeout: 5000 });
  });

  test('TC-EXP-09: Manager accesses Approvals page and sees pending expenses', async ({ page }) => {
    await loginAs(page, 'Manager');
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Approvals', { timeout: 8000 });
  });

  test('TC-EXP-10: Manager approves an employee claim from the Approvals queue (UI)', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const expTitle = `Queue Approve ${Date.now()}`;
    await request.post(`${BASE_API}/expenses/`, {
      data: { title: expTitle, category: 'Meals', amount: 42.0 },
      headers: { Authorization: `Bearer ${empToken}` },
    });

    await loginAs(page, 'Manager');
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const item = page.getByTestId('approval-item').filter({ hasText: expTitle });
    await expect(item).toBeVisible({ timeout: 8000 });
    await item.getByTestId('approve-btn').click();

    // The claim leaves the queue once approved
    await expect(item).toHaveCount(0, { timeout: 8000 });
  });

  test('TC-EXP-11: Employee deletes a pending claim from the list (UI)', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const expTitle = `UI Delete ${Date.now()}`;
    await request.post(`${BASE_API}/expenses/`, {
      data: { title: expTitle, category: 'Software', amount: 12.5 },
      headers: { Authorization: `Bearer ${empToken}` },
    });

    await loginAs(page, 'Employee');
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    await page.getByRole('searchbox', { name: 'Search claims' }).fill(expTitle);

    const row = page.getByTestId('expense-row').filter({ hasText: expTitle });
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.getByTestId('expense-delete').click();
    await page.getByTestId('confirm-delete').click();
    await expect(row).toHaveCount(0, { timeout: 8000 });
  });

  test('TC-EXP-12: Approvals flags a duplicate claim as high risk and explains why (UI)', async ({ page, request }) => {
    const empToken = await getToken(request, 'employee');
    const dupTitle = `Duplicate check ${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      await request.post(`${BASE_API}/expenses/`, {
        data: { title: dupTitle, category: 'Meals', amount: 87.4 },
        headers: { Authorization: `Bearer ${empToken}` },
      });
    }

    await loginAs(page, 'Manager');
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');

    const items = page.getByTestId('approval-item').filter({ hasText: dupTitle });
    await expect(items).toHaveCount(2, { timeout: 8000 });
    const first = items.first();
    const badge = first.getByTestId('risk-badge');
    await expect(badge).toHaveAttribute('data-level', 'high');

    await badge.click();
    const reasons = first.getByTestId('risk-reasons');
    await expect(reasons).toContainText('Possible duplicate');
    await expect(reasons).toContainText(/Same title and amount as EXP-\d+/);

    // Clean up so later runs start from a quiet queue
    for (let i = 0; i < 2; i++) await items.first().getByTestId('reject-btn').click();
    await expect(items).toHaveCount(0, { timeout: 8000 });
  });

  test('TC-EXP-13: Receipt scanner reads a receipt image and fills the claim form (UI, in-browser OCR)', async ({ page, browser }) => {
    test.setTimeout(120000); // first run downloads the OCR models (~16 MB)

    // Render a receipt and capture it as a PNG, entirely inside the test.
    const shotCtx = await browser.newContext({ viewport: { width: 520, height: 620 }, deviceScaleFactor: 2 });
    const shot = await shotCtx.newPage();
    await shot.setContent(`<body style="margin:0;background:#fff;display:grid;place-items:center;min-height:100vh">
      <div style="width:360px;padding:24px;font:15px/1.6 'Courier New',monospace;color:#222">
        <div style="text-align:center;font:800 26px Arial,sans-serif">CITY CAB COMPANY</div>
        <div style="text-align:center">Trip receipt</div>
        <div>Date: 14 Nov 2026</div>
        <div style="display:flex;justify-content:space-between"><span>Base fare</span><span>18.40</span></div>
        <div style="display:flex;justify-content:space-between"><span>Airport fee</span><span>5.00</span></div>
        <div style="display:flex;justify-content:space-between"><span>Tax</span><span>1.86</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700"><span>TOTAL</span><span>$25.26</span></div>
      </div></body>`);
    const receipt = await shot.screenshot({ type: 'png' });
    await shotCtx.close();

    await loginAs(page, 'Employee');
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('create-expense-btn').click();
    await page.getByTestId('receipt-file-input').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: receipt });

    await expect(page.getByTestId('receipt-result')).toBeVisible({ timeout: 90000 });
    await expect(page.getByTestId('receipt-total')).toContainText('$25.26');
    await expect(page.getByTestId('receipt-category')).toContainText('Travel');

    await page.getByTestId('receipt-apply').click();
    await expect(page.getByTestId('receipt-applied')).toBeVisible();
    await expect(page.getByTestId('expense-amount-input')).toHaveValue('25.26');
    await expect(page.getByTestId('expense-category-select')).toHaveValue('Travel');
    await expect(page.getByTestId('expense-title-input')).toHaveValue(/city cab/i);
  });
});
