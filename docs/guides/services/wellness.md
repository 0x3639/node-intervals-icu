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

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
