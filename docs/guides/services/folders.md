---
title: Folders
---
# Folders

`client.folders` manages the folders and training plans that organize an athlete's workout library, including plan sharing and imported workout files. `applyPlanChanges` and `updatePlanWorkouts` push a plan's workouts onto the calendar.

## Methods

| Method | What it does |
|---|---|
| {@link FolderService.list} | List all folders/plans for an athlete |
| {@link FolderService.create} | Create a new folder or plan |
| {@link FolderService.update} | Update a folder/plan |
| {@link FolderService.delete} | Delete a folder/plan |
| {@link FolderService.updatePlanWorkouts} | Update workouts in a plan folder (reorder, add, remove) |
| {@link FolderService.getSharedWith} | Get athletes a folder is shared with |
| {@link FolderService.updateSharedWith} | Update sharing settings for a folder |
| {@link FolderService.importWorkout} | Import a workout file (.zwo, .mrc, .erg, .fit) into a folder |
| {@link FolderService.applyPlanChanges} | Apply plan changes to the calendar |

## Examples

### List and share

List the athlete's folders and plans, then get who the first folder is shared with.

{@includeCode ../../../examples/folders/list-and-share.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
