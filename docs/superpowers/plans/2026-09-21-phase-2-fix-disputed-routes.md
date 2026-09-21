# Phase 2: Fix the 16 disputed routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every SDK operation exist in the spec (or be documented as a verified undocumented route), so `spec/coverage-baseline.json` has an empty `phantom` list and `npm run coverage:api` passes with zero phantom operations.

**Architecture:** Verdicts come from `AUDIT.md` (live-probed 2026-09-21). The HTTP client gains a method option on `download` and `upload` so POST downloads and PUT multipart uploads are possible. Wrong paths are corrected in place. Routes with no spec counterpart and no live mapping are deleted. The three shared-event write routes are kept and marked undocumented in a small allowlist consumed by the coverage script. Every change carries a mocked unit test that asserts method and URL, and a read-only live test.

**Tech Stack:** TypeScript 5, axios, vitest 2, Node 18+. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md` (Phase 2 row) and `AUDIT.md` (verdicts, binding for this plan).

## Global Constraints

- Node `>=18.0.0`; no new dependencies; every new or changed method has a unit test asserting `method` and `url` via the existing `setupAxiosMock` helper in `tests/helpers/mock-axios.ts`.
- Breaking changes are allowed (3.0.0 series) but each one must be listed in `CHANGELOG.md` under `## [Unreleased]` and in `docs/MIGRATION.md` under a new `# Migrating to v3` section.
- Live tests go in `tests/live/*.live.test.ts`, use `describe.skipIf(!LIVE)` from `tests/live/setup.ts`, and are read-only unless guarded by `LIVE_WRITE`.
- After Task 7, `spec/coverage-baseline.json` must have `"phantom": []` and `npm run coverage:api` must exit 0.
- Commit messages end with a `Co-Authored-By: Claude <model> <noreply@anthropic.com>` line naming the model that wrote the commit.
- Branch: `phase-2/fix-disputed-routes` from `main` after PR #2 merges.

## Verdict-to-action map (from AUDIT.md)

| Route | Verdict | Action | Task |
|---|---|---|---|
| `GET download-fit-files` | broken: verb | POST via `download({ method: 'POST' })` | 1, 2 |
| `POST streams.csv` upload | broken: verb | PUT via `upload({ method: 'PUT' })` | 1, 2 |
| `GET /chats` | fix to spec | `GET /athlete/{id}/chats` | 3 |
| `GET power-vs-hr` | fix to spec | `GET power-hr-curve` with `start`/`end` | 3 |
| `GET athlete weather` | fix to spec | `GET weather-forecast` | 3 |
| `GET activity weather` | fix to spec | delete; `getWeatherSummary` already exists | 3 |
| `GET routes/{id}/similarities` | fix to spec | `GET routes/{id}/similarity/{otherId}` | 3 |
| `GET fitness`, `GET activity-summary` | fix to spec | `GET athlete-summary` in AthleteService; delete FitnessService | 4 |
| `GET /search/athletes` | delete | remove `searchAthletes` | 5 |
| `DELETE wellness/{date}` | verb, no mapping | remove `deleteWellness` | 5 |
| `GET download-workout{ext}` (both) | verb and semantics | POST with Workout body; add event download by id | 6 |
| `POST/PUT/DELETE shared-event` | works-as-written | keep; add to `spec/undocumented-routes.json` | 7 |

---

### Task 1: HTTP client supports POST downloads and PUT uploads

**Files:**
- Modify: `src/core/http-client.interface.ts:22-50`
- Modify: `src/core/axios-http-client.ts:114-140`
- Test: `tests/client.test.ts`

**Interfaces:**
- Produces: `download(url: string, options?: DownloadOptions | Record<string, unknown>): Promise<Buffer>` where `DownloadOptions = { method?: 'GET' | 'POST'; params?: Record<string, unknown>; data?: unknown }`. A plain object without `method`, `params`, or `data` keys is treated as legacy `params` (backward compatible). `UploadConfig` gains `method?: 'POST' | 'PUT'`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/client.test.ts` inside the top-level `describe`:

```ts
describe('download and upload verbs', () => {
  let requestMock: any;
  beforeEach(() => {
    requestMock = vi.fn(async (config: any) => ({ data: Buffer.from('PK'), headers: {} }));
    const mockInstance = {
      request: requestMock,
      get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
      interceptors: { request: { use: vi.fn(), eject: vi.fn() }, response: { use: vi.fn(), eject: vi.fn() } },
    };
    mockedAxios.create = vi.fn(() => mockInstance);
  });

  it('download defaults to GET with params (legacy signature)', async () => {
    const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    await client.activities.downloadFile('a1');
    const call = requestMock.mock.calls[0][0];
    expect(call.method).toBe('GET');
    expect(call.url).toBe('/activity/a1/file');
    expect(call.responseType).toBe('arraybuffer');
  });

  it('download can POST with query params and no body', async () => {
    const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    const http: any = (client as any).httpClient;
    await http.download('/athlete/i1/download-fit-files', { method: 'POST', params: { ids: 'a1,a2' } });
    const call = requestMock.mock.calls[0][0];
    expect(call.method).toBe('POST');
    expect(call.params).toEqual({ ids: 'a1,a2' });
    expect(call.data).toBeUndefined();
    expect(call.responseType).toBe('arraybuffer');
  });

  it('download can POST a JSON body', async () => {
    const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    const http: any = (client as any).httpClient;
    await http.download('/download-workout.zwo', { method: 'POST', data: { name: 'w' } });
    const call = requestMock.mock.calls[0][0];
    expect(call.method).toBe('POST');
    expect(call.data).toEqual({ name: 'w' });
  });

  it('upload can PUT multipart', async () => {
    const client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    const http: any = (client as any).httpClient;
    await http.upload({ url: '/activity/a1/streams.csv', file: Buffer.from('t,w\n1,2'), fileName: 's.csv', method: 'PUT' });
    const call = requestMock.mock.calls[0][0];
    expect(call.method).toBe('PUT');
    expect(call.url).toBe('/activity/a1/streams.csv');
    expect(call.data).toBeInstanceOf(FormData);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/client.test.ts -t "download and upload verbs"`
Expected: FAIL. The legacy test fails because `download` calls `client.get`, not `client.request`; the POST tests fail because `method` is ignored.

- [ ] **Step 3: Change the interface**

In `src/core/http-client.interface.ts` replace the `UploadConfig` interface and the `download` member:

```ts
export interface UploadConfig {
  url: string;
  file: Buffer | Blob | Uint8Array;
  fileName: string;
  params?: Record<string, unknown>;
  fieldName?: string;
  /** HTTP verb for the multipart request. Defaults to POST. */
  method?: 'POST' | 'PUT';
}

/** Options for binary downloads. */
export interface DownloadOptions {
  /** HTTP verb. Defaults to GET. */
  method?: 'GET' | 'POST';
  params?: Record<string, unknown>;
  /** JSON body, only meaningful with POST. */
  data?: unknown;
}
```

and

```ts
  /**
   * Download a file as a Buffer.
   * The second argument is either DownloadOptions or, for backward compatibility,
   * a plain params object.
   */
  download(url: string, options?: DownloadOptions | Record<string, unknown>): Promise<Buffer>;
```

- [ ] **Step 4: Change the axios implementation**

In `src/core/axios-http-client.ts`, import `DownloadOptions` and replace the `upload` and `download` methods:

```ts
  async upload<T>(config: UploadConfig): Promise<T> {
    return this.withRetry(async () => {
      const form = new FormData();
      const blob = config.file instanceof Blob ? config.file : new Blob([config.file]);
      form.append(config.fieldName || 'file', blob, config.fileName);

      const response = await this.client.request<T>({
        method: config.method ?? 'POST',
        url: config.url,
        data: form,
        params: config.params,
        headers: { 'Content-Type': 'multipart/form-data' },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      return response.data;
    });
  }

  private static isDownloadOptions(value: unknown): value is DownloadOptions {
    if (!value || typeof value !== 'object') return false;
    return 'method' in value || 'params' in value || 'data' in value;
  }

  async download(url: string, options?: DownloadOptions | Record<string, unknown>): Promise<Buffer> {
    const opts: DownloadOptions = AxiosHttpClient.isDownloadOptions(options)
      ? options
      : { params: options as Record<string, unknown> | undefined };
    return this.withRetry(async () => {
      const response = await this.client.request({
        method: opts.method ?? 'GET',
        url,
        params: opts.params,
        data: opts.data,
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    });
  }
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/client.test.ts`
Expected: PASS, including the four new tests. Then `npm test` to confirm nothing else used `client.get` for downloads (the activities and workouts suites mock `request`, so they should pass unchanged).

- [ ] **Step 6: Export the new type and commit**

Add `DownloadOptions` to the `export type` list in `src/index.ts` next to `UploadConfig` (grep for `UploadConfig` in `src/index.ts`).

```bash
git add src/core/http-client.interface.ts src/core/axios-http-client.ts src/index.ts tests/client.test.ts
git commit -m "feat(http): download supports POST and upload supports PUT

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 2: Fix the two verb-only routes in ActivityService

**Files:**
- Modify: `src/services/activity.service.ts:63-66,105-107`
- Test: `tests/activities.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('IntervalsClient - Activities')` a new nested describe. The existing `setupAxiosMock` handler returns `[]` for unknown routes; add a handler branch that records the config:

```ts
  describe('verb fixes (AUDIT.md)', () => {
    let seen: any[] = [];
    beforeEach(() => {
      seen = [];
      setupAxiosMock(mockedAxios, async (config: any) => {
        seen.push(config);
        if (config.responseType === 'arraybuffer') return Buffer.from('PK');
        return { updated: 1 };
      });
      client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
    });

    it('downloadFitFiles POSTs with comma-joined ids in the query', async () => {
      await client.activities.downloadFitFiles(['a1', 'a2'], { power: false });
      expect(seen[0].method).toBe('POST');
      expect(seen[0].url).toBe('/athlete/i1/download-fit-files');
      expect(seen[0].params).toEqual({ ids: 'a1,a2', power: false });
      expect(seen[0].data).toBeUndefined();
    });

    it('updateStreamsCSV PUTs multipart', async () => {
      await client.activities.updateStreamsCSV('a1', Buffer.from('t,w\n1,2'), 'streams.csv');
      expect(seen[0].method).toBe('PUT');
      expect(seen[0].url).toBe('/activity/a1/streams.csv');
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/activities.test.ts -t "verb fixes"`
Expected: FAIL on `method` (GET and POST respectively).

- [ ] **Step 3: Implement**

In `src/services/activity.service.ts`:

```ts
  /**
   * Download a zip of Intervals.icu-generated FIT files for the given activities.
   * The API exposes this as POST with query parameters (see AUDIT.md).
   */
  async downloadFitFiles(activityIds: string[], options?: { power?: boolean; hr?: boolean }, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    const params: Record<string, unknown> = { ids: activityIds.join(','), ...options };
    return this.httpClient.download(`/athlete/${id}/download-fit-files`, { method: 'POST', params });
  }
```

and

```ts
  /** Replace activity streams from a CSV file (PUT multipart/form-data) */
  async updateStreamsCSV(activityId: string, file: Buffer | Blob | Uint8Array, fileName: string): Promise<UpdateStreamsResult> {
    return this.httpClient.upload<UpdateStreamsResult>({ url: `/activity/${activityId}/streams.csv`, file, fileName, method: 'PUT' });
  }
```

- [ ] **Step 4: Run tests, then coverage**

Run: `npx vitest run tests/activities.test.ts && npm run coverage:api; echo exit=$?`
Expected: tests PASS. Coverage exits 1 with `Stale baseline entries: 2 resolved phantom` naming `GET /athlete/{x}/download-fit-files` and `POST /activity/{x}/streams.csv`. That is expected until Task 7 rewrites the baseline; do not run `--write-baseline` yet.

- [ ] **Step 5: Live check for the `ids` encoding**

Create `tests/live/phase2.live.test.ts` (Task 7 extends it):

```ts
import { describe, it, expect } from 'vitest';
import { LIVE, liveClient, athleteId } from './setup.js';

describe.skipIf(!LIVE)('live: phase 2 verb fixes', () => {
  it('downloadFitFiles returns a zip for the most recent activity', async () => {
    const client = liveClient();
    const today = new Date().toISOString().slice(0, 10);
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    const [latest] = await client.activities.listActivities({ oldest: yearAgo, newest: today });
    if (!latest?.id) return; // account has no activities; nothing to assert
    const zip = await client.activities.downloadFitFiles([latest.id]);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  });
});
```

Run: `set -a; . ./.env; set +a; npm run test:live`
Expected: PASS. If the API returns 422 for the comma-joined `ids`, change the encoding to repeated keys by passing `params: new URLSearchParams([...activityIds.map((v) => ['ids', v]), ...Object.entries(options ?? {}).map(([k, v]) => [k, String(v)])])` and update the unit test's `params` expectation accordingly. Record which encoding worked in `AUDIT.md` under the fit-files manual-annotation row.

- [ ] **Step 6: Commit**

```bash
git add src/services/activity.service.ts tests/activities.test.ts tests/live/phase2.live.test.ts AUDIT.md
git commit -m "fix(activities): POST download-fit-files, PUT streams.csv

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 3: Fix the five wrong paths

**Files:**
- Modify: `src/services/chat.service.ts:7-15`, `src/client.ts:108`
- Modify: `src/services/performance.service.ts:84-87`
- Modify: `src/services/weather.service.ts:14-17`
- Modify: `src/services/activity.service.ts:155-158` (delete `getWeather`)
- Modify: `src/services/route.service.ts:31-35`
- Test: `tests/chat.test.ts:30`, `tests/weather.test.ts:26`, new blocks in `tests/activities.test.ts` and new file `tests/routes-performance.test.ts`

**Interfaces:**
- Produces: `ChatService` constructor becomes `(httpClient, defaultAthleteId)`; `listChats(athleteId?)`. `PerformanceService.getPowerHRCurve(options: { start: string; end: string; type?: ActivityType; filters?: ActivityFilter[] }, athleteId?)` replaces `getPowerVsHR`. `WeatherService.getForecast(athleteId?)` replaces `getWeather`. `RouteService.getSimilarity(routeId: number, otherRouteId: number, athleteId?): Promise<RouteSimilarity>` replaces `getSimilarities`. `ActivityService.getWeather` is removed (`getWeatherSummary` remains).

- [ ] **Step 1: Update the existing tests to the new contracts**

In `tests/chat.test.ts` line 30 change `config.url === '/chats'` to `config.url === '/athlete/test-athlete-id/chats'` (check the `athleteId` used in that file's `beforeEach` and match it). In `tests/weather.test.ts` line 26 change `endsWith('/weather')` to `endsWith('/weather-forecast')` and rename the call in the corresponding `it` from `getWeather()` to `getForecast()`.

Create `tests/routes-performance.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntervalsClient } from '../src/client.js';
import { setupAxiosMock } from './helpers/mock-axios.js';

vi.mock('axios');
import axios from 'axios';
const mockedAxios = axios as any;

describe('path fixes (AUDIT.md)', () => {
  let client: IntervalsClient;
  let seen: any[] = [];
  beforeEach(() => {
    seen = [];
    setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return {}; });
    client = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
  });

  it('getSimilarity hits /routes/{id}/similarity/{otherId}', async () => {
    await client.routes.getSimilarity(10, 20);
    expect(seen[0].method).toBe('GET');
    expect(seen[0].url).toBe('/athlete/i1/routes/10/similarity/20');
  });

  it('getPowerHRCurve hits /power-hr-curve with start and end', async () => {
    await client.performance.getPowerHRCurve({ start: '2026-01-01', end: '2026-02-01', type: 'Ride' });
    expect(seen[0].url).toBe('/athlete/i1/power-hr-curve');
    expect(seen[0].params).toEqual({ start: '2026-01-01', end: '2026-02-01', type: 'Ride' });
  });

  it('listChats is athlete-scoped', async () => {
    await client.chats.listChats();
    expect(seen[0].url).toBe('/athlete/i1/chats');
  });

  it('activities.getWeather no longer exists', () => {
    expect((client.activities as any).getWeather).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/chat.test.ts tests/weather.test.ts tests/routes-performance.test.ts`
Expected: FAIL (old URLs, missing methods).

- [ ] **Step 3: Implement**

`src/services/chat.service.ts`: change the constructor and `listChats`:

```ts
  constructor(
    private httpClient: IHttpClient,
    private defaultAthleteId: string,
  ) {}

  /** List chats (including groups) for the athlete, most recently active first */
  async listChats(athleteId?: string): Promise<Chat[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<Chat[]>({ method: 'GET', url: `/athlete/${id}/chats` });
  }
```

`src/client.ts` line 108: `this.chats = new ChatService(this.httpClient, athleteId);`

`src/services/performance.service.ts`: replace `getPowerVsHR` with

```ts
  /** Get the athlete's power vs heart rate curve for a date range */
  async getPowerHRCurve(
    options: { start: string; end: string; type?: ActivityType; filters?: ActivityFilter[] },
    athleteId?: string,
  ): Promise<PowerHRCurve> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<PowerHRCurve>({ method: 'GET', url: `/athlete/${id}/power-hr-curve`, params: options as Record<string, unknown> });
  }
```

(import `ActivityType` and `ActivityFilter` from `../types/index.js`; both already exist there.)

`src/services/weather.service.ts`: rename `getWeather` to `getForecast` and change the URL to `` `/athlete/${id}/weather-forecast` ``.

`src/services/activity.service.ts`: delete the `getWeather` method (lines 155-158). Keep the `ActivityWeather` type; `Activity.weather` uses it.

`src/services/route.service.ts`: replace `getSimilarities` with

```ts
  /** How similar is this route to another? */
  async getSimilarity(routeId: number, otherRouteId: number, athleteId?: string): Promise<RouteSimilarity> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<RouteSimilarity>({ method: 'GET', url: `/athlete/${id}/routes/${routeId}/similarity/${otherRouteId}` });
  }
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/chat.service.ts src/client.ts src/services/performance.service.ts src/services/weather.service.ts src/services/activity.service.ts src/services/route.service.ts tests/chat.test.ts tests/weather.test.ts tests/routes-performance.test.ts
git commit -m "fix!: correct chat list, power-hr-curve, weather-forecast, route similarity paths; drop activity weather

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 4: Replace FitnessService with `athletes.getSummary`

**Files:**
- Delete: `src/services/fitness.service.ts`
- Modify: `src/services/athlete.service.ts` (add method), `src/client.ts:21,80-81,111`, `src/index.ts:28,104`
- Keep: `src/types/fitness.ts` (`SummaryWithCats` is the response type)
- Test: `tests/athlete.test.ts`

**Interfaces:**
- Produces: `AthleteService.getSummary(options?: { start?: string; end?: string; tags?: string[] }, athleteId?: string): Promise<SummaryWithCats[]>`; `client.fitness` is removed.

- [ ] **Step 1: Write the failing test**

Append to `tests/athlete.test.ts` inside its top-level describe:

```ts
  describe('getSummary (replaces FitnessService)', () => {
    it('hits /athlete-summary with start, end and tags', async () => {
      const seen: any[] = [];
      setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return []; });
      const c = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      await c.athletes.getSummary({ start: '2026-01-01', end: '2026-02-01', tags: ['race'] });
      expect(seen[0].method).toBe('GET');
      expect(seen[0].url).toBe('/athlete/i1/athlete-summary');
      expect(seen[0].params).toEqual({ start: '2026-01-01', end: '2026-02-01', tags: ['race'] });
      expect((c as any).fitness).toBeUndefined();
    });
  });
```

(Confirm `setupAxiosMock` and `mockedAxios` are already imported in that file; add the imports if not, matching `tests/activities.test.ts`.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/athlete.test.ts -t getSummary`
Expected: FAIL (`getSummary` is not a function).

- [ ] **Step 3: Implement**

In `src/services/athlete.service.ts` add (import `SummaryWithCats` from `../types/index.js`):

```ts
  /**
   * Summary information (training load, fitness, categories) for the athlete
   * and followed athletes over a date range.
   */
  async getSummary(options?: { start?: string; end?: string; tags?: string[] }, athleteId?: string): Promise<SummaryWithCats[]> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.request<SummaryWithCats[]>({ method: 'GET', url: `/athlete/${id}/athlete-summary`, params: options as Record<string, unknown> });
  }
```

Delete `src/services/fitness.service.ts`. In `src/client.ts` remove the import (line 21), the accessor doc comment and field (lines 80-81), and the construction (line 111). In `src/index.ts` remove the `FitnessService` export (line 28) and the `// Fitness` comment block if it only introduced that export; keep the `SummaryWithCats` type export in `src/types/index.ts`.

- [ ] **Step 4: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: PASS. If any test referenced `client.fitness`, delete that test; it tested a route that never existed.

- [ ] **Step 5: Commit**

```bash
git add -A src tests/athlete.test.ts
git commit -m "feat!: replace FitnessService with athletes.getSummary (athlete-summary)

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 5: Delete `searchAthletes` and `deleteWellness`

**Files:**
- Modify: `src/services/search.service.ts:28-33`, `src/services/wellness.service.ts:53-56`
- Test: `tests/wellness.test.ts:77`, `tests/routes-performance.test.ts`

- [ ] **Step 1: Update tests**

Remove the `deleteWellness` test at `tests/wellness.test.ts:77` (and its `it` wrapper). Append to `tests/routes-performance.test.ts`:

```ts
  it('removed routes are gone: searchAthletes, deleteWellness', () => {
    expect((client.search as any).searchAthletes).toBeUndefined();
    expect((client.wellness as any).deleteWellness).toBeUndefined();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/routes-performance.test.ts -t removed`
Expected: FAIL.

- [ ] **Step 3: Implement**

Delete `searchAthletes` from `src/services/search.service.ts` and `deleteWellness` from `src/services/wellness.service.ts`. Keep the `AthleteSearchResult` type; `custom-item.ts` and `athlete.ts` use it. If `search.service.ts` no longer imports `AthleteSearchResult`, drop the import.

- [ ] **Step 4: Run**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/search.service.ts src/services/wellness.service.ts tests/wellness.test.ts tests/routes-performance.test.ts
git commit -m "fix!: remove searchAthletes and deleteWellness (no such routes)

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 6: Workout conversion by body, and planned-workout download by event id

**Files:**
- Modify: `src/services/workout.service.ts:55-69`
- Modify: `src/services/event.service.ts` (add method)
- Test: `tests/workouts.test.ts`, `tests/events.test.ts`, `tests/live/phase2.live.test.ts`

**Interfaces:**
- Produces: `WorkoutFormat = '.zwo' | '.mrc' | '.erg' | '.fit'` exported from `src/types/workout.ts`. `WorkoutService.convertWorkout(workout: Partial<Workout>, format: WorkoutFormat): Promise<Buffer>` (global, POST `/download-workout{ext}`), `WorkoutService.convertWorkoutForAthlete(workout, format, athleteId?)` (POST `/athlete/{id}/download-workout{ext}`). `EventService.downloadWorkout(eventId: number, format: WorkoutFormat, athleteId?): Promise<Buffer>` (GET `/athlete/{id}/events/{eventId}/download{ext}`). The old `downloadWorkout(workoutId, format)` and `downloadWorkoutForAthlete` are removed.

- [ ] **Step 1: Write the failing tests**

Append to `tests/workouts.test.ts`:

```ts
  describe('convertWorkout (POST with body)', () => {
    it('POSTs the workout to /download-workout{ext}', async () => {
      const seen: any[] = [];
      setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return Buffer.from('<workout_file/>'); });
      const c = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      const out = await c.workouts.convertWorkout({ name: 'Tempo', description: '- 20m 85%', type: 'Ride' }, '.zwo');
      expect(seen[0].method).toBe('POST');
      expect(seen[0].url).toBe('/download-workout.zwo');
      expect(seen[0].data).toEqual({ name: 'Tempo', description: '- 20m 85%', type: 'Ride' });
      expect(seen[0].responseType).toBe('arraybuffer');
      expect(out.toString()).toBe('<workout_file/>');
      await c.workouts.convertWorkoutForAthlete({ name: 'T' }, '.fit');
      expect(seen[1].url).toBe('/athlete/i1/download-workout.fit');
      expect((c.workouts as any).downloadWorkout).toBeUndefined();
    });
  });
```

Append to `tests/events.test.ts`:

```ts
  describe('downloadWorkout by event id', () => {
    it('GETs /events/{id}/download{ext}', async () => {
      const seen: any[] = [];
      setupAxiosMock(mockedAxios, async (config: any) => { seen.push(config); return Buffer.from('x'); });
      const c = new IntervalsClient({ apiKey: 'k', athleteId: 'i1' });
      await c.events.downloadWorkout(42, '.mrc');
      expect(seen[0].method).toBe('GET');
      expect(seen[0].url).toBe('/athlete/i1/events/42/download.mrc');
      expect(seen[0].responseType).toBe('arraybuffer');
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/workouts.test.ts tests/events.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/types/workout.ts`: add `export type WorkoutFormat = '.zwo' | '.mrc' | '.erg' | '.fit';` and export it from `src/types/index.ts` and `src/index.ts`.

`src/services/workout.service.ts`: replace the two download methods with

```ts
  /**
   * Convert a workout definition to .zwo (Zwift), .mrc, .erg or .fit.
   * The workout is sent in the body; it does not need to exist in the library.
   * Uses the global endpoint (no athlete-specific settings such as FTP).
   */
  async convertWorkout(workout: Partial<Workout>, format: WorkoutFormat): Promise<Buffer> {
    return this.httpClient.download(`/download-workout${format}`, { method: 'POST', data: workout });
  }

  /** Same as convertWorkout but resolves the athlete's own settings (FTP, zones). */
  async convertWorkoutForAthlete(workout: Partial<Workout>, format: WorkoutFormat, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/download-workout${format}`, { method: 'POST', data: workout });
  }
```

`src/services/event.service.ts`: add (import `WorkoutFormat`)

```ts
  /** Download a planned workout from the calendar in zwo, mrc, erg or fit format */
  async downloadWorkout(eventId: number, format: WorkoutFormat, athleteId?: string): Promise<Buffer> {
    const id = athleteId || this.defaultAthleteId;
    return this.httpClient.download(`/athlete/${id}/events/${eventId}/download${format}`);
  }
```

- [ ] **Step 4: Live check**

Append to `tests/live/phase2.live.test.ts` inside the describe:

```ts
  it('convertWorkout returns a Zwift file for an inline workout', async () => {
    const zwo = await liveClient().workouts.convertWorkout(
      { name: 'Probe', description: '- 10m 50%', type: 'Ride' },
      '.zwo',
    );
    expect(zwo.toString()).toContain('<workout_file');
  });
```

Run: `set -a; . ./.env; set +a; npm run test:live`
Expected: PASS. If the API returns 500 for this minimal body (as the manual probe in AUDIT.md did), add the fields the live UI sends: fetch one of the athlete's calendar workouts via `client.events.listEvents({ oldest, newest, category: ['WORKOUT'] })`, then POST `{ name, description, type, workout_doc }` from it. Record the minimum body that works in the `convertWorkout` doc comment and in AUDIT.md.

- [ ] **Step 5: Run and commit**

Run: `npm run typecheck && npm test`

```bash
git add src/types/workout.ts src/types/index.ts src/index.ts src/services/workout.service.ts src/services/event.service.ts tests/workouts.test.ts tests/events.test.ts tests/live/phase2.live.test.ts AUDIT.md
git commit -m "feat!: convertWorkout posts a workout body; events.downloadWorkout by id

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 7: Undocumented-route allowlist, baseline rewrite, live tests for the fixed paths

**Files:**
- Create: `spec/undocumented-routes.json`
- Modify: `scripts/lib/spec-ops.mjs` (`applyBaseline` or a new `applyAllowlist`), `scripts/coverage.mjs`, `spec/coverage-baseline.json`
- Test: `tests/scripts/spec-ops.test.ts`, `tests/live/phase2.live.test.ts`

**Interfaces:**
- Produces: `applyAllowlist(phantom, allowlistKeys)` returns `{ phantom: remaining, allowed: matched, unused: allowlistKeys not phantom }`. `coverage.mjs` reads `spec/undocumented-routes.json` (shape `{ "routes": [{ "key": "POST /shared-event", "verified": "2026-09-21", "note": "..." }] }`) and removes allowed keys from `phantom` before the baseline check; `unused` entries fail the run (stale allowlist).

- [ ] **Step 1: Write the failing tests**

Append to `tests/scripts/spec-ops.test.ts`:

```ts
describe('applyAllowlist', () => {
  it('removes allowed phantom ops and reports unused allowlist entries', () => {
    const phantom = [{ key: 'POST /shared-event' }, { key: 'GET /chats' }] as any;
    const r = applyAllowlist(phantom, ['POST /shared-event', 'DELETE /nope']);
    expect(r.phantom.map((p: any) => p.key)).toEqual(['GET /chats']);
    expect(r.allowed.map((p: any) => p.key)).toEqual(['POST /shared-event']);
    expect(r.unused).toEqual(['DELETE /nope']);
  });
});
```

(add `applyAllowlist` to the import at the top.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/scripts/spec-ops.test.ts -t applyAllowlist`
Expected: FAIL (not exported).

- [ ] **Step 3: Implement**

In `scripts/lib/spec-ops.mjs`:

```js
/** Split phantom ops into those covered by the undocumented-routes allowlist and the rest. */
export function applyAllowlist(phantom, allowlistKeys) {
  const allow = new Set(allowlistKeys);
  const allowed = phantom.filter((p) => allow.has(p.key));
  const remaining = phantom.filter((p) => !allow.has(p.key));
  const present = new Set(phantom.map((p) => p.key));
  const unused = allowlistKeys.filter((k) => !present.has(k));
  return { phantom: remaining, allowed, unused };
}
```

Create `spec/undocumented-routes.json`:

```json
{
  "routes": [
    { "key": "POST /shared-event", "verified": "2026-09-21", "note": "400 on malformed body: route exists, not in spec. See AUDIT.md." },
    { "key": "PUT /shared-event/{x}", "verified": "2026-09-21", "note": "400 on malformed body: route exists, not in spec. See AUDIT.md." },
    { "key": "DELETE /shared-event/{x}", "verified": "2026-09-21", "note": "404 for sentinel id while PUT on the same path is 400: mapping exists. See AUDIT.md." }
  ]
}
```

In `scripts/coverage.mjs`, after `matchOperations` and before the baseline logic: read the allowlist (missing file = empty), call `applyAllowlist(phantom, routes.map(r => r.key))`, print `Undocumented (allowlisted): N` and list them, and if `unused.length` print each with `Allowlist entry no longer phantom; remove it from spec/undocumented-routes.json` to stderr and set the failure flag. Use the remaining `phantom` for everything downstream. `--strict` still ignores the allowlist? No: `--strict` should also honor the allowlist (those routes are verified real); document that in the header comment.

- [ ] **Step 4: Rewrite the baseline and verify**

Run: `node scripts/coverage.mjs --write-baseline && npm run coverage:api; echo exit=$?`
Expected: `"phantom": []` in `spec/coverage-baseline.json`; `Undocumented (allowlisted): 3`; `New phantom (regressions): 0`; `Lost coverage: 0`; exit 0. `Spec ops covered` should be 104 + the newly covered routes: chats, power-hr-curve, weather-forecast, similarity, athlete-summary, events download, both download-workout POSTs, download-fit-files POST, streams.csv PUT = 114. Record the exact number.

- [ ] **Step 5: Read-only live tests for each fixed path**

Append to `tests/live/phase2.live.test.ts`:

```ts
  it('listChats, getSummary, getPowerHRCurve, getForecast, getWeatherSummary respond', async () => {
    const client = liveClient();
    const today = new Date().toISOString().slice(0, 10);
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
    expect(Array.isArray(await client.chats.listChats())).toBe(true);
    expect(Array.isArray(await client.athletes.getSummary({ start: yearAgo, end: today }))).toBe(true);
    expect(await client.performance.getPowerHRCurve({ start: yearAgo, end: today })).toBeTypeOf('object');
    expect(await client.weather.getForecast()).toBeTypeOf('object');
    const [latest] = await client.activities.listActivities({ oldest: yearAgo, newest: today });
    if (latest?.id) expect(await client.activities.getWeatherSummary(latest.id)).toBeTypeOf('object');
    const [route] = await client.routes.list();
    if (route?.route_id) expect(await client.routes.getSimilarity(route.route_id, route.route_id)).toBeTypeOf('object');
  });
```

(Check `AthleteRoute` in `src/types/route.ts` exposes `route_id`; if it only has `id`, add `route_id?: number` since the live payload uses it.)

Run: `set -a; . ./.env; set +a; npm run test:live`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/spec-ops.mjs scripts/coverage.mjs spec/undocumented-routes.json spec/coverage-baseline.json tests/scripts/spec-ops.test.ts tests/live/phase2.live.test.ts src/types/route.ts
git commit -m "feat(coverage): allowlist verified undocumented routes; baseline has zero phantom ops

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 8: Changelog, migration guide, version, docs

**Files:**
- Modify: `CHANGELOG.md`, `docs/MIGRATION.md`, `README.md`, `package.json`, `AUDIT.md`, `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`

- [ ] **Step 1: CHANGELOG**

Under `## [Unreleased]` add:

```markdown
### Removed
- `client.fitness` (`getFitness`, `getSummaries`): the routes never existed. Use `client.athletes.getSummary()`.
- `client.search.searchAthletes()`: no such route.
- `client.wellness.deleteWellness()`: the API has no DELETE mapping for wellness records.
- `client.activities.getWeather()`: duplicate of `getWeatherSummary()`.
- `client.workouts.downloadWorkout()` / `downloadWorkoutForAthlete()`: replaced by `convertWorkout()` / `convertWorkoutForAthlete()`, which POST a workout body as the API requires.

### Changed
- `client.chats.listChats()` now calls `GET /athlete/{id}/chats` (was `/chats`, 404).
- `client.performance.getPowerVsHR()` renamed to `getPowerHRCurve({ start, end })` and calls `/power-hr-curve`.
- `client.weather.getWeather()` renamed to `getForecast()` and calls `/weather-forecast`.
- `client.routes.getSimilarities(routeId)` replaced by `getSimilarity(routeId, otherRouteId)` returning one `RouteSimilarity`.
- `client.activities.downloadFitFiles()` sends POST; `updateStreamsCSV()` sends PUT.
- `IHttpClient.download()` accepts `{ method, params, data }`; `upload()` accepts `method`.

### Added
- `client.athletes.getSummary()`, `client.events.downloadWorkout(eventId, format)`, `client.workouts.convertWorkout()`.
- `spec/undocumented-routes.json`: verified live routes absent from the spec (shared-event create/update/delete).
- `AUDIT.md`: live verdicts for the 16 disputed routes.
```

- [ ] **Step 2: MIGRATION.md**

Prepend a `# Migrating to v3` section above the existing v2 section, with a table of removed/renamed methods (same content as the changelog, one row each, with before/after code for `getPowerVsHR` to `getPowerHRCurve` and `downloadWorkout` to `convertWorkout`/`events.downloadWorkout`).

- [ ] **Step 3: README, version, AUDIT, spec**

- README: search for `downloadWorkout`, `getWeather(`, `fitness`, `searchAthletes`, `getSimilarities`, `getPowerVsHR` and update any example to the new names.
- `npm pkg set version=3.0.0-alpha.1`; run `npm install --package-lock-only`.
- `AUDIT.md`: add a line at the top: "Status: all 16 rows resolved in 3.0.0-alpha.1 (Phase 2). Re-run the probe after any change to these routes."
- Design spec: Phase 2 row in the phase table becomes "done (3.0.0-alpha.1)"; the Architecture bullet about `FitnessService` becomes "removed; `athletes.getSummary` replaces it".

- [ ] **Step 4: Verify and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run coverage:api`
Expected: all exit 0.

```bash
git add CHANGELOG.md docs/MIGRATION.md README.md package.json package-lock.json AUDIT.md docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md
git commit -m "docs: changelog, v3 migration guide, bump to 3.0.0-alpha.1

Co-Authored-By: Claude <model> <noreply@anthropic.com>"
```

---

### Task 9: PR

- [ ] **Step 1: Final verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run coverage:api && (set -a; . ./.env; set +a; npm run test:live)`
Expected: all exit 0; live suite passes (or skips only the rows the account has no data for).

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin phase-2/fix-disputed-routes
gh pr create --repo 0x3639/node-intervals-icu --base main --title "Phase 2: fix the 16 disputed routes (zero phantom ops)" --body "$(cat <<'EOF'
## Summary
- Every SDK route now exists in the spec or is a live-verified undocumented route (`spec/undocumented-routes.json`); `spec/coverage-baseline.json` has `"phantom": []`
- Verb fixes: `downloadFitFiles` POST, `updateStreamsCSV` PUT; HTTP client `download`/`upload` take a method
- Path fixes: chats list, power-hr-curve, weather-forecast, route similarity, athlete-summary
- Removed: FitnessService, `searchAthletes`, `deleteWellness`, activity `getWeather`, id-based `downloadWorkout`
- Added: `athletes.getSummary`, `events.downloadWorkout(eventId, format)`, `workouts.convertWorkout(body, format)`
- Live tests for every fixed route in `tests/live/phase2.live.test.ts`

## Breaking
See `docs/MIGRATION.md` (Migrating to v3). Version 3.0.0-alpha.1.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- Every AUDIT.md row maps to a task (see the verdict-to-action table). The three shared-event rows are handled by the allowlist in Task 7 rather than code changes.
- Names used across tasks: `DownloadOptions` (Task 1) is consumed by Tasks 2 and 6; `WorkoutFormat` (Task 6) by `events.downloadWorkout`; `applyAllowlist` (Task 7) by `coverage.mjs`. `getSummary`, `getPowerHRCurve`, `getForecast`, `getSimilarity`, `convertWorkout`, `convertWorkoutForAthlete` are used consistently in Tasks 3, 4, 6, 7, 8.
- Two live-dependent unknowns are called out with decision rules rather than left open: the `ids` encoding for fit-files (Task 2 Step 5) and the minimum body for workout conversion (Task 6 Step 4).
