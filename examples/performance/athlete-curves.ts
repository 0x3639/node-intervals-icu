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

// The curve routes pick their window with `curves`, not a date range: '1y' is the past
// year, '42d' the past 42 days, 's0' the current season, 'all' all time, and
// 'r.2026-01-01.2026-03-31' an explicit range. The API requires `type` for power-curves
// (HTTP 422 without it); pace-curves and hr-curves work without it.
const powerCurves = await client.performance.getPowerCurves({ curves: ['1y'], type: 'Ride' });
console.log(`Power curves: ${powerCurves.list?.length ?? 0}`);

const paceCurves = await client.performance.getPaceCurves({ curves: ['1y'] });
console.log(`Pace curves: ${paceCurves.list?.length ?? 0}`);

const hrCurves = await client.performance.getHRCurves({ curves: ['1y'] });
console.log(`HR curves: ${hrCurves.list?.length ?? 0}`);

// getPowerHRCurve is the exception: it takes an explicit start/end date range. The API
// keys dates by the athlete's local date, not the machine's, so the bounds are formatted
// in the athlete's time zone ('en-CA' formats as YYYY-MM-DD; an undefined timeZone falls
// back to the machine's own zone, which is the right fallback when none is set).
const me = await client.athletes.getAthlete();
const localDateIn = (date: Date, timeZone?: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const field = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${field('year')}-${field('month')}-${field('day')}`;
};
const now = new Date(); // one timestamp for both bounds
const yearAgo = new Date(now);
yearAgo.setFullYear(yearAgo.getFullYear() - 1);

const powerHR = await client.performance.getPowerHRCurve({
  start: localDateIn(yearAgo, me.timezone),
  end: localDateIn(now, me.timezone),
});
console.log(`Power vs HR: ${powerHR.bpm?.length ?? 0} point(s)`);
// #endregion main
