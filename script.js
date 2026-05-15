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
     Scroll-scrub video
     Apple-style: video.currentTime tracks scroll progress.
     We loop the timeline so as the user scrolls past one
     video duration worth of pixels, the video plays once;
     scrolling further loops it. Smooth via rAF.
     ------------------------------------------------------- */
  const scrub = {
    duration: 0,
    targetTime: 0,
    lastSetTime: 0,
    ready: false,
    rafId: 0,
    // how many "video durations" per full page scroll (lower = faster scrub)
    scrollPerLoop: 0.55,
  };

  function onMeta() {
    scrub.duration = video.duration || 0;
    if (scrub.duration > 0 && Number.isFinite(scrub.duration)) {
      scrub.ready = true;
      // start the animation loop
      tick();
      // hide loader once we have enough to render
      hideLoader();
    }
  }

  function onCanPlay() {
    // belt + braces in case loadedmetadata fired with no duration
    if (!scrub.ready) onMeta();
  }

  function computeTarget() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    const progress = Math.min(1, Math.max(0, window.scrollY / docHeight));
    // make the video advance through its timeline as we scroll;
    // wrap to loop seamlessly if user scrolls past one playback length
    const loops = Math.max(0.25, scrub.scrollPerLoop);
    const t = (progress / loops) * scrub.duration;
    return t % scrub.duration;
  }

  function tick() {
    if (!scrub.ready) return;
    scrub.targetTime = computeTarget();

    // ease toward target for buttery scrub
    const cur = video.currentTime || 0;
    const diff = scrub.targetTime - cur;
    // handle wrap (if target jumps backward past 0)
    let next;
    if (Math.abs(diff) > scrub.duration / 2) {
      // crossing the loop boundary — snap
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

  video.addEventListener('loadedmetadata', onMeta, { once: true });
  video.addEventListener('canplay', onCanPlay, { once: true });

  // some browsers need a kick
  video.load();

  // safety: hide loader after 5s even if video never reports duration
  setTimeout(() => hideLoader(), 5000);

  function hideLoader() {
    if (loader && !loader.classList.contains('is-hidden')) {
      loader.classList.add('is-hidden');
    }
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
     Pause animation loop when tab hidden
     ------------------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(scrub.rafId);
    } else if (scrub.ready) {
      tick();
    }
  });
})();
