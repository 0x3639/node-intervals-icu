// scripts/check-spec-drift.mjs
// Usage: node scripts/check-spec-drift.mjs
// Compares the live spec against spec/openapi.json. Exit 2 on drift.
// Test hook: set INTERVALS_SPEC_FILE to a JSON file path to read the "live"
// spec from disk instead of fetching it over the network (used by
// tests/scripts/cli-exit-codes.test.ts; not for normal use).
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSpec } from './fetch-spec.mjs';
import { diffSpecs, formatDriftReport } from './lib/spec-drift.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const specPath = path.join(root, 'spec/openapi.json');
let vendoredRaw;
try {
  vendoredRaw = await readFile(specPath, 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('spec/openapi.json not found. Run: npm run spec:fetch');
  } else {
    console.error(`Could not read spec/openapi.json: ${err.message}`);
  }
  process.exit(1);
}
let vendored;
try {
  vendored = JSON.parse(vendoredRaw);
} catch (err) {
  console.error(`spec/openapi.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

let live;
try {
  live = process.env.INTERVALS_SPEC_FILE
    ? JSON.parse(await readFile(process.env.INTERVALS_SPEC_FILE, 'utf8'))
    : await fetchSpec();
} catch (err) {
  console.error(`Could not fetch the live spec: ${err.message}`);
  process.exit(1);
}

const diff = diffSpecs(vendored, live);
const report = formatDriftReport(diff);

console.log(report);
await writeFile('drift.md', report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);

process.exit(diff.drifted ? 2 : 0);
