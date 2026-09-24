---
title: Analytics
---
# Analytics

`client.analytics` computes per-activity histograms (power, heart rate, pace, GAP), time-at-heart-rate, interval statistics and power models, plus an athlete-level power-vs-heart-rate model used to resolve %MMP workout steps. Activity ids are URL-encoded before use; the older single-curve activity methods remain on {@link ActivityService}.

## Methods

| Method | What it does |
|---|---|
| {@link AnalyticsService.getPowerHistogram} | Time in power buckets |
| {@link AnalyticsService.getHRHistogram} | Time in heart-rate buckets |
| {@link AnalyticsService.getPaceHistogram} | Time in pace buckets |
| {@link AnalyticsService.getGAPHistogram} | Time in grade-adjusted-pace buckets |
| {@link AnalyticsService.getTimeAtHR} | Seconds spent at each heart rate |
| {@link AnalyticsService.getIntervalStats} | Statistics for an arbitrary index range of the activity, as if it were an interval |
| {@link AnalyticsService.getPowerSpikeModel} | Power model fitted to the activity, used to detect power spikes |
| {@link AnalyticsService.getCurves} | Curves (watts, pace, HR, etc.) for one activity, optionally with fatigued variants |
| {@link AnalyticsService.getCurvesCSV} | Same as getCurves, as CSV |
| {@link AnalyticsService.getMMPModel} | Power model used to resolve %MMP workout steps for a sport type |

## Examples

### Histograms

For the newest typed activity in the last year, fetch its power histogram, HR histogram and time-at-heart-rate plot. The API returns HTTP 422 when a requested stream is not available for the activity; each call is wrapped separately so one missing stream does not stop the others.

{@includeCode ../../../examples/analytics/histograms.ts#main}

### Models and curves

Fetch the athlete's ride power model, then for the newest typed activity in the last year: its power spike model, its watts curve (normal fatigue only), and interval stats for its first detected interval, if any. {@link AnalyticsService.getMMPModel} field names ({@link PowerModel}) follow the spec's `PowerModel` schema.

{@includeCode ../../../examples/analytics/models-and-curves.ts#main}

## Behaviour notes

- {@link AnalyticsService.getCurves} returns HTTP 422 for streams or fatigue levels the activity does not have; only `types: ['watts']` with `fatigue: ['normal']` is confirmed to succeed on the live test account.
- {@link PowerModel} field names follow the vendored spec.
- See [API behaviour](../api-behaviour.md) for the cross-service list.
