---
title: Performance
---
# Performance

`client.performance` computes athlete-level power, pace and heart-rate curves (best efforts over time) and compares those curves across a set of activities. Single-activity curves remain on {@link ActivityService}.

## Methods

| Method | What it does |
|---|---|
| {@link PerformanceService.getPowerCurves} | Get athlete-level power curves (best efforts over time) |
| {@link PerformanceService.getActivityPowerCurves} | Compare power curves across activities |
| {@link PerformanceService.getPaceCurves} | Get athlete-level pace curves |
| {@link PerformanceService.getHRCurves} | Get athlete-level HR curves |
| {@link PerformanceService.getActivityHRCurves} | Compare HR curves across activities |
| {@link PerformanceService.getActivityPaceCurves} | Best pace over a set of distances across the activities in a date range |
| {@link PerformanceService.getActivityPaceCurvesCSV} | Same as getActivityPaceCurves, as CSV |
| {@link PerformanceService.getPowerHRCurve} | Get the athlete's power vs heart rate curve for a date range |

## Examples

### Athlete-level curves

Fetch the athlete's power, pace and HR curves for the last year, and the power-vs-heart-rate curve over the same range. The three curve routes choose their window with {@link CurveOptions.curves}, not with a date range: each entry is `1y`/`2y` (the past year, the past two years…), `42d` (the past 42 days…), `s0`/`s1` (the current season, the previous one…), `all`, or `r.2026-01-01.2026-03-31` for an explicit range, optionally with a `-kj0`/`-kj1` suffix for the fatigued curve. `type` is required by {@link PerformanceService.getPowerCurves} — {@link PowerCurveOptions} makes it so, and the API returns HTTP 422 without it — while {@link PerformanceService.getPaceCurves} ({@link PaceCurveOptions}, which adds `gap`) and {@link PerformanceService.getHRCurves} ({@link CurveOptions}) accept it but work without it. {@link PerformanceService.getPowerHRCurve} is the exception: it takes an explicit `start`/`end` date range.

{@includeCode ../../../examples/performance/athlete-curves.ts#main}

### Activity pace curves

Best pace over a set of distances across the athlete's runs in the last year, as JSON and as CSV. `distances` is required for the CSV form: the API returns HTTP 500 without it, while the JSON form accepts the omission. The element shape of `ActivityPaceCurves.curves` is unobserved on the live account (it was empty for every sport tried), so the example prints what comes back rather than any specific fields. This route also does not accept the SDK's default "current athlete" alias (athlete id `0`); the example resolves a real athlete id first.

{@includeCode ../../../examples/performance/activity-pace-curves.ts#main}

## Behaviour notes

- {@link PerformanceService.getActivityPaceCurvesCSV} requires a non-empty `distances` array; the JSON form ({@link PerformanceService.getActivityPaceCurves}) does not.
- {@link PerformanceService.getActivityPaceCurves} and {@link PerformanceService.getActivityPaceCurvesCSV} return HTTP 403 "Access denied" for the default athlete alias `0`; the example resolves the real id with `athletes.getAthlete()` first and passes `athleteId` explicitly. See the [API behaviour](../api-behaviour.md) row for `GET /athlete/{id}/activity-pace-curves`.
- {@link PerformanceService.getPowerCurves} needs {@link PowerCurveOptions.type}; without it the API returns HTTP 422.
- The spec marks the `f1`, `f2` and `f3` comparison-filter arrays as required on all three curve routes, but the API answers without them, so the option types omit them. See the [API behaviour](../api-behaviour.md) row for `GET /athlete/{id}/power-curves`.
- The element shape of `ActivityPaceCurves.curves` was not observed on the test account, so the example prints what comes back rather than any specific fields.
- See [API behaviour](../api-behaviour.md) for the cross-service list.
