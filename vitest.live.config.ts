import { defineConfig } from 'vitest/config';

// Hits the real Intervals.icu API. Never run in CI.
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run test:live
// Write cases need INTERVALS_LIVE_WRITE=1; the chat round trip also needs INTERVALS_LIVE_CHAT_TO=<athlete id>
// of someone who agreed to receive one test message (the API rejects messages to yourself).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/live/**/*.live.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
