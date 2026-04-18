/**
 * Umbrella Corp HQ — Admin Authentication
 * ─────────────────────────────────────────────────────────────
 * DUAL MODE:
 *   ① Supabase mode  — when UCH_SUPABASE_URL is filled in
 *      Real server-side auth via email + password (JWT tokens).
 *      Password is NEVER in source code or visible to browser.
 *
 *   ② Legacy mode    — when Supabase is not yet configured
 *      Falls back to the original client-side password check.
 *      Suitable for solo MVP use on a private machine.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Legacy fallback config (only used if Supabase not set up) ── */
const LEGACY_PASSWORD = 'UCH@admin2025';
const LEGACY_SESSION  = 'uch_admin_session';
const LEGACY_TTL      = 4 * 60 * 60 * 1000; // 4 hours

/* ─────────────────────────────────────────────────────────────
 * Supabase client (lazy-init, returns null if not configured)
 * ───────────────────────────────────────────────────────────── */
let _sb = null;

function getSupabaseClient() {
  if (_sb) return _sb;

  const url = window.UCH_SUPABASE_URL;
  const key = window.UCH_SUPABASE_ANON_KEY;

  // Not configured yet — return null to trigger legacy mode
  if (
    !url || !key ||
    url.includes('YOUR_PROJECT_REF') ||
    key.includes('YOUR_ANON')
  ) return null;

  if (typeof window.supabase === 'undefined') {
    console.warn('[UCH] supabase-js not loaded. Check CDN script tag.');
    return null;
  }

  _sb = window.supabase.createClient(url, key);
  return _sb;
}

function isSupabaseMode() {
  return !!getSupabaseClient();
}

/* ─────────────────────────────────────────────────────────────
 * isLoggedIn — async check for both modes
 * ───────────────────────────────────────────────────────────── */
async function isLoggedIn() {
  const sb = getSupabaseClient();

  if (sb) {
    const { data: { session } } = await sb.auth.getSession();
    return !!session;
  }

  // Legacy: check sessionStorage timestamp
  try {
    const raw = sessionStorage.getItem(LEGACY_SESSION);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (Date.now() - s.timestamp > LEGACY_TTL) {
      sessionStorage.removeItem(LEGACY_SESSION);
      return false;
    }
    return s.authenticated === true;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────────────────────────
 * attemptLogin — returns { success, message }
 * ───────────────────────────────────────────────────────────── */
async function attemptLogin(emailOrEmpty, password) {
  const sb = getSupabaseClient();

  if (sb) {
    const { error } = await sb.auth.signInWithPassword({
      email:    emailOrEmpty,
      password: password,
    });

    if (error) {
      return {
        success: false,
        message: error.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : error.message,
      };
    }
    return { success: true };
  }

  // Legacy mode — password only
  if (password === LEGACY_PASSWORD) {
    sessionStorage.setItem(LEGACY_SESSION, JSON.stringify({
      authenticated: true,
      timestamp:     Date.now(),
    }));
    return { success: true };
  }
  return { success: false, message: 'Incorrect password.' };
}

/* ─────────────────────────────────────────────────────────────
 * logout
 * ───────────────────────────────────────────────────────────── */
async function logout() {
  const sb = getSupabaseClient();
  if (sb) await sb.auth.signOut();
  sessionStorage.removeItem(LEGACY_SESSION);
  window.location.reload();
}

/* ─────────────────────────────────────────────────────────────
 * DOM — Login form handler
 * ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const loginScreen   = document.getElementById('login-screen');
  const dashboard     = document.getElementById('admin-dashboard');
  const loginForm     = document.getElementById('login-form');
  const emailInput    = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const errorMsg      = document.getElementById('login-error');
  const loginCard     = document.querySelector('.login-card');
  const logoutBtn     = document.getElementById('logout-btn');
  const modeBadge     = document.getElementById('auth-mode-badge');

  // ── Show mode indicator ──
  if (modeBadge) {
    modeBadge.textContent = isSupabaseMode() ? 'Supabase Auth' : 'Legacy Mode';
    modeBadge.className   = 'auth-mode-badge ' + (isSupabaseMode() ? 'mode-supabase' : 'mode-legacy');
  }

  // ── Show/hide email field based on mode ──
  const emailGroup = document.getElementById('email-group');
  if (emailGroup) {
    emailGroup.style.display = isSupabaseMode() ? '' : 'none';
  }

  // Update legacy hint visibility
  const legacyHint = document.getElementById('legacy-hint');
  if (legacyHint) {
    legacyHint.style.display = isSupabaseMode() ? 'none' : '';
  }

  // ── Gate: check if already authenticated ──
  if (await isLoggedIn()) {
    showDashboard();
  }

  // ── Login form submission ──
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email    = emailInput    ? emailInput.value.trim()    : '';
      const password = passwordInput ? passwordInput.value.trim() : '';
      const submitBtn = loginForm.querySelector('[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled    = true;
        submitBtn.textContent = 'Verifying…';
      }

      const result = await attemptLogin(email, password);

      if (result.success) {
        showDashboard();
      } else {
        if (errorMsg) {
          errorMsg.textContent = result.message || 'Login failed.';
          errorMsg.classList.add('visible');
        }
        if (loginCard) {
          loginCard.classList.remove('shake');
          void loginCard.offsetWidth;
          loginCard.classList.add('shake');
        }
        if (passwordInput) passwordInput.value = '';
        if (submitBtn) {
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Access Dashboard';
        }
      }
    });

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (errorMsg) errorMsg.classList.remove('visible');
      });
    }
  }

  // ── Logout button ──
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Log out of admin panel?')) logout();
    });
  }

  function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboard)   dashboard.classList.add('visible');
  }
});

// Expose for storage.js to reuse
window.getSupabaseClient = getSupabaseClient;
window.isSupabaseMode    = isSupabaseMode;
