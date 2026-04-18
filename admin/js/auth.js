/**
 * Umbrella Corp HQ — Admin Authentication
 *
 * IMPORTANT SECURITY NOTES:
 * - This uses client-side password checking in localStorage — for MVP/static site only.
 * - For production: replace with server-side authentication (JWT, OAuth, Firebase Auth, etc.)
 * - NEVER deploy this on HTTP — always use HTTPS.
 * - TODO: Replace hardcoded password with backend auth before going live.
 * - Consider rate-limiting login attempts to prevent brute force.
 */

// TODO: Replace with backend auth in production
const ADMIN_PASSWORD = 'UCH@admin2025';
const SESSION_KEY    = 'uch_admin_session';
const SESSION_TTL    = 4 * 60 * 60 * 1000; // 4 hours in ms

/**
 * Check if a valid admin session exists in sessionStorage.
 * Returns true if logged in and session has not expired.
 */
function isLoggedIn() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;

  try {
    const session = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return session.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Attempt login with provided password.
 * Returns true on success, false on failure.
 */
function attemptLogin(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      authenticated: true,
      timestamp: Date.now(),
    }));
    return true;
  }
  return false;
}

/**
 * Log out: clear session and redirect to login
 */
function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

// ─── Login Form Handler ───────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen    = document.getElementById('login-screen');
  const dashboard      = document.getElementById('admin-dashboard');
  const loginForm      = document.getElementById('login-form');
  const passwordInput  = document.getElementById('login-password');
  const errorMsg       = document.getElementById('login-error');
  const loginCard      = document.querySelector('.login-card');
  const logoutBtn      = document.getElementById('logout-btn');

  // ── Gate: check if already authenticated ──
  if (isLoggedIn()) {
    showDashboard();
  }

  // ── Login form submission ──
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = passwordInput?.value || '';

      if (attemptLogin(password)) {
        showDashboard();
      } else {
        // Show error + shake animation
        if (errorMsg) {
          errorMsg.textContent = 'Incorrect password. Please try again.';
          errorMsg.classList.add('visible');
        }
        if (loginCard) {
          loginCard.classList.remove('shake');
          void loginCard.offsetWidth; // reflow to restart animation
          loginCard.classList.add('shake');
        }
        if (passwordInput) passwordInput.value = '';
      }
    });

    // Clear error on input
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (errorMsg) errorMsg.classList.remove('visible');
      });
    }
  }

  // ── Logout button ──
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Log out of admin panel?')) {
        logout();
      }
    });
  }

  function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboard)   dashboard.classList.add('visible');
  }
});
