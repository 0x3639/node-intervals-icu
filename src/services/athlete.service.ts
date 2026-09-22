import type { IHttpClient } from '../core/http-client.interface.js';
import type {
  Athlete, AthleteUpdateDTO, AthleteTrainingPlan, AthleteTrainingPlanUpdate,
  AthleteProfile, SummaryWithCats, AthleteConnections, AthleteWithTags,
} from '../types/index.js';

/**
 * Service for athlete-related operations
 */
export class AthleteService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string
  ) {}

  /** Get athlete information (includes sportSettings and custom_items) */
  async getAthlete(athleteId?: string): Promise<Athlete> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Athlete>({ method: 'GET', url: `/athlete/${id}` });
  }

  /** Update athlete information */
  async updateAthlete(data: AthleteUpdateDTO, athleteId?: string): Promise<Athlete> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Athlete>({ method: 'PUT', url: `/athlete/${id}`, data });
  }

  /** Get the athlete's training plan */
  async getTrainingPlan(athleteId?: string): Promise<AthleteTrainingPlan> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<AthleteTrainingPlan>({ method: 'GET', url: `/athlete/${id}/training-plan` });
  }

  /** Change the athlete's training plan */
  async updateTrainingPlan(data: AthleteTrainingPlanUpdate, athleteId?: string): Promise<AthleteTrainingPlan> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<AthleteTrainingPlan>({ method: 'PUT', url: `/athlete/${id}/training-plan`, data });
  }

  /** Change training plans for a list of athletes */
  async updateAthletePlans(data: AthleteTrainingPlanUpdate[]): Promise<Record<string, unknown>> {
    return this.httpClient.request<Record<string, unknown>>({ method: 'PUT', url: `/athlete-plans`, data });
  }

  /** Get athlete profile (public info, shared folders, custom items) */
  async getProfile(athleteId?: string): Promise<AthleteProfile> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<AthleteProfile>({ method: 'GET', url: `/athlete/${id}/profile` });
  }

  /**
   * Summary information (training load, fitness, categories) for the athlete
   * and followed athletes over a date range.
   */
  async getSummary(options?: { start?: string; end?: string; tags?: string[] }, athleteId?: string): Promise<SummaryWithCats[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<SummaryWithCats[]>({ method: 'GET', url: `/athlete/${id}/athlete-summary`, params: options as Record<string, unknown> });
  }

  // ── Phase 3 ──

  /** Athletes the caller follows or coaches, including the caller. */
  async listAthletes(options?: { extIdPrefix?: string }): Promise<AthleteWithTags[]> {
    const params = options?.extIdPrefix !== undefined ? { ext_id_prefix: options.extIdPrefix } : undefined;
    return this.httpClient.request<AthleteWithTags[]>({ method: 'GET', url: '/athletes', params });
  }

  /** Which devices and platform apps the athlete has connected */
  async getConnections(athleteId?: string): Promise<AthleteConnections> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<AthleteConnections>({ method: 'GET', url: `/athlete/${id}/connections` });
  }

  /** UI settings for a device class. The spec types the response as an open object map. */
  async getSettings(deviceClass: 'phone' | 'tablet' | 'desktop' | string, athleteId?: string): Promise<Record<string, unknown>> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Record<string, unknown>>({ method: 'GET', url: `/athlete/${id}/settings/${deviceClass}` });
  }

  /**
   * Disconnect the OAuth app that owns the current access token from the athlete's account.
   * Irreversible from the API; the SDK never calls this in its live tests.
   */
  async disconnectApp(): Promise<void> {
    await this.httpClient.request<void>({ method: 'DELETE', url: '/disconnect-app' });
  }
}
