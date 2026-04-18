/**
 * Umbrella Corp HQ — Public Content API
 * ─────────────────────────────────────────────────────────────
 * Stale-while-revalidate strategy:
 *  1. Apply localStorage cache IMMEDIATELY (zero flash)
 *  2. If Supabase is configured, fetch fresh content in background
 *  3. Update DOM + refresh localStorage cache with cloud data
 *
 * The public anon key only has SELECT rights (via RLS).
 * Admin writes are protected — public visitors cannot modify data.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  const KEY_PREFIX = 'uch_';

  /* ── Supabase client (lazy, null-safe) ── */
  let _sb = null;

  function getSupabase() {
    if (_sb) return _sb;

    // Config lives in js/supabase-config.js (loaded before this file)
    const url = window.UCH_SUPABASE_URL;
    const key = window.UCH_SUPABASE_ANON_KEY;

    if (
      !url || !key ||
      url.includes('YOUR_PROJECT_REF') ||
      key.includes('YOUR_ANON')
    ) return null;

    if (typeof window.supabase === 'undefined') return null;

    _sb = window.supabase.createClient(url, key);
    return _sb;
  }

  /* ── Apply a flat { key: value } map to DOM ── */
  function applyToDOM(map) {
    document.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.getAttribute('data-key');
      if (!key) return;

      const value = map[key] !== undefined
        ? map[key]
        : el.getAttribute('data-default') || null;

      if (value === null) return;

      if (/<[a-z][\s\S]*>/i.test(value)) {
        el.innerHTML = value;
      } else {
        el.textContent = value;
      }
    });
  }

  /* ── Build map from localStorage ── */
  function localMap() {
    const map = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) {
        map[k.slice(KEY_PREFIX.length)] = localStorage.getItem(k);
      }
    }
    return map;
  }

  /* ── Main entry point ── */
  async function applyAll() {
    // ①  Apply localStorage immediately — no flash
    applyToDOM(localMap());

    // ②  If Supabase configured, revalidate in background
    const sb = getSupabase();
    if (!sb) return;

    try {
      const { data, error } = await sb
        .from('site_content')
        .select('key, value');

      if (error || !data || !data.length) return;

      // Update localStorage cache
      data.forEach(({ key, value }) => {
        localStorage.setItem(KEY_PREFIX + key, value);
      });

      // Re-apply fresh data to DOM
      const freshMap = Object.fromEntries(data.map((r) => [r.key, r.value]));
      applyToDOM(freshMap);
    } catch (e) {
      // Network unavailable — cache already applied, silent fail
    }
  }

  window.ContentAPI = { applyAll };
})();
