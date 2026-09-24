---
title: Errors and retries
---
# Errors and retries

Every request that fails is rejected with an {@link IntervalsAPIError}, never a raw Axios error.

## The error type

{@link IntervalsAPIError} extends `Error` and adds four optional fields: `status` (the HTTP status code, when a response was received), `code` (a short machine-readable string such as `'AUTH_FAILED'`, `'NOT_FOUND'`, `'RATE_LIMIT_EXCEEDED'` or `'TIMEOUT'`, set for a few well-known cases and otherwise `undefined`), and `retryAfter` (seconds to wait before retrying, parsed from the response's `Retry-After` header on a 429), and `details` (the response body the API sent with the error, when there was one). Validation failures come back as `422` with a body such as `{ "status": 422, "error": "Cannot send message to self" }`; that `error` text is also appended to `message`.

{@includeCode ../../examples/guides/handle-errors.ts#main}

## What is retried

The SDK retries a request automatically when the response status is `429`, `502`, `503`, or `504`. Up to `maxRetries` retries after the initial attempt are made (default 3, so at most four requests in total; set 0 to disable retries), with a delay between attempts controlled by `retryDelayMs` (default 1000ms, per {@link IntervalsConfig}).

When a 429 response carries a `Retry-After` header, the parsed `retryAfter` value (in seconds) is used as the delay for that attempt. Otherwise the delay doubles with each attempt (`retryDelayMs * 2^attempt`) and is scaled by a random jitter factor between 0.5 and 1.0, to avoid many clients retrying in lockstep.

Retries apply to every request regardless of method, POST and PUT included. A create or upload the server committed before answering `502`, `503` or `504` is therefore repeated by the retry, leaving a duplicate that the caller never sees: only the last response's id comes back. For non-idempotent calls set `maxRetries: 0` (or build a second client for writes) and reconcile afterwards by listing the affected range before cleaning up, rather than trusting the single id you were handed. Reconciliation only works if the duplicates can be recognised, so give each created resource a unique marker in a field you can search — the mutating examples name theirs `Created by the SDK example <timestamp>` (`Uploaded by the SDK example <timestamp>` for the upload) — and use it to find anything the cleanup missed. The mutating examples in this documentation all construct their client with `maxRetries: 0` for that reason.

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
