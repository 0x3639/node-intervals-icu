// scripts/coverage.mjs
// Usage: node scripts/coverage.mjs [--strict] [--write-baseline]
// Diffs the SDK's HTTP calls against spec/openapi.json.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specOperations, sdkOperations, matchOperations, applyBaseline } from './lib/spec-ops.mjs';

const strict = process.argv.includes('--strict');
const writeBaselineFlag = process.argv.includes('--write-baseline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'spec/coverage-baseline.json');

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
      return [];
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
  return parsed.phantom ?? [];
}

let spec;
try {
  spec = JSON.parse(await readFile(path.join(root, 'spec/openapi.json'), 'utf8'));
} catch {
  console.error('spec/openapi.json not found. Run: npm run spec:fetch');
  process.exit(1);
}
const specOps = specOperations(spec);
const sdkFiles = await loadSdkFiles();
const sdkOps = sdkOperations(sdkFiles);
const { matched, phantom, missing } = matchOperations(specOps, sdkOps);
const specOpsCovered = new Set(matched.map((m) => m.spec.key)).size;

const httpCallCount = sdkFiles.reduce(
  (n, { text }) => n + (text.match(/httpClient\.(request|download|upload)\b/g) ?? []).length,
  0,
);
if (httpCallCount !== sdkOps.length) {
  console.error(
    `Extraction mismatch: ${httpCallCount} httpClient calls in source but ${sdkOps.length} operations extracted. A call shape is not recognized by scripts/lib/spec-ops.mjs.`,
  );
  process.exit(1);
}

if (writeBaselineFlag) {
  const phantomKeys = [...new Set(phantom.map((p) => p.key))].sort();
  await writeFile(baselinePath, `${JSON.stringify({ phantom: phantomKeys }, null, 2)}\n`);
  console.log(`Wrote ${phantomKeys.length} phantom ops to ${baselinePath}`);
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
  const failed = phantom.length > 0 || missing.length > 0;
  if (failed) {
    console.error('\nCoverage check failed (strict).');
    process.exit(1);
  }
  console.log('\nCoverage check passed.');
  process.exit(0);
}

const baselineKeys = await loadBaseline();
const { newPhantom, resolved } = applyBaseline(phantom, baselineKeys);

console.log(`\nBaseline: ${baselineKeys.length} known phantom ops`);
console.log(`New phantom (regressions): ${newPhantom.length}`);
console.log(`Stale baseline entries: ${resolved.length}`);

if (newPhantom.length) {
  console.log('\nNew phantom ops (not in the baseline; fix, document, or add to spec/coverage-baseline.json):');
  for (const p of [...newPhantom].sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${p.key}    <- ${p.source}`);
  }
}
if (resolved.length) {
  console.log('\nStale baseline entries (no longer phantom; remove from spec/coverage-baseline.json):');
  for (const k of [...resolved].sort()) {
    console.log(`  ${k}`);
  }
}

if (newPhantom.length > 0 || resolved.length > 0) {
  console.error('\nCoverage check failed.');
  process.exit(1);
}
console.log('\nCoverage check passed.');
