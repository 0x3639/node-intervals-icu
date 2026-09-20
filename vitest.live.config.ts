import { defineConfig } from 'vitest/config';

// Hits the real Intervals.icu API. Never run in CI.
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run test:live
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/live/**/*.live.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
