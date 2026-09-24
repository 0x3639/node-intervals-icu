/**
 * Best pace over a set of distances across the athlete's runs in the last
 * year, as JSON and as CSV. `distances` is required for the CSV form: the
 * API returns HTTP 500 without it (the JSON form accepts the omission).
 *
 * This route does not accept the SDK's default "current athlete" alias
 * (athlete id `0`, which most other athlete-scoped routes accept); it needs
 * a real athlete id, so this example resolves one first.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/performance/activity-pace-curves.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const me = await client.athletes.getAthlete();
if (!me.id) {
  console.error('Could not resolve the authenticated athlete id.');
  process.exit(1);
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
const newest = localDate(now);
const oldest = localDate(yearAgo);

const options = { oldest, newest, type: 'Run' as const, distances: [1000, 5000] as [number, ...number[]] };

const curves = await client.performance.getActivityPaceCurves(options, me.id);
console.log(`distances=${curves.distances?.join(',') ?? 'n/a'} gap=${curves.gap ?? 'n/a'} curves=${curves.curves?.length ?? 0}`);

const csv = await client.performance.getActivityPaceCurvesCSV(options, me.id);
console.log(`CSV: ${csv.length} byte(s)`);
// #endregion main
