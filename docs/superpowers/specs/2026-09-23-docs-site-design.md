# Documentation site — design

Date: 2026-09-23
Status: approved in brainstorming.
Baseline: main at `6158eba` (Phase 3 merged; 3.0.0-beta.1; 149/149 spec
operations covered; every service method carries a JSDoc comment).

## Goal

Publish comprehensive documentation for `@0x3639/intervals-icu`: a generated
API reference for the whole public surface plus hand-written guides, built and
deployed automatically, with every code example verified by the type checker.

Release hygiene (npm publish, git tag, GitHub Release, editor rule-file
refresh) is deliberately NOT part of this phase. No publish of any kind
happens until the user says so; note that creating a GitHub Release would
trigger `.github/workflows/release.yml`, which publishes to GitHub Packages.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Reference | TypeDoc 0.28 over `src/index.ts`, warnings are errors | The public barrel is the exact surface; JSDoc coverage is already complete for methods and nearly complete for types. |
| Guides | Markdown under `docs/guides/`, attached via TypeDoc `projectDocuments` | One site, one navigation, guide prose can `{@link}` into method pages. |
| Examples | Real `.ts` files under `examples/`, typechecked in CI, embedded with `{@includeCode}` | Snippets drifted twice during Phases 2–3; a compile error is the drift detector. |
| Hosting | GitHub Pages, deployed by a new `docs.yml` workflow on push to `main`; PRs build only | Docs break blocks merge; no generated HTML in git. |
| Layout | Site served under `/latest/` with a root redirect | Lets versioned paths (`/v3.0.0/`) be added later without breaking shared links. |
| Versioned docs | Later, at the first stable release | Needs a second version to be worth a switcher; the `/latest/` layout is the only prerequisite. |
| Live-running examples | No | The live suite already covers the routes; prose examples run by hand with `tsx`. |
| README | Trimmed to install, quick start, services table, links | The site is the long-form home. |

## Site structure

```
/                       -> redirect to /latest/
/latest/index.html      TypeDoc landing (README-derived intro)
/latest/documents/...   guides (projectDocuments)
/latest/classes/...     IntervalsClient, 16 services, IntervalsAPIError
/latest/interfaces/...  exported types
/latest/types/...       exported aliases and unions
```

### Guides (`docs/guides/`)

Task guides, in sidebar order:

1. `getting-started.md` — install; ESM and CommonJS imports; create a client
   with an API key; the default athlete id; three first calls.
2. `authentication.md` — API key vs OAuth bearer token; which routes need an
   API key (`athletes.listAthletes`); `athletes.disconnectApp` and why the
   SDK never calls it in tests; `athleteId` overrides for coaches.
3. `errors-and-retries.md` — `IntervalsAPIError` fields; retried statuses and
   backoff; rate-limit accessors on the client; the 422 and 500 cases the
   live runs found and what they mean.
4. `dates-pagination-and-arrays.md` — local-date strings; `oldest`/`newest`
   windows; array query params serialize as repeated keys; comma-joined ids
   in path segments; URL-encoding of caller-supplied ids.
5. `files.md` — every `Buffer`-returning method (FIT, GPX, CSV, zip, workout
   exports); the upload methods; `WorkoutConversionInput` and why all four
   fields are required; the dot-less `ext` on `workouts.zip`.
6. `api-behaviour.md` — one table of every live-verified divergence between
   the vendored spec and the API, with the date observed, what the spec
   says, what the API does, and what the SDK does (source: AUDIT.md and the
   Phase 3 ledger).
7. `migrating-to-v3.md` — the current `docs/MIGRATION.md` content, moved.

Service pages under `docs/guides/services/`, one per accessor, in this order
and with these file names: `athletes`, `activities`, `events`, `wellness`,
`workouts`, `sport-settings`, `folders`, `gear`, `chats`, `weather`, `routes`,
`custom-items`, `shared-events`, `performance`, `search`, `analytics`. Each
page has: a two-sentence description of the service's scope; a table of its
methods with `{@link}` to the reference; two to four examples embedded with
`{@includeCode}`; a "Behaviour notes" list linking to `api-behaviour.md`
rows where relevant. Mutating examples (chats, shared events, deletes) carry
a one-line note that they are not run against real accounts.

### Examples (`examples/`)

- `examples/basic-usage.ts` stays as is.
- New files under `examples/<service>/<name>.ts` (for service pages) and
  `examples/guides/<name>.ts` (for task guides). Each file: header comment
  with the `tsx` run line; reads `INTERVALS_API_KEY` (and optionally
  `INTERVALS_ATHLETE_ID`) from the environment; exits with a message if
  missing; handles the empty-data case in code; imports from
  `'../../src/index.js'`.
- `tsconfig.examples.json` `include` widens to `examples/**/*.ts`.
- Guides embed with `{@includeCode ../../examples/<path>}`; a `#region`
  marker may be used to embed only the interesting part.

### Reference

- `typedoc.json`: `entryPoints: ["src/index.ts"]`, `out: "docs-dist/latest"`,
  `projectDocuments` listing the guides in sidebar order, `readme: "README.md"`,
  `treatWarningsAsErrors: true`, `excludeExternals: true`, `name`, and a
  single `navigationLinks` entry for the GitHub repository (an npm link is
  added when the package is published).
- The five undocumented exports in `src/types/activity.ts` (`MapData`,
  `WeatherTime`, `WeatherPoint`, `WeatherClosest`, `ActivityWeather`) and
  `PowerModelType` in `src/types/enums.ts` gain one-line JSDoc comments so TypeDoc emits no
  "not documented" warning. No other source changes.
- A root `docs-dist/index.html` is written by the docs script and redirects
  to `./latest/`.

### Build and deploy

- `package.json` scripts: `"docs": "typedoc && node scripts/docs-root-redirect.mjs"`,
  `"docs:check": "npm run docs && node scripts/check-docs-links.mjs docs-dist"`.
- `scripts/docs-root-redirect.mjs` writes the redirect page.
- `scripts/check-docs-links.mjs` walks `docs-dist/**/*.html`, resolves every
  `href`/`src` that is not absolute-URL or anchor-only, and fails on any
  target file that does not exist. Internal links only.
- `.github/workflows/docs.yml`: on `pull_request` → `npm ci`, `npm run
  typecheck`, `npm run docs:check`. On `push` to `main` → the same, then
  `actions/upload-pages-artifact` + `actions/deploy-pages` with the `pages:
  write` / `id-token: write` permissions. Concurrency group `pages`.
- `docs-dist/` is gitignored. `typedoc` is a devDependency (the only new one).
- Pages is enabled once via the GitHub API (`build_type: workflow`) in the
  last task; the repository `homepage` is set to the Pages URL.

### Guards

- Examples compile: `npm run typecheck` (already in CI) covers
  `examples/**/*.ts`.
- Docs build: `npm run docs:check` in `docs.yml` on every PR; TypeDoc
  warnings are errors; the link checker fails on dead internal links.
- Guide set pinned: `tests/docs/guides.test.ts` asserts (a) every `public
  readonly` service accessor on `IntervalsClient` has
  `docs/guides/services/<kebab-name>.md`, (b) every path in
  `typedoc.json`'s `projectDocuments` exists, and (c) every `{@includeCode}`
  target in the guides exists. It runs in the normal unit suite.

### README

Keep: badges, one-paragraph description, install, a ten-line quick start,
the services table (now linking each row to its guide page), license. Move
out: usage patterns, configuration, error handling, types, auth detail,
migration (all now guides). Add a prominent link to the site at the top.

## Testing summary

| Check | Where | Fails on |
|---|---|---|
| `npm run typecheck` | ci.yml (existing) | an example that no longer compiles |
| `npm run docs:check` | docs.yml (PR and main) | TypeDoc warning, missing include, dead internal link |
| `tests/docs/guides.test.ts` | unit suite | a service without a page, a listed guide that is missing, a bad include path |

## Out of scope

- Versioned docs beyond the `/latest/` layout (follow-up at the first stable
  release: tag-triggered build into `/vX.Y.Z/`, `versions.json`, header
  switcher).
- Search beyond TypeDoc's built-in.
- Running examples against the live API in CI.
- npm publish, git tag, GitHub Release, `.windsurf` / copilot rule refresh
  (release step, after docs).

## Delivery

One PR from branch `phase-4/docs-site`, executed as Phase 3 was: written
plan, subagent implementation with per-task review, whole-branch review,
CodeRabbit, Codex Daybreak xHigh (five-round ceiling), user merges. The
Pages enablement API call and the homepage change are the last task and
happen only after the whole-branch review is clean.
