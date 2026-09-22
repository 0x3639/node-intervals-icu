import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { mockAthlete, mockAthleteUpdate, mockUpdatedAthlete } from './fixtures/athlete.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

// Mock axios
vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('IntervalsClient - Athlete', () => {
  let client: IntervalsClient;

  beforeEach(() => {
    // Setup axios mock with request handler
    setupAxiosMock(mockedAxios, async (config: any) => {
      if (config.url.includes('/athlete') && config.method === 'GET') {
        return mockAthlete;
      }
      if (config.url.includes('/athlete') && config.method === 'PUT') {
        return mockUpdatedAthlete;
      }
      return null;
    });

    client = new IntervalsClient({
      apiKey: 'test-api-key',
      athleteId: 'test-athlete-id',
    });
  });

  it('should get athlete information', async () => {
    const athlete = await client.athletes.getAthlete();

    expect(athlete).toBeDefined();
    expect(athlete.id).toBe('i12345');
    expect(athlete.name).toBe('Test Athlete');
    expect(athlete.email).toBe('test@example.com');
    expect(athlete.ftp).toBe(250);
    expect(athlete.weight).toBe(70);
  });

  it('should get athlete information with custom athleteId', async () => {
    const athlete = await client.athletes.getAthlete('custom-athlete-id');

    expect(athlete).toBeDefined();
    expect(athlete.name).toBe('Test Athlete');
  });

  it('should update athlete information', async () => {
    const updated = await client.athletes.updateAthlete(mockAthleteUpdate);

    expect(updated).toBeDefined();
    expect(updated.ftp).toBe(260);
    expect(updated.weight).toBe(69.5);
    expect(updated.restingHR).toBe(48);
    expect(updated.updated).toBeDefined();
  });

  it('should update athlete information with partial data', async () => {
    const updated = await client.athletes.updateAthlete({ ftp: 270 });

    expect(updated).toBeDefined();
    expect(updated.updated).toBeDefined();
  });

  it('should validate athlete data structure', async () => {
    const athlete = await client.athletes.getAthlete();

    // Check required fields
    expect(athlete).toHaveProperty('id');
    expect(athlete).toHaveProperty('name');
    
    // Check optional fitness fields
    expect(athlete).toHaveProperty('ftp');
    expect(athlete).toHaveProperty('weight');
    expect(athlete).toHaveProperty('maxHR');
    expect(athlete).toHaveProperty('restingHR');
    
    // Check power curve fields
    expect(athlete).toHaveProperty('w1');
    expect(athlete).toHaveProperty('w6');
    expect(athlete).toHaveProperty('pMax');
    
    // Check ICU calculated fields
    expect(athlete).toHaveProperty('icu_ftp');
    expect(athlete).toHaveProperty('icu_pm');
  });

  describe('getSummary (replaces FitnessService)', () => {
    it('hits /athlete-summary with start, end and tags', async () => {
      const seen: any[] = [];
      setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return []; });
      const c = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      await c.athletes.getSummary({ start: '2026-01-01', end: '2026-02-01', tags: ['race'] });
      expect(seen[0].method).toBe('GET');
      expect(seen[0].url).toBe('/athlete/i1/athlete-summary');
      expect(seen[0].params).toEqual({ start: '2026-01-01', end: '2026-02-01', tags: ['race'] });
      expect((c as any).fitness).toBeUndefined();
    });
  });
});

describe('AthleteService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('listAthletes hits /athletes and maps extIdPrefix to ext_id_prefix', async () => {
    await client.athletes.listAthletes({ extIdPrefix: 'strava' });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athletes');
    expect(seen[0].params).toEqual({ ext_id_prefix: 'strava' });
  });

  it('listAthletes without options sends no params', async () => {
    await client.athletes.listAthletes();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].params).toBeUndefined();
  });

  it('getConnections hits /athlete/{id}/connections', async () => {
    await client.athletes.getConnections();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/connections');
  });

  it('getSettings puts the device class in the path', async () => {
    await client.athletes.getSettings('desktop');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/settings/desktop');
  });

  it('disconnectApp sends DELETE /disconnect-app', async () => {
    await client.athletes.disconnectApp();
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/disconnect-app');
  });
});
