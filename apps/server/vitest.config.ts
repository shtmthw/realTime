import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const TEST_DB =
  process.env.DATABASE_URL_TEST ?? 'postgresql://postgres:postgres@localhost:55432/realtime_test';

export default defineConfig({
  resolve: {
    // Node resolves `graphql` to its CJS build; Vite prefers the .mjs one. Two copies of the
    // library break `instanceof GraphQLError` (errors would be masked), so pin the Node one.
    alias: { graphql: fileURLToPath(import.meta.resolve('graphql')) },
  },
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/globalSetup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB,
      JWT_SECRET: 'test-secret-test-secret-test-secret',
    },
  },
});
