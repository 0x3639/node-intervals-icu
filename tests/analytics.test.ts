import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('AnalyticsService', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return config.responseType === 'arraybuffer' ? Buffer.from('secs,watts') : [];
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('is exposed as client.analytics and exported from the package', async () => {
    const mod = await import('../src/index.js');
    expect(client.analytics).toBeInstanceOf(mod.AnalyticsService);
  });

  it.each([
    ['getPowerHistogram', '/activity/a1/power-histogram', { bucketSize: 25 }],
    ['getHRHistogram', '/activity/a1/hr-histogram', { bucketSize: 5 }],
  ] as const)('%s hits %s with bucketSize', async (method, url, opts) => {
    await (client.analytics as any)[method]('a1', opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe(url);
    expect(seen[0].params).toEqual(opts);
  });

  it.each([
    ['getPaceHistogram', '/activity/a1/pace-histogram'],
    ['getGAPHistogram', '/activity/a1/gap-histogram'],
    ['getTimeAtHR', '/activity/a1/time-at-hr'],
    ['getPowerSpikeModel', '/activity/a1/power-spike-model'],
  ] as const)('%s hits %s', async (method, url) => {
    await (client.analytics as any)[method]('a1');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe(url);
    expect(seen[0].params).toBeUndefined();
  });

  it('getIntervalStats sends start_index and end_index', async () => {
    await client.analytics.getIntervalStats('a1', 100, 400);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/activity/a1/interval-stats');
    expect(seen[0].params).toEqual({ start_index: 100, end_index: 400 });
  });

  it('getActivityPowerCurves passes types and fatigue; CSV sibling downloads .csv', async () => {
    await client.analytics.getActivityPowerCurves('a1', { types: ['watts', 'pace'], fatigue: ['normal', 'kj0'] });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/activity/a1/power-curves');
    expect(seen[0].params).toEqual({ types: ['watts', 'pace'], fatigue: ['normal', 'kj0'] });
    const csv = await client.analytics.getActivityPowerCurvesCSV('a1', { types: ['power'] });
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/activity/a1/power-curves.csv');
    expect(seen[1].params).toEqual({ types: ['power'] });
    expect(seen[1].responseType).toBe('arraybuffer');
    expect(csv.toString()).toBe('secs,watts');
  });

  it('getMMPModel sends type and is athlete-scoped', async () => {
    await client.analytics.getMMPModel('Ride');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/mmp-model');
    expect(seen[0].params).toEqual({ type: 'Ride' });
    await client.analytics.getMMPModel('Run', 'other');
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/athlete/other/mmp-model');
  });

  it('getActivityPaceCurves passes the date range and distances; CSV sibling downloads .csv', async () => {
    const opts = { oldest: '2026-01-01', newest: '2026-03-01', type: 'Run', distances: [1000, 5000], gap: true };
    await client.analytics.getActivityPaceCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activity-pace-curves');
    expect(seen[0].params).toEqual(opts);
    await client.analytics.getActivityPaceCurvesCSV(opts);
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/athlete/i1/activity-pace-curves.csv');
    expect(seen[1].responseType).toBe('arraybuffer');
  });
});
