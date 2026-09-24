/**
 * Find activities with 3-10 minute power intervals at 95-130% intensity, and
 * search activities by name/tag for "tempo".
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/activities/interval-search.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const matches = await client.activities.searchIntervals({
  minSecs: 180,
  maxSecs: 600,
  minIntensity: 95,
  maxIntensity: 130,
  type: 'POWER',
  limit: 10,
});

if (matches.length === 0) {
  console.log('No activities with matching power intervals');
} else {
  for (const activity of matches) {
    console.log(`${activity.id}  ${activity.name ?? ''}`);
  }
}

const tempo = await client.activities.searchActivitiesFull('tempo', { limit: 5 });
console.log(`${tempo.length} activit${tempo.length === 1 ? 'y' : 'ies'} matching "tempo"`);
// #endregion main
