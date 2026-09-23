#!/usr/bin/env node
/**
 * Writes docs-dist/index.html, which redirects to ./latest/. The site is served
 * under /latest/ so versioned copies (/v3.0.0/ ...) can be added later without
 * breaking links that people have already shared.
 */
import { writeFileSync, existsSync } from 'node:fs';

const out = process.argv[2] ?? 'docs-dist';
if (!existsSync(`${out}/latest/index.html`)) {
  console.error(`${out}/latest/index.html not found; run typedoc first`);
  process.exit(1);
}
writeFileSync(`${out}/index.html`, `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=./latest/">
<link rel="canonical" href="./latest/">
<title>@0x3639/intervals-icu documentation</title></head>
<body><p>Redirecting to <a href="./latest/">the latest documentation</a>.</p></body></html>
`);
console.log(`wrote ${out}/index.html -> ./latest/`);
