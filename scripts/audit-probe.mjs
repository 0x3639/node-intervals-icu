// scripts/audit-probe.mjs
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 node scripts/audit-probe.mjs > AUDIT.md
// Probes each SDK route that disagrees with spec/openapi.json against the live API.
// Default mode sends only GET requests: any probe whose SDK or spec form uses
// POST/PUT/DELETE is skipped unless INTERVALS_LIVE_WRITE=1 is set. Even in write
// mode, those probes send a malformed body where the route takes a body, or use a
// sentinel id that cannot correspond to real data (wellness date 1900-01-01,
// shared-event id 0) for bodyless DELETEs. This is best-effort safety, not proof
// that a handler cannot mutate data — it is not a substitute for read-only
// credentials or a disposable test account.
import { buildProbes, runProbes } from './lib/audit-probes.mjs';

const BASE = 'https://intervals.icu/api/v1';
const KEY = process.env.INTERVALS_API_KEY;
const ATHLETE = process.env.INTERVALS_ATHLETE_ID;
if (!KEY || !ATHLETE) {
  console.error('Set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`API_KEY:${KEY}`).toString('base64');
const WRITE = process.env.INTERVALS_LIVE_WRITE === '1';

async function call(method, path, { query, body, contentType } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
  const headers = { authorization: AUTH };
  if (body !== undefined) headers['content-type'] = contentType ?? 'application/json';
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  return { status: res.status, snippet: text.replace(/\s+/g, ' ').slice(0, 80) };
}

async function firstId(path, query) {
  const r = await fetch(`${BASE}${path}?${new URLSearchParams(query)}`, {
    headers: { authorization: AUTH },
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) return undefined;
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0].id : undefined;
}

const today = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const activityId = await firstId(`/athlete/${ATHLETE}/activities`, { oldest: yearAgo, newest: today });
const routeId = await firstId(`/athlete/${ATHLETE}/routes`, {});
const workoutId = await firstId(`/athlete/${ATHLETE}/workouts`, {});

const probes = buildProbes({ athleteId: ATHLETE, activityId, routeId, workoutId, today, yearAgo });
const rows = await runProbes(probes, { call, write: WRITE });

console.log(`# API audit

Generated ${today} by \`scripts/audit-probe.mjs\` against the live API. Each row is an SDK operation that
disagrees with \`spec/openapi.json\`. Default mode sends only GET requests: a probe whose SDK or spec form
uses POST/PUT/DELETE is skipped unless \`INTERVALS_LIVE_WRITE=1\` is set. Even in write mode, those probes
send a malformed body where the route takes a body (a 400 or 415 means the route exists and rejected the
input); bodyless DELETEs use a sentinel id that cannot correspond to real data (wellness date 1900-01-01,
shared-event id 0). This is best-effort safety, not proof that a handler cannot mutate data.

Verdict legend: **works-as-written** keep and document as undocumented; **broken: fix to spec** change verb or
path; **broken: verb** path exists, verb rejected; **broken: delete** route does not exist and spec has no
replacement; **skipped (no sample data)** no activity/route/workout id was available to probe with;
**skipped (write probe; set INTERVALS_LIVE_WRITE=1)** the probe was not run because it may mutate data;
**ambiguous** ask on the Intervals.icu forum.

| Probe | SDK form | Spec form | Verdict |
|---|---|---|---|
${rows.join('\n')}
`);
