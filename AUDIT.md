# API audit

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
| `routes/{id}/similarities` | With the account's real route: SDK form → 404; spec form `similarity/{sameId}` → 200 with a `RouteSimilarity` body | Automated probe skipped because route objects carry `route_id`, not `id` (probe fixed in this commit). | **broken: fix to spec**. |
| `DELETE /shared-event/{id}` | Automated: 404 for id 0 | Spring returns 405 when a path is mapped for other verbs but not this one (see the wellness DELETE row). `PUT /shared-event/0` returns 400, so the path is mapped; a 404 on DELETE therefore came from a handler that looked up id 0 and found nothing, not from routing. | **works-as-written (undocumented)**, same as the shared-event POST and PUT rows. |
| `POST download-fit-files` | 422 with `?ids=<activity>` | Route exists (GET is 405). 422 is a parameter-binding failure: the spec declares `ids` as an array, so it likely wants repeated `ids=` params or a comma list in a form body. | **broken: verb**, and Phase 2 must verify the `ids` encoding live. |

Summary for Phase 2: 9 fix-to-spec (chats list, fitness, activity-summary, athlete power-vs-hr, athlete weather, activity weather, route similarity, plus the two workout-download variants), 3 verb-only fixes (fit-files zip, streams.csv update, and `DELETE wellness/{date}` which has no DELETE mapping and must be removed), 1 delete (`/search/athletes`), 3 keep-as-undocumented (shared-event create, update, delete).
