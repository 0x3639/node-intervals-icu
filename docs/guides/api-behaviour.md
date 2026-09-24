---
title: API behaviour
---
# API behaviour

The SDK is checked against a vendored OpenAPI snapshot, `spec/openapi.json`. Where the live Intervals.icu API differs from that spec, or from what a reasonable reading of the spec would suggest, this table records it — one row per gap, with the date it was last confirmed.

| Route | Spec says | API does | SDK does | Observed |
|---|---|---|---|---|
| `POST /shared-event`, `PUT /shared-event/{id}`, `DELETE /shared-event/{id}` | Not in the spec | Routes exist (400/404 probes) | Kept, allowlisted in `spec/undocumented-routes.json` | 2026-09-21 (`AUDIT.md`) |
| `POST /download-workout{ext}` (both variants) | Body is a `Workout` | 500 unless `name`, `description`, `type`, `workout_doc` are present | {@link WorkoutService.convertWorkout}'s `WorkoutConversionInput` requires all four | 2026-09-21 (`AUDIT.md`) |
| `POST /athlete/{id}/download-fit-files` | `ids` array | Comma-joined and repeated keys both bind; 422 `"No activities found"` for malformed import stubs | Comma-joined | 2026-09-21 (`AUDIT.md`) |
| `GET /athlete/{id}/workouts.zip` | `ext` query is "zwo, mrc, erg or fit" | Dot-less value | {@link EventService.downloadWorkoutsZip} strips the dot from `WorkoutFormat` | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `GET /athlete/{id}/activity-pace-curves` | No response schema | `{ distances, gap, curves }` | Typed `ActivityPaceCurves`; `curves` element shape not modelled | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `GET /athlete/{id}/activity-pace-curves` | `{id}` accepts the `0` alias like every other athlete-scoped route | 403 `"Access denied"` for `0`; works with the real athlete id | Pass `athleteId` explicitly, or resolve it with {@link AthleteService.getAthlete} first (the examples do) | 2026-09-24 (`examples/performance/activity-pace-curves.ts`) |
| `GET /athlete/{id}/activity-pace-curves.csv` | Same params as JSON | 500 unless `distances` is supplied | {@link PerformanceService.getActivityPaceCurvesCSV} requires a non-empty `distances` | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `GET /athlete/{id}/power-curves`, `/pace-curves`, `/hr-curves` | `f1`, `f2` and `f3` (comparison-filter arrays) are marked required | Answers without them | {@link CurveOptions}, {@link PowerCurveOptions} and {@link PaceCurveOptions} omit them | 2026-09-24 (`examples/performance/athlete-curves.ts` run) |
| `GET /activity/{id}/power-curves` | `types`, `fatigue` arrays | 422 (empty body) for streams or fatigue variants the activity cannot serve | Documented on {@link AnalyticsService.getCurves}; pass values the activity has | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `PowerModel` responses (`mmp-model`, `power-spike-model`) | Schema fields `type`, `criticalPower`, `wPrime`, `pMax`, `inputPointIndexes`, `ftp` | Confirmed | The type matches the spec since 3.0.0-beta.1 | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `GET /athletes` | — | Requires API-key authentication | Documented on {@link AthleteService.listAthletes} | 2026-09-22 (`tests/live/phase3.live.test.ts`) |
| `ActivityType` enum | Includes `Cyclocross` | — | Added to the SDK union | 2026-09-22 (`spec/openapi.json`) |
| `POST /chats/send-message` | `to_athlete_id` is any athlete id | `422 {"error":"Cannot send message to self"}` when it is the caller's own id | Passed through; the error text is on `IntervalsAPIError.details` and in `message`; the live test and the example need a consenting recipient | 2026-09-24 (curl probe, `tests/live/phase3.live.test.ts`) |

This table is maintained from two sources: `AUDIT.md` at the repository root records the Phase 1/2 live-probe verdicts (2026-09-21) for routes disputed at the time of the initial spec vendoring, and the read-only suites under `tests/live/` re-run a subset of these checks against the live API whenever they are run with credentials. When a probe result changes, update both the relevant test and this table.
