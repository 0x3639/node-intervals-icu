/** getActivityPaceCurvesCSV requires distances: the CSV route returns HTTP 500 without them (observed live 2026-09-22). */
import type { PerformanceService } from '../../src/index.js';

type CsvOptions = Parameters<PerformanceService['getActivityPaceCurvesCSV']>[0];

export const ok: CsvOptions = { oldest: '2026-01-01', newest: '2026-02-01', distances: [1000] };

// @ts-expect-error distances is required for the CSV form
export const missingDistances: CsvOptions = { oldest: '2026-01-01', newest: '2026-02-01' };

// @ts-expect-error distances must contain at least one value (an empty array is dropped from the query)
export const emptyDistances: CsvOptions = { oldest: '2026-01-01', newest: '2026-02-01', distances: [] };
export const oneDistance: CsvOptions = { oldest: '2026-01-01', newest: '2026-02-01', distances: [1000] };
