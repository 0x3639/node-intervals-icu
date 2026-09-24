/**
 * List the athlete's workout library and every tag applied to library workouts,
 * then convert the first convertible workout to Zwift's .zwo format. Falls back
 * to a calendar WORKOUT event if the library has none with the fields
 * convertWorkout() requires. Does not change the account: every call is a read.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/workouts/library-and-convert.ts
 */
import { IntervalsClient } from '../../src/index.js';
import type { Event, Workout, WorkoutConversionInput } from '../../src/types/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds

const workouts = await client.workouts.listWorkouts();
console.log(`${workouts.length} workouts in the library`);
for (const workout of workouts.slice(0, 5)) {
  console.log(`- ${workout.name ?? workout.id}`);
}

const tags = await client.workouts.listWorkoutTags();
console.log(tags.length > 0 ? `Workout tags: ${tags.join(', ')}` : 'No workout tags');

// convertWorkout() requires name, description, type and workout_doc; check the runtime
// shape of each rather than trusting the Workout/Event type, since API data is external.
type ConvertibleWorkout = Workout & WorkoutConversionInput;
const isConvertibleWorkout = (w: Workout): w is ConvertibleWorkout =>
  typeof w.name === 'string' &&
  typeof w.description === 'string' &&
  typeof w.type === 'string' &&
  typeof w.workout_doc === 'object' && w.workout_doc !== null && !Array.isArray(w.workout_doc);

type ConvertibleEvent = Event & WorkoutConversionInput;
const isConvertibleEvent = (e: Event): e is ConvertibleEvent =>
  typeof e.name === 'string' &&
  typeof e.description === 'string' &&
  typeof e.type === 'string' &&
  typeof e.workout_doc === 'object' && e.workout_doc !== null && !Array.isArray(e.workout_doc);

let source: WorkoutConversionInput | undefined = workouts.find(isConvertibleWorkout);

if (!source) {
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const events = await client.events.listEvents({ oldest: localDate(yearAgo), newest: localDate(now), category: ['WORKOUT'] });
  source = events.find(isConvertibleEvent);
}

if (!source) {
  console.log('No convertible workout found in the library or on the calendar');
} else {
  const zwo = await client.workouts.convertWorkout(
    { name: source.name, description: source.description, type: source.type, workout_doc: source.workout_doc },
    '.zwo',
  );
  console.log(zwo.toString('utf8').slice(0, 80));
}
// #endregion main
