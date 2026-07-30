/**
 * Shared test helpers for QuestFlow E2E suite.
 * 
 * IMPORTANT: Backend enforces @gmail.com email addresses only.
 * Admin accounts cannot be self-registered via the /register endpoint.
 * 
 * Test User Credentials:
 *   Admin:    admin.e2e.apex@gmail.com / AdminPass123!  (must be seeded manually)
 *   Manager:  manager.e2e.apex@gmail.com / ManagerPass123!
 *   Employee: employee.e2e.apex@gmail.com / EmpPass123!
 */

const BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const TEST_USERS = {
  admin: {
    email: 'admin@gmail.com',
    password: 'Admin@123',
    first_name: 'Admin',
    role: 'Admin',
  },
  manager: {
    email: 'manager@gmail.com',
    password: 'Manager@123',
    first_name: 'Manager',
    role: 'Manager',
  },
  employee: {
    email: 'employee@gmail.com',
    password: 'Employee@123',
    first_name: 'Employee',
    role: 'Employee',
  },
};

/**
 * Login helper: fills the login form and submits.
 * Handles the role selector + "I'm not a robot" checkbox.
 */
export async function loginAs(page, role = 'Employee') {
  const creds = TEST_USERS[role.toLowerCase()];
  if (!creds) throw new Error(`Unknown role: ${role}`);

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Select role tab
  await page.getByRole('button', { name: creds.role, exact: true }).click();

  // Fill credentials
  await page.locator('input[type="email"]').fill(creds.email);
  await page.getByPlaceholder('••••••••').fill(creds.password);

  // Check "I'm not a robot"
  await page.locator('#robot-check').check();

  // Submit
  await page.getByRole('button', { name: /Establish Connection/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Logout helper: clicks logout in the sidebar.
 */
export async function logout(page) {
  // Click the logout button (look for a button with "logout" or "Terminate" text)
  const logoutBtn = page.getByRole('button', { name: /logout|terminate|disconnect/i });
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
  } else {
    // Clear localStorage directly as fallback
    await page.evaluate(() => {
      localStorage.removeItem('cyber_access_token');
      localStorage.removeItem('cyber_refresh_token');
      localStorage.removeItem('cyber_session');
    });
    await page.goto('/login');
  }
  await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
}

/**
 * Ensure users exist in the backend (register if not found via API).
 */
export async function ensureTestUsersExist(request) {
  for (const [, user] of Object.entries(TEST_USERS)) {
    try {
      await request.post(`${BASE_URL}/auth/register`, {
        data: {
          email: user.email,
          first_name: user.first_name,
          password: user.password,
          role: user.role,
        },
      });
    } catch {
      // User likely already exists – ignore 400 errors
    }
  }
}

/**
 * Get an auth token for API calls in tests.
 */
export async function getToken(request, role = 'admin') {
  const creds = TEST_USERS[role];
  const res = await request.post(`${BASE_URL}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  const data = await res.json();
  return data.access_token;
}
