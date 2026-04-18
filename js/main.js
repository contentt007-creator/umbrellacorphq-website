/**
 * Umbrella Corp HQ — main.js
 * Production-ready ES6+ JavaScript
 * Domain: umbrellacorphq.com | Dhaka, Bangladesh
 */

'use strict';

/* ─────────────────────────────────────────────────
 * 1. CONTENT LOADING SYSTEM
 * Reads from localStorage with 'uch_' prefix.
 * Falls back to element's current textContent.
 * ───────────────────────────────────────────────── */

/**
 * Load a content value from localStorage or return the default.
 * @param {string} key - Key without prefix
 * @param {string} defaultValue
 * @returns {string}
 */
function loadContent(key, defaultValue) {
  return localStorage.getItem('uch_' + key) || defaultValue;
}

/**
 * Apply all localStorage content overrides to the DOM.
 * Targets elements with [data-key] attribute.
 * Falls back to [data-default] if no stored value exists.
 */
function applyContentOverrides() {
  const contentEls = document.querySelectorAll('[data-key]');
  contentEls.forEach((el) => {
    const key = el.getAttribute('data-key');
    if (!key) return;
    const defaultVal = el.getAttribute('data-default') || el.textContent;
    const stored = localStorage.getItem('uch_' + key);
    const value  = stored !== null ? stored : defaultVal;
    if (value !== null && value !== undefined) {
      // Use innerHTML for elements that may contain rich text (set by admin)
      // but only if the value contains tags, otherwise use textContent for XSS safety
      if (/<[a-z][\s\S]*>/i.test(value)) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    }
  });
}

/* ─────────────────────────────────────────────────
 * 11. SETTINGS APPLY (colour overrides + analytics)
 * Runs before DOM paint to avoid flash.
 * ───────────────────────────────────────────────── */

function applySettings() {
  // Colour variable overrides
  const corpRed = localStorage.getItem('uch_corp_red');
  if (corpRed && corpRed.trim()) {
    document.documentElement.style.setProperty('--corp-red', corpRed.trim());
  }

  const voidColor = localStorage.getItem('uch_void');
  if (voidColor && voidColor.trim()) {
    document.documentElement.style.setProperty('--void', voidColor.trim());
  }

  const ivoryColor = localStorage.getItem('uch_ivory');
  if (ivoryColor && ivoryColor.trim()) {
    document.documentElement.style.setProperty('--ivory', ivoryColor.trim());
  }

  // Google Analytics injection
  const gaId = localStorage.getItem('uch_ga_id');
  if (gaId && gaId.trim()) {
    const gtagScript = document.createElement('script');
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId.trim()}`;
    gtagScript.async = true;
    document.head.appendChild(gtagScript);

    const gtagInit = document.createElement('script');
    gtagInit.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId.trim()}');
    `;
    document.head.appendChild(gtagInit);
  }

  // Facebook Pixel injection
  const fbPixelId = localStorage.getItem('uch_fb_pixel_id');
  if (fbPixelId && fbPixelId.trim()) {
    const fbScript = document.createElement('script');
    fbScript.textContent = `
      !function(f,b,e,v,n,t,s){
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fbPixelId.trim()}');
        fbq('track', 'PageView');
    `;
    document.head.appendChild(fbScript);
  }
}

// Run settings immediately (before DOMContentLoaded) to minimise flash
applySettings();

/* ─────────────────────────────────────────────────
 * MAIN INIT — wrapped in DOMContentLoaded
 * ───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  /* ───────────────────────────────
   * Apply content overrides
   * ─────────────────────────────── */
  applyContentOverrides();

  /* ─────────────────────────────────────────────────
   * 2. LENIS SMOOTH SCROLL INIT
   * ───────────────────────────────────────────────── */
  initLenis();

  /* ─────────────────────────────────────────────────
   * 3. NAVIGATION
   * ───────────────────────────────────────────────── */
  initNavigation();

  /* ─────────────────────────────────────────────────
   * 4. STATS COUNTER ANIMATION
   * ───────────────────────────────────────────────── */
  initStatsCounter();

  /* ─────────────────────────────────────────────────
   * 5. FAQ ACCORDION
   * ───────────────────────────────────────────────── */
  initFaqAccordion();

  /* ─────────────────────────────────────────────────
   * 6. WORK / CASE STUDY FILTER
   * ───────────────────────────────────────────────── */
  initWorkFilter();

  /* ─────────────────────────────────────────────────
   * 7. CASE STUDY EXPAND
   * ───────────────────────────────────────────────── */
  initCaseStudyExpand();

  /* ─────────────────────────────────────────────────
   * 8. FORM VALIDATION
   * ───────────────────────────────────────────────── */
  initFormValidation();

  /* ─────────────────────────────────────────────────
   * 9. TESTIMONIAL AUTO-ROTATE (mobile)
   * ───────────────────────────────────────────────── */
  initTestimonialRotation();

  /* ─────────────────────────────────────────────────
   * 10. WHATSAPP BUTTON
   * ───────────────────────────────────────────────── */
  initWhatsApp();

  /* ─────────────────────────────────────────────────
   * 11. SOCIAL LINKS (footer href updates)
   * ───────────────────────────────────────────────── */
  initSocialLinks();

}); // end DOMContentLoaded


/* ─────────────────────────────────────────────────
 * 2. LENIS SMOOTH SCROLL
 * ───────────────────────────────────────────────── */

function initLenis() {
  // Guard: Lenis may not be loaded on every page
  if (typeof Lenis === 'undefined') return;

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Expose globally so other scripts (animations.js) can hook in
  window.lenisInstance = lenis;

  // Connect to GSAP ScrollTrigger if available
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);
  } else {
    // Fallback: own RAF loop
    function rafLoop(time) {
      lenis.raf(time);
      requestAnimationFrame(rafLoop);
    }
    requestAnimationFrame(rafLoop);
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    });
  });
}


/* ─────────────────────────────────────────────────
 * 3. NAVIGATION
 * ───────────────────────────────────────────────── */

function initNavigation() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-menu a');

  // ── Scroll class ──
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.add('nav--scrolled');
      } else {
        nav.classList.remove('nav--scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on load in case page is already scrolled
    onScroll();
  }

  // ── Hamburger toggle ──
  function closeMenu() {
    hamburger.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('is-open');
      mobileMenu.classList.toggle('is-open', isOpen);
      mobileMenu.setAttribute('aria-hidden', String(!isOpen));
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // ── Close button inside mobile menu ──
  const mobileCloseBtn = document.querySelector('.mobile-menu-close');
  if (mobileCloseBtn && hamburger && mobileMenu) {
    mobileCloseBtn.addEventListener('click', closeMenu);
  }

  // ── Close on Escape key ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger && hamburger.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // ── Close menu on mobile link click ──
  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (hamburger && mobileMenu) closeMenu();
    });
  });

  // ── Active nav link based on current path ──
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const navLinks = document.querySelectorAll('.nav-link, .mobile-menu a');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.replace(/\/$/, '') || '/';
    // Match exact or treat index as root
    const isActive =
      linkPath === currentPath ||
      (currentPath === '/' && (linkPath === '/index.html' || linkPath === 'index.html')) ||
      (linkPath !== '/' && currentPath.endsWith(linkPath));
    if (isActive) link.classList.add('active');
  });
}


/* ─────────────────────────────────────────────────
 * 4. STATS COUNTER ANIMATION
 * ───────────────────────────────────────────────── */

function initStatsCounter() {
  const statsSection = document.querySelector('.stats-bar, .stats-section');
  if (!statsSection) return;

  let countersStarted = false;

  // Expose globally so animations.js ScrollTrigger can call it too
  window.startCounters = function () {
    if (countersStarted) return;
    countersStarted = true;

    const counterEls = document.querySelectorAll('.stats-number');
    counterEls.forEach((el) => {
      // Prefer the localStorage-stored value (set by admin), fall back to data-target
      const contentKey = el.getAttribute('data-key');
      const storedVal  = contentKey ? localStorage.getItem('uch_' + contentKey) : null;
      const target     = parseFloat(storedVal || el.getAttribute('data-target') || el.textContent) || 0;
      // Also sync data-target so GSAP ScrollTrigger counter in animations.js is consistent
      el.setAttribute('data-target', target);
      const suffix   = el.getAttribute('data-suffix') || '';
      const decimals = Number.isInteger(target) ? 0 : 1;
      animateCounter(el, target, 2000, suffix, decimals);
    });
  };

  // IntersectionObserver as fallback / primary trigger
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          window.startCounters();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.3 }
  );
  observer.observe(statsSection);
}

/**
 * Animate a counter element from 0 to target.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} duration - ms
 * @param {string} suffix
 * @param {number} decimals
 */
function animateCounter(el, target, duration, suffix = '', decimals = 0) {
  if (typeof gsap !== 'undefined') {
    // GSAP-based counter
    gsap.fromTo(
      { val: 0 },
      { val: target },
      {
        duration: duration / 1000,
        ease: 'power2.out',
        onUpdate: function () {
          el.textContent = this.targets()[0].val.toFixed(decimals) + suffix;
        },
      }
    );
  } else {
    // rAF-based fallback
    const startTime = performance.now();
    const startValue = 0;

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      const current = startValue + (target - startValue) * eased;
      el.textContent = current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }
}


/* ─────────────────────────────────────────────────
 * 5. FAQ ACCORDION
 * ───────────────────────────────────────────────── */

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question) return;

    question.addEventListener('click', () => {
      const isCurrentlyOpen = item.classList.contains('is-open');

      // Close all open items
      faqItems.forEach((otherItem) => {
        otherItem.classList.remove('is-open');
        const otherAnswer = otherItem.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.style.maxHeight = null;
      });

      // Open clicked item if it was closed
      if (!isCurrentlyOpen) {
        item.classList.add('is-open');
        if (answer) {
          // Set max-height to scrollHeight for smooth CSS transition
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      }
    });
  });
}


/* ─────────────────────────────────────────────────
 * 6. WORK / CASE STUDY FILTER
 * ───────────────────────────────────────────────── */

function initWorkFilter() {
  // Support both .filter-tab (work.html) and legacy .filter-btn
  const filterBtns = document.querySelectorAll('.filter-tab, .filter-btn');
  // Support both .case-study-full-card (work.html) and legacy .cs-full-card
  const caseCards  = document.querySelectorAll('.case-study-full-card, .cs-full-card');
  if (!filterBtns.length || !caseCards.length) return;

  const FILTER_ALL = 'all';

  // Two independent filter groups: "service" and "industry"
  // Each group's active filter is tracked separately.
  const activeFilters = { service: FILTER_ALL, industry: FILTER_ALL };

  function applyFilters() {
    caseCards.forEach((card) => {
      // data-filter-service="branding digital" OR legacy data-service
      const serviceAttr = (
        card.getAttribute('data-filter-service') ||
        card.getAttribute('data-service') || ''
      ).toLowerCase();
      const industryAttr = (
        card.getAttribute('data-filter-industry') ||
        card.getAttribute('data-industry') || ''
      ).toLowerCase();

      const svcMatch =
        activeFilters.service === FILTER_ALL ||
        serviceAttr.includes(activeFilters.service);
      const indMatch =
        activeFilters.industry === FILTER_ALL ||
        industryAttr.includes(activeFilters.industry);
      const matches = svcMatch && indMatch;

      if (typeof gsap !== 'undefined') {
        if (matches) {
          card.style.display = '';
          gsap.fromTo(
            card,
            { opacity: 0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
          );
        } else {
          gsap.to(card, {
            opacity: 0,
            scale: 0.96,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => { card.style.display = 'none'; },
          });
        }
      } else {
        card.style.display = matches ? '' : 'none';
      }
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const group       = btn.getAttribute('data-filter-group') || 'service';
      const filterValue = btn.getAttribute('data-filter') || FILTER_ALL;

      // Update active class within this group only
      document
        .querySelectorAll(`.filter-tab[data-filter-group="${group}"], .filter-btn[data-filter-group="${group}"]`)
        .forEach((b) => b.classList.remove('active'));

      // Fallback: no group attribute → clear all in same parent container
      if (!btn.getAttribute('data-filter-group')) {
        filterBtns.forEach((b) => b.classList.remove('active'));
      }

      btn.classList.add('active');
      activeFilters[group] = filterValue;
      applyFilters();
    });
  });
}


/* ─────────────────────────────────────────────────
 * 7. CASE STUDY EXPAND
 * ───────────────────────────────────────────────── */

function initCaseStudyExpand() {
  // Support .expand-toggle (work.html) and legacy .btn-expand
  const expandBtns = document.querySelectorAll('.expand-toggle, .btn-expand');
  if (!expandBtns.length) return;

  expandBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Support .case-study-full-card (work.html) and legacy containers
      const card = btn.closest('.case-study-full-card')
        || btn.closest('.cs-full-card')
        || btn.closest('.case-study-card');
      if (!card) return;

      // Support .case-study-expanded (work.html) and legacy .cs-expanded-content
      const expandedContent = card.querySelector('.case-study-expanded')
        || card.querySelector('.cs-expanded-content');
      if (!expandedContent) return;

      // .open for work.html; .is-visible for legacy
      const isOpen = expandedContent.classList.contains('open')
        || expandedContent.classList.contains('is-visible');

      if (isOpen) {
        expandedContent.classList.remove('open', 'is-visible');
        expandedContent.style.maxHeight = null;
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-hidden', 'false');
        expandedContent.setAttribute('aria-hidden', 'true');
        btn.textContent = '+ Read Full Case Study';
      } else {
        expandedContent.classList.add('open');
        // CSS handles max-height via transition; also set inline for legacy
        expandedContent.style.maxHeight = expandedContent.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
        expandedContent.setAttribute('aria-hidden', 'false');
        btn.textContent = '− Close';

        // Smooth scroll to content
        setTimeout(() => {
          const offset = 100;
          const top = expandedContent.getBoundingClientRect().top + window.scrollY - offset;
          if (window.lenisInstance) {
            window.lenisInstance.scrollTo(expandedContent, { offset: -offset, duration: 1 });
          } else {
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 50);
      }
    });
  });
}


/* ─────────────────────────────────────────────────
 * 8. FORM VALIDATION
 * ───────────────────────────────────────────────── */

function initFormValidation() {
  const contactForm = document.querySelector('.contact-form, #contact-form, form[data-validate]');
  if (!contactForm) return;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /**
   * Validate a single field.
   * @param {HTMLElement} field
   * @returns {boolean}
   */
  function validateField(field) {
    const name = field.name || field.id;
    const value = field.value.trim();
    // Look for error element: data-error attr, data-for attr, OR sibling .form-error-msg in same group
    const errorEl =
      contactForm.querySelector(`[data-error="${name}"]`) ||
      contactForm.querySelector(`.form-error[data-for="${name}"]`) ||
      field.closest('.form-group')?.querySelector('.form-error-msg') ||
      field.parentElement?.querySelector('.form-error-msg');
    let errorMsg = '';

    if (field.required && !value) {
      errorMsg = field.getAttribute('data-error-required') || 'This field is required.';
    } else if (field.type === 'email' && value && !EMAIL_REGEX.test(value)) {
      errorMsg = field.getAttribute('data-error-format') || 'Please enter a valid email address.';
    } else if (field.minLength > 0 && value.length < field.minLength) {
      errorMsg = field.getAttribute('data-error-min') || `Minimum ${field.minLength} characters required.`;
    }

    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.classList.toggle('visible', !!errorMsg);
    }
    field.classList.toggle('error',    !!errorMsg);   // matches CSS .form-input.error
    field.classList.toggle('is-valid', !errorMsg && !!value);

    return !errorMsg;
  }

  // Real-time validation on blur
  const fields = contactForm.querySelectorAll('input, textarea, select');
  fields.forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      // Clear error on typing if previously invalid
      if (field.classList.contains('error')) validateField(field);
    });
  });

  // Submit handler
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let allValid = true;
    fields.forEach((field) => {
      if (!validateField(field)) allValid = false;
    });

    if (!allValid) {
      // Shake animation
      contactForm.classList.add('shake');
      contactForm.addEventListener(
        'animationend',
        () => contactForm.classList.remove('shake'),
        { once: true }
      );
      return;
    }

    // All valid — show success message
    const successEl = contactForm.querySelector('.form-success') ||
      document.querySelector('.form-success');
    if (successEl) {
      successEl.style.display = 'block';    // override any inline display:none
      successEl.classList.add('visible');
      successEl.setAttribute('role', 'alert');
      setTimeout(() => {
        successEl.classList.remove('visible');
        successEl.style.display = '';
      }, 6000);
    }

    // Optionally submit via fetch if action is set
    const action = contactForm.getAttribute('action');
    if (action && action !== '#') {
      const formData = new FormData(contactForm);
      fetch(action, { method: 'POST', body: formData }).catch(console.error);
    }

    contactForm.reset();
    fields.forEach((field) => {
      field.classList.remove('is-valid', 'error');
    });
  });
}


/* ─────────────────────────────────────────────────
 * 9. TESTIMONIAL AUTO-ROTATE (mobile only)
 * ───────────────────────────────────────────────── */

function initTestimonialRotation() {
  const testimonials = document.querySelectorAll('.testimonial-card, .testimonial-item');
  if (testimonials.length < 2) return;

  let currentIndex = 0;
  let rotationInterval = null;

  function setActive(index) {
    testimonials.forEach((t, i) => t.classList.toggle('active', i === index));
  }

  function startRotation() {
    if (window.innerWidth >= 768) {
      // Desktop: show all, clear interval
      clearInterval(rotationInterval);
      testimonials.forEach((t) => t.classList.remove('active'));
      return;
    }
    // Mobile: init first active
    setActive(currentIndex);
    clearInterval(rotationInterval);
    rotationInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % testimonials.length;
      setActive(currentIndex);
    }, 5000);
  }

  startRotation();

  // Re-evaluate on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(startRotation, 200);
  });
}


/* ─────────────────────────────────────────────────
 * 10. WHATSAPP BUTTON
 * ───────────────────────────────────────────────── */

function initWhatsApp() {
  const waBtn = document.querySelector('.whatsapp-btn');
  if (!waBtn) return;

  const waNumber = loadContent('whatsapp_number', '8801XXXXXXXXX');
  const waMessage = encodeURIComponent(
    "Hi Umbrella Corp HQ, I'd like to discuss a project."
  );
  waBtn.href = `https://wa.me/${waNumber}?text=${waMessage}`;
  waBtn.setAttribute('target', '_blank');
  waBtn.setAttribute('rel', 'noopener noreferrer');
}


/* ─────────────────────────────────────────────────
 * 11. SOCIAL LINKS (footer)
 * Updates href values from localStorage if set by admin.
 * ───────────────────────────────────────────────── */

function initSocialLinks() {
  const SOCIAL_MAP = {
    instagram: 'https://instagram.com/umbrellacorphq',
    facebook:  'https://facebook.com/umbrellacorphq',
    linkedin:  'https://linkedin.com/company/umbrellacorphq',
    x:         'https://x.com/umbrellacorphq',
    tiktok:    '',
  };

  const footerLinks = document.querySelectorAll('.footer-social-link[aria-label]');
  footerLinks.forEach((link) => {
    const platform = link.getAttribute('aria-label')?.toLowerCase();
    if (!platform) return;
    const key = `social_${platform === 'x (twitter)' ? 'x' : platform}`;
    const stored = localStorage.getItem('uch_' + key);
    if (stored && stored.trim()) {
      link.href = stored.trim();
    } else if (SOCIAL_MAP[platform]) {
      link.href = SOCIAL_MAP[platform];
    }
  });
}
