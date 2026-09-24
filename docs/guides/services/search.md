---
title: Search
---
# Search

`client.search` searches an athlete's activities by a free-text query string and returns summary results. It complements {@link ActivityService.searchActivitiesFull}, which returns full activity objects.

## Methods

| Method | What it does |
|---|---|
| {@link SearchService.searchActivities} | Search activities by query string |

## Examples

### Search

Search the athlete's activities for the free-text query `"tempo"` and print the results.

{@includeCode ../../../examples/search/search.ts#main}

## Behaviour notes

- See [API behaviour](../api-behaviour.md) for the cross-service list.
