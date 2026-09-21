/**
 * Event / Calendar types from the Intervals.icu API
 */
import type { ActivityType, EventCategory } from './enums.js';
import type { WorkoutDoc } from './workout.js';

/**
 * Calendar event (planned workout, note, race, etc.)
 */
export interface Event {
  id?: number;
  athlete_id?: string;
  start_date_local?: string;
  category?: EventCategory;
  type?: ActivityType | string;
  name?: string;
  description?: string;
  color?: string;
  show_as_note?: boolean;
  not_on_fitness_chart?: boolean;
  indoor?: boolean;
  hide_from_athlete?: boolean;
  athlete_cannot_edit?: boolean;
  plan_applied?: string;
  created_by_id?: string;
  uid?: string;
  external_id?: string;
  /** Structured workout document; a usable source for workouts.convertWorkout() */
  workout_doc?: WorkoutDoc;
  /** Raw file contents (zwo, mrc, erg, fit) */
  file_contents?: string;
  /** Base64-encoded file contents */
  file_contents_base64?: string;
  /** Planned training load */
  icu_training_load?: number;
  /** Planned duration in seconds */
  moving_time?: number;
  /** Planned distance in meters */
  distance?: number;
  /** Workout joules */
  joules?: number;
  /** Load target */
  load_target?: number;
  created?: string;
  updated?: string;
  [key: string]: unknown;
}

/** Extended event data for create/update (accepts file contents) */
export type EventEx = Event;

/** Input for creating/updating an event */
export type EventInput = Omit<Event, 'id' | 'athlete_id' | 'created' | 'updated'>;

/** Event reference for bulk delete */
export interface DoomedEvent {
  id?: number;
  external_id?: string;
}

/** Response from bulk delete */
export interface DeleteEventsResponse {
  deleted?: number;
  [key: string]: unknown;
}

/** DTO for duplicating events */
export interface DuplicateEventsDTO {
  numCopies?: number;
  weeksBetween?: number;
  eventIds?: number[];
}

/** DTO for applying a plan */
export interface ApplyPlanDTO {
  start_date_local?: string;
  folder_id?: number;
  extra_workouts?: any[];
}
