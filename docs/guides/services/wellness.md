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

Update today's wellness entry with a weight, then read it back.

CI never runs this example; running it by hand changes the authenticated account.

{@includeCode ../../../examples/wellness/update-today.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
