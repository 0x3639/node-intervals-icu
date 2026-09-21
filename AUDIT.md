# API audit

Status: all 16 rows resolved in 3.0.0-alpha.1 (Phase 2). Re-run the probe after any change to these routes.

Generated 2026-09-21 by `scripts/audit-probe.mjs` against the live API. Each row is an SDK operation that
disagrees with `spec/openapi.json`. Default mode sends only GET requests: a probe whose SDK or spec form
uses POST/PUT/DELETE is skipped unless `INTERVALS_LIVE_WRITE=1` is set. Even in write mode, those probes
send a malformed body where the route takes a body (a 400 or 415 means the route exists and rejected the
input); bodyless DELETEs use a sentinel id that cannot correspond to real data (wellness date 1900-01-01,
shared-event id 0). This is best-effort safety, not a guarantee that no handler runs.

Verdict legend: **works-as-written** keep and document as undocumented; **broken: fix to spec** change verb or
path; **broken: verb** path exists, verb rejected; **broken: delete** route does not exist and spec has no
replacement; **skipped (no sample data)** no activity/route/workout id was available to probe with;
**skipped (write probe; set INTERVALS_LIVE_WRITE=1)** the probe was not run because it may mutate data;
**ambiguous** ask on the Intervals.icu forum.

| Probe | SDK form | Spec form | Verdict |
|---|---|---|---|
| download-fit-files verb | GET /athlete/{id}/download-fit-files → 405 | POST /athlete/{id}/download-fit-files → 422 | broken: verb |
| download-workout verb (global) | skipped (no sample data) | | |
| download-workout verb (athlete) | skipped (no sample data) | | |
| streams.csv update verb | POST /activity/20255461537/streams.csv → 405 | PUT /activity/20255461537/streams.csv → 422 | broken: verb |
| chats list path | GET /chats → 404 | GET /athlete/{id}/chats → 200 | broken: fix to spec |
| route similarity path | GET /athlete/{id}/routes/1526710/similarities → 404 | GET /athlete/{id}/routes/1526710/similarity/1526710 → 200 | broken: fix to spec |
| fitness (no spec route) | GET /athlete/{id}/fitness → 404 | GET /athlete/{id}/athlete-summary → 200 | broken: fix to spec |
| activity-summary (no spec route) | GET /athlete/{id}/activity-summary → 404 | GET /athlete/{id}/athlete-summary → 200 | broken: fix to spec |
| athlete power-vs-hr path | GET /athlete/{id}/power-vs-hr → 404 | GET /athlete/{id}/power-hr-curve → 200 | broken: fix to spec |
| athlete weather path | GET /athlete/{id}/weather → 404 | GET /athlete/{id}/weather-forecast → 200 | broken: fix to spec |
| activity weather path | GET /activity/20255461537/weather → 404 | GET /activity/20255461537/weather-summary → 200 | broken: fix to spec |
| search athletes (no spec route) | GET /search/athletes → 404 | none | broken: delete |
| wellness delete (no spec route) | DELETE /athlete/{id}/wellness/1900-01-01 → 405 | none | broken: verb |
| shared-event create (no spec route) | POST /shared-event → 400 | none | works-as-written |
| shared-event update (no spec route) | PUT /shared-event/0 → 400 | none | works-as-written |
| shared-event delete (no spec route) | DELETE /shared-event/0 → 404 | none | broken: delete |


## Manual annotations (2026-09-21)

The automated verdicts above were checked by hand where the heuristic cannot distinguish "path unknown" from "handler ran and found nothing".

| Route | Manual probe | Reasoning | Final verdict |
|---|---|---|---|
| `download-workout{ext}` (global and athlete) | `GET ?id=0` → 405 on both; `POST` with a minimal Workout body `{name, description, type}` → 500 on both | The account has no library workouts, so the automated probe skipped. 405 on GET proves the path exists and GET is not mapped; 500 on POST proves the handler ran (a bad body reaches the converter). The spec's POST takes a full Workout in the body and converts it; the SDK's `?id=` query has no counterpart. | **broken: verb and semantics**. Replace `downloadWorkout(id, fmt)` with a body-taking conversion, and add the event download route for "download a planned workout by id". |
| `POST /download-workout{ext}` — Phase 2 live check (2026-09-21) | Tried 2 bodies: (1) `{ name: 'Probe', description: '- 10m 50%', type: 'Ride' }` → 500 (matches the manual probe above); (2) `{ name, description, type, workout_doc }` derived from one of the athlete's calendar WORKOUT events (`client.events.listEvents({ oldest, newest, category: ['WORKOUT'] })`, then that event's own `name`/`description`/`type`/`workout_doc` fields) → 200 with a valid `<workout_file>` XML body. The account has no library workouts but does have 44 calendar workout events in the last year, so a calendar-derived body was used instead of a from-scratch inline one. | **works via `convertWorkout`/`convertWorkoutForAthlete`** once `workout_doc` is present in the body; a body without `workout_doc` 500s. Documented on the `convertWorkout` method and covered by `tests/live/phase2.live.test.ts`. |
| `GET /athlete/{id}/events/{eventId}/download{ext}` — Phase 2 live check (2026-09-21) | `events.downloadWorkout(eventId, '.zwo')` against the first of the account's calendar WORKOUT events → 200 with a valid `<workout_file>` XML body. | **works-as-written**. Implemented as `EventService.downloadWorkout` and covered by `tests/live/phase2.live.test.ts`. |
| `routes/{id}/similarities` | With the account's real route: SDK form → 404; spec form `similarity/{sameId}` → 200 with a `RouteSimilarity` body | Automated probe skipped because route objects carry `route_id`, not `id` (probe fixed in this commit). | **broken: fix to spec**. |
| `DELETE /shared-event/{id}` | Automated: 404 for id 0 | Spring returns 405 when a path is mapped for other verbs but not this one (see the wellness DELETE row). `PUT /shared-event/0` returns 400, so the path is mapped; a 404 on DELETE therefore came from a handler that looked up id 0 and found nothing, not from routing. | **works-as-written (undocumented)**, same as the shared-event POST and PUT rows. |
| `POST download-fit-files` | 422 with `?ids=<activity>` | Route exists (GET is 405). 422 is a parameter-binding failure: the spec declares `ids` as an array, so it likely wants repeated `ids=` params or a comma list in a form body. | **broken: verb**, and Phase 2 must verify the `ids` encoding live. |
| `POST download-fit-files` — Phase 2 encoding check (2026-09-21) | Comma-joined `?ids=a,b` → 200 with a real zip; repeated keys `?ids=a&ids=b` → also 200, identical bytes. Both encodings bind fine (Spring splits a comma-joined value into the `List<String> ids` param). The SDK's earlier 422 during live testing came from this test account's 3 most-recent activities being malformed Strava-import stubs (`type`/`source_file`/etc. all `undefined`, only `id` and `source: STRAVA` set) — the API returns `{"status":422,"error":"No activities found"}` for those ids regardless of encoding. Probing `i`-prefixed WAHOO-sourced activities (single and multiple ids, comma-joined) returned 200 with valid zips every time. | **Kept comma-joined** (`ids: activityIds.join(',')`), matching the brief's default; no encoding change needed. `tests/live/phase2.live.test.ts` selects the latest activity with a defined `type` to skip the broken stub entries. |

Summary for Phase 2: 9 fix-to-spec (chats list, fitness, activity-summary, athlete power-vs-hr, athlete weather, activity weather, route similarity, plus the two workout-download variants), 3 verb-only fixes (fit-files zip, streams.csv update, and `DELETE wellness/{date}` which has no DELETE mapping and must be removed), 1 delete (`/search/athletes`), 3 keep-as-undocumented (shared-event create, update, delete).
