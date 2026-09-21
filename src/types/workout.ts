/**
 * Workout types from the Intervals.icu API
 */
import type { ActivityType } from './enums.js';

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
  /**
   * Structured workout definition as produced by Intervals.icu (the `workout_doc` field
   * on calendar workout events). Required by convertWorkout(); its schema is not modelled
   * yet.
   */
  workout_doc?: unknown;
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
  /** Structured workout definition, e.g. a calendar workout event's `workout_doc`. */
  workout_doc: unknown;
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
