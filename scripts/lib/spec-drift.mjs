// Pure functions shared by check-spec-drift.mjs and its tests. No I/O here.

/** Stable JSON stringify: arrays keep order, object keys are sorted. */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const VERBS = ['get', 'post', 'put', 'delete', 'patch'];

/** Map of operation key (`specOperations`-style) -> raw operation object, keyed off `spec.paths`. */
function rawOperationsByKey(spec) {
  const byKey = new Map();
  for (const [rawPath, item] of Object.entries(spec.paths ?? {})) {
    const path = rawPath.replace(/^\/api\/v1/, '');
    for (const verb of VERBS) {
      const op = item[verb];
      if (!op) continue;
      byKey.set(`${verb.toUpperCase()} ${path}`, op);
    }
  }
  return byKey;
}

/** A path-item object with every HTTP verb key removed: whatever is left is path-level (`parameters`, `servers`, `summary`, ...). */
function pathItemWithoutVerbs(item) {
  const out = {};
  for (const [k, v] of Object.entries(item)) {
    if (!VERBS.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * Diff two OpenAPI documents. Compares operation keys, full raw operation
 * bodies (parameters, requestBody, responses, security, anything else) under
 * `stableStringify`, schema bodies, path-level fields, non-schema components,
 * and top-level document fields (`servers`, `security`, `info`, etc).
 */
export function diffSpecs(vendored, live) {
  const vOps = rawOperationsByKey(vendored);
  const lOps = rawOperationsByKey(live);
  const vKeys = new Set(vOps.keys());
  const lKeys = new Set(lOps.keys());

  const addedOps = [...lKeys].filter((k) => !vKeys.has(k)).sort();
  const removedOps = [...vKeys].filter((k) => !lKeys.has(k)).sort();
  const changedOps = [...vKeys]
    .filter((k) => lKeys.has(k))
    .filter((k) => stableStringify(vOps.get(k)) !== stableStringify(lOps.get(k)))
    .sort();

  const vSchemas = vendored.components?.schemas ?? {};
  const lSchemas = live.components?.schemas ?? {};
  const vSchemaKeys = new Set(Object.keys(vSchemas));
  const lSchemaKeys = new Set(Object.keys(lSchemas));

  const addedSchemas = [...lSchemaKeys].filter((k) => !vSchemaKeys.has(k)).sort();
  const removedSchemas = [...vSchemaKeys].filter((k) => !lSchemaKeys.has(k)).sort();
  const changedSchemas = [...vSchemaKeys]
    .filter((k) => lSchemaKeys.has(k))
    .filter((k) => stableStringify(vSchemas[k]) !== stableStringify(lSchemas[k]))
    .sort();

  const vPaths = vendored.paths ?? {};
  const lPaths = live.paths ?? {};
  const changedPathItems = Object.keys(vPaths)
    .filter((p) => Object.hasOwn(lPaths, p))
    .filter(
      (p) => stableStringify(pathItemWithoutVerbs(vPaths[p])) !== stableStringify(pathItemWithoutVerbs(lPaths[p])),
    )
    .map((p) => p.replace(/^\/api\/v1/, ''))
    .sort();

  const vComponents = vendored.components ?? {};
  const lComponents = live.components ?? {};
  const componentKeys = new Set([...Object.keys(vComponents), ...Object.keys(lComponents)].filter((k) => k !== 'schemas'));
  const changedComponents = [...componentKeys]
    .filter((k) => stableStringify(vComponents[k]) !== stableStringify(lComponents[k]))
    .sort();

  const topLevelKeys = new Set(
    [...Object.keys(vendored), ...Object.keys(live)].filter((k) => k !== 'paths' && k !== 'components'),
  );
  const changedTopLevel = [...topLevelKeys]
    .filter((k) => stableStringify(vendored[k]) !== stableStringify(live[k]))
    .sort();

  const classifiedDrift = Boolean(
    addedOps.length ||
      removedOps.length ||
      changedOps.length ||
      addedSchemas.length ||
      removedSchemas.length ||
      changedSchemas.length ||
      changedPathItems.length ||
      changedComponents.length ||
      changedTopLevel.length,
  );

  // Safety net: if the documents differ byte-for-byte (modulo key order) but
  // none of the classifiers above caught it, still report drift so nothing
  // slips through unnoticed.
  const documentsDiffer = stableStringify(vendored) !== stableStringify(live);
  const drifted = classifiedDrift || documentsDiffer;
  const otherChanges = documentsDiffer && !classifiedDrift;

  return {
    addedOps,
    removedOps,
    changedOps,
    addedSchemas,
    removedSchemas,
    changedSchemas,
    changedPathItems,
    changedComponents,
    changedTopLevel,
    drifted,
    otherChanges,
  };
}

const section = (title, items) =>
  items.length ? `\n### ${title} (${items.length})\n\n${items.map((i) => `- \`${i}\``).join('\n')}\n` : '';

/** Format a `diffSpecs` result as the Markdown report the CLI prints and writes. */
export function formatDriftReport(diff) {
  if (!diff.drifted) return '## Spec drift check\n\nLive spec matches `spec/openapi.json`.\n';
  return (
    `## Spec drift detected\n\nLive spec differs from \`spec/openapi.json\`. Run \`npm run spec:fetch\` and review.\n` +
    section('Operations added', diff.addedOps) +
    section('Operations removed', diff.removedOps) +
    section('Operations changed', diff.changedOps) +
    section('Schemas added', diff.addedSchemas) +
    section('Schemas removed', diff.removedSchemas) +
    section('Schemas changed', diff.changedSchemas) +
    section('Path items changed', diff.changedPathItems) +
    section('Components changed', diff.changedComponents) +
    section('Top-level changed', diff.changedTopLevel) +
    (diff.otherChanges
      ? '\n### Unclassified change\n\nThe documents differ but no specific classifier caught it. Diff manually.\n'
      : '')
  );
}
