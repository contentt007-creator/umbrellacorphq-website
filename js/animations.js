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
   * 6. SECTION HEADINGS REVEAL (.split-heading)
   * ───────────────────────────────────────────────── */
  (function sectionHeadings() {
    const headings = document.querySelectorAll('.section-heading.split-heading');
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
   * Refresh ScrollTrigger after all animations set up
   * (handles cases where images affect layout height)
   * ───────────────────────────────────────────────── */
  ScrollTrigger.refresh();
});
