---
title: Gear
---
# Gear

`client.gear` manages bikes, shoes and other equipment, including maintenance reminders and per-item distance and time totals. Routes are athlete-scoped.

## Methods

| Method | What it does |
|---|---|
| {@link GearService.create} | Create a new gear item |
| {@link GearService.update} | Update a gear item |
| {@link GearService.delete} | Delete a gear item |
| {@link GearService.replace} | Replace a gear item (transfer activities to a new gear item) |
| {@link GearService.createReminder} | Create a gear reminder |
| {@link GearService.updateReminder} | Update a gear reminder |
| {@link GearService.deleteReminder} | Delete a gear reminder |
| {@link GearService.list} | All of the athlete's gear |
| {@link GearService.downloadCSV} | All of the athlete's gear as CSV |
| {@link GearService.calc} | Recalculate distance / time / activity totals for one item of gear |

## Examples

### List and calculate

List the athlete's gear, recalculate totals for the first item, then download all gear as CSV.

{@includeCode ../../../examples/gear/list-and-calc.ts#main}

### Reminders

Create a maintenance reminder on the athlete's first gear item, then delete it.

CI never runs this example; running it by hand changes the authenticated account.

{@includeCode ../../../examples/gear/reminders.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
