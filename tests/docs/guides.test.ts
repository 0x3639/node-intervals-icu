import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `public readonly athletes: AthleteService;` -> [['athletes', 'AthleteService'], ...] */
function accessors(): Array<[string, string]> {
  return [...read('src/client.ts').matchAll(/public readonly (\w+): (\w+Service);/g)].map((m) => [m[1], m[2]]);
}

/** Public method names of a service class, from its source file */
function methodsOf(serviceClass: string): string[] {
  const file = readdirSync(join(ROOT, 'src/services')).find((f) => read(`src/services/${f}`).includes(`export class ${serviceClass} `));
  if (!file) throw new Error(`no source file for ${serviceClass}`);
  // Class members sit at exactly two spaces of indentation; statements inside method bodies
  // (`if (`, `for (` ...) are indented further and are also excluded by name.
  const KEYWORDS = new Set(['constructor', 'if', 'for', 'while', 'switch', 'catch', 'return']);
  return [...read(`src/services/${file}`).matchAll(/^  (?:public )?(?:async )?([a-zA-Z]\w*)\(/gm)]
    .map((m) => m[1])
    .filter((n) => !KEYWORDS.has(n));
}

function guideFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${d}/${e.name}`);
      else if (e.name.endsWith('.md')) out.push(`${d}/${e.name}`);
    }
  };
  walk('docs/guides');
  return out;
}

/**
 * Runnable examples only. `examples/_shared/` holds helper modules, not examples: they
 * carry no run header, no env guard and no client, so the per-example checks below
 * (retries, markers, orphan warning) do not apply to them. They have their own test.
 */
function exampleFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== '_shared') walk(`${d}/${e.name}`); }
      else if (e.name.endsWith('.ts')) out.push(`${d}/${e.name}`);
    }
  };
  walk('examples');
  return out;
}

/** The helper modules under `examples/_shared/`. */
function sharedFiles(): string[] {
  return readdirSync(join(ROOT, 'examples/_shared'))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => `examples/_shared/${f}`);
}

describe('documentation guides', () => {
  it('every service accessor on IntervalsClient has a service page', () => {
    // The scan is regex-based: pin the count so a refactor that stops matching the
    // accessor declarations fails here instead of silently checking nothing.
    expect(accessors()).toHaveLength(16);
    const missing = accessors().map(([a]) => `docs/guides/services/${kebab(a)}.md`).filter((p) => !existsSync(join(ROOT, p)));
    expect(missing).toEqual([]);
  });

  it('services.md lists every service page as a front-matter child', () => {
    const fm = /^---\n([\s\S]*?)\n---/.exec(read('docs/guides/services.md'));
    const children = [...(fm?.[1] ?? '').matchAll(/^\s+- (\S+)/gm)].map((m) => m[1].replace(/^\.\/services\//, ''));
    const pages = readdirSync(join(ROOT, 'docs/guides/services')).filter((f) => f.endsWith('.md'));
    expect([...children].sort()).toEqual([...pages].sort());
  });

  it('every service page lists every public method of its service as a {@link}', () => {
    const gaps: string[] = [];
    for (const [accessor, cls] of accessors()) {
      const page = read(`docs/guides/services/${kebab(accessor)}.md`);
      for (const m of methodsOf(cls)) {
        if (!page.includes(`{@link ${cls}.${m}}`)) gaps.push(`${kebab(accessor)}.md lacks {@link ${cls}.${m}}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('every projectDocuments entry and every frontmatter child exists', () => {
    const cfg = JSON.parse(read('typedoc.json')) as { projectDocuments: string[] };
    const missing: string[] = [];
    for (const p of cfg.projectDocuments) {
      if (!existsSync(join(ROOT, p))) { missing.push(p); continue; }
      const fm = /^---\n([\s\S]*?)\n---/.exec(read(p));
      for (const child of [...(fm?.[1] ?? '').matchAll(/^\s+- (\S+)/gm)].map((m) => m[1])) {
        if (!existsSync(resolve(join(ROOT, dirname(p)), child))) missing.push(`${p} -> ${child}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every {@includeCode} target exists and every guide has front matter with a title', () => {
    const problems: string[] = [];
    for (const g of guideFiles()) {
      const text = read(g);
      // Frontmatter may carry other keys (e.g. `children` on services.md), so look for a
      // `title:` line anywhere inside the `---` block rather than requiring it be the only key.
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (!fm || !/^title: .+$/m.test(fm[1])) problems.push(`${g}: missing front matter title`);
      for (const [, target] of text.matchAll(/\{@includeCode ([^}#\s]+)(?:#\w+)?\}/g)) {
        if (!existsSync(resolve(join(ROOT, dirname(g)), target))) problems.push(`${g} -> ${target}`);
      }
      // migrating-to-v3.md is a historical before/after reference: its snippets compare
      // removed and renamed methods (v1 -> v2 -> v3) that cannot compile against the
      // current SDK by design, so it is exempt from the {@includeCode}-only rule.
      if (!g.endsWith('/migrating-to-v3.md') && /```ts|```typescript/.test(text)) {
        problems.push(`${g}: contains a fenced TypeScript block; use {@includeCode}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('every mutating example disables retries', () => {
    // The SDK retries 429/502/503/504 for every method, POST included, so a create the
    // server committed before answering a 5xx would be repeated by the retry and only the
    // last response's id would be cleaned up. Mutating examples must opt out.
    // Any `.<verb><Noun>(` call rather than a hand-kept list of method names, so a new
    // example calling a mutating method the list never heard of is still caught.
    // `reorder` is spelled out as well: CustomItemService.reorder() carries no noun suffix.
    const MUTATORS = /\.(?:(?:create|update|delete|send|upload|reorder|mark)[A-Z]\w*|reorder)\(/;
    // Block and line comments are stripped first: a mutating call shown inside a `/* ... */`
    // block (examples/basic-usage.ts section 8) or after `//` is prose, not a write, and
    // must not be flagged.
    const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const gaps = exampleFiles().filter((f) => {
      const text = read(f);
      return MUTATORS.test(strip(text)) && !text.includes('maxRetries: 0');
    });
    expect(gaps).toEqual([]);
    // Pin the count: the regex must still match the mutating examples, so a change that
    // stops matching anything fails here instead of silently checking nothing.
    const mutating = exampleFiles().filter((f) => MUTATORS.test(strip(read(f))));
    expect(mutating.sort()).toEqual([
      'examples/chats/send-edit-delete.ts',
      'examples/custom-items/list-and-reorder.ts',
      'examples/events/create-update-delete.ts',
      'examples/gear/reminders.ts',
      'examples/guides/upload-activity.ts',
      'examples/wellness/update-today.ts',
      'examples/workouts/create-in-folder.ts',
    ]);
  });

  it('every shared example helper is side-effect free', () => {
    // Helpers are imported by several examples (and by a unit test), so importing one must
    // do nothing: no environment read, no client construction, no top-level await.
    const files = sharedFiles();
    expect(files.length).toBeGreaterThan(0);
    const problems: string[] = [];
    for (const f of files) {
      const text = read(f);
      for (const needle of ['process.env', 'new IntervalsClient']) {
        if (text.includes(needle)) problems.push(`${f} contains ${needle}`);
      }
      // Top-level statements sit at zero indentation in these files; an `await` inside a
      // function body is indented and is not a module side effect.
      if (/^(?:(?:const|let|var)\s[^=]*=\s*)?await\b/m.test(text)) problems.push(`${f} has a top-level await`);
    }
    expect(problems).toEqual([]);
  });

  it('no example imports from src/types; the barrel is the public surface', () => {
    // Readers copy these imports, and `src/types/index.js` is not what the package exports.
    const problems = [...exampleFiles(), ...sharedFiles()].filter((f) =>
      [...read(f).matchAll(/from '([^']+)'/g)].some((m) => m[1].includes('src/types')),
    );
    expect(problems).toEqual([]);
  });

  it('the download example writes its file privately and refuses to overwrite', () => {
    // The FIT file is written to a freshly created directory, readable only by the current
    // user, and never onto a path something else pre-created.
    const text = read('examples/guides/download-files.ts');
    for (const needle of ['mkdtempSync(', 'mode: 0o600', "flag: 'wx'"]) {
      expect(text, `download-files.ts lacks ${needle}`).toContain(needle);
    }
  });
  it('every creating example carries a timestamped marker and the orphan warning', () => {
    // Retries are off, so a create that the server committed before answering 5xx is not
    // repeated; but the example then throws before it learns the id, and nothing is cleaned
    // up. The marker in the resource name is what lets a reader find and delete it by hand,
    // and the header must say so.
    const creating = [
      'examples/chats/send-edit-delete.ts',
      'examples/events/create-update-delete.ts',
      'examples/gear/reminders.ts',
      'examples/guides/upload-activity.ts',
      'examples/workouts/create-in-folder.ts',
    ];
    for (const file of creating) {
      const text = read(file);
      expect(text, `${file} names the resource with a Date.now() marker`).toMatch(/by the SDK example \$\{Date\.now\(\)\}/);
      // The sentence wraps across comment lines, so match it with the line prefix allowed.
      expect(text, `${file} warns about the orphan case in its header`).toMatch(
        /If the create call itself fails after the server committed it, nothing is cleaned\s*(?:\*\s*)?up/,
      );
    }
  });
});
