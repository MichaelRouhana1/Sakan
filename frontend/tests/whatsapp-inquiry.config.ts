import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testMatch: "whatsapp-inquiry.spec.ts",
  outputDir: "../.expo/whatsapp-inquiry-tests",
});
