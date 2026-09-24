/**
 * For the newest typed activity in the last year, fetch its power histogram,
 * heart-rate histogram and time-at-heart-rate plot. The API returns HTTP 422
 * when a requested stream is not available for the activity (e.g. no power
 * meter); that is treated as "not available" rather than a failure.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/analytics/histograms.ts
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
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
const newest = localDate(now);
const oldest = localDate(yearAgo);

const activities = await client.activities.listActivities({ oldest, newest });
const activity = activities.find((a) => a.type);

if (!activity) {
  console.log('No activities with a type in the last year');
} else {
  const id = activity.id!;

  try {
    const powerBuckets = await client.analytics.getPowerHistogram(id, { bucketSize: 50 });
    console.log(`Power histogram: ${powerBuckets.length} bucket(s)`);
  } catch (err) {
    if (err instanceof IntervalsAPIError && err.status === 422) {
      console.log(`Power histogram not available for ${id}: status=${err.status}`);
    } else {
      throw err;
    }
  }

  try {
    const hrBuckets = await client.analytics.getHRHistogram(id);
    console.log(`HR histogram: ${hrBuckets.length} bucket(s)`);
  } catch (err) {
    if (err instanceof IntervalsAPIError && err.status === 422) {
      console.log(`HR histogram not available for ${id}: status=${err.status}`);
    } else {
      throw err;
    }
  }

  try {
    const timeAtHR = await client.analytics.getTimeAtHR(id);
    console.log(`Time at HR: ${timeAtHR.secs?.length ?? 0} bpm bucket(s)`);
  } catch (err) {
    if (err instanceof IntervalsAPIError && err.status === 422) {
      console.log(`Time at HR not available for ${id}: status=${err.status}`);
    } else {
      throw err;
    }
  }
}
// #endregion main
