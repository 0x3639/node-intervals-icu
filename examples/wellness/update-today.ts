/**
 * Update today's wellness record with a weight, then read it back. This
 * writes to the account: it overwrites today's wellness entry.
 *
 * CI never runs this example. Running it by hand changes the authenticated
 * account.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/wellness/update-today.ts
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
const now = new Date();
const today = localDate(now);

await client.wellness.updateWellness(today, { weight: 72.5 });

const record = await client.wellness.getWellnessByDate(today);
console.log(`${record.date ?? today}: weight=${record.weight ?? 'n/a'}`);
// #endregion main
