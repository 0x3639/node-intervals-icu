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

/**
 * Strip comments from `text` while leaving string and template-literal
 * contents untouched (so a `//` or `/* ` inside a string, or inside a
 * `${...}` expression nested in a template literal, is never mistaken for a
 * comment). Single- and double-quoted strings, and backtick template
 * literals (including their `${...}` holes, which are themselves scanned as
 * code and so may contain further comments, strings or nested templates),
 * are copied through verbatim; `// ...` to end of line and `/* ... *` `/`
 * blocks are dropped.
 */
export function stripComments(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const [consumed, chunk] = readString(text, i);
      out += chunk;
      i += consumed;
      continue;
    }
    if (ch === '`') {
      const [consumed, chunk] = readTemplate(text, i, true);
      out += chunk;
      i += consumed;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/** Read a quoted string starting at `text[i]` (the opening quote). Returns `[charsConsumed, verbatimText]`. */
function readString(text, i) {
  const quote = text[i];
  const start = i;
  i++;
  const n = text.length;
  while (i < n && text[i] !== quote) {
    i += text[i] === '\\' ? 2 : 1;
  }
  if (i < n) i++; // closing quote
  return [i - start, text.slice(start, i)];
}

/**
 * Read a backtick template literal starting at `text[i]`. When `stripInner`
 * is true, comments inside `${...}` holes are dropped (this is the
 * `stripComments` entry point); when false, the raw text is copied through
 * (used by the call-argument scanner, which runs on already-stripped text).
 * Returns `[charsConsumed, text]`.
 */
function readTemplate(text, i, stripInner) {
  const start = i;
  const n = text.length;
  i++; // opening backtick
  while (i < n) {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    if (text[i] === '`') {
      i++;
      break;
    }
    if (text[i] === '$' && text[i + 1] === '{') {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === '{') {
          depth++;
          i++;
        } else if (text[i] === '}') {
          depth--;
          i++;
        } else if (stripInner && text[i] === '/' && text[i + 1] === '/') {
          while (i < n && text[i] !== '\n') i++;
        } else if (stripInner && text[i] === '/' && text[i + 1] === '*') {
          i += 2;
          while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
          i += 2;
        } else if (text[i] === "'" || text[i] === '"') {
          i += readString(text, i)[0];
        } else if (text[i] === '`') {
          i += readTemplate(text, i, stripInner)[0];
        } else {
          i++;
        }
      }
      continue;
    }
    i++;
  }
  return [i - start, text.slice(start, i)];
}

/** Skip a `<...>` type-argument list starting at `text[i]` (the `<`). Returns the index just past the matching `>`, or -1 if unbalanced. */
function skipTypeArgs(text, i) {
  let depth = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '<') {
      depth++;
      i++;
    } else if (text[i] === '>') {
      depth--;
      i++;
      if (depth === 0) return i;
    } else {
      i++;
    }
  }
  return -1;
}

/** Find the index of the `)` matching the `(` at `text[openIndex]`, skipping over strings and templates. Returns -1 if unbalanced. */
function findMatchingParen(text, openIndex) {
  let depth = 1;
  let i = openIndex + 1;
  const n = text.length;
  while (i < n && depth > 0) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      i += readString(text, i)[0];
      continue;
    }
    if (ch === '`') {
      i += readTemplate(text, i, false)[0];
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    i++;
  }
  return depth === 0 ? i - 1 : -1;
}

const ANCHOR_RE = /httpClient\.(request|download|upload)\b/g;

/**
 * Find every `httpClient.(request|download|upload)` call in already
 * comment-stripped `text`: an optional balanced `<...>` type-argument list
 * followed by a balanced-paren argument list. Anything that is not actually
 * called (no `(` follows, once an optional type-argument list is skipped)
 * is not a call and is skipped rather than reported.
 */
function findCalls(text) {
  const calls = [];
  ANCHOR_RE.lastIndex = 0;
  let m;
  while ((m = ANCHOR_RE.exec(text))) {
    const kind = m[1];
    let i = ANCHOR_RE.lastIndex;
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text[i] === '<') {
      const end = skipTypeArgs(text, i);
      if (end === -1) {
        ANCHOR_RE.lastIndex = i + 1;
        continue;
      }
      i = end;
      while (i < text.length && /\s/.test(text[i])) i++;
    }
    if (text[i] !== '(') {
      ANCHOR_RE.lastIndex = i;
      continue;
    }
    const close = findMatchingParen(text, i);
    if (close === -1) {
      ANCHOR_RE.lastIndex = i + 1;
      continue;
    }
    calls.push({ kind, argsText: text.slice(i + 1, close), fullText: text.slice(m.index, close + 1) });
    ANCHOR_RE.lastIndex = close + 1;
  }
  return calls;
}

const METHOD_RE = /method:\s*(['"])(GET|POST|PUT|DELETE|PATCH)\1/;
const URL_RE = /url:\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/;
const FIRST_ARG_RE = /^\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/;

/** Run a "quote or template literal" regex (with alternative capture groups) and return whichever group matched, or `undefined`. */
function matchLiteral(re, str) {
  const m = re.exec(str);
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3];
}

function snippetOf(fullText) {
  return fullText.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/**
 * Extract `{ method, path }` pairs from SDK source files. Anchored to real
 * `httpClient.request/download/upload(...)` calls (see `findCalls`): every
 * such call is either fully parsed into `ops`, or -- when its method or url
 * cannot be extracted, e.g. a shorthand property or a value built from a
 * variable -- reported in `unparsed` instead of silently guessed at or
 * dropped.
 */
export function sdkOperations(files) {
  const ops = [];
  const unparsed = [];
  const push = (method, rawPath, source) => {
    const path = normalizeSdkPath(rawPath);
    ops.push({ method, path, key: `${method} ${path}`, source });
  };

  for (const { name, text } of files) {
    const stripped = stripComments(text);
    for (const { kind, argsText, fullText } of findCalls(stripped)) {
      if (kind === 'request') {
        const methodMatch = METHOD_RE.exec(argsText);
        const url = matchLiteral(URL_RE, argsText);
        if (!methodMatch || url === undefined) {
          unparsed.push({ source: name, kind, snippet: snippetOf(fullText) });
          continue;
        }
        push(methodMatch[2], url, name);
      } else if (kind === 'download') {
        const url = matchLiteral(FIRST_ARG_RE, argsText);
        if (url === undefined) {
          unparsed.push({ source: name, kind, snippet: snippetOf(fullText) });
          continue;
        }
        const methodMatch = METHOD_RE.exec(argsText);
        push(methodMatch ? methodMatch[2] : 'GET', url, name);
      } else {
        // upload: always POST.
        const url = matchLiteral(URL_RE, argsText);
        if (url === undefined) {
          unparsed.push({ source: name, kind, snippet: snippetOf(fullText) });
          continue;
        }
        push('POST', url, name);
      }
    }
  }
  return { ops, unparsed };
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
