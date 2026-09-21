/**
 * Compile-time contract for WorkoutConversionInput. Checked by `npm run typecheck:tests`
 * (tsconfig.tests.json); never executed. Each `@ts-expect-error` line fails the build if the
 * type ever starts accepting a payload the live API rejects with HTTP 500 (see AUDIT.md).
 */
import type { Event, WorkoutConversionInput, WorkoutDoc } from '../../src/types/index.js';

const doc: WorkoutDoc = { steps: [{ duration: 1200, power: { value: 85, units: '%ftp' } }] };

// Accepted: all four required fields, with or without extra Workout fields.
export const ok: WorkoutConversionInput = { name: 'Tempo', description: '- 20m 85%', type: 'Ride', workout_doc: doc };
export const okWithExtras: WorkoutConversionInput = { ...ok, indoor: true, moving_time: 3600 };

// @ts-expect-error workout_doc is required
export const missingDoc: WorkoutConversionInput = { name: 'T', description: 'd', type: 'Ride' };
// @ts-expect-error workout_doc may not be undefined (JSON would drop the field and the API 500s)
export const undefinedDoc: WorkoutConversionInput = { name: 'T', description: 'd', type: 'Ride', workout_doc: undefined };
// @ts-expect-error workout_doc may not be null
export const nullDoc: WorkoutConversionInput = { name: 'T', description: 'd', type: 'Ride', workout_doc: null };
// @ts-expect-error workout_doc must be an object, not a string
export const stringDoc: WorkoutConversionInput = { name: 'T', description: 'd', type: 'Ride', workout_doc: '{}' };
// @ts-expect-error name is required
export const missingName: WorkoutConversionInput = { description: 'd', type: 'Ride', workout_doc: doc };
// @ts-expect-error description is required
export const missingDescription: WorkoutConversionInput = { name: 'T', type: 'Ride', workout_doc: doc };
// @ts-expect-error type is required
export const missingType: WorkoutConversionInput = { name: 'T', description: 'd', workout_doc: doc };

// An Event's fields are all optional, so an Event is not a WorkoutConversionInput until narrowed.
declare const event: Event;
// @ts-expect-error optional Event fields do not satisfy the required payload
export const unnarrowed: WorkoutConversionInput = { name: event.name, description: event.description, type: event.type, workout_doc: event.workout_doc };
const isConvertible = (e: Event): e is Event & WorkoutConversionInput =>
  typeof e.name === 'string' &&
  typeof e.description === 'string' &&
  typeof e.type === 'string' &&
  typeof e.workout_doc === 'object' && e.workout_doc !== null && !Array.isArray(e.workout_doc);
export const narrowed: WorkoutConversionInput | undefined = isConvertible(event) ? event : undefined;
