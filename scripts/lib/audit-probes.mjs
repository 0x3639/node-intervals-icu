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
 * Discover a sample id to probe with, by calling `fetchJson(path, query)`
 * (injected so the caller controls timeout/auth/parsing) and taking the
 * first element's `id` from an array response. Never throws: a rejection
 * (network failure, `AbortSignal.timeout` abort, `res.json()` failing on
 * invalid JSON, or any other error) is caught and reported through the
 * optional `onError(message)` callback, and the function resolves to
 * `undefined` just as it does for an empty or non-array response -- one
 * failed discovery must never abort the rest of the audit.
 */
export async function discoverSampleId(fetchJson, path, query, { onError } = {}) {
  let result;
  try {
    result = await fetchJson(path, query);
  } catch (err) {
    onError?.(err?.message ?? String(err));
    return undefined;
  }
  return Array.isArray(result) && result.length > 0 ? result[0].id : undefined;
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
 * Call `call(method, path, opts)` and catch a rejection so one probe's
 * network failure cannot abort the rest of the run. Returns `{ ok: true,
 * res }` on success or `{ ok: false, message }` on failure.
 */
async function safeCall(call, method, path, opts) {
  try {
    return { ok: true, res: await call(method, path, opts) };
  } catch (err) {
    return { ok: false, message: err?.message ?? String(err) };
  }
}

/**
 * Run the probe table against an injected `call(method, path, opts)`.
 * `write` gates mutating probes: when false, a probe with `write: true` is
 * never called and its row says so. Probes whose `needs` is falsy are also
 * skipped without a call. A `call` that rejects for one probe's SDK or spec
 * form does not abort the run: that form's column shows `error: <message>`
 * and the row's verdict is `ambiguous`. Returns the Markdown table rows.
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
    const sdkOutcome = await safeCall(call, p.sdk.method, p.sdk.path, p.sdk.opts ?? {});
    const specOutcome = p.spec ? await safeCall(call, p.spec.method, p.spec.path, p.spec.opts ?? {}) : null;

    if (!sdkOutcome.ok || (specOutcome && !specOutcome.ok)) {
      const sdkForm = sdkOutcome.ok ? `${p.sdk.display} → ${sdkOutcome.res.status}` : `error: ${sdkOutcome.message}`;
      const specForm = !p.spec
        ? 'none'
        : specOutcome.ok
          ? `${p.spec.display} → ${specOutcome.res.status}`
          : `error: ${specOutcome.message}`;
      rows.push(`| ${p.name} | ${sdkForm} | ${specForm} | ambiguous |`);
      continue;
    }

    const sdkRes = sdkOutcome.res;
    const specRes = specOutcome ? specOutcome.res : null;
    const sdkForm = `${p.sdk.display} → ${sdkRes.status}`;
    const specForm = specRes ? `${p.spec.display} → ${specRes.status}` : 'none';
    rows.push(
      `| ${p.name} | ${sdkForm} | ${specForm} | ${verdict(sdkRes, specRes, p.sdk.malformed, Boolean(p.spec?.malformed))} |`,
    );
  }
  return rows;
}
