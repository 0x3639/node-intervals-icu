/**
 * For the newest typed activity in the last year, fetch its watts/heartrate
 * streams, its detected intervals, and its best efforts.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/activities/streams-and-intervals.ts
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

  const streams = await client.activities.getStreams(id, ['watts', 'heartrate']);
  for (const stream of streams) {
    console.log(`${stream.type}: ${stream.data?.length ?? 0} sample(s)`);
  }

  const intervals = await client.activities.getIntervals(id);
  console.log(`${intervals.icu_intervals?.length ?? 0} interval(s)`);

  const efforts = await client.activities.getBestEfforts(id);
  console.log(`${efforts.efforts?.length ?? 0} best effort(s)`);
}
// #endregion main
