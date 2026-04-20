/**
 * freelancers/js/login.js
 * Handles freelancer authentication on the login page.
 */

import { loginFreelancer, signInWithGoogle, onAuthChange, getFreelancerProfile, logoutFreelancer } from '../../js/firebase.js';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const form      = document.getElementById('fl-login-form');
const emailIn   = document.getElementById('fl-email');
const passIn    = document.getElementById('fl-password');
const errorBox  = document.getElementById('fl-login-error');
const btn       = document.getElementById('fl-login-btn');
const btnText   = document.getElementById('fl-login-btn-text');
const spinner   = document.getElementById('fl-login-spinner');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
  errorBox.classList.add('fl-error-shake');
  setTimeout(() => errorBox.classList.remove('fl-error-shake'), 500);
}

function hideError() {
  errorBox.style.display = 'none';
  errorBox.textContent = '';
}

function setLoading(loading) {
  btn.disabled  = loading;
  btnText.style.display  = loading ? 'none' : 'inline';
  spinner.style.display  = loading ? 'inline' : 'none';
}

// ─── Auth state: redirect if already approved ────────────────────────────────
// Flag: true while a Google popup is in progress — prevents the auth listener
// from calling logoutFreelancer() mid-popup, which would kill the popup instantly.
let googleAuthInProgress = false;

const unsubscribe = onAuthChange(async (user) => {
  if (!user) return;
  if (googleAuthInProgress) return;  // ← never touch auth during active Google flow
  try {
    const profile = await getFreelancerProfile(user.uid);
    if (profile && profile.status === 'approved') {
      unsubscribe();
      window.location.href = 'dashboard.html';
    }
    // For pending/rejected: do NOT auto-logout here.
    // The email/password form handler shows the correct error message after submit.
    // The Google handler deals with its own flow separately.
  } catch (_) {
    // Network error — let them attempt login normally.
  }
});

// ─── Form submit ─────────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email    = emailIn.value.trim();
  const password = passIn.value;

  if (!email || !password) {
    showError('Please enter your email address and password.');
    return;
  }

  setLoading(true);

  try {
    const { error } = await loginFreelancer(email, password);

    if (!error) {
      // Success — dashboard.js will verify status again; redirect now.
      window.location.href = 'dashboard.html';
      return;
    }

    const code = error?.code || '';

    if (code === 'pending') {
      showError('Your application is still under review. We\u2019ll notify you within 48 hours.');
    } else if (code === 'rejected') {
      showError('Your application was not approved. Contact hello@umbrellacorphq.com for details.');
    } else if (code === 'suspended') {
      showError('Your account has been suspended. Contact hello@umbrellacorphq.com.');
    } else if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-email'
    ) {
      showError('Invalid email or password.');
    } else {
      showError('Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('Login error:', err);
    showError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});

// ─── Google Sign-in ───────────────────────────────────────────────────────────
const googleBtn = document.getElementById('btn-google-login');
if (googleBtn) {
  googleBtn.addEventListener('click', async () => {
    hideError();
    googleBtn.disabled    = true;
    googleBtn.textContent = 'Connecting…';

    googleAuthInProgress = true;                    // ← block auto-logout
    const { uid, isNew, error } = await signInWithGoogle();
    googleAuthInProgress = false;                   // ← restore

    googleBtn.disabled  = false;
    googleBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continue with Google`;

    if (error) {
      const code = error.code || '';
      const msg =
        code === 'auth/popup-closed-by-user'    ? 'Popup was closed. Try again.' :
        code === 'auth/popup-blocked'            ? 'Popup was blocked by your browser. Allow popups for this site and try again.' :
        code === 'auth/cancelled-popup-request'  ? 'Another sign-in is already in progress.' :
        code === 'auth/unauthorized-domain'      ? 'This domain is not authorised in Firebase. Add localhost to Firebase Console → Auth → Authorized Domains.' :
        'Google sign-in failed. Please try again.';
      showError(msg);
      return;
    }

    if (isNew) {
      // Brand new Google account — send to register to complete profile
      window.location.href = 'register.html';
      return;
    }

    // Existing account — go to dashboard (dashboard.js will verify status)
    window.location.href = 'dashboard.html';
  });
}

// ─── Input: clear error on keystroke ─────────────────────────────────────────
emailIn.addEventListener('input', hideError);
passIn.addEventListener('input',  hideError);
