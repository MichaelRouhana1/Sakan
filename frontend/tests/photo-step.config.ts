import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "photo-step.spec.ts",
  outputDir: "../.expo/photo-step-tests",
});
