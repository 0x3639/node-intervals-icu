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

_Added in a later task._

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
