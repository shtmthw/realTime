import { execSync } from 'node:child_process';

// Apply migrations to the *test* database before any test runs.
export default function setup() {
  const url =
    process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:55432/realtime_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
}
