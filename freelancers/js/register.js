/**
 * register.js — Freelancer Registration (4-step form)
 * Imports from Firebase utility layer
 */
import { registerFreelancer, signInWithGoogle, createGoogleFreelancerProfile, getFreelancerProfile, updateFreelancerProfile, getCurrentUser, EVENT_TYPES, EQUIPMENT_TAGS, BD_DISTRICTS, generateId } from '../../js/firebase.js';

// ─── State ────────────────────────────────────────────────────────────────────
let currentStep    = 1;
const TOTAL_STEPS  = 4;
let profilePhotoDataUrl = null;
let skillsArray    = [];
let toolsArray     = [];
let portfolioItems = []; // array of { id, title, category, thumbnailDataUrl, description, tools[] }

// ─── DOM refs ────────────────────────────────────────────────────────────────
const btnNext   = document.getElementById('btn-next');
const btnBack   = document.getElementById('btn-back');
const btnSubmit = document.getElementById('btn-submit');
const formNav   = document.getElementById('form-nav');
const regSuccess = document.getElementById('reg-success');

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateDistricts();
  setupBioCounter();
  setupCapacitySlider();
  setupProfilePhoto();
  setupSkillTagInput();
  setupToolTagInput();
  setupPortfolioSection();
  setupStepNavigation();
  setupAgreementDate();
  setupGoogleSignIn();
});

// ─── Google Sign-in ───────────────────────────────────────────────────────────
let googleSignedIn = false; // true when user completed Google auth (skip password fields)

const GOOGLE_BTN_DEFAULT_HTML = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Continue with Google`;

function setGoogleBtn(btn, state, msg = '') {
  const styles = {
    default:    { bg: '#fff',    color: '#1a1a1a', border: 'none',              cursor: 'pointer',  html: GOOGLE_BTN_DEFAULT_HTML },
    loading:    { bg: '#f0f0f0', color: '#666',    border: 'none',              cursor: 'wait',     html: msg || 'Connecting…' },
    checking:   { bg: '#f0f0f0', color: '#666',    border: 'none',              cursor: 'wait',     html: msg || 'Checking account…' },
    success:    { bg: '#0a2a0a', color: '#3ecf8e', border: '1px solid #3ecf8e', cursor: 'default',  html: msg || '✓ Google account connected — continue below' },
  };
  const s = styles[state] || styles.default;
  btn.disabled         = state === 'loading' || state === 'checking';
  btn.style.background = s.bg;
  btn.style.color      = s.color;
  btn.style.border     = s.border;
  btn.style.cursor     = s.cursor;
  btn.innerHTML        = s.html;
}

function setupGoogleSignIn() {
  const btn = document.getElementById('btn-google-signup');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    clearError();

    // ── Step 1: open Google popup ──────────────────────────────────────────
    setGoogleBtn(btn, 'loading', 'Opening Google sign-in…');

    const { uid, email, name, photo, error: authError } = await signInWithGoogle();

    if (authError) {
      setGoogleBtn(btn, 'default');
      const code = authError.code || '';
      showError(
        code === 'auth/popup-closed-by-user'   ? 'Sign-in popup was closed. Try again.' :
        code === 'auth/popup-blocked'           ? 'Pop-up blocked by browser — allow pop-ups for localhost and retry.' :
        code === 'auth/cancelled-popup-request' ? 'Another sign-in is already in progress.' :
        code === 'auth/unauthorized-domain'     ? 'localhost is not authorised. Add it in Firebase Console → Auth → Authorized Domains.' :
        code === 'auth/configuration-not-found' ? 'Google Sign-In is not enabled. Firebase Console → Authentication → Sign-in method → Google → Enable.' :
        `Google sign-in failed (${code || 'unknown'}). Try again.`
      );
      return;
    }

    // ── Step 2: check if profile already exists ───────────────────────────
    setGoogleBtn(btn, 'checking', 'Checking your account…');

    let existing = null;
    try {
      existing = await getFreelancerProfile(uid);
    } catch (profileErr) {
      // Firestore might be blocked by security rules for this user
      setGoogleBtn(btn, 'default');
      showError('Could not reach the database. Check your Firestore security rules allow authenticated reads, then try again.');
      return;
    }

    if (existing) {
      // Already registered — send straight to dashboard
      window.location.href = 'dashboard.html';
      return;
    }

    // ── Step 3: first time — create minimal profile stub ──────────────────
    setGoogleBtn(btn, 'checking', 'Setting up your account…');
    try {
      await createGoogleFreelancerProfile({ uid, email, name, photo });
    } catch (createErr) {
      setGoogleBtn(btn, 'default');
      showError('Failed to create your profile. Check Firestore security rules allow authenticated writes, then try again.');
      return;
    }

    // ── Step 4: pre-fill Step 1 fields from Google account data ──────────
    googleSignedIn = true;

    // Hide password fields — not needed for Google users
    document.getElementById('reg-password')?.closest('.fl-field')?.style.setProperty('display', 'none');
    document.getElementById('reg-password2')?.closest('.fl-field')?.style.setProperty('display', 'none');

    // Pre-fill name and email from Google
    const nameEl  = document.getElementById('fullName');
    const emailEl = document.getElementById('reg-email');
    if (nameEl  && !nameEl.value)  nameEl.value  = name;
    if (emailEl && !emailEl.value) emailEl.value = email;

    setGoogleBtn(btn, 'success', '✓ Google account connected — continue below →');
    clearError();
    goToStep(2);
  });
}

// ─── Districts ────────────────────────────────────────────────────────────────
function populateDistricts() {
  const sel = document.getElementById('location');
  if (!sel) return;
  BD_DISTRICTS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
}

// ─── Bio counter ─────────────────────────────────────────────────────────────
function setupBioCounter() {
  const bio   = document.getElementById('bio');
  const count = document.getElementById('bio-count');
  if (!bio || !count) return;
  bio.addEventListener('input', () => { count.textContent = bio.value.length; });
}

// ─── Capacity slider ─────────────────────────────────────────────────────────
function setupCapacitySlider() {
  const slider = document.getElementById('weeklyCapacity');
  const val    = document.getElementById('capacity-val');
  if (!slider || !val) return;
  slider.addEventListener('input', () => { val.textContent = slider.value; });
}

// ─── Profile photo upload ────────────────────────────────────────────────────
function setupProfilePhoto() {
  const area    = document.getElementById('photo-upload-area');
  const input   = document.getElementById('profile-photo-input');
  const preview = document.getElementById('photo-preview');
  if (!area || !input || !preview) return;

  area.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      profilePhotoDataUrl = e.target.result;
      preview.style.backgroundImage = `url(${e.target.result})`;
      preview.style.backgroundSize  = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.innerHTML = '';
    };
    reader.readAsDataURL(file);
  });
}

// ─── Tag input (event specialisations) ───────────────────────────────────────
function setupSkillTagInput() {
  setupTagInput(
    'skills-input', 'skills-tags', 'skills-suggestions',
    skillsArray, EVENT_TYPES
  );
}

function setupToolTagInput() {
  setupTagInput(
    'tools-input', 'tools-tags', 'tools-suggestions',
    toolsArray, EQUIPMENT_TAGS
  );
}

function setupTagInput(inputId, tagsId, suggestionsId, arr, suggestions) {
  const input     = document.getElementById(inputId);
  const tagsEl    = document.getElementById(tagsId);
  const suggestEl = suggestionsId ? document.getElementById(suggestionsId) : null;
  if (!input || !tagsEl) return;

  function renderTags() {
    tagsEl.innerHTML = arr.map(t => `
      <span class="fl-tag-chip">${t}
        <button type="button" class="fl-tag-remove" data-tag="${t}" aria-label="Remove ${t}">×</button>
      </span>`).join('');
    tagsEl.querySelectorAll('.fl-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = arr.indexOf(btn.dataset.tag);
        if (idx > -1) { arr.splice(idx, 1); renderTags(); }
      });
    });
  }

  function addTag(value) {
    const v = value.trim();
    if (v && !arr.includes(v)) { arr.push(v); renderTags(); }
    input.value = '';
    if (suggestEl) suggestEl.innerHTML = '';
  }

  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      addTag(input.value);
    }
    if (e.key === 'Backspace' && !input.value && arr.length) {
      arr.pop(); renderTags();
    }
  });

  if (suggestEl) {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) { suggestEl.innerHTML = ''; return; }
      const matches = suggestions.filter(s =>
        s.toLowerCase().includes(q) && !arr.includes(s)
      ).slice(0, 8);
      suggestEl.innerHTML = matches.map(m =>
        `<div class="fl-suggestion-item" data-val="${m}">${m}</div>`
      ).join('');
      suggestEl.querySelectorAll('.fl-suggestion-item').forEach(item => {
        item.addEventListener('click', () => addTag(item.dataset.val));
      });
    });
  }
}

// ─── Portfolio section ────────────────────────────────────────────────────────
function setupPortfolioSection() {
  const addBtn    = document.getElementById('add-portfolio-item');
  const container = document.getElementById('portfolio-items-container');
  if (!addBtn || !container) return;

  addBtn.addEventListener('click', () => {
    if (portfolioItems.length >= 10) { showError('Maximum 10 portfolio items allowed.'); return; }
    addPortfolioItem();
  });

  // Add first 3 items by default to hint at the minimum
  addPortfolioItem();
  addPortfolioItem();
  addPortfolioItem();
}

function addPortfolioItem() {
  const id        = generateId('PI');
  const container = document.getElementById('portfolio-items-container');
  const n         = portfolioItems.length + 1;
  const data      = { id, title: '', category: '', thumbnailDataUrl: null, description: '', tools: [] };
  portfolioItems.push(data);

  const div = document.createElement('div');
  div.className = 'fl-portfolio-item';
  div.dataset.itemId = id;
  div.innerHTML = `
    <div class="fl-portfolio-item-header">
      <span>Portfolio Item #${n}</span>
      <button type="button" class="fl-remove-item" data-id="${id}">Remove</button>
    </div>
    <div class="fl-portfolio-item-body">
      <div class="fl-field">
        <label>Title *</label>
        <input type="text" class="fl-input pi-title" placeholder="e.g. Rahman Wedding — Gulshan 2024" data-id="${id}">
      </div>
      <div class="fl-field">
        <label>Event Type *</label>
        <select class="fl-input fl-select pi-category" data-id="${id}">
          <option value="">Select event type...</option>
          <option>Wedding / Marriage</option>
          <option>Birthday Party</option>
          <option>Influencer Shoot</option>
          <option>Product Shoot</option>
          <option>Corporate Event</option>
          <option>Fashion / Editorial</option>
          <option>Engagement / Pre-wedding</option>
          <option>Baby Shower</option>
          <option>Music Video</option>
          <option>Documentary</option>
          <option>Real Estate</option>
          <option>Food Photography</option>
          <option>Other</option>
        </select>
      </div>
      <div class="fl-field">
        <label>Thumbnail Image *</label>
        <div class="fl-img-upload-area pi-thumb-area" data-id="${id}">
          <input type="file" class="pi-thumb-input" accept="image/*" data-id="${id}" style="display:none">
          <div class="pi-thumb-preview" data-id="${id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:24px;height:24px;color:var(--steel)"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <p style="font-size:13px;color:var(--steel);margin-top:8px">Click to upload thumbnail</p>
          </div>
        </div>
      </div>
      <div class="fl-field">
        <label>Description</label>
        <textarea class="fl-input fl-textarea pi-desc" rows="2" placeholder="What was the brief? What did you create?" data-id="${id}"></textarea>
      </div>
      <div class="fl-field">
        <label>Equipment Used</label>
        <div class="fl-tag-input-wrap">
          <div class="fl-tags-display pi-tools-tags" data-id="${id}"></div>
          <input type="text" class="fl-tag-input pi-tools-input" placeholder="e.g. Sony A7IV, DJI Ronin, Lightroom" data-id="${id}">
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);

  // Wire up thumbnail upload
  const thumbArea  = div.querySelector('.pi-thumb-area');
  const thumbInput = div.querySelector('.pi-thumb-input');
  const thumbPrev  = div.querySelector('.pi-thumb-preview');
  thumbArea.addEventListener('click', () => thumbInput.click());
  thumbInput.addEventListener('change', () => {
    const file = thumbInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      data.thumbnailDataUrl = e.target.result;
      thumbPrev.style.backgroundImage = `url(${e.target.result})`;
      thumbPrev.style.backgroundSize  = 'cover';
      thumbPrev.style.backgroundPosition = 'center';
      thumbPrev.style.minHeight = '120px';
      thumbPrev.innerHTML = '';
    };
    reader.readAsDataURL(file);
  });

  // Wire up tools tag input
  const toolInput = div.querySelector('.pi-tools-input');
  const toolTags  = div.querySelector('.pi-tools-tags');
  toolInput.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && toolInput.value.trim()) {
      e.preventDefault();
      const v = toolInput.value.trim();
      if (!data.tools.includes(v)) {
        data.tools.push(v);
        renderItemTools(toolTags, data.tools);
      }
      toolInput.value = '';
    }
    if (e.key === 'Backspace' && !toolInput.value && data.tools.length) {
      data.tools.pop(); renderItemTools(toolTags, data.tools);
    }
  });

  // Wire up text fields
  div.querySelector('.pi-title').addEventListener('input', e => { data.title = e.target.value; });
  div.querySelector('.pi-category').addEventListener('change', e => { data.category = e.target.value; });
  div.querySelector('.pi-desc').addEventListener('input', e => { data.description = e.target.value; });

  // Remove button
  div.querySelector('.fl-remove-item').addEventListener('click', () => {
    const idx = portfolioItems.findIndex(p => p.id === id);
    if (idx > -1) portfolioItems.splice(idx, 1);
    div.remove();
  });
}

function renderItemTools(el, arr) {
  el.innerHTML = arr.map(t => `<span class="fl-tag-chip">${t}</span>`).join('');
}

// ─── Agreement date ───────────────────────────────────────────────────────────
function setupAgreementDate() {
  const dateEl = document.getElementById('agree-date');
  if (dateEl) {
    dateEl.value = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }
}

// ─── Step navigation ──────────────────────────────────────────────────────────
function setupStepNavigation() {
  btnNext?.addEventListener('click', () => {
    if (validateStep(currentStep)) goToStep(currentStep + 1);
  });
  btnBack?.addEventListener('click', () => goToStep(currentStep - 1));
  btnSubmit?.addEventListener('click', handleSubmit);
}

function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;

  // Hide current step
  document.getElementById(`step-${currentStep}`)?.style?.setProperty('display', 'none');
  // Show new step
  const newStep = document.getElementById(`step-${n}`);
  if (newStep) { newStep.style.display = ''; }

  currentStep = n;
  updateStepBar();
  updateNavButtons();

  // Scroll to top of form
  document.querySelector('.fl-register-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateStepBar() {
  document.querySelectorAll('.fl-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === currentStep) el.classList.add('active');
    else if (s < currentStep) el.classList.add('done');
  });
}

function updateNavButtons() {
  if (!btnBack || !btnNext || !btnSubmit) return;
  btnBack.style.display   = currentStep > 1 ? '' : 'none';
  btnNext.style.display   = currentStep < TOTAL_STEPS ? '' : 'none';
  btnSubmit.style.display = currentStep === TOTAL_STEPS ? '' : 'none';
}

// ─── Step validation ──────────────────────────────────────────────────────────
function validateStep(step) {
  clearError();
  switch (step) {
    case 1: return validateStep1();
    case 2: return validateStep2();
    case 3: return validateStep3();
    case 4: return validateStep4();
    default: return true;
  }
}

function validateStep1() {
  // Google users skip Step 1 entirely — already authenticated
  if (googleSignedIn) return true;

  const name  = document.getElementById('fullName')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const phone = document.getElementById('reg-phone')?.value.trim();
  const loc   = document.getElementById('location')?.value;
  const bio   = document.getElementById('bio')?.value.trim();
  const pw    = document.getElementById('reg-password')?.value;
  const pw2   = document.getElementById('reg-password2')?.value;

  if (!name)  return showError('Full name is required.');
  if (!email || !/\S+@\S+\.\S+/.test(email)) return showError('Valid email is required.');
  if (!phone) return showError('Phone number is required.');
  if (!loc)   return showError('Please select your district.');
  if (!bio || bio.length < 10) return showError('Bio must be at least 10 characters.');
  if (!pw || pw.length < 8)    return showError('Password must be at least 8 characters.');
  if (pw !== pw2)              return showError('Passwords do not match.');
  return true;
}

function validateStep2() {
  const spec = document.getElementById('specialisation')?.value;
  if (!spec) return showError('Please select your talent type (Photographer or Cinematographer).');
  if (skillsArray.length < 1) return showError('Please add at least one event specialisation.');
  return true;
}

function validateStep3() {
  if (portfolioItems.length < 3) return showError('Please add at least 3 portfolio items.');
  for (let i = 0; i < portfolioItems.length; i++) {
    const item = portfolioItems[i];
    if (!item.title)           return showError(`Portfolio item #${i+1} needs a title.`);
    if (!item.thumbnailDataUrl) return showError(`Portfolio item #${i+1} needs a thumbnail image.`);
  }
  return true;
}

function validateStep4() {
  const ndaCheck    = document.getElementById('agree-nda')?.checked;
  const termsCheck  = document.getElementById('agree-terms')?.checked;
  const origCheck   = document.getElementById('agree-original')?.checked;
  const nameConfirm = document.getElementById('name-confirm')?.value.trim();
  const fullName    = document.getElementById('fullName')?.value.trim();

  if (!ndaCheck)   return showError('You must agree to the NDA.');
  if (!termsCheck) return showError('You must agree to the Terms & Conditions.');
  if (!origCheck)  return showError('You must confirm the work is your own.');
  // Google users have no manual name on file — only check if they filled it in
  if (!googleSignedIn) {
    if (!nameConfirm || nameConfirm.toLowerCase() !== fullName?.toLowerCase())
      return showError('Full name confirmation does not match. Please type your name exactly.');
  }
  return true;
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!validateStep(4)) return;

  btnSubmit.disabled   = true;
  btnSubmit.textContent = 'Submitting…';

  const fullName    = document.getElementById('fullName').value.trim();
  const email       = document.getElementById('reg-email').value.trim();
  const phone       = document.getElementById('reg-phone').value.trim();
  const location    = document.getElementById('location').value;
  const bio         = document.getElementById('bio').value.trim();
  const yrsExp      = document.getElementById('yearsExperience').value;
  const capacity    = document.getElementById('weeklyCapacity').value;
  const password    = document.getElementById('reg-password').value;
  const spec        = document.getElementById('specialisation').value;

  const profileData = {
    fullName,
    phone,
    location,
    bio,
    yearsExperience:  yrsExp,
    weeklyCapacity:   Number(capacity),
    talentType:       spec,
    specialisation:   spec,
    eventTypes:       [...skillsArray],
    skills:           [...skillsArray],
    equipment:        [...toolsArray],
    tools:            [...toolsArray],
    profilePhoto:     profilePhotoDataUrl || '',
    socialLinks: {
      instagram:     document.getElementById('link-instagram')?.value.trim()  || '',
      youtube:       document.getElementById('link-youtube')?.value.trim()    || '',
      fivehundredpx: document.getElementById('link-500px')?.value.trim()      || '',
      linkedin:      document.getElementById('link-linkedin')?.value.trim()   || '',
      portfolio:     document.getElementById('link-portfolio')?.value.trim()  || '',
    },
    portfolioItems: portfolioItems.map(item => ({
      id:              item.id,
      title:           item.title,
      category:        item.category,
      thumbnail:       item.thumbnailDataUrl || '',
      description:     item.description,
      tools:           [...item.tools],
      approved:        false,
      rejectionReason: '',
    })),
    ndaAgreed:    true,
    ndaTimestamp: new Date().toISOString(),
    termsAgreed:  true,
    availableForWork: true,
  };

  let uid, error, resolvedEmail;

  if (googleSignedIn) {
    // Google user — profile stub already created; just update it with full data
    const currentUser = getCurrentUser();
    uid           = currentUser?.uid;
    resolvedEmail = currentUser?.email || '';
    if (uid) {
      const { error: updateErr } = await updateFreelancerProfile(uid, profileData).then(
        ()  => ({ error: null }),
        err => ({ error: err })
      );
      error = updateErr;
    } else {
      error = { code: 'no-user' };
    }
  } else {
    // Email/password registration
    resolvedEmail = email;
    const result = await registerFreelancer(email, password, profileData);
    uid   = result.uid;
    error = result.error;
  }

  if (error) {
    btnSubmit.disabled   = false;
    btnSubmit.textContent = 'Submit Application →';
    const msg = friendlyAuthError(error);
    showError(msg);
    return;
  }

  // Success
  formNav.style.display = 'none';
  document.querySelectorAll('.fl-form-step').forEach(s => s.style.display = 'none');
  document.querySelector('.fl-steps-bar').style.display = 'none';
  regSuccess.style.display = '';
  document.getElementById('success-email').textContent = resolvedEmail;
  document.getElementById('success-fl-id').textContent = `FL-${uid.slice(0,8).toUpperCase()}`;

  // Redirect to dashboard after 3 seconds
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 3000);
}

function friendlyAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'This email is already registered. Try logging in instead.';
  if (code === 'auth/weak-password')        return 'Password must be at least 8 characters.';
  if (code === 'auth/invalid-email')        return 'Please enter a valid email address.';
  if (code === 'no-user')                   return 'Google session expired. Please refresh and try again.';
  return 'Something went wrong. Please try again.';
}

// ─── Error helpers ────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('reg-error');
  if (el) { el.textContent = msg; el.style.display = ''; }
  return false;
}

function clearError() {
  const el = document.getElementById('reg-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
