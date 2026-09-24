/**
 * List the athlete's gear, recalculate totals for the first item, then
 * download all gear as CSV. Does not change the account: every call is a
 * GET.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/gear/list-and-calc.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const gear = await client.gear.list();
console.log(`${gear.length} items of gear`);
for (const item of gear) {
  console.log(`- ${item.name ?? item.id} (${item.type ?? 'unknown type'}): ${item.distance ?? 0} m`);
}

const first = gear[0];
if (!first || first.id === undefined) {
  console.log('No gear found');
} else {
  const stats = await client.gear.calc(first.id);
  console.log(`Totals for ${first.name ?? first.id}: distance=${stats.distance ?? 0} activities=${stats.activities ?? 0}`);
}

const csv = await client.gear.downloadCSV();
console.log(`Gear CSV: ${csv.length} bytes`);
// #endregion main
