/**
 * Configure retry behaviour and read back the rate-limit state the SDK tracked
 * from the last response's headers.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/rate-limits.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey, maxRetries: 5, retryDelayMs: 500 });

await client.athletes.getAthlete();

console.log(`Remaining: ${client.getRateLimitRemaining()}`);
console.log(`Resets at: ${client.getRateLimitReset()?.toISOString()}`);
// #endregion main
