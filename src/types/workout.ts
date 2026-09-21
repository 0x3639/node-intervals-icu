/**
 * Workout types from the Intervals.icu API
 */
import type { ActivityType } from './enums.js';

/**
 * Structured workout definition as produced by Intervals.icu (the `workout_doc` field on
 * calendar workout events and library workouts). The vendored spec types it as an object
 * of objects and models nothing further, so it is an open record here; it is never null.
 */
export type WorkoutDoc = Record<string, unknown>;

/**
 * Workout in the library (folder/plan)
 */
export interface Workout {
  id?: number;
  athlete_id?: string;
  folder_id?: number;
  /** Day offset within a plan (0-based) */
  day?: number;
  type?: ActivityType | string;
  name?: string;
  description?: string;
  /** Structured workout definition; required by convertWorkout(). See WorkoutDoc. */
  workout_doc?: WorkoutDoc;
  /** Raw file contents (zwo, mrc, erg, fit) */
  file_contents?: string;
  /** Base64-encoded file contents */
  file_contents_base64?: string;
  indoor?: boolean;
  color?: string;
  moving_time?: number;
  distance?: number;
  icu_training_load?: number;
  joules?: number;
  intensity?: number;
  hide_from_athlete?: boolean;
  plan_applied?: string;
  [key: string]: unknown;
}

/**
 * Body for `workouts.convertWorkout()` / `convertWorkoutForAthlete()`.
 *
 * The live API returns HTTP 500 unless `name`, `description`, `type` and `workout_doc`
 * are all present (verified 2026-09-21, see AUDIT.md), so they are required here.
 * Any other `Workout` field may be included.
 */
export interface WorkoutConversionInput extends Partial<Workout> {
  name: string;
  description: string;
  type: ActivityType | string;
  /** Structured workout definition, e.g. a calendar workout event's `workout_doc`. Never null. */
  workout_doc: WorkoutDoc;
}

/** Extended workout data for create/update (includes file content fields) */
export type WorkoutEx = Workout;

/** Input for creating/updating a workout */
export type WorkoutInput = Omit<Workout, 'id' | 'athlete_id'>;

/** File format for workout conversion/download */
export type WorkoutFormat = '.zwo' | '.mrc' | '.erg' | '.fit';

/** DTO for duplicating workouts */
export interface DuplicateWorkoutsDTO {
  numCopies?: number;
  weeksBetween?: number;
  workoutIds?: number[];
}
