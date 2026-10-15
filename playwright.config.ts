import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.WARDCAST_WEB_URL ?? 'http://127.0.0.1:4173/wardcast-demo/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } }],
  webServer: process.env.WARDCAST_WEB_URL
    ? undefined
    : {
        command: 'pnpm preview --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173/wardcast-demo/',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
