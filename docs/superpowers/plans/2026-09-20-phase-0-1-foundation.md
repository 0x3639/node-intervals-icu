# Phase 0 and 1: Foundation (spec, coverage, CI, live harness, audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the Intervals.icu OpenAPI spec in the repo, make SDK coverage and spec drift visible in CI, rename the package for the diverged fork, and add a live test harness plus an audit probe that produces verdicts for the disputed endpoints.

**Architecture:** Pure-function matching logic lives in `scripts/lib/spec-ops.mjs` and is unit-tested with vitest. Three thin CLIs (`fetch-spec`, `coverage`, `check-spec-drift`) wrap it and are called from two GitHub workflows. Live tests are a second vitest config that only runs when API credentials are present. The audit probe is a standalone script that prints `AUDIT.md`.

**Tech Stack:** Node 18+ (global `fetch`), plain ESM `.mjs` scripts (no new runtime or dev dependencies), vitest 2, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`

## Global Constraints

- Node `>=18.0.0` stays the engine floor. Scripts may use global `fetch` but nothing newer than Node 18.
- No new dependencies in this plan. `openapi-typescript` arrives in Phase 3, not here.
- Package name becomes `@0x3639/intervals-icu`, version `3.0.0-alpha.0`.
- Live tests must never run in CI and must be skipped, not failed, when `INTERVALS_API_KEY` or `INTERVALS_ATHLETE_ID` is unset.
- The audit probe sends only GET requests by default. Non-GET probes run only with `INTERVALS_LIVE_WRITE=1`; they use a malformed body or a sentinel id to minimize the chance of side effects, but this is best-effort, not a guarantee.
- Every commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work happens on branch `chore/spec-and-plan` (already exists, based on `main`). Run `npm ci` once before starting; `node_modules` is absent.

---

## File structure

| Path | Responsibility |
|---|---|
| `spec/openapi.json` | Vendored snapshot of `https://intervals.icu/api/v1/docs`. The contract everything diffs against. |
| `scripts/lib/spec-ops.mjs` | Pure functions: normalize paths, list spec operations, extract SDK operations from source text, match the two sets. |
| `scripts/fetch-spec.mjs` | Fetch live spec, pretty-print, write to `spec/openapi.json`. |
| `scripts/coverage.mjs` | Print coverage report. Exit 1 on any SDK op not in spec. `--strict` also exits 1 on any spec op missing from SDK. |
| `scripts/check-spec-drift.mjs` | Fetch live spec, compare operation and schema sets with vendored, print diff, exit 2 on drift. |
| `scripts/audit-probe.mjs` | Hit each disputed route live and print `AUDIT.md` to stdout. |
| `tests/scripts/spec-ops.test.ts` | Unit tests for `spec-ops.mjs`. |
| `tests/live/setup.ts` | `LIVE` flag and `liveClient()` factory. |
| `tests/live/smoke.live.test.ts` | One read-only call proving the harness works. |
| `vitest.config.ts` | Modified: exclude `tests/live/**`. |
| `vitest.live.config.ts` | Live-only vitest config. |
| `.github/workflows/ci.yml` | Lint, typecheck, test, build, coverage on PR and push. |
| `.github/workflows/spec-drift.yml` | Weekly drift check that opens or updates an issue. |
| `AUDIT.md` | Committed with a "pending" body; user regenerates after running the probe. |

---

### Task 1: Spec operation matcher (pure library)

**Files:**
- Create: `scripts/lib/spec-ops.mjs`
- Test: `tests/scripts/spec-ops.test.ts`

**Interfaces:**
- Produces:
  - `normalizeSdkPath(path: string): string` — replaces every `${...}` with `{x}`.
  - `specOperations(spec: object): Array<{ method: string; path: string; key: string; tags: string[]; summary: string }>` — `path` has `/api/v1` stripped; `key` is `` `${method} ${path}` ``.
  - `sdkOperations(files: Array<{ name: string; text: string }>): Array<{ method: string; path: string; key: string; source: string }>` — `path` is normalized.
  - `specPathRegex(specPath: string): RegExp` — path params become `[^/]+`; an inline `{ext}` (param not preceded by `/`) becomes `(\.[A-Za-z0-9]+|\{x\})?`.
  - `matchOperations(spec, sdk): { matched: Array<{ spec, sdk }>; phantom: sdkOp[]; missing: specOp[] }`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/scripts/spec-ops.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeSdkPath,
  specOperations,
  sdkOperations,
  specPathRegex,
  matchOperations,
} from '../../scripts/lib/spec-ops.mjs';

const miniSpec = {
  paths: {
    '/api/v1/athlete/{id}/wellness{ext}': { get: { tags: ['Wellness'], summary: 'List wellness' } },
    '/api/v1/athlete/{id}/download-fit-files': { post: { tags: ['Activities'], summary: 'Zip' } },
    '/api/v1/download-workout{ext}': { post: { tags: ['Library'], summary: 'Convert' } },
    '/api/v1/athlete/{id}/chats': { get: { tags: ['Chats'], summary: 'List chats' } },
    '/api/v1/athlete/{id}/workouts.zip': { get: { tags: ['Events'], summary: 'Zip workouts' } },
  },
};

describe('normalizeSdkPath', () => {
  it('replaces template expressions with {x}', () => {
    expect(normalizeSdkPath('/athlete/${id}/wellness/${date}')).toBe('/athlete/{x}/wellness/{x}');
    expect(normalizeSdkPath('/download-workout${format}')).toBe('/download-workout{x}');
  });
});

describe('specOperations', () => {
  it('strips /api/v1 and upper-cases the verb', () => {
    const ops = specOperations(miniSpec);
    expect(ops).toHaveLength(5);
    expect(ops[0]).toEqual({
      method: 'GET',
      path: '/athlete/{id}/wellness{ext}',
      key: 'GET /athlete/{id}/wellness{ext}',
      tags: ['Wellness'],
      summary: 'List wellness',
    });
  });
});

describe('sdkOperations', () => {
  const files = [
    {
      name: 'wellness.service.ts',
      text: "this.httpClient.request<Wellness[]>({ method: 'GET', url: `/athlete/${id}/wellness`, params });",
    },
    {
      name: 'activity.service.ts',
      text: 'return this.httpClient.download(`/athlete/${id}/download-fit-files`, params);',
    },
    {
      name: 'workout.service.ts',
      text: "return this.httpClient.download(`/download-workout${format}`, { method: 'POST', data });",
    },
    {
      name: 'folder.service.ts',
      text: 'return this.httpClient.upload<Workout>({ url: `/athlete/${id}/folders/${folderId}/import-workout`, file, fileName });',
    },
    {
      name: 'client.ts',
      text: "return this.httpClient.request<PaceDistancesDTO>({ method: 'GET', url: '/pace_distances' });",
    },
  ];

  it('extracts request(), download(), upload() and plain-string urls', () => {
    const keys = sdkOperations(files).map((o) => o.key).sort();
    expect(keys).toEqual([
      'GET /athlete/{x}/download-fit-files',
      'GET /athlete/{x}/wellness',
      'GET /pace_distances',
      'POST /athlete/{x}/folders/{x}/import-workout',
      'POST /download-workout{x}',
    ]);
  });

  it('records the source file', () => {
    const op = sdkOperations(files).find((o) => o.key === 'GET /pace_distances');
    expect(op?.source).toBe('client.ts');
  });
});

describe('specPathRegex', () => {
  it('matches path params and optional inline extension', () => {
    const re = specPathRegex('/athlete/{id}/wellness{ext}');
    expect(re.test('/athlete/{x}/wellness')).toBe(true);
    expect(re.test('/athlete/{x}/wellness.csv')).toBe(true);
    expect(re.test('/athlete/{x}/wellness{x}')).toBe(true);
    expect(re.test('/athlete/{x}/wellness/{x}')).toBe(false);
  });

  it('does not treat a literal extension as optional', () => {
    const re = specPathRegex('/athlete/{id}/workouts.zip');
    expect(re.test('/athlete/{x}/workouts.zip')).toBe(true);
    expect(re.test('/athlete/{x}/workouts')).toBe(false);
  });
});

describe('matchOperations', () => {
  it('reports matched, phantom and missing', () => {
    const spec = specOperations(miniSpec);
    const sdk = sdkOperations([
      { name: 'a.ts', text: "request({ method: 'GET', url: `/athlete/${id}/wellness` })" },
      { name: 'b.ts', text: 'download(`/athlete/${id}/download-fit-files`)' },
      { name: 'c.ts', text: "request({ method: 'GET', url: `/chats` })" },
    ]);
    const result = matchOperations(spec, sdk);
    expect(result.matched.map((m) => m.spec.key)).toEqual(['GET /athlete/{id}/wellness{ext}']);
    expect(result.phantom.map((p) => p.key).sort()).toEqual([
      'GET /athlete/{x}/download-fit-files',
      'GET /chats',
    ]);
    expect(result.missing.map((m) => m.key).sort()).toEqual([
      'GET /athlete/{id}/chats',
      'GET /athlete/{id}/workouts.zip',
      'POST /athlete/{id}/download-fit-files',
      'POST /download-workout{ext}',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scripts/spec-ops.test.ts`
Expected: FAIL, "Failed to load url ../../scripts/lib/spec-ops.mjs" or similar module-not-found error.

- [ ] **Step 3: Write the library**

```js
// scripts/lib/spec-ops.mjs
// Pure functions shared by coverage.mjs and check-spec-drift.mjs. No I/O here.

const VERBS = ['get', 'post', 'put', 'delete', 'patch'];

/** Replace every `${expr}` template hole with the placeholder `{x}`. */
export function normalizeSdkPath(path) {
  return path.replace(/\$\{[^}]+\}/g, '{x}');
}

/** List every operation in an OpenAPI document, with `/api/v1` stripped. */
export function specOperations(spec) {
  const ops = [];
  for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
    const path = rawPath.replace(/^\/api\/v1/, '');
    for (const verb of VERBS) {
      const op = item[verb];
      if (!op) continue;
      const method = verb.toUpperCase();
      ops.push({
        method,
        path,
        key: `${method} ${path}`,
        tags: op.tags ?? [],
        summary: op.summary ?? '',
      });
    }
  }
  return ops;
}

const REQUEST_RE = /method:\s*'(GET|POST|PUT|DELETE|PATCH)',\s*url:\s*(?:`([^`]+)`|'([^']+)')/g;
const DOWNLOAD_RE = /\.download\(\s*`([^`]+)`(?:\s*,\s*\{[^}]*method:\s*'(GET|POST)')?/g;
const UPLOAD_RE = /\.upload<[^>]*>\(\s*\{\s*url:\s*`([^`]+)`/g;

/** Extract `{ method, path }` pairs from SDK source files by pattern matching. */
export function sdkOperations(files) {
  const ops = [];
  const push = (method, rawPath, source) => {
    const path = normalizeSdkPath(rawPath);
    ops.push({ method, path, key: `${method} ${path}`, source });
  };
  for (const { name, text } of files) {
    for (const m of text.matchAll(REQUEST_RE)) push(m[1], m[2] ?? m[3], name);
    for (const m of text.matchAll(DOWNLOAD_RE)) push(m[2] ?? 'GET', m[1], name);
    for (const m of text.matchAll(UPLOAD_RE)) push('POST', m[1], name);
  }
  return ops;
}

/**
 * Build a regex that accepts an SDK-normalized path for a given spec path.
 * `/{param}` segments accept any non-slash text (including the `{x}` placeholder).
 * An inline `{ext}` (a param not preceded by `/`) accepts nothing, a literal
 * `.csv`-style extension, or the `{x}` placeholder.
 */
export function specPathRegex(specPath) {
  let out = '';
  let i = 0;
  while (i < specPath.length) {
    const ch = specPath[i];
    if (ch === '{') {
      const end = specPath.indexOf('}', i);
      const inline = i > 0 && specPath[i - 1] !== '/';
      out += inline ? '(\\.[A-Za-z0-9]+|\\{x\\})?' : '[^/]+';
      i = end + 1;
      continue;
    }
    out += ch.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    i += 1;
  }
  return new RegExp(`^${out}$`);
}

/** Pair SDK operations with spec operations. */
export function matchOperations(specOps, sdkOps) {
  const matched = [];
  const phantom = [];
  const usedSpec = new Set();
  const compiled = specOps.map((s) => ({ op: s, re: specPathRegex(s.path) }));

  for (const sdk of sdkOps) {
    const hit = compiled.find(({ op, re }) => op.method === sdk.method && re.test(sdk.path));
    if (hit) {
      matched.push({ spec: hit.op, sdk });
      usedSpec.add(hit.op.key);
    } else {
      phantom.push(sdk);
    }
  }
  const missing = specOps.filter((s) => !usedSpec.has(s.key));
  return { matched, phantom, missing };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/spec-ops.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Confirm typecheck and lint still pass**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0. `tsconfig.json` only includes `src/**`, so the `.mjs` import in the test is not type-checked; vitest resolves it at runtime.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/spec-ops.mjs tests/scripts/spec-ops.test.ts
git commit -m "feat(scripts): add spec/SDK operation matcher library

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Vendor the spec

**Files:**
- Create: `scripts/fetch-spec.mjs`
- Create: `spec/openapi.json` (generated by the script)
- Modify: `package.json` (add `spec:fetch` script)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `spec/openapi.json`, pretty-printed with 2-space indent and trailing newline. Exported `fetchSpec(url): Promise<object>` for reuse by Task 5.

- [ ] **Step 1: Write the script**

```js
// scripts/fetch-spec.mjs
// Usage: node scripts/fetch-spec.mjs [outFile]
// Fetches the live Intervals.icu OpenAPI document and writes it pretty-printed.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const SPEC_URL = 'https://intervals.icu/api/v1/docs';

export async function fetchSpec(url = SPEC_URL) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Fetching ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const out = process.argv[2] ?? 'spec/openapi.json';
  const spec = await fetchSpec();
  await writeFile(out, JSON.stringify(spec, null, 2) + '\n');
  const opCount = Object.values(spec.paths ?? {}).reduce(
    (n, item) => n + Object.keys(item).filter((k) => ['get', 'post', 'put', 'delete', 'patch'].includes(k)).length,
    0,
  );
  console.log(`Wrote ${out}: ${opCount} operations, ${Object.keys(spec.components?.schemas ?? {}).length} schemas`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add after `"test:watch"`:

```json
    "spec:fetch": "node scripts/fetch-spec.mjs",
```

- [ ] **Step 3: Run it**

Run: `mkdir -p spec && npm run spec:fetch`
Expected output line: `Wrote spec/openapi.json: 149 operations, 109 schemas`. If the counts differ, the live API changed since 2026-09-20; note the new numbers in the commit message and continue.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch-spec.mjs spec/openapi.json package.json
git commit -m "chore(spec): vendor Intervals.icu OpenAPI snapshot

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Coverage CLI

**Files:**
- Create: `scripts/coverage.mjs`
- Modify: `package.json` (add `coverage:api` script)

**Interfaces:**
- Consumes: `specOperations`, `sdkOperations`, `matchOperations` from `scripts/lib/spec-ops.mjs`.
- Produces: CLI. Exit 0 when no phantom ops. Exit 1 when any phantom op. With `--strict`, exit 1 when any missing op too.

- [ ] **Step 1: Write the CLI**

```js
// scripts/coverage.mjs
// Usage: node scripts/coverage.mjs [--strict]
// Diffs the SDK's HTTP calls against spec/openapi.json.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { specOperations, sdkOperations, matchOperations } from './lib/spec-ops.mjs';

const strict = process.argv.includes('--strict');

async function loadSdkFiles() {
  const dir = 'src/services';
  const names = (await readdir(dir)).filter((n) => n.endsWith('.ts'));
  const files = await Promise.all(
    names.map(async (name) => ({ name, text: await readFile(path.join(dir, name), 'utf8') })),
  );
  files.push({ name: 'client.ts', text: await readFile('src/client.ts', 'utf8') });
  return files;
}

const spec = JSON.parse(await readFile('spec/openapi.json', 'utf8'));
const specOps = specOperations(spec);
const sdkOps = sdkOperations(await loadSdkFiles());
const { matched, phantom, missing } = matchOperations(specOps, sdkOps);

console.log(`Spec operations:      ${specOps.length}`);
console.log(`SDK operations:       ${sdkOps.length}`);
console.log(`Matched:              ${matched.length}`);
console.log(`SDK not in spec:      ${phantom.length}`);
console.log(`Spec not in SDK:      ${missing.length}`);

if (phantom.length) {
  console.log('\nSDK operations NOT in spec (fix or document as undocumented):');
  for (const p of [...phantom].sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${p.key}    <- ${p.source}`);
  }
}
if (missing.length) {
  console.log('\nSpec operations NOT in SDK:');
  for (const m of [...missing].sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${m.key}    [${m.tags.join(', ')}] ${m.summary}`);
  }
}

const failed = phantom.length > 0 || (strict && missing.length > 0);
if (failed) {
  console.error(`\nCoverage check failed${strict ? ' (strict)' : ''}.`);
  process.exit(1);
}
console.log('\nCoverage check passed.');
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add after `"spec:fetch"`:

```json
    "coverage:api": "node scripts/coverage.mjs",
```

- [ ] **Step 3: Run it and record the baseline**

Run: `npm run coverage:api; echo "exit=$?"`
Expected: `Spec operations: 149`, `SDK operations: 121`, `Matched: 105`, `SDK not in spec: 16`, `Spec not in SDK: 45`, then `exit=1`. (Verified 2026-09-20 by running this exact matcher against the vendored spec, after fixing `matchOperations` to pick the most-specific matching spec path instead of the first one found. `Matched` counts SDK methods, and one spec operation is hit by two SDK methods: `GET /activity/{id}/streams{ext}` by `getStreams` and `getStreamsCSV`. So 104 distinct spec operations are covered and 45 are missing.) If numbers differ by one or two, inspect the lists; if a genuine SDK call is not being picked up, extend the regexes in Task 1 and add a test for that shape.

- [ ] **Step 4: Commit**

```bash
git add scripts/coverage.mjs package.json
git commit -m "feat(scripts): add API coverage report against vendored spec

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm run coverage:api` from Task 3.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - name: API coverage vs vendored spec
        run: npm run coverage:api
```

- [ ] **Step 2: Sanity-check locally**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all exit 0. `npm run coverage:api` also exits 0: it is baselined against `spec/coverage-baseline.json` (the 16 currently-known phantom ops) and fails only on a regression (a new phantom op) or a stale baseline entry. CI is green on this branch; `node scripts/coverage.mjs --strict` ignores the baseline and still exits 1 until Phase 3 reaches 149/149.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, test, build and API coverage workflow

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Spec drift check and weekly workflow

**Files:**
- Create: `scripts/check-spec-drift.mjs`
- Create: `.github/workflows/spec-drift.yml`
- Modify: `package.json` (add `spec:drift` script)

**Interfaces:**
- Consumes: `fetchSpec` from `scripts/fetch-spec.mjs`; `specOperations` from `scripts/lib/spec-ops.mjs`.
- Produces: CLI. Exit 0 when identical, exit 2 when drifted. Writes a Markdown diff to `$GITHUB_STEP_SUMMARY` when that variable is set, and to `drift.md` in the working directory always.

- [ ] **Step 1: Write the script**

```js
// scripts/check-spec-drift.mjs
// Usage: node scripts/check-spec-drift.mjs
// Compares the live spec against spec/openapi.json. Exit 2 on drift.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { fetchSpec } from './fetch-spec.mjs';
import { specOperations } from './lib/spec-ops.mjs';

const vendored = JSON.parse(await readFile('spec/openapi.json', 'utf8'));
const live = await fetchSpec();

const vOps = new Set(specOperations(vendored).map((o) => o.key));
const lOps = new Set(specOperations(live).map((o) => o.key));
const vSchemas = new Set(Object.keys(vendored.components?.schemas ?? {}));
const lSchemas = new Set(Object.keys(live.components?.schemas ?? {}));

const addedOps = [...lOps].filter((k) => !vOps.has(k)).sort();
const removedOps = [...vOps].filter((k) => !lOps.has(k)).sort();
const addedSchemas = [...lSchemas].filter((k) => !vSchemas.has(k)).sort();
const removedSchemas = [...vSchemas].filter((k) => !lSchemas.has(k)).sort();

const changedSchemas = [...vSchemas]
  .filter((k) => lSchemas.has(k))
  .filter((k) => JSON.stringify(vendored.components.schemas[k]) !== JSON.stringify(live.components.schemas[k]))
  .sort();

const drifted =
  addedOps.length || removedOps.length || addedSchemas.length || removedSchemas.length || changedSchemas.length;

const section = (title, items) => (items.length ? `\n### ${title} (${items.length})\n\n${items.map((i) => `- \`${i}\``).join('\n')}\n` : '');
const report = drifted
  ? `## Spec drift detected\n\nLive spec differs from \`spec/openapi.json\`. Run \`npm run spec:fetch\` and review.\n` +
    section('Operations added', addedOps) +
    section('Operations removed', removedOps) +
    section('Schemas added', addedSchemas) +
    section('Schemas removed', removedSchemas) +
    section('Schemas changed', changedSchemas)
  : '## Spec drift check\n\nLive spec matches `spec/openapi.json`.\n';

console.log(report);
await writeFile('drift.md', report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);

process.exit(drifted ? 2 : 0);
```

- [ ] **Step 2: Add the npm script and ignore the report file**

In `package.json` `"scripts"`, add after `"coverage:api"`:

```json
    "spec:drift": "node scripts/check-spec-drift.mjs",
```

Append to `.gitignore`:

```
drift.md
```

- [ ] **Step 3: Run it**

Run: `npm run spec:drift; echo "exit=$?"`
Expected: `Live spec matches spec/openapi.json.` and `exit=0` (you vendored minutes ago). If it exits 2, the API changed between Task 2 and now; re-run `npm run spec:fetch`, amend the Task 2 commit, and re-run.

- [ ] **Step 4: Write the weekly workflow**

```yaml
# .github/workflows/spec-drift.yml
name: Spec drift

on:
  schedule:
    - cron: '0 6 * * 1' # Mondays 06:00 UTC
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - id: drift
        run: |
          set +e
          node scripts/check-spec-drift.mjs
          echo "code=$?" >> "$GITHUB_OUTPUT"
      - name: Open or update drift issue
        if: steps.drift.outputs.code == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('drift.md', 'utf8');
            const label = 'spec-drift';
            const { data: open } = await github.rest.issues.listForRepo({
              owner: context.repo.owner, repo: context.repo.repo, state: 'open', labels: label,
            });
            if (open.length) {
              await github.rest.issues.createComment({
                owner: context.repo.owner, repo: context.repo.repo, issue_number: open[0].number, body,
              });
            } else {
              await github.rest.issues.create({
                owner: context.repo.owner, repo: context.repo.repo,
                title: `Intervals.icu API spec drift detected (${new Date().toISOString().slice(0, 10)})`,
                body, labels: [label],
              });
            }
      - name: Fail job on drift
        if: steps.drift.outputs.code != '0'
        run: exit 1
```

- [ ] **Step 5: Commit**

```bash
git add scripts/check-spec-drift.mjs .github/workflows/spec-drift.yml package.json .gitignore
git commit -m "ci: add weekly Intervals.icu spec drift check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Package rename and fork identity

**Files:**
- Modify: `package.json` (name, version, author, contributors, repository, bugs, homepage)
- Modify: `.github/workflows/release.yml:60-95` (scope and publish step)
- Modify: `README.md:1-6,27,35,135,161,194,197,212,222-223`
- Modify: `docs/PUBLISHING.md` (package name mentions)
- Modify: `CHANGELOG.md` (add unreleased 3.0.0-alpha.0 entry)

- [ ] **Step 1: Update package.json fields**

Run these from the repo root:

```bash
npm pkg set name="@0x3639/intervals-icu"
npm pkg set version="3.0.0-alpha.0"
npm pkg set author="0x3639 (https://github.com/0x3639)"
npm pkg set 'contributors[0]'="Fernando Paladini <fnpaladini+nodeintervals@gmail.com> (https://github.com/paladini)"
npm pkg set repository.url="git+https://github.com/0x3639/node-intervals-icu.git"
npm pkg set bugs.url="https://github.com/0x3639/node-intervals-icu/issues"
npm pkg set homepage="https://github.com/0x3639/node-intervals-icu#readme"
npm pkg set publishConfig.access="public"
```

Then `git diff package.json` and confirm only those keys changed. `npm pkg set` reformats nothing else.

- [ ] **Step 2: Update the release workflow**

In `.github/workflows/release.yml`:

- Replace `scope: "@paladini"` with `scope: "@0x3639"`.
- Replace both `intervals-icu@$version` strings in echo lines with `$name@$version`.
- In the "Check GitHub Packages version" step, replace `@paladini/intervals-icu@` with `@0x3639/intervals-icu@`.
- Rename step `Publish to GitHub Packages as @paladini/intervals-icu` to `Publish to GitHub Packages`.
- Delete the line `npm pkg set name=@paladini/intervals-icu` (the package is already scoped).

Verify: `grep -n paladini .github/workflows/release.yml` prints nothing.

- [ ] **Step 3: Update README**

Apply these edits:

- Line 1: `# intervals-icu` becomes `# @0x3639/intervals-icu`.
- Lines 4 to 6: replace `intervals-icu` inside the three shield URLs and npm links with `%400x3639%2Fintervals-icu` in `img.shields.io` paths and `@0x3639/intervals-icu` in `npmjs.com/package/` links.
- After the badge block, add one paragraph:

```markdown
> Maintained fork of [paladini/node-intervals-icu](https://github.com/paladini/node-intervals-icu) with full coverage of the Intervals.icu OpenAPI spec, a vendored spec snapshot, and CI-enforced coverage. See [CHANGELOG](./CHANGELOG.md) for what changed in v3.
```

- Line 27: `npm install intervals-icu` becomes `npm install @0x3639/intervals-icu`.
- Lines 35, 135, 161: `from 'intervals-icu'` becomes `from '@0x3639/intervals-icu'`.
- Line 194: the table cell `` `intervals-icu` `` becomes `` `@0x3639/intervals-icu` ``.
- Line 197: `**When to use `intervals-icu` (this library):**` becomes `**When to use `@0x3639/intervals-icu` (this library):**`.
- Line 212: `MIT © [Fernando Paladini](https://github.com/paladini)` becomes `MIT © [0x3639](https://github.com/0x3639). Original library © [Fernando Paladini](https://github.com/paladini).`
- Line 222: repository link becomes `https://github.com/0x3639/node-intervals-icu`.
- Line 223: npm link becomes `https://www.npmjs.com/package/@0x3639/intervals-icu`.

Verify: `grep -n "'intervals-icu'\|install intervals-icu" README.md` prints nothing.

- [ ] **Step 4: Update docs/PUBLISHING.md**

Run: `sed -i '' "s#www.npmjs.com/package/intervals-icu#www.npmjs.com/package/@0x3639/intervals-icu#g; s#npm install intervals-icu#npm install @0x3639/intervals-icu#g; s#require('intervals-icu')#require('@0x3639/intervals-icu')#g; s#from 'intervals-icu'#from '@0x3639/intervals-icu'#g; s#npm info intervals-icu#npm info @0x3639/intervals-icu#g; s#\*\*Package Name\*\*: \`intervals-icu\`#**Package Name**: \`@0x3639/intervals-icu\`#; s#publish the \`intervals-icu\` library#publish the \`@0x3639/intervals-icu\` library#" docs/PUBLISHING.md`

Verify: `grep -n "intervals-icu" docs/PUBLISHING.md | grep -v "@0x3639\|test-intervals-icu\|node-intervals-icu"` prints nothing.

- [ ] **Step 5: Add the changelog entry**

Insert after the `## [2.2.1]` header block's preceding blank line (i.e. immediately before `## [2.2.1] - 2025-03-04`):

```markdown
## [3.0.0-alpha.0] - Unreleased

Fork of `intervals-icu` v2.2.1 by [0x3639](https://github.com/0x3639). Breaking changes land in the 3.0.0 series; see `docs/MIGRATION.md` once 3.0.0 ships.

### Changed
- **Package renamed** to `@0x3639/intervals-icu`. Install and import paths change; the API surface is unchanged in this alpha.

### Added
- `spec/openapi.json`: vendored snapshot of the Intervals.icu OpenAPI document
- `npm run coverage:api`: diffs SDK routes against the vendored spec; enforced in CI
- `npm run spec:drift`: weekly GitHub Action opens an issue when the live spec changes
- CI workflow running lint, typecheck, tests and build on Node 18, 20, 22

```

- [ ] **Step 6: Verify build and tests**

Run: `npm run typecheck && npm test && npm run build`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .github/workflows/release.yml README.md docs/PUBLISHING.md CHANGELOG.md
git commit -m "chore!: rename package to @0x3639/intervals-icu, bump to 3.0.0-alpha.0

Diverges from paladini/node-intervals-icu. Original author credited in
contributors and README.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(`package-lock.json` changes because the root package name and version live in it. If `git status` does not show it, run `npm install --package-lock-only` first.)

---

### Task 7: Live test harness

**Files:**
- Modify: `vitest.config.ts`
- Create: `vitest.live.config.ts`
- Create: `tests/live/setup.ts`
- Create: `tests/live/smoke.live.test.ts`
- Delete: `examples/manual-integration-test/` (whole directory)
- Modify: `package.json` (add `test:live` script)
- Modify: `tests/README.md` (document live suite)

**Interfaces:**
- Produces: `LIVE: boolean`, `liveClient(): IntervalsClient`, `athleteId(): string` from `tests/live/setup.ts`.

- [ ] **Step 1: Exclude live tests from the default config**

Replace the `test:` block in `vitest.config.ts` with:

```ts
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'tests/live/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '*.config.*',
      ],
    },
  },
```

- [ ] **Step 2: Create the live config**

```ts
// vitest.live.config.ts
import { defineConfig } from 'vitest/config';

// Hits the real Intervals.icu API. Never run in CI.
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run test:live
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/live/**/*.live.test.ts'],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
```

- [ ] **Step 3: Create the setup helper**

```ts
// tests/live/setup.ts
import { IntervalsClient } from '../../src/client.js';

export const LIVE = Boolean(process.env.INTERVALS_API_KEY && process.env.INTERVALS_ATHLETE_ID);
export const LIVE_WRITE = LIVE && process.env.INTERVALS_LIVE_WRITE === '1';

export function athleteId(): string {
  return process.env.INTERVALS_ATHLETE_ID as string;
}

export function liveClient(): IntervalsClient {
  return new IntervalsClient({
    apiKey: process.env.INTERVALS_API_KEY as string,
    athleteId: athleteId(),
    maxRetries: 0,
  });
}
```

- [ ] **Step 4: Write the smoke test**

```ts
// tests/live/smoke.live.test.ts
import { describe, it, expect } from 'vitest';
import { LIVE, liveClient, athleteId } from './setup.js';

describe.skipIf(!LIVE)('live: smoke', () => {
  it('fetches the authenticated athlete', async () => {
    const athlete = await liveClient().athletes.getAthlete();
    expect(athlete.id).toBe(athleteId());
  });
});
```

- [ ] **Step 5: Add the npm script and delete the dead example**

In `package.json` `"scripts"`, add after `"test:watch"`:

```json
    "test:live": "vitest run --config vitest.live.config.ts",
```

Run: `git rm -r examples/manual-integration-test`

- [ ] **Step 6: Document in tests/README.md**

Append to `tests/README.md`:

```markdown

## Live tests

`tests/live/*.live.test.ts` call the real Intervals.icu API. They are excluded from `npm test` and CI, and skip themselves unless both variables are set:

```bash
INTERVALS_API_KEY=your-key INTERVALS_ATHLETE_ID=i12345 npm run test:live
```

Set `INTERVALS_LIVE_WRITE=1` as well to enable tests that create and then delete data. Never point these at an account whose data you cannot afford to lose.
```

- [ ] **Step 7: Verify skip behavior without credentials**

Run: `npm run test:live`
Expected: 1 test file, "skipped" count 1, exit 0.

Run: `npm test`
Expected: existing suites pass; `smoke.live.test.ts` does not appear in the file list.

- [ ] **Step 8: Verify with credentials (only if you have them)**

Run: `INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=... npm run test:live`
Expected: 1 passed. If you have no key, skip this step and say so in the PR.

- [ ] **Step 9: Commit**

```bash
git add vitest.config.ts vitest.live.config.ts tests/live tests/README.md package.json
git commit -m "test: add credential-gated live test harness, remove dead manual example

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Audit probe script and AUDIT.md scaffold

> **Post-implementation note.** The shipped probe differs from the code below: probe building and running live in `scripts/lib/audit-probes.mjs`, verdicts in `scripts/lib/audit-verdict.mjs`, and non-GET probes are skipped unless `INTERVALS_LIVE_WRITE=1`. Write mode is best-effort, not a guarantee. The code below is the original plan text.

**Files:**
- Create: `scripts/audit-probe.mjs`
- Create: `AUDIT.md`
- Modify: `package.json` (add `audit:probe` script)

**Interfaces:**
- Consumes: nothing from earlier tasks (raw `fetch`, so the SDK's own bugs cannot mask results).
- Produces: `AUDIT.md` on stdout. Phase 2's plan reads the verdict column.

**How verdicts are derived.** Spring MVC (the intervals.icu backend) answers 404 for an unknown path, 405 for a known path with an unsupported verb, and 400 or 415 for a known route given a malformed body. So a write-verb probe with a deliberately malformed body helps distinguish "route exists" from "route does not exist." But `"not-json"` is valid JSON — it's just the wrong shape — so a 400 shows the route exists and rejected the request body, not that no handler ran; this is best-effort, not a guarantee that a handler never executes. Non-GET probes only run at all with `INTERVALS_LIVE_WRITE=1`. Read probes use real arguments.

- [ ] **Step 1: Write the probe script**

```js
// scripts/audit-probe.mjs
// Usage: INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 node scripts/audit-probe.mjs > AUDIT.md
// Probes each SDK route that disagrees with spec/openapi.json against the live API.
// Read probes use real data. Write probes send a malformed body; this is best-effort, not a guarantee that no handler runs.
const BASE = 'https://intervals.icu/api/v1';
const KEY = process.env.INTERVALS_API_KEY;
const ATHLETE = process.env.INTERVALS_ATHLETE_ID;
if (!KEY || !ATHLETE) {
  console.error('Set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID');
  process.exit(1);
}
const AUTH = 'Basic ' + Buffer.from(`API_KEY:${KEY}`).toString('base64');

async function call(method, path, { query, body, contentType } = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, String(v));
  const headers = { authorization: AUTH };
  if (body !== undefined) headers['content-type'] = contentType ?? 'application/json';
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  return { status: res.status, snippet: text.replace(/\s+/g, ' ').slice(0, 80) };
}

async function firstId(path, query) {
  const r = await fetch(`${BASE}${path}?${new URLSearchParams(query)}`, { headers: { authorization: AUTH } });
  if (!r.ok) return undefined;
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0].id : undefined;
}

const today = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
const activityId = await firstId(`/athlete/${ATHLETE}/activities`, { oldest: yearAgo, newest: today });
const routeId = await firstId(`/athlete/${ATHLETE}/routes`, {});
const workoutId = await firstId(`/athlete/${ATHLETE}/workouts`, {});
const BAD = '"not-json"'; // string literal where an object is required -> 400 if route exists

const A = `/athlete/${ATHLETE}`;
const probes = [
  { name: 'download-fit-files verb', sdk: ['GET', `${A}/download-fit-files`, { query: { ids: activityId } }], spec: ['POST', `${A}/download-fit-files`, { query: { ids: activityId } }], needs: activityId },
  { name: 'download-workout verb (global)', sdk: ['GET', '/download-workout.zwo', { query: { id: workoutId } }], spec: ['POST', '/download-workout.zwo', { body: BAD }], needs: workoutId },
  { name: 'download-workout verb (athlete)', sdk: ['GET', `${A}/download-workout.zwo`, { query: { id: workoutId } }], spec: ['POST', `${A}/download-workout.zwo`, { body: BAD }], needs: workoutId },
  { name: 'streams.csv update verb', sdk: ['POST', `/activity/${activityId}/streams.csv`, { body: BAD }], spec: ['PUT', `/activity/${activityId}/streams.csv`, { body: BAD }], needs: activityId },
  { name: 'chats list path', sdk: ['GET', '/chats'], spec: ['GET', `${A}/chats`] },
  { name: 'route similarity path', sdk: ['GET', `${A}/routes/${routeId}/similarities`], spec: ['GET', `${A}/routes/${routeId}/similarity/${routeId}`], needs: routeId },
  { name: 'fitness (no spec route)', sdk: ['GET', `${A}/fitness`, { query: { oldest: yearAgo, newest: today } }], spec: ['GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }] },
  { name: 'activity-summary (no spec route)', sdk: ['GET', `${A}/activity-summary`, { query: { oldest: yearAgo, newest: today } }], spec: ['GET', `${A}/athlete-summary`, { query: { start: yearAgo, end: today } }] },
  { name: 'athlete power-vs-hr path', sdk: ['GET', `${A}/power-vs-hr`, { query: { start: yearAgo, end: today } }], spec: ['GET', `${A}/power-hr-curve`, { query: { start: yearAgo, end: today } }] },
  { name: 'athlete weather path', sdk: ['GET', `${A}/weather`], spec: ['GET', `${A}/weather-forecast`] },
  { name: 'activity weather path', sdk: ['GET', `/activity/${activityId}/weather`], spec: ['GET', `/activity/${activityId}/weather-summary`], needs: activityId },
  { name: 'search athletes (no spec route)', sdk: ['GET', '/search/athletes', { query: { q: 'a' } }], spec: null },
  { name: 'wellness delete (no spec route)', sdk: ['DELETE', `${A}/wellness/1900-01-01`], spec: null },
  { name: 'shared-event create (no spec route)', sdk: ['POST', '/shared-event', { body: BAD }], spec: null },
  { name: 'shared-event update (no spec route)', sdk: ['PUT', '/shared-event/0', { body: BAD }], spec: null },
  { name: 'shared-event delete (no spec route)', sdk: ['DELETE', '/shared-event/0'], spec: null },
];

function verdict(sdkRes, specRes, isMalformed) {
  const ok = (r) => r && (r.status < 300 || (isMalformed && (r.status === 400 || r.status === 415)));
  if (ok(sdkRes)) return 'works-as-written';
  if (ok(specRes)) return 'broken: fix to spec';
  if (sdkRes?.status === 405) return 'broken: verb';
  if (sdkRes?.status === 404) return specRes ? 'ambiguous' : 'broken: delete';
  return 'ambiguous';
}

const rows = [];
for (const p of probes) {
  if ('needs' in p && !p.needs) {
    rows.push(`| ${p.name} | skipped (no sample data) | | |`);
    continue;
  }
  const [sm, sp, so = {}] = p.sdk;
  const sdkRes = await call(sm, sp, so);
  const specRes = p.spec ? await call(p.spec[0], p.spec[1], p.spec[2] ?? {}) : null;
  const malformed = so.body === BAD || p.spec?.[2]?.body === BAD;
  const fmt = (m, path, r) => `${m} ${path.replace(ATHLETE, '{id}')} → ${r.status}`;
  rows.push(
    `| ${p.name} | ${fmt(sm, sp, sdkRes)} | ${specRes ? fmt(p.spec[0], p.spec[1], specRes) : 'none'} | ${verdict(sdkRes, specRes, malformed)} |`,
  );
}

console.log(`# API audit

Generated ${today} by \`scripts/audit-probe.mjs\` against the live API. Each row is an SDK operation that
disagrees with \`spec/openapi.json\`. Write-verb probes send a malformed body, so a 400 or 415 means the
route exists and rejected the input; this is best-effort, not a guarantee that no handler ran.

Verdict legend: **works-as-written** keep and document as undocumented; **broken: fix to spec** change verb or
path; **broken: verb** path exists, verb rejected; **broken: delete** route does not exist and spec has no
replacement; **ambiguous** ask on the Intervals.icu forum.

| Probe | SDK form | Spec form | Verdict |
|---|---|---|---|
${rows.join('\n')}
`);
```

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add after `"spec:drift"`:

```json
    "audit:probe": "node scripts/audit-probe.mjs",
```

- [ ] **Step 3: Verify the script refuses to run without credentials**

Run: `npm run audit:probe; echo "exit=$?"`
Expected: `Set INTERVALS_API_KEY and INTERVALS_ATHLETE_ID` and `exit=1`.

- [ ] **Step 4: Create the AUDIT.md scaffold**

```markdown
# API audit

Pending. Run the probe with your own credentials and commit the output:

```bash
INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=i12345 npm run audit:probe > AUDIT.md
```

The probe sends only GET requests by default. Its write-verb probes run only with `INTERVALS_LIVE_WRITE=1` and send a malformed body or a sentinel id to minimize the chance of side effects, but this is best-effort, not a guarantee.

Until this file holds verdicts, Phase 2 (fixes) cannot start. See `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`.
```

- [ ] **Step 5: Run it against a real account if credentials exist**

Run: `INTERVALS_API_KEY=... INTERVALS_ATHLETE_ID=... npm run audit:probe > AUDIT.md && cat AUDIT.md`
Expected: a table with 16 rows. GET probes show a status code in both form columns (or "skipped (no sample data)" where the account has no activities, routes, or workouts). Non-GET probes show `skipped (write probe; set INTERVALS_LIVE_WRITE=1)` unless write mode is on, in which case they too show status codes. If you have no key, leave the scaffold in place and say so in the PR.

- [ ] **Step 6: Commit**

```bash
git add scripts/audit-probe.mjs AUDIT.md package.json
git commit -m "feat(scripts): add live audit probe for disputed endpoints

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Open the PR

- [ ] **Step 1: Final verification**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:live`
Expected: all exit 0 (live suite reports skipped).

Run: `npm run coverage:api; echo "exit=$?"`
Expected: report printed, `exit=0`, with `Baseline: 16 known phantom ops`, `New phantom (regressions): 0`, `Stale baseline entries: 0`.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin chore/spec-and-plan
gh pr create --title "Phase 0/1: vendored spec, coverage CI, live harness, package rename" --body "$(cat <<'EOF'
## Summary
- Vendors the Intervals.icu OpenAPI spec (`spec/openapi.json`) and adds `npm run coverage:api`, which diffs SDK routes against it
- Adds CI (lint, typecheck, test, build, coverage) and a weekly spec-drift job that opens an issue on change
- Renames the package to `@0x3639/intervals-icu` at `3.0.0-alpha.0`; original author credited
- Adds a credential-gated live test harness (`npm run test:live`) and an audit probe that generates `AUDIT.md`
- Removes `examples/manual-integration-test`, which referenced a method removed in v2.1

## Coverage baseline
16 SDK operations do not exist in the spec; `spec/coverage-baseline.json` records them so CI stays green while they're pending. `npm run coverage:api` fails only on a new phantom op or a stale baseline entry. Phase 2 fixes or removes the 16; each resolution should also shrink the baseline. See `docs/superpowers/specs/2026-09-20-sdk-fix-and-extend-design.md`.

## Next
Run `npm run audit:probe` with real credentials and commit `AUDIT.md`. Phase 2's plan is written from those verdicts.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

- Spec coverage: Phase 0 (vendored spec, coverage script, CI, drift job, rename) is Tasks 2 to 6. Phase 1 (live harness, audit) is Tasks 7 and 8. Phase 2 onward is intentionally out of this plan; it depends on `AUDIT.md`.
- The `download()` method option for POST downloads is a Phase 2 change. Task 1's `DOWNLOAD_RE` already recognizes the future `{ method: 'POST' }` shape so the coverage script will not need to change then.
- Names used across tasks: `specOperations`, `sdkOperations`, `matchOperations`, `specPathRegex`, `normalizeSdkPath` (Task 1), `fetchSpec` (Task 2), `LIVE`, `LIVE_WRITE`, `liveClient`, `athleteId` (Task 7). Checked consistent.
