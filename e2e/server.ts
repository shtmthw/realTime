import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('..', import.meta.url));

/** Database used by the e2e run. Created beforehand (CI: the service database). */
export const e2eDatabaseUrl =
  process.env.DATABASE_URL_E2E ?? 'postgresql://postgres:postgres@localhost:55432/realtime_e2e';

/** Builds the playwright `webServer` entry that runs the real production-mode server. */
export function webServer(port: number, databaseUrl: string) {
  return {
    // Same code path as the Docker image: the API serves the built web app.
    command:
      'npx prisma migrate deploy --schema apps/server/prisma/schema.prisma && npx tsx apps/server/src/index.ts',
    cwd: root,
    url: `http://localhost:${port}/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret',
    },
  };
}

/** Empties every table so each run starts from a clean slate. */
export function resetDatabase(databaseUrl: string) {
  const env = { ...process.env, DATABASE_URL: databaseUrl };
  execSync('npx prisma migrate deploy --schema apps/server/prisma/schema.prisma', {
    cwd: root,
    env,
    stdio: 'pipe',
  });
  execSync(
    `npx prisma db execute --schema apps/server/prisma/schema.prisma --stdin <<< 'TRUNCATE "Message","ConversationMember","Conversation","User" CASCADE;'`,
    { cwd: root, env, stdio: 'pipe', shell: '/bin/bash' },
  );
}
