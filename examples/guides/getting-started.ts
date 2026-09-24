/**
 * First calls with the SDK: who am I, my last week of activities, my wellness.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/getting-started.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region client
// athleteId defaults to '0', which the API resolves to the authenticated athlete.
const client = new IntervalsClient({ apiKey });
// #endregion client

// #region calls
const me = await client.athletes.getAthlete();
console.log(`Hello ${me.name ?? me.id}`);

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const weekAgo = new Date(now);
weekAgo.setDate(weekAgo.getDate() - 6);
const newest = localDate(now);
const oldest = localDate(weekAgo);

const activities = await client.activities.listActivities({ oldest, newest });
console.log(`${activities.length} activities in the last 7 days`);
for (const a of activities.slice(0, 5)) {
  console.log(`  ${a.start_date_local}  ${a.type ?? '?'}  ${a.name ?? ''}`);
}

const wellness = await client.wellness.listWellness({ oldest, newest });
const latest = wellness.at(-1);
if (latest) console.log(`Latest wellness: ${latest.date} weight=${latest.weight ?? '-'} hrv=${latest.hrv ?? '-'}`);
else console.log('No wellness records this week');
// #endregion calls
