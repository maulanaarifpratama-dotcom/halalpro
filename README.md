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
```

Semua gambar diambil dari halalpro.id dan disimpan lokal — situs ini tidak memuat
aset apa pun dari domain lama. Product shot pada `assets/products/*-cut.png` adalah
hasil background removal dari key visual marketplace; file aslinya tetap ada di
`assets/products/original/`.

## Konten yang dipertahankan

| Bagian | Isi |
|---|---|
| Hero | 3 produk (CreaSpark / Whey Radiant / NaturSpark) + tagline masing-masing |
| Stats | 165M+ Pelanggan · 3+ Product · 100% Kepuasan · 100M+ Pengguna Rutin |
| About | Welcome to Halal Pro, Our Mission, Our Vission |
| Pilar | Halal, Terjangkau, Berkualitas, Inovatif, Komunitas, Peduli |
| Produk | Deskripsi lengkap + 4 manfaat "Before → After" per produk (12 total) |
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

## Motion

Tesis: **lineup melangkah maju.** Satu momen fokal, sisanya motion yang menjelaskan
state atau memberi feedback.

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
- **Budget** — blur dan gradient besar hanya di hero dan CTA. Selebihnya transform dan
  opacity. Loop ambient berhenti saat offscreen. Video YouTube pakai facade: tidak ada
  request pihak ketiga sebelum tombol play ditekan.

`prefers-reduced-motion` menghapus perjalanan spasial dan seluruh loop ambient, tetapi
menyisakan transisi opacity, warna, dan state agar feedback tetap terbaca.

## Aksesibilitas

Konten tetap terlihat tanpa JavaScript — kelas `js` ditambahkan lebih dulu, dan hanya
di bawah kelas itu `[data-reveal]` disembunyikan. Switcher produk memakai
`role="tablist"` dengan navigasi tombol panah, drawer punya `aria-expanded`,
lightbox `aria-modal` dengan Escape dan focus return, semua ikon dekoratif
`aria-hidden`, dan ada skip link ke konten utama.

## Catatan

Situs statis tidak punya backend, jadi form kontak dan subscribe menyusun draft email
ke `halalpro@bisabaik.or.id` lewat `mailto:`. Ganti handler di
[js/main.js](js/main.js) bila nanti dihubungkan ke Formspree, Google Form, atau endpoint sendiri.
