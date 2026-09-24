/**
 * Update today's wellness record with a weight, read it back, then put the
 * previous weight back. This writes to the account: it overwrites today's
 * weight and restores it in a finally block. If today had no weight yet, the
 * demo value stays: `WellnessInput.weight` is `number | undefined`, so the
 * SDK cannot clear a field once it is set.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/wellness/update-today.ts
 */
import { IntervalsClient, IntervalsAPIError } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date();
const today = localDate(now);

// Read the current record first so the demo value can be put back. A 404 means
// there is no record for today yet, which is the same as "nothing to restore".
let previousWeight: number | undefined;
try {
  const existing = await client.wellness.getWellnessByDate(today);
  if (typeof existing.weight === 'number') previousWeight = existing.weight;
} catch (err) {
  if (!(err instanceof IntervalsAPIError) || err.status !== 404) throw err;
}

try {
  await client.wellness.updateWellness(today, { weight: 72.5 });

  const record = await client.wellness.getWellnessByDate(today);
  console.log(`${record.date ?? today}: weight=${record.weight ?? 'n/a'}`);
} finally {
  if (previousWeight === undefined) {
    console.log('No previous weight to restore; the demo weight (72.5) stays on the record');
  } else {
    await client.wellness.updateWellness(today, { weight: previousWeight });
    console.log(`Restored weight=${previousWeight}`);
  }
}
// #endregion main
