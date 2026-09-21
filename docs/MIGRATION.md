# Migrating to v3

This guide covers all breaking changes when upgrading from v2.x to v3.x. Every change here comes from fixing SDK routes that disagreed with the live Intervals.icu API — see [AUDIT.md](../AUDIT.md) for the live verdicts behind each one.

## Removed methods

| Removed method | Replacement |
|---|---|
| `client.fitness.getFitness()` | `client.athletes.getSummary()` |
| `client.fitness.getSummaries()` | `client.athletes.getSummary()` |
| `client.search.searchAthletes()` | none — the route never existed |
| `client.wellness.deleteWellness()` | none — the API has no DELETE mapping for wellness records |
| `client.activities.getWeather()` | removed; the nearest working endpoint is `getWeatherSummary()`, which returns a different shape (`ActivityWeatherSummary`) |
| `client.workouts.downloadWorkout()` | `client.workouts.convertWorkout()`, or `client.events.downloadWorkout(eventId, format)` for a calendar event |
| `client.workouts.downloadWorkoutForAthlete()` | `client.workouts.convertWorkoutForAthlete()`, or `client.events.downloadWorkout(eventId, format)` |

## Renamed / fixed methods

| Before | After |
|---|---|
| `client.chats.listChats()` — called `GET /chats` (404) | `client.chats.listChats()` — now calls `GET /athlete/{id}/chats` |
| `client.performance.getPowerVsHR()` | `client.performance.getPowerHRCurve({ start, end })` — calls `/power-hr-curve` |
| `client.weather.getWeather()` | `client.weather.getForecast()` — calls `/weather-forecast` |
| `client.routes.getSimilarities(routeId)` — returned a list | `client.routes.getSimilarity(routeId, otherRouteId)` — returns a single `RouteSimilarity` |
| `client.activities.downloadFitFiles()` — sent GET (405) | `client.activities.downloadFitFiles()` — now sends POST |
| `client.activities.updateStreamsCSV()` — sent POST (405) | `client.activities.updateStreamsCSV()` — now sends PUT |

Note: `client.activities.getPowerVsHR(activityId)` is unrelated and unchanged — it's a per-activity endpoint that was always spec-valid, distinct from the removed `client.performance.getPowerVsHR()`.

## `IHttpClient.download()` signature change

`download(url, options?)` replaces `download(url, params?)`. This only matters if you implement a custom `IHttpClient` — the built-in `AxiosHttpClient` handles the change transparently:

```typescript
// v2
download(url: string, params?: Record<string, unknown>): Promise<Buffer>;

// v3
interface DownloadOptions {
  method?: 'GET' | 'POST';
  params?: Record<string, unknown> | URLSearchParams; // URLSearchParams lets a key repeat, e.g. ids=a&ids=b
  data?: unknown; // JSON body, only meaningful with POST
}
download(url: string, options?: DownloadOptions): Promise<Buffer>;
```

`UploadConfig` (used by `upload()`) gained the same idea: an optional `method?: 'POST' | 'PUT'`, defaulting to `POST`.

## Quick migration example

```typescript
// ─── Before (v2) ───
const fitness = await client.fitness.getFitness({ oldest: '2024-01-01', newest: '2024-12-31' });
const curve = await client.performance.getPowerVsHR();
const weather = await client.weather.getWeather();
const similar = await client.routes.getSimilarities(routeId);
const zwo = await client.workouts.downloadWorkout(workoutId, '.zwo');

// ─── After (v3) ───
const summary = await client.athletes.getSummary({ start: '2024-01-01', end: '2024-12-31' });
const curve = await client.performance.getPowerHRCurve({ start: '2024-01-01', end: '2024-12-31' });
const weather = await client.weather.getForecast();
const similar = await client.routes.getSimilarity(routeId, otherRouteId);

// convertWorkout POSTs a workout body instead of downloading an existing library
// workout by id. The body type, WorkoutConversionInput, requires `name`, `description`,
// `type` and `workout_doc`: live probes showed a body with all four converts and a body
// without `workout_doc` returns HTTP 500 (see AUDIT.md; fields were not probed one at a
// time). Every field on a calendar Event is optional, so narrow one before converting it:
import type { Event, WorkoutConversionInput } from '@0x3639/intervals-icu';

// Check runtime shapes, not just truthiness: the API response is external data.
const isConvertible = (e: Event): e is Event & WorkoutConversionInput & { id: number } =>
  typeof e.id === 'number' &&
  typeof e.name === 'string' &&
  typeof e.description === 'string' &&
  typeof e.type === 'string' &&
  typeof e.workout_doc === 'object' && e.workout_doc !== null && !Array.isArray(e.workout_doc);

const events = await client.events.listEvents({ oldest: '2024-01-01', newest: '2024-12-31', category: ['WORKOUT'] });
const event = events.find(isConvertible);
if (event) {
  const zwo = await client.workouts.convertWorkout(event, '.zwo');

  // Or download an existing calendar event's workout file directly by id:
  const zwo2 = await client.events.downloadWorkout(event.id, '.zwo');
}
```

---

# Migrating to intervals-icu v2

This guide covers all breaking changes when upgrading from v1.x to v2.x.

## Removed Methods

All top-level facade methods on `IntervalsClient` have been removed. Use the service accessors instead:

| Removed method | Replacement |
|---|---|
| `client.getAthlete()` | `client.athletes.getAthlete()` |
| `client.updateAthlete(data)` | `client.athletes.updateAthlete(data)` |
| `client.getSportSettings()` | `client.sportSettings.list()` |
| `client.getEvents(opts)` | `client.events.listEvents(opts)` |
| `client.getEvent(id)` | `client.events.getEvent(id)` |
| `client.createEvent(data)` | `client.events.createEvent(data)` |
| `client.updateEvent(id, data)` | `client.events.updateEvent(id, data)` |
| `client.deleteEvent(id)` | `client.events.deleteEvent(id)` |
| `client.getWellness(opts)` | `client.wellness.listWellness(opts)` |
| `client.createWellness(data)` | `client.wellness.createWellness(data)` |
| `client.updateWellness(date, data)` | `client.wellness.updateWellness(date, data)` |
| `client.deleteWellness(date)` | `client.wellness.deleteWellness(date)` |
| `client.getWorkouts(opts)` | `client.workouts.listWorkouts(opts)` |
| `client.getWorkout(id)` | `client.workouts.getWorkout(id)` |
| `client.createWorkout(data)` | `client.workouts.createWorkout(data)` |
| `client.updateWorkout(id, data)` | `client.workouts.updateWorkout(id, data)` |
| `client.deleteWorkout(id)` | `client.workouts.deleteWorkout(id)` |
| `client.getActivities(opts)` | `client.activities.listActivities(opts)` |
| `client.getActivity(id)` | `client.activities.getActivity(id)` |
| `client.updateActivity(id, data)` | `client.activities.updateActivity(id, data)` |
| `client.deleteActivity(id)` | `client.activities.deleteActivity(id)` |

The following deprecated service-level aliases were also removed:

| Removed method | Replacement |
|---|---|
| `activityService.getActivities()` | `activityService.listActivities()` |
| `eventService.getEvents()` | `eventService.listEvents()` |
| `wellnessService.getWellness()` | `wellnessService.listWellness()` |
| `workoutService.getWorkouts()` | `workoutService.listWorkouts()` |
| `athleteService.getSportSettings()` | `sportSettingsService.list()` |

## Other Breaking Changes

### Activity IDs are strings

Activity IDs are now `string` (e.g. `'i55610271'`), matching the Intervals.icu API. The facade previously accepted `number | string` for backward compatibility — that shim is gone.

```typescript
// v1.x
const activity = await client.getActivity(12345);

// v2
const activity = await client.activities.getActivity('i12345');
```

### Default timeout increased

The default request timeout changed from **10 seconds** to **30 seconds**.

### Authentication

`apiKey` is now optional. You must provide either `apiKey` (for personal API key auth) or `accessToken` (for OAuth bearer token auth):

```typescript
// API key
const client = new IntervalsClient({ apiKey: 'your-key' });

// OAuth
const client = new IntervalsClient({ accessToken: 'oauth-token' });
```

### Default athleteId

The default `athleteId` changed from `'me'` to `'0'`. Both resolve to the authenticated athlete on the Intervals.icu API, so this is effectively a no-op.

### Activity endpoint URLs

Single-activity endpoints now correctly use `/activity/{id}` instead of the previous incorrect `/athlete/{athleteId}/activities/{id}`. This only matters if you were relying on URL interception or mocking.

## Quick Migration Example

```typescript
// ─── Before (v1.x) ───
import { IntervalsClient } from 'intervals-icu';

const client = new IntervalsClient({ apiKey: 'key', athleteId: 'me' });

const athlete = await client.getAthlete();
const events = await client.getEvents({ oldest: '2024-01-01', newest: '2024-12-31' });
const activity = await client.getActivity(12345);
await client.createWellness({ date: '2024-01-15', weight: 70 });
const settings = await client.getSportSettings();

// ─── After (v2) ───
import { IntervalsClient } from 'intervals-icu';

const client = new IntervalsClient({ apiKey: 'key' });

const athlete = await client.athletes.getAthlete();
const events = await client.events.listEvents({ oldest: '2024-01-01', newest: '2024-12-31' });
const activity = await client.activities.getActivity('i12345');
await client.wellness.createWellness({ date: '2024-01-15', weight: 70 });
const settings = await client.sportSettings.list();
```
