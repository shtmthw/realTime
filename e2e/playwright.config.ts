import { defineConfig, devices } from '@playwright/test';
import { webServer } from './server';
import { e2eDatabaseUrl } from './server';

const PORT = 4311;

export default defineConfig({
  testDir: './tests',
  globalSetup: './globalSetup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: webServer(PORT, e2eDatabaseUrl),
});
