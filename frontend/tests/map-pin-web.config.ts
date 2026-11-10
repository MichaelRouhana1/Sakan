import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'map-pin-web.spec.mjs',
  outputDir: '../.expo/map-pin-baseline/playwright',
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: process.env.STUDENTLY_TEST_URL ?? 'http://127.0.0.1:8085',
    launchOptions: { executablePath: process.env.MAP_PIN_TEST_BROWSER ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-web', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } },
  ],
});
