---
title: Errors and retries
---
# Errors and retries

Every request that fails is rejected with an {@link IntervalsAPIError}, never a raw Axios error.

## The error type

{@link IntervalsAPIError} extends `Error` and adds three optional fields: `status` (the HTTP status code, when a response was received), `code` (a short machine-readable string such as `'AUTH_FAILED'`, `'NOT_FOUND'`, `'RATE_LIMIT_EXCEEDED'` or `'TIMEOUT'`, set for a few well-known cases and otherwise `undefined`), and `retryAfter` (seconds to wait before retrying, parsed from the response's `Retry-After` header on a 429).

{@includeCode ../../examples/guides/handle-errors.ts#main}

## What is retried

The SDK retries a request automatically when the response status is `429`, `502`, `503`, or `504`. Up to `maxRetries` retries after the initial attempt are made (default 3, so at most four requests in total; set 0 to disable retries), with a delay between attempts controlled by `retryDelayMs` (default 1000ms, per {@link IntervalsConfig}).

When a 429 response carries a `Retry-After` header, the parsed `retryAfter` value (in seconds) is used as the delay for that attempt. Otherwise the delay doubles with each attempt (`retryDelayMs * 2^attempt`) and is scaled by a random jitter factor between 0.5 and 1.0, to avoid many clients retrying in lockstep.

## Rate limits

The client tracks the `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers from the most recent response and exposes them through {@link IntervalsClient.getRateLimitRemaining} and `getRateLimitReset()`:

{@includeCode ../../examples/guides/rate-limits.ts#main}

Both return `undefined` until at least one request has completed.

## Errors the live API returns for well-formed calls

A few routes return an error status from the live API even when the SDK's request is well-formed, because the response depends on the specific data in the account being queried. See [API behaviour](./api-behaviour.md) for details on each:

- `GET /activity/{id}/power-curves` returns `422` when the requested stream or fatigue variant is not available for that activity (for example `hr` on an activity with no heart-rate data, or `kj0`/`kj1` without fatigue data).
- `GET /athlete/{id}/activity-pace-curves.csv` returns `500` when called without a `distances` parameter (the JSON form of the same route accepts the omission).
- `POST /download-workout{ext}` returns `500` when the request body has no `workout_doc` field.
- `POST /athlete/{id}/download-fit-files` returns `422` with `"No activities found"` for malformed import-stub activities (observed on Strava-imported activities missing their `type` and `source_file` fields).
