import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Relative base ('./') keeps asset URLs portable so the same build works
// from GitHub Pages' project sub-path (/<repo>/) without hard-coding the repo
// name. We have no client-side routing, so relative paths are safe.
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@sim': fileURLToPath(new URL('./src/sim', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@persistence': fileURLToPath(new URL('./src/persistence', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Several sim tests run thousands of deterministic ticks; the default 5s is
    // too tight on slower CI runners.
    testTimeout: 30_000,
  },
});
