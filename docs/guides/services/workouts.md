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
| {@link WorkoutService.convertWorkout} | Convert a workout definition to .zwo (Zwift), .mrc, .erg or .fit; resolves power targets from the authenticated athlete's settings, per the spec |
| {@link WorkoutService.convertWorkoutForAthlete} | The same conversion for a specific athlete id, e.g. a coached athlete |
| {@link WorkoutService.listWorkoutTags} | Every tag that has been applied to workouts in the athlete's library |

## Examples

### Library and convert

List the athlete's workout library and every tag applied to library workouts, then convert the first convertible workout to Zwift's .zwo format, falling back to a calendar workout event if the library has none.

{@includeCode ../../../examples/workouts/library-and-convert.ts#main}

### Create in folder

Create a workout in the athlete's first library folder, read it back, then delete it.

CI never runs this example; running it by hand changes the authenticated account.

{@includeCode ../../../examples/workouts/create-in-folder.ts#main}

## Behaviour notes

- {@link WorkoutService.convertWorkout}'s `WorkoutConversionInput` requires `name`, `description`, `type` and `workout_doc`; a body missing `workout_doc` returns HTTP 500. See [API behaviour](../api-behaviour.md).
- Whose settings resolve the power targets is not live-verified: the live suite checks that both routes convert, not whose settings apply. The claim that the global route uses the authenticated athlete's settings comes from `spec/openapi.json`'s description of `POST /api/v1/download-workout{ext}` ("The athlete to use is extracted from the bearer token and used to resolve power targets").
- See [API behaviour](../api-behaviour.md) for the cross-service list.
