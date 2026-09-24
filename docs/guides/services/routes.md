---
title: Routes
---
# Routes

`client.routes` manages an athlete's saved routes and compares how similar two routes are to each other. All routes are athlete-scoped.

## Methods

| Method | What it does |
|---|---|
| {@link RouteService.list} | List all routes for an athlete |
| {@link RouteService.get} | Get a specific route |
| {@link RouteService.update} | Update a route |
| {@link RouteService.getSimilarity} | How similar is this route to another? |

## Examples

### List and similarity

List the athlete's routes, then compare the first route to itself. Comparing a route to itself only proves the route is reachable through {@link RouteService.getSimilarity}; a real comparison needs a second route id.

{@includeCode ../../../examples/routes/list-and-similarity.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
