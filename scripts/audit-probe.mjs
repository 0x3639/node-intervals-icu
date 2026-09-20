// scripts/audit-probe.mjs
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 node scripts/audit-probe.mjs > AUDIT.md
// Probes each SDK route that disagrees with spec/openapi.json against the live API.
// Read probes use real data. Write probes send a malformed body so nothing is created.
const BASE = 'https://intervals.icu/api/v1';
const KEY = process.env.INTERVALS_API_KEY;
const ATHLETE = process.env.INTERVALS_ATHLETE_ID;
if (!KEY || !ATHLETE) {
  console.error('Set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`API_KEY:${KEY}`).toString('base64');

async function call(method, path, { query, body, contentType } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
  const headers = { authorization: AUTH };
  if (body !== undefined) headers['content-type'] = contentType ?? 'application/json';
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, snippet: text.replace(/\s+/g, ' ').slice(0, 80) };
}

async function firstId(path, query) {
  const r = await fetch(`${BASE}${path}?${new URLSearchParams(query)}`, { headers: { authorization: AUTH } });
  if (!r.ok) return undefined;
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0].id : undefined;
}

const today = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const activityId = await firstId(`/athlete/${ATHLETE}/activities`, { oldest: yearAgo, newest: today });
const routeId = await firstId(`/athlete/${ATHLETE}/routes`, {});
const workoutId = await firstId(`/athlete/${ATHLETE}/workouts`, {});
const BAD = '"not-json"'; // string literal where an object is required -> 400 if route exists

const A = `/athlete/${ATHLETE}`;
const probes = [
  { name: 'download-fit-files verb', sdk: ['GET', `${A}/download-fit-files`, { query: { ids: activityId } }], spec: ['POST', `${A}/download-fit-files`, { query: { ids: activityId } }], needs: activityId },
  { name: 'download-workout verb (global)', sdk: ['GET', '/download-workout.zwo', { query: { id: workoutId } }], spec: ['POST', '/download-workout.zwo', { body: BAD }], needs: workoutId },
  { name: 'download-workout verb (athlete)', sdk: ['GET', `${A}/download-workout.zwo`, { query: { id: workoutId } }], spec: ['POST', `${A}/download-workout.zwo`, { body: BAD }], needs: workoutId },
  { name: 'streams.csv update verb', sdk: ['POST', `/activity/${activityId}/streams.csv`, { body: BAD }], spec: ['PUT', `/activity/${activityId}/streams.csv`, { body: BAD }], needs: activityId },
  { name: 'chats list path', sdk: ['GET', '/chats'], spec: ['GET', `${A}/chats`] },
  { name: 'route similarity path', sdk: ['GET', `${A}/routes/${routeId}/similarities`], spec: ['GET', `${A}/routes/${routeId}/similarity/${routeId}`], needs: routeId },
  { name: 'fitness (no spec route)', sdk: ['GET', `${A}/fitness`, { query: { oldest: yearAgo, newest: today } }], spec: ['GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }] },
  { name: 'activity-summary (no spec route)', sdk: ['GET', `${A}/activity-summary`, { query: { oldest: yearAgo, newest: today } }], spec: ['GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }] },
  { name: 'athlete power-vs-hr path', sdk: ['GET', `${A}/power-vs-hr`, { query: { start: yearAgo, end: today } }], spec: ['GET', `${A}/power-hr-curve`, { query: { start: yearAgo, end: today } }] },
  { name: 'athlete weather path', sdk: ['GET', `${A}/weather`], spec: ['GET', `${A}/weather-forecast`] },
  { name: 'activity weather path', sdk: ['GET', `/activity/${activityId}/weather`], spec: ['GET', `/activity/${activityId}/weather-summary`], needs: activityId },
  { name: 'search athletes (no spec route)', sdk: ['GET', '/search/athletes', { query: { q: 'a' } }], spec: null },
  { name: 'wellness delete (no spec route)', sdk: ['DELETE', `${A}/wellness/1900-01-01`], spec: null },
  { name: 'shared-event create (no spec route)', sdk: ['POST', '/shared-event', { body: BAD }], spec: null },
  { name: 'shared-event update (no spec route)', sdk: ['PUT', '/shared-event/0', { body: BAD }], spec: null },
  { name: 'shared-event delete (no spec route)', sdk: ['DELETE', '/shared-event/0'], spec: null },
];

function verdict(sdkRes, specRes, isMalformed) {
  const ok = (r) => r && (r.status < 300 || (isMalformed && (r.status === 400 || r.status === 415)));
  if (ok(sdkRes)) return 'works-as-written';
  if (ok(specRes)) return 'broken: fix to spec';
  if (sdkRes?.status === 405) return 'broken: verb';
  if (sdkRes?.status === 404) return specRes ? 'ambiguous' : 'broken: delete';
  return 'ambiguous';
}

const rows = [];
for (const p of probes) {
  if ('needs' in p && !p.needs) {
    rows.push(`| ${p.name} | skipped (no sample data) | | |`);
    continue;
  }
  const [sm, sp, so = {}] = p.sdk;
  const sdkRes = await call(sm, sp, so);
  const specRes = p.spec ? await call(p.spec[0], p.spec[1], p.spec[2] ?? {}) : null;
  const malformed = so.body === BAD || p.spec?.[2]?.body === BAD;
  const fmt = (m, path, r) => `${m} ${path.replace(ATHLETE, '{id}')} → ${r.status}`;
  rows.push(
    `| ${p.name} | ${fmt(sm, sp, sdkRes)} | ${specRes ? fmt(p.spec[0], p.spec[1], specRes) : 'none'} | ${verdict(sdkRes, specRes, malformed)} |`,
  );
}

console.log(`# API audit

Generated ${today} by \`scripts/audit-probe.mjs\` against the live API. Each row is an SDK operation that
disagrees with \`spec/openapi.json\`. Write-verb probes send a malformed body, so a 400 or 415 means the
route exists and rejected the input; nothing was created.

Verdict legend: **works-as-written** keep and document as undocumented; **broken: fix to spec** change verb or
path; **broken: verb** path exists, verb rejected; **broken: delete** route does not exist and spec has no
replacement; **ambiguous** ask on the Intervals.icu forum.

| Probe | SDK form | Spec form | Verdict |
|---|---|---|---|
${rows.join('\n')}
`);
