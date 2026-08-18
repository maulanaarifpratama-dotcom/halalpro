/**
 * Structural checks the HTML validator does not cover, run against dist/ so
 * what ships is what gets checked.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const fails = [];
const note = (name, detail) => fails.push(`${name}: ${JSON.stringify(detail)}`);

// Every local URL in the shipped page resolves to a file in dist.
const refs = new Set();
for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) refs.add(m[1].split('?')[0]);
for (const m of html.matchAll(/srcset="([^"]+)"/g))
  for (const part of m[1].split(',')) {
    const u = part.trim().split(/\s+/)[0];
    if (u.startsWith('/')) refs.add(u.split('?')[0]);
  }
const missing = [...refs].filter((r) => !existsSync(join(DIST, r)));
if (missing.length) note('missing files in dist', missing);

// The CSS Vite emitted must still find everything it references.
const cssRef = html.match(/href="(\/build\/[^"]+\.css)"/)?.[1];
if (!cssRef) note('css', 'no hashed stylesheet linked');
else {
  const css = readFileSync(join(DIST, cssRef), 'utf8');
  const cssMissing = [...css.matchAll(/url\(\s*['"]?(\/[^)'"]+)['"]?\s*\)/g)]
    .map((m) => m[1])
    .filter((u) => !existsSync(join(DIST, u)));
  if (cssMissing.length) note('missing css assets', [...new Set(cssMissing)]);
}

// The build must actually be hashed, or the immutable cache header is a lie.
if (!/\/build\/[\w.-]+\.[A-Za-z0-9_-]{8}\.js/.test(html)) note('hashing', 'js filename is not content-hashed');
if (!/\/build\/[\w.-]+\.[A-Za-z0-9_-]{8}\.css/.test(html)) note('hashing', 'css filename is not content-hashed');

// The no-inline-style exemption holds only while every inline style is a
// custom property. The moment one carries a real declaration, fail.
for (const m of html.matchAll(/style="([^"]*)"/g)) {
  if (!/^\s*(--[\w-]+\s*:[^;]*;?\s*)+$/.test(m[1])) note('inline style is not a custom property', m[1]);
}

// Structure.
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const dupes = [...new Set(ids.filter((i) => ids.filter((j) => j === i).length > 1))];
if (dupes.length) note('duplicate ids', dupes);

const anchors = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
const dead = anchors.filter((a) => !ids.includes(a));
if (dead.length) note('dead anchors', dead);

const levels = [...html.matchAll(/<(h[1-6])\b/g)].map((m) => Number(m[1][1]));
if (levels.filter((l) => l === 1).length !== 1) note('h1 count', levels.filter((l) => l === 1).length);
const skips = levels.slice(0, -1).map((l, i) => [l, levels[i + 1]]).filter(([a, b]) => b - a > 1);
if (skips.length) note('heading level skips', skips);

const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
if (imgs.some((i) => !i.includes('alt='))) note('img without alt', imgs.filter((i) => !i.includes('alt=')).length);
if (imgs.some((i) => !i.includes('width=') || !i.includes('height=')))
  note('img without dimensions', imgs.filter((i) => !i.includes('width=') || !i.includes('height=')).length);

if (/<[^>]*style="[^"]*"[^>]*style="/.test(html)) note('duplicate style attribute', true);

// Crawl files shipped.
for (const f of ['robots.txt', 'sitemap.xml']) if (!existsSync(join(DIST, f))) note('missing', f);

// JSON-LD parses.
for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  try { JSON.parse(m[1]); } catch (e) { note('JSON-LD', e.message); }
}

console.log(
  `dist checks — urls ${refs.size} · ids ${ids.length} · headings ${levels.length} · images ${imgs.length}`
);
if (fails.length) {
  console.error('\nFAIL');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nALL CHECKS PASS');
