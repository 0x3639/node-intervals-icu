import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { findBrokenLinks } from '../../scripts/check-docs-links.mjs';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

/** A fresh fixture directory per test, so no test can depend on another's files */
function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'docs-links-'));
  dirs.push(dir);
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    writeFileSync(join(dir, path), contents);
  }
  return dir;
}

describe('check-docs-links', () => {
  it('reports only dead internal links, with the file that contains them', () => {
    const dir = fixture({
      'assets/style.css': 'body{}',
      'index.html': [
        '<a href="documents/Guide.html">ok</a>',
        '<a href="documents/Guide.html#section">ok anchor</a>',
        '<a href="#top">anchor only</a>',
        '<a href="https://intervals.icu/">external</a>',
        '<a href="mailto:x@y.z">mail</a>',
        '<link rel="stylesheet" href="assets/style.css">',
        '<a href="documents/Missing.html">dead</a>',
        '<img src="media/nope.png">',
      ].join('\n'),
      'documents/Guide.html': '<a href="../index.html">back</a><a href="../classes/Nope.html">dead2</a>',
    });
    const broken = findBrokenLinks(dir).sort((a, b) => a.href.localeCompare(b.href));
    expect(broken).toEqual([
      { file: 'documents/Guide.html', href: '../classes/Nope.html' },
      { file: 'index.html', href: 'documents/Missing.html' },
      { file: 'index.html', href: 'media/nope.png' },
    ]);
  });

  it('returns an empty list for a directory whose links all resolve', () => {
    const dir = fixture({
      'index.html': '<a href="documents/Guide.html">ok</a>',
      'documents/Guide.html': '<a href="../index.html">back</a>',
    });
    expect(findBrokenLinks(dir)).toEqual([]);
  });

  it('reports root-absolute links even when the file exists: the site is served under a sub-path', () => {
    const dir = fixture({
      'assets/main.js': '//',
      'documents/Guide.html': [
        '<script src="/assets/main.js"></script>',
        '<a href="/assets/missing.js">dead</a>',
        '<a href="../assets/main.js">ok</a>',
      ].join('\n'),
    });
    expect(findBrokenLinks(dir).sort((a, b) => a.href.localeCompare(b.href))).toEqual([
      { file: 'documents/Guide.html', href: '/assets/main.js' },
      { file: 'documents/Guide.html', href: '/assets/missing.js' },
    ]);
  });

  it('reports links that resolve outside the docs directory even when the target exists', () => {
    const dir = fixture({
      'outside.html': 'exists on disk, never published',
      'site/index.html': '<a href="../outside.html">escapes</a><a href="documents/Guide.html">ok</a>',
      'site/documents/Guide.html': 'ok',
    });
    expect(findBrokenLinks(join(dir, 'site'))).toEqual([{ file: 'index.html', href: '../outside.html' }]);
  });

  it('decodes percent-encoded relative targets and tolerates a literal percent sign', () => {
    const dir = fixture({
      'documents/A B.html': 'ok',
      'documents/100%.html': 'ok',
      'index.html': [
        '<a href="documents/A%20B.html">encoded space</a>',
        '<a href="documents/100%.html">literal percent, not an escape</a>',
        '<a href="documents/C%20D.html">dead</a>',
      ].join('\n'),
    });
    expect(findBrokenLinks(dir)).toEqual([{ file: 'index.html', href: 'documents/C%20D.html' }]);
  });

  it('ignores attributes that merely end in href or src, such as data-href', () => {
    const dir = fixture({
      'index.html': [
        '<div data-href="documents/Nope.html">not a link</div>',
        '<div data-src="media/nope.png">not a link</div>',
      ].join('\n'),
    });
    expect(findBrokenLinks(dir)).toEqual([]);
  });
});
