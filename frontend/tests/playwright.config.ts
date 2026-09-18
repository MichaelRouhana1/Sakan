import { defineConfig } from "@playwright/test";
import path from "node:path";

// Start a local web preview with EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY='' first.
export default defineConfig({
  testDir: ".",
  testMatch: "card-badge-editor.spec.ts",
  outputDir: path.resolve(__dirname, "../.expo/card-badge-tests"),
  tsconfig: "../tsconfig.json",
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.SKOUN_TEST_URL ?? "http://localhost:8082",
    viewport: { width: 1440, height: 1100 },
    contextOptions: { reducedMotion: "reduce" },
    navigationTimeout: 90000,
    screenshot: "only-on-failure",
  },
});
