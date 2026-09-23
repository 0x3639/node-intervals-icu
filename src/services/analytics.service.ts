import type { IHttpClient } from '../core/http-client.interface.js';
import type {
  Bucket, TimeAtHRPlot, Interval, PowerModel, PowerCurve, PaceCurveSet,
  ActivityPowerCurvesOptions, ActivityPaceCurvesOptions, ActivityType,
} from '../types/index.js';

/**
 * Activity- and athlete-level analytics: histograms, time-at-HR, interval statistics,
 * power models and multi-activity curves. Activity-level methods take an activity id;
 * athlete-level methods take the usual optional trailing athleteId.
 *
 * The older single-curve activity methods (activities.getPowerCurve and friends) hit
 * different routes and remain on ActivityService.
 *
 * Caller-supplied activity ids are URL-encoded before interpolation so a delimiter in an id cannot change the route.
 */
export class AnalyticsService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string,
  ) {}

  // ── Activity histograms ──

  /** Time in power buckets */
  async getPowerHistogram(activityId: string, options?: { bucketSize?: number }): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/power-histogram`, params: options as Record<string, unknown> });
  }

  /** Time in heart-rate buckets */
  async getHRHistogram(activityId: string, options?: { bucketSize?: number }): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/hr-histogram`, params: options as Record<string, unknown> });
  }

  /** Time in pace buckets */
  async getPaceHistogram(activityId: string): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/pace-histogram` });
  }

  /** Time in grade-adjusted-pace buckets */
  async getGAPHistogram(activityId: string): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/gap-histogram` });
  }

  // ── Activity models and statistics ──

  /** Seconds spent at each heart rate */
  async getTimeAtHR(activityId: string): Promise<TimeAtHRPlot> {
    return this.httpClient.request<TimeAtHRPlot>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/time-at-hr` });
  }

  /** Statistics for an arbitrary index range of the activity, as if it were an interval */
  async getIntervalStats(activityId: string, startIndex: number, endIndex: number): Promise<Interval> {
    return this.httpClient.request<Interval>({
      method: 'GET',
      url: `/activity/${encodeURIComponent(activityId)}/interval-stats`,
      params: { start_index: startIndex, end_index: endIndex },
    });
  }

  /** Power model fitted to the activity, used to detect power spikes */
  async getPowerSpikeModel(activityId: string): Promise<PowerModel> {
    return this.httpClient.request<PowerModel>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/power-spike-model` });
  }

  /** Multiple curves (power, pace, HR ...) for one activity */
  async getActivityPowerCurves(activityId: string, options?: ActivityPowerCurvesOptions): Promise<PowerCurve[]> {
    return this.httpClient.request<PowerCurve[]>({ method: 'GET', url: `/activity/${encodeURIComponent(activityId)}/power-curves`, params: options as Record<string, unknown> });
  }

  /** Same as getActivityPowerCurves, as CSV */
  async getActivityPowerCurvesCSV(activityId: string, options?: ActivityPowerCurvesOptions): Promise<Buffer> {
    return this.httpClient.download(`/activity/${encodeURIComponent(activityId)}/power-curves.csv`, { params: options as Record<string, unknown> });
  }

  // ── Athlete-level ──

  /** Power model used to resolve %MMP workout steps for a sport type */
  async getMMPModel(type: ActivityType, athleteId?: string): Promise<PowerModel> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PowerModel>({ method: 'GET', url: `/athlete/${id}/mmp-model`, params: { type } });
  }

  /** Best pace over a set of distances across the activities in a date range */
  async getActivityPaceCurves(options: ActivityPaceCurvesOptions, athleteId?: string): Promise<PaceCurveSet> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PaceCurveSet>({ method: 'GET', url: `/athlete/${id}/activity-pace-curves`, params: { ...options } as Record<string, unknown> });
  }

  /** Same as getActivityPaceCurves, as CSV */
  async getActivityPaceCurvesCSV(options: ActivityPaceCurvesOptions, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/activity-pace-curves.csv`, { params: { ...options } as Record<string, unknown> });
  }
}
