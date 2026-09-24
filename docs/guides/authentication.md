---
title: Authentication
---
# Authentication

`IntervalsClient` accepts either an API key or an OAuth access token in {@link IntervalsConfig}. Pass one, not both: when both are set the bearer token wins and the API key is silently ignored — the client builds a single `Authorization` header and checks `accessToken` first.

## API key

For personal use, pass `apiKey`. The SDK sends it as HTTP Basic authentication, with the literal username `API_KEY` and the key itself as the password:

```
Authorization: Basic base64("API_KEY:" + apiKey)
```

This is the SDK's own request-building behaviour, not a documented endpoint. The key comes from Intervals.icu under **Settings → Developer**. See {@link IntervalsConfig} for the full set of construction options.

## OAuth bearer token

For apps acting on behalf of another athlete, pass `accessToken` instead. The SDK sends it as a bearer token:

```
Authorization: Bearer <accessToken>
```

The SDK does not implement the OAuth authorization flow itself (there is no method to exchange a code for a token); obtain the token through Intervals.icu's OAuth flow separately, then hand it to the client:

{@includeCode ../../examples/guides/oauth-client.ts#main}

## Which routes need an API key

Most routes accept either credential, but a few are scoped to the API key's owner and are not available to OAuth app tokens:

- {@link AthleteService.listAthletes} — lists the athletes the API key's owner follows or coaches. Requires API-key authentication.
- {@link AthleteService.disconnectApp} — revokes the OAuth app that owns the current access token. It is never called by the SDK's own tests, since running it would disconnect the live test credentials.

## Acting for another athlete

Every athlete-scoped service method takes an optional trailing `athleteId` parameter. When omitted, the client falls back to the `athleteId` passed to its constructor (which itself defaults to `'0'`, resolved by the API to the authenticated athlete). One route rejects the `'0'` alias: `GET /athlete/{id}/activity-pace-curves` (and its CSV variant) answers 403 unless a real athlete id is passed, so give {@link PerformanceService.getActivityPaceCurves} an explicit `athleteId` (see [API behaviour](./api-behaviour.md)). Passing an explicit id lets one authenticated client act on behalf of a different athlete, such as a coach acting for an athlete they coach:

{@includeCode ../../examples/guides/coach-athlete-id.ts#main}
