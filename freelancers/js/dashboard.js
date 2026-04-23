/**
 * dashboard.js — Freelancer Private Dashboard
 * Handles auth guard, gallery uploads, profile editing, jobs & earnings.
 */
import {
  onAuthChange, logoutFreelancer, getFreelancerProfile,
  getFreelancerJobs, updateFreelancerProfile, changeFreelancerPassword,
  getFreelancerNotifications, markNotificationRead,
  uploadFile, uploadDataUrl, updateJob, addGalleryItem, removeGalleryItem,
  TIERS, BD_DISTRICTS, EQUIPMENT_TAGS,
  formatBDT, timeAgo, generateId, createNotification,
} from '../../js/firebase.js';

// ─── State ────────────────────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;

// ─── Auth guard ───────────────────────────────────────────────────────────────
const unsubscribeAuth = onAuthChange(async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }

  const profile = await getFreelancerProfile(user.uid);

  // No Firestore profile = not a freelancer (shouldn't happen, but guard anyway)
  if (!profile) {
    await logoutFreelancer();
    window.location.href = 'login.html';
    return;
  }

  // Rejected: kick them out with a message
  if (profile.status === 'rejected') {
    await logoutFreelancer();
    sessionStorage.setItem('uch_fl_rejected', '1');
    window.location.href = 'login.html';
    return;
  }

  // Pending / approved / suspended — all allowed in
  currentUser    = user;
  currentProfile = profile;
  unsubscribeAuth(); // stop listening once loaded
  initDashboard(profile);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initDashboard(profile) {
  // Reveal dashboard
  document.getElementById('fl-auth-loading').style.display = 'none';
  document.getElementById('fl-dashboard').style.display    = '';

  // Topbar
  const firstName = profile.fullName?.split(' ')[0] || 'Freelancer';
  setEl('dash-name', firstName);

  const tierInfo = TIERS[profile.tier] || TIERS.bronze;
  const tierBadge = document.getElementById('dash-tier-badge');
  if (tierBadge) {
    tierBadge.textContent    = tierInfo.label;
    tierBadge.style.color    = tierInfo.color;
    tierBadge.style.borderColor = tierInfo.color + '55';
  }

  // Status banner
  renderStatusBanner(profile);

  // Unlock approved-only tabs
  if (profile.status === 'approved') {
    document.getElementById('nav-jobs')?.classList.remove('locked');
    document.getElementById('nav-earnings')?.classList.remove('locked');
  }

  // Hide password section for Google OAuth users (no password to change)
  if (!currentUser.providerData?.some(p => p.providerId === 'password')) {
    const pwSec = document.getElementById('pw-section');
    if (pwSec) pwSec.style.display = 'none';
  }

  // Wire up tabs, topbar actions
  setupTabs();
  setupMobileSidebar();
  setupNotifBell();
  document.getElementById('fl-logout')?.addEventListener('click', async () => {
    await logoutFreelancer();
    window.location.href = 'login.html';
  });

  // Load overview immediately
  await loadOverview(profile);
  await loadNotifications();
}

// ─── Mobile sidebar toggle ─────────────────────────────────────────────────
function setupMobileSidebar() {
  const toggle  = document.getElementById('fl-sidebar-toggle');
  const sidebar = document.querySelector('.fl-dash-sidebar');
  const overlay = document.getElementById('fl-sidebar-overlay');
  if (!toggle || !sidebar) return;

  function openSidebar() {
    sidebar.classList.add('mobile-open');
    overlay?.classList.add('active');
    toggle.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    toggle.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('mobile-open') ? closeSidebar() : openSidebar();
  });
  overlay?.addEventListener('click', closeSidebar);

  // Close sidebar when a nav tab is clicked on mobile
  document.querySelectorAll('.fl-dash-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
}

// ─── Status banner ────────────────────────────────────────────────────────────
function renderStatusBanner(profile) {
  const banner = document.getElementById('status-banner');
  if (!banner) return;

  const configs = {
    pending: {
      cls:   'pending',
      icon:  '⏳',
      title: 'Application Under Review',
      body:  'We\'re reviewing your profile and portfolio. You\'ll receive a confirmation within 48 hours. In the meantime, feel free to add to your gallery and complete your profile.',
    },
    approved: {
      cls:   'approved',
      icon:  '✅',
      title: 'Your Account is Active',
      body:  'You\'re approved and ready to receive jobs from UCH. Keep your gallery updated and stay available!',
    },
    suspended: {
      cls:   'suspended',
      icon:  '⛔',
      title: 'Account Suspended',
      body:  'Your account has been temporarily suspended. Please contact us at hello@umbrellacorphq.com to resolve this.',
    },
  };

  const cfg = configs[profile.status] || configs.pending;
  banner.className         = `fl-status-banner ${cfg.cls}`;
  setEl('status-icon',  cfg.icon);
  setEl('status-title', cfg.title);
  setEl('status-body',  cfg.body);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
let tabLoaded = {};

function setupTabs() {
  const btns = document.querySelectorAll('.fl-dash-nav-btn[data-tab]');
  const tabs = document.querySelectorAll('.fl-dash-tab');

  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('locked')) return;

      btns.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.style.display = 'none');
      btn.classList.add('active');

      const tabId = 'tab-' + btn.dataset.tab;
      const tab   = document.getElementById(tabId);
      if (tab) tab.style.display = '';

      // Lazy-load each tab once
      const key = btn.dataset.tab;
      if (!tabLoaded[key]) {
        tabLoaded[key] = true;
        switch (key) {
          case 'gallery':  await loadGalleryTab();  break;
          case 'profile':  loadProfileTab();        break;
          case 'jobs':     await loadJobsTab();      break;
          case 'earnings': await loadEarningsTab();  break;
        }
      }
    });
  });
}

function switchToTab(tabKey) {
  const btn = document.querySelector(`.fl-dash-nav-btn[data-tab="${tabKey}"]`);
  if (btn) btn.click();
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
async function loadOverview(profile) {
  // Gallery count
  const galleryCount = (profile.portfolioItems || []).length;
  setEl('stat-gallery', galleryCount);

  // Jobs stats
  let jobs = [];
  try { jobs = await getFreelancerJobs(currentUser.uid); } catch (_) {}

  const active    = jobs.filter(j => ['assigned','in_progress','revision_requested'].includes(j.status));
  const completed = jobs.filter(j => j.status === 'completed');

  setEl('stat-active',    active.length);
  setEl('stat-completed', completed.length);
  setEl('stat-earned',    formatBDT(profile.totalEarnings || 0));

  renderTierProgress(profile);
}

function renderTierProgress(profile) {
  const tier      = profile.tier || 'bronze';
  const completed = profile.completedJobs || 0;
  const tierInfo  = TIERS[tier];

  const labelEl = document.getElementById('tier-badge-label');
  const barEl   = document.getElementById('tier-bar');
  const hintEl  = document.getElementById('tier-hint');

  if (labelEl) {
    labelEl.textContent = tierInfo?.label || 'Bronze';
    labelEl.style.color = tierInfo?.color || '#cd7f32';
  }

  let pct  = 0;
  let hint = '';
  if (tier === 'bronze') {
    pct  = Math.min(100, Math.round(completed / 8 * 100));
    hint = completed >= 8 ? 'Ready for Silver promotion!' : `${8 - completed} more completed jobs to reach Silver.`;
  } else if (tier === 'silver') {
    pct  = Math.min(100, Math.round((completed - 8) / 12 * 100));
    hint = completed >= 20 ? 'Ready for Gold promotion!' : `${20 - completed} more completed jobs to reach Gold.`;
  } else {
    pct  = 100;
    hint = '★ Maximum tier reached — you\'re Gold!';
  }

  if (barEl)  barEl.style.width  = pct + '%';
  if (hintEl) hintEl.textContent = hint;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
async function loadNotifications() {
  let notifs = [];
  try { notifs = await getFreelancerNotifications(currentUser.uid); } catch (_) {}

  const unread  = notifs.filter(n => !n.read);
  const dot     = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread.length ? '' : 'none';

  const listEl = document.getElementById('notif-list');
  if (!listEl) return;

  if (!notifs.length) {
    listEl.innerHTML = '<p style="color:var(--steel);font-size:13px;padding:8px 0">No notifications yet.</p>';
    return;
  }

  listEl.innerHTML = notifs.map(n => `
    <div class="fl-notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="fl-notif-item-dot"></div>
      <div>
        <div class="fl-notif-item-body">${n.body || n.title || ''}</div>
        <div class="fl-notif-item-time">${timeAgo(n.createdAt)}</div>
      </div>
    </div>`).join('');

  listEl.querySelectorAll('.fl-notif-item').forEach(item => {
    item.addEventListener('click', () => {
      markNotificationRead(item.dataset.id);
      item.classList.remove('unread');
      // Refresh dot count
      const remaining = listEl.querySelectorAll('.fl-notif-item.unread').length;
      const dot = document.getElementById('notif-dot');
      if (dot) dot.style.display = remaining ? '' : 'none';
    });
  });
}

function setupNotifBell() {
  document.getElementById('notif-bell')?.addEventListener('click', () => {
    // Navigate to overview tab where notifications live
    switchToTab('overview');
    // Scroll to notif-list smoothly
    setTimeout(() => {
      document.getElementById('notif-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  });
}

// ─── GALLERY TAB ──────────────────────────────────────────────────────────────
async function loadGalleryTab() {
  renderGalleryGrid(currentProfile.portfolioItems || []);
  setupGalleryUpload();
}

function renderGalleryGrid(items) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="fl-gallery-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin:0 auto 12px;display:block;color:#333">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <p>Your gallery is empty.<br>Upload your best shots above.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const isVideo  = item.mediaType === 'video' || /\.(mp4|mov|webm)$/i.test(item.storageUrl || '');
    const statusCls  = item.approved ? 'approved' : (item.rejectionReason ? 'rejected' : 'pending');
    const statusText = item.approved ? 'Approved ✓' : (item.rejectionReason ? 'Rejected' : 'Pending');

    const thumb = item.thumbnail || item.storageUrl || '';
    const thumbHtml = isVideo
      ? `<video src="${thumb}" style="width:100%;height:100%;object-fit:cover" muted playsinline preload="metadata"></video>`
      : (thumb
          ? `<img src="${thumb}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover">`
          : `<svg class="fl-thumb-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`);

    return `
      <div class="fl-gallery-item" data-item-id="${item.id}" data-storage-url="${item.storageUrl || ''}">
        <div class="fl-gallery-thumb">${thumbHtml}</div>
        <div class="fl-gallery-item-info">
          <div class="fl-gallery-item-title">${item.title || 'Untitled'}</div>
          <div class="fl-gallery-item-cat">${item.category || ''}</div>
          <span class="fl-gallery-item-status ${statusCls}">${statusText}</span>
        </div>
        <div class="fl-gallery-item-actions">
          <button class="fl-gallery-action-btn delete" data-item-id="${item.id}" data-storage-url="${item.storageUrl || ''}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');

  // Wire delete buttons
  grid.querySelectorAll('.fl-gallery-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this item from your gallery?')) return;
      const itemId     = btn.dataset.itemId;
      const storageUrl = btn.dataset.storageUrl;
      btn.closest('.fl-gallery-item').style.opacity = '0.4';
      try {
        await removeGalleryItem(currentUser.uid, itemId, storageUrl);
        currentProfile.portfolioItems = (currentProfile.portfolioItems || []).filter(i => i.id !== itemId);
        renderGalleryGrid(currentProfile.portfolioItems);
        setEl('stat-gallery', currentProfile.portfolioItems.length);
      } catch (err) {
        console.error('Delete failed', err);
        btn.closest('.fl-gallery-item').style.opacity = '';
        alert('Failed to delete item. Please try again.');
      }
    });
  });
}

function setupGalleryUpload() {
  const zone       = document.getElementById('gallery-upload-zone');
  const fileInput  = document.getElementById('gallery-file-input');
  if (!zone || !fileInput) return;

  zone.addEventListener('click', () => fileInput.click());

  // Drag events
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  fileInput.addEventListener('change', () => {
    handleFiles(Array.from(fileInput.files));
    fileInput.value = ''; // reset so same file can be re-selected
  });
}

async function handleFiles(files) {
  const validFiles = files.filter(f => {
    if (!f.type.startsWith('image/')) {
      showGalleryError(`"${f.name}" skipped — only photos (JPG, PNG, WebP) are supported on the free plan.`);
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      showGalleryError(`"${f.name}" is over 10 MB. Please reduce the file size and try again.`);
      return false;
    }
    return true;
  });
  if (!validFiles.length) return;

  for (const file of validFiles) {
    // Compress image to max 1200px wide, 80% JPEG quality before uploading
    const compressed = await compressImage(file, 1200, 0.82);
    await uploadGalleryFile(compressed, file.name);
  }
}

// Compress an image File to max maxW wide at given quality, returns a new File
function compressImage(file, maxW, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) { resolve(file); return; } // fallback to original if canvas fails
        const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        // Only use compressed version if it's actually smaller
        resolve(compressed.size < file.size ? compressed : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function showGalleryError(msg) {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  const el = document.createElement('div');
  el.style.cssText = 'grid-column:1/-1;padding:12px 16px;background:rgba(193,18,31,0.1);border:1px solid rgba(193,18,31,0.3);border-radius:4px;font-size:13px;color:#e66;display:flex;align-items:center;justify-content:space-between;gap:12px';
  el.innerHTML = `<span>${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px;flex-shrink:0">✕</button>`;
  grid.prepend(el);
  setTimeout(() => el.remove(), 6000);
}

async function uploadGalleryFile(file) {
  const grid      = document.getElementById('gallery-grid');
  const itemId    = generateId('GI');
  const isVideo   = file.type.startsWith('video/');
  const timestamp = Date.now();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path      = `freelancers/${currentUser.uid}/gallery/${timestamp}_${safeName}`;

  // Remove "empty" placeholder if present
  const emptyEl = grid?.querySelector('.fl-gallery-empty');
  if (emptyEl) emptyEl.remove();

  // Insert a placeholder card with upload overlay
  const placeholder = document.createElement('div');
  placeholder.className = 'fl-gallery-item';
  placeholder.id        = `upload-${itemId}`;
  placeholder.innerHTML = `
    <div class="fl-gallery-thumb" style="background:#111">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;color:#333">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
    <div class="fl-gallery-item-info">
      <div class="fl-gallery-item-title" style="color:var(--steel)">Uploading…</div>
      <div class="fl-gallery-item-cat">${file.name}</div>
    </div>
    <div class="fl-gallery-uploading">
      <span>Uploading…</span>
      <div class="fl-upload-progress-bar">
        <div class="fl-upload-progress-fill" style="width:0%" id="prog-${itemId}"></div>
      </div>
    </div>`;
  grid?.prepend(placeholder);

  // Animate progress bar (indeterminate — uploadBytes has no progress callback)
  let progValue = 0;
  const progEl  = document.getElementById(`prog-${itemId}`);
  const progInterval = setInterval(() => {
    progValue = Math.min(progValue + Math.random() * 8, 85);
    if (progEl) progEl.style.width = progValue + '%';
  }, 200);

  // 30-second timeout — surfaces Storage rule / CORS errors instead of hanging
  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Upload timed out — check Firebase Storage security rules allow authenticated writes.')), ms)
    ),
  ]);

  try {
    // Upload to Firebase Storage
    const downloadUrl = await withTimeout(uploadFile(path, file), 30000);

    // Generate thumbnail (first frame for video, full image for photo)
    let thumbnail = downloadUrl;
    if (!isVideo) {
      // For images, use the download URL as thumbnail directly
      thumbnail = downloadUrl;
    }

    // Determine category from file type
    const category = isVideo ? 'Video Clip' : 'Photo';

    // Build item object
    const item = {
      id:           itemId,
      title:        file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
      category,
      mediaType:    isVideo ? 'video' : 'image',
      storageUrl:   downloadUrl,
      thumbnail,
      description:  '',
      approved:     false,
      rejectionReason: '',
      uploadedAt:   new Date().toISOString(),
    };

    // Save to Firestore
    await addGalleryItem(currentUser.uid, item);
    currentProfile.portfolioItems = [...(currentProfile.portfolioItems || []), item];

    // Finish progress bar
    clearInterval(progInterval);
    if (progEl) progEl.style.width = '100%';

    // Replace placeholder with real card
    setTimeout(() => {
      placeholder.remove();
      renderGalleryGrid(currentProfile.portfolioItems);
      setEl('stat-gallery', currentProfile.portfolioItems.length);
    }, 400);

  } catch (err) {
    clearInterval(progInterval);
    console.error('Upload failed', err);
    const errCode = err?.code || '';
    const errMsg  =
      errCode === 'storage/unauthorized'  ? '🔒 Storage rules blocked this upload. Update Firebase Storage Rules to allow authenticated writes.' :
      errCode === 'storage/canceled'      ? 'Upload was cancelled.' :
      errCode === 'storage/unknown'       ? 'Network error. Check your connection and try again.' :
      err?.message || 'Upload failed — try again.';
    placeholder.innerHTML = `
      <div class="fl-gallery-thumb" style="background:rgba(193,18,31,0.1)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:var(--corp-red)">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="fl-gallery-item-info">
        <div class="fl-gallery-item-title" style="color:var(--corp-red)">Upload failed</div>
        <div class="fl-gallery-item-cat" style="font-size:10px;line-height:1.4;color:#888;margin-top:4px">${errMsg}</div>
        <button onclick="this.closest('.fl-gallery-item').remove()" style="background:none;border:none;color:var(--steel);font-size:11px;cursor:pointer;padding:0;margin-top:6px">✕ Dismiss</button>
      </div>`;
  }
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
let equipmentTags = [];

function loadProfileTab() {
  const p = currentProfile;

  // Photo avatar
  const avatar     = document.getElementById('profile-avatar');
  const photoInput = document.getElementById('profile-photo-input');

  if (avatar) {
    if (p.profilePhoto) {
      avatar.innerHTML = `<img src="${p.profilePhoto}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover">`;
    }
    avatar.addEventListener('click', () => photoInput?.click());
  }

  photoInput?.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (avatar) avatar.innerHTML = `<img src="${e.target.result}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  });

  // Contact fields
  setInputVal('edit-name',  p.fullName || '');
  setInputVal('edit-phone', p.phone    || '');
  setInputVal('edit-bio',   p.bio      || '');

  // District select
  const locSel = document.getElementById('edit-location');
  if (locSel && !locSel.options.length) {
    locSel.innerHTML = '<option value="">Select district…</option>' +
      BD_DISTRICTS.map(d => `<option value="${d}"${d === p.location ? ' selected' : ''}>${d}</option>`).join('');
  } else if (locSel) {
    locSel.value = p.location || '';
  }

  // Availability toggle
  const avail = document.getElementById('avail-switch');
  const availLabel = document.getElementById('avail-label');
  if (avail) {
    avail.classList.toggle('on', !!p.availableForWork);
    avail.addEventListener('click', () => {
      avail.classList.toggle('on');
      if (availLabel) availLabel.textContent = avail.classList.contains('on') ? 'Available for work' : 'Not available';
    });
    if (availLabel) availLabel.textContent = p.availableForWork ? 'Available for work' : 'Not available';
  }

  // Social links
  setInputVal('link-instagram', p.socialLinks?.instagram || '');
  setInputVal('link-youtube',   p.socialLinks?.youtube   || '');
  setInputVal('link-500px',     p.socialLinks?.fivehundredpx || '');
  setInputVal('link-linkedin',  p.socialLinks?.linkedin  || '');
  setInputVal('link-portfolio', p.socialLinks?.portfolio || '');

  // Equipment tag editor
  equipmentTags = [...(p.equipment || [])];
  renderEquipmentTags();
  setupEquipmentTagInput();

  // Payment
  setInputVal('edit-payment-method',  p.paymentMethod  || '');
  setInputVal('edit-payment-account', p.paymentAccount || '');

  // Save profile
  const saveBtn = document.getElementById('btn-save-profile');
  const saveMsg = document.getElementById('profile-save-msg');

  // Remove old listener if any (re-load guard)
  const newSaveBtn = saveBtn?.cloneNode(true);
  if (saveBtn && newSaveBtn) {
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', () => saveProfile(newSaveBtn, saveMsg));
  }

  // Change password
  const changePwBtn = document.getElementById('btn-change-pw');
  if (changePwBtn) {
    const newBtn = changePwBtn.cloneNode(true);
    changePwBtn.parentNode.replaceChild(newBtn, changePwBtn);
    newBtn.addEventListener('click', handleChangePassword);
  }
}

function renderEquipmentTags() {
  const editor   = document.getElementById('equipment-editor');
  const inputEl  = document.getElementById('equipment-input');
  if (!editor || !inputEl) return;

  // Remove existing chips (keep the input)
  editor.querySelectorAll('.fl-tag-chip').forEach(c => c.remove());

  equipmentTags.forEach(tag => {
    const chip = document.createElement('span');
    chip.className   = 'fl-tag-chip';
    chip.dataset.tag = tag;
    chip.innerHTML   = `${tag} <button type="button" aria-label="Remove" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 4px;font-size:11px;line-height:1;opacity:0.7">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      equipmentTags = equipmentTags.filter(t => t !== tag);
      renderEquipmentTags();
    });
    editor.insertBefore(chip, inputEl);
  });
}

function setupEquipmentTagInput() {
  const editor  = document.getElementById('equipment-editor');
  const inputEl = document.getElementById('equipment-input');
  if (!editor || !inputEl) return;

  // Click anywhere in editor = focus input
  editor.addEventListener('click', () => inputEl.focus());

  // Prevent double-attaching
  const newInput = inputEl.cloneNode(true);
  inputEl.parentNode.replaceChild(newInput, inputEl);

  newInput.addEventListener('keydown', (e) => {
    const val = newInput.value.trim();
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault();
      if (!equipmentTags.includes(val)) {
        equipmentTags.push(val);
        renderEquipmentTags();
      }
      newInput.value = '';
    }
    // Backspace on empty = remove last tag
    if (e.key === 'Backspace' && !newInput.value && equipmentTags.length) {
      equipmentTags.pop();
      renderEquipmentTags();
    }
  });

  // Suggestions from EQUIPMENT_TAGS
  newInput.addEventListener('input', () => {
    showEquipmentSuggestions(newInput.value.trim(), newInput);
  });
  newInput.addEventListener('blur', () => {
    setTimeout(() => hideEquipmentSuggestions(), 150);
  });
}

let suggestionsEl = null;
function showEquipmentSuggestions(query, inputEl) {
  hideEquipmentSuggestions();
  if (!query) return;

  const matches = EQUIPMENT_TAGS.filter(t =>
    t.toLowerCase().includes(query.toLowerCase()) && !equipmentTags.includes(t)
  ).slice(0, 6);
  if (!matches.length) return;

  suggestionsEl = document.createElement('div');
  suggestionsEl.style.cssText = `
    position:absolute; background:#1a1a1a; border:1px solid #2a2a2a; border-radius:4px;
    z-index:200; max-height:180px; overflow-y:auto;
    box-shadow:0 8px 24px rgba(0,0,0,0.4); min-width:200px;`;

  matches.forEach(tag => {
    const item = document.createElement('div');
    item.textContent = tag;
    item.style.cssText = 'padding:9px 14px;font-size:13px;cursor:pointer;color:var(--ivory);transition:background 0.1s';
    item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.06)');
    item.addEventListener('mouseleave', () => item.style.background = '');
    item.addEventListener('mousedown', () => {
      if (!equipmentTags.includes(tag)) { equipmentTags.push(tag); renderEquipmentTags(); }
      inputEl.value = '';
      hideEquipmentSuggestions();
    });
    suggestionsEl.appendChild(item);
  });

  // Position below input
  const rect = inputEl.getBoundingClientRect();
  suggestionsEl.style.top    = (rect.bottom + window.scrollY + 4) + 'px';
  suggestionsEl.style.left   = (rect.left   + window.scrollX) + 'px';
  document.body.appendChild(suggestionsEl);
}

function hideEquipmentSuggestions() {
  if (suggestionsEl) { suggestionsEl.remove(); suggestionsEl = null; }
}

async function saveProfile(btn, msgEl) {
  btn.textContent = 'Saving…';
  btn.disabled    = true;

  try {
    // Upload new profile photo if selected
    let profilePhoto = currentProfile.profilePhoto || '';
    const photoInput  = document.getElementById('profile-photo-input');
    if (photoInput?.files[0]) {
      const file = photoInput.files[0];
      const path = `freelancers/${currentUser.uid}/profile/photo`;
      profilePhoto = await uploadFile(path, file);
    }

    const updates = {
      fullName:         (document.getElementById('edit-name')?.value || '').trim(),
      phone:            (document.getElementById('edit-phone')?.value || '').trim(),
      location:         document.getElementById('edit-location')?.value || '',
      bio:              (document.getElementById('edit-bio')?.value || '').trim(),
      availableForWork: document.getElementById('avail-switch')?.classList.contains('on') ?? true,
      equipment:        equipmentTags,
      paymentMethod:    document.getElementById('edit-payment-method')?.value || '',
      paymentAccount:   (document.getElementById('edit-payment-account')?.value || '').trim(),
      socialLinks: {
        instagram:       (document.getElementById('link-instagram')?.value || '').trim(),
        youtube:         (document.getElementById('link-youtube')?.value   || '').trim(),
        fivehundredpx:  (document.getElementById('link-500px')?.value      || '').trim(),
        linkedin:        (document.getElementById('link-linkedin')?.value  || '').trim(),
        portfolio:       (document.getElementById('link-portfolio')?.value || '').trim(),
      },
      ...(profilePhoto ? { profilePhoto } : {}),
    };

    await updateFreelancerProfile(currentUser.uid, updates);

    // Sync local cache
    Object.assign(currentProfile, updates);

    // Update topbar name
    setEl('dash-name', updates.fullName.split(' ')[0] || 'Freelancer');

    btn.textContent = 'Save Changes';
    btn.disabled    = false;

    if (msgEl) {
      msgEl.textContent = 'Saved ✓';
      msgEl.classList.add('show');
      setTimeout(() => msgEl.classList.remove('show'), 3000);
    }
  } catch (err) {
    console.error('Save failed', err);
    btn.textContent = 'Save Changes';
    btn.disabled    = false;
    if (msgEl) {
      msgEl.textContent = 'Save failed. Try again.';
      msgEl.style.color = 'var(--corp-red)';
      msgEl.classList.add('show');
      setTimeout(() => { msgEl.classList.remove('show'); msgEl.style.color = ''; }, 4000);
    }
  }
}

async function handleChangePassword() {
  const btn     = document.getElementById('btn-change-pw');
  const current = document.getElementById('pw-current')?.value || '';
  const newPw   = document.getElementById('pw-new')?.value     || '';
  const newPw2  = document.getElementById('pw-new2')?.value    || '';

  if (!current || !newPw)    { showPwMsg('Please fill in all fields.', 'error'); return; }
  if (newPw.length < 8)      { showPwMsg('New password must be at least 8 characters.', 'error'); return; }
  if (newPw !== newPw2)      { showPwMsg('New passwords do not match.', 'error'); return; }

  btn.textContent = 'Changing…'; btn.disabled = true;
  const result = await changeFreelancerPassword(current, newPw);
  btn.textContent = 'Change Password'; btn.disabled = false;

  if (result.ok) {
    showPwMsg('Password changed successfully ✓', 'success');
    ['pw-current','pw-new','pw-new2'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
  } else {
    const msg = result.error?.includes('wrong-password') || result.error?.includes('invalid-credential')
      ? 'Current password is incorrect.'
      : result.error || 'Failed to change password.';
    showPwMsg(msg, 'error');
  }
}

function showPwMsg(msg, type) {
  const el = document.getElementById('pw-msg');
  if (!el) return;
  el.textContent    = msg;
  el.style.color    = type === 'error' ? 'var(--corp-red)' : '#3ecf8e';
  el.style.display  = '';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── JOBS TAB ─────────────────────────────────────────────────────────────────
let allJobs       = [];
let delivFiles    = [];

async function loadJobsTab() {
  try { allJobs = await getFreelancerJobs(currentUser.uid); } catch (_) { allJobs = []; }
  renderJobsList();
  setupJobDetailClose();
}

function renderJobsList() {
  const listEl   = document.getElementById('jobs-list');
  const detailEl = document.getElementById('job-detail-panel');
  if (detailEl) detailEl.style.display = 'none';
  if (!listEl) return;

  if (!allJobs.length) {
    listEl.innerHTML = `
      <div class="fl-empty-state">
        <p>No jobs assigned yet.<br>UCH will notify you when a job matches your talent.</p>
      </div>`;
    return;
  }

  const sorted = [...allJobs].sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt));

  listEl.innerHTML = sorted.map(j => `
    <div class="fl-job-row" data-job-id="${j.id}">
      <div class="fl-job-row-top">
        <span class="fl-job-id-mono">${(j.id || '').slice(0, 16)}</span>
        <span class="fl-job-service">${j.serviceType || 'Project'}</span>
        <span class="fl-job-status-badge ${j.status}">${statusLabel(j.status)}</span>
      </div>
      <div class="fl-job-meta">
        <span>Deadline: ${j.deadline || 'TBD'}</span>
        <span>Payout: ${j.freelancerPayout ? formatBDT(j.freelancerPayout) : 'TBD'}</span>
        <span style="margin-left:auto;color:rgba(255,255,255,0.3)">View Details →</span>
      </div>
    </div>`).join('');

  listEl.querySelectorAll('.fl-job-row').forEach(row => {
    row.addEventListener('click', () => {
      const job = allJobs.find(j => j.id === row.dataset.jobId);
      if (job) showJobDetail(job);
    });
  });
}

function setupJobDetailClose() {
  document.getElementById('job-detail-close')?.addEventListener('click', () => {
    document.getElementById('job-detail-panel').style.display = 'none';
    document.getElementById('jobs-list').style.display = '';
  });
}

function showJobDetail(job) {
  delivFiles = [];

  document.getElementById('jobs-list').style.display = 'none';
  const panel = document.getElementById('job-detail-panel');
  panel.style.display = '';

  const tierPct = TIERS[currentProfile.tier]?.payout || 75;
  const payout  = job.freelancerPayout || 0;

  setEl('jd-title', `${job.serviceType || 'Project'} — ${(job.id || '').slice(0, 16)}`);

  const metaEl = document.getElementById('jd-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="fl-job-status-badge ${job.status}">${statusLabel(job.status)}</span>
      <span style="font-size:13px;color:var(--steel)">Deadline: ${job.deadline || 'TBD'}</span>
      <span style="font-size:13px;color:var(--steel)">Your tier cut: ${tierPct}%</span>`;
  }

  const descEl = document.getElementById('jd-desc');
  if (descEl) {
    descEl.innerHTML = `
      <p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75)">${job.description || 'No description provided.'}</p>
      ${job.adminNotes ? `<div style="margin-top:16px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:4px">
        <p style="font-size:11px;color:var(--steel);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">Note from UCH</p>
        <p style="font-size:13px">${job.adminNotes}</p>
      </div>` : ''}`;
  }

  const payoutRow = document.getElementById('jd-payout-row');
  if (payoutRow) payoutRow.style.display = payout ? '' : 'none';
  setEl('jd-payout', formatBDT(payout));

  // Deliverable upload
  const dropArea   = document.getElementById('deliverable-drop');
  const fileInput  = document.getElementById('deliverable-input');
  const fileList   = document.getElementById('deliverable-file-list');
  const submitBtn  = document.getElementById('btn-deliver');
  const deliverMsg = document.getElementById('deliver-msg');

  if (deliverMsg) deliverMsg.style.display = 'none';
  if (submitBtn)  submitBtn.style.display  = 'none';
  if (fileList)   fileList.innerHTML       = '';

  // Clone to remove stale listeners
  if (dropArea) {
    const newDrop = dropArea.cloneNode(true);
    dropArea.parentNode.replaceChild(newDrop, dropArea);
    newDrop.addEventListener('click', () => document.getElementById('deliverable-input')?.click());
    newDrop.addEventListener('dragover', e => { e.preventDefault(); newDrop.style.borderColor = 'var(--corp-red)'; });
    newDrop.addEventListener('dragleave', () => newDrop.style.borderColor = '');
    newDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      newDrop.style.borderColor = '';
      Array.from(e.dataTransfer.files).forEach(f => { if (!delivFiles.find(x => x.name === f.name)) delivFiles.push(f); });
      renderDeliverList();
    });
  }

  if (fileInput) {
    const newInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newInput, fileInput);
    newInput.addEventListener('change', () => {
      Array.from(newInput.files).forEach(f => { if (!delivFiles.find(x => x.name === f.name)) delivFiles.push(f); });
      renderDeliverList();
      newInput.value = '';
    });
  }

  if (submitBtn) {
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);
    newBtn.addEventListener('click', () => handleDeliverSubmit(job, newBtn, deliverMsg));
  }

  // If already delivered/completed, disable upload section
  if (['delivered', 'completed'].includes(job.status)) {
    const dropEl = document.getElementById('deliverable-drop');
    if (dropEl) dropEl.style.display = 'none';
    if (deliverMsg) {
      deliverMsg.textContent  = job.status === 'completed' ? 'This job has been completed ✓' : 'Deliverables submitted — awaiting review.';
      deliverMsg.style.color  = '#3ecf8e';
      deliverMsg.style.display = '';
    }
  }
}

function renderDeliverList() {
  const listEl  = document.getElementById('deliverable-file-list');
  const btn     = document.getElementById('btn-deliver');
  if (!listEl) return;

  listEl.innerHTML = delivFiles.map((f, i) => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;flex-shrink:0;color:var(--steel)">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
      <span style="flex:1">${f.name}</span>
      <span style="color:var(--steel)">${(f.size/1024).toFixed(0)} KB</span>
      <button onclick="removeDelivFile(${i})" style="background:none;border:none;color:var(--steel);cursor:pointer;font-size:14px;padding:0 4px">✕</button>
    </div>`).join('');

  if (btn) btn.style.display = delivFiles.length ? '' : 'none';
}

window.removeDelivFile = function(idx) {
  delivFiles.splice(idx, 1);
  renderDeliverList();
};

async function handleDeliverSubmit(job, btn, msgEl) {
  if (!delivFiles.length) return;
  btn.disabled    = true;
  btn.textContent = 'Uploading…';

  try {
    const urls = [];
    for (const file of delivFiles) {
      const path = `jobs/${job.id}/deliverables/${currentUser.uid}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
      const url  = await uploadFile(path, file);
      urls.push(url);
    }
    await updateJob(job.id, {
      status:       'delivered',
      deliverables: [...(job.deliverables || []), ...urls],
    });
    await createNotification({
      type:    'deliverable_uploaded',
      title:   'Deliverable Uploaded',
      body:    `${currentProfile.fullName} submitted deliverables for job ${job.id}`,
      refId:   job.id,
      refType: 'job',
    });

    btn.textContent       = 'Submitted ✓';
    btn.style.background  = '#3ecf8e';
    btn.style.borderColor = '#3ecf8e';

    if (msgEl) {
      msgEl.textContent  = 'Deliverables submitted successfully. UCH will review and mark the job complete.';
      msgEl.style.color  = '#3ecf8e';
      msgEl.style.display = '';
    }

    // Update local jobs list
    const idx = allJobs.findIndex(j => j.id === job.id);
    if (idx > -1) allJobs[idx].status = 'delivered';

  } catch (err) {
    console.error('Deliver failed', err);
    btn.disabled    = false;
    btn.textContent = 'Submit Deliverables →';
    if (msgEl) {
      msgEl.textContent  = 'Upload failed. Please check your connection and try again.';
      msgEl.style.color  = 'var(--corp-red)';
      msgEl.style.display = '';
    }
  }
}

// ─── EARNINGS TAB ─────────────────────────────────────────────────────────────
async function loadEarningsTab() {
  const p = currentProfile;
  let jobs = [];
  try { jobs = await getFreelancerJobs(currentUser.uid); } catch (_) {}

  const completed = jobs.filter(j => j.status === 'completed' || j.status === 'delivered');

  setEl('earn-total', formatBDT(p.totalEarnings || 0));

  const pendingAmt = completed
    .filter(j => j.paymentStatus !== 'paid')
    .reduce((sum, j) => sum + (j.freelancerPayout || 0), 0);
  setEl('earn-pending', formatBDT(pendingAmt));

  const tbody  = document.getElementById('earnings-tbody');
  if (!tbody) return;

  if (!completed.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--steel);padding:32px">No completed jobs yet.</td></tr>`;
    return;
  }

  const tierPct = TIERS[p.tier]?.payout || 75;
  tbody.innerHTML = [...completed]
    .sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt))
    .map(j => {
      const net    = j.freelancerPayout || 0;
      const gross  = j.budgetMin ? Math.round(j.budgetMin) : Math.round(net / (tierPct / 100));
      const cut    = gross - net;
      const isPaid = j.paymentStatus === 'paid';
      const isProc = j.paymentStatus === 'processing';
      const statusColor = isPaid ? '#3ecf8e' : (isProc ? '#f4a261' : 'var(--steel)');
      const statusText  = isPaid ? 'Paid' : (isProc ? 'Processing' : 'Pending');
      return `
        <tr>
          <td style="font-family:monospace;font-size:12px;color:var(--corp-red)">${(j.id||'').slice(0,16)}</td>
          <td style="font-size:12px;color:var(--steel)">${j.submittedAt ? timeAgo(j.submittedAt) : '—'}</td>
          <td>${formatBDT(gross)}</td>
          <td style="color:var(--steel)">${formatBDT(cut)}</td>
          <td style="font-weight:500">${formatBDT(net)}</td>
          <td><span style="color:${statusColor};font-size:12px">${statusText}</span></td>
        </tr>`;
    }).join('');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function toMs(ts) {
  if (!ts) return 0;
  return ts.toDate ? ts.toDate().getTime() : new Date(ts).getTime();
}

function statusLabel(status) {
  return {
    new:                'New',
    reviewing:          'Reviewing',
    assigned:           'Assigned',
    in_progress:        'In Progress',
    delivered:          'Delivered',
    completed:          'Completed',
    revision_requested: 'Revision Needed',
  }[status] || status;
}
