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

_Added in a later task._

## Behaviour notes

- The `create`, `update` and `delete` routes are undocumented in the OpenAPI spec but verified to work; a later guide (API behaviour) will record the cross-service list of these gaps.
