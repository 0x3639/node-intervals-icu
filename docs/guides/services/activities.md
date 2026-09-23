---
title: Activities
---
# Activities

`client.activities` covers the full activity lifecycle: listing, uploading, editing and deleting activities, plus their streams, intervals, comments, and derived analysis (map, weather, curves, best efforts). List and upload routes are athlete-scoped; single-activity routes address the activity directly by id.

## Methods

| Method | What it does |
|---|---|
| {@link ActivityService.listActivities} | List activities for a date range (descending order) |
| {@link ActivityService.uploadActivity} | Upload a new activity from file (fit, tcx, gpx, or zip/gz) |
| {@link ActivityService.createManualActivity} | Create a manual activity |
| {@link ActivityService.createManualActivitiesBulk} | Create multiple manual activities (upsert on external_id) |
| {@link ActivityService.downloadFitFiles} | Download a zip of Intervals.icu-generated FIT files for the given activities |
| {@link ActivityService.getActivity} | Get an activity |
| {@link ActivityService.updateActivity} | Update an activity (Strava activities cannot be updated) |
| {@link ActivityService.deleteActivity} | Delete an activity |
| {@link ActivityService.getStreams} | Get activity streams (JSON) |
| {@link ActivityService.updateStreams} | Update activity streams (JSON) |
| {@link ActivityService.getStreamsCSV} | Download activity streams as CSV |
| {@link ActivityService.updateStreamsCSV} | Replace activity streams from a CSV file (PUT multipart/form-data) |
| {@link ActivityService.getIntervals} | Get activity intervals |
| {@link ActivityService.updateIntervals} | Update intervals (replace all or merge) |
| {@link ActivityService.updateInterval} | Update/create a single interval |
| {@link ActivityService.deleteIntervals} | Delete intervals |
| {@link ActivityService.splitInterval} | Split an interval at an index |
| {@link ActivityService.downloadFile} | Download the original activity file (gzip compressed) |
| {@link ActivityService.downloadFitFile} | Download the Intervals.icu generated fit file |
| {@link ActivityService.getMap} | Get map data (bounds, latlngs, route, weather) |
| {@link ActivityService.getWeatherSummary} | Get activity weather summary |
| {@link ActivityService.getPowerCurve} | Get power curve for an activity |
| {@link ActivityService.getPaceCurve} | Get pace curve for an activity |
| {@link ActivityService.getHRCurve} | Get HR curve for an activity |
| {@link ActivityService.getBestEfforts} | Get best efforts for an activity |
| {@link ActivityService.getPowerVsHR} | Get power vs HR analysis |
| {@link ActivityService.getHRLoadModel} | Get HR load model for an activity |
| {@link ActivityService.getSegments} | Get segments matched in an activity |
| {@link ActivityService.listMessages} | List all messages (comments) for an activity |
| {@link ActivityService.sendMessage} | Add a message (comment) to an activity |
| {@link ActivityService.getActivities} | Fetch multiple activities by id in one call |
| {@link ActivityService.listActivitiesAround} | Activities before and after another activity, closest first; optionally only those on a route |
| {@link ActivityService.searchActivitiesFull} | Search by name or tag and return full Activity objects (search.searchActivities returns summaries) |
| {@link ActivityService.searchIntervals} | Find activities containing intervals that match a duration and intensity window |
| {@link ActivityService.listActivityTags} | Every tag that has been applied to the athlete's activities |
| {@link ActivityService.downloadActivitiesCSV} | All activities as CSV |
| {@link ActivityService.downloadGPX} | The activity as a GPX file, optionally with power and heart-rate extensions |
| {@link ActivityService.deleteTombstone} | Remove the tombstone left by a deleted activity so the same file can be re-uploaded |

## Examples

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
