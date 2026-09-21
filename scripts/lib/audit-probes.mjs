// Pure probe table builder and runner shared by scripts/audit-probe.mjs and its
// tests. No I/O here: the caller injects `call`.
import { verdict } from './audit-verdict.mjs';

const BAD = '"not-json"'; // string literal where an object is required -> 400 if route exists

/** Build one call form (method/path/opts) plus its display string and malformed flag. */
function form(method, path, opts, { malformed = false, athleteId } = {}) {
  return {
    method,
    path,
    opts,
    malformed,
    display: `${method} ${athleteId ? String(path).replaceAll(athleteId, '{id}') : path}`,
  };
}

/**
 * Build the audit probe table. Each probe pairs an SDK call form with the
 * spec's likely equivalent (or `null` when none exists). `write` is true
 * when either form's method is not GET; `runProbes` uses it to skip
 * mutating probes unless explicitly enabled.
 */
export function buildProbes({ athleteId, activityId, routeId, workoutId, today, yearAgo }) {
  const A = `/athlete/${athleteId}`;
  const f = (method, path, opts = {}, malformed = false) => form(method, path, opts, { malformed, athleteId });

  const probe = (name, sdk, spec, extra = {}) => ({
    name,
    sdk,
    spec: spec ?? null,
    write: sdk.method !== 'GET' || (spec ? spec.method !== 'GET' : false),
    ...extra,
  });

  return [
    probe(
      'download-fit-files verb',
      f('GET', `${A}/download-fit-files`, { query: { ids: activityId } }),
      f('POST', `${A}/download-fit-files`, { query: { ids: activityId } }),
      { needs: activityId },
    ),
    probe(
      'download-workout verb (global)',
      f('GET', '/download-workout.zwo', { query: { id: workoutId } }),
      f('POST', '/download-workout.zwo', { body: BAD }, true),
      { needs: workoutId },
    ),
    probe(
      'download-workout verb (athlete)',
      f('GET', `${A}/download-workout.zwo`, { query: { id: workoutId } }),
      f('POST', `${A}/download-workout.zwo`, { body: BAD }, true),
      { needs: workoutId },
    ),
    probe(
      'streams.csv update verb',
      f('POST', `/activity/${activityId}/streams.csv`, { body: BAD }, true),
      f('PUT', `/activity/${activityId}/streams.csv`, { body: BAD }, true),
      { needs: activityId },
    ),
    probe('chats list path', f('GET', '/chats'), f('GET', `${A}/chats`)),
    probe(
      'route similarity path',
      f('GET', `${A}/routes/${routeId}/similarities`),
      f('GET', `${A}/routes/${routeId}/similarity/${routeId}`),
      { needs: routeId },
    ),
    probe(
      'fitness (no spec route)',
      f('GET', `${A}/fitness`, { query: { oldest: yearAgo, newest: today } }),
      f('GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }),
    ),
    probe(
      'activity-summary (no spec route)',
      f('GET', `${A}/activity-summary`, { query: { oldest: yearAgo, newest: today } }),
      f('GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }),
    ),
    probe(
      'athlete power-vs-hr path',
      f('GET', `${A}/power-vs-hr`, { query: { start: yearAgo, end: today } }),
      f('GET', `${A}/power-hr-curve`, { query: { start: yearAgo, end: today } }),
    ),
    probe('athlete weather path', f('GET', `${A}/weather`), f('GET', `${A}/weather-forecast`)),
    probe(
      'activity weather path',
      f('GET', `/activity/${activityId}/weather`),
      f('GET', `/activity/${activityId}/weather-summary`),
      { needs: activityId },
    ),
    probe('search athletes (no spec route)', f('GET', '/search/athletes', { query: { q: 'a' } }), null),
    probe('wellness delete (no spec route)', f('DELETE', `${A}/wellness/1900-01-01`), null),
    probe('shared-event create (no spec route)', f('POST', '/shared-event', { body: BAD }, true), null),
    probe('shared-event update (no spec route)', f('PUT', '/shared-event/0', { body: BAD }, true), null),
    probe('shared-event delete (no spec route)', f('DELETE', '/shared-event/0'), null),
  ];
}

/**
 * Run the probe table against an injected `call(method, path, opts)`.
 * `write` gates mutating probes: when false, a probe with `write: true` is
 * never called and its row says so. Probes whose `needs` is falsy are also
 * skipped without a call. Returns the Markdown table rows.
 */
export async function runProbes(probes, { call, write }) {
  const rows = [];
  for (const p of probes) {
    if ('needs' in p && !p.needs) {
      rows.push(`| ${p.name} | skipped (no sample data) | | |`);
      continue;
    }
    if (!write && p.write) {
      rows.push(`| ${p.name} | skipped (write probe; set INTERVALS_LIVE_WRITE=1) | | |`);
      continue;
    }
    const sdkRes = await call(p.sdk.method, p.sdk.path, p.sdk.opts ?? {});
    const specRes = p.spec ? await call(p.spec.method, p.spec.path, p.spec.opts ?? {}) : null;
    const sdkForm = `${p.sdk.display} → ${sdkRes.status}`;
    const specForm = specRes ? `${p.spec.display} → ${specRes.status}` : 'none';
    rows.push(
      `| ${p.name} | ${sdkForm} | ${specForm} | ${verdict(sdkRes, specRes, p.sdk.malformed, Boolean(p.spec?.malformed))} |`,
    );
  }
  return rows;
}
