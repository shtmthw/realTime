/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    // The API lives on :4000 in development; in production the same server serves both.
    proxy: { '/graphql': { target: 'http://localhost:4000', ws: true } },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: false,
  },
});
