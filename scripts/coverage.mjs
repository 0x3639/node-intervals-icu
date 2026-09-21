// scripts/coverage.mjs
// Usage: node scripts/coverage.mjs [--strict] [--write-baseline]
// Diffs the SDK's HTTP calls against spec/openapi.json.
// SDK operations listed in spec/undocumented-routes.json are real, verified routes that
// are simply absent from the published spec (see AUDIT.md); they are removed from the
// phantom list before any check runs, including --strict, since --strict is a stricter
// check of the SAME comparison, not a bypass of routes we've already verified are real.
// A stale allowlist entry (no longer phantom) fails the run in every mode.
// The gate matches method + path only; query-parameter names and encodings are not checked.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specOperations, sdkOperations, matchOperations, applyBaseline, applyAllowlist } from './lib/spec-ops.mjs';

const strict = process.argv.includes('--strict');
const writeBaselineFlag = process.argv.includes('--write-baseline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'spec/coverage-baseline.json');
const allowlistPath = path.join(root, 'spec/undocumented-routes.json');

async function loadAllowlist() {
  let raw;
  try {
    raw = await readFile(allowlistPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error(`Could not read ${allowlistPath}: ${err.message}`);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`${allowlistPath} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  const routes = parsed.routes ?? [];
  if (!Array.isArray(routes)) {
    console.error(`${allowlistPath} is malformed: "routes" must be an array.`);
    process.exit(1);
  }
  return routes.filter((r) => typeof r?.key === 'string');
}

async function loadSdkFiles() {
  const dir = path.join(root, 'src/services');
  const names = (await readdir(dir)).filter((n) => n.endsWith('.ts'));
  const files = await Promise.all(
    names.map(async (name) => ({ name, text: await readFile(path.join(dir, name), 'utf8') })),
  );
  files.push({ name: 'client.ts', text: await readFile(path.join(root, 'src/client.ts'), 'utf8') });
  return files;
}

async function loadBaseline() {
  let raw;
  try {
    raw = await readFile(baselinePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Baseline: ${baselinePath} not found; treating as empty.`);
      return { phantom: [], covered: [] };
    }
    console.error(`Could not read ${baselinePath}: ${err.message}`);
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`${baselinePath} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  return { phantom: parsed.phantom ?? [], covered: parsed.covered ?? [] };
}

const specPath = path.join(root, 'spec/openapi.json');
let specRaw;
try {
  specRaw = await readFile(specPath, 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('spec/openapi.json not found. Run: npm run spec:fetch');
  } else {
    console.error(`Could not read spec/openapi.json: ${err.message}`);
  }
  process.exit(1);
}
let spec;
try {
  spec = JSON.parse(specRaw);
} catch (err) {
  console.error(`spec/openapi.json is not valid JSON: ${err.message}`);
  process.exit(1);
}
const specOps = specOperations(spec);
const sdkFiles = await loadSdkFiles();
const { ops: sdkOps, unparsed } = sdkOperations(sdkFiles);
const { matched, phantom: rawPhantom, missing } = matchOperations(specOps, sdkOps);
const specOpsCovered = new Set(matched.map((m) => m.spec.key)).size;

if (unparsed.length > 0) {
  console.error('Unparsed httpClient calls; extend scripts/lib/spec-ops.mjs');
  for (const u of unparsed) {
    console.error(`  ${u.source}: ${u.kind} — ${u.snippet}`);
  }
  process.exit(1);
}

const allowlistRoutes = await loadAllowlist();
const { phantom, allowed, unused } = applyAllowlist(rawPhantom, allowlistRoutes.map((r) => r.key));
let allowlistFailed = false;

console.log(`Undocumented (allowlisted): ${allowed.length}`);
if (allowed.length) {
  for (const a of [...allowed].sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${a.key}`);
  }
}
if (unused.length) {
  allowlistFailed = true;
  console.error('\nStale allowlist entries (no longer phantom):');
  for (const k of unused) {
    console.error(`  ${k}: Allowlist entry no longer phantom; remove it from spec/undocumented-routes.json`);
  }
}

if (writeBaselineFlag) {
  if (allowlistFailed) {
    console.error('\nNot writing baseline: fix the stale allowlist entries above first.');
    process.exit(1);
  }
  const phantomKeys = [...new Set(phantom.map((p) => p.key))].sort();
  const coveredKeys = [...new Set(matched.map((m) => m.spec.key))].sort();
  await writeFile(baselinePath, `${JSON.stringify({ phantom: phantomKeys, covered: coveredKeys }, null, 2)}\n`);
  console.log(`Wrote ${phantomKeys.length} phantom ops and ${coveredKeys.length} covered ops to ${baselinePath}`);
  process.exit(0);
}

console.log(`Spec operations:      ${specOps.length}`);
console.log(`SDK operations:       ${sdkOps.length}`);
console.log(`Matched (SDK ops):    ${matched.length}`);
console.log(`Spec ops covered:     ${specOpsCovered}`);
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

if (strict) {
  const failed = phantom.length > 0 || missing.length > 0 || allowlistFailed;
  if (failed) {
    console.error('\nCoverage check failed (strict).');
    process.exit(1);
  }
  console.log('\nCoverage check passed.');
  process.exit(0);
}

const baseline = await loadBaseline();
const coveredKeys = [...new Set(matched.map((m) => m.spec.key))];
const { newPhantom, resolvedPhantom, lostCoverage, newlyCovered } = applyBaseline(
  { phantom, coveredKeys },
  baseline,
);

console.log(`\nBaseline: ${baseline.phantom.length} phantom, ${baseline.covered.length} covered`);
console.log(`New phantom (regressions): ${newPhantom.length}`);
console.log(`Lost coverage (regressions): ${lostCoverage.length}`);
console.log(`Stale baseline entries: ${resolvedPhantom.length} resolved phantom, ${newlyCovered.length} newly covered`);

if (newPhantom.length) {
  console.log('\nNew phantom ops (not in the baseline; fix, document, or add to spec/coverage-baseline.json):');
  for (const p of [...newPhantom].sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${p.key}    <- ${p.source}`);
  }
}
if (lostCoverage.length) {
  console.log('\nLost coverage (spec ops the baseline had covered that are no longer matched by the SDK):');
  for (const k of [...lostCoverage].sort()) {
    console.log(`  ${k}`);
  }
}
if (resolvedPhantom.length) {
  console.log('\nStale baseline entries (no longer phantom; remove from spec/coverage-baseline.json):');
  for (const k of [...resolvedPhantom].sort()) {
    console.log(`  ${k}`);
  }
}
if (newlyCovered.length) {
  console.log('\nStale baseline entries (newly covered; add to spec/coverage-baseline.json):');
  for (const k of [...newlyCovered].sort()) {
    console.log(`  ${k}`);
  }
}

if (newPhantom.length > 0 || lostCoverage.length > 0 || resolvedPhantom.length > 0 || newlyCovered.length > 0 || allowlistFailed) {
  console.error(
    '\nCoverage check failed. Regressions (new phantom ops, lost coverage) must be fixed. ' +
      'Stale entries (resolved phantom, newly covered) mean the baseline is out of date: run ' +
      '`npm run coverage:api -- --write-baseline` to regenerate it.',
  );
  process.exit(1);
}
console.log('\nCoverage check passed.');
