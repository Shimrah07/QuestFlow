/**
 * global-setup.js - Runs once before all Playwright tests.
 * Seeds test users into the backend database.
 * 
 * Admin user is created via the backend API with a special bypass
 * by running a Python script to seed directly (since Admin cannot self-register).
 * Manager and Employee are registered via the normal /register endpoint.
 */
import { chromium, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

const BASE_API = 'http://127.0.0.1:8000/api/v1';

const MANAGER = {
  email: 'manager@gmail.com',
  password: 'Manager@123',
  first_name: 'Manager',
  role: 'Manager',
};

const EMPLOYEE = {
  email: 'employee@gmail.com',
  password: 'Employee@123',
  first_name: 'Employee',
  role: 'Employee',
};

async function globalSetup() {
  const context = await playwrightRequest.newContext();

  // Register Manager (ignore if already exists)
  const mgr = await context.post(`${BASE_API}/auth/register`, { data: MANAGER });
  console.log(`Manager registration: ${mgr.status()} ${mgr.status() === 201 ? 'CREATED' : 'ALREADY EXISTS'}`);

  // Register Employee (ignore if already exists)
  const emp = await context.post(`${BASE_API}/auth/register`, { data: EMPLOYEE });
  console.log(`Employee registration: ${emp.status()} ${emp.status() === 201 ? 'CREATED' : 'ALREADY EXISTS'}`);

  // Seed Admin, Manager, and Employee users via Python script
  try {
    const backendDir = path.resolve('..', 'backend');
    const pythonPath = path.resolve('..', 'backend', 'venv', 'Scripts', 'python.exe');
    const scriptPath = path.resolve('..', 'backend', 'scripts', 'seed_e2e_users.py');
    const result = execSync(`"${pythonPath}" "${scriptPath}"`, {
      cwd: backendDir,
      encoding: 'utf8',
    });
    console.log(`Seed script output: ${result.trim()}`);
  } catch (err) {
    console.warn('Warning: Could not run seed script:', err.message);
  }

  await context.dispose();
}

export default globalSetup;
