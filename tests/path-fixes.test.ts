import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('path fixes (AUDIT.md)', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getSimilarity hits /routes/{id}/similarity/{otherId}', async () => {
    await client.routes.getSimilarity(10, 20);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/routes/10/similarity/20');
  });

  it('getPowerHRCurve hits /power-hr-curve with start and end', async () => {
    await client.performance.getPowerHRCurve({ start: '2026-01-01', end: '2026-02-01', type: 'Ride' });
    expect(seen[0].url).toBe('/athlete/i1/power-hr-curve');
    expect(seen[0].params).toEqual({ start: '2026-01-01', end: '2026-02-01', type: 'Ride' });
  });

  it('listChats is athlete-scoped', async () => {
    await client.chats.listChats();
    expect(seen[0].url).toBe('/athlete/i1/chats');
  });

  it('activities.getWeather no longer exists', () => {
    expect((client.activities as any).getWeather).toBeUndefined();
  });

  it('removed routes are gone: searchAthletes, deleteWellness', () => {
    expect((client.search as any).searchAthletes).toBeUndefined();
    expect((client.wellness as any).deleteWellness).toBeUndefined();
  });

  it('renamed/removed routes are gone: getPowerVsHR, getWeather, getSimilarities, downloadWorkoutForAthlete', () => {
    expect((client.performance as any).getPowerVsHR).toBeUndefined();
    expect((client.weather as any).getWeather).toBeUndefined();
    expect((client.routes as any).getSimilarities).toBeUndefined();
    expect((client.workouts as any).downloadWorkoutForAthlete).toBeUndefined();
  });
});
