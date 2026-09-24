/**
 * getPowerCurves requires `type`: the power-curves route declares it required and the API
 * returns HTTP 422 without it. Pace and HR curves accept it but work without it.
 */
import type { PerformanceService } from '../../src/index.js';

type PowerOptions = Parameters<PerformanceService['getPowerCurves']>[0];
type PaceOptions = NonNullable<Parameters<PerformanceService['getPaceCurves']>[0]>;
type HROptions = NonNullable<Parameters<PerformanceService['getHRCurves']>[0]>;

export const okPower: PowerOptions = { curves: ['1y'], type: 'Ride' };

// @ts-expect-error type is required for power curves
export const missingType: PowerOptions = { curves: ['1y'] };

// @ts-expect-error the route has no oldest parameter; the window comes from `curves`
export const noOldest: PowerOptions = { type: 'Ride', oldest: '2026-01-01' };

// @ts-expect-error subMaxEfforts is a count (integer), not a flag
export const subMaxIsANumber: PowerOptions = { type: 'Ride', subMaxEfforts: true };

export const okPace: PaceOptions = { curves: ['1y'], gap: true };

// @ts-expect-error gap belongs to pace curves only
export const noGapOnPower: PowerOptions = { type: 'Ride', gap: true };

export const okHR: HROptions = { curves: ['42d'], type: 'Ride', subMaxEfforts: 2 };

// @ts-expect-error hr-curves takes neither includeRanks nor pmType
export const noRanksOnHR: HROptions = { curves: ['42d'], includeRanks: true };

// pmType is the model family the route supports, not any string
export const okPowerModel: PowerOptions = { type: 'Ride', pmType: 'MORTON_3P' };
export const okPaceModel: PaceOptions = { pmType: 'CS' };

// @ts-expect-error CS is a pace model; power curves take MS_2P | MORTON_3P | FFT_CURVES | ECP
export const paceModelOnPower: PowerOptions = { type: 'Ride', pmType: 'CS' };

// @ts-expect-error MS_2P is a power model; pace curves take CS
export const powerModelOnPace: PaceOptions = { pmType: 'MS_2P' };

// @ts-expect-error filters has no verified wire encoding for the curve routes yet
export const noFilters: PowerOptions = { type: 'Ride', filters: [{ field: 'type', op: 'in', value: 'Run' }] };
