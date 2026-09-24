#!/usr/bin/env node
/**
 * Internal link checker for the generated docs site.
 *
 * Walks every .html file under the given directory, extracts href/src values,
 * and reports those that point at a file which does not exist. Absolute URLs
 * (http, https, mailto, tel, data), protocol-relative URLs and anchor-only
 * links are ignored: external availability must not fail our CI. Root-absolute links and
 * links that resolve outside the directory are reported: the site is deployed under a
 * sub-path and only the directory itself is published.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The lookbehind keeps `data-href`, `data-src` and friends out: only a real `href`/`src`
// attribute (preceded by whitespace or the start of the tag) counts as a link.
const ATTR_RE = /(?<![-\w])(?:href|src)=["']([^"']+)["']/g;
const SKIP_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

/** `decodeURIComponent`, tolerating a literal `%` that is not a valid escape sequence */
function decodePath(target) {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

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
      const entry = { file: relative(root, file).split(sep).join('/'), href: raw };
      // The site is served under a sub-path (https://<user>.github.io/<repo>/), so a
      // root-absolute link asks the domain root for a file that is never there.
      if (target.startsWith('/')) {
        broken.push(entry);
        continue;
      }
      const abs = resolve(dirname(file), decodePath(target));
      // Only the docs directory is published: a link that climbs out of it can resolve
      // to a repository file locally and still 404 on the deployed site.
      if (abs !== root && !abs.startsWith(root + sep)) {
        broken.push(entry);
        continue;
      }
      if (!existsSync(abs)) broken.push(entry);
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
