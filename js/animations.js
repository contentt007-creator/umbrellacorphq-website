/**
 * Umbrella Corp HQ — animations.js
 * GSAP + ScrollTrigger + SplitType animations
 * Production-ready ES6+
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Guard: GSAP must be available
  if (typeof gsap === 'undefined') {
    console.warn('[UCH] GSAP not found — animations skipped.');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Allow Lenis to drive ScrollTrigger updates (set in main.js)
  // If Lenis is loaded, the ticker is already bridged in main.js.

  /* ─────────────────────────────────────────────────
   * UTILITY: safe SplitType init with fallback
   * ───────────────────────────────────────────────── */
  function splitText(selector, types = 'chars,words,lines') {
    if (typeof SplitType === 'undefined') return null;
    const els = document.querySelectorAll(selector);
    if (!els.length) return null;
    return new SplitType(selector, { types });
  }

  /* ─────────────────────────────────────────────────
   * 1. HERO TEXT REVEAL (page load)
   * Splits heading lines, animates chars in staggered waves.
   * ───────────────────────────────────────────────── */
  (function heroReveal() {
    const heroHeading = document.querySelector('.hero-heading, .hero h1, [data-hero-heading]');
    const heroSubtext = document.querySelector('.hero-subtext, .hero-sub, [data-hero-sub]');
    const heroCtas = document.querySelector('.hero-ctas, .hero-actions, [data-hero-ctas]');

    if (!heroHeading) return;

    // Split heading into characters
    let splitResult = null;
    if (typeof SplitType !== 'undefined') {
      splitResult = new SplitType(heroHeading, { types: 'lines,chars' });
    }

    const lines = splitResult
      ? Array.from(heroHeading.querySelectorAll('.line'))
      : [heroHeading];

    const lineDelays = [0.1, 0.5, 0.85];

    // Set initial state for all chars
    if (splitResult) {
      gsap.set(heroHeading.querySelectorAll('.char'), {
        y: 100,
        opacity: 0,
      });
    } else {
      gsap.set(heroHeading, { y: 60, opacity: 0 });
    }

    // Animate each line
    lines.forEach((line, i) => {
      const delay = lineDelays[i] !== undefined ? lineDelays[i] : i * 0.35 + 0.1;
      const chars = splitResult ? line.querySelectorAll('.char') : [line];

      gsap.to(chars, {
        y: 0,
        opacity: 1,
        duration: 0.75,
        ease: 'power3.out',
        stagger: 0.02,
        delay,
      });
    });

    // Hero subtext fade in
    if (heroSubtext) {
      gsap.set(heroSubtext, { y: 20, opacity: 0 });
      gsap.to(heroSubtext, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power2.out',
        delay: 1.2,
      });
    }

    // Hero CTAs slide up
    if (heroCtas) {
      const ctaEls = heroCtas.querySelectorAll('a, button');
      const targets = ctaEls.length ? ctaEls : [heroCtas];
      gsap.set(targets, { y: 30, opacity: 0 });
      gsap.to(targets, {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.1,
        delay: 1.4,
      });
    }
  })();

  /* ─────────────────────────────────────────────────
   * 2. SERVICE CARDS STAGGER
   * ───────────────────────────────────────────────── */
  (function serviceCards() {
    const servicesGrid = document.querySelector('.services-grid');
    if (!servicesGrid) return;

    const cards = servicesGrid.querySelectorAll('.service-card');
    if (!cards.length) return;

    gsap.set(cards, { y: 60, opacity: 0 });

    ScrollTrigger.create({
      trigger: servicesGrid,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(cards, {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
          stagger: 0.12,
        });
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * 3. STATS COUNTER TRIGGER
   * Delegates to window.startCounters() defined in main.js
   * ───────────────────────────────────────────────── */
  (function statsCounterTrigger() {
    const statsBar = document.querySelector('.stats-bar, .stats-section');
    if (!statsBar) return;

    ScrollTrigger.create({
      trigger: statsBar,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        if (typeof window.startCounters === 'function') {
          window.startCounters();
        }
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * 4. CASE STUDY CARDS (homepage)
   * Odd cards slide from left, even from right.
   * ───────────────────────────────────────────────── */
  (function caseStudyCards() {
    const cards = document.querySelectorAll('.case-study-card');
    if (!cards.length) return;

    cards.forEach((card, i) => {
      const fromX = (i % 2 === 0) ? -80 : 80; // 0-indexed: even = left, odd = right

      gsap.set(card, { x: fromX, opacity: 0 });

      ScrollTrigger.create({
        trigger: card,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(card, {
            x: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power2.out',
          });
        },
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 5. PROCESS LINE DRAW + STEP ACTIVATION
   * ───────────────────────────────────────────────── */
  (function processLine() {
    const processSection = document.querySelector('.process-section');
    if (!processSection) return;

    const progressLine = processSection.querySelector('.process-line-progress');
    const steps = processSection.querySelectorAll('.process-step');

    if (progressLine) gsap.set(progressLine, { width: '0%' });

    ScrollTrigger.create({
      trigger: processSection,
      start: 'top 70%',
      once: true,
      onEnter: () => {
        // Draw the progress line
        if (progressLine) {
          gsap.to(progressLine, {
            width: '75%',
            duration: 2,
            ease: 'power2.inOut',
          });
        }

        // Activate each step with stagger
        if (steps.length) {
          gsap.to(steps, {
            onStart: function () {
              // Add active class via stagger callback trick
            },
          });

          steps.forEach((step, i) => {
            gsap.delayedCall(i * 0.3 + 0.2, () => {
              step.classList.add('is-active');
            });
          });
        }
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * 6. SECTION HEADINGS REVEAL
   * Clip-path + char stagger on ALL .section-heading
   * ───────────────────────────────────────────────── */
  (function sectionHeadings() {
    const headings = document.querySelectorAll('.section-heading');
    if (!headings.length) return;

    headings.forEach((heading) => {
      let chars;

      if (typeof SplitType !== 'undefined') {
        const split = new SplitType(heading, { types: 'chars' });
        chars = split.chars;
      } else {
        chars = [heading];
      }

      gsap.set(chars, { y: 80, opacity: 0 });

      ScrollTrigger.create({
        trigger: heading,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(chars, {
            y: 0,
            opacity: 1,
            duration: 0.65,
            ease: 'power3.out',
            stagger: 0.025,
          });
        },
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 7. CTA SECTION
   * ───────────────────────────────────────────────── */
  (function ctaSection() {
    const cta = document.querySelector('.cta-section');
    if (!cta) return;

    const ctaHeading = cta.querySelector('h2, h3, .cta-heading');
    const ctaButtons = cta.querySelectorAll('a, button');

    gsap.set(cta, { scale: 0.95, opacity: 0 });

    ScrollTrigger.create({
      trigger: cta,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        // Scale + fade in the section container
        gsap.to(cta, {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: 'power2.out',
        });

        // Split and animate heading chars
        if (ctaHeading) {
          let chars;
          if (typeof SplitType !== 'undefined') {
            const split = new SplitType(ctaHeading, { types: 'chars' });
            chars = split.chars;
          } else {
            chars = [ctaHeading];
          }
          gsap.set(chars, { y: 50, opacity: 0 });
          gsap.to(chars, {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.025,
            delay: 0.2,
          });
        }

        // Buttons slide up
        if (ctaButtons.length) {
          gsap.set(ctaButtons, { y: 20, opacity: 0 });
          gsap.to(ctaButtons, {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.1,
            delay: 0.45,
          });
        }
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * 8. GENERAL REVEAL ELEMENTS
   * .reveal, .reveal-left, .reveal-right, .reveal-scale
   * ───────────────────────────────────────────────── */
  (function revealElements() {
    // Generic upward reveal
    const revealEls = document.querySelectorAll('.reveal');
    revealEls.forEach((el) => {
      gsap.set(el, { y: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' });
        },
      });
    });

    // Slide from left
    const revealLeft = document.querySelectorAll('.reveal-left');
    revealLeft.forEach((el) => {
      gsap.set(el, { x: -60, opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, { x: 0, opacity: 1, duration: 0.75, ease: 'power2.out' });
        },
      });
    });

    // Slide from right
    const revealRight = document.querySelectorAll('.reveal-right');
    revealRight.forEach((el) => {
      gsap.set(el, { x: 60, opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, { x: 0, opacity: 1, duration: 0.75, ease: 'power2.out' });
        },
      });
    });

    // Scale reveal
    const revealScale = document.querySelectorAll('.reveal-scale');
    revealScale.forEach((el) => {
      gsap.set(el, { scale: 0.92, opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(el, { scale: 1, opacity: 1, duration: 0.7, ease: 'power2.out' });
        },
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 9. FOOTER REVEAL
   * Footer columns stagger up from bottom.
   * ───────────────────────────────────────────────── */
  (function footerReveal() {
    const footer = document.querySelector('footer, .site-footer');
    if (!footer) return;

    const columns = footer.querySelectorAll('.footer-col, .footer-column, [class*="footer-col"]');
    const targets = columns.length ? columns : [footer];

    gsap.set(targets, { y: 40, opacity: 0 });

    ScrollTrigger.create({
      trigger: footer,
      start: 'top 90%',
      once: true,
      onEnter: () => {
        gsap.to(targets, {
          y: 0,
          opacity: 1,
          duration: 0.65,
          ease: 'power2.out',
          stagger: 0.1,
        });
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * 10. PARALLAX ON HERO CROSSHAIR / BACKGROUND GRAPHIC
   * Subtle scrub parallax as user scrolls.
   * ───────────────────────────────────────────────── */
  (function heroParallax() {
    const heroBgGraphic = document.querySelector('.hero-bg-graphic, .hero-crosshair, [data-parallax-hero]');
    if (!heroBgGraphic) return;

    gsap.to(heroBgGraphic, {
      y: -100,
      ease: 'none',
      scrollTrigger: {
        trigger: document.querySelector('.hero, [data-hero]') || heroBgGraphic,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  })();

  /* ─────────────────────────────────────────────────
   * BONUS: Navbar logo subtle reveal on load
   * ───────────────────────────────────────────────── */
  (function navReveal() {
    const navLogo = document.querySelector('.nav-logo, .nav .logo');
    const navLinks = document.querySelectorAll('.nav-links .nav-link, .nav-link');

    if (navLogo) {
      gsap.set(navLogo, { opacity: 0, x: -20 });
      gsap.to(navLogo, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', delay: 0.1 });
    }

    if (navLinks.length) {
      gsap.set(navLinks, { opacity: 0, y: -10 });
      gsap.to(navLinks, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.07,
        delay: 0.2,
      });
    }
  })();

  /* ─────────────────────────────────────────────────
   * 11. ELASTIC BUTTON HOVER
   * GSAP back.out spring overshoot on all CTAs.
   * ───────────────────────────────────────────────── */
  (function elasticButtons() {
    const btns = document.querySelectorAll('.btn-primary, .btn-secondary, .nav-cta');
    btns.forEach((btn) => {
      btn.addEventListener('mouseenter', () => {
        gsap.to(btn, {
          scale: 1.05,
          y: -3,
          duration: 0.45,
          ease: 'back.out(2)',
          overwrite: 'auto',
        });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          scale: 1,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 12. 3D CARD TILT
   * Mouse-follow perspective tilt on service cards.
   * ───────────────────────────────────────────────── */
  (function cardTilt() {
    // Skip on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const tiltCards = document.querySelectorAll('.service-card, .case-study-card');
    if (!tiltCards.length) return;

    const MAX_TILT    = 7;   // degrees
    const PERSPECTIVE = 900; // px

    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) / (rect.width  / 2);
        const dy   = (e.clientY - cy) / (rect.height / 2);
        const rotX = -dy * MAX_TILT;
        const rotY =  dx * MAX_TILT;

        gsap.to(card, {
          rotateX:             rotX,
          rotateY:             rotY,
          transformPerspective: PERSPECTIVE,
          duration:            0.3,
          ease:                'power2.out',
          overwrite:           'auto',
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX:  0,
          rotateY:  0,
          duration: 0.55,
          ease:     'power3.out',
          overwrite: 'auto',
        });
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 13. STAGGERED MOBILE MENU
   * Links slide in with stagger when hamburger opens.
   * ───────────────────────────────────────────────── */
  (function mobileMenuStagger() {
    const hamburger  = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    if (!hamburger || !mobileMenu) return;

    const links = mobileMenu.querySelectorAll(
      '.mobile-menu-link, .mobile-link, .btn-primary, .mobile-cta'
    );
    if (!links.length) return;

    // Set initial state
    gsap.set(links, { x: -40, opacity: 0 });

    const observer = new MutationObserver(() => {
      if (hamburger.classList.contains('is-open')) {
        // Open: stagger slide in from left
        gsap.to(links, {
          x:        0,
          opacity:  1,
          duration: 0.5,
          ease:     'power3.out',
          stagger:  0.08,
          delay:    0.12,
        });
      } else {
        // Close: stagger slide out quickly
        gsap.to(links, {
          x:        -30,
          opacity:  0,
          duration: 0.25,
          ease:     'power2.in',
          stagger:  0.04,
        });
      }
    });

    observer.observe(hamburger, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ─────────────────────────────────────────────────
   * 14. SCROLL IMAGE REVEAL (clip-path bottom-up)
   * .img-reveal elements wipe into view on scroll.
   * ───────────────────────────────────────────────── */
  (function imageReveal() {
    const imgs = document.querySelectorAll(
      '.img-reveal, .case-study-image, .team-photo, .about-img, .work-img'
    );
    if (!imgs.length) return;

    imgs.forEach((el) => {
      gsap.set(el, { clipPath: 'inset(100% 0 0% 0)', willChange: 'clip-path' });

      ScrollTrigger.create({
        trigger: el,
        start:   'top 88%',
        once:    true,
        onEnter: () => {
          gsap.to(el, {
            clipPath:  'inset(0% 0 0% 0)',
            duration:  0.9,
            ease:      'power3.out',
          });
        },
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * 15. PAGE TRANSITION OVERLAY
   * Red wipe between page navigations.
   * ───────────────────────────────────────────────── */
  (function pageTransition() {
    // Auto-inject overlay if not already in DOM
    let overlay = document.querySelector('.page-transition');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'page-transition';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(overlay, document.body.firstChild);
    }

    // Page entrance: overlay already covering — wipe up to reveal page
    gsap.set(overlay, { scaleY: 1, transformOrigin: 'top', pointerEvents: 'none' });
    gsap.to(overlay, {
      scaleY:   0,
      duration: 0.65,
      ease:     'power3.inOut',
      delay:    0.05,
    });

    // Page exit: wipe down on any internal link click
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        link.target === '_blank'
      ) return;

      e.preventDefault();

      gsap.set(overlay, { transformOrigin: 'bottom', scaleY: 0, pointerEvents: 'all' });
      gsap.to(overlay, {
        scaleY:   1,
        duration: 0.5,
        ease:     'power3.inOut',
        onComplete: () => { window.location.href = href; },
      });
    });
  })();

  /* ─────────────────────────────────────────────────
   * Refresh ScrollTrigger after all animations set up
   * (handles cases where images affect layout height)
   * ───────────────────────────────────────────────── */
  ScrollTrigger.refresh();
});
