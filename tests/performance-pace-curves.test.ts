import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('PerformanceService — activity pace curves', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return config.responseType === 'arraybuffer' ? Buffer.from('secs,pace') : {};
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getActivityPaceCurves passes the date range, type, distances and gap', async () => {
    const opts = { oldest: '2026-01-01', newest: '2026-03-01', type: 'Run' as const, distances: [1000, 5000], gap: true };
    await client.performance.getActivityPaceCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activity-pace-curves');
    expect(seen[0].params).toEqual(opts);
  });

  it('getActivityPaceCurvesCSV downloads .csv with the same params and requires distances', async () => {
    const opts = { oldest: '2026-01-01', newest: '2026-03-01', distances: [1000] };
    const csv = await client.performance.getActivityPaceCurvesCSV(opts, 'other');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/other/activity-pace-curves.csv');
    expect(seen[0].params).toEqual(opts);
    expect(seen[0].responseType).toBe('arraybuffer');
    expect(csv.toString()).toBe('secs,pace');
  });
});
