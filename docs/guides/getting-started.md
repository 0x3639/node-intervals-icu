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

The `athleteId` passed to individual methods defaults to `'0'`, which the API resolves to the athlete that owns the API key, so most calls need no athlete id at all. The API key itself comes from Intervals.icu under **Settings → Developer**.

## Make your first calls

{@includeCode ../../examples/guides/getting-started.ts#calls}

{@link AthleteService.getAthlete} returns the authenticated athlete's profile. {@link ActivityService.listActivities} lists activities in a date range. {@link WellnessService.listWellness} lists wellness records over the same range.

## Where next

- [Services](./services.md) — every service, with a method table and examples.
- Authentication and Errors and retries guides are added by follow-up tasks in this same guide set.
