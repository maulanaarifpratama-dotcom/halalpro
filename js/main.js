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
  const showAll = () => revealables.forEach(el => { el.dataset.shown = 'true'; });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.dataset.shown = 'true';
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

    revealables.forEach(el => io.observe(el));

    // Failsafe. Intersection callbacks are suppressed while a tab is
    // throttled, prerendered, or never painted — and a hidden page is a
    // broken page. If nothing has been revealed shortly after load, drop the
    // choreography and show everything.
    const failsafe = () => {
      if (!revealables.some(el => el.dataset.shown === 'true')) showAll();
    };
    window.addEventListener('load', () => setTimeout(failsafe, 1200), { once: true });
    setTimeout(failsafe, 3000);
    // Anything already scrolled past on a deep link should never wait for a
    // scroll that may not come.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(failsafe, 400);
    });
  } else {
    showAll();
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
  const settleCounters = () => counters.forEach(el => {
    if (el.textContent !== el.dataset.count) el.textContent = el.dataset.count;
  });

  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        countUp(e.target, Number(e.target.dataset.count));
        cio.unobserve(e.target);
      }
    }, { threshold: 0.6 });
    counters.forEach(el => cio.observe(el));

    // Same failsafe as the reveal, and it matters more here: a counter stuck
    // at its placeholder does not just look unfinished, it states a number
    // that is false. If the observer never ran, write the real values in.
    const counterFailsafe = () => {
      if (counters.every(el => el.textContent === '0')) settleCounters();
    };
    window.addEventListener('load', () => setTimeout(counterFailsafe, 1400), { once: true });
    setTimeout(counterFailsafe, 3200);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) setTimeout(counterFailsafe, 500);
    });
  } else {
    settleCounters();
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

  // If the observer above never fired, fill the arcs anyway: an empty gauge
  // next to a "100%" label reads as a contradiction.
  setTimeout(() => {
    gauges.forEach(g => {
      const path = $('.gauge__fill', g);
      if (path && path.style.strokeDashoffset !== String(g._target)) {
        path.style.strokeDashoffset = g._target;
      }
    });
  }, 3200);

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

    let swapped = false;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      el.textContent = text;
      el.animate(
        [{ opacity: 0, transform: 'translateY(9px)', filter: 'blur(4px)' },
         { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }],
        { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' }
      );
    };

    // Exit is deliberately shorter than the entrance.
    el.animate(
      [{ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
       { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(4px)' }],
      { duration: 160, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' }
    ).onfinish = swap;

    // Animations are frozen in a hidden or throttled tab, and onfinish would
    // never arrive. The copy must land regardless of whether the motion does.
    setTimeout(swap, 260);
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
        setTimeout(() => { t.dataset.leaving = 'false'; }, 320);
      }
      if (isNew) {
        t.dataset.leaving = 'false';
        // one frame so the enter transform is applied from its rest state
        requestAnimationFrame(() => { t.dataset.active = 'true'; });
      }
    });

    switchBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tub === key)));
    fireStreaks();
    if (bloom) { bloom.style.setProperty('--bloom', p.bloom); bloom.style.opacity = '1'; }
    swapText(heroKicker, p.kicker);
    swapText(heroName, p.name);
    swapText(heroDesc, p.desc);
    if (heroRead) heroRead.setAttribute('href', p.href);

    currentKey = key;
    if (userInitiated) {
      stopRotate();
      // Deep-linkable: sharing the URL shares the product you were looking at.
      const url = new URL(location.href);
      url.searchParams.set('produk', key);
      history.replaceState(null, '', url);
    }
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

  // Honour ?produk= on load so a shared link opens on the right product.
  const wanted = new URLSearchParams(location.search).get('produk');
  if (wanted && PRODUCTS[wanted] && wanted !== currentKey) {
    tubs.forEach(t => { t.dataset.active = String(t.dataset.tub === wanted); });
    switchBtns.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tub === wanted)));
    const p = PRODUCTS[wanted];
    if (heroKicker) heroKicker.textContent = p.kicker;
    if (heroName) heroName.textContent = p.name;
    if (heroDesc) heroDesc.textContent = p.desc;
    if (heroRead) heroRead.setAttribute('href', p.href);
    currentKey = wanted;
  }

  // Initial bloom tint
  if (bloom) {
    bloom.style.setProperty('--bloom', PRODUCTS[currentKey].bloom);
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
          el.style.setProperty('--tx', `${(x * 0.16).toFixed(2)}px`);
          el.style.setProperty('--ty', `${(y * 0.22).toFixed(2)}px`);
          raf = null;
        });
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', () => {
        el.style.removeProperty('--tx');
        el.style.removeProperty('--ty');
      });
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

    // Measured on resize only. Reading layout inside pointermove would force
    // a synchronous reflow on every frame of a drag.
    let cachedStep = 0;
    const measure = () => {
      const a = slides[0]?.getBoundingClientRect().width || 0;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      cachedStep = a + gap;
    };
    const step = () => cachedStep || 1;
    measure();
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

    window.addEventListener('resize', () => { measure(); buildDots(); render(); });
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeVideo(); });
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


  /* ------------------------------------------------------------------------
     14. Sport footage
         Two players, one rule: nothing autoplays that the visitor did not ask
         for except the muted ambient bed, and even that stops the moment it
         leaves the viewport, the tab hides, reduced motion is on, or the
         connection asks us to save data.
     ---------------------------------------------------------------------- */
  const saveData = navigator.connection && navigator.connection.saveData === true;
  const wantsVideo = !reduced && !saveData;

  /* --- Ambient bed behind the hero --- */
  const bed = $('#heroBed');
  if (bed) {
    if (!wantsVideo) {
      // Poster only. The still already carries the gym; motion would not.
      bed.dataset.ready = 'true';
    } else {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'auto';
      v.poster = '/assets/media/hero-poster.jpg';
      v.src = '/assets/media/hero-loop.mp4';
      v.setAttribute('aria-hidden', 'true');
      // The poster <img> stays underneath as a permanent fallback: if the
      // video never decodes or autoplay is refused, the gym still shows.
      bed.appendChild(v);
      bed.dataset.ready = 'true';

      const tryPlay = () => { const p = v.play(); if (p) p.catch(() => { bed.dataset.ready = 'true'; }); };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          entries[0].isIntersecting ? tryPlay() : v.pause();
        }, { threshold: 0.05 }).observe(bed);
      } else {
        tryPlay();
      }
      document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); });
    }
  }

  /* --- Speed streaks: a 620ms burst, restarted cleanly on every switch --- */
  function fireStreaks() {
    const el = document.getElementById('streaks');
    if (!el || reduced) return;
    el.dataset.fire = 'false';
    // Force a reflow so the animation restarts rather than being ignored.
    void el.offsetWidth;
    el.dataset.fire = 'true';
  }

  /* --- The reel player --- */
  const reelVideo = $('#reelVideo');
  if (reelVideo) {
    const playBtn = $('#reelPlay');
    const muteBtn = $('#reelMute');
    const bar = $('#reelBar');
    const beats = $$('.beat');
    let loaded = false;

    const setPlayUI = (playing) => {
      $('#reelPlayIcon').innerHTML = playing
        ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'
        : '<path d="M8 5v14l11-7z"/>';
      $('#reelPlayLabel').textContent = playing ? 'Pause' : 'Play';
    };
    const setMuteUI = () => {
      const m = reelVideo.muted;
      muteBtn.setAttribute('aria-pressed', String(m));
      $('#reelMuteIcon').innerHTML = m
        ? '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M19 9l-4 6M15 9l4 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'
        : '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
      $('#reelMuteLabel').textContent = m ? 'Suara' : 'Bisu';
    };

    const ensureLoaded = () => {
      if (loaded) return;
      reelVideo.preload = 'auto';
      reelVideo.load();
      loaded = true;
    };

    playBtn?.addEventListener('click', () => {
      ensureLoaded();
      if (reelVideo.paused) { reelVideo.play().catch(() => {}); } else { reelVideo.pause(); }
    });
    muteBtn?.addEventListener('click', () => {
      ensureLoaded();
      reelVideo.muted = !reelVideo.muted;
      setMuteUI();
      if (reelVideo.paused) reelVideo.play().catch(() => {});
    });

    reelVideo.addEventListener('play', () => setPlayUI(true));
    reelVideo.addEventListener('pause', () => setPlayUI(false));

    // The beat list is a table of contents for the film: it lights up in step
    // with playback, and clicking a beat seeks to it.
    reelVideo.addEventListener('timeupdate', () => {
      const d = reelVideo.duration || 1;
      if (bar) bar.style.setProperty('--p', (reelVideo.currentTime / d).toFixed(4));
      let active = -1;
      beats.forEach((b, i) => { if (reelVideo.currentTime >= Number(b.dataset.t)) active = i; });
      beats.forEach((b, i) => { b.dataset.on = String(i === active); });
    });
    beats.forEach(b => {
      b.setAttribute('role', 'button');
      b.setAttribute('tabindex', '0');
      const seek = () => {
        ensureLoaded();
        reelVideo.currentTime = Number(b.dataset.t);
        reelVideo.play().catch(() => {});
      };
      b.addEventListener('click', seek);
      b.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seek(); }
      });
      b.style.cursor = 'pointer';
    });

    setMuteUI();
    setPlayUI(false);

    // Muted autoplay when it scrolls into view, but only if motion is welcome.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          if (wantsVideo) { ensureLoaded(); reelVideo.play().catch(() => {}); }
        } else {
          reelVideo.pause();
        }
      }, { threshold: 0.4 }).observe(reelVideo);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) reelVideo.pause(); });
  }


  /* ------------------------------------------------------------------------
     15. Motion toggle
         The ambient loops outlast five seconds next to reading content, so
         there is an explicit stop that does not require changing an OS
         setting. The choice is remembered for the session.
     ---------------------------------------------------------------------- */
  const motionBtn = $('#motionToggle');
  if (motionBtn) {
    const stored = sessionStorage.getItem('hp-motion');
    let motionOn = stored ? stored === 'on' : !reduced;

    const applyMotion = () => {
      document.documentElement.dataset.motion = motionOn ? 'on' : 'off';
      motionBtn.setAttribute('aria-pressed', String(!motionOn));
      $('#motionLabel').textContent = motionOn ? 'Jeda animasi' : 'Putar animasi';
      $('#motionIcon').innerHTML = motionOn
        ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor" stroke="none"/>'
        : '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>';
      const v = document.querySelector('#heroBed video');
      if (v) { motionOn ? v.play().catch(() => {}) : v.pause(); }
      if (!motionOn) stopRotate();
    };

    motionBtn.addEventListener('click', () => {
      motionOn = !motionOn;
      sessionStorage.setItem('hp-motion', motionOn ? 'on' : 'off');
      applyMotion();
    });

    applyMotion();

    // Slides in after first paint so it never competes with the hero entrance.
    requestAnimationFrame(() => { motionBtn.dataset.on = 'true'; });
  }

})();
