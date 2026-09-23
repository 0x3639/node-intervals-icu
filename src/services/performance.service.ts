import type { IHttpClient } from '../core/http-client.interface.js';
import type {
  PowerCurveSet, PaceCurveSet, HRCurveSet, PowerHRCurve,
  ActivityPowerCurvePayload, ActivityHRCurvePayload,
  ActivityPaceCurvesOptions, ActivityPaceCurves,
  ActivityType,
} from '../types/index.js';

interface CurveOptions {
  /** Oldest date (ISO-8601) */
  oldest?: string;
  /** Newest date (ISO-8601) */
  newest?: string;
  /** Curve IDs to include */
  id?: string[];
  /** Include sub-max curves */
  subMaxEfforts?: boolean;
}

/**
 * Service for athlete-level performance curves (power, pace, HR)
 *
 * Activity-level curves are on ActivityService (getPowerCurve, getPaceCurve, getHRCurve).
 * This service handles aggregate/historical curves at the athlete level.
 */
export class PerformanceService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string
  ) {}

  // ── Power Curves ──

  /** Get athlete-level power curves (best efforts over time) */
  async getPowerCurves(options?: CurveOptions, athleteId?: string): Promise<PowerCurveSet> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PowerCurveSet>({ method: 'GET', url: `/athlete/${id}/power-curves`, params: options as Record<string, unknown> });
  }

  /** Compare power curves across activities */
  async getActivityPowerCurves(
    activityIds: string[],
    options?: { afterKj?: number },
    athleteId?: string
  ): Promise<ActivityPowerCurvePayload> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<ActivityPowerCurvePayload>({
      method: 'GET',
      url: `/athlete/${id}/activity-power-curves`,
      params: { id: activityIds.join(','), ...options } as Record<string, unknown>,
    });
  }

  // ── Pace Curves ──

  /** Get athlete-level pace curves */
  async getPaceCurves(options?: CurveOptions, athleteId?: string): Promise<PaceCurveSet> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PaceCurveSet>({ method: 'GET', url: `/athlete/${id}/pace-curves`, params: options as Record<string, unknown> });
  }

  // ── HR Curves ──

  /** Get athlete-level HR curves */
  async getHRCurves(options?: CurveOptions, athleteId?: string): Promise<HRCurveSet> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<HRCurveSet>({ method: 'GET', url: `/athlete/${id}/hr-curves`, params: options as Record<string, unknown> });
  }

  /** Compare HR curves across activities */
  async getActivityHRCurves(
    activityIds: string[],
    athleteId?: string
  ): Promise<ActivityHRCurvePayload> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<ActivityHRCurvePayload>({
      method: 'GET',
      url: `/athlete/${id}/activity-hr-curves`,
      params: { id: activityIds.join(',') } as Record<string, unknown>,
    });
  }

  // ── Activity pace curves (athlete-level, across activities) ──

  /** Best pace over a set of distances across the activities in a date range. Returns { distances, gap, curves } (no spec schema; shape observed live 2026-09-22). */
  async getActivityPaceCurves(options: ActivityPaceCurvesOptions, athleteId?: string): Promise<ActivityPaceCurves> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<ActivityPaceCurves>({ method: 'GET', url: `/athlete/${id}/activity-pace-curves`, params: { ...options } as Record<string, unknown> });
  }

  /**
   * Same as getActivityPaceCurves, as CSV. Observed live (2026-09-22): this form returns HTTP 500
   * unless `distances` is supplied (the JSON form accepts the omission), so `distances` is required here.
   */
  async getActivityPaceCurvesCSV(options: ActivityPaceCurvesOptions & { distances: number[] }, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/activity-pace-curves.csv`, { params: { ...options } as Record<string, unknown> });
  }

  // ── Power vs HR ──

  /** Get the athlete's power vs heart rate curve for a date range */
  async getPowerHRCurve(
    options: { start: string; end: string; type?: ActivityType },
    athleteId?: string,
  ): Promise<PowerHRCurve> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PowerHRCurve>({ method: 'GET', url: `/athlete/${id}/power-hr-curve`, params: options as Record<string, unknown> });
  }
}
