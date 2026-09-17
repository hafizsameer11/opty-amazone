import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'marketplace-flow.spec.ts', timeout: 420_000, workers: 1,
  expect: { timeout: 30_000 },
  use: { headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
