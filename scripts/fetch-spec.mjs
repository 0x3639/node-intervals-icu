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
