/**
 * Fetch the athlete's ride power model, then for the newest typed activity
 * in the last year: its power spike model, its watts curve (normal fatigue
 * only), and interval stats for its first detected interval, if any. The API
 * returns HTTP 422 when a requested stream or fatigue variant is not
 * available for the activity; that is treated as "not available" rather
 * than a failure.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/analytics/models-and-curves.ts
 */
import { IntervalsClient, IntervalsAPIError } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const mmpModel = await client.analytics.getMMPModel('Ride');
console.log(`MMP model: type=${mmpModel.type ?? 'n/a'} criticalPower=${mmpModel.criticalPower ?? 'n/a'} wPrime=${mmpModel.wPrime ?? 'n/a'} pMax=${mmpModel.pMax ?? 'n/a'}`);

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
    const spikeModel = await client.analytics.getPowerSpikeModel(id);
    console.log(`Power spike model: type=${spikeModel.type ?? 'n/a'} criticalPower=${spikeModel.criticalPower ?? 'n/a'}`);
  } catch (err) {
    if (err instanceof IntervalsAPIError && err.status === 422) {
      console.log(`Power spike model not available for ${id}: status=${err.status}`);
    } else {
      throw err;
    }
  }

  try {
    const curves = await client.analytics.getCurves(id, { types: ['watts'], fatigue: ['normal'] });
    console.log(`Curves: ${curves.length}`);
  } catch (err) {
    if (err instanceof IntervalsAPIError && err.status === 422) {
      console.log(`Curves not available for ${id}: status=${err.status}`);
    } else {
      throw err;
    }
  }

  const intervals = await client.activities.getIntervals(id);
  const firstInterval = intervals.icu_intervals?.[0];
  if (!firstInterval || firstInterval.start_index === undefined || firstInterval.end_index === undefined) {
    console.log('No detected intervals with an index range');
  } else {
    try {
      const stats = await client.analytics.getIntervalStats(id, firstInterval.start_index, firstInterval.end_index);
      console.log(`Interval stats: average_watts=${stats.average_watts ?? 'n/a'} average_heartrate=${stats.average_heartrate ?? 'n/a'}`);
    } catch (err) {
      if (err instanceof IntervalsAPIError && err.status === 422) {
        console.log(`Interval stats not available for ${id}: status=${err.status}`);
      } else {
        throw err;
      }
    }
  }
}
// #endregion main
