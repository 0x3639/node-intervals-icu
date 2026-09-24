import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('PerformanceService — athlete-level curves', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return {};
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getPowerCurves passes curves, type and subMaxEfforts as query params', async () => {
    const opts = { curves: ['1y'], type: 'Ride' as const, subMaxEfforts: 1 };
    await client.performance.getPowerCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/power-curves');
    expect(seen[0].params).toEqual(opts);
  });

  it('getPowerCurves accepts the full option set (newest, now, includeRanks, pmType, filters)', async () => {
    const opts = {
      type: 'Run' as const,
      curves: ['s0', 'all-kj1'],
      newest: '2026-09-24',
      now: '2026-09-24',
      includeRanks: true,
      pmType: 'MS_2P',
      filters: [{ field: 'type', op: 'in', value: 'Run' }],
    };
    await client.performance.getPowerCurves(opts, 'other');
    expect(seen[0].url).toBe('/athlete/other/power-curves');
    expect(seen[0].params).toEqual(opts);
  });

  it('getPaceCurves passes curves and gap', async () => {
    const opts = { curves: ['1y'], gap: true };
    await client.performance.getPaceCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/pace-curves');
    expect(seen[0].params).toEqual(opts);
  });

  it('getHRCurves passes curves, type and subMaxEfforts', async () => {
    const opts = { curves: ['42d'], type: 'Ride' as const, subMaxEfforts: 2 };
    await client.performance.getHRCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/hr-curves');
    expect(seen[0].params).toEqual(opts);
  });

  it('the curve routes send no query params when no options are given', async () => {
    await client.performance.getPaceCurves();
    await client.performance.getHRCurves();
    expect(seen[0].params).toEqual({});
    expect(seen[1].params).toEqual({});
  });
});
