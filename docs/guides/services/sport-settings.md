---
title: Sport settings
---
# Sport settings

`client.sportSettings` manages per-sport-type-group settings such as thresholds, zones and load calculation for an athlete. Settings can be applied retroactively to matching activities and queried for pace-curve distance defaults.

## Methods

| Method | What it does |
|---|---|
| {@link SportSettingsService.list} | List all sport settings for an athlete |
| {@link SportSettingsService.get} | Get a single sport settings entry by ID |
| {@link SportSettingsService.create} | Create a new sport settings entry |
| {@link SportSettingsService.update} | Update a single sport settings entry |
| {@link SportSettingsService.updateMultiple} | Update multiple sport settings at once |
| {@link SportSettingsService.delete} | Delete a sport settings entry |
| {@link SportSettingsService.applyToActivities} | Apply sport settings to existing activities |
| {@link SportSettingsService.listMatchingActivities} | Activities whose type falls under these sport settings |
| {@link SportSettingsService.getPaceDistances} | Pace-curve distances and best-effort defaults for the sport |

## Examples

### Thresholds

List the athlete's sport settings and print each one's activity types and key thresholds (FTP, threshold pace, threshold heart rate).

{@includeCode ../../../examples/sport-settings/thresholds.ts#main}

### Matching activities and pace distances

Take the athlete's first sport settings entry, count activities that match it, then print its pace-curve distances and best-effort defaults.

{@includeCode ../../../examples/sport-settings/matching-and-pace.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
