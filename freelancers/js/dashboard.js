/**
 * dashboard.js — Freelancer Private Dashboard
 */
import {
  onAuthChange, logoutFreelancer, getFreelancerProfile,
  getFreelancerJobs, updateFreelancerProfile, changeFreelancerPassword,
  getFreelancerNotifications, markNotificationRead,
  uploadFile, updateJob, TIERS, BD_DISTRICTS,
  formatBDT, timeAgo, generateId, createNotification,
} from '../../js/firebase.js';

// ─── Auth guard ───────────────────────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;

onAuthChange(async (user) => {
  if (!user) { window.location.href = 'login.html'; return; }
  const profile = await getFreelancerProfile(user.uid);
  if (!profile || profile.status !== 'approved') {
    await logoutFreelancer();
    window.location.href = 'login.html';
    return;
  }
  currentUser    = user;
  currentProfile = profile;
  initDashboard(profile);
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initDashboard(profile) {
  // Hide auth loading, show dashboard
  const loading   = document.getElementById('fl-auth-loading');
  const dashboard = document.getElementById('fl-dashboard');
  if (loading)   loading.style.display   = 'none';
  if (dashboard) dashboard.style.display = '';

  // Topbar
  const nameEl  = document.getElementById('dash-name');
  const tierEl  = document.getElementById('dash-tier-badge');
  if (nameEl)  nameEl.textContent = profile.fullName?.split(' ')[0] || 'Freelancer';
  if (tierEl) {
    const tier = TIERS[profile.tier] || TIERS.bronze;
    tierEl.textContent = tier.label;
    tierEl.style.color = tier.color;
    tierEl.style.borderColor = tier.color + '55';
  }

  // Tab navigation
  setupTabs();

  // Load initial data
  await loadOverview(profile);
  loadNotifications();

  // Logout
  document.getElementById('fl-logout')?.addEventListener('click', async () => {
    await logoutFreelancer();
    window.location.href = 'login.html';
  });
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  const btns = document.querySelectorAll('.fl-dash-nav-btn[data-tab]');
  const tabs = document.querySelectorAll('.fl-dash-tab');

  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      btns.forEach(b => b.classList.remove('active'));
      tabs.forEach(t => t.style.display = 'none');
      btn.classList.add('active');
      const tabId = 'tab-' + btn.dataset.tab;
      const tab   = document.getElementById(tabId);
      if (tab) tab.style.display = '';

      // Lazy-load tab content
      switch (btn.dataset.tab) {
        case 'jobs':      await loadJobsTab(); break;
        case 'portfolio': loadPortfolioTab();  break;
        case 'profile':   loadProfileTab();    break;
        case 'earnings':  await loadEarningsTab(); break;
      }
    });
  });
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
async function loadOverview(profile) {
  // Stats
  const jobs = await getFreelancerJobs(currentUser.uid);
  const activeJobs    = jobs.filter(j => ['assigned','in_progress','revision_requested'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');

  setEl('stat-active',    activeJobs.length);
  setEl('stat-completed', completedJobs.length);
  setEl('stat-earned',    formatBDT(profile.totalEarnings || 0));
  setEl('stat-rating',    profile.rating ? profile.rating.toFixed(1) + '★' : '—');

  // Tier progress
  renderTierProgress(profile);

  // Recent jobs preview (last 3)
  const recentJobs = [...jobs]
    .sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt))
    .slice(0, 3);
  const listEl = document.getElementById('overview-jobs-list');
  if (listEl) {
    if (!recentJobs.length) {
      listEl.innerHTML = '<p style="color:var(--steel);font-size:13px">No jobs assigned yet.</p>';
    } else {
      listEl.innerHTML = recentJobs.map(j => `
        <div class="fl-overview-job-row">
          <span class="fl-job-id" style="font-family:monospace;color:var(--corp-red);font-size:12px">${j.id?.slice(0,12) || 'JOB'}</span>
          <span style="flex:1;padding:0 12px;font-size:13px">${j.serviceType || 'Project'}</span>
          <span class="fl-job-status-badge ${j.status}">${statusLabel(j.status)}</span>
        </div>`).join('');
    }
  }
}

function renderTierProgress(profile) {
  const tier        = profile.tier || 'bronze';
  const completed   = profile.completedJobs || 0;
  const labelEl     = document.getElementById('tier-progress-label');
  const barEl       = document.getElementById('tier-progress-bar');
  const hintEl      = document.getElementById('tier-progress-hint');
  const badgeEl     = document.getElementById('tier-badge-inline');
  const tierInfo    = TIERS[tier];

  if (badgeEl) {
    badgeEl.textContent = tierInfo?.label || 'Bronze';
    badgeEl.style.color = tierInfo?.color || '#cd7f32';
  }

  let pct = 0;
  let hint = '';
  if (tier === 'bronze') {
    pct  = Math.min(100, Math.round(completed / 8 * 100));
    hint = completed >= 8 ? 'Ready for Silver promotion!' : `${8 - completed} more completed jobs to reach Silver.`;
  } else if (tier === 'silver') {
    pct  = Math.min(100, Math.round((completed - 8) / 12 * 100));
    hint = completed >= 20 ? 'Ready for Gold promotion!' : `${20 - completed} more completed jobs to reach Gold.`;
  } else {
    pct  = 100;
    hint = '★ Maximum tier achieved — you\'re Gold!';
  }

  if (labelEl) labelEl.textContent = `Tier Progress — ${tierInfo?.label || 'Bronze'}`;
  if (barEl)   barEl.style.width   = pct + '%';
  if (hintEl)  hintEl.textContent  = hint;
}

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function loadNotifications() {
  const notifs = await getFreelancerNotifications(currentUser.uid);
  const listEl = document.getElementById('notif-list');
  const countEl = document.getElementById('notif-count');
  const unread = notifs.filter(n => !n.read);

  if (countEl) {
    if (unread.length > 0) {
      countEl.textContent = unread.length;
      countEl.style.display = '';
    } else {
      countEl.style.display = 'none';
    }
  }

  if (!listEl) return;
  if (!notifs.length) {
    listEl.innerHTML = '<p style="color:var(--steel);font-size:13px">No new notifications.</p>';
    return;
  }
  listEl.innerHTML = notifs.map(n => `
    <div class="fl-notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <p style="font-size:13px;margin:0">${n.body || n.title}</p>
      <span style="font-size:11px;color:var(--steel)">${timeAgo(n.createdAt)}</span>
    </div>`).join('');

  listEl.querySelectorAll('.fl-notif-item').forEach(item => {
    item.addEventListener('click', () => {
      markNotificationRead(item.dataset.id);
      item.classList.remove('unread');
    });
  });
}

// ─── JOBS TAB ─────────────────────────────────────────────────────────────────
let allJobs = [];
async function loadJobsTab() {
  allJobs = await getFreelancerJobs(currentUser.uid);
  renderJobsList();
  setupJobDetail();
}

function renderJobsList() {
  const listEl = document.getElementById('jobs-list');
  const detail = document.getElementById('job-detail-panel');
  if (detail) detail.style.display = 'none';
  if (!listEl) return;

  if (!allJobs.length) {
    listEl.innerHTML = '<p style="color:var(--steel);font-size:14px;padding:20px 0">No jobs assigned yet. UCH will notify you when a job matches your skills.</p>';
    return;
  }

  listEl.innerHTML = allJobs.map(j => `
    <div class="fl-job-row" data-job-id="${j.id}" style="cursor:pointer">
      <div class="fl-job-row-main">
        <span class="fl-job-id" style="font-family:monospace;font-size:12px;color:var(--corp-red)">${j.id?.slice(0,16) || '—'}</span>
        <span class="fl-job-service">${j.serviceType || 'Project'}</span>
        <span class="fl-job-status-badge ${j.status}">${statusLabel(j.status)}</span>
      </div>
      <div class="fl-job-row-meta">
        <span style="font-size:12px;color:var(--steel)">Deadline: ${j.deadline || 'TBD'}</span>
        <span style="font-size:12px;color:var(--steel)">Payout: ${j.freelancerPayout ? formatBDT(j.freelancerPayout) : 'TBD'}</span>
        <span style="font-size:12px;color:rgba(255,255,255,0.4)">View Details →</span>
      </div>
    </div>`).join('');

  listEl.querySelectorAll('.fl-job-row').forEach(row => {
    row.addEventListener('click', () => {
      const job = allJobs.find(j => j.id === row.dataset.jobId);
      if (job) showJobDetail(job, listEl);
    });
  });
}

function setupJobDetail() {
  document.getElementById('job-detail-close')?.addEventListener('click', () => {
    document.getElementById('job-detail-panel').style.display = 'none';
    document.getElementById('jobs-list').style.display = '';
  });
}

let deliverableFiles = [];
function showJobDetail(job, listEl) {
  deliverableFiles = [];
  listEl.style.display = 'none';
  const panel = document.getElementById('job-detail-panel');
  panel.style.display = '';

  const tierPayout = TIERS[currentProfile.tier]?.payout || 75;
  const payout     = job.freelancerPayout || 0;

  setEl('jd-title',  `${job.serviceType || 'Project'} — ${(job.id || '').slice(0, 16)}`);
  setEl('jd-payout', formatBDT(payout));

  const metaEl = document.getElementById('jd-meta');
  if (metaEl) metaEl.innerHTML = `
    <span class="fl-job-status-badge ${job.status}">${statusLabel(job.status)}</span>
    <span style="font-size:13px;color:var(--steel)">Deadline: ${job.deadline || 'TBD'}</span>
    <span style="font-size:13px;color:var(--steel)">Your tier cut: ${tierPayout}%</span>`;

  const descEl = document.getElementById('jd-desc');
  if (descEl) descEl.innerHTML = `<p style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75)">${job.description || 'No project description provided.'}</p>
    ${job.referenceLinks?.length ? '<p style="font-size:13px;color:var(--steel);margin-top:12px">References: ' + job.referenceLinks.map(l => `<a href="${l}" target="_blank" style="color:var(--corp-red)">${l}</a>`).join(', ') + '</p>' : ''}`;

  const adminNotesEl = document.getElementById('jd-admin-notes');
  if (adminNotesEl && job.adminNotes) {
    adminNotesEl.innerHTML = `<div style="margin-top:20px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:4px"><p style="font-size:12px;color:var(--steel);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.1em">Note from UCH</p><p style="font-size:13px">${job.adminNotes}</p></div>`;
  }

  // Deliverable upload
  const dropArea  = document.getElementById('deliverable-drop');
  const fileInput = document.getElementById('deliverable-file-input');
  const fileList  = document.getElementById('deliverable-list');
  const uploadBtn = document.getElementById('btn-upload-deliverable');

  dropArea?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    Array.from(fileInput.files).forEach(f => {
      if (!deliverableFiles.find(x => x.name === f.name)) deliverableFiles.push(f);
    });
    renderDeliverableList(fileList, deliverableFiles);
    if (uploadBtn) uploadBtn.style.display = deliverableFiles.length ? '' : 'none';
  });

  uploadBtn?.addEventListener('click', async () => {
    uploadBtn.disabled   = true;
    uploadBtn.textContent = 'Uploading…';
    try {
      const urls = [];
      for (const file of deliverableFiles) {
        const path = `jobs/${job.id}/deliverables/${currentUser.uid}_${file.name}`;
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
        body:    `${currentProfile.fullName} uploaded deliverables for ${job.id}`,
        refId:   job.id,
        refType: 'job',
      });
      uploadBtn.textContent = 'Delivered ✓';
      uploadBtn.style.background = '#3ecf8e';
    } catch (e) {
      uploadBtn.disabled   = false;
      uploadBtn.textContent = 'Upload failed — try again';
    }
  });
}

function renderDeliverableList(el, files) {
  if (!el) return;
  el.innerHTML = files.map(f => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;flex-shrink:0;color:var(--steel)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span>${f.name}</span>
      <span style="color:var(--steel);margin-left:auto">${(f.size/1024).toFixed(0)} KB</span>
    </div>`).join('');
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────
function loadPortfolioTab() {
  const grid   = document.getElementById('portfolio-grid');
  const addBtn = document.getElementById('btn-add-portfolio');
  const items  = currentProfile.portfolioItems || [];
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--steel);font-size:14px">No portfolio items yet.</p>';
    return;
  }
  grid.innerHTML = items.map(item => {
    const statusClass = item.approved ? 'approved' : (item.rejectionReason ? 'rejected' : 'pending');
    const statusText  = item.approved ? 'Approved ✓' : (item.rejectionReason ? `Rejected: ${item.rejectionReason}` : 'Pending Review');
    return `
    <div class="fl-portfolio-dash-item">
      <div class="fl-portfolio-dash-thumb" style="background-image:url(${item.thumbnail || ''});background-size:cover;background-position:center;aspect-ratio:4/3;border-radius:4px;background-color:rgba(255,255,255,0.05)"></div>
      <p style="font-size:13px;font-weight:500;margin-top:8px">${item.title}</p>
      <p style="font-size:11px;color:var(--steel)">${item.category}</p>
      <span class="fl-portfolio-status ${statusClass}">${statusText}</span>
    </div>`;
  }).join('');

  addBtn?.addEventListener('click', () => {
    alert('To add new portfolio items, please use the registration form flow. Full in-dashboard upload coming soon.');
  });
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function loadProfileTab() {
  const p = currentProfile;
  setInputVal('edit-name',            p.fullName || '');
  setInputVal('edit-phone',           p.phone || '');
  setInputVal('edit-bio',             p.bio || '');
  setInputVal('edit-payment-method',  p.paymentMethod || '');
  setInputVal('edit-payment-account', p.paymentAccount || '');

  // District select
  const locSel = document.getElementById('edit-location');
  if (locSel && !locSel.options.length) {
    BD_DISTRICTS.forEach(d => {
      const o = document.createElement('option');
      o.value = d; o.textContent = d;
      locSel.appendChild(o);
    });
    locSel.value = p.location || '';
  }

  // Availability toggle
  const toggle = document.getElementById('avail-toggle');
  if (toggle) {
    toggle.classList.toggle('on', !!p.availableForWork);
    toggle.addEventListener('click', () => toggle.classList.toggle('on'));
  }

  // Profile photo preview
  const photoPreview = document.getElementById('profile-photo-preview');
  const photoEdit    = document.getElementById('profile-photo-edit');
  if (photoPreview) {
    if (p.profilePhoto) {
      photoPreview.style.backgroundImage    = `url(${p.profilePhoto})`;
      photoPreview.style.backgroundSize     = 'cover';
      photoPreview.style.backgroundPosition = 'center';
    }
    photoPreview.addEventListener('click', () => photoEdit?.click());
  }
  photoEdit?.addEventListener('change', () => {
    const file = photoEdit.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (photoPreview) {
        photoPreview.style.backgroundImage = `url(${e.target.result})`;
        photoPreview.style.backgroundSize  = 'cover';
      }
    };
    reader.readAsDataURL(file);
  });

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-profile');
    const msg = document.getElementById('profile-save-msg');
    btn.textContent = 'Saving…'; btn.disabled = true;

    let photoDataUrl = p.profilePhoto;
    const photoFile  = document.getElementById('profile-photo-edit')?.files[0];
    if (photoFile) {
      photoDataUrl = await new Promise(res => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.readAsDataURL(photoFile);
      });
    }

    await updateFreelancerProfile(currentUser.uid, {
      fullName:        document.getElementById('edit-name')?.value.trim(),
      phone:           document.getElementById('edit-phone')?.value.trim(),
      location:        document.getElementById('edit-location')?.value,
      bio:             document.getElementById('edit-bio')?.value.trim(),
      availableForWork: document.getElementById('avail-toggle')?.classList.contains('on'),
      paymentMethod:   document.getElementById('edit-payment-method')?.value,
      paymentAccount:  document.getElementById('edit-payment-account')?.value.trim(),
      profilePhoto:    photoDataUrl,
    });

    // Update local profile cache
    currentProfile.fullName = document.getElementById('edit-name')?.value.trim();

    btn.textContent = 'Save Changes'; btn.disabled = false;
    if (msg) { msg.textContent = 'Profile saved successfully ✓'; msg.style.display = ''; }
    setTimeout(() => { if (msg) msg.style.display = 'none'; }, 3000);
  });

  // Change password
  document.getElementById('btn-change-pw')?.addEventListener('click', async () => {
    const btn     = document.getElementById('btn-change-pw');
    const msg     = document.getElementById('pw-msg');
    const current = document.getElementById('pw-current')?.value;
    const newPw   = document.getElementById('pw-new')?.value;
    const newPw2  = document.getElementById('pw-new2')?.value;

    if (!current || !newPw) { showPwMsg('Please fill in all password fields.', 'error'); return; }
    if (newPw.length < 8)   { showPwMsg('New password must be at least 8 characters.', 'error'); return; }
    if (newPw !== newPw2)   { showPwMsg('New passwords do not match.', 'error'); return; }

    btn.textContent = 'Changing…'; btn.disabled = true;
    const result = await changeFreelancerPassword(current, newPw);
    btn.textContent = 'Change Password'; btn.disabled = false;

    if (result.ok) {
      showPwMsg('Password changed successfully ✓', 'success');
      ['pw-current','pw-new','pw-new2'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    } else {
      showPwMsg(result.error || 'Failed to change password. Check your current password.', 'error');
    }
  });
}

function showPwMsg(msg, type) {
  const el = document.getElementById('pw-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.color   = type === 'error' ? 'var(--corp-red)' : '#3ecf8e';
  el.style.display = '';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── EARNINGS TAB ─────────────────────────────────────────────────────────────
async function loadEarningsTab() {
  const p    = currentProfile;
  const jobs = await getFreelancerJobs(currentUser.uid);
  const completed = jobs.filter(j => j.status === 'completed' || j.status === 'delivered');

  setEl('earn-total',   formatBDT(p.totalEarnings || 0));
  const pendingAmt = completed.filter(j => j.paymentStatus !== 'paid')
    .reduce((sum, j) => sum + (j.freelancerPayout || 0), 0);
  setEl('earn-pending', formatBDT(pendingAmt));

  const tbody = document.getElementById('earnings-tbody');
  if (!tbody) return;
  if (!completed.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--steel);padding:24px">No completed jobs yet.</td></tr>`;
    return;
  }
  const tierPct = TIERS[p.tier]?.payout || 75;
  tbody.innerHTML = completed.map(j => {
    const gross  = j.freelancerPayout ? Math.round(j.freelancerPayout / (tierPct / 100)) : 0;
    const cut    = gross - (j.freelancerPayout || 0);
    const status = j.paymentStatus === 'paid' ? 'Paid' : (j.paymentStatus === 'processing' ? 'Processing' : 'Pending');
    const color  = j.paymentStatus === 'paid' ? '#3ecf8e' : (j.paymentStatus === 'processing' ? 'var(--warning)' : 'var(--steel)');
    return `
    <tr>
      <td style="font-family:monospace;font-size:12px;color:var(--corp-red)">${(j.id||'').slice(0,16)}</td>
      <td style="font-size:12px;color:var(--steel)">${j.submittedAt ? timeAgo(j.submittedAt) : '—'}</td>
      <td>${formatBDT(gross)}</td>
      <td style="color:var(--steel)">${formatBDT(cut)}</td>
      <td style="font-weight:500">${formatBDT(j.freelancerPayout || 0)}</td>
      <td><span style="color:${color};font-size:12px">${status}</span></td>
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
  const labels = {
    new:                'New',
    reviewing:          'Reviewing',
    assigned:           'Assigned',
    in_progress:        'In Progress',
    delivered:          'Delivered',
    completed:          'Completed',
    revision_requested: 'Revision Needed',
  };
  return labels[status] || status;
}
