/* ==========================================================================
   LAVERRO — scroll-scrub video background + reveal animations + nav state
   ========================================================================== */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const video = $('#bgVideo');
  const loader = $('#loader');
  const nav = $('.nav');
  const burger = $('.nav-burger');
  const navLinks = $('.nav-links');
  const yearEl = $('#year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -------------------------------------------------------
     Video playback mode
     - Desktop / large viewports: Apple-style scroll-scrub
       (video.currentTime tracks scroll progress, eased via rAF)
     - Mobile / touch devices: plain autoplay + loop, because
       iOS Safari throttles currentTime updates during momentum
       scroll which makes scrubbing feel frozen.
     ------------------------------------------------------- */
  const isMobileLike = window.matchMedia('(max-width: 880px)').matches
    || window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  function hideLoader() {
    if (loader && !loader.classList.contains('is-hidden')) {
      loader.classList.add('is-hidden');
    }
  }

  /* ---------- Mobile path: autoplay + loop ---------- */
  function setupMobileVideo() {
    // iOS needs these set as attributes too — we already do in HTML
    video.muted = true;
    video.loop = true;
    video.setAttribute('autoplay', '');

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // autoplay blocked — start on first user gesture
          const kick = () => { video.play().catch(() => {}); cleanup(); };
          const cleanup = () => {
            document.removeEventListener('touchstart', kick);
            document.removeEventListener('click', kick);
            document.removeEventListener('scroll', kick);
          };
          document.addEventListener('touchstart', kick, { once: true, passive: true });
          document.addEventListener('click', kick, { once: true });
          document.addEventListener('scroll', kick, { once: true, passive: true });
        });
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
      hideLoader();
    } else {
      video.addEventListener('loadeddata', () => { tryPlay(); hideLoader(); }, { once: true });
      video.addEventListener('canplay', () => { tryPlay(); hideLoader(); }, { once: true });
    }
    video.load();
    // safety: hide loader after 4s regardless
    setTimeout(hideLoader, 4000);
  }

  /* ---------- Desktop path: scroll-scrub ---------- */
  const scrub = {
    duration: 0,
    targetTime: 0,
    lastSetTime: 0,
    ready: false,
    rafId: 0,
    scrollPerLoop: 0.55,
  };

  function onMeta() {
    scrub.duration = video.duration || 0;
    if (scrub.duration > 0 && Number.isFinite(scrub.duration)) {
      scrub.ready = true;
      tick();
      hideLoader();
    }
  }
  function onCanPlay() { if (!scrub.ready) onMeta(); }

  function computeTarget() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    const progress = Math.min(1, Math.max(0, window.scrollY / docHeight));
    const loops = Math.max(0.25, scrub.scrollPerLoop);
    const t = (progress / loops) * scrub.duration;
    return t % scrub.duration;
  }

  function tick() {
    if (!scrub.ready) return;
    scrub.targetTime = computeTarget();
    const cur = video.currentTime || 0;
    const diff = scrub.targetTime - cur;
    let next;
    if (Math.abs(diff) > scrub.duration / 2) {
      next = scrub.targetTime;
    } else {
      next = cur + diff * 0.18;
    }
    if (Math.abs(next - scrub.lastSetTime) > 0.01) {
      try { video.currentTime = next; } catch (_) {}
      scrub.lastSetTime = next;
    }
    scrub.rafId = requestAnimationFrame(tick);
  }

  function setupDesktopVideo() {
    video.addEventListener('loadedmetadata', onMeta, { once: true });
    video.addEventListener('canplay', onCanPlay, { once: true });
    video.load();
    setTimeout(hideLoader, 5000);
  }

  if (isMobileLike) {
    setupMobileVideo();
  } else {
    setupDesktopVideo();
  }

  /* -------------------------------------------------------
     Nav scroll state
     ------------------------------------------------------- */
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('is-stuck');
    else nav.classList.remove('is-stuck');
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* -------------------------------------------------------
     Mobile nav burger
     ------------------------------------------------------- */
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      navLinks.classList.toggle('is-open', !open);
    });
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        navLinks.classList.remove('is-open');
      }
    });
  }

  /* -------------------------------------------------------
     Reveal-on-scroll
     ------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal').forEach((el, i) => {
      // small stagger if grouped
      el.style.transitionDelay = `${(i % 6) * 60}ms`;
      io.observe(el);
    });
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
  }

  /* -------------------------------------------------------
     Pause work when tab hidden
     ------------------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (!isMobileLike) cancelAnimationFrame(scrub.rafId);
      try { video.pause(); } catch (_) {}
    } else {
      if (isMobileLike) {
        video.play().catch(() => {});
      } else if (scrub.ready) {
        tick();
      }
    }
  });
})();
