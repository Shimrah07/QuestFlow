import { defineConfig } from 'vitest/config'

// Unit tests for the pure in-browser logic (receipt parser, expense risk engine).
// Kept separate from vite.config.js so tests don't load the app's OCR/bundling setup.
// Playwright specs in e2e/ are run separately with `npx playwright test`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
})
