---
title: Getting started
---
# Getting started

## Install

```sh
npm install @0x3639/intervals-icu
```

Requires Node.js 18 or later.

## Import

The package ships both ESM and CommonJS builds, with types for both.

ESM:

```js
import { IntervalsClient } from '@0x3639/intervals-icu';
```

CommonJS:

```js
const { IntervalsClient } = require('@0x3639/intervals-icu');
```

## Create a client

{@includeCode ../../examples/guides/getting-started.ts#client}

A method's optional trailing `athleteId` argument falls back to the `athleteId` the client was configured with, which itself defaults to `'0'` — resolved by the API to the athlete that owns the API key — so most calls need no athlete id at all. The API key itself comes from Intervals.icu under **Settings → Developer**.

## Make your first calls

{@includeCode ../../examples/guides/getting-started.ts#calls}

{@link AthleteService.getAthlete} returns the authenticated athlete's profile. {@link ActivityService.listActivities} lists activities in a date range. {@link WellnessService.listWellness} lists wellness records over the same range.

## Where next

- [Authentication](./authentication.md) — API keys vs. OAuth tokens, and acting for another athlete.
- [Errors and retries](./errors-and-retries.md) — the error type, what is retried, and rate limits.
- [Dates, pagination and arrays](./dates-pagination-and-arrays.md) — date formats, paging through results, and array parameter encoding.
- [Files: FIT, GPX, CSV and zip](./files.md) — downloading and uploading files, and converting workouts.
- [API behaviour](./api-behaviour.md) — where the live API differs from the spec, and from the SDK's types.
- [Migrating to v3](./migrating-to-v3.md) — breaking changes from v2.x and v1.x.
- [Services](./services.md) — every service, with a method table and examples.
