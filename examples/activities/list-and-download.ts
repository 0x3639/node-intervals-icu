/**
 * List the last 30 days of activities, fetch the newest one with a type, and
 * download it as a FIT file and as a GPX file with power extensions.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/activities/list-and-download.ts
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
const monthAgo = new Date(now);
monthAgo.setDate(monthAgo.getDate() - 29);
const newest = localDate(now);
const oldest = localDate(monthAgo);

const activities = await client.activities.listActivities({ oldest, newest });
const activity = activities.find((a) => a.type);

if (!activity) {
  console.log('No activities with a type in the last 30 days');
} else {
  const id = activity.id!;

  const full = await client.activities.getActivity(id);
  console.log(`${full.name ?? id}: ${full.type ?? 'unknown type'}`);

  const fit = await client.activities.downloadFitFile(id);
  console.log(`FIT file: ${fit.length} bytes`);

  const gpx = await client.activities.downloadGPX(id, { power: true });
  console.log(`GPX (first 60 chars): ${gpx.toString('utf8').slice(0, 60)}`);
}
// #endregion main
