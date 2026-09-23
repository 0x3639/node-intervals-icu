/**
 * Convert a calendar workout to Zwift's .zwo format, then download every calendar
 * workout in a date range as a .zwo zip. Does not change the account: both calls
 * are reads.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/guides/convert-workout.ts
 */
import { IntervalsClient } from '../../src/index.js';
import type { Event, WorkoutConversionInput } from '../../src/types/index.js';

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

// convertWorkout() requires name, description, type and workout_doc; check the runtime
// shape of each rather than trusting the Event type, since API data is external.
type ConvertibleEvent = Event & WorkoutConversionInput;
const isConvertible = (e: Event): e is ConvertibleEvent =>
  typeof e.name === 'string' &&
  typeof e.description === 'string' &&
  typeof e.type === 'string' &&
  typeof e.workout_doc === 'object' && e.workout_doc !== null && !Array.isArray(e.workout_doc);

const events = await client.events.listEvents({ oldest, newest, category: ['WORKOUT'] });
const event = events.find(isConvertible);

if (!event) {
  console.log('No calendar workouts found');
} else {
  const zwo = await client.workouts.convertWorkout(
    { name: event.name, description: event.description, type: event.type, workout_doc: event.workout_doc },
    '.zwo',
  );
  console.log(zwo.toString('utf8').slice(0, 80));
}

const zip = await client.events.downloadWorkoutsZip({ ext: '.zwo', oldest, newest });
console.log(`Workouts zip: ${zip.length} bytes`);
// #endregion main
