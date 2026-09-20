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
