/**
 * Update today's wellness record with a weight, read it back, then put the
 * previous weight back. This writes to the account: it overwrites today's
 * weight and restores it in a finally block.
 *
 * It writes only when today's record already has a weight to restore.
 * `WellnessInput.weight` is `number | undefined`, so the SDK cannot clear a
 * field once it is set; if today has no weight yet the example prints that
 * there is nothing restorable and exits without writing.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/wellness/update-today.ts
 */
import { IntervalsClient, IntervalsAPIError } from '../../src/index.js';
import { localDateIn } from '../_shared/local-date.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
// maxRetries: 0 — a create that committed before a 5xx would be repeated by a retry, and only the last response's id would be cleaned up.
const client = new IntervalsClient({ apiKey, maxRetries: 0 });

// The API keys wellness records by the athlete's local date, not the machine's. A machine
// in a different time zone (or a CI runner on UTC) would otherwise read one day's record
// and write another's, so the date is formatted in the athlete's zone (see
// examples/_shared/local-date.ts).

const me = await client.athletes.getAthlete();
const today = localDateIn(new Date(), me.timezone);

// Read the current record first so the demo value can be put back. A 404 means
// there is no record for today yet, which is the same as "nothing to restore".
let previousWeight: number | undefined;
try {
  const existing = await client.wellness.getWellnessByDate(today);
  if (typeof existing.weight === 'number') previousWeight = existing.weight;
} catch (err) {
  if (!(err instanceof IntervalsAPIError) || err.status !== 404) throw err;
}

if (previousWeight === undefined) {
  // Writing here would leave the demo weight on the record permanently, so do not write.
  console.log(`No weight on ${today}'s record to restore; writing nothing and exiting`);
} else {
  try {
    await client.wellness.updateWellness(today, { weight: 72.5 });

    const record = await client.wellness.getWellnessByDate(today);
    console.log(`${record.date ?? today}: weight=${record.weight ?? 'n/a'}`);
  } finally {
    await client.wellness.updateWellness(today, { weight: previousWeight });
    console.log(`Restored weight=${previousWeight}`);
  }
}
// #endregion main
