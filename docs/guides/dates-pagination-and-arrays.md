---
title: Dates, pagination and arrays
---
# Dates, pagination and arrays

## Dates are local-date strings

A local calendar date string in `YYYY-MM-DD` form works on every date-range parameter in the SDK (`oldest`, `newest`, `start`, `end`, and similar), and it is what all the examples here use. Both bounds are inclusive, and the date is read in the athlete's own time zone, so build it from the athlete's `timezone` rather than the machine's when the exact day matters.

A few parameters accept more than a bare date. `spec/openapi.json` marks `start` and `end` on `GET /athlete/{id}/athlete-summary{ext}` — the route behind {@link AthleteService.getSummary}, in both its JSON and `.csv` forms — as "Local date and optional time (ISO-8601)", so those also take a local date-time such as `2026-09-24T06:00:00`. They are the only parameters the spec describes that way; every other date-range parameter is documented as a plain local date.

What never works is `toISOString()` output. Its `Z` suffix makes it a UTC instant rather than a local date, which is a different thing from what these routes expect; slice a `YYYY-MM-DD` out of a local-formatted date instead. Building both ends of a window from a single `Date` avoids a window that silently shifts if the two bounds are computed a moment apart (for example across midnight).

The example below is the canonical form: it resolves the athlete first and formats the newer bound in `me.timezone`, then steps the older bound back in whole calendar days rather than in hours, so the window does not move when the range spans a daylight-saving change. Both helpers live in `examples/_shared/local-date.ts` and are covered by unit tests.

{@includeCode ../../examples/guides/date-windows.ts#main}

The read-only service examples elsewhere in these guides format their windows in the machine's own zone instead, without the extra round trip to resolve the athlete: a read window that is off by a day at one end returns a day more or a day less of data, which is harmless. Resolve the athlete's zone when the exact day matters — writing a wellness record, or placing a calendar event.

## Paging

List routes page with `oldest`/`newest` and, where the route's options include it, `limit` (and `offset`) — see {@link PaginationOptions}, which {@link ListActivitiesOptions} and other list-options types extend. There are no opaque cursors to carry between calls: to page through a large range, narrow it with `oldest`/`newest`/`limit` and issue another request.

{@link PaginationOptions} also carries `resolve`, unrelated to paging itself: it resolves nested objects in the response (for example turning a workout's pace targets into actual m/s values) rather than leaving them in their raw, unresolved form.

## Array parameters

Every array-valued option is passed to the SDK as a real array. Never join the values yourself: the SDK decides, per parameter, whether the wire format is one comma-joined value or a repeated key, and a string you joined by hand would be joined or escaped a second time.

### Options the SDK comma-joins

A few named options are joined into a single value before the request is sent, because the route expects one value rather than a repeated key:

| Option | Method | Sent as |
|---|---|---|
| `fields` | {@link ActivityService.listActivities} | `fields=name,type` |
| `ids` | {@link ActivityService.downloadFitFiles} | `ids=a,b` |
| `types` | {@link ActivityService.getStreams} | `types=watts,heartrate` |
| `category` | {@link EventService.listEvents}, {@link EventService.deleteEventsRange} | `category=WORKOUT,NOTE` |
| activity ids | {@link PerformanceService.getActivityPowerCurves}, {@link PerformanceService.getActivityHRCurves} | `id=a,b` |

{@link ActivityService.getActivities} also comma-joins, but into the URL path rather than the query string — see [Ids in paths](#ids-in-paths) below.

The comma join for `ids` on `POST /athlete/{id}/download-fit-files` is confirmed against the live API (see the [Files](./files.md) guide and `AUDIT.md`): a probe found identical results for `?ids=a,b` and `?ids=a&ids=b`.

### Every other array option

Any array option not in the table above reaches axios un-joined and is serialized as repeated query keys — `tags=race&tags=long` — not axios's default bracket/index notation (`tags[0]=race`). The SDK configures this explicitly (`paramsSerializer: { indexes: null }` in the HTTP client) because the API is a Spring backend that binds repeated keys to a list parameter but does not understand indexed or bracketed ones. `tags` on {@link AthleteService.getSummary} and `types`/`fatigue` on {@link AnalyticsService.getCurves} are sent this way.

{@includeCode ../../examples/guides/array-params.ts#main}

## Ids in paths

{@link ActivityService.getActivities} takes a list of ids and joins them into the URL path with commas after URL-encoding each one individually (`ids.map(encodeURIComponent).join(',')`), rather than sending them as a query parameter.

Encoding is not applied SDK-wide. These are the methods that pass a caller-supplied path segment through `encodeURIComponent`, so that a `#`, `?`, `/` or `%` inside the value cannot be misread as a path separator or the start of a query string:

- {@link ActivityService.getActivities}, {@link ActivityService.downloadGPX}, {@link ActivityService.deleteTombstone}
- {@link AnalyticsService.getPowerHistogram}, {@link AnalyticsService.getHRHistogram}, {@link AnalyticsService.getPaceHistogram}, {@link AnalyticsService.getGAPHistogram}, {@link AnalyticsService.getTimeAtHR}, {@link AnalyticsService.getIntervalStats}, {@link AnalyticsService.getPowerSpikeModel}, {@link AnalyticsService.getCurves}, {@link AnalyticsService.getCurvesCSV}
- {@link AthleteService.getSettings}
- {@link GearService.calc}
- {@link SportSettingsService.listMatchingActivities}, {@link SportSettingsService.getPaceDistances}

Every other method interpolates ids into the path as they are given, so encode a value yourself if it can contain a character that is not URL-safe.
