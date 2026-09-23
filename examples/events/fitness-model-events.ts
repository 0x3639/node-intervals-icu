/**
 * List the calendar events that influence the fitness (CTL/ATL) model, then
 * download the next month of planned workouts as a zip of .zwo files.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/events/fitness-model-events.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const events = await client.events.listFitnessModelEvents();
console.log(`${events.length} fitness-model event(s)`);
for (const event of events.slice(0, 3)) {
  console.log(`${event.start_date_local ?? ''}  ${event.name ?? ''}`);
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const monthAhead = new Date(now);
monthAhead.setDate(monthAhead.getDate() + 30);
const oldest = localDate(now);
const newest = localDate(monthAhead);

const upcomingWorkouts = await client.events.listEvents({ oldest, newest, category: ['WORKOUT'] });
if (upcomingWorkouts.length === 0) {
  console.log('No workout events to zip up in the next 30 days');
} else {
  const zip = await client.events.downloadWorkoutsZip({ ext: '.zwo', oldest, newest });
  console.log(`Workouts zip: ${zip.length} bytes`);
}
// #endregion main
