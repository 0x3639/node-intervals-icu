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

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
