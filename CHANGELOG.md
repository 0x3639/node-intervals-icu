# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Fork of `intervals-icu` v2.2.1 by [0x3639](https://github.com/0x3639). Breaking changes land in the 3.0.0 series; see `docs/guides/migrating-to-v3.md` for the full migration guide.

### Removed
- `client.fitness` (`getFitness`, `getSummaries`): the routes never existed. Use `client.athletes.getSummary()`.
- `client.search.searchAthletes()`: no such route.
- `client.wellness.deleteWellness()`: the API has no DELETE mapping for wellness records.
- `client.activities.getWeather()`: duplicate of `getWeatherSummary()`.
- `client.workouts.downloadWorkout()` / `downloadWorkoutForAthlete()`: replaced by `convertWorkout()` / `convertWorkoutForAthlete()`, which POST a workout body as the API requires.
- `FitnessService` class export.

### Changed
- **Package renamed** to `@0x3639/intervals-icu`. Install and import paths change.
- `client.chats.listChats()` now calls `GET /athlete/{id}/chats` (was `/chats`, 404).
- `client.performance.getPowerVsHR()` renamed to `getPowerHRCurve({ start, end })` and calls `/power-hr-curve`.
- `client.weather.getWeather()` renamed to `getForecast()` and calls `/weather-forecast`.
- `client.routes.getSimilarities(routeId)` replaced by `getSimilarity(routeId, otherRouteId)` returning one `RouteSimilarity`.
- `getPowerHRCurve` does not yet accept `filters`; object-valued query arrays have no verified encoding.
- `ChatService` constructor now requires `defaultAthleteId` (only relevant if you construct services directly).
- `client.activities.downloadFitFiles()` sends POST; `updateStreamsCSV()` sends PUT.
- `IHttpClient.download(url, options)` replaces `download(url, params)`: query params go in `options.params` (object or `URLSearchParams`), `options.method` may be `POST`, `options.data` is a JSON body. `upload()` accepts `method`. Breaking only for custom `IHttpClient` implementations.
- `PowerModel` now has the spec's field names (`criticalPower`, `wPrime`, `pMax`, `inputPointIndexes`, `ftp`, `type`); the previous `cp`/`w_prime`/`p_max`/`ftp_watts`/`ftp_secs`/`r2` fields were never returned by the API. The `[key: string]: unknown` index signature is gone and `PowerModelType` narrows from `string` to `'MS_2P' | 'MORTON_3P' | 'FFT_CURVES' | 'ECP'`.

### Added
- `client.analytics` (`AnalyticsService`): `getPowerHistogram()`, `getHRHistogram()`, `getPaceHistogram()`, `getGAPHistogram()`, `getTimeAtHR()`, `getIntervalStats()`, `getPowerSpikeModel()`, `getCurves()` / `getCurvesCSV()`, `getMMPModel()`. Activity ids are URL-encoded in paths. Types `Bucket`, `TimeAtHRPlot`, `ActivityPowerCurvesOptions` (`fatigue` is a list of `normal`/`kj0`/`kj1`), `ActivityPaceCurvesOptions`, and `ActivityPaceCurves` (the observed `{ distances, gap, curves }` response; the spec declares no schema). The CSV pace-curves form needs `distances` (observed HTTP 500 without it).
- `client.performance.getActivityPaceCurves()` / `getActivityPaceCurvesCSV()` (athlete-level, beside `getActivityPowerCurves`); the CSV form requires `distances` because the API returns HTTP 500 without them.
- `ActivityType` gains `'Cyclocross'`, which the spec's sport enum includes.
- `tests/types/spec-conformance.test.ts` now also checks the five query-option types against `paths[...].parameters`.
- Coverage: 149/149 spec operations; CI now runs the coverage gate in `--strict` mode.
- Activities: `getActivities(ids)`, `listActivitiesAround()`, `searchActivitiesFull()`, `searchIntervals()`, `listActivityTags()`, `downloadActivitiesCSV()`, `downloadGPX()`, `deleteTombstone()`.
- Athletes: `listAthletes()`, `getConnections()`, `getSettings(deviceClass)`, `disconnectApp()`.
- Chats: `getChat()`, `listGroups()`, `blockChat()`, `updateMessage()`, `deleteMessage()`.
- Events: `listEventTags()`, `listFitnessModelEvents()`, `downloadWorkoutsZip()`. Workouts: `listWorkoutTags()`.
- Gear: `list()`, `downloadCSV()`, `calc()`. Sport settings: `listMatchingActivities()`, `getPaceDistances()`.
- Types: `AthleteConnections`, `AthleteWithTags`, `IntervalSearchOptions`, `ActivitiesAroundOptions`, `WorkoutsZipOptions`; `tests/types/spec-conformance.test.ts` checks new hand-written types against the vendored spec. Also `UpdateMessageDTO` (body for `chats.updateMessage()`) and `Chat.blocked`.
- Phase 3 methods URL-encode caller-supplied path segments (activity, gear and sport-settings ids, device class), so a delimiter in an id cannot change the route; `deleteTombstone` in particular can no longer be turned into an activity delete.
- `client.athletes.getSummary()`, `client.events.downloadWorkout(eventId, format)`, `client.workouts.convertWorkout()` / `convertWorkoutForAthlete()`.
- `WorkoutConversionInput` and `WorkoutDoc` (exported from the package entrypoint): the body type for `convertWorkout()` / `convertWorkoutForAthlete()`; `name`, `description`, `type` and a non-null object `workout_doc` are required as a conservative contract: live probes showed a body with all four converts and a body without `workout_doc` returns HTTP 500 (fields were not probed individually; see AUDIT.md). `Event.workout_doc` is now typed `WorkoutDoc` instead of `any`.
- `npm run typecheck:tests` (part of `typecheck`): compile-time contract tests under `tests/types/` and the live suite are typechecked in CI.
- `spec/openapi.json`: vendored snapshot of the Intervals.icu OpenAPI document
- `npm run coverage:api`: diffs SDK routes against the vendored spec; enforced in CI
- `npm run spec:drift`: weekly GitHub Action opens an issue when the live spec changes
- CI workflow running lint, typecheck, tests and build on Node 18, 20, 22
- `spec/undocumented-routes.json`: verified live routes absent from the spec (shared-event create/update/delete)
- `AUDIT.md`: live verdicts for the 16 disputed routes

## [2.2.1] - 2025-03-04

### Changed
- **Dropped `form-data` dependency** — file uploads now use the native `FormData` API (Node 18+), removing 1 direct dependency and its transitives
- Upload method signatures changed from `Buffer | Blob | NodeJS.ReadableStream` to `Buffer | Blob | Uint8Array` (affects `uploadActivity`, `updateStreamsCSV`, `uploadWellnessCSV`, `importWorkout`, `uploadImage`)

## [2.2.0] - 2025-03-04

### Added
- **Retry-After header support** — 429 responses now respect the `Retry-After` header (seconds or HTTP-date) to determine retry delay
- **`retryAfter` field** on `IntervalsAPIError` and `APIError` interface — exposes the server-requested wait time in seconds
- **Jitter in exponential backoff** — retry delays now include random jitter (`0.5–1.0×`) to avoid thundering-herd effects
- **Related Projects** section in README comparing `intervals-icu` with `@kuranov/intervals-client`

## [2.1.0] - 2025-03-03

### Removed
- **All 20 backward-compatible facade methods** from `IntervalsClient` (e.g. `client.getAthlete()`, `client.getEvents()`, `client.getActivity()`) — use service accessors instead (e.g. `client.athletes.getAthlete()`, `client.events.listEvents()`, `client.activities.getActivity()`)
- **5 deprecated service aliases**: `getActivities()`, `getEvents()`, `getWellness()`, `getWorkouts()`, `getSportSettings()` — use `listActivities()`, `listEvents()`, `listWellness()`, `listWorkouts()`, `sportSettings.list()` respectively
- Numeric activity ID backward-compat shim (`client.getActivity(12345)`) — activity IDs are strictly `string` now

### Added
- [Migration Guide](./docs/guides/migrating-to-v3.md) with full table of removed methods and before/after examples

## [2.0.0] - 2025-03-03

### Added
- **16 service classes** covering 100+ Intervals.icu API endpoints: Athletes, Activities, Events, Wellness, Workouts, Sport Settings, Folders, Gear, Chats, Weather, Routes, Custom Items, Shared Events, Fitness, Performance, Search
- **OAuth bearer token** authentication (`accessToken` config option)
- **File upload** support via multipart form-data (activity files: .fit, .tcx, .gpx, .zip)
- **Binary download** support for activity file exports
- **Auto-retry with exponential backoff** for 429 and 5xx errors (`maxRetries`, `retryDelayMs`)
- **~40 TypeScript interfaces** generated from the Intervals.icu OpenAPI spec
- **Service accessor pattern** — `client.activities`, `client.events`, `client.chats`, etc.
- Comprehensive test suite (75 tests across 11 test files)

### Changed
- **BREAKING:** Activity IDs are now `string` (e.g. `'i55610271'`). Facade methods still accept `number` for backward compatibility.
- **BREAKING:** Single-activity endpoints now correctly use `/activity/{id}` instead of `/athlete/{id}/activities/{id}`
- **BREAKING:** Default timeout increased from 10s to 30s
- **BREAKING:** `apiKey` is now optional — provide `apiKey` OR `accessToken`
- Default `athleteId` changed from `'me'` to `'0'` (authenticated athlete)
- Types moved from monolithic `src/types.ts` to modular `src/types/*.ts` barrel

### Removed
- Monolithic `src/types.ts` (replaced by `src/types/index.ts` barrel)

## [1.1.1] - 2025-12-12

### Fixed
- Corrected repository URLs in package.json to point to the correct GitHub repository (`paladini/node-intervals-icu`)

## [1.1.0] - 2025-12-12

### Added
- Added `type` field to `Event` interface to allow reliable differentiation between event types (Run, Ride, Swim, Strength, etc.)
- Added comprehensive test suite for event type filtering
- Added documentation for filtering events by type in README

### Changed
- Improved event filtering examples in documentation to use the new `type` field instead of name-based pattern matching

## [1.0.1] - Previous Release

Initial release with core functionality.

[1.1.0]: https://github.com/paladini/intervals-icu/compare/v1.0.1...v1.1.0
