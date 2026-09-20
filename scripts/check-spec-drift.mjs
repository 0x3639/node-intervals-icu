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
