import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';
import { resetDatabase, root, webServer } from './server';

const PORT = 4312;
const DATABASE_URL =
  process.env.DATABASE_URL_SHOTS ?? 'postgresql://postgres:postgres@localhost:55432/realtime_shots';

// Reset + seed demo data before the server starts, so screenshots are reproducible.
resetDatabase(DATABASE_URL);
execSync('npx tsx apps/server/prisma/seed.ts', {
  cwd: root,
  env: { ...process.env, DATABASE_URL, JWT_SECRET: 'screenshots-secret-screenshots' },
  stdio: 'pipe',
});

export default defineConfig({
  testDir: './screenshots',
  workers: 1,
  timeout: 180_000,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, ...devices['Desktop Chrome'] },
  webServer: webServer(PORT, DATABASE_URL),
});
