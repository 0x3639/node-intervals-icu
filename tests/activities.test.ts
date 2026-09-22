import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { mockActivity, mockActivities } from './fixtures/activities.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

// Mock axios
vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('IntervalsClient - Activities', () => {
  let client: IntervalsClient;

  beforeEach(() => {
    // v2.0 URL patterns:
    //   list:   GET /athlete/{id}/activities
    //   single: GET /activity/{activityId}
    //   update: PUT /activity/{activityId}
    //   delete: DELETE /activity/{activityId}
    setupAxiosMock(mockedAxios, async (config: any) => {
      // List activities (athlete-scoped)
      if (config.url.includes('/athlete/') && config.url.endsWith('/activities') && config.method === 'GET') {
        return mockActivities;
      }
      // Single activity operations (no athlete prefix)
      if (config.url.match(/\/activity\//) && config.method === 'GET') {
        return mockActivity;
      }
      if (config.url.match(/\/activity\//) && config.method === 'PUT') {
        return { ...mockActivity, ...config.data, updated: '2024-01-20T12:00:00Z' };
      }
      if (config.url.match(/\/activity\//) && config.method === 'DELETE') {
        return;
      }
      return [];
    });

    client = new IntervalsClient({
      apiKey: 'test-api-key',
      athleteId: 'test-athlete-id',
    });
  });

  it('should get recorded activities', async () => {
    const activities = await client.activities.listActivities({
      oldest: '2024-01-01',
      newest: '2024-01-31',
    });

    expect(activities).toBeDefined();
    expect(activities.length).toBeGreaterThan(0);
    expect(activities[0]).toHaveProperty('name');
    expect(activities[0]).toHaveProperty('type');
    expect(activities[0]).toHaveProperty('distance');
  });

  it('should get a specific activity by ID', async () => {
    const activity = await client.activities.getActivity('i2001');

    expect(activity).toBeDefined();
    expect(activity.id).toBe('i2001');
    expect(activity.name).toBe('Morning Run');
    expect(activity.type).toBe('Run');
  });

  it('should update an existing activity', async () => {
    const updated = await client.activities.updateActivity('i2001', {
      name: 'Updated Morning Run',
      description: 'Easy recovery run - felt great',
      feel: 9,
    });

    expect(updated).toBeDefined();
    expect(updated.name).toBe('Updated Morning Run');
    expect(updated.updated).toBeDefined();
  });

  it('should delete an activity', async () => {
    await expect(client.activities.deleteActivity('i2001')).resolves.toBeUndefined();
  });

  it('should filter activities by type', async () => {
    const activities = await client.activities.listActivities({
      oldest: '2024-01-01',
      newest: '2024-01-31',
    });

    const runActivities = activities.filter(a => a.type === 'Run');
    const rideActivities = activities.filter(a => a.type === 'Ride');
    const swimActivities = activities.filter(a => a.type === 'Swim');

    expect(runActivities.length).toBeGreaterThan(0);
    expect(rideActivities.length).toBeGreaterThan(0);
    expect(swimActivities.length).toBeGreaterThan(0);
    
    runActivities.forEach(activity => {
      expect(activity.type).toBe('Run');
    });
  });

  it('should validate activity data structure', async () => {
    const activity = await client.activities.getActivity('i2001');
    
    // Check core fields
    expect(activity).toHaveProperty('id');
    expect(activity).toHaveProperty('start_date_local');
    expect(activity).toHaveProperty('type');
    expect(activity).toHaveProperty('name');
    
    // Check activity-specific fields
    expect(activity).toHaveProperty('distance');
    expect(activity).toHaveProperty('moving_time');
    expect(activity).toHaveProperty('elapsed_time');
    expect(activity).toHaveProperty('icu_training_load');
  });

  it('should handle activities with detailed metrics', async () => {
    const activity = await client.activities.getActivity('i2001');
    
    // Check advanced metrics (v2.0 field names)
    expect(activity).toHaveProperty('icu_training_load');
    expect(activity).toHaveProperty('icu_feel');
    
    // Optional fields
    if (activity.icu_training_load !== undefined) {
      expect(typeof activity.icu_training_load).toBe('number');
    }
    if (activity.trimp !== undefined) {
      expect(typeof activity.trimp).toBe('number');
    }
    if (activity.perceived_exertion !== undefined) {
      expect(typeof activity.perceived_exertion).toBe('number');
    }
  });

  describe('verb fixes (AUDIT.md)', () => {
    let seen: any[] = [];
    beforeEach(() => {
      seen = [];
      setupAxiosMock(mockedAxios, async (config: any) => {
        seen.push(config);
        if (config.responseType === 'arraybuffer') return Buffer.from('PK');
        return { updated: 1 };
      });
      client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    });

    it('downloadFitFiles POSTs with comma-joined ids in the query', async () => {
      await client.activities.downloadFitFiles(['a1', 'a2'], { power: false });
      expect(seen[0].method).toBe('POST');
      expect(seen[0].url).toBe('/athlete/i1/download-fit-files');
      expect(seen[0].params).toEqual({ ids: 'a1,a2', power: false });
      expect(seen[0].data).toBeUndefined();
    });

    it('updateStreamsCSV PUTs multipart', async () => {
      await client.activities.updateStreamsCSV('a1', Buffer.from('t,w\n1,2'), 'streams.csv');
      expect(seen[0].method).toBe('PUT');
      expect(seen[0].url).toBe('/activity/a1/streams.csv');
    });
  });
});

describe('ActivityService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return config.responseType === 'arraybuffer' ? Buffer.from('PK') : [];
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getActivities joins ids with commas in the path and passes intervals', async () => {
    await client.activities.getActivities(['a1', 'a2'], { intervals: true });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activities/a1,a2');
    expect(seen[0].params).toEqual({ intervals: true });
  });

  it('listActivitiesAround sends activity_id, route_id and limit', async () => {
    await client.activities.listActivitiesAround('a1', { route_id: 7, limit: 5 });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activities-around');
    expect(seen[0].params).toEqual({ activity_id: 'a1', route_id: 7, limit: 5 });
  });

  it('searchActivitiesFull sends q and limit', async () => {
    await client.activities.searchActivitiesFull('tempo', { limit: 3 });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activities/search-full');
    expect(seen[0].params).toEqual({ q: 'tempo', limit: 3 });
  });

  it('searchIntervals passes the criteria through as query params', async () => {
    const criteria = { minSecs: 60, maxSecs: 300, minIntensity: 90, maxIntensity: 120, type: 'POWER' as const, minReps: 3 };
    await client.activities.searchIntervals(criteria);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activities/interval-search');
    expect(seen[0].params).toEqual(criteria);
  });

  it('listActivityTags hits /activity-tags', async () => {
    await client.activities.listActivityTags();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activity-tags');
  });

  it('downloadActivitiesCSV downloads /activities.csv as a buffer', async () => {
    const out = await client.activities.downloadActivitiesCSV();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activities.csv');
    expect(seen[0].responseType).toBe('arraybuffer');
    expect(Buffer.isBuffer(out)).toBe(true);
  });

  it('downloadGPX downloads /activity/{id}/gpx-file with power and hr flags', async () => {
    await client.activities.downloadGPX('a1', { power: true, hr: false });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/activity/a1/gpx-file');
    expect(seen[0].params).toEqual({ power: true, hr: false });
    expect(seen[0].responseType).toBe('arraybuffer');
  });

  it('deleteTombstone sends DELETE /activity/{id}/tombstone', async () => {
    await client.activities.deleteTombstone('a1');
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/activity/a1/tombstone');
  });

  it('athlete-scoped methods accept an explicit athleteId', async () => {
    await client.activities.listActivityTags('other');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/other/activity-tags');
  });

  it('getActivities with no ids makes no request and returns []', async () => {
    expect(await client.activities.getActivities([])).toEqual([]);
    expect(seen).toHaveLength(0);
  });

  it('deleteTombstone encodes delimiters in the id so the path still ends in /tombstone', async () => {
    await client.activities.deleteTombstone('victim#?/%');
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/activity/victim%23%3F%2F%25/tombstone');
    expect(seen[0].url.endsWith('/tombstone')).toBe(true);
  });

  it('getActivities and downloadGPX encode ids as path segments', async () => {
    await client.activities.getActivities(['a#1', 'b/2']);
    expect(seen[0].url).toBe('/athlete/i1/activities/a%231,b%2F2');
    await client.activities.downloadGPX('c?3');
    expect(seen[1].url).toBe('/activity/c%3F3/gpx-file');
  });
});
