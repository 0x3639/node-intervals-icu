/**
 * Compute a local-date window and list activities, workout events and wellness
 * records within it.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/date-windows.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBefore = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - days);
  return copy;
};

const now = new Date(); // one timestamp for both bounds
const newest = localDate(now);
const oldest = localDate(daysBefore(now, 30));

const activities = await client.activities.listActivities({ oldest, newest });
const events = await client.events.listEvents({ oldest, newest, category: ['WORKOUT'] });
const wellness = await client.wellness.listWellness({ oldest, newest });

console.log(`${oldest} to ${newest} (inclusive):`);
console.log(`  ${activities.length} activities`);
console.log(`  ${events.length} workout events`);
console.log(`  ${wellness.length} wellness records`);
// #endregion main
