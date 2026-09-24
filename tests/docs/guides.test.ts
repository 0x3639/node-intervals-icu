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

function exampleFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(ROOT, d), { withFileTypes: true })) {
      if (e.isDirectory()) walk(`${d}/${e.name}`);
      else if (e.name.endsWith('.ts')) out.push(`${d}/${e.name}`);
    }
  };
  walk('examples');
  return out;
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
    const MUTATORS = /\.(sendMessage|createEvent|createReminder|createWorkout|uploadActivity|updateWellness|reorder|createEventsBulk|createWellness)\(/;
    // Block comments are stripped first: a mutating call shown inside a `/* ... */` block
    // (examples/basic-usage.ts section 8) is prose, not a write, and must not be flagged.
    const gaps = exampleFiles().filter((f) => {
      const text = read(f);
      return MUTATORS.test(text.replace(/\/\*[\s\S]*?\*\//g, '')) && !text.includes('maxRetries: 0');
    });
    expect(gaps).toEqual([]);
  });
});
