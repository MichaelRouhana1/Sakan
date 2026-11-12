import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "listing-renew.spec.ts",
  timeout: 180000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: process.env.STUDENTLY_TEST_URL ?? "http://localhost:8081",
    viewport: { width: 1440, height: 1100 },
    navigationTimeout: 90000,
  },
});
