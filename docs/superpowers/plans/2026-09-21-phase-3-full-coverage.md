# Phase 3: Full Spec Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 35 spec operations the SDK does not yet call, so `node scripts/coverage.mjs --strict` reports 149/149 and CI enforces it.

**Architecture:** Two PRs. PR A (Tasks 1–8) adds 26 methods to seven existing services, all additive, and bumps to 3.0.0-alpha.2. PR B (Tasks 9–12) adds `AnalyticsService` with 12 methods, flips the CI coverage step to `--strict`, and bumps to 3.0.0-beta.1. Types are hand-written in the existing `src/types/*.ts` files; a unit test compares each new interface's property names to the vendored spec. Every method has a mocked unit test asserting HTTP method, URL and params, and a read-only live test.

**Tech Stack:** TypeScript 5, axios, vitest 2, Node 18+. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-21-phase-3-full-coverage-design.md` (binding; it lists every method, route and return type).

## Global Constraints

- Node `>=18.0.0`; no new dependencies.
- Every new method has a unit test asserting `method` and `url` (and `params`/`data`/`responseType` where the call has them) via `setupAxiosMock` from `tests/helpers/mock-axios.ts`.
- All changes are additive: no public method is renamed, removed or re-typed. `docs/MIGRATION.md` is not touched.
- Live tests go in `tests/live/phase3.live.test.ts`, use `describe.skipIf(!LIVE)` from `tests/live/setup.ts`, skip per test with `ctx.skip()` when the account lacks data, and are read-only unless inside `describe.skipIf(!LIVE_WRITE)`. `athletes.disconnectApp()` is never called live.
- Athlete-scoped methods take an optional trailing `athleteId?: string` and resolve `const id = athleteId || this.defaultAthleteId;`, as every existing service does.
- CSV / zip / GPX responses use `this.httpClient.download(url, { params })` and return `Buffer`.
- Commit messages end with `Co-Authored-By: Claude <model> <noreply@anthropic.com>` naming the model that wrote the commit. Commits are GPG-signed (global config); if a commit hangs on a passphrase prompt, stop and ask the user to unlock the key.
- Branches: PR A is `phase-3/complete-services` from `main`; PR B is `phase-3/analytics-service` from `main` after PR A merges. This spec + plan land first via a docs-only PR from `phase-3/spec-and-plan`.
- After Task 7, `node scripts/coverage.mjs` must report 139 covered / 10 missing / 0 phantom and exit 0. After Task 11, `node scripts/coverage.mjs --strict` must report 149 covered / 0 missing / 0 phantom and exit 0.

## Route-to-task map

| Spec operation | Method | Task |
|---|---|---|
| `GET /athlete/{athleteId}/activities/{ids}` | `activities.getActivities` | 2 |
| `GET /athlete/{id}/activities-around` | `activities.listActivitiesAround` | 2 |
| `GET /athlete/{id}/activities/search-full` | `activities.searchActivitiesFull` | 2 |
| `GET /athlete/{id}/activities/interval-search` | `activities.searchIntervals` | 2 |
| `GET /athlete/{id}/activity-tags` | `activities.listActivityTags` | 2 |
| `GET /athlete/{id}/activities.csv` | `activities.downloadActivitiesCSV` | 2 |
| `GET /activity/{id}/gpx-file` | `activities.downloadGPX` | 2 |
| `DELETE /activity/{id}/tombstone` | `activities.deleteTombstone` | 2 |
| `GET /athletes` | `athletes.listAthletes` | 3 |
| `GET /athlete/{id}/connections` | `athletes.getConnections` | 3 |
| `GET /athlete/{id}/settings/{deviceClass}` | `athletes.getSettings` | 3 |
| `DELETE /disconnect-app` | `athletes.disconnectApp` | 3 |
| `GET /chats/{id}` | `chats.getChat` | 4 |
| `GET /athlete/{id}/groups` | `chats.listGroups` | 4 |
| `PUT /chats/{id}/block` | `chats.blockChat` | 4 |
| `PUT /chats/{id}/messages/{msgId}` | `chats.updateMessage` | 4 |
| `DELETE /chats/{id}/messages/{msgId}` | `chats.deleteMessage` | 4 |
| `GET /athlete/{id}/event-tags` | `events.listEventTags` | 5 |
| `GET /athlete/{id}/fitness-model-events` | `events.listFitnessModelEvents` | 5 |
| `GET /athlete/{id}/workouts.zip` | `events.downloadWorkoutsZip` | 5 |
| `GET /athlete/{id}/workout-tags` | `workouts.listWorkoutTags` | 5 |
| `GET /athlete/{id}/gear{ext}` | `gear.list`, `gear.downloadCSV` | 6 |
| `GET /athlete/{id}/gear/{gearId}/calc` | `gear.calc` | 6 |
| `GET .../sport-settings/{id}/matching-activities` | `sportSettings.listMatchingActivities` | 6 |
| `GET .../sport-settings/{id}/pace_distances` | `sportSettings.getPaceDistances` | 6 |
| `GET /activity/{id}/power-histogram` | `analytics.getPowerHistogram` | 10 |
| `GET /activity/{id}/hr-histogram` | `analytics.getHRHistogram` | 10 |
| `GET /activity/{id}/pace-histogram` | `analytics.getPaceHistogram` | 10 |
| `GET /activity/{id}/gap-histogram` | `analytics.getGAPHistogram` | 10 |
| `GET /activity/{id}/time-at-hr` | `analytics.getTimeAtHR` | 10 |
| `GET /activity/{id}/interval-stats` | `analytics.getIntervalStats` | 10 |
| `GET /activity/{id}/power-spike-model` | `analytics.getPowerSpikeModel` | 10 |
| `GET /activity/{id}/power-curves{ext}` | `analytics.getActivityPowerCurves`, `...CSV` | 10 |
| `GET /athlete/{id}/mmp-model` | `analytics.getMMPModel` | 10 |
| `GET /athlete/{id}/activity-pace-curves{ext}` | `analytics.getActivityPaceCurves`, `...CSV` | 10 |

## Conventions used by every task

**Unit-test block.** Each service task appends a new top-level `describe` to the end of that service's existing test file (after the file's last `});`). Every existing test file already has these at its top, so do not re-add them:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';
vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;
```

The appended block always starts:

```ts
describe('<Service> — Phase 3 additions', () => {
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
  // ...its
});
```

`seen[0]` is the axios request config: `method`, `url`, `params`, `data`, `responseType`.

**Live-test helpers.** `tests/live/phase3.live.test.ts` (created in Task 7) defines `today()`, `yearAgo()` and `latestActivityId()` exactly as `tests/live/phase2.live.test.ts` does. Run the live suite with:

```bash
set -a && . ./.env && set +a && npm run test:live
```

`.env` (gitignored) holds `INTERVALS_API_KEY` and `INTERVALS_ATHLETE_ID`; add `INTERVALS_LIVE_WRITE=1` to run the cleanup-guaranteed write block. The one irreversible case (`deleteTombstone`) additionally needs `INTERVALS_LIVE_DESTRUCTIVE=1` and `INTERVALS_TOMBSTONE_ID=<activity id>`; never set these by default.

---

## PR A — complete the existing services

### Task 1: PR A types and the spec-conformance test

**Files:**
- Modify: `src/types/activity.ts` (append after `ActivityMini`, end of file)
- Modify: `src/types/athlete.ts` (append at end of file)
- Modify: `src/types/event.ts` (append at end of file)
- Modify: `src/types/index.ts`, `src/index.ts`
- Create: `tests/types/spec-conformance.test.ts`

**Interfaces:**
- Produces: `IntervalSearchOptions`, `ActivitiesAroundOptions` (activity.ts); `AthleteConnections`, `AthleteWithTags` (athlete.ts); `WorkoutsZipOptions` (event.ts). All exported from `src/types/index.ts` and `src/index.ts`. Tasks 2, 3, 5 import them from `'../types/index.js'`.

- [ ] **Step 1: Write the failing conformance test**

Create `tests/types/spec-conformance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Hand-written types added in Phase 3 must declare exactly the properties the vendored
 * spec declares for the same schema, with the same optionality (from the schema's
 * `required` list) and the matching TypeScript type. This replaces a generated-types
 * step: it catches a typo or a spec change without committing a 9,700-line generated file.
 */
const spec = JSON.parse(readFileSync(new URL('../../spec/openapi.json', import.meta.url), 'utf8'));

/** One property as both sides see it: name, whether it may be omitted, and its TypeScript type. */
interface Member { name: string; optional: boolean; type: string }

/** Map a JSON-schema property to the TypeScript type the hand-written interface should use. */
function tsType(prop: any): string {
  if (prop.$ref) return String(prop.$ref).split('/').pop() as string;
  switch (prop.type) {
    case 'string': return 'string';
    case 'boolean': return 'boolean';
    case 'integer':
    case 'number': return 'number';
    case 'array': return `${tsType(prop.items ?? {})}[]`;
    default: return 'unknown';
  }
}

function schemaMembers(name: string): Member[] {
  const schema = spec.components.schemas[name];
  if (!schema) throw new Error(`schema ${name} not in spec/openapi.json`);
  const required: string[] = schema.required ?? [];
  return Object.entries(schema.properties ?? {})
    .map(([k, v]) => ({ name: k, optional: !required.includes(k), type: tsType(v) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Parse `name?: type;` members out of an interface body or an inline object type. */
function parseMembers(body: string): Member[] {
  return [...body.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)(\?)?:\s*([^;]+);/gm)]
    .map((x) => ({ name: x[1], optional: x[2] === '?', type: x[3].trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function interfaceMembers(file: string, name: string): Member[] {
  const src = readFileSync(new URL(`../../src/types/${file}`, import.meta.url), 'utf8');
  const m = new RegExp(`export interface ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(src);
  if (!m) throw new Error(`interface ${name} not found in src/types/${file}`);
  return parseMembers(m[1]);
}

describe('Phase 3 hand-written types match the vendored spec (names, optionality, types)', () => {
  it('AthleteConnections', () => {
    expect(interfaceMembers('athlete.ts', 'AthleteConnections')).toEqual(schemaMembers('AthleteConnections'));
  });

  it('AthleteWithTags adds exactly the members the spec adds to Athlete', () => {
    const athleteNames = new Set(schemaMembers('Athlete').map((m) => m.name));
    const extra = schemaMembers('AthleteWithTags').filter((m) => !athleteNames.has(m.name));
    expect(extra.map((m) => m.name)).toEqual(['icu_notes', 'icu_tags']);
    const src = readFileSync(new URL('../../src/types/athlete.ts', import.meta.url), 'utf8');
    const alias = /export type AthleteWithTags = Athlete & \{([^}]*)\}/.exec(src);
    expect(alias, 'AthleteWithTags alias not found').toBeTruthy();
    expect(parseMembers(alias![1].replace(/;\s*$/, '') + ';')).toEqual(extra);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/types/spec-conformance.test.ts`
Expected: FAIL, `interface AthleteConnections not found in src/types/athlete.ts`.

- [ ] **Step 3: Add the types**

Append to `src/types/athlete.ts`:

```ts
/**
 * Devices and platform apps the athlete has connected (GET /athlete/{id}/connections).
 * One boolean per integration; the list mirrors the vendored spec exactly and is checked
 * by tests/types/spec-conformance.test.ts.
 */
export interface AthleteConnections {
  id?: string;
  garmin_health_connected?: boolean;
  garmin_training_connected?: boolean;
  polar_connected?: boolean;
  suunto_connected?: boolean;
  coros_connected?: boolean;
  concept2_connected?: boolean;
  zepp_connected?: boolean;
  huawei_connected?: boolean;
  wahoo_connected?: boolean;
  zwift_connected?: boolean;
  oura_connected?: boolean;
  whoop_connected?: boolean;
  strava_connected?: boolean;
  dropbox_connected?: boolean;
  hammerhead_connected?: boolean;
  tp_virtual_connected?: boolean;
  rouvy_connected?: boolean;
  mywhoosh_connected?: boolean;
  biketerra_connected?: boolean;
  tymewear_connected?: boolean;
}

/** An athlete as returned by GET /athletes: the profile plus the caller's tags and notes for them. */
export type AthleteWithTags = Athlete & { icu_tags?: string[]; icu_notes?: string; };
```

Append to `src/types/activity.ts`:

```ts
/** Query for GET /athlete/{id}/activities/interval-search */
export interface IntervalSearchOptions {
  /** Minimum interval duration in seconds */
  minSecs: number;
  /** Maximum interval duration in seconds */
  maxSecs: number;
  /** Minimum interval intensity (% of threshold) */
  minIntensity: number;
  /** Maximum interval intensity (% of threshold) */
  maxIntensity: number;
  /** Interval-detection source; the spec enumerates exactly these four values */
  type?: 'AUTO' | 'POWER' | 'HR' | 'PACE';
  minReps?: number;
  maxReps?: number;
  limit?: number;
}

/** Query for GET /athlete/{id}/activities-around (the activity id itself is a method argument) */
export interface ActivitiesAroundOptions {
  /** Restrict to activities on this route (wire name, like ListActivitiesOptions.route_id) */
  route_id?: number;
  limit?: number;
}
```

(`IntervalSearchOptions.type` is a literal union, so no `ActivityType` import is needed for these two interfaces.)

Append to `src/types/event.ts`:

```ts
/** Query for GET /athlete/{id}/workouts.zip */
export interface WorkoutsZipOptions {
  /** File format for every workout in the zip */
  ext: WorkoutFormat;
  /** Oldest local date, ISO-8601 (inclusive) */
  oldest: string;
  /** Newest local date, ISO-8601 (inclusive) */
  newest: string;
  powerRange?: number;
  hrRange?: number;
  paceRange?: number;
  locale?: string;
}
```

and add `import type { WorkoutFormat } from './workout.js';` next to the existing `WorkoutDoc` import at the top of `event.ts`.

`src/types/index.ts`: add `AthleteConnections,` and `AthleteWithTags,` to the `// Athlete` block; `IntervalSearchOptions,` and `ActivitiesAroundOptions,` to the `// Activity` block; `WorkoutsZipOptions,` to the `// Event` block.

`src/index.ts`: add the same five names to the matching comment groups inside the `export type { ... } from './types/index.js'` block.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/types/spec-conformance.test.ts && npm run typecheck`
Expected: 2 tests PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/types/activity.ts src/types/athlete.ts src/types/event.ts src/types/index.ts src/index.ts tests/types/spec-conformance.test.ts
git commit -m "feat(types): Phase 3 option and response types; spec-conformance test

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 2: ActivityService — eight methods

**Files:**
- Modify: `src/services/activity.service.ts` (imports at top; append methods before the class's final `}`)
- Test: `tests/activities.test.ts` (append a new top-level describe)

**Interfaces:**
- Consumes: `IntervalSearchOptions`, `ActivitiesAroundOptions` from Task 1.
- Produces: `getActivities(ids: string[], options?: { intervals?: boolean }, athleteId?): Promise<Activity[]>`; `listActivitiesAround(activityId: string, options?: ActivitiesAroundOptions, athleteId?): Promise<Activity[]>` (options spread straight into params, keys are wire names); `searchActivitiesFull(q: string, options?: { limit?: number }, athleteId?): Promise<Activity[]>`; `searchIntervals(options: IntervalSearchOptions, athleteId?): Promise<Activity[]>`; `listActivityTags(athleteId?): Promise<string[]>`; `downloadActivitiesCSV(athleteId?): Promise<Buffer>`; `downloadGPX(activityId: string, options?: { power?: boolean; hr?: boolean }): Promise<Buffer>`; `deleteTombstone(activityId: string): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/activities.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/activities.test.ts -t "Phase 3"`
Expected: FAIL, `client.activities.getActivities is not a function`.

- [ ] **Step 3: Implement**

In `src/services/activity.service.ts`, add `IntervalSearchOptions, ActivitiesAroundOptions,` to the type import list at the top, then append inside the class (before its closing `}`):

```ts
  // ── Phase 3: multi-fetch, search, tags, exports ──

  /** Fetch multiple activities by id in one call. Ids the athlete does not own are ignored. */
  async getActivities(ids: string[], options?: { intervals?: boolean }, athleteId?: string): Promise<Activity[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Activity[]>({
      method: 'GET',
      url: `/athlete/${id}/activities/${ids.map(encodeURIComponent).join(',')}`,
      params: options as Record<string, unknown>,
    });
  }

  /** Activities before and after another activity, closest first; optionally only those on a route. */
  async listActivitiesAround(activityId: string, options?: ActivitiesAroundOptions, athleteId?: string): Promise<Activity[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Activity[]>({
      method: 'GET',
      url: `/athlete/${id}/activities-around`,
      params: { ...options, activity_id: activityId } as Record<string, unknown>, // id last: options cannot override it
    });
  }

  /** Search by name or tag and return full Activity objects (search.searchActivities returns summaries). */
  async searchActivitiesFull(q: string, options?: { limit?: number }, athleteId?: string): Promise<Activity[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Activity[]>({
      method: 'GET',
      url: `/athlete/${id}/activities/search-full`,
      params: { ...options, q } as Record<string, unknown>, // q last: options cannot override it
    });
  }

  /** Find activities containing intervals that match a duration and intensity window. */
  async searchIntervals(options: IntervalSearchOptions, athleteId?: string): Promise<Activity[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Activity[]>({
      method: 'GET',
      url: `/athlete/${id}/activities/interval-search`,
      params: options as unknown as Record<string, unknown>,
    });
  }

  /** Every tag that has been applied to the athlete's activities */
  async listActivityTags(athleteId?: string): Promise<string[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<string[]>({ method: 'GET', url: `/athlete/${id}/activity-tags` });
  }

  /** All activities as CSV */
  async downloadActivitiesCSV(athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/activities.csv`);
  }

  /** The activity as a GPX file, optionally with power and heart-rate extensions */
  async downloadGPX(activityId: string, options?: { power?: boolean; hr?: boolean }): Promise<Buffer> {
    return this.httpClient.download(`/activity/${encodeURIComponent(activityId)}/gpx-file`, { params: options as Record<string, unknown> });
  }

  /**
   * Remove the tombstone left by a deleted activity so the same file can be re-uploaded.
   * The id is URL-encoded: this route is destructive, and an unencoded delimiter (e.g. a trailing "#") would turn it into DELETE /activity/{id}.
   */
  async deleteTombstone(activityId: string): Promise<void> {
    await this.httpClient.request<void>({ method: 'DELETE', url: `/activity/${encodeURIComponent(activityId)}/tombstone` });
  }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run tests/activities.test.ts`
Expected: PASS (9 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/activity.service.ts tests/activities.test.ts
git commit -m "feat(activities): multi-fetch, around, full search, interval search, tags, CSV, GPX, tombstone

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 3: AthleteService — four methods

**Files:**
- Modify: `src/services/athlete.service.ts`
- Test: `tests/athlete.test.ts` (append)

**Interfaces:**
- Consumes: `AthleteConnections`, `AthleteWithTags` from Task 1.
- Produces: `listAthletes(options?: { extIdPrefix?: string }): Promise<AthleteWithTags[]>`; `getConnections(athleteId?): Promise<AthleteConnections>`; `getSettings(deviceClass: 'phone' | 'tablet' | 'desktop' | string, athleteId?): Promise<Record<string, Record<string, unknown>>>`; `disconnectApp(): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/athlete.test.ts`:

```ts
describe('AthleteService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('listAthletes hits /athletes and maps extIdPrefix to ext_id_prefix', async () => {
    await client.athletes.listAthletes({ extIdPrefix: 'strava' });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athletes');
    expect(seen[0].params).toEqual({ ext_id_prefix: 'strava' });
  });

  it('listAthletes without options sends no params', async () => {
    await client.athletes.listAthletes();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].params).toBeUndefined();
  });

  it('getConnections hits /athlete/{id}/connections', async () => {
    await client.athletes.getConnections();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/connections');
  });

  it('getSettings puts the device class in the path', async () => {
    await client.athletes.getSettings('desktop');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/settings/desktop');
  });

  it('disconnectApp sends DELETE /disconnect-app', async () => {
    await client.athletes.disconnectApp();
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/disconnect-app');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/athlete.test.ts -t "Phase 3"`
Expected: FAIL, `listAthletes is not a function`.

- [ ] **Step 3: Implement**

In `src/services/athlete.service.ts` add `AthleteConnections, AthleteWithTags,` to the import list, then append inside the class:

```ts
  // ── Phase 3 ──

  /** Athletes the caller follows or coaches, including the caller. Requires API-key authentication (not available to OAuth app tokens). */
  async listAthletes(options?: { extIdPrefix?: string }): Promise<AthleteWithTags[]> {
    const params = options?.extIdPrefix !== undefined ? { ext_id_prefix: options.extIdPrefix } : undefined;
    return this.httpClient.request<AthleteWithTags[]>({ method: 'GET', url: '/athletes', params });
  }

  /** Which devices and platform apps the athlete has connected */
  async getConnections(athleteId?: string): Promise<AthleteConnections> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<AthleteConnections>({ method: 'GET', url: `/athlete/${id}/connections` });
  }

  /** UI settings for a device class: a map of setting groups, each an open object (spec: object of objects). */
  async getSettings(deviceClass: 'phone' | 'tablet' | 'desktop' | string, athleteId?: string): Promise<Record<string, Record<string, unknown>>> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Record<string, Record<string, unknown>>>({ method: 'GET', url: `/athlete/${id}/settings/${encodeURIComponent(deviceClass)}` });
  }

  /**
   * Disconnect the OAuth app that owns the current access token from the athlete's account.
   * Irreversible from the API; the SDK never calls this in its live tests.
   */
  async disconnectApp(): Promise<void> {
    await this.httpClient.request<void>({ method: 'DELETE', url: '/disconnect-app' });
  }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run tests/athlete.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/athlete.service.ts tests/athlete.test.ts
git commit -m "feat(athletes): listAthletes, getConnections, getSettings, disconnectApp

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 4: ChatService — five methods

**Files:**
- Modify: `src/services/chat.service.ts`
- Test: `tests/chat.test.ts` (append)

**Interfaces:**
- Produces: `getChat(chatId: number): Promise<Chat>`; `listGroups(athleteId?): Promise<Chat[]>`; `blockChat(chatId: number, on: boolean): Promise<Chat>`; `updateMessage(chatId: number, messageId: number, message: UpdateMessageDTO): Promise<Record<string, unknown>>` (`UpdateMessageDTO = { content?: string; answer?: string }`, the only fields the API updates); `deleteMessage(chatId: number, messageId: number): Promise<Record<string, unknown>>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/chat.test.ts`:

```ts
describe('ChatService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getChat hits /chats/{id}', async () => {
    await client.chats.getChat(42);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/chats/42');
  });

  it('listGroups hits /athlete/{id}/groups', async () => {
    await client.chats.listGroups();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/groups');
  });

  it('blockChat PUTs /chats/{id}/block with on as a query param', async () => {
    await client.chats.blockChat(42, true);
    expect(seen[0].method).toBe('PUT');
    expect(seen[0].url).toBe('/chats/42/block');
    expect(seen[0].params).toEqual({ on: true });
  });

  it('updateMessage PUTs the message body to /chats/{id}/messages/{msgId}', async () => {
    await client.chats.updateMessage(42, 7, { content: 'edited' });
    expect(seen[0].method).toBe('PUT');
    expect(seen[0].url).toBe('/chats/42/messages/7');
    expect(seen[0].data).toEqual({ content: 'edited' });
  });

  it('deleteMessage sends DELETE /chats/{id}/messages/{msgId}', async () => {
    await client.chats.deleteMessage(42, 7);
    expect(seen[0].method).toBe('DELETE');
    expect(seen[0].url).toBe('/chats/42/messages/7');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/chat.test.ts -t "Phase 3"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append inside the `ChatService` class in `src/services/chat.service.ts`:

```ts
  // ── Phase 3 ──

  /** One chat by id */
  async getChat(chatId: number): Promise<Chat> {
    return this.httpClient.request<Chat>({ method: 'GET', url: `/chats/${chatId}` });
  }

  /** Group chats for the athlete, in name order */
  async listGroups(athleteId?: string): Promise<Chat[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Chat[]>({ method: 'GET', url: `/athlete/${id}/groups` });
  }

  /** Block (on = true) or unblock the other athlete in a private chat */
  async blockChat(chatId: number, on: boolean): Promise<Chat> {
    return this.httpClient.request<Chat>({ method: 'PUT', url: `/chats/${chatId}/block`, params: { on } });
  }

  /** Edit a message's content or answer (the only fields the API updates). Returns an untyped object. */
  async updateMessage(chatId: number, messageId: number, message: UpdateMessageDTO): Promise<Record<string, unknown>> {
    return this.httpClient.request<Record<string, unknown>>({ method: 'PUT', url: `/chats/${chatId}/messages/${messageId}`, data: message });
  }

  /** Delete a message. The API returns an untyped object. */
  async deleteMessage(chatId: number, messageId: number): Promise<Record<string, unknown>> {
    return this.httpClient.request<Record<string, unknown>>({ method: 'DELETE', url: `/chats/${chatId}/messages/${messageId}` });
  }
```

(`Chat` and `Message` are already imported; add `UpdateMessageDTO` to that import. Define it in `src/types/chat.ts` as `export interface UpdateMessageDTO { content?: string; answer?: string; }` with a doc comment quoting the spec, export it from both barrels, and add `tests/types/update-message.types.ts` with accepted `{content}`, `{answer}` cases and `@ts-expect-error` cases for `athlete_id`, `seen`, `id`. Also add `blocked?: string;` (ISO-8601, set while the other athlete is blocked) to `interface Chat`.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run tests/chat.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/chat.service.ts tests/chat.test.ts
git commit -m "feat(chats): getChat, listGroups, blockChat, updateMessage, deleteMessage

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 5: EventService (three) and WorkoutService (one)

**Files:**
- Modify: `src/services/event.service.ts`, `src/services/workout.service.ts`
- Test: `tests/events.test.ts`, `tests/workouts.test.ts` (append to each)

**Interfaces:**
- Consumes: `WorkoutsZipOptions` from Task 1.
- Produces: `events.listEventTags(athleteId?): Promise<string[]>`; `events.listFitnessModelEvents(athleteId?): Promise<Event[]>`; `events.downloadWorkoutsZip(options: WorkoutsZipOptions, athleteId?): Promise<Buffer>`; `workouts.listWorkoutTags(athleteId?): Promise<string[]>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/events.test.ts`:

```ts
describe('EventService — Phase 3 additions', () => {
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

  it('listEventTags hits /athlete/{id}/event-tags', async () => {
    await client.events.listEventTags();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/event-tags');
  });

  it('listFitnessModelEvents hits /athlete/{id}/fitness-model-events', async () => {
    await client.events.listFitnessModelEvents();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/fitness-model-events');
  });

  it('downloadWorkoutsZip downloads /workouts.zip with a dot-less ext and the date range as params', async () => {
    const out = await client.events.downloadWorkoutsZip({ ext: '.zwo', oldest: '2026-01-01', newest: '2026-02-01', locale: 'en' });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/workouts.zip');
    expect(seen[0].params).toEqual({ ext: 'zwo', oldest: '2026-01-01', newest: '2026-02-01', locale: 'en' });
    expect(seen[0].responseType).toBe('arraybuffer');
    expect(Buffer.isBuffer(out)).toBe(true);
  });
});
```

Append to `tests/workouts.test.ts`:

```ts
describe('WorkoutService — Phase 3 additions', () => {
  it('listWorkoutTags hits /athlete/{id}/workout-tags', async () => {
    const seen: any[] = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return []; });
    const c = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    await c.workouts.listWorkoutTags();
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/workout-tags');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/events.test.ts tests/workouts.test.ts -t "Phase 3"`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/services/event.service.ts`: add `WorkoutsZipOptions,` to the import list; append inside the class:

```ts
  // ── Phase 3 ──

  /** Every tag that has been applied to events on the athlete's calendar */
  async listEventTags(athleteId?: string): Promise<string[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<string[]>({ method: 'GET', url: `/athlete/${id}/event-tags` });
  }

  /** Events that influence the fitness (CTL/ATL) calculation, in ascending date order */
  async listFitnessModelEvents(athleteId?: string): Promise<Event[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Event[]>({ method: 'GET', url: `/athlete/${id}/fitness-model-events` });
  }

  /**
   * Calendar workouts in a date range as a zip of files in the requested format.
   * The API's `ext` query value has no leading dot (spec: "zwo, mrc, erg or fit"),
   * unlike the `{ext}` path suffix routes, so the dot in WorkoutFormat is stripped here.
   */
  async downloadWorkoutsZip(options: WorkoutsZipOptions, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    const params = { ...options, ext: options.ext.replace(/^\./, '') } as Record<string, unknown>;
    return this.httpClient.download(`/athlete/${id}/workouts.zip`, { params });
  }
```

`src/services/workout.service.ts`: append inside the class:

```ts
  /** Every tag that has been applied to workouts in the athlete's library */
  async listWorkoutTags(athleteId?: string): Promise<string[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<string[]>({ method: 'GET', url: `/athlete/${id}/workout-tags` });
  }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run tests/events.test.ts tests/workouts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/event.service.ts src/services/workout.service.ts tests/events.test.ts tests/workouts.test.ts
git commit -m "feat(events,workouts): event/workout tags, fitness-model events, workouts.zip

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 6: GearService (three) and SportSettingsService (two)

**Files:**
- Modify: `src/services/gear.service.ts`, `src/services/sport-settings.service.ts`
- Test: `tests/gear.test.ts`, `tests/sport-settings.test.ts` (append to each)

**Interfaces:**
- Produces: `gear.list(athleteId?): Promise<Gear[]>`; `gear.downloadCSV(athleteId?): Promise<Buffer>`; `gear.calc(gearId: string, athleteId?): Promise<GearStats>`; `sportSettings.listMatchingActivities(settingsId: number | string, athleteId?): Promise<ActivitySearchResult[]>`; `sportSettings.getPaceDistances(settingsId: number | string, athleteId?): Promise<PaceDistancesDTO>`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/gear.test.ts`:

```ts
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
});
```

Append to `tests/sport-settings.test.ts`:

```ts
describe('SportSettingsService — Phase 3 additions', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return []; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('listMatchingActivities hits .../sport-settings/{id}/matching-activities', async () => {
    await client.sportSettings.listMatchingActivities(5);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/sport-settings/5/matching-activities');
  });

  it('getPaceDistances hits .../sport-settings/{id}/pace_distances', async () => {
    await client.sportSettings.getPaceDistances(5);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/sport-settings/5/pace_distances');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/gear.test.ts tests/sport-settings.test.ts -t "Phase 3"`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/services/gear.service.ts`: change the import to `import type { Gear, GearReminder, GearStats } from '../types/index.js';` and append inside the class:

```ts
  // ── Phase 3 ──

  /** All of the athlete's gear */
  async list(athleteId?: string): Promise<Gear[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Gear[]>({ method: 'GET', url: `/athlete/${id}/gear` });
  }

  /** All of the athlete's gear as CSV */
  async downloadCSV(athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/gear.csv`);
  }

  /** Recalculate distance / time / activity totals for one item of gear */
  async calc(gearId: string, athleteId?: string): Promise<GearStats> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<GearStats>({ method: 'GET', url: `/athlete/${id}/gear/${encodeURIComponent(gearId)}/calc` });
  }
```

`src/services/sport-settings.service.ts`: change the import to `import type { SportSettings, ActivitySearchResult, PaceDistancesDTO } from '../types/index.js';` and append inside the class:

```ts
  // ── Phase 3 ──

  /** Activities whose type falls under these sport settings */
  async listMatchingActivities(settingsId: number | string, athleteId?: string): Promise<ActivitySearchResult[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<ActivitySearchResult[]>({ method: 'GET', url: `/athlete/${id}/sport-settings/${encodeURIComponent(String(settingsId))}/matching-activities` });
  }

  /** Pace-curve distances and best-effort defaults for the sport */
  async getPaceDistances(settingsId: number | string, athleteId?: string): Promise<PaceDistancesDTO> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PaceDistancesDTO>({ method: 'GET', url: `/athlete/${id}/sport-settings/${encodeURIComponent(String(settingsId))}/pace_distances` });
  }
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/gear.service.ts src/services/sport-settings.service.ts tests/gear.test.ts tests/sport-settings.test.ts
git commit -m "feat(gear,sport-settings): gear list/CSV/calc, matching activities, pace distances

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 7: PR A live tests and coverage baseline

**Files:**
- Create: `tests/live/phase3.live.test.ts`
- Modify: `spec/coverage-baseline.json` (regenerated)

**Interfaces:**
- Produces: `tests/live/phase3.live.test.ts` with `today()`, `yearAgo()`, `latestActivityId()` helpers; Task 11 appends the analytics cases to the same file.

- [ ] **Step 1: Create the live test file**

```ts
import { describe, it, expect } from 'vitest';
import { LIVE, LIVE_WRITE, athleteId, liveClient } from './setup.js';

const today = () => new Date().toISOString().slice(0, 10);
const yearAgo = () => new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);

/** Latest activity with a usable type (skips this account's malformed Strava-import stubs). */
async function latestActivityId(): Promise<string | undefined> {
  const activities = await liveClient().activities.listActivities({ oldest: yearAgo(), newest: today() });
  return activities.find((a) => a.type)?.id;
}

describe.skipIf(!LIVE)('live: phase 3 — existing services', () => {
  const c = () => liveClient();

  it('getActivities returns the latest activity by id', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const list = await c().activities.getActivities([id as string]);
    expect(list.map((a) => a.id)).toContain(id);
  });
  it('listActivitiesAround responds for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(Array.isArray(await c().activities.listActivitiesAround(id as string, { limit: 3 }))).toBe(true);
  });
  it('searchActivitiesFull responds', async () => {
    expect(Array.isArray(await c().activities.searchActivitiesFull('a', { limit: 2 }))).toBe(true);
  });
  it('searchIntervals responds', async () => {
    const r = await c().activities.searchIntervals({ minSecs: 60, maxSecs: 3600, minIntensity: 0, maxIntensity: 300, limit: 2 });
    expect(Array.isArray(r)).toBe(true);
  });
  it('listActivityTags responds', async () => {
    expect(Array.isArray(await c().activities.listActivityTags())).toBe(true);
  });
  it('downloadActivitiesCSV returns CSV text', async () => {
    const csv = await c().activities.downloadActivitiesCSV();
    expect(csv.toString().split('\n')[0]).toContain('id');
  });
  it('downloadGPX returns a GPX document for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect((await c().activities.downloadGPX(id as string)).toString()).toContain('<gpx');
  });

  it('listAthletes includes the caller', async () => {
    const list = await c().athletes.listAthletes();
    expect(list.map((a) => a.id)).toContain(athleteId());
  });
  it('getConnections responds with an id', async () => {
    expect((await c().athletes.getConnections()).id).toBe(athleteId());
  });
  it('getSettings responds for desktop', async () => {
    expect(await c().athletes.getSettings('desktop')).toBeTypeOf('object');
  });
  // athletes.disconnectApp() is deliberately never called: it revokes the calling app.

  it('getChat returns the first chat', async (ctx) => {
    const [chat] = await c().chats.listChats();
    if (!chat?.id) ctx.skip();
    expect((await c().chats.getChat(chat.id as number)).id).toBe(chat.id);
  });
  it('listGroups responds', async () => {
    expect(Array.isArray(await c().chats.listGroups())).toBe(true);
  });

  it('listEventTags responds', async () => {
    expect(Array.isArray(await c().events.listEventTags())).toBe(true);
  });
  it('listFitnessModelEvents responds', async () => {
    expect(Array.isArray(await c().events.listFitnessModelEvents())).toBe(true);
  });
  it('downloadWorkoutsZip returns a zip when the calendar has workouts', async (ctx) => {
    const events = await c().events.listEvents({ oldest: yearAgo(), newest: today(), category: ['WORKOUT'] });
    if (events.length === 0) ctx.skip();
    const zip = await c().events.downloadWorkoutsZip({ ext: '.zwo', oldest: yearAgo(), newest: today() });
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  });

  it('gear.list and gear.downloadCSV respond', async () => {
    expect(Array.isArray(await c().gear.list())).toBe(true);
    expect((await c().gear.downloadCSV()).length).toBeGreaterThan(0);
  });
  it('gear.calc responds for the first item of gear', async (ctx) => {
    const [g] = await c().gear.list();
    if (!g?.id) ctx.skip();
    expect(await c().gear.calc(g.id as string)).toBeTypeOf('object');
  });

  it('sport settings matching-activities and pace_distances respond for the first settings', async (ctx) => {
    const [s] = await c().sportSettings.list();
    if (s?.id === undefined) ctx.skip();
    expect(Array.isArray(await c().sportSettings.listMatchingActivities(s.id as number))).toBe(true);
    expect(await c().sportSettings.getPaceDistances(s.id as number)).toBeTypeOf('object');
  });

  it('listWorkoutTags responds', async () => {
    expect(Array.isArray(await c().workouts.listWorkoutTags())).toBe(true);
  });
});

describe.skipIf(!LIVE_WRITE)('live (write): phase 3 chat mutations', () => {
  const c = () => liveClient();

  // Every write below restores state in a `finally` so a failed assertion or a thrown
  // request cannot leave the account blocked or with a stray message.
  it('blockChat toggles a private chat and restores its original state', async (ctx) => {
    const chat = (await c().chats.listChats()).find((x) => x.type === 'PRIVATE' && typeof x.id === 'number');
    if (!chat) ctx.skip();
    const chatId = chat!.id as number;
    // Restore whatever the chat was before, so an already-blocked chat stays blocked.
    const wasBlocked = Boolean(chat!.blocked);
    let restored: Chat | undefined;
    try {
      const toggled = await c().chats.blockChat(chatId, !wasBlocked);
      expect(toggled.id).toBe(chatId);
    } finally {
      restored = await c().chats.blockChat(chatId, wasBlocked);
    }
    expect(restored.id).toBe(chatId);
  });

  it('updateMessage and deleteMessage act on a message this test sent to the caller', async () => {
    const content = `phase 3 live test ${Date.now()}`;
    const edited = `${content} (edited)`;
    let chatId: number | undefined;
    let msgId: number | undefined;
    // Find the message by its unique content (original or edited) across the caller's chats.
    const recover = async () => {
      for (const chat of await c().chats.listChats()) {
        if (typeof chat.id !== 'number') continue;
        const hit = (await c().chats.listMessages(chat.id, { limit: 20 })).find((m) => m.content === content || m.content === edited);
        if (typeof hit?.id === 'number') {
          chatId = chat.id;
          msgId = hit.id;
          return;
        }
      }
    };
    try {
      const sent = await c().chats.sendMessage({ to_athlete_id: athleteId(), content, type: 'TEXT' });
      // `chat_id` is not in the vendored Message schema; read it defensively from the raw
      // response and fall back to the new chat's id. Verified only when LIVE_WRITE runs.
      chatId = (sent.message as { chat_id?: number } | undefined)?.chat_id ?? sent.new_chat?.id;
      msgId = sent.message?.id ?? sent.id;
      if (typeof chatId !== 'number' || typeof msgId !== 'number') await recover();
      expect(chatId, `could not determine the chat id of the sent message: ${JSON.stringify(sent)}`).toBeTypeOf('number');
      expect(msgId, `could not determine the message id of the sent message: ${JSON.stringify(sent)}`).toBeTypeOf('number');
      await c().chats.updateMessage(chatId as number, msgId as number, { content: edited });
      const after = await c().chats.listMessages(chatId as number, { limit: 20 });
      expect(after.find((m) => m.id === msgId)?.content).toBe(edited);
    } finally {
      // The send may have been accepted even if its response was lost or recovery threw:
      // try recovery once more, then delete whenever the ids are known.
      if (typeof chatId !== 'number' || typeof msgId !== 'number') {
        try {
          await recover();
        } catch {
          // Nothing more can be done here; the failing assertion above carries the response body.
        }
      }
      if (typeof chatId === 'number' && typeof msgId === 'number') {
        await c().chats.deleteMessage(chatId, msgId);
      }
    }
  });

});

// Irreversible: there is no API to recreate a tombstone, so nothing here can be cleaned up.
// LIVE_WRITE is not enough. This block also needs INTERVALS_LIVE_DESTRUCTIVE=1, a separate
// opt-in that says "I accept permanent changes", plus the tombstoned activity id to clear.
const DESTRUCTIVE = LIVE_WRITE && process.env.INTERVALS_LIVE_DESTRUCTIVE === '1' && !!process.env.INTERVALS_TOMBSTONE_ID;
describe.skipIf(!DESTRUCTIVE)('live (write, irreversible): deleteTombstone', () => {
  it('deleteTombstone clears the supplied tombstone', async () => {
    await expect(liveClient().activities.deleteTombstone(process.env.INTERVALS_TOMBSTONE_ID as string)).resolves.toBeUndefined();
  });
});
```

`Message` in `src/types/chat.ts` has no `chat_id` field and must not gain one: the vendored spec does not declare it. The write test above reads it from the raw response via a local cast (`(sent.message as { chat_id?: number } | undefined)?.chat_id`) and falls back to `sent.new_chat?.id`.

- [ ] **Step 2: Typecheck the live file and rewrite the baseline**

Run: `npm run typecheck && node scripts/coverage.mjs --write-baseline && npm run coverage:api`
Expected: typecheck clean (the tests tsconfig covers `tests/live`); coverage prints `Spec ops covered: 139`, `Missing: 10`, `New phantom (regressions): 0`, `Stale baseline entries: 0 resolved phantom, 0 newly covered`, exit 0.

- [ ] **Step 3: Run the live suite (user-run if no key in this environment)**

Run: `set -a && . ./.env && set +a && npm run test:live`
Expected: every read-only case passes or is reported skipped; no failures. With `INTERVALS_LIVE_WRITE=1` also set, the cleanup-guaranteed write block runs; the irreversible `deleteTombstone` block runs only if `INTERVALS_LIVE_DESTRUCTIVE=1` and `INTERVALS_TOMBSTONE_ID` are both also set. If the key is not available to the implementer, record "live suite not run; user to run before merge" in the task report and continue.

- [ ] **Step 4: Commit**

```bash
git add tests/live/phase3.live.test.ts spec/coverage-baseline.json
git commit -m "test(live): Phase 3 read-only and write-gated cases; baseline 139 covered

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 8: PR A docs, version, PR

**Files:**
- Modify: `CHANGELOG.md`, `README.md`, `package.json`, `package-lock.json`

- [ ] **Step 1: CHANGELOG**

Under `## [Unreleased]` → `### Added`, insert at the top of the list:

```markdown
- Activities: `getActivities(ids)`, `listActivitiesAround()`, `searchActivitiesFull()`, `searchIntervals()`, `listActivityTags()`, `downloadActivitiesCSV()`, `downloadGPX()`, `deleteTombstone()`.
- Athletes: `listAthletes()`, `getConnections()`, `getSettings(deviceClass)`, `disconnectApp()`.
- Chats: `getChat()`, `listGroups()`, `blockChat()`, `updateMessage()`, `deleteMessage()`.
- Events: `listEventTags()`, `listFitnessModelEvents()`, `downloadWorkoutsZip()`. Workouts: `listWorkoutTags()`.
- Gear: `list()`, `downloadCSV()`, `calc()`. Sport settings: `listMatchingActivities()`, `getPaceDistances()`.
- Types: `AthleteConnections`, `AthleteWithTags`, `IntervalSearchOptions`, `ActivitiesAroundOptions`, `WorkoutsZipOptions`; `tests/types/spec-conformance.test.ts` checks new hand-written types against the vendored spec.
```

- [ ] **Step 2: README service table**

Update these rows (line numbers approximate; match on the bold name):

- **Athletes**: append `, listAthletes, getConnections, getSettings, disconnectApp`.
- **Activities**: append `, getActivities, listActivitiesAround, searchActivitiesFull, searchIntervals, listActivityTags, downloadActivitiesCSV, downloadGPX, deleteTombstone`.
- **Events**: append `, listEventTags, listFitnessModelEvents, downloadWorkoutsZip`.
- **Workouts**: append `, listWorkoutTags`.
- **Sport Settings**: append `, listMatchingActivities, getPaceDistances`.
- **Gear**: prepend `list, downloadCSV, calc, ` before `create`.
- **Chats**: append `, getChat, listGroups, blockChat, updateMessage, deleteMessage`.
- Line 9 (the intro blockquote): change `114 of 149 spec operations covered` to `139 of 149 spec operations covered`.

- [ ] **Step 3: Version**

Run: `npm pkg set version=3.0.0-alpha.2 && npm install --package-lock-only`

- [ ] **Step 4: Verify everything**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run coverage:api`
Expected: lint 0 errors; typecheck clean; all unit tests pass (≈ 223 + 30 new); build ok; coverage 139 covered, exit 0.

- [ ] **Step 5: Commit, push, PR**

```bash
git add CHANGELOG.md README.md package.json package-lock.json
git commit -m "docs: changelog and README for Phase 3 PR A; bump to 3.0.0-alpha.2

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
git push -u origin phase-3/complete-services
gh pr create --base main --title "Phase 3 (A): complete the existing services — 25 spec ops, 139/149 covered" --body-file <(cat <<'EOF'
## Summary
Adds the 25 spec operations that belong in existing services (26 methods). Additive only. Coverage 114 → 139 of 149; 0 phantom.

Per `docs/superpowers/specs/2026-09-21-phase-3-full-coverage-design.md`. PR B will add `AnalyticsService` for the remaining 10 and switch CI to `--strict`.

## Verification
- unit: `npm test` green (counts in the last commit)
- `npm run typecheck` (src, examples, tests/types, tests/live) clean
- `npm run coverage:api`: 139 covered / 10 missing / 0 phantom
- live: `tests/live/phase3.live.test.ts` (state whether it was run and with which env)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Then: whole-branch review, CodeRabbit, Codex Daybreak xHigh rounds (ceiling five), user merges.

---

## PR B — AnalyticsService

Branch `phase-3/analytics-service` from `main` after PR A merges.

### Task 9: PR B types

**Files:**
- Modify: `src/types/activity.ts` (append), `src/types/performance.ts` (append), `src/types/index.ts`, `src/index.ts`
- Test: `tests/types/spec-conformance.test.ts` (append two cases)

**Interfaces:**
- Produces: `Bucket`, `TimeAtHRPlot` (activity.ts); `ActivityPowerCurvesOptions`, `ActivityPaceCurvesOptions` (performance.ts). Task 10 imports all four.

- [ ] **Step 1: Write the failing conformance cases**

Append inside the `describe` in `tests/types/spec-conformance.test.ts`:

```ts
  it('Bucket', () => {
    expect(interfaceMembers('activity.ts', 'Bucket')).toEqual(schemaMembers('Bucket'));
  });

  it('TimeAtHRPlot matches the spec schema named Plot', () => {
    expect(interfaceMembers('activity.ts', 'TimeAtHRPlot')).toEqual(schemaMembers('Plot'));
  });
```

Also add, in the same file, a helper that reads a route's query parameters and cases for the five query-option types (three from PR A, two from this PR). Place `paramMembers` next to `schemaMembers`:

```ts
/**
 * Query parameters of one spec operation as Members. `overrides` names members whose
 * hand-written type deliberately differs from the schema's primitive (e.g. a shared union
 * type used across the SDK), and `omit` drops parameters that are method arguments rather
 * than option-object members.
 */
function paramMembers(path: string, verb: string, opts: { overrides?: Record<string, string>; omit?: string[] } = {}): Member[] {
  const op = spec.paths[`/api/v1${path}`]?.[verb];
  if (!op) throw new Error(`${verb.toUpperCase()} ${path} not in spec/openapi.json`);
  return (op.parameters ?? [])
    .filter((p: any) => p.in === 'query' && !(opts.omit ?? []).includes(p.name))
    .map((p: any) => ({
      name: p.name,
      optional: !p.required,
      type: opts.overrides?.[p.name] ?? (p.schema?.enum ? p.schema.enum.map((v: string) => `'${v}'`).join(' | ') : tsType(p.schema ?? {})),
    }))
    .sort((a: Member, b: Member) => a.name.localeCompare(b.name));
}
```

and these cases inside the describe (the PR A option types were hand-verified when they landed; this pins them):

```ts
  it('IntervalSearchOptions matches the interval-search query parameters', () => {
    expect(interfaceMembers('activity.ts', 'IntervalSearchOptions')).toEqual(paramMembers('/athlete/{id}/activities/interval-search', 'get'));
  });

  it('ActivitiesAroundOptions matches the activities-around query parameters minus activity_id', () => {
    expect(interfaceMembers('activity.ts', 'ActivitiesAroundOptions')).toEqual(paramMembers('/athlete/{id}/activities-around', 'get', { omit: ['activity_id'] }));
  });

  it('WorkoutsZipOptions matches the workouts.zip query parameters (ext is the shared WorkoutFormat union)', () => {
    expect(interfaceMembers('event.ts', 'WorkoutsZipOptions')).toEqual(paramMembers('/athlete/{id}/workouts.zip', 'get', { overrides: { ext: 'WorkoutFormat' } }));
  });

  it('ActivityPowerCurvesOptions matches the activity power-curves query parameters', () => {
    expect(interfaceMembers('performance.ts', 'ActivityPowerCurvesOptions')).toEqual(paramMembers('/activity/{id}/power-curves{ext}', 'get'));
  });

  it('ActivityPaceCurvesOptions matches the activity-pace-curves query parameters minus filters', () => {
    expect(interfaceMembers('performance.ts', 'ActivityPaceCurvesOptions')).toEqual(paramMembers('/athlete/{id}/activity-pace-curves{ext}', 'get', { omit: ['filters'], overrides: { type: 'ActivityType' } }));
  });
```

If a case fails because the spec declares a parameter type this mapping does not model (for example `types` as an array of strings maps to `string[]`, which is what the interface declares), fix the mapping in `tsType`, not the interface, unless the interface is genuinely wrong. Also update the file's docstring to say the test covers schema-backed types AND query-option types.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/types/spec-conformance.test.ts`
Expected: the `Bucket`, `TimeAtHRPlot`, `ActivityPowerCurvesOptions` and `ActivityPaceCurvesOptions` cases FAIL (`interface ... not found`); the three PR A option-type cases PASS already.

- [ ] **Step 3: Add the types**

Append to `src/types/activity.ts`:

```ts
/** One bar of a power / HR / pace / GAP histogram (GET /activity/{id}/*-histogram) */
export interface Bucket {
  /** Bucket lower bound (watts, bpm, or seconds per km depending on the histogram) */
  start?: number;
  /** Elapsed seconds in the bucket */
  secs?: number;
  /** Moving seconds in the bucket */
  movingSecs?: number;
  watts?: number;
  hr?: number;
  cadence?: number;
}

/** Time-at-heart-rate distribution (GET /activity/{id}/time-at-hr); spec schema name `Plot` */
export interface TimeAtHRPlot {
  max_bpm?: number;
  min_bpm?: number;
  /** Seconds spent at each bpm from min_bpm upward */
  secs?: number[];
  /** Cumulative seconds at or above each bpm */
  cumulative_secs?: number[];
}
```

Append to `src/types/performance.ts`:

```ts
/** Query for GET /activity/{id}/power-curves{ext} */
export interface ActivityPowerCurvesOptions {
  /** Streams required, e.g. ['watts', 'pace'] (default watts) */
  types?: string[];
  /** Which curves to return: any of 'normal', 'kj0', 'kj1' (normal and/or fatigued) */
  fatigue?: string[];
}

/**
 * Query for GET /athlete/{id}/activity-pace-curves{ext}. The spec's `filters` param (an
 * array of ActivityFilter objects) is omitted until its query-string encoding is verified live.
 */
export interface ActivityPaceCurvesOptions {
  /** Oldest local date, ISO-8601 */
  oldest: string;
  /** Newest local date, ISO-8601 */
  newest: string;
  /** Sport; the spec enumerates the full ActivityType list here */
  type?: ActivityType;
  /** Distances in metres */
  distances?: number[];
  /** Use grade-adjusted pace */
  gap?: boolean;
}
```

Exports: add `Bucket,` and `TimeAtHRPlot,` to the `// Activity` block and `ActivityPowerCurvesOptions,` and `ActivityPaceCurvesOptions,` to the `// Performance` block in both `src/types/index.ts` and `src/index.ts`.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/types/spec-conformance.test.ts && npm run typecheck`
Expected: 9 tests PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/types/activity.ts src/types/performance.ts src/types/index.ts src/index.ts tests/types/spec-conformance.test.ts
git commit -m "feat(types): Bucket, TimeAtHRPlot, analytics option types

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 10: AnalyticsService and wiring

**Files:**
- Create: `src/services/analytics.service.ts`
- Modify: `src/client.ts` (import, field, constructor), `src/index.ts` (service export)
- Create: `tests/analytics.test.ts`

**Interfaces:**
- Consumes: Task 9 types; `PowerModel`, `PowerCurve`, `PaceCurveSet`, `Interval` (existing).
- Produces: `client.analytics: AnalyticsService` with the twelve methods listed in the spec's PR B table.

- [ ] **Step 1: Write the failing tests**

Create `tests/analytics.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('AnalyticsService', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => {
      seen.push(config);
      return config.responseType === 'arraybuffer' ? Buffer.from('secs,watts') : [];
    });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('is exposed as client.analytics and exported from the package', async () => {
    const mod = await import('../src/index.js');
    expect(client.analytics).toBeInstanceOf(mod.AnalyticsService);
  });

  it.each([
    ['getPowerHistogram', '/activity/a1/power-histogram', { bucketSize: 25 }],
    ['getHRHistogram', '/activity/a1/hr-histogram', { bucketSize: 5 }],
  ] as const)('%s hits %s with bucketSize', async (method, url, opts) => {
    await (client.analytics as any)[method]('a1', opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe(url);
    expect(seen[0].params).toEqual(opts);
  });

  it.each([
    ['getPaceHistogram', '/activity/a1/pace-histogram'],
    ['getGAPHistogram', '/activity/a1/gap-histogram'],
    ['getTimeAtHR', '/activity/a1/time-at-hr'],
    ['getPowerSpikeModel', '/activity/a1/power-spike-model'],
  ] as const)('%s hits %s', async (method, url) => {
    await (client.analytics as any)[method]('a1');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe(url);
    expect(seen[0].params).toBeUndefined();
  });

  it('getIntervalStats sends start_index and end_index', async () => {
    await client.analytics.getIntervalStats('a1', 100, 400);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/activity/a1/interval-stats');
    expect(seen[0].params).toEqual({ start_index: 100, end_index: 400 });
  });

  it('getActivityPowerCurves passes types and fatigue; CSV sibling downloads .csv', async () => {
    await client.analytics.getActivityPowerCurves('a1', { types: ['watts', 'pace'], fatigue: ['normal', 'kj0'] });
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/activity/a1/power-curves');
    expect(seen[0].params).toEqual({ types: ['watts', 'pace'], fatigue: ['normal', 'kj0'] });
    const csv = await client.analytics.getActivityPowerCurvesCSV('a1', { types: ['power'] });
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/activity/a1/power-curves.csv');
    expect(seen[1].params).toEqual({ types: ['power'] });
    expect(seen[1].responseType).toBe('arraybuffer');
    expect(csv.toString()).toBe('secs,watts');
  });

  it('getMMPModel sends type and is athlete-scoped', async () => {
    await client.analytics.getMMPModel('Ride');
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/mmp-model');
    expect(seen[0].params).toEqual({ type: 'Ride' });
    await client.analytics.getMMPModel('Run', 'other');
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/athlete/other/mmp-model');
  });

  it('getActivityPaceCurves passes the date range and distances; CSV sibling downloads .csv', async () => {
    const opts = { oldest: '2026-01-01', newest: '2026-03-01', type: 'Run', distances: [1000, 5000], gap: true };
    await client.analytics.getActivityPaceCurves(opts);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/activity-pace-curves');
    expect(seen[0].params).toEqual(opts);
    await client.analytics.getActivityPaceCurvesCSV(opts);
    expect(seen[1].method).toBe('GET');
    expect(seen[1].url).toBe('/athlete/i1/activity-pace-curves.csv');
    expect(seen[1].responseType).toBe('arraybuffer');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/analytics.test.ts`
Expected: FAIL, `client.analytics` undefined / `AnalyticsService` not exported.

- [ ] **Step 3: Implement the service**

Create `src/services/analytics.service.ts`:

```ts
import type { IHttpClient } from '../core/http-client.interface.js';
import type {
  Bucket, TimeAtHRPlot, Interval, PowerModel, PowerCurve, PaceCurveSet,
  ActivityPowerCurvesOptions, ActivityPaceCurvesOptions,
} from '../types/index.js';

/**
 * Activity- and athlete-level analytics: histograms, time-at-HR, interval statistics,
 * power models and multi-activity curves. Activity-level methods take an activity id;
 * athlete-level methods take the usual optional trailing athleteId.
 *
 * The older single-curve activity methods (activities.getPowerCurve and friends) hit
 * different routes and remain on ActivityService.
 */
export class AnalyticsService {
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string,
  ) {}

  // ── Activity histograms ──

  /** Time in power buckets */
  async getPowerHistogram(activityId: string, options?: { bucketSize?: number }): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${activityId}/power-histogram`, params: options as Record<string, unknown> });
  }

  /** Time in heart-rate buckets */
  async getHRHistogram(activityId: string, options?: { bucketSize?: number }): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${activityId}/hr-histogram`, params: options as Record<string, unknown> });
  }

  /** Time in pace buckets */
  async getPaceHistogram(activityId: string): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${activityId}/pace-histogram` });
  }

  /** Time in grade-adjusted-pace buckets */
  async getGAPHistogram(activityId: string): Promise<Bucket[]> {
    return this.httpClient.request<Bucket[]>({ method: 'GET', url: `/activity/${activityId}/gap-histogram` });
  }

  // ── Activity models and statistics ──

  /** Seconds spent at each heart rate */
  async getTimeAtHR(activityId: string): Promise<TimeAtHRPlot> {
    return this.httpClient.request<TimeAtHRPlot>({ method: 'GET', url: `/activity/${activityId}/time-at-hr` });
  }

  /** Statistics for an arbitrary index range of the activity, as if it were an interval */
  async getIntervalStats(activityId: string, startIndex: number, endIndex: number): Promise<Interval> {
    return this.httpClient.request<Interval>({
      method: 'GET',
      url: `/activity/${activityId}/interval-stats`,
      params: { start_index: startIndex, end_index: endIndex },
    });
  }

  /** Power model fitted to the activity, used to detect power spikes */
  async getPowerSpikeModel(activityId: string): Promise<PowerModel> {
    return this.httpClient.request<PowerModel>({ method: 'GET', url: `/activity/${activityId}/power-spike-model` });
  }

  /** Multiple curves (power, pace, HR ...) for one activity */
  async getActivityPowerCurves(activityId: string, options?: ActivityPowerCurvesOptions): Promise<PowerCurve[]> {
    return this.httpClient.request<PowerCurve[]>({ method: 'GET', url: `/activity/${activityId}/power-curves`, params: options as Record<string, unknown> });
  }

  /** Same as getActivityPowerCurves, as CSV */
  async getActivityPowerCurvesCSV(activityId: string, options?: ActivityPowerCurvesOptions): Promise<Buffer> {
    return this.httpClient.download(`/activity/${activityId}/power-curves.csv`, { params: options as Record<string, unknown> });
  }

  // ── Athlete-level ──

  /** Power model used to resolve %MMP workout steps for a sport type */
  async getMMPModel(type: string, athleteId?: string): Promise<PowerModel> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PowerModel>({ method: 'GET', url: `/athlete/${id}/mmp-model`, params: { type } });
  }

  /** Best pace over a set of distances across the activities in a date range */
  async getActivityPaceCurves(options: ActivityPaceCurvesOptions, athleteId?: string): Promise<PaceCurveSet> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PaceCurveSet>({ method: 'GET', url: `/athlete/${id}/activity-pace-curves`, params: options as unknown as Record<string, unknown> });
  }

  /** Same as getActivityPaceCurves, as CSV */
  async getActivityPaceCurvesCSV(options: ActivityPaceCurvesOptions, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/activity-pace-curves.csv`, { params: options as unknown as Record<string, unknown> });
  }
}
```

`src/client.ts`: add `import { AnalyticsService } from './services/analytics.service.js';` after the `SearchService` import; add after the `search` field:

```ts
  /** Histograms, time-at-HR, interval stats, power models, multi-activity curves */
  public readonly analytics: AnalyticsService;
```

and after `this.search = new SearchService(...)` in the constructor: `this.analytics = new AnalyticsService(this.httpClient, athleteId);`

`src/index.ts`: add `export { AnalyticsService } from './services/analytics.service.js';` after the `SearchService` export line.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npx vitest run tests/analytics.test.ts && node scripts/coverage.mjs --strict`
Expected: tests PASS (11); coverage `--strict` prints `Spec ops covered: 149`, no missing, no phantom, the command chain exits 0. (The non-strict run will report 10 newly-covered stale baseline entries until Task 11 rewrites the baseline; that is expected here.)

- [ ] **Step 5: Commit**

```bash
git add src/services/analytics.service.ts src/client.ts src/index.ts tests/analytics.test.ts
git commit -m "feat(analytics): AnalyticsService with histograms, time-at-HR, interval stats, power models, curves

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 11: PR B live tests, baseline, strict CI

**Files:**
- Modify: `tests/live/phase3.live.test.ts` (append a describe), `spec/coverage-baseline.json` (regenerated), `.github/workflows/ci.yml:46-47`, `CONTRIBUTING.md` (coverage paragraph)

- [ ] **Step 1: Append the analytics live cases**

Append to `tests/live/phase3.live.test.ts`:

```ts
describe.skipIf(!LIVE)('live: phase 3 — analytics', () => {
  const c = () => liveClient();

  it('the four histograms return arrays for the latest activity', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    for (const fn of ['getPowerHistogram', 'getHRHistogram', 'getPaceHistogram', 'getGAPHistogram'] as const) {
      expect(Array.isArray(await c().analytics[fn](id as string)), fn).toBe(true);
    }
  });
  it('getTimeAtHR returns secs arrays', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const plot = await c().analytics.getTimeAtHR(id as string);
    expect(Array.isArray(plot.secs)).toBe(true);
  });
  it('getIntervalStats works on the first interval of an activity that has one', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    const [iv] = (await c().activities.getIntervals(id as string)).icu_intervals ?? [];
    if (iv?.start_index === undefined || iv?.end_index === undefined) ctx.skip();
    const stats = await c().analytics.getIntervalStats(id as string, iv!.start_index as number, iv!.end_index as number);
    expect(stats).toBeTypeOf('object');
  });
  it('getPowerSpikeModel responds', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(await c().analytics.getPowerSpikeModel(id as string)).toBeTypeOf('object');
  });
  it('getActivityPowerCurves and its CSV sibling respond', async (ctx) => {
    const id = await latestActivityId();
    if (!id) ctx.skip();
    expect(Array.isArray(await c().analytics.getActivityPowerCurves(id as string))).toBe(true);
    expect((await c().analytics.getActivityPowerCurvesCSV(id as string)).length).toBeGreaterThan(0);
  });
  it('getMMPModel responds for Ride', async () => {
    expect(await c().analytics.getMMPModel('Ride')).toBeTypeOf('object');
  });
  it('getActivityPaceCurves has the PaceCurveSet shape; CSV sibling responds', async () => {
    const set = await c().analytics.getActivityPaceCurves({ oldest: yearAgo(), newest: today(), type: 'Run', distances: [1000, 5000] });
    expect(set).toBeTypeOf('object');
    expect(Array.isArray(set.list) || set.list === undefined).toBe(true);
    const csv = await c().analytics.getActivityPaceCurvesCSV({ oldest: yearAgo(), newest: today(), type: 'Run' });
    expect(csv.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Baseline, strict CI, CONTRIBUTING**

Run: `node scripts/coverage.mjs --write-baseline && node scripts/coverage.mjs --strict`
Expected: 149 covered / 0 missing / 0 phantom, exit 0.

In `.github/workflows/ci.yml` change the coverage step to:

```yaml
      - name: API coverage vs vendored spec (strict: every spec op must be covered)
        run: node scripts/coverage.mjs --strict
```

In `CONTRIBUTING.md`, in the `npm run coverage:api` bullet, replace the sentence starting `The baseline (`spec/coverage-baseline.json`) currently has 0 phantom ops;` through `... (the eventual 149/149 gate)` with:

```markdown
CI runs `node scripts/coverage.mjs --strict`: every spec operation must be called by the SDK and every SDK call must be a spec operation or one of the 3 verified-but-undocumented routes in `spec/undocumented-routes.json` (see [AUDIT.md](./AUDIT.md)). Adding a method for a route that is not in `spec/openapi.json` fails the build; re-vendor the spec first (`npm run spec:fetch`) or, for a live-verified undocumented route, add it to the allowlist with a note. `spec/coverage-baseline.json` is still written by `--write-baseline` and used by the non-strict local run (`npm run coverage:api`) and the drift job; keep it current when you add routes.
```

- [ ] **Step 3: Typecheck and run live (user-run if no key)**

Run: `npm run typecheck` (must exit 0 before continuing), then `set -a && . ./.env && set +a && npm run test:live`
Expected: analytics cases pass or skip; no failures. If the pace-curves shape assertion fails, report the actual shape in the task report; do not change the type without the user's decision.

- [ ] **Step 4: Commit**

```bash
git add tests/live/phase3.live.test.ts spec/coverage-baseline.json .github/workflows/ci.yml CONTRIBUTING.md
git commit -m "ci(coverage): strict gate at 149/149; analytics live tests

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 12: PR B docs, example, version, PR

**Files:**
- Modify: `CHANGELOG.md`, `README.md`, `examples/basic-usage.ts`, `package.json`, `package-lock.json`, `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`

- [ ] **Step 1: CHANGELOG**

Under `### Added`, insert at the top:

```markdown
- `client.analytics` (`AnalyticsService`): `getPowerHistogram()`, `getHRHistogram()`, `getPaceHistogram()`, `getGAPHistogram()`, `getTimeAtHR()`, `getIntervalStats()`, `getPowerSpikeModel()`, `getActivityPowerCurves()` / `...CSV()`, `getMMPModel()`, `getActivityPaceCurves()` / `...CSV()`. Types `Bucket`, `TimeAtHRPlot`, `ActivityPowerCurvesOptions`, `ActivityPaceCurvesOptions`.
- Coverage: 149/149 spec operations; CI now runs the coverage gate in `--strict` mode.
```

- [ ] **Step 2: README**

Add a row to the service table after **Performance**:

```markdown
| **Analytics** | `client.analytics` | `getPowerHistogram`, `getHRHistogram`, `getPaceHistogram`, `getGAPHistogram`, `getTimeAtHR`, `getIntervalStats`, `getPowerSpikeModel`, `getActivityPowerCurves`, `getActivityPowerCurvesCSV`, `getMMPModel`, `getActivityPaceCurves`, `getActivityPaceCurvesCSV` |
```

Line 9 (intro blockquote): change `139 of 149 spec operations covered` to `all 149 spec operations covered`. Line 17: change `15 services, 100+ methods` to `16 services, 130+ methods` and append `, analytics` to that line's service list. Line 195 (comparison table): change `15 services, 100+ endpoints` to `16 services, 149 endpoints`.

- [ ] **Step 3: Example**

In `examples/basic-usage.ts`, after the `// 4. Activities` block's `forEach`, add:

```ts
    // 4b. Analytics: power histogram of the most recent activity
    const latest = activities.find((a) => a.type);
    if (latest?.id) {
      const buckets = await client.analytics.getPowerHistogram(latest.id, { bucketSize: 50 });
      console.log(`Power histogram: ${buckets.length} buckets`);
    }
```

- [ ] **Step 4: Design-spec status and version**

In `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`, in the phase table, set the Phase 3 row's deliverable to `done (3.0.0-beta.1); see 2026-09-21-phase-3-full-coverage-design.md`.

Run: `npm pkg set version=3.0.0-beta.1 && npm install --package-lock-only`

- [ ] **Step 5: Verify everything**

Run: `npm run lint && npm run typecheck && npm test && npm run build && node scripts/coverage.mjs --strict`
Expected: all green; coverage 149/149.

- [ ] **Step 6: Commit, push, PR**

```bash
git add CHANGELOG.md README.md examples/basic-usage.ts package.json package-lock.json docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md
git commit -m "docs: Phase 3 PR B changelog, README, example; bump to 3.0.0-beta.1

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
git push -u origin phase-3/analytics-service
gh pr create --base main --title "Phase 3 (B): AnalyticsService — 149/149 spec coverage, strict CI, 3.0.0-beta.1" --body-file <(cat <<'EOF'
## Summary
Adds `client.analytics` (12 methods, 10 spec operations). Coverage reaches 149/149 and the CI gate switches to `--strict`. Version 3.0.0-beta.1.

Per `docs/superpowers/specs/2026-09-21-phase-3-full-coverage-design.md`.

## Verification
- unit: `npm test` green
- `npm run typecheck` clean
- `node scripts/coverage.mjs --strict`: 149 covered / 0 missing / 0 phantom
- live: analytics block of `tests/live/phase3.live.test.ts` (state whether it was run)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Then: whole-branch review, CodeRabbit, Codex Daybreak xHigh rounds (ceiling five), user merges.

---

## Summary

| Task | PR | Deliverable |
|---|---|---|
| 1 | A | 5 types + spec-conformance test |
| 2 | A | activities: 8 methods |
| 3 | A | athletes: 4 methods |
| 4 | A | chats: 5 methods |
| 5 | A | events: 3, workouts: 1 |
| 6 | A | gear: 3, sportSettings: 2 |
| 7 | A | live tests, baseline 139 |
| 8 | A | docs, alpha.2, PR |
| 9 | B | 4 types + conformance cases |
| 10 | B | AnalyticsService: 12 methods, wiring |
| 11 | B | live tests, baseline 149, strict CI |
| 12 | B | docs, example, beta.1, PR |

## Self-review notes

- Spec coverage: every row of the spec's PR A and PR B tables maps to a task (see the route-to-task map). Spec sections Types, Testing, Coverage gate and CI, Documentation per PR, and Versions are implemented by Tasks 1/9, 7/11, 11, 8/12, 8/12 respectively.
- Deviation from the spec noted: the spec says unit tests "live in the existing per-service test files"; this plan does exactly that by appending a self-contained `describe` to each file, with `tests/analytics.test.ts` new for the new service.
- Type consistency checked: `IntervalSearchOptions`, `ActivitiesAroundOptions`, `WorkoutsZipOptions`, `AthleteConnections`, `AthleteWithTags` (Task 1) are the names used in Tasks 2, 3, 5; `Bucket`, `TimeAtHRPlot`, `ActivityPowerCurvesOptions`, `ActivityPaceCurvesOptions` (Task 9) are the names used in Task 10. Method names in Tasks 2–6 and 10 match the spec tables and the README rows in Tasks 8 and 12.
- Codex round 1 on PR A (2026-09-22): `updateMessage` takes `UpdateMessageDTO` (content/answer only) with a compile-time contract; `Chat.blocked` typed; the block live test restores the original state; `getSettings` returns a map of objects.
- Task 9 (2026-09-22): the spec defines power-curves `fatigue` as a string array (normal/kj0/kj1), not a boolean, and pace-curves `type` as the full sport enum; the plan's earlier shapes were wrong and are corrected here. `ActivityType` in enums.ts lacks `Cyclocross`, which the spec's enum includes (deferred to the final review).
- Codex round 3 on PR A (2026-09-22): `searchActivitiesFull` spreads options first so the explicit `q` wins; the edit/delete live test sends and recovers inside the try/finally and retries recovery in finally.
- Codex round 2 on PR A (2026-09-22): all seven Phase 3 sites that interpolate a caller string into a path `encodeURIComponent` it (`deleteTombstone('victim#')` would otherwise truncate to the activity-delete route); delimiter regression tests added. Pre-existing methods remain a separate cleanup.
- CodeRabbit on PR A (2026-09-22): the edit/delete write test recovers the sent message by unique content and always deletes in `finally` when the ids are known.
- Final review of PR A (2026-09-22): `Message.chat_id` removed from the public type (not in the vendored spec; the live write test reads it via a local cast). Query-parameter conformance checks for the option types were added to Task 9 rather than PR A.
- Task 5 review (2026-09-22): the workouts.zip `ext` query value is dot-less per the spec description; `downloadWorkoutsZip` strips the leading dot from `WorkoutFormat`. Task 7's live test confirms.
- Task 1 review (2026-09-22) corrected two plan defects: `ActivitiesAroundOptions.route_id` (wire name, was `routeId`) and `IntervalSearchOptions.type` as the spec's `'AUTO' | 'POWER' | 'HR' | 'PACE'` enum (was `ActivityType | string`). Task 2 spreads options into params accordingly.
- File-content checks resolved while writing the plan (2026-09-21, main at 8f5d966): `ActivityType` import in `activity.ts` (Task 1 states the action), `Message` lacks `chat_id` (Task 7 adds it), `IntervalsDTO.icu_intervals` is the interval list (Task 11 uses it).
