---
title: Dates, pagination and arrays
---
# Dates, pagination and arrays

## Dates are local-date strings

Every date-range parameter in the SDK (`oldest`, `newest`, `start`, `end`, and similar) is a local calendar date string in `YYYY-MM-DD` form, not a full timestamp and not the output of `toISOString()`. Both bounds are inclusive. Building both ends of a window from a single `Date` avoids a window that silently shifts if the two bounds are computed a moment apart (for example across midnight):

{@includeCode ../../examples/guides/date-windows.ts#main}

## Paging

List routes page with `oldest`/`newest` and, where the route's options include it, `limit` (and `offset`) — see {@link PaginationOptions}, which {@link ListActivitiesOptions} and other list-options types extend. There are no opaque cursors to carry between calls: to page through a large range, narrow it with `oldest`/`newest`/`limit` and issue another request.

{@link PaginationOptions} also carries `resolve`, unrelated to paging itself: it resolves nested objects in the response (for example turning a workout's pace targets into actual m/s values) rather than leaving them in their raw, unresolved form.

## Array parameters

An option typed as an array (`tags`, `category`, `types`, `fatigue`, ...) is sent as repeated query keys — `tags=race&tags=long` — not axios's default bracket/index notation (`tags[0]=race`). The SDK configures this explicitly (`paramsSerializer: { indexes: null }` in the HTTP client) because the API is a Spring backend that binds repeated keys to a list parameter but does not understand indexed or bracketed ones.

{@includeCode ../../examples/guides/array-params.ts#main}

Some routes also accept a single comma-joined value for the same parameter. This is confirmed for `ids` on `POST /athlete/{id}/download-fit-files` (see the [Files](./files.md) guide and AUDIT.md): a live probe found identical results for `?ids=a,b` and `?ids=a&ids=b`. Whether every other array parameter also accepts a comma list has not been probed live, so this guide states only what is verified: the SDK always sends repeated keys, which is accepted everywhere it has been tried.

## Ids in paths

{@link ActivityService.getActivities} takes a list of ids and joins them into the URL path with commas after URL-encoding each one individually (`ids.map(encodeURIComponent).join(',')`), rather than sending them as a query parameter. More generally, every caller-supplied id that the Phase 3 methods interpolate into a path segment is passed through `encodeURIComponent` first, so a `#`, `?`, `/` or `%` inside an id is encoded and cannot be misread as a path separator or the start of a query string.
