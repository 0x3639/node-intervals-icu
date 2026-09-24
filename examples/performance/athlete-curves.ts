/**
 * Fetch the athlete's power, pace and HR curves for the last year, and the
 * power-vs-heart-rate curve over the same range.
 *
 * Run:
 *   export INTERVALS_API_KEY="your-api-key"
 *   npx tsx examples/performance/athlete-curves.ts
 */
import { IntervalsClient } from '../../src/index.js';

const apiKey = process.env.INTERVALS_API_KEY;
if (!apiKey) {
  console.error('Set INTERVALS_API_KEY first');
  process.exit(1);
}

// #region main
const client = new IntervalsClient({ apiKey });

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const now = new Date(); // one timestamp for both bounds
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);
const newest = localDate(now);
const oldest = localDate(yearAgo);

// `type` is not in the CurveOptions interface, but the live API requires it for power-curves
// (400/422 without it, per the vendored spec); pace-curves and hr-curves work without it.
const powerCurveOptions = { oldest, newest, type: 'Ride' as const };
const powerCurves = await client.performance.getPowerCurves(powerCurveOptions);
console.log(`Power curves: ${powerCurves.list?.length ?? 0}`);

const paceCurves = await client.performance.getPaceCurves({ oldest, newest });
console.log(`Pace curves: ${paceCurves.list?.length ?? 0}`);

const hrCurves = await client.performance.getHRCurves({ oldest, newest });
console.log(`HR curves: ${hrCurves.list?.length ?? 0}`);

const powerHR = await client.performance.getPowerHRCurve({ start: oldest, end: newest });
console.log(`Power vs HR: ${powerHR.bpm?.length ?? 0} point(s)`);
// #endregion main
