import { describe, it, expect, vi } from 'vitest';
import { buildProbes, runProbes, discoverSampleId } from '../../scripts/lib/audit-probes.mjs';

const ids = {
  athleteId: 'i12345',
  activityId: 'a1',
  routeId: 'r1',
  workoutId: 'w1',
  today: '2026-09-20',
  yearAgo: '2025-09-20',
};

describe('buildProbes', () => {
  it('marks a probe write:true when either form uses a non-GET method', () => {
    const probes = buildProbes(ids);
    const byName = Object.fromEntries(probes.map((p) => [p.name, p]));
    expect(byName['download-fit-files verb'].write).toBe(true); // spec form is POST
    expect(byName['streams.csv update verb'].write).toBe(true); // sdk form is POST
    expect(byName['wellness delete (no spec route)'].write).toBe(true); // sdk form is DELETE, spec null
    expect(byName['chats list path'].write).toBe(false); // both GET
  });
});

describe('runProbes', () => {
  it('(a) default mode (write: false) with all sample ids present: every recorded call is GET, every write probe row is skipped', async () => {
    const probes = buildProbes(ids);
    const calls = [];
    const call = vi.fn(async (method, path) => {
      calls.push([method, path]);
      return { status: 200, snippet: 'ok' };
    });

    const rows = await runProbes(probes, { call, write: false });

    expect(calls.length).toBeGreaterThan(0);
    for (const [method] of calls) {
      expect(method).toBe('GET');
    }
    const writeProbes = probes.filter((p) => p.write);
    expect(writeProbes.length).toBeGreaterThan(0);
    for (const p of writeProbes) {
      const row = rows.find((r) => r.startsWith(`| ${p.name} `));
      expect(row).toContain('skipped (write probe; set INTERVALS_LIVE_WRITE=1)');
    }
  });

  it('(b) write: true records at least one non-GET call and produces verdict rows', async () => {
    const probes = buildProbes(ids);
    const calls = [];
    const call = vi.fn(async (method, path) => {
      calls.push([method, path]);
      return { status: 200, snippet: 'ok' };
    });

    const rows = await runProbes(probes, { call, write: true });

    expect(calls.some(([method]) => method !== 'GET')).toBe(true);
    const writeProbes = probes.filter((p) => p.write);
    for (const p of writeProbes) {
      const row = rows.find((r) => r.startsWith(`| ${p.name} `));
      expect(row).not.toContain('skipped (write probe');
      // Should contain a verdict column (not empty trailing columns).
      const cols = row.split('|').map((c) => c.trim());
      expect(cols[cols.length - 2].length).toBeGreaterThan(0);
    }
  });

  it('(c) a probe whose needs is undefined is skipped with "skipped (no sample data)" and no call is made', async () => {
    const probes = buildProbes({ ...ids, activityId: undefined });
    const call = vi.fn(async () => ({ status: 200, snippet: 'ok' }));

    const rows = await runProbes(probes, { call, write: true });

    const activityProbes = probes.filter((p) => 'needs' in p && !p.needs);
    expect(activityProbes.length).toBeGreaterThan(0);
    for (const p of activityProbes) {
      const row = rows.find((r) => r.startsWith(`| ${p.name} `));
      expect(row).toContain('skipped (no sample data)');
    }
    for (const [method, path] of call.mock.calls) {
      expect(path).not.toContain('undefined');
    }
    // None of the calls recorded should be for the activity-dependent probes.
    const activityProbeCallCount = call.mock.calls.filter(([, path]) => String(path).includes('a1')).length;
    expect(activityProbeCallCount).toBe(0);
  });

  it('(d) a call that rejects for one probe shows error: in that row and does not abort the run; other rows are unaffected', async () => {
    const probes = buildProbes(ids);
    const call = vi.fn(async (method, path) => {
      if (path === '/chats') throw new Error('network boom');
      return { status: 200, snippet: 'ok' };
    });

    const rows = await runProbes(probes, { call, write: false });

    const failedRow = rows.find((r) => r.startsWith('| chats list path '));
    expect(failedRow).toContain('error: network boom');
    expect(failedRow).toContain('ambiguous');

    // Every other row must still be produced, and none of them shows an error.
    expect(rows).toHaveLength(probes.length);
    const otherRows = rows.filter((r) => !r.startsWith('| chats list path '));
    for (const r of otherRows) {
      expect(r).not.toContain('error:');
    }
  });
});

describe('discoverSampleId (Codex round-4 item 3)', () => {
  it('(a) a rejecting fetchJson resolves to undefined and calls onError', async () => {
    const fetchJson = vi.fn(async () => {
      throw new Error('timeout');
    });
    const onError = vi.fn();
    const id = await discoverSampleId(fetchJson, '/athlete/i1/activities', {}, { onError });
    expect(id).toBeUndefined();
    expect(onError).toHaveBeenCalledWith('timeout');
  });

  it('(b) a fetchJson that resolves to a non-array resolves to undefined without calling onError', async () => {
    const fetchJson = vi.fn(async () => ({ error: 'not a list' }));
    const onError = vi.fn();
    const id = await discoverSampleId(fetchJson, '/athlete/i1/activities', {}, { onError });
    expect(id).toBeUndefined();
    expect(onError).not.toHaveBeenCalled();
  });

  it('(b, invalid JSON) a fetchJson that throws a SyntaxError (as res.json() would on invalid JSON) resolves to undefined and calls onError', async () => {
    const fetchJson = vi.fn(async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    });
    const onError = vi.fn();
    const id = await discoverSampleId(fetchJson, '/athlete/i1/activities', {}, { onError });
    expect(id).toBeUndefined();
    expect(onError).toHaveBeenCalledWith('Unexpected token < in JSON');
  });

  it('(c) a fetchJson that resolves to [] resolves to undefined', async () => {
    const fetchJson = vi.fn(async () => []);
    const id = await discoverSampleId(fetchJson, '/athlete/i1/activities', {});
    expect(id).toBeUndefined();
  });

  it('(d) a fetchJson that resolves to [{ id: "a1" }] resolves to "a1"', async () => {
    const fetchJson = vi.fn(async () => [{ id: 'a1' }]);
    const id = await discoverSampleId(fetchJson, '/athlete/i1/activities', {});
    expect(id).toBe('a1');
  });

  it('(e) one discovery failing does not prevent runProbes from producing rows for probes that do not need that id', async () => {
    const fetchJson = vi.fn(async () => {
      throw new Error('activities endpoint down');
    });
    const onError = vi.fn();
    const activityId = await discoverSampleId(fetchJson, '/athlete/i12345/activities', {}, { onError });
    expect(activityId).toBeUndefined();
    expect(onError).toHaveBeenCalledWith('activities endpoint down');

    const probes = buildProbes({ ...ids, activityId });
    const call = vi.fn(async () => ({ status: 200, snippet: 'ok' }));
    const rows = await runProbes(probes, { call, write: false });

    const nonActivityProbes = probes.filter((p) => !('needs' in p) || p.needs);
    expect(nonActivityProbes.length).toBeGreaterThan(0);
    for (const p of nonActivityProbes) {
      const row = rows.find((r) => r.startsWith(`| ${p.name} `));
      expect(row).toBeDefined();
      expect(row).not.toContain('skipped (no sample data)');
    }
  });
});
