import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Run tests against source, so a stale dist/ can never mask a failure.
    alias: {
      '@ascents/domain': src('./packages/domain/src/index.ts'),
      '@ascents/ride-import': src('./packages/ride-import/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
  },
});
