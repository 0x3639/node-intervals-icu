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

_Added in a later task._

## Behaviour notes

- None recorded for this service.
