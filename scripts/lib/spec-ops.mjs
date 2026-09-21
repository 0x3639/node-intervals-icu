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
const DOWNLOAD_RE = /\.?download\(\s*`([^`]+)`(?:\s*,\s*\{[^}]*method:\s*'(GET|POST)')?/g;
const UPLOAD_RE = /\.?upload<[^>]*>\(\s*\{\s*url:\s*`([^`]+)`/g;

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

/**
 * Specificity of a spec path, for picking the best of several matching candidates:
 * fewer `{...}` params wins; ties broken by more literal (non-param) characters.
 */
function specificity(path) {
  const params = path.match(/\{[^}]*\}/g) ?? [];
  const literalChars = path.replace(/\{[^}]*\}/g, '').length;
  return { paramCount: params.length, literalChars };
}

/** Pair SDK operations with spec operations. */
export function matchOperations(specOps, sdkOps) {
  const matched = [];
  const phantom = [];
  const usedSpec = new Set();
  const compiled = specOps.map((s) => ({ op: s, re: specPathRegex(s.path) }));

  for (const sdk of sdkOps) {
    const candidates = compiled.filter(({ op, re }) => op.method === sdk.method && re.test(sdk.path));
    const hit = candidates.reduce((best, cur) => {
      if (!best) return cur;
      const b = specificity(best.op.path);
      const c = specificity(cur.op.path);
      if (c.paramCount !== b.paramCount) return c.paramCount < b.paramCount ? cur : best;
      return c.literalChars > b.literalChars ? cur : best;
    }, undefined);
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

/**
 * Compare the current match results against a baseline snapshot.
 *
 * `current` is `{ phantom, coveredKeys }`: `phantom` is the phantom-ops list
 * from `matchOperations`, `coveredKeys` is the current distinct set of
 * matched spec operation keys. `baseline` is `{ phantom, covered }` as read
 * from `spec/coverage-baseline.json` (an old baseline may be missing
 * `covered`, treated as `[]`).
 *
 * Returns:
 * - `newPhantom`: phantom ops not in `baseline.phantom` (regressions).
 * - `resolvedPhantom`: baseline phantom keys no longer phantom (stale
 *   entries that must be removed for the baseline to shrink monotonically).
 * - `lostCoverage`: `baseline.covered` keys not in the current covered set
 *   (a coverage regression).
 * - `newlyCovered`: current covered keys not in `baseline.covered` (stale
 *   baseline entries; the baseline must grow to include them).
 */
export function applyBaseline({ phantom, coveredKeys }, baseline) {
  const baselinePhantom = baseline.phantom ?? [];
  const baselineCovered = baseline.covered ?? [];

  const baselinePhantomSet = new Set(baselinePhantom);
  const phantomKeys = new Set(phantom.map((p) => p.key));
  const newPhantom = phantom.filter((p) => !baselinePhantomSet.has(p.key));
  const resolvedPhantom = baselinePhantom.filter((k) => !phantomKeys.has(k));

  const coveredSet = new Set(coveredKeys);
  const baselineCoveredSet = new Set(baselineCovered);
  const lostCoverage = baselineCovered.filter((k) => !coveredSet.has(k));
  const newlyCovered = [...coveredSet].filter((k) => !baselineCoveredSet.has(k));

  return { newPhantom, resolvedPhantom, lostCoverage, newlyCovered };
}
