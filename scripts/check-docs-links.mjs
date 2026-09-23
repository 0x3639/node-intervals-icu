#!/usr/bin/env node
/**
 * Internal link checker for the generated docs site.
 *
 * Walks every .html file under the given directory, extracts href/src values,
 * and reports those that point at a file which does not exist. Absolute URLs
 * (http, https, mailto, tel, data), protocol-relative URLs and anchor-only
 * links are ignored: external availability must not fail our CI.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ATTR_RE = /\b(?:href|src)=["']([^"']+)["']/g;
const SKIP_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.html')) out.push(full);
  }
  return out;
}

/** @returns {{ file: string; href: string }[]} dead internal links, paths relative to `dir` */
export function findBrokenLinks(dir) {
  const root = resolve(dir);
  const broken = [];
  for (const file of walk(root)) {
    const html = readFileSync(file, 'utf8');
    for (const [, raw] of html.matchAll(ATTR_RE)) {
      if (SKIP_RE.test(raw)) continue;
      const target = raw.split('#')[0].split('?')[0];
      if (target === '') continue;
      const abs = target.startsWith('/') ? join(root, target) : resolve(dirname(file), decodeURIComponent(target));
      if (!existsSync(abs)) broken.push({ file: relative(root, file).split(sep).join('/'), href: raw });
    }
  }
  return broken;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/check-docs-links.mjs <docs-dir>');
    process.exit(2);
  }
  const broken = findBrokenLinks(dir);
  if (broken.length) {
    console.error(`${broken.length} dead internal link(s):`);
    for (const b of broken) console.error(`  ${b.file} -> ${b.href}`);
    process.exit(1);
  }
  console.log(`No dead internal links under ${dir}`);
}
