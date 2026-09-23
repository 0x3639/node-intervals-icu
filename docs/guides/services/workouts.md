---
title: Workouts
---
# Workouts

`client.workouts` manages the athlete's workout library: creating, updating, deleting and duplicating workout templates stored in folders and plans. It also converts a workout definition to a file format a device or platform can consume (.zwo, .mrc, .erg, .fit).

## Methods

| Method | What it does |
|---|---|
| {@link WorkoutService.listWorkouts} | List workouts in the athlete's library |
| {@link WorkoutService.getWorkout} | Get a specific workout by ID |
| {@link WorkoutService.createWorkout} | Create a new workout |
| {@link WorkoutService.createWorkoutsBulk} | Create multiple workouts at once |
| {@link WorkoutService.updateWorkout} | Update an existing workout |
| {@link WorkoutService.deleteWorkout} | Delete a workout |
| {@link WorkoutService.duplicateWorkouts} | Duplicate workouts |
| {@link WorkoutService.convertWorkout} | Convert a workout definition to .zwo (Zwift), .mrc, .erg or .fit |
| {@link WorkoutService.convertWorkoutForAthlete} | Same as convertWorkout but resolves the athlete's own settings (FTP, zones) |
| {@link WorkoutService.listWorkoutTags} | Every tag that has been applied to workouts in the athlete's library |

## Examples

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
