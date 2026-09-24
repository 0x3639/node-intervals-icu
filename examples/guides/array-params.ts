/**
 * Pass array-valued query parameters: tags on a summary, a list of activity ids,
 * and the types/fatigue options on a power-curve request.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/array-params.ts
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
const now = new Date(); // one timestamp for both bounds
const weekAgo = new Date(now);
weekAgo.setDate(weekAgo.getDate() - 6);
const newest = localDate(now);
const oldest = localDate(weekAgo);

// `tags` is sent as repeated `tags=` query keys, not a single comma-joined value.
const summary = await client.athletes.getSummary({ start: oldest, end: newest, tags: ['race', 'long'] });
console.log(`${summary.length} summary row(s) for tags=race,long`);

const activities = await client.activities.listActivities({ oldest, newest });
if (activities.length < 2) {
  console.log('Fewer than two activities in the last 7 days; skipping getActivities/getCurves');
} else {
  const ids = [activities[0]!.id!, activities[1]!.id!];
  // `ids` is comma-joined by the SDK into the URL path here, not sent as a query parameter.
  const fetched = await client.activities.getActivities(ids);
  console.log(`getActivities(${JSON.stringify(ids)}) returned ${fetched.length} activities`);

  const id = ids[0]!;
  const curves = await client.analytics.getCurves(id, { types: ['watts'], fatigue: ['normal'] });
  console.log(`${curves.length} watts curve(s) for activity ${id}`);
}
// #endregion main
