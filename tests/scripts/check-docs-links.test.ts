import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrokenLinks } from '../../scripts/check-docs-links.mjs';

describe('check-docs-links', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'docs-links-'));
    mkdirSync(join(dir, 'documents'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'assets', 'style.css'), 'body{}');
    writeFileSync(join(dir, 'index.html'), [
      '<a href="documents/Guide.html">ok</a>',
      '<a href="documents/Guide.html#section">ok anchor</a>',
      '<a href="#top">anchor only</a>',
      '<a href="https://intervals.icu/">external</a>',
      '<a href="mailto:x@y.z">mail</a>',
      '<link rel="stylesheet" href="assets/style.css">',
      '<a href="documents/Missing.html">dead</a>',
      '<img src="media/nope.png">',
    ].join('\n'));
    writeFileSync(join(dir, 'documents', 'Guide.html'), '<a href="../index.html">back</a><a href="../classes/Nope.html">dead2</a>');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reports only dead internal links, with the file that contains them', () => {
    const broken = findBrokenLinks(dir).sort((a, b) => a.href.localeCompare(b.href));
    expect(broken).toEqual([
      { file: 'documents/Guide.html', href: '../classes/Nope.html' },
      { file: 'index.html', href: 'documents/Missing.html' },
      { file: 'index.html', href: 'media/nope.png' },
    ]);
  });

  it('returns an empty list for a directory whose links all resolve', () => {
    rmSync(join(dir, 'index.html'));
    writeFileSync(join(dir, 'index.html'), '<a href="documents/Guide.html">ok</a>');
    writeFileSync(join(dir, 'documents', 'Guide.html'), '<a href="../index.html">back</a>');
    expect(findBrokenLinks(dir)).toEqual([]);
  });
});
