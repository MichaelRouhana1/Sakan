import { defineConfig } from "@playwright/test";
import path from "node:path";

// Shared browser defaults; individual suites may override the target and match.
export default defineConfig({
  testDir: ".",
  testMatch: "whatsapp-inquiry.spec.ts",
  outputDir: path.resolve(__dirname, "../.expo/browser-tests"),
  tsconfig: "../tsconfig.json",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.STUDENTLY_TEST_URL ?? "http://localhost:8084",
    viewport: { width: 1440, height: 1100 },
    contextOptions: { reducedMotion: "reduce" },
    navigationTimeout: 90000,
    screenshot: "only-on-failure",
  },
});
