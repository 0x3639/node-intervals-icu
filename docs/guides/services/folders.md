---
title: Folders
---
# Folders

`client.folders` manages the folders and training plans that organize an athlete's workout library, including plan sharing and imported workout files. {@link FolderService.updatePlanWorkouts} edits a range of the plan's own workouts — the API currently changes only `hide_from_athlete` — and {@link FolderService.applyPlanChanges} pushes the plan's changes onto the athlete's calendar, updating only workouts dated today or later.

## Methods

| Method | What it does |
|---|---|
| {@link FolderService.list} | List all folders/plans for an athlete |
| {@link FolderService.create} | Create a new folder or plan |
| {@link FolderService.update} | Update a folder/plan |
| {@link FolderService.delete} | Delete a folder/plan |
| {@link FolderService.updatePlanWorkouts} | Update the plan workouts in a day range (only `hide_from_athlete` can be changed) |
| {@link FolderService.getSharedWith} | Get athletes a folder is shared with |
| {@link FolderService.updateSharedWith} | Update sharing settings for a folder |
| {@link FolderService.importWorkout} | Import a workout file (.zwo, .mrc, .erg, .fit) into a folder |
| {@link FolderService.applyPlanChanges} | Apply plan changes to the calendar (today's and future workouts only) |

## Examples

### List and share

List the athlete's folders and plans, then get who the first folder is shared with.

{@includeCode ../../../examples/folders/list-and-share.ts#main}

## Behaviour notes

- {@link FolderService.updatePlanWorkouts} takes a single `{ hide_from_athlete }` body, not a list of workouts, and requires the `oldest`/`newest` query pair; the spec declares both as int32 plan day numbers, not dates. Per the spec, only `hide_from_athlete` is applied.
- {@link FolderService.applyPlanChanges} updates only workouts dated today or in the future; earlier calendar entries are left as they are.
- See [API behaviour](../api-behaviour.md) for the cross-service list.
