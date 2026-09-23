# Phase 3: full spec coverage — design

Date: 2026-09-21
Status: approved in brainstorming; supersedes the Phase 3 sections of
`2026-09-20-sdk-fix-and-extend-design.md` where the two differ (noted inline).
Baseline: main at `8f5d966` (PR #4 merged), 3.0.0-alpha.1, coverage 114/149
spec operations, 0 phantom, 3 allowlisted undocumented routes.

## Goal

Cover the 35 spec operations the SDK does not yet call, so that
`scripts/coverage.mjs` reports 149/149 and CI enforces `--strict`. Everything
is additive: no public method changes or removals.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Delivery | Two PRs. PR A completes existing services (25 ops). PR B adds `AnalyticsService` (10 ops), flips CI to `--strict`. | Each PR costs a whole-branch review, CodeRabbit and up to five Codex rounds; five PRs is too much overhead for 35 small methods, one PR is too large to review well. |
| Types | Hand-write the four genuinely new interfaces; no `openapi-typescript`, no `src/types/generated.ts`. Amends the original spec. | The 35 ops reach 36 schemas; 32 already exist hand-written. A 9,700-line generated file for four types is not worth a dependency and a freshness check. |
| Type drift | A unit test compares each new interface's property names to the vendored schema. | Keeps the hand-written types honest without a generator. |
| `{ext}` routes | Two methods per route: a typed JSON method and a `...CSV` sibling returning `Buffer`. | Matches `getStreamsCSV` / `downloadFitFiles`; avoids union return types. |
| `fitness-model-events` | Lives in `EventService`, not `AnalyticsService`. Amends the original spec. | Tagged Events in the spec, returns `Event[]`, has no analytics parameters. |
| `activity-pace-curves` `filters` | Omitted until live-verified. | Object arrays have no reliable query-string encoding; same ruling as Phase 2's `getPowerHRCurve`. |
| `disconnectApp` | Implemented, never live-tested. | Revokes the calling OAuth app; not reversible via the API. |
| Versions | PR A → 3.0.0-alpha.2. PR B → 3.0.0-beta.1. | Stable 3.0.0 and npm publish are Phase 4, after a live run over the full surface. |

## PR A — complete the existing services (25 operations)

Method names follow each service's existing style. Optional trailing
`athleteId?: string` wherever the route is athlete-scoped, as today.

### `client.activities` (8)

| Method | Route | Returns |
|---|---|---|
| `getActivities(ids: string[], options?: { intervals?: boolean })` | `GET /athlete/{athleteId}/activities/{ids}` — ids comma-joined in the path | `Activity[]` |
| `listActivitiesAround(activityId, options?: { route_id?, limit? })` | `GET /athlete/{id}/activities-around` | `Activity[]` |
| `searchActivitiesFull(q, options?: { limit? })` | `GET /athlete/{id}/activities/search-full` | `Activity[]` |
| `searchIntervals(options: IntervalSearchOptions)` | `GET /athlete/{id}/activities/interval-search` | `Activity[]` |
| `listActivityTags()` | `GET /athlete/{id}/activity-tags` | `string[]` |
| `downloadActivitiesCSV()` | `GET /athlete/{id}/activities.csv` | `Buffer` |
| `downloadGPX(activityId, options?: { power?, hr? })` | `GET /activity/{id}/gpx-file` | `Buffer` |
| `deleteTombstone(activityId)` | `DELETE /activity/{id}/tombstone` | `void` |

`IntervalSearchOptions`: `minSecs`, `maxSecs`, `minIntensity`, `maxIntensity`
(required), `type?: 'AUTO' | 'POWER' | 'HR' | 'PACE'`, `minReps?`, `maxReps?`, `limit?`.

### `client.athletes` (4)

| Method | Route | Returns |
|---|---|---|
| `listAthletes(options?: { extIdPrefix?: string })` | `GET /athletes` (`ext_id_prefix`) | `AthleteWithTags[]` |
| `getConnections()` | `GET /athlete/{id}/connections` | `AthleteConnections` |
| `getSettings(deviceClass: 'phone' \| 'tablet' \| 'desktop' \| string)` | `GET /athlete/{id}/settings/{deviceClass}` | `Record<string, Record<string, unknown>>` |
| `disconnectApp()` | `DELETE /disconnect-app` | `void` |

### `client.chats` (5)

| Method | Route | Returns |
|---|---|---|
| `getChat(chatId)` | `GET /chats/{id}` | `Chat` |
| `listGroups()` | `GET /athlete/{id}/groups` | `Chat[]` |
| `blockChat(chatId, on: boolean)` | `PUT /chats/{id}/block?on=` | `Chat` |
| `updateMessage(chatId, msgId, message: UpdateMessageDTO)` | `PUT /chats/{id}/messages/{msgId}` | `Record<string, unknown>` |
| `deleteMessage(chatId, msgId)` | `DELETE /chats/{id}/messages/{msgId}` | `Record<string, unknown>` |

### `client.events` (3)

| Method | Route | Returns |
|---|---|---|
| `listEventTags()` | `GET /athlete/{id}/event-tags` | `string[]` |
| `listFitnessModelEvents()` | `GET /athlete/{id}/fitness-model-events` | `Event[]` |
| `downloadWorkoutsZip(options: WorkoutsZipOptions)` | `GET /athlete/{id}/workouts.zip` | `Buffer` |

`WorkoutsZipOptions`: `ext: WorkoutFormat`, `oldest`, `newest` (required),
`powerRange?`, `hrRange?`, `paceRange?`, `locale?`.
The `ext` query value is sent without the leading dot (spec: "zwo, mrc, erg or fit").

### `client.gear` (3)

| Method | Route | Returns |
|---|---|---|
| `list()` | `GET /athlete/{id}/gear` | `Gear[]` |
| `downloadCSV()` | `GET /athlete/{id}/gear.csv` | `Buffer` |
| `calc(gearId)` | `GET /athlete/{id}/gear/{gearId}/calc` | `GearStats` |

### `client.sportSettings` (2)

| Method | Route | Returns |
|---|---|---|
| `listMatchingActivities(id)` | `GET /athlete/{athleteId}/sport-settings/{id}/matching-activities` | `ActivitySearchResult[]` |
| `getPaceDistances(id)` | `GET /athlete/{athleteId}/sport-settings/{id}/pace_distances` | `PaceDistancesDTO` |

### `client.workouts` (1)

| Method | Route | Returns |
|---|---|---|
| `listWorkoutTags()` | `GET /athlete/{id}/workout-tags` | `string[]` |

Total: 8 + 4 + 5 + 3 + 3 + 2 + 1 = 26 methods covering 25 spec operations
(`gear{ext}` is one op with two methods; the rest are one-to-one).

## PR B — `AnalyticsService` (10 operations)

`src/services/analytics.service.ts`, constructed with `(httpClient,
defaultAthleteId)` like every other service, wired as `client.analytics` in
`src/client.ts`, exported from `src/index.ts`.

| Method | Route | Returns |
|---|---|---|
| `getPowerHistogram(activityId, options?: { bucketSize? })` | `GET /activity/{id}/power-histogram` | `Bucket[]` |
| `getHRHistogram(activityId, options?: { bucketSize? })` | `GET /activity/{id}/hr-histogram` | `Bucket[]` |
| `getPaceHistogram(activityId)` | `GET /activity/{id}/pace-histogram` | `Bucket[]` |
| `getGAPHistogram(activityId)` | `GET /activity/{id}/gap-histogram` | `Bucket[]` |
| `getTimeAtHR(activityId)` | `GET /activity/{id}/time-at-hr` | `TimeAtHRPlot` |
| `getIntervalStats(activityId, startIndex, endIndex)` | `GET /activity/{id}/interval-stats` | `Interval` |
| `getPowerSpikeModel(activityId)` | `GET /activity/{id}/power-spike-model` | `PowerModel` |
| `getActivityPowerCurves(activityId, options?: ActivityPowerCurvesOptions)` | `GET /activity/{id}/power-curves` | `PowerCurve[]` |
| `getActivityPowerCurvesCSV(activityId, options?)` | `GET /activity/{id}/power-curves.csv` | `Buffer` |
| `getMMPModel(type: ActivityType, athleteId?)` | `GET /athlete/{id}/mmp-model` | `PowerModel` |
| `getActivityPaceCurves(options: ActivityPaceCurvesOptions, athleteId?)` | `GET /athlete/{id}/activity-pace-curves` | `PaceCurveSet` |
| `getActivityPaceCurvesCSV(options, athleteId?)` | `GET /athlete/{id}/activity-pace-curves.csv` | `Buffer` |

`ActivityPowerCurvesOptions`: `types?: string[]`, `fatigue?: string[]` (any of `normal`, `kj0`, `kj1`).
`ActivityPaceCurvesOptions`: `oldest`, `newest` (required), `type?: ActivityType`,
`distances?: number[]`, `gap?: boolean`. `filters` is omitted (see Decisions).

Array params serialize as repeated keys via the Phase 2 `paramsSerializer`.

The spec declares no response schema for `activity-pace-curves{ext}`. It is
typed `PaceCurveSet`, the type of the sibling athlete-level `pace-curves`
route served by the same handler family; the live test asserts the response
has that shape.

Existing activity-level methods on `ActivityService` (`getPowerCurve`,
`getPaceCurve`, `getHRCurve`, `getBestEfforts`, `getPowerVsHR`,
`getHRLoadModel`) hit different routes (`power-curve{ext}` singular, etc.) and
stay where they are.

## Types

New, hand-written, in the existing files:

- `src/types/activity.ts`: `Bucket` (`start`, `secs`, `movingSecs`, `watts`,
  `hr`, `cadence`; all numbers), `TimeAtHRPlot` (spec name `Plot`; `max_bpm`,
  `min_bpm`, `secs: number[]`, `cumulative_secs: number[]`),
  `IntervalSearchOptions`, `ActivitiesAroundOptions`.
- `src/types/athlete.ts`: `AthleteConnections` (`id: string` plus the 20
  spec-listed `*_connected: boolean` flags, written out), `AthleteWithTags =
  Athlete & { icu_tags?: string[]; icu_notes?: string }`.
- `src/types/chat.ts`: `UpdateMessageDTO` (`content?`, `answer?`: the only fields the
  API updates) and `Chat.blocked?: string` (spec date-time).
- `src/types/event.ts`: `WorkoutsZipOptions`.
- `src/types/performance.ts`: `ActivityPowerCurvesOptions`,
  `ActivityPaceCurvesOptions`.

All exported through `src/types/index.ts` and therefore the package barrel.
`Ignore`, `PushError`, `ActivityAnalysisIssue` and `Settings` are reachable
only as nested fields of `Activity` and `Athlete`, which already carry open
index signatures; they are not modelled in this phase.

### Spec-conformance test

`tests/types/spec-conformance.test.ts` (vitest, runs in the normal unit
suite): for each of `Bucket`, `Plot`→`TimeAtHRPlot`, `AthleteConnections`,
it extracts the interface body from the source file with a regex over
`^\s+(\w+)\??:` lines and compares the property-name set with
`components.schemas.<Name>.properties` in `spec/openapi.json`. Any name
present on one side only fails. `AthleteWithTags` is checked as
`Athlete`'s names plus `icu_tags`/`icu_notes`. From PR B the same file also
checks the five query-option types against `paths[...].parameters` (name,
required-ness, type; `ext` is allowed to be the shared `WorkoutFormat` union and
method-argument parameters such as `activity_id` are omitted). Older types are
out of scope.

## Testing

**Unit.** Mocked axios via `tests/helpers/mock-axios.ts`. Every new method
gets a test asserting HTTP method, URL, query params (including repeated-key
arrays), body where applicable, and `responseType: 'arraybuffer'` for
downloads. Tests live in the existing per-service files; PR B adds
`tests/analytics.test.ts`. Roughly 40 new tests across both PRs.

**Live.** `tests/live/phase3.live.test.ts`, gated by `INTERVALS_API_KEY` +
`INTERVALS_ATHLETE_ID` as today, one case per read-only operation, per-test
`ctx.skip()` when the account lacks data. Notes:

- `getIntervalStats` first finds an activity with intervals via
  `activities.getIntervals`.
- `getActivities(ids)` and the histograms reuse the Phase 2
  `latestActivityId()` helper (skips the Strava stub activities).
- Write-gated behind `INTERVALS_LIVE_WRITE=1`, each cleaning up after itself:
  `blockChat` (on then off on a private chat the test finds; skipped if none),
  `updateMessage` and `deleteMessage` (on a message the test sends first),
  `deleteTombstone` runs only behind a separate destructive opt-in
  (`INTERVALS_LIVE_DESTRUCTIVE=1` plus `INTERVALS_TOMBSTONE_ID`), since it cannot be undone.
- `disconnectApp` is never called live.

The live suite is run by the user; the plan lists the commands and expected
skips.

## Coverage gate and CI

- End of PR A: `node scripts/coverage.mjs --write-baseline`; expected
  139 covered / 10 missing / 0 phantom.
- End of PR B: 149 covered / 0 missing / 0 phantom. `ci.yml`'s coverage step
  switches to `node scripts/coverage.mjs --strict`. The baseline file remains
  (the drift job and the non-strict local run still use it) but is no longer
  what CI enforces. `CONTRIBUTING.md`'s coverage paragraph is updated to say
  so.
- No changes to `scripts/lib/spec-ops.mjs`: every call shape used here is
  already parsed (literal method/url, `params`, `download` with an options
  literal).

## Documentation per PR

- `CHANGELOG.md` Unreleased → Added: one line per service group.
- `README.md` service table: new method names in the relevant rows; PR B adds
  the `analytics` row.
- `examples/basic-usage.ts`: PR B adds one `client.analytics` call so the
  example typechecks against the new service.
- `docs/MIGRATION.md`: no changes (nothing breaks).
- `package.json` version: alpha.2 (PR A), beta.1 (PR B).

## Review path

Unchanged: per-task subagent review, whole-branch review, CodeRabbit on the
PR, Codex Daybreak xHigh with a five-round ceiling, then the user merges.

## Out of scope

- Typing the `unknown`-returning legacy methods (`getPowerCurve` and
  siblings) — separate cleanup.
- Typechecking the rest of `tests/**` (about 50 pre-existing implicit-any
  errors) — separate PR.
- `filters` on `getActivityPaceCurves` — needs a live encoding probe first.
- npm publish, 3.0.0 tag, release notes — Phase 4.
