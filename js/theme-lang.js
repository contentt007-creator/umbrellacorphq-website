/* ═══════════════════════════════════════════════════════════
   THEME SYSTEM — Umbrella Corp HQ
   Light / Dark toggle — auto-injected into every page's nav
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var THEME_KEY = 'uch-theme';

  /* ─── State ─────────────────────────────────────────────── */
  var theme = localStorage.getItem(THEME_KEY) || 'dark';

  /* ─── Apply theme immediately — no flash ────────────────── */
  document.documentElement.setAttribute('data-theme', theme);

  /* ─── DOMContentLoaded ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    injectToggle();
    updateUI();
  });

  /* ════════════════════════════════════════════════════════
     TOGGLE WIDGET — injected before .nav-cta in every page
  ════════════════════════════════════════════════════════ */
  function injectToggle() {
    var navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    var btn = document.createElement('button');
    btn.className   = 'uch-theme-btn';
    btn.id          = 'uchThemeBtn';
    btn.setAttribute('aria-label', 'Toggle light/dark mode');
    btn.setAttribute('title', 'Day / Night mode');
    btn.innerHTML =
      '<svg class="uch-ico uch-ico-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
      '<svg class="uch-ico uch-ico-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

    btn.addEventListener('click', toggleTheme);

    /* Insert before .nav-cta, or append */
    var cta = navLinks.querySelector('.nav-cta');
    if (cta) {
      navLinks.insertBefore(btn, cta);
    } else {
      navLinks.appendChild(btn);
    }
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
     UI STATE
  ════════════════════════════════════════════════════════ */
  function updateUI() {
    var btn = document.getElementById('uchThemeBtn');
    if (btn) btn.setAttribute('data-theme', theme);
  }

  /* ─── Expose for external use ────────────────────────────── */
  window.UCHTheme = {
    get: function () { return theme; }
  };

})();
