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

_Added in a later task._

## Behaviour notes

- None recorded for this service.
