/**
 * Authenticate with an OAuth access token instead of an API key.
 *
 * Run:
 *   export INTERVALS_ACCESS_TOKEN="your-oauth-access-token"
 *   export INTERVALS_ATHLETE_ID="i12345"   # optional; omit to let the token resolve its own athlete
 *   npx tsx examples/guides/oauth-client.ts
 */
import { IntervalsClient } from '../../src/index.js';

if (!process.env.INTERVALS_ACCESS_TOKEN) {
  console.error('Set INTERVALS_ACCESS_TOKEN first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({
  accessToken: process.env.INTERVALS_ACCESS_TOKEN ?? '',
  athleteId: process.env.INTERVALS_ATHLETE_ID,
});

const me = await client.athletes.getAthlete();
console.log(`Hello ${me.name ?? me.id}`);
// #endregion main
