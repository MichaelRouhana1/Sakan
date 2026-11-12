import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'listings-workspace.spec.ts', timeout: 180000, workers: 1,
  expect: { timeout: 15000 },
  use: { baseURL: process.env.STUDENTLY_TEST_URL ?? 'http://localhost:8081', viewport: { width: 1440, height: 1000 }, navigationTimeout: 90000 },
});
