/* ═══════════════════════════════════════════════════════════
   THEME + LANGUAGE SYSTEM — Umbrella Corp HQ
   Light / Dark toggle  +  English / Bangla translation
   Auto-injects toggle widget into every page's nav
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Keys ───────────────────────────────────────────────── */
  var THEME_KEY = 'uch-theme';
  var LANG_KEY  = 'uch-lang';

  /* ─── State ─────────────────────────────────────────────── */
  var theme = localStorage.getItem(THEME_KEY) || 'dark';
  var lang  = localStorage.getItem(LANG_KEY)  || 'en';

  /* ─── Apply theme immediately — no flash ────────────────── */
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-lang',  lang);

  /* ─── DOMContentLoaded ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    injectToggles();
    applyLang(lang, false);
    updateUI();
  });

  /* ════════════════════════════════════════════════════════
     TOGGLE WIDGET — injected before .nav-cta in every page
  ════════════════════════════════════════════════════════ */
  function injectToggles() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    var wrap = document.createElement('div');
    wrap.className = 'uch-toggles';
    wrap.setAttribute('aria-label', 'Theme and language controls');

    wrap.innerHTML =
      '<button class="uch-theme-btn" id="uchThemeBtn" aria-label="Toggle light/dark mode" title="Day / Night mode">' +
        '<svg class="uch-ico uch-ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
        '<svg class="uch-ico uch-ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>' +
      '</button>' +
      '<div class="uch-lang-pill">' +
        '<button class="uch-lang-opt" id="uchLangEN"  aria-label="Switch to English">EN</button>' +
        '<button class="uch-lang-opt" id="uchLangBN"  aria-label="Switch to Bangla">বাং</button>' +
      '</div>';

    /* Insert before .nav-cta, or append */
    var cta = navLinks.querySelector('.nav-cta');
    if (cta) {
      navLinks.insertBefore(wrap, cta);
    } else {
      navLinks.appendChild(wrap);
    }

    /* Events */
    document.getElementById('uchThemeBtn').addEventListener('click', toggleTheme);
    document.getElementById('uchLangEN').addEventListener('click', function () { setLang('en'); });
    document.getElementById('uchLangBN').addEventListener('click', function () { setLang('bn'); });
  }

  /* ════════════════════════════════════════════════════════
     THEME
  ════════════════════════════════════════════════════════ */
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateUI();
    /* Notify hero3d.js */
    window.dispatchEvent(new CustomEvent('uch-themechange', { detail: { theme: theme } }));
  }

  /* ════════════════════════════════════════════════════════
     LANGUAGE
  ════════════════════════════════════════════════════════ */
  function setLang(l) {
    if (lang === l) return;
    lang = l;
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    localStorage.setItem(LANG_KEY, lang);
    applyLang(lang, true);
    updateUI();
  }

  function applyLang(l, animate) {
    /* Text nodes */
    var els = document.querySelectorAll('[data-bn]');
    for (var i = 0; i < els.length; i++) {
      (function (el) {
        var val = l === 'bn' ? el.getAttribute('data-bn') : (el.getAttribute('data-en') || el.getAttribute('data-bn'));
        if (val === null) return;
        if (animate) {
          el.style.transition = 'opacity 0.15s ease';
          el.style.opacity = '0';
          setTimeout(function () {
            el.textContent = val;
            el.style.opacity = '1';
          }, 150);
        } else {
          el.textContent = val;
        }
      })(els[i]);
    }
    /* Placeholder text */
    var phs = document.querySelectorAll('[data-bn-placeholder]');
    for (var j = 0; j < phs.length; j++) {
      var ph = phs[j];
      if (l === 'bn') {
        ph.setAttribute('placeholder', ph.getAttribute('data-bn-placeholder'));
      } else {
        ph.setAttribute('placeholder', ph.getAttribute('data-en-placeholder') || '');
      }
    }
  }

  /* ════════════════════════════════════════════════════════
     UI STATE
  ════════════════════════════════════════════════════════ */
  function updateUI() {
    var btn = document.getElementById('uchThemeBtn');
    var enBtn = document.getElementById('uchLangEN');
    var bnBtn = document.getElementById('uchLangBN');
    if (btn) btn.setAttribute('data-theme', theme);
    if (enBtn) enBtn.classList.toggle('is-active', lang === 'en');
    if (bnBtn) bnBtn.classList.toggle('is-active', lang === 'bn');
  }

  /* ─── Expose for external use ────────────────────────────── */
  window.UCHTheme = {
    get: function () { return theme; },
    getLang: function () { return lang; }
  };

})();
