# @0x3639/intervals-icu

<a href="https://paladini.io/harness-score/guide/maturity-model#l1-%C2%B7-documented" title="Harness Score — AI coding harness maturity"><img alt="Harness Score L1 (Documented): measures AI-assisted development harness maturity with harness-score" src="https://paladini.github.io/harness-score/maturity/badge-l1.svg" height="20"></a>
[![npm version](https://img.shields.io/npm/v/%400x3639%2Fintervals-icu)](https://www.npmjs.com/package/@0x3639/intervals-icu)
[![npm downloads](https://img.shields.io/npm/dm/%400x3639%2Fintervals-icu)](https://www.npmjs.com/package/@0x3639/intervals-icu)
[![license](https://img.shields.io/npm/l/%400x3639%2Fintervals-icu)](https://github.com/0x3639/node-intervals-icu/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

> Maintained fork of [paladini/node-intervals-icu](https://github.com/paladini/node-intervals-icu) with a vendored spec snapshot and CI-enforced coverage — all 149 spec operations covered, 0 phantom routes; 3 verified-but-undocumented routes allowlisted (see [spec/undocumented-routes.json](./spec/undocumented-routes.json) and [AUDIT.md](./AUDIT.md)). See [CHANGELOG](./CHANGELOG.md) for what changed in v3.

The most comprehensive TypeScript client for the [Intervals.icu](https://intervals.icu) API — the training platform used by cyclists, runners, triathletes, and coaches worldwide.

**130+ typed methods** across 16 service groups. Dual auth (API key + OAuth), file uploads, auto-retry with jitter, and rate-limit tracking. One dependency (`axios`), ~27 KB minified.

## Features

- **16 services, 130+ methods** — athletes, activities, events, wellness, workouts, sport settings, folders, gear, chats, weather, routes, custom items, shared events, performance curves, search, analytics
- **Full TypeScript types** — ~100 exported interfaces with JSDoc on every public method
- **Dual authentication** — API key (personal use) or OAuth bearer token (third-party apps)
- **File upload & download** — multipart activity uploads (.fit/.tcx/.gpx/.zip), binary exports
- **Auto-retry with backoff + jitter** — configurable retries for 429/5xx, respects `Retry-After` header
- **Rate limit tracking** — `getRateLimitRemaining()` / `getRateLimitReset()` from response headers
- **Dual output** — ESM + CJS, tree-shakeable
- **Minimal footprint** — single runtime dependency, ~27 KB minified

## Installation

```bash
npm install @0x3639/intervals-icu
```

## Quick Start

### API Key Authentication

```typescript
import { IntervalsClient } from '@0x3639/intervals-icu';

const client = new IntervalsClient({
  apiKey: 'your-api-key',
  athleteId: 'i12345', // optional, defaults to '0' (authenticated athlete)
});

const athlete = await client.athletes.getAthlete();
console.log(`${athlete.name} — FTP: ${athlete.ftp}`);
```

### OAuth Bearer Token

```typescript
const client = new IntervalsClient({
  accessToken: 'oauth-access-token',
  athleteId: 'i12345',
});
```

## Usage Patterns

### Recommended: Service Accessors

Each resource group has a dedicated service with full method coverage:

```typescript
// Activities
const activities = await client.activities.listActivities({ oldest: '2024-01-01', newest: '2024-01-31' });
const activity = await client.activities.getActivity('i55610271');
const streams = await client.activities.getStreams('i55610271', ['watts', 'heartrate']);

// Events
const events = await client.events.listEvents({ oldest: '2024-01-01', newest: '2024-12-31', resolve: true });
await client.events.createEvent({ start_date_local: '2024-06-01', name: 'Race', category: 'RACE' });

// Wellness
const wellness = await client.wellness.listWellness({ oldest: '2024-01-01', newest: '2024-01-31' });
await client.wellness.updateWellnessBulk([{ id: '2024-01-15', weight: 70 }]);

// Sport Settings
const settings = await client.sportSettings.list();

// Chats
await client.chats.sendMessage({ to_athlete_id: 'i456', content: 'Great workout!', type: 'TEXT' });

// Athlete summary & Performance
const summary = await client.athletes.getSummary({ start: '2024-01-01', end: '2024-12-31' });
const curves = await client.performance.getPowerCurves({ oldest: '2024-01-01', newest: '2024-12-31' });

// Search
const results = await client.search.searchActivities('tempo run');

// Weather
const weather = await client.weather.getForecast();

// Upload an activity file
import { readFileSync } from 'fs';
const file = readFileSync('morning_run.fit');
await client.activities.uploadActivity(file, 'morning_run.fit');
```

## Configuration

```typescript
interface IntervalsConfig {
  apiKey?: string;       // API key (mutually exclusive with accessToken)
  accessToken?: string;  // OAuth bearer token
  athleteId?: string;    // Athlete ID (default: '0' = authenticated athlete)
  baseURL?: string;      // API base URL (default: 'https://intervals.icu/api/v1')
  timeout?: number;      // Request timeout ms (default: 30000)
  maxRetries?: number;   // Auto-retry count for 429/5xx (default: 3, set 0 to disable)
  retryDelayMs?: number; // Base retry delay ms, doubles each attempt (default: 1000)
}
```

## Services Reference

| Service | Accessor | Key Methods |
|---------|----------|-------------|
| **Athletes** | `client.athletes` | `getAthlete`, `updateAthlete`, `getTrainingPlan`, `updateTrainingPlan`, `getProfile`, `getSummary`, `listAthletes`, `getConnections`, `getSettings`, `disconnectApp` |
| **Activities** | `client.activities` | `listActivities`, `getActivity`, `updateActivity`, `deleteActivity`, `uploadActivity`, `getStreams`, `getIntervals`, `getWeatherSummary`, `getPowerCurve`, `listMessages`, `getActivities`, `listActivitiesAround`, `searchActivitiesFull`, `searchIntervals`, `listActivityTags`, `downloadActivitiesCSV`, `downloadGPX`, `deleteTombstone` |
| **Events** | `client.events` | `listEvents`, `getEvent`, `createEvent`, `updateEvent`, `deleteEvent`, `createEventsBulk`, `markEventAsDone`, `duplicateEvents`, `downloadWorkout`, `listEventTags`, `listFitnessModelEvents`, `downloadWorkoutsZip` |
| **Wellness** | `client.wellness` | `listWellness`, `getWellnessByDate`, `createWellness`, `updateWellness`, `updateWellnessBulk` |
| **Workouts** | `client.workouts` | `listWorkouts`, `getWorkout`, `createWorkout`, `updateWorkout`, `deleteWorkout`, `createWorkoutsBulk`, `duplicateWorkouts`, `convertWorkout`, `listWorkoutTags` |
| **Sport Settings** | `client.sportSettings` | `list`, `get`, `create`, `update`, `delete`, `applyToActivities`, `listMatchingActivities`, `getPaceDistances` |
| **Folders** | `client.folders` | `list`, `create`, `update`, `delete`, `getSharedWith`, `importWorkout`, `applyPlanChanges` |
| **Gear** | `client.gear` | `list`, `downloadCSV`, `calc`, `create`, `update`, `delete`, `replace`, `createReminder`, `updateReminder`, `deleteReminder` |
| **Chats** | `client.chats` | `listChats`, `listMessages`, `sendMessage`, `markSeen`, `getChat`, `listGroups`, `blockChat`, `updateMessage`, `deleteMessage` |
| **Weather** | `client.weather` | `getForecast`, `getWeatherConfig`, `updateWeatherConfig` |
| **Routes** | `client.routes` | `list`, `get`, `update`, `getSimilarity` |
| **Custom Items** | `client.customItems` | `list`, `get`, `create`, `update`, `delete`, `reorder`, `uploadImage` |
| **Shared Events** | `client.sharedEvents` | `get`, `create`, `update`, `delete` |
| **Performance** | `client.performance` | `getPowerCurves`, `getPaceCurves`, `getHRCurves`, `getPowerHRCurve`, `getActivityPowerCurves`, `getActivityPaceCurves`, `getActivityPaceCurvesCSV` |
| **Analytics** | `client.analytics` | `getPowerHistogram`, `getHRHistogram`, `getPaceHistogram`, `getGAPHistogram`, `getTimeAtHR`, `getIntervalStats`, `getPowerSpikeModel`, `getCurves`, `getCurvesCSV`, `getMMPModel` |
| **Search** | `client.search` | `searchActivities` |

## Error Handling

```typescript
import { IntervalsClient, IntervalsAPIError } from '@0x3639/intervals-icu';

try {
  await client.athletes.getAthlete();
} catch (error) {
  if (error instanceof IntervalsAPIError) {
    console.error(`${error.code}: ${error.message} (HTTP ${error.status})`);

    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Auto-retry handles this, but you can check manually too
      console.log(`Resets at: ${client.getRateLimitReset()}`);
    }
  }
}
```

## TypeScript Types

All types are exported from the package root:

```typescript
import type {
  Athlete, Activity, Event, Wellness, Workout,
  SportSettings, Folder, Gear, Chat, Message,
  WeatherConfig, Forecast, PowerCurveSet, PaceCurveSet,
  IntervalsConfig, PaginationOptions, ListActivitiesOptions,
} from '@0x3639/intervals-icu';
```

## Authentication

### API Key

1. Log in to [Intervals.icu](https://intervals.icu)
2. Go to **Settings > Developer Settings**
3. Copy your API key

### OAuth

For apps that authenticate on behalf of other users, use the [Intervals.icu OAuth flow](https://forum.intervals.icu/t/api-access-and-oauth/781) to obtain an access token, then pass it as `accessToken`.

## Migrating from v1.x

See the full [Migration Guide](./docs/MIGRATION.md) for a complete list of removed methods and before/after examples.

Key changes:

1. **All facade methods removed** — use service accessors (e.g. `client.athletes.getAthlete()` instead of `client.getAthlete()`)
2. **Activity IDs are strings** — e.g. `'i55610271'`
3. **Activity URLs fixed** — single-activity endpoints now use `/activity/{id}`
4. **Default timeout** — increased from 10s to 30s
5. **Auth config** — `apiKey` is now optional; provide `apiKey` OR `accessToken`

## Related Projects

The TypeScript/Node.js ecosystem has a few Intervals.icu API clients worth knowing about:

| Library | npm | Approach | Coverage | Error handling |
|---------|-----|----------|----------|---------------|
| **@0x3639/intervals-icu** *(this library)* | `@0x3639/intervals-icu` | axios, TypeScript types | 16 services, 149 spec operations | throws `IntervalsAPIError` |
| **@kuranov/intervals-client** | `@kuranov/intervals-client` | ky + Valibot runtime validation | 6 resources (~64 endpoints) | `Result<T, E>` — never throws |

**When to use `@0x3639/intervals-icu` (this library):**
- You need the broadest API coverage (16 service groups including routes, gear, weather, custom items, performance, analytics, and search)
- You prefer familiar `try/catch` error handling
- You're comfortable tracking an actively-developed fork (see [AUDIT.md](./AUDIT.md) for known gaps and CHANGELOG for breaking changes)

**When to use `@kuranov/intervals-client`:**
- You want runtime validation of API responses via [Valibot](https://valibot.dev) (catches unexpected API changes at runtime)
- You prefer the `Result<T, E>` pattern (no exceptions thrown)
- You want lifecycle hooks for observability (`onRequest`, `onResponse`, `onRetry`)
- You target browsers or edge runtimes (uses `ky` which is runtime-agnostic)

Both libraries serve the same core purpose and share similar design goals (TypeScript-first, dual ESM+CJS output, auto-retry, OAuth + API key auth). They differ mainly in HTTP client choice, error-handling philosophy, validation strategy, and endpoint coverage.

## License

MIT © [0x3639](https://github.com/0x3639). Original library © [Fernando Paladini](https://github.com/paladini).

## Acknowledgments

Special thanks to Filipe for the inspiration and the initial idea that led to the creation of this library. Your project was the spark that made this happen!

## Links

- [Intervals.icu API Documentation](https://intervals.icu/api/v1/docs)
- [Intervals.icu Website](https://intervals.icu)
- [GitHub Repository](https://github.com/0x3639/node-intervals-icu)
- [npm Package](https://www.npmjs.com/package/@0x3639/intervals-icu)
- [Changelog](./CHANGELOG.md)
