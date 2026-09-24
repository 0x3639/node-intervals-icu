import { describe, it, expect } from 'vitest';
import { LIVE, liveClient } from './setup.js';

/**
 * Athlete-level curve routes. Phases 2–3 never called these live, which is how
 * `CurveOptions` shipped with parameters the API does not have (fixed in PR #9).
 * Read-only: every case is a GET.
 */
describe.skipIf(!LIVE)('live: phase 4 — athlete-level curves', () => {
  const c = () => liveClient();

  it('getPowerCurves responds for Ride over the past year', async () => {
    const set = await c().performance.getPowerCurves({ type: 'Ride', curves: ['1y'] });
    expect(set).toBeTypeOf('object');
    expect(Array.isArray(set.list)).toBe(true);
  });

  it('getPowerCurves accepts subMaxEfforts and a power model type', async () => {
    const set = await c().performance.getPowerCurves({ type: 'Ride', curves: ['42d'], subMaxEfforts: 1, pmType: 'MORTON_3P' });
    expect(Array.isArray(set.list)).toBe(true);
  });

  it('getPaceCurves responds without a type and with gap', async () => {
    const set = await c().performance.getPaceCurves({ curves: ['1y'], gap: true });
    expect(set).toBeTypeOf('object');
    expect(Array.isArray(set.list)).toBe(true);
  });

  it('getHRCurves responds for the past year', async () => {
    const set = await c().performance.getHRCurves({ curves: ['1y'] });
    expect(set).toBeTypeOf('object');
    expect(Array.isArray(set.list)).toBe(true);
  });

  it('curves accept an explicit date range and a fatigue suffix', async () => {
    const set = await c().performance.getPowerCurves({ type: 'Ride', curves: ['r.2026-01-01.2026-06-30', '1y-kj1'] });
    expect(Array.isArray(set.list)).toBe(true);
  });
});
