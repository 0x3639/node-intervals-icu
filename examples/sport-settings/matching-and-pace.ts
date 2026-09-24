/**
 * Take the athlete's first sport settings entry, count activities that match
 * it, then print its pace-curve distances and best-effort defaults. Does not
 * change the account: it only reads.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/sport-settings/matching-and-pace.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const settings = await client.sportSettings.list();
const first = settings[0];

if (!first || first.id === undefined) {
  console.log('No sport settings found');
} else {
  const matching = await client.sportSettings.listMatchingActivities(first.id);
  console.log(`${matching.length} activities match ${first.types?.join(', ') ?? 'these settings'}`);

  const paceDistances = await client.sportSettings.getPaceDistances(first.id);
  console.log(`Distances: ${paceDistances.distances?.join(', ') ?? 'n/a'}`);
  console.log(`Defaults: ${paceDistances.defaults?.join(', ') ?? 'n/a'}`);
}
// #endregion main
