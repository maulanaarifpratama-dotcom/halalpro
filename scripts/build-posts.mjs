/**
 * Renders the four blog posts into dist/<slug>/index.html.
 *
 * These URLs already exist on halalpro.id and are indexed. When the domain
 * moves to this deployment WordPress goes away, so the paths have to be
 * reproduced exactly — anything else costs the rankings those pages hold.
 *
 * Runs after `vite build` so it can read the hashed asset URLs out of the
 * generated index.html instead of guessing them, and lift the real nav and
 * footer out of it so the post chrome can never drift from the homepage.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const BASE = 'https://halalpro.id';
const posts = JSON.parse(readFileSync('content/posts.json', 'utf8'));
const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

const cssHref = shell.match(/href="(\/build\/[^"]+\.css)"/)[1];
const jsSrc = shell.match(/src="(\/build\/[^"]+\.js)"/)[1];

const slice = (start, end) => {
  const a = shell.indexOf(start);
  const b = shell.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('could not slice ' + start);
  return shell.slice(a, b + end.length);
};
const nav = slice('<header class="nav"', '</header>');
const drawer = slice('<nav class="drawer"', '</nav>');
const footer = slice('<footer class="footer">', '</footer>');
const wa = slice('<a class="wa"', '</a>');

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const idDate = (iso) => {
  const [y, m, d] = iso.split('-');
  return d + ' ' + ID_MONTHS[Number(m) - 1] + ' ' + y;
};

// A post lives one level down, so the homepage's own "#about" anchors would
// resolve against /slug/ if copied verbatim.
const rehome = (chunk) => chunk.replace(/href="#([\w-]+)"/g, 'href="/#$1"');

const clamp = (s, n) =>
  s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)).replace(/[,.;]$/, '') + '…';

// WordPress emits XHTML-style void elements. Normalise them so the generated
// pages match the hand-written markup and clear the validator.
const normalise = (h) => h.replace(/<(img|br|hr|source|input)([^>]*?)\s*\/>/g, '<$1$2>');

let written = 0;

for (const post of posts) {
  const desc = clamp(post.excerpt.replace(/\s+/g, ' '), 155);
  const url = BASE + '/' + post.slug + '/';
  const img = BASE + '/assets/blog/' + post.thumb + '.png';
  const others = posts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': url + '#post',
        headline: post.title,
        description: desc,
        image: img,
        datePublished: post.date,
        dateModified: post.modified,
        inLanguage: 'id-ID',
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        author: { '@id': BASE + '/#organization' },
        publisher: { '@id': BASE + '/#organization' },
        articleSection: 'Creatine',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: BASE + '/#blog' },
          { '@type': 'ListItem', position: 3, name: post.title },
        ],
      },
      { '@type': 'Organization', '@id': BASE + '/#organization', name: 'Halal Pro', url: BASE + '/' },
    ],
  };

  const related = others
    .map(
      (o, i) =>
        '        <a class="post" href="/' + o.slug + '/" data-reveal style="--i:' + i + '">\n' +
        '          <div class="post__thumb">\n' +
        '            <picture><source srcset="/assets/blog/' + o.thumb + '.webp" type="image/webp">' +
        '<img src="/assets/blog/' + o.thumb + '.png" alt="" width="760" height="760" loading="lazy"></picture>\n' +
        '            <span class="post__cat">Creatine</span>\n' +
        '          </div>\n' +
        '          <div class="post__body">\n' +
        '            <h3>' + esc(o.title) + '</h3>\n' +
        '            <span class="post__meta">' + idDate(o.date) + '</span>\n' +
        '          </div>\n' +
        '        </a>'
    )
    .join('\n');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="id">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + esc(clamp(post.title, 46)) + ' | Halal Pro</title>',
    '<meta name="description" content="' + esc(desc) + '">',
    '<meta name="theme-color" content="#050806">',
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">',
    '<meta name="author" content="Halal Pro">',
    '<link rel="canonical" href="' + url + '">',
    '',
    '<meta property="og:type" content="article">',
    '<meta property="og:locale" content="id_ID">',
    '<meta property="og:site_name" content="Halal Pro">',
    '<meta property="og:title" content="' + esc(post.title) + '">',
    '<meta property="og:description" content="' + esc(desc) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + img + '">',
    '<meta property="article:published_time" content="' + post.date + '">',
    '<meta property="article:section" content="Creatine">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(post.title) + '">',
    '<meta name="twitter:description" content="' + esc(desc) + '">',
    '<meta name="twitter:image" content="' + img + '">',
    '',
    '<link rel="icon" href="/assets/img/favicon-32.png" sizes="32x32">',
    '<link rel="icon" href="/assets/img/favicon-192.png" sizes="192x192">',
    '<link rel="apple-touch-icon" href="/assets/img/favicon.png">',
    '',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700;800;900&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="' + cssHref + '">',
    '',
    '<script type="application/ld+json">',
    JSON.stringify(ld, null, 2),
    '</script>',
    '<script>',
    "if ('noModule' in HTMLScriptElement.prototype) document.documentElement.classList.add('js');",
    '</script>',
    '</head>',
    '<body>',
    '',
    '<a class="btn skip-link" href="#main">Lewati ke konten</a>',
    '<div class="progress" id="progress" aria-hidden="true"></div>',
    '',
    rehome(nav),
    rehome(drawer),
    '',
    '<main id="main">',
    '<article class="section post-page">',
    '  <div class="field" aria-hidden="true"></div>',
    '  <div class="shell post-page__shell">',
    '',
    '    <nav class="crumbs" aria-label="Breadcrumb">',
    '      <a href="/">Home</a><span aria-hidden="true">/</span>',
    '      <a href="/#blog">Blog</a><span aria-hidden="true">/</span>',
    '      <span aria-current="page">Creatine</span>',
    '    </nav>',
    '',
    '    <header class="post-page__head">',
    '      <span class="eyebrow" data-reveal="fade">Creatine</span>',
    '      <h1 data-reveal>' + esc(post.title) + '</h1>',
    '      <p class="post-page__meta" data-reveal style="--i:1">',
    '        <time datetime="' + post.date + '">' + idDate(post.date) + '</time>',
    '        <span aria-hidden="true">·</span>',
    '        <span>Halal Pro</span>',
    '      </p>',
    '    </header>',
    '',
    '    <figure class="post-page__hero" data-reveal="scale">',
    '      <picture>',
    '        <source srcset="/assets/blog/' + post.thumb + '.webp" type="image/webp">',
    '        <img src="/assets/blog/' + post.thumb + '.png" alt="" width="760" height="760" fetchpriority="high">',
    '      </picture>',
    '    </figure>',
    '',
    '    <div class="prose" data-reveal>',
    normalise(post.html),
    '    </div>',
    '',
    '    <aside class="post-page__cta">',
    '      <h2>Coba Produknya</h2>',
    '      <p>CreaSpark, Whey Radiant, dan NaturSpark tersedia di TikTok Shop, Tokopedia, dan Shopee.</p>',
    '      <a class="btn" href="/#store" data-magnetic>Lihat Produk',
    '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    '      </a>',
    '    </aside>',
    '',
    '    <section class="post-page__more">',
    '      <h2>Artikel Lainnya</h2>',
    '      <div class="posts">',
    related,
    '      </div>',
    '    </section>',
    '',
    '  </div>',
    '</article>',
    '</main>',
    '',
    rehome(footer),
    wa,
    '',
    '<script type="module" src="' + jsSrc + '"></script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');

  mkdirSync(join(DIST, post.slug), { recursive: true });
  writeFileSync(join(DIST, post.slug, 'index.html'), html);
  written++;
}

// RSS, so the homepage's <link rel="alternate"> keeps pointing at something
// real once the WordPress feed disappears.
const items = posts
  .map(
    (p) =>
      '    <item>\n' +
      '      <title>' + esc(p.title) + '</title>\n' +
      '      <link>' + BASE + '/' + p.slug + '/</link>\n' +
      '      <guid isPermaLink="true">' + BASE + '/' + p.slug + '/</guid>\n' +
      '      <pubDate>' + new Date(p.date + 'T00:00:00Z').toUTCString() + '</pubDate>\n' +
      '      <description>' + esc(clamp(p.excerpt.replace(/\s+/g, ' '), 300)) + '</description>\n' +
      '    </item>'
  )
  .join('\n');

const rss = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  '  <channel>',
  '    <title>Blog Halal Pro</title>',
  '    <link>' + BASE + '/</link>',
  '    <description>Tips kebugaran, nutrisi, dan suplemen halal dari Halal Pro.</description>',
  '    <language>id-ID</language>',
  '    <atom:link href="' + BASE + '/feed.xml" rel="self" type="application/rss+xml"/>',
  items,
  '  </channel>',
  '</rss>',
  '',
].join('\n');

writeFileSync(join(DIST, 'feed.xml'), rss);

console.log('build-posts — ' + written + ' post pages + feed.xml');
