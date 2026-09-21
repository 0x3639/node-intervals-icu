# node-intervals-icu: fix and extend to full API coverage

Date: 2026-09-20
Status: approved (decisions: diverge from upstream now; delete phantom endpoints that fail live)

## Goal

Bring the SDK to 149/149 coverage of the Intervals.icu OpenAPI spec, fix the
16 SDK operations that disagree with the spec, and make coverage and spec
drift visible in CI so they cannot regress. Ship as v3.0.0 under a new
package scope, diverged from `paladini/node-intervals-icu`.

## Ground truth (measured 2026-09-20 against live `https://intervals.icu/api/v1/docs`)

| Measure | Value |
|---|---|
| Spec operations | 149 |
| SDK operations | 121 |
| SDK operations matching spec | 104 |
| SDK operations not in spec | 16 |
| Spec operations missing from SDK | 45 (104 distinct spec ops covered; note that only `GET /activity/{id}/streams{ext}` is now hit by two SDK methods) |

Matching rule: strip `/api/v1`, replace every `{param}` and `${expr}` with `{x}`,
then drop a `{x}` that follows a non-slash character (this folds `{ext}` and the
`{format}` suffix on `download-workout{format}` into the base path).

### The 16 SDK operations not in the spec

| SDK op | File | Likely spec counterpart |
|---|---|---|
| GET /athlete/{id}/download-fit-files | activity.service (download) | POST same path |
| GET /download-workout{fmt} | workout.service (download) | POST same path |
| GET /athlete/{id}/download-workout{fmt} | workout.service (download) | POST same path |
| POST /activity/{id}/streams.csv | activity.service (upload) | PUT same path |
| GET /chats | chat.service | GET /athlete/{id}/chats |
| GET /athlete/{id}/routes/{id}/similarities | route.service | GET .../routes/{id}/similarity/{otherId} |
| GET /athlete/{id}/fitness | fitness.service | none (maybe athlete-summary or wellness) |
| GET /athlete/{id}/activity-summary | fitness.service | none (maybe athlete-summary{ext}) |
| GET /athlete/{id}/power-vs-hr | performance.service | GET /athlete/{id}/power-hr-curve |
| GET /athlete/{id}/weather | weather.service | GET /athlete/{id}/weather-forecast |
| GET /activity/{id}/weather | activity.service | none (only weather-summary exists) |
| GET /search/athletes | search.service | none |
| DELETE /athlete/{id}/wellness/{date} | wellness.service | none |
| POST /shared-event | shared-event.service | none (only GET exists) |
| PUT /shared-event/{id} | shared-event.service | none |
| DELETE /shared-event/{id} | shared-event.service | none |

`GET /activity/{id}/streams.csv` matches the spec's `streams{ext}` and is not disputed.

### The 45 spec operations missing from the SDK

Grouped for delivery order (see Phase 3):

1. Quick wins in existing services (13): `GET gear`, `GET activity gpx-file`,
   `GET workouts.zip`, `GET events/{id}/download{ext}`, `GET activity-tags`,
   `GET event-tags`, `GET workout-tags`, `GET weather-forecast`,
   `DELETE activity/{id}/tombstone`, `GET chats/{id}`,
   `GET athlete/{id}/activities/{ids}`, `POST download-fit-files`,
   `POST download-workout` (both variants count as one group with the GET fix).
2. Analytics, new service (13): `gap-histogram`, `hr-histogram`,
   `pace-histogram`, `power-histogram`, `time-at-hr`, `interval-stats`,
   `power-spike-model`, `activity power-curves{ext}`, `mmp-model`,
   `power-hr-curve`, `activity-pace-curves{ext}`, `fitness-model-events`,
   `athlete-summary{ext}`.
3. Search and list completions (4): `search-full`, `interval-search`,
   `activities-around`, `activities.csv`.
4. Coach and multi-athlete (4): `GET /athletes`, `connections`, `groups`,
   `settings/{key}`.
5. Chat completions and misc (8): message `PUT` and `DELETE`, `chats/{id}/block`,
   `DELETE /disconnect-app`, `gear/{id}/calc`,
   `sport-settings/{id}/matching-activities`,
   `sport-settings/{id}/pace_distances`, `PUT streams.csv`.

## Architecture

Unchanged in shape. Services depend on `IHttpClient`; `AxiosHttpClient` is
the only concrete implementation. Changes:

- `IHttpClient.download` gains an options object: `{ method?: 'GET' | 'POST'; params?; data? }`.
  The current `(url, params)` signature stays as an overload for one release.
- New `AnalyticsService` at `src/services/analytics.service.ts`, exposed as
  `client.analytics`. Activity-level analytics that already live in
  `ActivityService` (curves, best-efforts, hr-load-model) stay put; the new
  service holds only the 13 new operations to avoid a breaking move.
- `FitnessService` is removed unless Phase 1 shows its two routes work live.
- `spec/openapi.json` is the vendored contract. `scripts/coverage.ts` diffs
  the SDK against it. `scripts/check-spec-drift.ts` refetches the live spec and
  reports a diff.
- `src/types/generated.ts` is produced by `openapi-typescript` from the
  vendored spec and committed. Hand-written types in `src/types/*.ts` stay
  where they are richer; new endpoints use generated types via aliases in
  the relevant `src/types/*.ts` file so the public barrel stays curated.

## Testing

- Unit tests: existing vitest suite with mocked axios. Every new or changed
  method gets a test that asserts method and URL, not just response shape.
- Live tests: `tests/live/*.live.test.ts`, a separate vitest project, run
  only when `INTERVALS_API_KEY` and `INTERVALS_ATHLETE_ID` are set. Read-only
  probes by default; write probes are opt-in via `INTERVALS_LIVE_WRITE=1` and
  clean up after themselves. Replaces `examples/manual-integration-test`,
  which references a method removed in v2.1 and no longer compiles.
- CI: new `ci.yml` runs lint, typecheck, unit tests, build, and the coverage
  script on every PR and push to main. Coverage is baselined against
  `spec/coverage-baseline.json` (the 16 currently-known phantom ops and the
  104 currently-covered spec ops): it fails the build only on a new phantom
  op not in that baseline, loss of a previously-covered spec op, or a stale
  baseline entry (a phantom op that's no longer phantom, or a newly-covered
  spec op not yet recorded). `--strict` ignores the baseline and fails on any
  phantom or missing op; CI switches to `--strict` once Phase 3 reaches
  149/149.
- Weekly `spec-drift.yml` refetches the live spec and opens or updates an
  issue when it differs from the vendored one.

## Phases and versioning

| Phase | Deliverable | Version |
|---|---|---|
| 0 | vendored spec, coverage script, CI, drift job, package rename | 3.0.0-alpha.0 |
| 1 | live test harness, `AUDIT.md` with 16 verdicts (needs user's API key) | unchanged |
| 2 | verb fixes, path fixes, deletions, regression tests | 3.0.0-alpha.1 |
| 3 | five PRs adding 45 ops, coverage gate tightened to 149/149 | 3.0.0-beta.x |
| 4 | changelog, migration guide, docs, `.windsurf/rules` refresh, tag | 3.0.0 |

Phase 1 verdicts feed Phase 2. If a phantom route works live it is kept and
documented as undocumented; otherwise it is deleted (no deprecated shim).

## Package identity

- name: `@0x3639/intervals-icu`
- repository, bugs, homepage: `github.com/0x3639/node-intervals-icu`
- author: `0x3639`; original author credited in `contributors` and README
- GitHub Packages workflow scope updated from `@paladini` to `@0x3639`

## Out of scope

- Browser bundle work, fetch-based HTTP client, or dropping axios.
- Response validation at runtime (zod or similar).
- Any change to retry, rate-limit, or error-handling behavior.
