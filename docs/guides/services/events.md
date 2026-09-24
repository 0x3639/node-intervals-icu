---
title: Events
---
# Events

`client.events` manages the athlete's calendar: creating, updating and deleting planned workouts, notes, races and other calendar entries, individually or across a bulk date range. It also applies training plans to the calendar and downloads planned workouts as files.

## Methods

| Method | What it does |
|---|---|
| {@link EventService.listEvents} | List events for a date range |
| {@link EventService.getEvent} | Get a specific event by ID |
| {@link EventService.createEvent} | Create a new event (workout, note, race, etc.) |
| {@link EventService.createEventsBulk} | Create multiple events at once |
| {@link EventService.updateEvent} | Update an existing event |
| {@link EventService.updateEventsRange} | Update events in a date range (move, shift, etc.) |
| {@link EventService.deleteEvent} | Delete an event |
| {@link EventService.deleteEventsBulk} | Delete events by ID list |
| {@link EventService.deleteEventsRange} | Delete events in a date range by category |
| {@link EventService.markEventAsDone} | Mark an event as done |
| {@link EventService.applyPlan} | Apply a training plan to the calendar |
| {@link EventService.duplicateEvents} | Duplicate events |
| {@link EventService.downloadWorkout} | Download a planned workout from the calendar in zwo, mrc, erg or fit format |
| {@link EventService.listEventTags} | Every tag that has been applied to events on the athlete's calendar |
| {@link EventService.listFitnessModelEvents} | Events that influence the fitness (CTL/ATL) calculation, in ascending date order |
| {@link EventService.downloadWorkoutsZip} | Calendar workouts in a date range as a zip of files in the requested format |

## Examples

### Calendar week

List planned workouts and races in the next 7 days, then list every tag that has been applied to a calendar event.

{@includeCode ../../../examples/events/calendar-week.ts#main}

### Create, update and delete a note

Create a NOTE event for today, update its description, then delete it.

CI never runs this example; running it by hand changes the authenticated account. If the create call itself fails after the server committed it, nothing is cleaned up: search the account for `Created by the SDK example` (or `Uploaded by the SDK example`) and delete it by hand.

{@includeCode ../../../examples/events/create-update-delete.ts#main}

### Fitness model events

List the events that influence the fitness (CTL/ATL) calculation, then download the next 30 days of planned workouts as a zip of files.

{@includeCode ../../../examples/events/fitness-model-events.ts#main}

## Behaviour notes

- {@link EventService.downloadWorkoutsZip}'s `ext` query value has no leading dot (the API expects `zwo`, `mrc`, `erg` or `fit`), unlike the `{ext}` path suffix on {@link EventService.downloadWorkout}. See [API behaviour](../api-behaviour.md).
- See [API behaviour](../api-behaviour.md) for the cross-service list.
