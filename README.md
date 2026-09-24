# @0x3639/intervals-icu

<a href="https://paladini.io/harness-score/guide/maturity-model#l1-%C2%B7-documented" title="Harness Score — AI coding harness maturity"><img alt="Harness Score L1 (Documented): measures AI-assisted development harness maturity with harness-score" src="https://paladini.github.io/harness-score/maturity/badge-l1.svg" height="20"></a>
[![npm version](https://img.shields.io/npm/v/%400x3639%2Fintervals-icu)](https://www.npmjs.com/package/@0x3639/intervals-icu)
[![npm downloads](https://img.shields.io/npm/dm/%400x3639%2Fintervals-icu)](https://www.npmjs.com/package/@0x3639/intervals-icu)
[![license](https://img.shields.io/npm/l/%400x3639%2Fintervals-icu)](https://github.com/0x3639/node-intervals-icu/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

> Maintained fork of [paladini/node-intervals-icu](https://github.com/paladini/node-intervals-icu) with a vendored spec snapshot and CI-enforced coverage — all 149 spec operations covered, 0 phantom routes; 3 verified-but-undocumented routes allowlisted (see [spec/undocumented-routes.json](./spec/undocumented-routes.json) and [AUDIT.md](./AUDIT.md)). See [CHANGELOG](./CHANGELOG.md) for what changed in v3.

The most comprehensive TypeScript client for the [Intervals.icu](https://intervals.icu) API — the training platform used by cyclists, runners, triathletes, and coaches worldwide.

**130+ typed methods** across 16 service groups. Dual auth (API key + OAuth), file uploads, auto-retry with jitter, and rate-limit tracking. One dependency (`axios`), ~27 KB minified.

**Documentation:** [0x3639.github.io/node-intervals-icu](https://0x3639.github.io/node-intervals-icu/) — guides, every method, and live-verified API behaviour.

## Installation

```bash
npm install @0x3639/intervals-icu
```

## Quick start

```bash
export INTERVALS_API_KEY=your-api-key   # Settings → Developer settings on intervals.icu
```

```typescript
import { IntervalsClient } from '@0x3639/intervals-icu';

const client = new IntervalsClient({ apiKey: process.env.INTERVALS_API_KEY! });

const athlete = await client.athletes.getAthlete();
console.log(`${athlete.name} — FTP: ${athlete.ftp}`);

const activities = await client.activities.listActivities({ oldest: '2024-01-01', newest: '2024-01-31' });
console.log(`${activities.length} activities in January`);
```

## Services Reference

| Service | Accessor | Key Methods |
|---------|----------|-------------|
| [**Athletes**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Athletes.html) | `client.athletes` | `getAthlete`, `updateAthlete`, `getTrainingPlan`, `updateTrainingPlan`, `getProfile`, `getSummary`, `listAthletes`, `getConnections`, `getSettings`, `disconnectApp` |
| [**Activities**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Activities.html) | `client.activities` | `listActivities`, `getActivity`, `updateActivity`, `deleteActivity`, `uploadActivity`, `getStreams`, `getIntervals`, `getWeatherSummary`, `getPowerCurve`, `listMessages`, `getActivities`, `listActivitiesAround`, `searchActivitiesFull`, `searchIntervals`, `listActivityTags`, `downloadActivitiesCSV`, `downloadGPX`, `deleteTombstone` |
| [**Events**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Events.html) | `client.events` | `listEvents`, `getEvent`, `createEvent`, `updateEvent`, `deleteEvent`, `createEventsBulk`, `markEventAsDone`, `duplicateEvents`, `downloadWorkout`, `listEventTags`, `listFitnessModelEvents`, `downloadWorkoutsZip` |
| [**Wellness**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Wellness.html) | `client.wellness` | `listWellness`, `getWellnessByDate`, `createWellness`, `updateWellness`, `updateWellnessBulk` |
| [**Workouts**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Workouts.html) | `client.workouts` | `listWorkouts`, `getWorkout`, `createWorkout`, `updateWorkout`, `deleteWorkout`, `createWorkoutsBulk`, `duplicateWorkouts`, `convertWorkout`, `listWorkoutTags` |
| [**Sport Settings**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Sport_settings.html) | `client.sportSettings` | `list`, `get`, `create`, `update`, `delete`, `applyToActivities`, `listMatchingActivities`, `getPaceDistances` |
| [**Folders**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Folders.html) | `client.folders` | `list`, `create`, `update`, `delete`, `getSharedWith`, `importWorkout`, `applyPlanChanges` |
| [**Gear**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Gear.html) | `client.gear` | `list`, `downloadCSV`, `calc`, `create`, `update`, `delete`, `replace`, `createReminder`, `updateReminder`, `deleteReminder` |
| [**Chats**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Chats.html) | `client.chats` | `listChats`, `listMessages`, `sendMessage`, `markSeen`, `getChat`, `listGroups`, `blockChat`, `updateMessage`, `deleteMessage` |
| [**Weather**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Weather.html) | `client.weather` | `getForecast`, `getWeatherConfig`, `updateWeatherConfig` |
| [**Routes**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Routes.html) | `client.routes` | `list`, `get`, `update`, `getSimilarity` |
| [**Custom Items**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Custom_items.html) | `client.customItems` | `list`, `get`, `create`, `update`, `delete`, `reorder`, `uploadImage` |
| [**Shared Events**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Shared_events.html) | `client.sharedEvents` | `get`, `create`, `update`, `delete` |
| [**Performance**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Performance.html) | `client.performance` | `getPowerCurves`, `getPaceCurves`, `getHRCurves`, `getPowerHRCurve`, `getActivityPowerCurves`, `getActivityPaceCurves`, `getActivityPaceCurvesCSV` |
| [**Analytics**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Analytics.html) | `client.analytics` | `getPowerHistogram`, `getHRHistogram`, `getPaceHistogram`, `getGAPHistogram`, `getTimeAtHR`, `getIntervalStats`, `getPowerSpikeModel`, `getCurves`, `getCurvesCSV`, `getMMPModel` |
| [**Search**](https://0x3639.github.io/node-intervals-icu/latest/documents/Services.Search.html) | `client.search` | `searchActivities` |

## Learn more

- [Getting started](https://0x3639.github.io/node-intervals-icu/latest/documents/Getting_started.html)
- [Authentication](https://0x3639.github.io/node-intervals-icu/latest/documents/Authentication.html)
- [Errors and retries](https://0x3639.github.io/node-intervals-icu/latest/documents/Errors_and_retries.html)
- [Dates, pagination and arrays](https://0x3639.github.io/node-intervals-icu/latest/documents/Dates,_pagination_and_arrays.html)
- [Files: FIT, GPX, CSV and zip](https://0x3639.github.io/node-intervals-icu/latest/documents/Files__FIT,_GPX,_CSV_and_zip.html)
- [API behaviour](https://0x3639.github.io/node-intervals-icu/latest/documents/API_behaviour.html)
- [Migrating to v3](https://0x3639.github.io/node-intervals-icu/latest/documents/Migrating_to_v3.html)

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

- [Documentation site](https://0x3639.github.io/node-intervals-icu/)
- [Intervals.icu API Documentation](https://intervals.icu/api/v1/docs)
- [Intervals.icu Website](https://intervals.icu)
- [GitHub Repository](https://github.com/0x3639/node-intervals-icu)
- [npm Package](https://www.npmjs.com/package/@0x3639/intervals-icu)
- [Changelog](./CHANGELOG.md)
