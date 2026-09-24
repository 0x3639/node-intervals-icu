---
title: Shared events
---
# Shared events

`client.sharedEvents` manages shared events such as races and group events, addressed directly by id rather than scoped to an athlete. `create`, `update` and `delete` are not documented in the vendored OpenAPI spec but are verified to work against the live API.

## Methods

| Method | What it does |
|---|---|
| {@link SharedEventService.get} | Get a shared event by ID |
| {@link SharedEventService.create} | Create a shared event |
| {@link SharedEventService.update} | Update a shared event |
| {@link SharedEventService.delete} | Delete a shared event |

## Examples

### Get

Get a shared event by id, given on the command line, in a try/catch that prints the error status on failure. The test account has no known shared event id, so a 404 is the expected outcome.

{@includeCode ../../../examples/shared-events/get.ts#main}

## Behaviour notes

- The `create`, `update` and `delete` routes are undocumented in the OpenAPI spec but verified to work. See [API behaviour](../api-behaviour.md) for the cross-service list.
