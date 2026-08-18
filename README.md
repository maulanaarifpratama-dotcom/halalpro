# Halal Pro — Stay Fit Stay Halal

Rebuild dari [halalpro.id](https://halalpro.id) sebagai situs statis: satu halaman, tanpa
build step, tanpa dependency. Seluruh konten dan tautan dari situs lama dipertahankan;
yang berubah adalah bahasa visual dan lapisan motion.

```bash
python -m http.server 8123
```

Lalu buka <http://localhost:8123>. Cukup HTML/CSS/JS statis, jadi bisa langsung
di-deploy ke GitHub Pages, Vercel, Netlify, atau hosting apa pun.

---

## Struktur

```
index.html          seluruh halaman (nav, hero, stats, about, pillars, 3 produk,
                    testimoni, blog, CTA, contact, store, footer)
css/style.css       design system + seluruh motion language
js/main.js          interaksi: reveal, counter, gauge, product switcher, carousel,
                    lightbox, form, nav
assets/
  img/              logo, favicon, badge "Stay Fit Stay Halal"
  icons/            6 ikon pilar (SVG), mission/vision, logo marketplace
  products/         product shot hasil cutout + folder original/ (aset mentah)
  blog/             thumbnail 4 artikel
  testimonials/     kartu testimoni + cover video
  media/            footage gym: hero-loop.mp4 (bed ambient), reel.mp4 (film
                    vertikal), plus poster JPG untuk keduanya
```

Semua gambar diambil dari halalpro.id dan disimpan lokal — situs ini tidak memuat
aset apa pun dari domain lama. Product shot pada `assets/products/*-cut.png` adalah
hasil background removal dari key visual marketplace; file aslinya tetap ada di
`assets/products/original/`.

## Konten yang dipertahankan

| Bagian | Isi |
|---|---|
| Hero | 3 produk (CreaSpark / Whey Radiant / NaturSpark) + tagline masing-masing |
| Stats | 165K+ Pelanggan · 3+ Product · 100% Kepuasan · 100K+ Pengguna Rutin |
| About | Welcome to Halal Pro, Our Mission, Our Vission |
| Pilar | Halal, Terjangkau, Berkualitas, Inovatif, Komunitas, Peduli |
| Produk | Deskripsi lengkap + 4 manfaat "Before → After" per produk (12 total) |
| Film | Player vertikal "CreaSpark Sebagai Solusi" + 6 beat yang bisa diklik untuk seek |
| Testimoni | Carousel 5 slide, salah satunya video YouTube |
| Blog | 4 artikel, tertaut ke halalpro.id |
| Contact | 0895-3333-36546 · halalpro@bisabaik.or.id · alamat HQ & WH |
| Store | TikTok Shop, Tokopedia, Shopee |
| Footer | Useful Links, Subscribe, Instagram/TikTok/YouTube/LinkedIn |

## Design system

Palet dan tipografi diwarisi dari situs lama, lalu dipindahkan ke ground gelap agar
lime brand punya tempat untuk bekerja.

| Token | Nilai | Asal |
|---|---|---|
| `--lime` | `#94E900` | Elementor global *primary* |
| `--green` | `#0DB800` | Elementor global *secondary* |
| `--deep` | `#008140` | Elementor global *accent* |
| `--ink` | `#050806` | baru — ground gelap |
| `--paper` | `#F3F7EF` | baru — section terang |
| Display & body | Alegreya Sans | font asli halalpro.id |
| Label & angka | Poppins | font sekunder asli |

## Footage

Video di situs ini adalah footage milik Halal Pro sendiri — film "CreaSpark Sebagai
Solusi" yang sudah ada di halalpro.id (aslinya 59 MB, 1440x2560). Tidak ada stock
footage pihak ketiga. Dari satu sumber itu di-encode dua turunan:

- `hero-loop.mp4` (675 KB, 1280x720, 6 detik, tanpa audio) — dua potongan latihan
  gym yang di-crop untuk membuang caption dan logo yang terbakar di frame, dipakai
  sebagai bed ambient di belakang hero dengan grayscale + brightness turun dan
  gradient gelap di atasnya. Poster JPG tetap ada di bawahnya sebagai fallback
  permanen kalau video gagal decode atau autoplay ditolak.
- `reel.mp4` (2 MB, 540x960, 28 detik, dengan audio) — film utuh dalam frame
  ponsel, `preload="none"` sampai visitor benar-benar melihatnya.

Perintah encode-nya ada di riwayat commit; sumbernya tinggal diambil ulang dari
`wp-content/uploads/2024/11/CREASPARK-SEBAGAI-SOLUSI.mp4` bila perlu di-render lagi.

## Motion

Tesis: **lineup melangkah maju.** Satu momen fokal, sisanya motion yang menjelaskan
state atau memberi feedback. Kurva dan durasinya mengikuti prinsip Emil Kowalski:
kurva bawaan CSS terlalu lemah, jadi dipakai varian kuat
(`cubic-bezier(0.23, 1, 0.32, 1)`); tidak pernah `ease-in` pada UI karena menunda
frame pertama — justru frame yang paling diperhatikan; animasi UI di bawah 300 ms;
exit selalu lebih cepat dari entrance.

- **Focal** — hero product switcher. Ganti produk menjalankan exit/enter berpasangan
  pada kemasan (translate + scale + rotateY), me-retint energy bloom di belakangnya,
  dan menukar teks dengan Web Animations API. Auto-rotate tiap 6 detik, berhenti
  begitu pengunjung menyentuh switcher, saat hero keluar layar, atau saat tab tidak aktif.
- **Data** — gauge setengah lingkaran "Before → After" mengisi lewat `stroke-dashoffset`,
  dan counter menghitung naik. Ini informasi, bukan dekorasi, jadi keduanya tetap
  berjalan (lebih pendek) pada `prefers-reduced-motion`.
- **Kontinuitas** — pill navigasi meluncur antar item sebagai shared element, mengikuti
  section yang sedang tampil lewat IntersectionObserver.
- **Feedback** — tombol magnetic, press-scale, tilt 3D pada product shot, spotlight
  pada kartu, salin nomor/email satu klik.
- **Sport** — footage gym jadi bed di belakang hero, dan burst "speed streak"
  menyapu layar tiap kali produk diganti. Film vertikal punya beat list yang
  menyala mengikuti playback dan bisa diklik untuk seek.
- **Budget** — blur dan gradient besar hanya di hero dan CTA. Selebihnya transform dan
  opacity. Loop ambient berhenti saat offscreen. Video YouTube pakai facade: tidak ada
  request pihak ketiga sebelum tombol play ditekan.

`prefers-reduced-motion` menghapus perjalanan spasial dan seluruh loop ambient, tetapi
menyisakan transisi opacity, warna, dan state agar feedback tetap terbaca. Karena loop
ambient berjalan lebih dari lima detik di samping konten yang dibaca, ada juga tombol
**Jeda animasi** di kiri bawah — visitor bisa menghentikannya tanpa mengubah setelan
sistem, dan pilihannya diingat selama sesi. `Save-Data` juga dihormati: video tidak
diambil sama sekali, hanya poster.

## Aksesibilitas

Product switcher tersimpan di URL (`?produk=whey`), jadi tautan yang dibagikan membuka
produk yang sama. Reveal punya failsafe: kalau `IntersectionObserver` tidak pernah jalan
— tab di-throttle, prerender, atau tidak pernah dilukis — semuanya ditampilkan setelah
1,2 detik, karena halaman kosong lebih buruk daripada kehilangan koreografi.

Konten tetap terlihat tanpa JavaScript — kelas `js` ditambahkan lebih dulu, dan hanya
di bawah kelas itu `[data-reveal]` disembunyikan. Switcher produk memakai
`role="tablist"` dengan navigasi tombol panah, drawer punya `aria-expanded`,
lightbox `aria-modal` dengan Escape dan focus return, semua ikon dekoratif
`aria-hidden`, dan ada skip link ke konten utama.

## SEO

Semua URL absolut di `robots.txt`, `sitemap.xml`, `canonical`, `og:*`, dan JSON-LD
mengasumsikan situs ini dideploy di **https://halalpro.id/**. Kalau dideploy ke domain
lain (GitHub Pages, staging), cari-ganti host itu dulu — kalau tidak, canonical akan
menunjuk ke situs lama dan halaman baru tidak akan terindeks.

**Head**

| Item | Nilai |
|---|---|
| `<title>` | 59 karakter, keyword di depan |
| `meta description` | 153 karakter |
| `meta robots` | `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1` |
| Open Graph | judul, deskripsi, URL, gambar **absolut** + width/height/type/alt |
| Twitter | `summary_large_image` lengkap dengan title/description/image/alt |
| Lainnya | canonical, RSS alternate ke blog lama, `lang="id"`, author |

**Structured data** — satu `@graph` berisi 7 entitas yang saling terhubung lewat `@id`:
`Organization` (dua alamat + contactPoint + 6 `sameAs`), `WebSite`, `WebPage`, tiga
`Product` (CreaSpark, Whey Radiant, NaturSpark), dan `VideoObject` untuk film CreaSpark.
Tidak ada `offers` atau `aggregateRating` karena harga dan rating tidak tersedia di situs
lama — mengarangnya akan kena manual action, bukan rich result.

**Heading** — tepat satu `<h1>`, hierarki h1→h2→h3→h4 tanpa lompatan. Nama produk di
hero sengaja **bukan** `<h1>`: ia berganti mengikuti switcher, dan heading yang berubah
di bawah pengunjung tidak mendeskripsikan apa pun. `<h1>` dipegang baris yang stabil.

**Gambar** — 7,5 MB turun jadi **464 KB** yang benar-benar dikirim. Setiap gambar
di-resize ke ukuran tampil (2x untuk retina) lalu diberi turunan WebP, disajikan lewat
`<picture>` dengan PNG sebagai fallback. `picture { display: contents }` memastikan
elemen pembungkus tidak menjadi box, jadi semua aturan layout yang ditulis untuk `<img>`
tetap berlaku.

**Lain-lain** — `robots.txt` + `sitemap.xml` (dengan ekstensi image dan video),
preload untuk gambar LCP dan poster hero, `preconnect` ke Google Fonts, `loading="lazy"`
di bawah lipatan, `fetchpriority="high"` di atasnya, dan `width`/`height` di semua
gambar agar tidak ada layout shift.

## Catatan

Situs statis tidak punya backend, jadi form kontak dan subscribe menyusun draft email
ke `halalpro@bisabaik.or.id` lewat `mailto:`. Ganti handler di
[js/main.js](js/main.js) bila nanti dihubungkan ke Formspree, Google Form, atau endpoint sendiri.
