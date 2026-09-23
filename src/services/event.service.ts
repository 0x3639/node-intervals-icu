import type { IHttpClient } from '../core/http-client.interface.js';
import type {
  Event, EventInput, ListEventsOptions, DeleteEventsRangeOptions, DeleteEventOptions,
  DoomedEvent, DeleteEventsResponse, DuplicateEventsDTO, ApplyPlanDTO, WorkoutFormat, WorkoutsZipOptions,
} from '../types/index.js';

/**
 * Service for calendar event operations (workouts, notes, races, etc.)
 */
export class EventService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string
  ) {}

  /** List events for a date range */
  async listEvents(options?: ListEventsOptions, athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    const params: Record<string, unknown> = { ...options };
    if (options?.category) params['category'] = options.category.join(',');
    return this.httpClient.request<Event[]>({ method: 'GET', url: `/athlete/${id}/events`, params });
  }

  /** Get a specific event by ID */
  async getEvent(eventId: number, athleteId?: string): Promise<Event> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event>({ method: 'GET', url: `/athlete/${id}/events/${eventId}` });
  }

  /** Create a new event (workout, note, race, etc.) */
  async createEvent(data: EventInput, athleteId?: string): Promise<Event> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event>({ method: 'POST', url: `/athlete/${id}/events`, data });
  }

  /** Create multiple events at once */
  async createEventsBulk(data: EventInput[], athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'POST', url: `/athlete/${id}/events/bulk`, data });
  }

  /** Update an existing event */
  async updateEvent(eventId: number, data: Partial<EventInput>, athleteId?: string): Promise<Event> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event>({ method: 'PUT', url: `/athlete/${id}/events/${eventId}`, data });
  }

  /** Update events in a date range (move, shift, etc.) */
  async updateEventsRange(data: Record<string, unknown>, athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'PUT', url: `/athlete/${id}/events`, data });
  }

  /** Delete an event */
  async deleteEvent(eventId: number, options?: DeleteEventOptions, athleteId?: string): Promise<void> {
    const id = athleteId || this.defaultAthleteId;
    await this.httpClient.request<void>({ method: 'DELETE', url: `/athlete/${id}/events/${eventId}`, params: options as Record<string, unknown> });
  }

  /** Delete events by ID list */
  async deleteEventsBulk(events: DoomedEvent[], athleteId?: string): Promise<DeleteEventsResponse> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<DeleteEventsResponse>({ method: 'PUT', url: `/athlete/${id}/events/bulk-delete`, data: events });
  }

  /** Delete events in a date range by category */
  async deleteEventsRange(options: DeleteEventsRangeOptions, athleteId?: string): Promise<void> {
    const id = athleteId || this.defaultAthleteId;
    const params: Record<string, unknown> = { ...options };
    if (options.category) params['category'] = options.category.join(',');
    await this.httpClient.request<void>({ method: 'DELETE', url: `/athlete/${id}/events`, params });
  }

  /** Mark an event as done */
  async markEventAsDone(eventId: number, athleteId?: string): Promise<Event> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event>({ method: 'POST', url: `/athlete/${id}/events/${eventId}/mark-done` });
  }

  /** Apply a training plan to the calendar */
  async applyPlan(data: ApplyPlanDTO, athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'POST', url: `/athlete/${id}/events/apply-plan`, data });
  }

  /** Duplicate events */
  async duplicateEvents(data: DuplicateEventsDTO, athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'POST', url: `/athlete/${id}/duplicate-events`, data });
  }

  /** Download a planned workout from the calendar in zwo, mrc, erg or fit format */
  async downloadWorkout(eventId: number, format: WorkoutFormat, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/events/${eventId}/download${format}`);
  }

  // ── Phase 3 ──

  /** Every tag that has been applied to events on the athlete's calendar */
  async listEventTags(athleteId?: string): Promise<string[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<string[]>({ method: 'GET', url: `/athlete/${id}/event-tags` });
  }

  /** Events that influence the fitness (CTL/ATL) calculation, in ascending date order */
  async listFitnessModelEvents(athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'GET', url: `/athlete/${id}/fitness-model-events` });
  }

  /**
   * Calendar workouts in a date range as a zip of files in the requested format.
   * The API's `ext` query value has no leading dot (spec: "zwo, mrc, erg or fit"),
   * unlike the `{ext}` path suffix routes, so the dot in WorkoutFormat is stripped here.
   */
  async downloadWorkoutsZip(options: WorkoutsZipOptions, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    const params = { ...options, ext: options.ext.replace(/^\./, '') } as Record<string, unknown>;
    return this.httpClient.download(`/athlete/${id}/workouts.zip`, { params });
  }
}
