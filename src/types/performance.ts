/**
 * Performance curve types from the Intervals.icu API
 */
import type { ActivityType, DataCurveType, PaceModelType, PowerModelType } from './enums.js';
import type { Activity } from './activity.js';
import type { ActivityFilter } from './athlete.js';

/** Power model fitted to a power curve (spec schema PowerModel; field names confirmed live 2026-09-22) */
export interface PowerModel {
  type?: PowerModelType;
  criticalPower?: number;
  wPrime?: number;
  pMax?: number;
  inputPointIndexes?: number[];
  ftp?: number;
}

/** Pace model fitted to a pace curve */
export interface PaceModel {
  type?: PaceModelType;
  criticalSpeed?: number;
  dPrime?: number;
  r2?: number;
  inputPointIndexes?: number[];
}

/** Rank data for a power curve */
export interface Rank {
  position?: Record<string, number>;
  watts?: Record<string, number>;
}

/** Plot data for HR curve mapping */
export interface HRPlot {
  max_bpm?: number;
  min_bpm?: number;
  secs?: number[];
  cumulative_secs?: number[];
}

/** Data curve point */
export interface DataCurvePt {
  [key: string]: unknown;
}

/** Power curve (athlete-level best efforts over time) */
export interface PowerCurve {
  id?: string;
  after_kj?: number;
  filters?: ActivityFilter[];
  label?: string;
  filter_label?: string;
  percentile?: number;
  start_date_local?: string;
  end_date_local?: string;
  days?: number;
  moving_time?: number;
  training_load?: number;
  weight?: number;
  secs?: number[];
  values?: number[];
  submax_values?: number[][];
  submax_activity_id?: string[][];
  start_index?: number[];
  end_index?: number[];
  activity_id?: string[];
  watts_per_kg?: number[];
  wkg_activity_id?: string[];
  submax_watts_per_kg?: number[][];
  submax_wkg_activity_id?: string[][];
  powerModels?: PowerModel[];
  ranks?: Record<string, Rank>;
  mapPlot?: HRPlot;
  stream_type?: string;
  stream_name?: string;
  watts?: number[];
  vo2max_5m?: number;
  compound_score_5m?: number;
}

/** Query for the athlete-level curve routes (power-curves, pace-curves, hr-curves) */
export interface CurveOptions {
  /** Oldest date (ISO-8601) */
  oldest?: string;
  /** Newest date (ISO-8601) */
  newest?: string;
  /** Curve IDs to include */
  id?: string[];
  /** Include sub-max curves */
  subMaxEfforts?: boolean;
}

/** Power curve set response */
export interface PowerCurveSet {
  list?: PowerCurve[];
  activities?: Record<string, Activity>;
}

/** Pace curve */
export interface PaceCurve {
  id?: string;
  filters?: ActivityFilter[];
  label?: string;
  filter_label?: string;
  percentile?: number;
  start_date_local?: string;
  end_date_local?: string;
  days?: number;
  moving_time?: number;
  training_load?: number;
  weight?: number;
  distance?: number[];
  values?: number[];
  submax_values?: number[][];
  submax_activity_id?: string[][];
  start_index?: number[];
  end_index?: number[];
  activity_id?: string[];
  type?: DataCurveType;
  paceModels?: PaceModel[];
}

/** Pace curve set response */
export interface PaceCurveSet {
  list?: PaceCurve[];
  activities?: Record<string, Activity>;
}

/** HR curve */
export interface HRCurve {
  id?: string;
  filters?: ActivityFilter[];
  label?: string;
  filter_label?: string;
  percentile?: number;
  start_date_local?: string;
  end_date_local?: string;
  days?: number;
  moving_time?: number;
  training_load?: number;
  weight?: number;
  secs?: number[];
  values?: number[];
  submax_values?: number[][];
  submax_activity_id?: string[][];
  start_index?: number[];
  end_index?: number[];
  activity_id?: string[];
}

/** HR curve set response */
export interface HRCurveSet {
  list?: HRCurve[];
  activities?: Record<string, Activity>;
}

/** Power vs HR curve */
export interface PowerHRCurve {
  athleteId?: string;
  start?: string;
  end?: string;
  minWatts?: number;
  maxWatts?: number;
  bucketSize?: number;
  bpm?: number[];
  cadence?: number[];
  minutes?: number[];
  lthr?: number;
  max_hr?: number;
  ftp?: number;
}

/** Activity power curve (for activity-level comparison) */
export interface ActivityPowerCurve {
  id?: string;
  start_date_local?: string;
  weight?: number;
  watts?: number[];
}

/** Activity power curves payload */
export interface ActivityPowerCurvePayload {
  after_kj?: number;
  secs?: number[];
  curves?: ActivityPowerCurve[];
}

/** Activity HR curve */
export interface ActivityHRCurve {
  id?: string;
  start_date_local?: string;
  weight?: number;
  bpm?: number[];
}

/** Activity HR curves payload */
export interface ActivityHRCurvePayload {
  secs?: number[];
  curves?: ActivityHRCurve[];
}

/** Pace distances DTO */
export interface PaceDistancesDTO {
  distances?: number[];
  defaults?: number[];
}

/** Query for GET /activity/{id}/power-curves{ext} */
export interface ActivityPowerCurvesOptions {
  /** Streams required, e.g. ['watts', 'pace'] (default watts) */
  types?: string[];
  /** Which curves to return: any of 'normal', 'kj0', 'kj1' (normal and/or fatigued) */
  fatigue?: string[];
}

/**
 * Query for GET /athlete/{id}/activity-pace-curves{ext}. The spec's `filters` param (an
 * array of ActivityFilter objects) is omitted until its query-string encoding is verified live.
 */
export interface ActivityPaceCurvesOptions {
  /** Oldest local date, ISO-8601 */
  oldest: string;
  /** Newest local date, ISO-8601 */
  newest: string;
  /** Sport type; the spec enumerates the full activity-type list, so this reuses the shared union */
  type?: ActivityType;
  /** Distances in metres */
  distances?: number[];
  /** Use grade-adjusted pace */
  gap?: boolean;
}

/**
 * Response of GET /athlete/{id}/activity-pace-curves. The spec declares no schema; this is the
 * shape observed live (2026-09-22): the requested distances, the gap flag, and one entry per
 * curve. `curves` was empty for every sport on the test account, so its element shape is not
 * yet modelled.
 */
export interface ActivityPaceCurves {
  /** Distances in metres, echoed from the request */
  distances?: number[];
  /** Whether gradient-adjusted pace was used */
  gap?: boolean;
  /** One entry per pace curve; element shape not yet observed */
  curves?: unknown[];
}
