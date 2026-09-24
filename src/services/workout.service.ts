import type { IHttpClient } from '../core/http-client.interface.js';
import type { Workout, WorkoutInput, WorkoutConversionInput, WorkoutFormat, DuplicateWorkoutsDTO, PaginationOptions } from '../types/index.js';

/**
 * Service for library workout operations (workout templates in folders/plans)
 */
export class WorkoutService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string
  ) {}

  /** List workouts in the athlete's library */
  async listWorkouts(options?: PaginationOptions, athleteId?: string): Promise<Workout[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout[]>({ method: 'GET', url: `/athlete/${id}/workouts`, params: options as Record<string, unknown> });
  }

  /** Get a specific workout by ID */
  async getWorkout(workoutId: number, athleteId?: string): Promise<Workout> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout>({ method: 'GET', url: `/athlete/${id}/workouts/${workoutId}` });
  }

  /** Create a new workout */
  async createWorkout(data: WorkoutInput, athleteId?: string): Promise<Workout> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout>({ method: 'POST', url: `/athlete/${id}/workouts`, data });
  }

  /** Create multiple workouts at once */
  async createWorkoutsBulk(data: WorkoutInput[], athleteId?: string): Promise<Workout[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout[]>({ method: 'POST', url: `/athlete/${id}/workouts/bulk`, data });
  }

  /** Update an existing workout */
  async updateWorkout(workoutId: number, data: Partial<WorkoutInput>, athleteId?: string): Promise<Workout> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout>({ method: 'PUT', url: `/athlete/${id}/workouts/${workoutId}`, data });
  }

  /** Delete a workout */
  async deleteWorkout(workoutId: number, athleteId?: string): Promise<void> {
    const id = athleteId || this.defaultAthleteId;
    await this.httpClient.request<void>({ method: 'DELETE', url: `/athlete/${id}/workouts/${workoutId}` });
  }

  /** Duplicate workouts */
  async duplicateWorkouts(data: DuplicateWorkoutsDTO, athleteId?: string): Promise<Workout[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Workout[]>({ method: 'POST', url: `/athlete/${id}/duplicate-workouts`, data });
  }

  /**
   * Convert a workout definition to .zwo (Zwift), .mrc, .erg or .fit.
   * The workout is sent in the body; it does not need to exist in the library.
   * Uses the global endpoint, which the spec says still resolves power targets from the
   * authenticated athlete's settings ("The athlete to use is extracted from the bearer
   * token and used to resolve power targets"). Use `convertWorkoutForAthlete` to resolve
   * against a specific athlete id instead. Not live-verified: the live suite checks that
   * both routes convert, not whose settings apply.
   *
   * `WorkoutConversionInput` requires `name`, `description`, `type` and `workout_doc`:
   * live probes (`AUDIT.md`) showed a body with all four converts and a body without
   * `workout_doc` returns HTTP 500; the fields were not probed individually, so all four
   * are required as a conservative contract. A convenient source of `workout_doc` is an
   * existing calendar workout event's `workout_doc` field.
   */
  async convertWorkout(workout: WorkoutConversionInput, format: WorkoutFormat): Promise<Buffer> {
    return this.httpClient.download(`/download-workout${format}`, { method: 'POST', data: workout });
  }

  /** The same conversion as convertWorkout, but for a specific athlete id (e.g. a coached athlete) rather than the authenticated one. */
  async convertWorkoutForAthlete(workout: WorkoutConversionInput, format: WorkoutFormat, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/download-workout${format}`, { method: 'POST', data: workout });
  }

  /** Every tag that has been applied to workouts in the athlete's library */
  async listWorkoutTags(athleteId?: string): Promise<string[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<string[]>({ method: 'GET', url: `/athlete/${id}/workout-tags` });
  }
}
