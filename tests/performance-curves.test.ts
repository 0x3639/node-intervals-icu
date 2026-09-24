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

  it('getPowerCurves accepts the full option set (newest, now, includeRanks, pmType)', async () => {
    const opts = {
      type: 'Run' as const,
      curves: ['s0', 'all-kj1'],
      newest: '2026-09-24',
      now: '2026-09-24',
      includeRanks: true,
      pmType: 'MS_2P' as const,
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

describe('PerformanceService — athlete-level curves, serialized query strings', () => {
  // The request-shape cases above look at `params` before axios serializes them. These
  // cases run the real axios serializer (the one the client configures) over the captured
  // config, so a change to the wire encoding of arrays is caught here.
  let client: IntervalsClient;
  let seen: any[] = [];
  let realAxios: typeof import('axios').default;
  beforeEach(async () => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return {};
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    realAxios = ((await vi.importActual('axios')) as typeof import('axios')).default;
  });
  // Serialize with the paramsSerializer the client passed to axios.create(), not a copy of
  // it: if the SDK ever drops that setting, axios falls back to bracketed array keys and
  // these expectations fail.
  const uri = () => {
    const created = mockedAxios.create.mock.calls[0][0];
    return realAxios.getUri({ url: seen[0].url, params: seen[0].params, paramsSerializer: created.paramsSerializer });
  };

  it('power curves: curves repeat as plain keys, scalars pass through', async () => {
    await client.performance.getPowerCurves({ type: 'Ride', curves: ['1y', '42d-kj1'], subMaxEfforts: 1, pmType: 'MORTON_3P' });
    expect(uri()).toBe('/athlete/i1/power-curves?type=Ride&curves=1y&curves=42d-kj1&subMaxEfforts=1&pmType=MORTON_3P');
  });

  it('pace curves: gap and CS model serialize as scalars', async () => {
    await client.performance.getPaceCurves({ curves: ['s0'], gap: true, pmType: 'CS' });
    expect(uri()).toBe('/athlete/i1/pace-curves?curves=s0&gap=true&pmType=CS');
  });

  it('hr curves: newest and curves', async () => {
    await client.performance.getHRCurves({ newest: '2026-09-24', curves: ['all'] });
    expect(uri()).toBe('/athlete/i1/hr-curves?newest=2026-09-24&curves=all');
  });
});
