/**
 * List the last 30 days of wellness records, print the last 7, and fetch
 * today's record, treating a 404 as "no record yet".
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/wellness/last-30-days.ts
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
const now = new Date(); // one timestamp for both bounds
const monthAgo = new Date(now);
monthAgo.setDate(monthAgo.getDate() - 30);
const newest = localDate(now);
const oldest = localDate(monthAgo);

const records = await client.wellness.listWellness({ oldest, newest });
if (records.length === 0) {
  console.log('No wellness records in the last 30 days');
} else {
  for (const record of records.slice(-7)) {
    console.log(`${record.date ?? ''}  weight=${record.weight ?? 'n/a'}  restingHR=${record.restingHR ?? 'n/a'}  hrv=${record.hrv ?? 'n/a'}`);
  }
}

const today = localDate(now);
try {
  const todayRecord = await client.wellness.getWellnessByDate(today);
  console.log(`Today: weight=${todayRecord.weight ?? 'n/a'}`);
} catch (err) {
  if (err instanceof IntervalsAPIError && err.status === 404) {
    console.log('No record for today');
  } else {
    throw err;
  }
}
// #endregion main
