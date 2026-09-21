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

/** Mask the interior of a quoted string starting at `text[i]` (the opening quote): the quote characters are kept, every other character (including an escape's backslash and the character it escapes) becomes a single space, so the result has the same length as the consumed input. Returns `[charsConsumed, maskedText]`. */
function maskQuotedAt(text, i) {
  const quote = text[i];
  const start = i;
  i++;
  const n = text.length;
  let out = quote;
  while (i < n && text[i] !== quote) {
    if (text[i] === '\\') {
      out += '  ';
      i += 2;
    } else {
      out += ' ';
      i++;
    }
  }
  if (i < n) {
    out += text[i];
    i++;
  }
  return [i - start, out];
}

/** Mask a backtick template literal starting at `text[i]`: literal text between the backticks and outside any `${...}` hole is blanked to spaces, but a hole's contents (which may themselves contain code, including nested strings/templates) are copied through verbatim so they still count as code. Returns `[charsConsumed, maskedText]`. */
function maskTemplateAt(text, i) {
  const start = i;
  const n = text.length;
  let out = '`';
  i++; // opening backtick
  while (i < n) {
    if (text[i] === '\\') {
      out += '  ';
      i += 2;
      continue;
    }
    if (text[i] === '`') {
      out += '`';
      i++;
      break;
    }
    if (text[i] === '$' && text[i + 1] === '{') {
      out += '${';
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (text[i] === '{') {
          depth++;
          out += text[i];
          i++;
        } else if (text[i] === '}') {
          depth--;
          out += text[i];
          i++;
        } else if (text[i] === "'" || text[i] === '"') {
          const [consumed, masked] = maskQuotedAt(text, i);
          out += masked;
          i += consumed;
        } else if (text[i] === '`') {
          const [consumed, masked] = maskTemplateAt(text, i);
          out += masked;
          i += consumed;
        } else {
          out += text[i];
          i++;
        }
      }
      continue;
    }
    out += ' ';
    i++;
  }
  return [i - start, out];
}

/**
 * Return a same-length copy of `text` where the contents of every
 * single-quoted, double-quoted, and backtick template-literal string are
 * replaced by spaces (quote/backtick characters are kept, and a template's
 * `${...}` holes are copied through verbatim, since they are code). This
 * guarantees an anchor pattern (e.g. `httpClient.request(`) can never be
 * "found" inside string data -- only in real code -- while offsets into the
 * masked text remain valid offsets into the original text.
 */
export function maskStrings(text) {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      const [consumed, masked] = maskQuotedAt(text, i);
      out += masked;
      i += consumed;
      continue;
    }
    if (ch === '`') {
      const [consumed, masked] = maskTemplateAt(text, i);
      out += masked;
      i += consumed;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
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
 * Find every `httpClient.(request|download|upload)` call anchored in
 * `masked` (the comment-stripped source with string/template contents
 * blanked by `maskStrings` -- see that function -- so the anchor can never
 * be "found" inside string data): an optional balanced `<...>` type-argument
 * list followed by a balanced-paren argument list. Anything that is not
 * actually called (no `(` follows, once an optional type-argument list is
 * skipped) is not a call and is skipped rather than reported. `original` is
 * the same-length, un-masked (but still comment-stripped) text that
 * `argsText`/`fullText` are sliced from, so real string/template contents
 * are available for property extraction.
 */
function findCalls(masked, original) {
  const calls = [];
  ANCHOR_RE.lastIndex = 0;
  let m;
  while ((m = ANCHOR_RE.exec(masked))) {
    const kind = m[1];
    let i = ANCHOR_RE.lastIndex;
    while (i < masked.length && /\s/.test(masked[i])) i++;
    if (masked[i] === '<') {
      const end = skipTypeArgs(masked, i);
      if (end === -1) {
        ANCHOR_RE.lastIndex = i + 1;
        continue;
      }
      i = end;
      while (i < masked.length && /\s/.test(masked[i])) i++;
    }
    if (masked[i] !== '(') {
      ANCHOR_RE.lastIndex = i;
      continue;
    }
    const close = findMatchingParen(masked, i);
    if (close === -1) {
      ANCHOR_RE.lastIndex = i + 1;
      continue;
    }
    calls.push({ kind, argsText: original.slice(i + 1, close), fullText: original.slice(m.index, close + 1) });
    ANCHOR_RE.lastIndex = close + 1;
  }
  return calls;
}

const VERB_SET = new Set(VERBS.map((v) => v.toUpperCase()));
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
 * Split `argsText` (a call's argument list) into its top-level (depth-0)
 * comma-separated argument texts, skipping strings/templates and nested
 * `{}`/`[]`/`()` so an inner comma is never mistaken for an argument
 * separator.
 */
function splitTopLevelArgs(argsText) {
  const args = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const n = argsText.length;
  while (i < n) {
    const ch = argsText[i];
    if (ch === "'" || ch === '"') {
      i += readString(argsText, i)[0];
      continue;
    }
    if (ch === '`') {
      i += readTemplate(argsText, i, false)[0];
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      i++;
      continue;
    }
    if (ch === ',' && depth === 0) {
      args.push(argsText.slice(start, i));
      i++;
      start = i;
      continue;
    }
    i++;
  }
  args.push(argsText.slice(start));
  return args;
}

/**
 * Parse the top-level (depth-1) properties of an object literal in `text`,
 * which must, after leading whitespace, start with `{`; returns `null` when
 * it does not. Only the `method` and `url` keys are recognized. Depth is
 * tracked across `{}`, `[]`, `()`, skipping strings/templates, so a
 * same-named property nested inside a nested object/array/call (depth 2+)
 * is ignored -- only a `method`/`url` property immediately inside the
 * outermost `{` (depth 1) is reported. Each recognized key maps to
 * `{ literal }` when its value is a quoted or template-literal string, or
 * `{ invalid: true }` when it is present but shorthand (`url,` / `url }`)
 * or a non-literal expression (`method: someVar`).
 */
function topLevelObjectProperties(text) {
  const result = {};
  const n = text.length;
  let i = 0;
  while (i < n && /\s/.test(text[i])) i++;
  if (text[i] !== '{') return null;
  let depth = 0;
  let expectKey = false;
  while (i < n) {
    const ch = text[i];
    if (ch === "'" || ch === '"') {
      i += readString(text, i)[0];
      continue;
    }
    if (ch === '`') {
      i += readTemplate(text, i, false)[0];
      continue;
    }
    if (ch === '{') {
      depth++;
      i++;
      if (depth === 1) expectKey = true;
      continue;
    }
    if (ch === '[' || ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      i++;
      continue;
    }
    if (ch === ',' && depth === 1) {
      expectKey = true;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (expectKey && depth === 1 && /[A-Za-z_$]/.test(ch)) {
      const id = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i))[0];
      i += id.length;
      expectKey = false;
      let j = i;
      while (j < n && /\s/.test(text[j])) j++;
      if (text[j] === ':') {
        j++;
        while (j < n && /\s/.test(text[j])) j++;
        if (id === 'method' || id === 'url') {
          if (text[j] === "'" || text[j] === '"') {
            result[id] = { literal: readString(text, j)[1].slice(1, -1) };
          } else if (text[j] === '`') {
            result[id] = { literal: readTemplate(text, j, false)[1].slice(1, -1) };
          } else {
            result[id] = { invalid: true };
          }
        }
        i = j;
        continue;
      }
      // Shorthand property (`id,` or `id }`): not a `key: value` pair.
      if (id === 'method' || id === 'url') result[id] = { invalid: true };
      i = j;
      continue;
    }
    i++;
  }
  return result;
}

/** A recognized top-level `url` property: a literal string/template value. */
function literalUrl(props) {
  return props?.url && 'literal' in props.url ? props.url.literal : undefined;
}

/** A recognized top-level `method` property: a literal, known HTTP verb. */
function literalMethod(props) {
  const lit = props?.method && 'literal' in props.method ? props.method.literal : undefined;
  return lit !== undefined && VERB_SET.has(lit) ? lit : undefined;
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
    const masked = maskStrings(stripped);
    for (const { kind, argsText, fullText } of findCalls(masked, stripped)) {
      if (kind === 'request') {
        const props = topLevelObjectProperties(argsText);
        const method = literalMethod(props);
        const url = literalUrl(props);
        if (method === undefined || url === undefined) {
          unparsed.push({ source: name, kind, snippet: snippetOf(fullText) });
          continue;
        }
        push(method, url, name);
      } else if (kind === 'download') {
        const [firstArg, optsArg] = splitTopLevelArgs(argsText);
        const url = matchLiteral(FIRST_ARG_RE, firstArg ?? '');
        if (url === undefined) {
          unparsed.push({ source: name, kind, snippet: snippetOf(fullText) });
          continue;
        }
        const method = optsArg !== undefined ? literalMethod(topLevelObjectProperties(optsArg)) : undefined;
        push(method ?? 'GET', url, name);
      } else {
        // upload: always POST.
        const url = literalUrl(topLevelObjectProperties(argsText));
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
 * A whole-segment `/{param}` matches only the normalized SDK placeholder
 * `{x}` (see `normalizeSdkPath`) -- not an arbitrary hard-coded value -- so
 * a real `${...}` template hole is required at that position, not a literal
 * segment that merely happens to be in the right place. An inline `{ext}`
 * (a param not preceded by `/`) accepts nothing, a literal `.csv`-style
 * extension, or the `{x}` placeholder.
 */
export function specPathRegex(specPath) {
  let out = '';
  let i = 0;
  while (i < specPath.length) {
    const ch = specPath[i];
    if (ch === '{') {
      const end = specPath.indexOf('}', i);
      if (end === -1) {
        // Unclosed brace: treat as a literal so the scan always advances.
        out += '\\{';
        i += 1;
        continue;
      }
      const inline = i > 0 && specPath[i - 1] !== '/';
      out += inline ? '(\\.[A-Za-z0-9]+|\\{x\\})?' : '\\{x\\}';
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
