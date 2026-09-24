---
title: 'Files: FIT, GPX, CSV and zip'
---
# Files: FIT, GPX, CSV and zip

## Downloads return a Buffer

Every method that downloads a file resolves with a Node `Buffer`, ready to write to disk, pipe to a stream, or inspect directly:

| Method | Format |
| --- | --- |
| {@link ActivityService.downloadFile} | Original uploaded activity file (gzip compressed) |
| {@link ActivityService.downloadFitFile} | Intervals.icu-generated FIT file for one activity |
| {@link ActivityService.downloadFitFiles} | Zip of Intervals.icu-generated FIT files for several activities |
| {@link ActivityService.downloadGPX} | GPX file, optionally with power/heart-rate extensions |
| {@link ActivityService.downloadActivitiesCSV} | All activities as CSV |
| {@link ActivityService.getStreamsCSV} | One activity's streams as CSV |
| {@link EventService.downloadWorkout} | One calendar workout in zwo, mrc, erg or fit format |
| {@link EventService.downloadWorkoutsZip} | Calendar workouts in a date range, zipped |
| {@link WorkoutService.convertWorkout} | A workout definition converted to zwo, mrc, erg or fit |
| {@link WorkoutService.convertWorkoutForAthlete} | Same, resolved against an athlete's own FTP/zones |
| {@link GearService.downloadCSV} | Gear list as CSV |
| {@link AnalyticsService.getCurvesCSV} | Activity power curves as CSV |
| {@link PerformanceService.getActivityPaceCurvesCSV} | Athlete-level pace curves as CSV |

{@includeCode ../../examples/guides/download-files.ts#main}

## Uploads

Uploads take a `Buffer | Blob | Uint8Array` plus a filename, and are sent as `multipart/form-data`:

- {@link ActivityService.uploadActivity} — creates a new activity from a fit, tcx, gpx, or zip/gz file.
- {@link ActivityService.updateStreamsCSV} — replaces an activity's streams from a CSV file.
- {@link WellnessService.uploadWellnessCSV} — imports wellness records from a CSV file.
- {@link FolderService.importWorkout} — creates a library workout from a file, in a given folder.
- {@link CustomItemService.uploadImage} — attaches an image to a custom item.

CI never runs this example; running it by hand changes the authenticated account: it uploads a real activity and deletes it again in a `finally` block. If the upload response carries no activity id, the activity stays on the account and has to be deleted by hand.

{@includeCode ../../examples/guides/upload-activity.ts#main}

## Converting workouts

{@link WorkoutService.convertWorkout} and {@link WorkoutService.convertWorkoutForAthlete} take a {@link WorkoutConversionInput} body and a target {@link WorkoutFormat}. All four of `name`, `description`, `type` and `workout_doc` are required on that type, not just `workout_doc`: live probes recorded in `AUDIT.md` found that a body missing `workout_doc` gets HTTP 500 from the API, and the remaining fields were not probed individually, so the SDK treats all four as required as a conservative contract. A calendar workout event's own `workout_doc` field (from {@link EventService.listEvents}) is a convenient source for a real body, since a library or calendar workout already carries all four fields together. See [API behaviour](./api-behaviour.md) for the probe record.

{@includeCode ../../examples/guides/convert-workout.ts#main}

Two related format details:

- {@link EventService.downloadWorkoutsZip} sends its `ext` query parameter without the leading dot (`zwo`, not `.zwo`), even though {@link WorkoutFormat} itself (used elsewhere, such as the `{ext}` path suffix on `convertWorkout`) includes the dot. The SDK strips it before sending the request.
- {@link PerformanceService.getActivityPaceCurvesCSV} requires a non-empty `distances` array. The JSON form of the same route ({@link PerformanceService.getActivityPaceCurves}) accepts the parameter being omitted, but the CSV form returns HTTP 500 without at least one distance — an empty array is dropped from the query string entirely, which reproduces the same 500, so the type requires at least one element. See [API behaviour](./api-behaviour.md) for the probe record.
