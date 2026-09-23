import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

const mockGear = {
  id: 'g100',
  athlete_id: 'test-athlete-id',
  name: 'Nike Vaporfly',
  type: 'SHOES',
  distance: 350000,
};

describe('IntervalsClient - Gear', () => {
  let client: IntervalsClient;

  beforeEach(() => {
    setupAxiosMock(mockedAxios, async (config: any) => {
      if (config.url.includes('/gear') && config.method === 'POST') {
        if (config.url.endsWith('/replace')) return;
        if (config.url.endsWith('/reminder')) {
          return { id: 1, ...config.data };
        }
        return { ...config.data, id: 'g200' };
      }
      if (config.url.includes('/gear') && config.method === 'PUT') {
        if (config.url.includes('/reminder/')) {
          return { id: 1, ...config.data };
        }
        return { ...mockGear, ...config.data };
      }
      if (config.url.includes('/gear') && config.method === 'DELETE') {
        return;
      }
      return null;
    });

    client = new IntervalsClient({
      apiKey: 'test-api-key',
      athleteId: 'test-athlete-id',
    });
  });

  it('should create a gear item', async () => {
    const gear = await client.gear.create({ name: 'New Shoes', type: 'SHOES' });
    expect(gear).toBeDefined();
    expect(gear.id).toBe('g200');
  });

  it('should update a gear item', async () => {
    const updated = await client.gear.update('g100', { name: 'Updated Shoes' });
    expect(updated).toBeDefined();
    expect(updated.name).toBe('Updated Shoes');
  });

  it('should delete a gear item', async () => {
    await expect(client.gear.delete('g100')).resolves.toBeUndefined();
  });

  it('should replace a gear item', async () => {
    await expect(client.gear.replace('g100', { new_gear_id: 'g200' })).resolves.toBeUndefined();
  });

  it('should create a gear reminder', async () => {
    const reminder = await client.gear.createReminder('g100', {
      name: 'Replace shoes',
      distance: 800000,
    });
    expect(reminder).toBeDefined();
    expect(reminder.id).toBe(1);
  });

  it('should delete a gear reminder', async () => {
    await expect(client.gear.deleteReminder('g100', 1)).resolves.toBeUndefined();
  });
});

describe('GearService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return config.responseType === 'arraybuffer' ? Buffer.from('id,name') : [];
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('list hits /athlete/{id}/gear', async () => {
    await client.gear.list();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/gear');
  });

  it('downloadCSV downloads /athlete/{id}/gear.csv', async () => {
    const out = await client.gear.downloadCSV();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/gear.csv');
    expect(seen[0].responseType).toBe('arraybuffer');
    expect(out.toString()).toBe('id,name');
  });

  it('calc hits /athlete/{id}/gear/{gearId}/calc', async () => {
    await client.gear.calc('b123');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/gear/b123/calc');
  });

  it('calc encodes the gear id segment', async () => {
    await client.gear.calc('b#1');
    expect(seen[0].url).toBe('/athlete/i1/gear/b%231/calc');
  });
});
