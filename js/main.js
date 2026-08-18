/* ==========================================================================
   HALAL PRO — interaction + motion
   No dependencies. Content is visible without JS; every effect is additive.
   ========================================================================== */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  motionQuery.addEventListener('change', e => { reduced = e.matches; });

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------------------
     1. Reveal on entry — one observer, staggered by --i on the element
     ---------------------------------------------------------------------- */
  const revealables = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.dataset.shown = 'true';
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealables.forEach(el => io.observe(el));
  } else {
    revealables.forEach(el => { el.dataset.shown = 'true'; });
  }

  /* ------------------------------------------------------------------------
     2. Count-up — used by the stat block and every Before→After gauge
     ---------------------------------------------------------------------- */
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function countUp(el, to, duration = 1600) {
    if (reduced) { el.textContent = String(to); return; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = String(Math.round(easeOutExpo(t) * to));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        countUp(e.target, Number(e.target.dataset.count));
        cio.unobserve(e.target);
      }
    }, { threshold: 0.6 });
    counters.forEach(el => cio.observe(el));
  } else {
    counters.forEach(el => { el.textContent = el.dataset.count; });
  }

  /* ------------------------------------------------------------------------
     3. Gauges — the arc fill IS the data, so it runs even under reduced motion
     ---------------------------------------------------------------------- */
  const gauges = $$('[data-gauge]');
  gauges.forEach(g => {
    const path = $('.gauge__fill', g);
    if (!path) return;
    const len = path.getTotalLength();
    const pct = Number(g.dataset.gauge) / 100;
    g.style.setProperty('--len', len);
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
    g._target = len * (1 - pct);
  });

  if ('IntersectionObserver' in window) {
    const gio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const path = $('.gauge__fill', e.target);
        if (path) path.style.strokeDashoffset = e.target._target;
        gio.unobserve(e.target);
      }
    }, { threshold: 0.5 });
    gauges.forEach(g => gio.observe(g));
  } else {
    gauges.forEach(g => { const p = $('.gauge__fill', g); if (p) p.style.strokeDashoffset = g._target; });
  }

  /* ------------------------------------------------------------------------
     4. Scroll progress + sticky nav state + floating WhatsApp
     ---------------------------------------------------------------------- */
  const progress = $('#progress');
  const nav = $('#nav');
  const wa = $('#wa');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (nav) nav.dataset.stuck = y > 24 ? 'true' : 'false';
    if (wa) wa.dataset.on = y > window.innerHeight * 0.6 ? 'true' : 'false';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------------
     5. Nav — shared-element pill that slides to the active section
     ---------------------------------------------------------------------- */
  const menu = $('#menu');
  const pill = $('#navPill');
  const navLinks = $$('.nav__link');

  function movePill(target) {
    if (!pill || !menu || !target) return;
    const m = menu.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    pill.style.setProperty('--x', `${r.left - m.left}px`);
    pill.style.setProperty('--sx', r.width);
    pill.dataset.on = 'true';
  }

  function setActive(id) {
    let match = null;
    navLinks.forEach(a => {
      const on = a.dataset.section === id;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) match = a;
    });
    if (match) movePill(match);
  }

  // Hover previews the pill; leaving snaps it back to the active section
  navLinks.forEach(a => {
    a.addEventListener('pointerenter', () => movePill(a));
  });
  menu?.addEventListener('pointerleave', () => {
    const cur = navLinks.find(a => a.getAttribute('aria-current') === 'true');
    if (cur) movePill(cur); else if (pill) pill.dataset.on = 'false';
  });

  // Which section owns the viewport right now
  const sectionIds = ['top', 'about', 'product', 'store', 'blog', 'contact'];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const sio = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.01, 0.25] });
    sections.forEach(s => sio.observe(s));
  }
  window.addEventListener('resize', () => {
    const cur = navLinks.find(a => a.getAttribute('aria-current') === 'true');
    if (cur) movePill(cur);
  });
  setActive('top');

  /* ------------------------------------------------------------------------
     6. Mobile drawer
     ---------------------------------------------------------------------- */
  const burger = $('#burger');
  const drawer = $('#drawer');
  function closeDrawer() {
    burger?.setAttribute('aria-expanded', 'false');
    if (drawer) drawer.dataset.open = 'false';
  }
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    if (drawer) drawer.dataset.open = String(!open);
  });
  $$('#drawer a').forEach(a => a.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  /* ------------------------------------------------------------------------
     7. Hero product switcher — the focal moment
        Switching runs a paired exit/enter on the tubs and re-tints the bloom,
        so the lineup reads as one object stepping forward rather than a fade.
     ---------------------------------------------------------------------- */
  const PRODUCTS = {
    creaspark: {
      kicker: 'Creatine',
      name: 'CreaSpark',
      desc: 'Meningkatkan kekuatan, daya tahan, dan performa otot. Dengan tambahan Glutamin, membantu penyerapan nutrisi tubuh dan meningkatkan imun',
      href: '#creaspark',
      bloom: 'rgba(148,233,0,.30)'
    },
    whey: {
      kicker: 'Whey Protein',
      name: 'Whey Radiant',
      desc: 'Bubuk protein whey Halal premium yang dirancang untuk menutrisi otot dan mendukung perjalanan kebugaran Anda',
      href: '#whey-radiant',
      bloom: 'rgba(13,184,0,.30)'
    },
    naturspark: {
      kicker: 'Testo Booster',
      name: 'NaturSpark',
      desc: 'Naturspark adalah suplemen herbal pria yang diformulasikan untuk membantu mendukung kesehatan testosteron alami. Dengan energi dan vitalitas yang lebih stabil, Naturspark membantu performa fisik dan proses pembentukan otot menjadi lebih optimal.',
      href: '#naturspark',
      bloom: 'rgba(0,129,64,.42)'
    }
  };

  const tubs = $$('.hero__tub');
  const switchBtns = $$('.switcher__btn');
  const bloom = $('#bloom');
  const heroKicker = $('#heroKicker');
  const heroName = $('#heroName');
  const heroDesc = $('#heroDesc');
  const heroRead = $('#heroRead');
  let currentKey = 'creaspark';
  let autoRotate = null;

  function swapText(el, text) {
    if (!el) return;
    if (reduced) { el.textContent = text; return; }
    el.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-8px)' }],
      { duration: 140, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }
    ).onfinish = () => {
      el.textContent = text;
      el.animate(
        [{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }
      );
    };
  }

  function selectProduct(key, userInitiated = false) {
    if (!PRODUCTS[key] || key === currentKey) return;
    const p = PRODUCTS[key];

    tubs.forEach(t => {
      const isNew = t.dataset.tub === key;
      const wasOld = t.dataset.tub === currentKey;
      if (wasOld) {
        t.dataset.active = 'false';
        t.dataset.leaving = 'true';
        setTimeout(() => { t.dataset.leaving = 'false'; }, 480);
      }
      if (isNew) {
        t.dataset.leaving = 'false';
        // one frame so the enter transform is applied from its rest state
        requestAnimationFrame(() => { t.dataset.active = 'true'; });
      }
    });

    switchBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tub === key)));
    if (bloom) { bloom.style.setProperty('--bloom', p.bloom); bloom.style.opacity = '1'; }
    swapText(heroKicker, p.kicker);
    swapText(heroName, p.name);
    swapText(heroDesc, p.desc);
    if (heroRead) heroRead.setAttribute('href', p.href);

    currentKey = key;
    if (userInitiated) stopRotate();
  }

  switchBtns.forEach(b => {
    b.addEventListener('click', () => selectProduct(b.dataset.tub, true));
  });

  // Arrow-key support on the tablist
  $('.switcher')?.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = switchBtns.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + switchBtns.length) % switchBtns.length;
    switchBtns[next].focus();
    selectProduct(switchBtns[next].dataset.tub, true);
  });

  function startRotate() {
    if (reduced || autoRotate) return;
    const keys = Object.keys(PRODUCTS);
    autoRotate = setInterval(() => {
      if (document.hidden) return;
      const i = keys.indexOf(currentKey);
      selectProduct(keys[(i + 1) % keys.length]);
    }, 6000);
  }
  function stopRotate() { clearInterval(autoRotate); autoRotate = null; }

  // Only rotate while the hero is actually on screen
  const hero = $('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? startRotate() : stopRotate();
    }, { threshold: 0.35 }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopRotate(); });

  // Initial bloom tint
  if (bloom) {
    bloom.style.setProperty('--bloom', PRODUCTS.creaspark.bloom);
    requestAnimationFrame(() => { bloom.style.opacity = '1'; });
  }

  /* ------------------------------------------------------------------------
     8. Magnetic buttons + spotlight cards (fine pointers only)
     ---------------------------------------------------------------------- */
  if (finePointer.matches && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      let raf = null;
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        if (raf) return;
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${x * 0.16}px, ${y * 0.22}px)`;
          raf = null;
        });
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('[data-spot]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });

    // Product shots tilt toward the cursor — depth, not decoration
    $$('[data-tilt]').forEach(el => {
      const wrap = el.parentElement;
      let raf = null;
      wrap.addEventListener('pointermove', e => {
        const r = wrap.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(1000px) rotateY(${px * 11}deg) rotateX(${-py * 9}deg) translateZ(0)`;
          el.style.transition = 'transform 120ms linear';
          raf = null;
        });
      });
      wrap.addEventListener('pointerleave', () => {
        el.style.transition = 'transform 700ms cubic-bezier(.16,1,.3,1)';
        el.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------------
     9. Testimonial carousel — arrows, dots, drag, autoplay
     ---------------------------------------------------------------------- */
  const viewport = $('#viewport');
  const track = $('#track');

  if (viewport && track) {
    const slides = $$('.slide', track);
    const dotsWrap = $('#dots');
    const prevBtn = $('#prev');
    const nextBtn = $('#next');
    let index = 0;
    let auto = null;

    const step = () => {
      const a = slides[0]?.getBoundingClientRect().width || 0;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return a + gap;
    };
    const perView = () => Math.max(1, Math.round(viewport.clientWidth / (step() || 1)));
    const maxIndex = () => Math.max(0, slides.length - perView());

    function render() {
      index = Math.min(Math.max(0, index), maxIndex());
      track.style.transform = `translate3d(${-index * step()}px,0,0)`;
      $$('.carousel__dot', dotsWrap).forEach((d, i) =>
        d.setAttribute('aria-current', String(i === index))
      );
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index >= maxIndex();
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (let i = 0; i <= maxIndex(); i++) {
        const b = document.createElement('button');
        b.className = 'carousel__dot';
        b.type = 'button';
        b.setAttribute('aria-label', `Ke slide ${i + 1}`);
        b.addEventListener('click', () => { index = i; render(); restart(); });
        dotsWrap.appendChild(b);
      }
    }

    const go = (d) => { index += d; render(); restart(); };
    prevBtn?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));

    function start() {
      if (reduced || auto) return;
      auto = setInterval(() => {
        if (document.hidden) return;
        index = index >= maxIndex() ? 0 : index + 1;
        render();
      }, 5000);
    }
    function stop() { clearInterval(auto); auto = null; }
    function restart() { stop(); start(); }

    viewport.addEventListener('pointerenter', stop);
    viewport.addEventListener('pointerleave', start);

    // Drag / swipe
    let dragging = false, startX = 0, startOffset = 0, moved = 0;
    viewport.addEventListener('pointerdown', e => {
      dragging = true; moved = 0;
      startX = e.clientX;
      startOffset = -index * step();
      track.style.transition = 'none';
      viewport.setPointerCapture(e.pointerId);
      stop();
    });
    viewport.addEventListener('pointermove', e => {
      if (!dragging) return;
      moved = e.clientX - startX;
      track.style.transform = `translate3d(${startOffset + moved}px,0,0)`;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.style.transition = '';
      if (Math.abs(moved) > step() * 0.22) index += moved < 0 ? 1 : -1;
      render();
      start();
    };
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // Suppress the click that ends a drag so slides don't open a video
    viewport.addEventListener('click', e => {
      if (Math.abs(moved) > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    window.addEventListener('resize', () => { buildDots(); render(); });
    buildDots();
    render();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(e => (e[0].isIntersecting ? start() : stop()), { threshold: 0.25 })
        .observe(viewport);
    }
  }

  /* ------------------------------------------------------------------------
     10. Video lightbox (YouTube facade — nothing third-party loads until asked)
     ---------------------------------------------------------------------- */
  const lightbox = $('#lightbox');
  const lbFrame = $('#lbFrame');
  let lastFocus = null;

  function openVideo(id) {
    if (!lightbox || !lbFrame || !id) return;
    lastFocus = document.activeElement;
    lbFrame.innerHTML =
      `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" title="Video Halal Pro" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    lightbox.dataset.open = 'true';
    document.body.style.overflow = 'hidden';
    $('#lbClose')?.focus();
  }
  function closeVideo() {
    if (!lightbox || lightbox.dataset.open !== 'true') return;
    lightbox.dataset.open = 'false';
    document.body.style.overflow = '';
    setTimeout(() => { if (lbFrame) lbFrame.innerHTML = ''; }, 420);
    lastFocus?.focus();
  }

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-video]');
    if (trigger) { e.preventDefault(); openVideo(trigger.dataset.video); return; }
    if (e.target === lightbox) closeVideo();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeVideo();
    const t = e.target.closest?.('[data-video][tabindex]');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openVideo(t.dataset.video); }
  });
  $('#lbClose')?.addEventListener('click', closeVideo);

  /* ------------------------------------------------------------------------
     11. Copy-to-clipboard for phone / email
     ---------------------------------------------------------------------- */
  $$('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const label = $('.contact__copy', btn);
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        if (label) {
          const old = label.textContent;
          label.textContent = 'Tersalin ✓';
          label.style.color = 'var(--lime)';
          setTimeout(() => { label.textContent = old; label.style.color = ''; }, 1800);
        }
      } catch {
        window.prompt('Salin manual:', btn.dataset.copy);
      }
    });
  });

  /* ------------------------------------------------------------------------
     12. Forms — no backend on a static host, so compose a mail draft
     ---------------------------------------------------------------------- */
  const MAIL = 'halalpro@bisabaik.or.id';

  $('#contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const status = $('#formStatus');
    const name = $('#cName').value.trim();
    const email = $('#cEmail').value.trim();
    const phone = $('#cPhone').value.trim();
    const msg = $('#cMsg').value.trim();

    if (!name || !email) {
      if (status) status.textContent = 'Mohon isi nama dan email terlebih dahulu.';
      (!name ? $('#cName') : $('#cEmail')).focus();
      return;
    }
    const body = [`Nama: ${name}`, `Email: ${email}`, `Telepon: ${phone || '-'}`, '', msg || '(tanpa pesan)'].join('\n');
    window.location.href =
      `mailto:${MAIL}?subject=${encodeURIComponent('Newsletter Halal Pro — ' + name)}&body=${encodeURIComponent(body)}`;
    if (status) status.textContent = 'Membuka aplikasi email Anda…';
    f.reset();
  });

  $('#subForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#subEmail').value.trim();
    const status = $('#subStatus');
    if (!email || !email.includes('@')) {
      if (status) status.textContent = 'Masukkan alamat email yang valid.';
      return;
    }
    window.location.href =
      `mailto:${MAIL}?subject=${encodeURIComponent('Subscribe Newsletter Halal Pro')}&body=${encodeURIComponent('Email: ' + email)}`;
    if (status) status.textContent = 'Terima kasih! Membuka aplikasi email Anda…';
    $('#subForm').reset();
  });

  /* ------------------------------------------------------------------------
     13. Smooth anchor scroll that respects the reduced-motion preference
     ---------------------------------------------------------------------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    closeDrawer();
    const top = target.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 74) - 8;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  });

})();
