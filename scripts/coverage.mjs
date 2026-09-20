// scripts/coverage.mjs
// Usage: node scripts/coverage.mjs [--strict]
// Diffs the SDK's HTTP calls against spec/openapi.json.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { specOperations, sdkOperations, matchOperations } from './lib/spec-ops.mjs';

const strict = process.argv.includes('--strict');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadSdkFiles() {
  const dir = path.join(root, 'src/services');
  const names = (await readdir(dir)).filter((n) => n.endsWith('.ts'));
  const files = await Promise.all(
    names.map(async (name) => ({ name, text: await readFile(path.join(dir, name), 'utf8') })),
  );
  files.push({ name: 'client.ts', text: await readFile(path.join(root, 'src/client.ts'), 'utf8') });
  return files;
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

const failed = phantom.length > 0 || (strict && missing.length > 0);
if (failed) {
  console.error(`\nCoverage check failed${strict ? ' (strict)' : ''}.`);
  process.exit(1);
}
console.log('\nCoverage check passed.');
