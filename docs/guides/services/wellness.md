---
title: Wellness
---
# Wellness

`client.wellness` reads and writes daily wellness records such as weight, HRV, sleep and resting heart rate. Records are addressed by date, and can be created, updated individually, updated in bulk, or uploaded from a CSV file.

## Methods

| Method | What it does |
|---|---|
| {@link WellnessService.listWellness} | List wellness records for a date range |
| {@link WellnessService.getWellnessByDate} | Get a single wellness record by date (ISO-8601 local date) |
| {@link WellnessService.createWellness} | Create or update a wellness entry (PUT /athlete/{id}/wellness) |
| {@link WellnessService.updateWellness} | Update an existing wellness entry by date |
| {@link WellnessService.updateWellnessBulk} | Bulk update wellness records |
| {@link WellnessService.uploadWellnessCSV} | Upload wellness data from CSV file |

## Examples

### Last 30 days

List the last 30 days of wellness records, print the most recent week, and fetch today's record, treating a 404 as "no record yet".

{@includeCode ../../../examples/wellness/last-30-days.ts#main}

### Update today

Update today's wellness entry with a weight, read it back, then put the previous weight back.

CI never runs this example; running it by hand changes the authenticated account: it writes a demo weight to today's record and restores the previous one in a `finally` block. It writes only when it can restore — `WellnessInput.weight` is typed `number | undefined`, so the SDK cannot clear the field again, and a demo value written to a record that had no weight would stay there for good. When today's record has no weight yet the example says so and exits without writing.

"Today" is resolved in the athlete's own time zone (`Athlete.timezone`), not the machine's: the API keys wellness records by the athlete's local date.

{@includeCode ../../../examples/wellness/update-today.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
