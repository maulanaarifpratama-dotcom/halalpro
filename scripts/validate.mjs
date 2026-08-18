/**
 * Structural checks the HTML validator does not cover, run against dist/ so
 * what ships is what gets checked.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const fails = [];
let page = 'index.html';
const note = (name, detail) => fails.push(`[${page}] ${name}: ${JSON.stringify(detail)}`);

// Every HTML page the build emits: the homepage plus one per post directory.
const pages = [
  'index.html',
  ...readdirSync(DIST)
    .filter((d) => statSync(join(DIST, d)).isDirectory() && d !== 'build' && d !== 'assets')
    .map((d) => join(d, 'index.html'))
    .filter((f) => existsSync(join(DIST, f))),
];

/** Local URLs a page points at, minus fragments and query strings. */
function localUrls(doc) {
  const urls = new Set();
  const add = (u) => {
    if (!u.startsWith('/')) return;
    const clean = u.split('#')[0].split('?')[0];
    if (clean && clean !== '/') urls.add(clean);
  };
  for (const m of doc.matchAll(/(?:src|href)="([^"]+)"/g)) add(m[1]);
  for (const m of doc.matchAll(/srcset="([^"]+)"/g))
    for (const part of m[1].split(',')) add(part.trim().split(/\s+/)[0]);
  return urls;
}

/** A directory URL like /slug/ is served by its index.html. */
const resolves = (u) =>
  existsSync(join(DIST, u)) || existsSync(join(DIST, u, 'index.html'));

let totalUrls = 0;
let totalImgs = 0;

for (const file of pages) {
  page = file;
  const doc = readFileSync(join(DIST, file), 'utf8');

  const urls = localUrls(doc);
  totalUrls += urls.size;
  const gone = [...urls].filter((u) => !resolves(u));
  if (gone.length) note('missing files', gone);

  const ids = [...doc.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = [...new Set(ids.filter((i) => ids.filter((j) => j === i).length > 1))];
  if (dupes.length) note('duplicate ids', dupes);

  // Same-page anchors must land on something that exists on this page.
  const anchors = [...new Set([...doc.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
  const dead = anchors.filter((a) => !ids.includes(a));
  if (dead.length) note('dead anchors', dead);

  const levels = [...doc.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) note('h1 count', h1s);
  const skips = levels
    .slice(0, -1)
    .map((l, i) => [l, levels[i + 1]])
    .filter(([a, b]) => b - a > 1);
  if (skips.length) note('heading level skips', skips);

  const imgs = [...doc.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  totalImgs += imgs.length;
  const noAlt = imgs.filter((i) => !i.includes('alt='));
  const noDim = imgs.filter((i) => !i.includes('width=') || !i.includes('height='));
  if (noAlt.length) note('img without alt', noAlt.length);
  if (noDim.length) note('img without dimensions', noDim.length);

  if (/<[^>]*style="[^"]*"[^>]*style="/.test(doc)) note('duplicate style attribute', true);

  if (!/<link rel="canonical" href="https:\/\/halalpro\.id\//.test(doc))
    note('canonical', 'missing or pointing at the wrong host');

  for (const m of doc.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      note('JSON-LD', e.message);
    }
  }

  // The no-inline-style exemption holds only while every inline style is a
  // custom property. The moment one carries a real declaration, fail.
  for (const m of doc.matchAll(/style="([^"]*)"/g)) {
    if (!/^\s*(--[\w-]+\s*:[^;]*;?\s*)+$/.test(m[1]))
      note('inline style is not a custom property', m[1]);
  }

  // The build must be content-hashed, or the immutable cache header is a lie.
  if (!/\/build\/[\w.-]+\.[A-Za-z0-9_-]{8}\.js/.test(doc)) note('hashing', 'js is not content-hashed');
  if (!/\/build\/[\w.-]+\.[A-Za-z0-9_-]{8}\.css/.test(doc)) note('hashing', 'css is not content-hashed');
}

page = 'dist';

// The emitted CSS must still find everything it references.
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const cssRef = home.match(/href="(\/build\/[^"]+\.css)"/)?.[1];
if (!cssRef) note('css', 'no hashed stylesheet linked');
else {
  const css = readFileSync(join(DIST, cssRef), 'utf8');
  const cssMissing = [...css.matchAll(/url\(\s*['"]?(\/[^)'"]+)['"]?\s*\)/g)]
    .map((m) => m[1])
    .filter((u) => !existsSync(join(DIST, u)));
  if (cssMissing.length) note('missing css assets', [...new Set(cssMissing)]);
}

// The four post URLs were indexed under WordPress. If a build stops emitting
// one, that is a 404 on a page that already holds rankings — fail loudly.
const expected = JSON.parse(readFileSync('content/posts.json', 'utf8')).map((p) => p.slug);
const missingPosts = expected.filter((s) => !existsSync(join(DIST, s, 'index.html')));
if (missingPosts.length) note('missing post pages', missingPosts);

for (const f of ['robots.txt', 'sitemap.xml', 'feed.xml'])
  if (!existsSync(join(DIST, f))) note('missing', f);

// Everything the sitemap advertises has to exist, or we are handing Google 404s.
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const advertised = [...sitemap.matchAll(/<loc>https:\/\/halalpro\.id\/([^<]*)<\/loc>/g)].map((m) => m[1]);
const notBuilt = advertised.filter((p) => p && !resolves('/' + p));
if (notBuilt.length) note('sitemap advertises URLs the build does not emit', notBuilt);

console.log(
  `dist checks — ${pages.length} pages · ${totalUrls} urls · ${totalImgs} images · ${advertised.length} sitemap entries`
);

if (fails.length) {
  console.error('\nFAIL');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nALL CHECKS PASS');
