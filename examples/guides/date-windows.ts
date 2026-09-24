/**
 * Compute a local-date window in the athlete's own time zone and list activities,
 * workout events and wellness records within it. Does not change the account: every
 * call is a read.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/date-windows.ts
 */
import { IntervalsClient } from '../../src/index.js';
import { localDateIn, shiftDays } from '../_shared/local-date.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

// The API reads `oldest`/`newest` in the athlete's own time zone, so resolve the athlete
// first and format the bounds in `me.timezone`. Both ends come from one timestamp, so the
// window cannot shift if the two are computed a moment apart (for example across midnight),
// and the older bound is stepped back in calendar days rather than in hours.
const me = await client.athletes.getAthlete();
const now = new Date(); // one timestamp for both bounds
const newest = localDateIn(now, me.timezone);
const oldest = shiftDays(newest, -29); // inclusive bounds: an offset of 29 gives a 30 days window

const activities = await client.activities.listActivities({ oldest, newest });
const events = await client.events.listEvents({ oldest, newest, category: ['WORKOUT'] });
const wellness = await client.wellness.listWellness({ oldest, newest });

console.log(`${oldest} to ${newest} (inclusive):`);
console.log(`  ${activities.length} activities`);
console.log(`  ${events.length} workout events`);
console.log(`  ${wellness.length} wellness records`);
// #endregion main
