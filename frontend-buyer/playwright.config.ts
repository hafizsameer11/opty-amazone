import { defineConfig } from '@playwright/test';

const baseURL = process.env.CAMPAIGN_TEST_BASE_URL || 'http://127.0.0.1:3130';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: { baseURL, headless: true },
  webServer: process.env.CAMPAIGN_TEST_BASE_URL ? undefined : {
    command: 'npm run dev -- --port 3130',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
