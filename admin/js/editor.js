/**
 * Umbrella Corp HQ — Admin Editor
 *
 * Handles:
 * - Sidebar navigation between panels
 * - Loading saved content into form fields on panel open
 * - Saving panel content to localStorage on "Save Changes" click
 * - Image URL preview updates
 * - List editor (add/remove/reorder items)
 * - Rich text editor (contenteditable toolbar)
 * - Toggle switches
 * - Color picker live preview
 * - Settings export/import/reset
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Sidebar Navigation ─────────────────────────────────────────────────────

  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-panel]');
  const panels       = document.querySelectorAll('.admin-panel');
  const panelTitle   = document.getElementById('panel-page-title');
  const previewBtn   = document.getElementById('preview-btn');

  const PAGE_MAP = {
    'home':       'index.html',
    'services':   'services.html',
    'work':       'work.html',
    'about':      'about.html',
    'contact':    'contact.html',
    'gallery':    'index.html#trusted-by',
    'testimonials': 'index.html#testimonials',
    'settings':   null,
    'dashboard':  null,
    'leads':          null,
    'freelancers':    null,
    'jobs':           null,
    'notifications':  null,
  };

  function activatePanel(panelId) {
    // Deactivate all
    sidebarLinks.forEach(l => l.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));

    // Activate target
    const link  = document.querySelector(`.sidebar-link[data-panel="${panelId}"]`);
    const panel = document.getElementById(`panel-${panelId}`);

    if (link)  link.classList.add('active');
    if (panel) {
      panel.classList.add('active');
      loadPanelContent(panelId);
    }

    // Update topbar breadcrumb
    if (panelTitle && link) {
      panelTitle.textContent = link.querySelector('.link-label')?.textContent || panelId;
    }

    // Update preview button
    if (previewBtn) {
      const pageFile = PAGE_MAP[panelId];
      previewBtn.style.display = pageFile ? 'block' : 'none';
      previewBtn.dataset.page = pageFile || '';
    }
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => activatePanel(link.dataset.panel));
  });

  // Preview button — opens public page in new tab
  if (previewBtn) {
    previewBtn.addEventListener('click', () => {
      const page = previewBtn.dataset.page;
      if (page) window.open('../' + page, '_blank');
    });
  }

  // Default panel on load
  activatePanel('dashboard');

  // ─── Leads Panel ─────────────────────────────────────────────────────────────

  function getLeads() {
    try { return JSON.parse(localStorage.getItem('uch_leads') || '[]'); } catch { return []; }
  }

  function saveLeads(arr) {
    localStorage.setItem('uch_leads', JSON.stringify(arr));
  }

  function formatLeadDate(isoStr) {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });
    } catch { return '—'; }
  }

  function fmtMoney(n) {
    if (!n && n !== 0) return '—';
    return '৳' + Number(n).toLocaleString('en-IN');
  }

  function scoreClass(s) {
    if (s >= 70) return 'high';
    if (s >= 40) return 'mid';
    return 'low';
  }

  function renderLeadsTable() {
    const leads   = getLeads();
    const tbody   = document.getElementById('leads-tbody');
    const empty   = document.getElementById('leads-empty');
    const tableWrap = document.getElementById('leads-table-wrap');
    if (!tbody) return;

    // Stats
    const totalEl   = document.getElementById('ls-total');
    const avgEl     = document.getElementById('ls-avg-score');
    const topIndEl  = document.getElementById('ls-top-industry');
    const dlEl      = document.getElementById('ls-downloaded');

    if (totalEl)   totalEl.textContent  = leads.length;
    if (dlEl)      dlEl.textContent     = leads.filter(l => l.pdfDownloaded).length;
    if (avgEl) {
      const scores = leads.map(l => Number(l.score)).filter(s => !isNaN(s));
      avgEl.textContent = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : '—';
    }
    if (topIndEl) {
      const freq = {};
      leads.forEach(l => { if (l.industry) freq[l.industry] = (freq[l.industry]||0)+1; });
      const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
      topIndEl.textContent = top ? top[0].split(' ')[0] : '—';
    }

    if (leads.length === 0) {
      if (empty)     empty.style.display     = '';
      if (tableWrap) tableWrap.style.display = 'none';
      return;
    }
    if (empty)     empty.style.display     = 'none';
    if (tableWrap) tableWrap.style.display = '';

    tbody.innerHTML = '';
    leads.forEach((lead, idx) => {
      const tr = document.createElement('tr');
      if (lead.contacted) tr.classList.add('is-contacted');
      tr.dataset.idx = idx;

      const sc = Number(lead.score) || 0;
      const contactedLabel = lead.contacted ? 'Contacted ✓' : 'Mark Done';

      tr.innerHTML = `
        <td style="color:var(--steel)">${leads.length - idx}</td>
        <td style="color:var(--steel)">${formatLeadDate(lead.date)}</td>
        <td style="font-weight:500">${escapeHtml(lead.name || '—')}</td>
        <td><a href="mailto:${escapeHtml(lead.email||'')}" style="color:var(--corp-red);text-decoration:none">${escapeHtml(lead.email||'—')}</a></td>
        <td>${escapeHtml(lead.phone||'—')}</td>
        <td>${escapeHtml(lead.company||'—')}</td>
        <td>${escapeHtml(lead.industry||'—')}</td>
        <td>${fmtMoney(lead.monthlyRevenue)}</td>
        <td>${fmtMoney(lead.monthlyAdSpend)}</td>
        <td><span class="leads-score-badge ${scoreClass(sc)}">${sc}</span></td>
        <td><span class="leads-pdf-dot ${lead.pdfDownloaded ? 'yes' : 'no'}" title="${lead.pdfDownloaded ? 'Downloaded' : 'Not downloaded'}"></span></td>
        <td>
          <button class="leads-action-btn lead-contact-btn ${lead.contacted ? 'contacted' : ''}" data-idx="${idx}">${contactedLabel}</button>
        </td>
        <td>
          <button class="leads-action-btn lead-notes-btn" data-idx="${idx}" title="${escapeHtml(lead.notes||'')}">${lead.notes ? '&#9998; Edit' : '+ Note'}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Mark contacted toggle
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lead-contact-btn');
    if (!btn) return;
    const idx = parseInt(btn.dataset.idx);
    const leads = getLeads();
    if (!leads[idx]) return;
    leads[idx].contacted = !leads[idx].contacted;
    saveLeads(leads);
    renderLeadsTable();
  });

  // Notes modal
  const notesModal   = document.getElementById('lead-notes-modal');
  const notesIdInput = document.getElementById('notes-lead-id');
  const notesTA      = document.getElementById('notes-textarea');

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lead-notes-btn');
    if (!btn || !notesModal) return;
    const idx = parseInt(btn.dataset.idx);
    const leads = getLeads();
    if (!leads[idx]) return;
    notesIdInput.value = idx;
    notesTA.value = leads[idx].notes || '';
    notesModal.style.display = 'flex';
    setTimeout(() => notesTA.focus(), 50);
  });

  function closeNotesModal() {
    if (notesModal) notesModal.style.display = 'none';
  }

  document.getElementById('notes-modal-close')?.addEventListener('click', closeNotesModal);
  document.getElementById('notes-modal-cancel')?.addEventListener('click', closeNotesModal);
  notesModal?.addEventListener('click', (e) => { if (e.target === notesModal) closeNotesModal(); });

  document.getElementById('notes-modal-save')?.addEventListener('click', () => {
    const idx = parseInt(notesIdInput?.value);
    const leads = getLeads();
    if (leads[idx] !== undefined) {
      leads[idx].notes = notesTA.value.trim();
      saveLeads(leads);
      renderLeadsTable();
      closeNotesModal();
    }
  });

  // Export CSV
  document.getElementById('btn-export-leads')?.addEventListener('click', () => {
    const leads = getLeads();
    if (!leads.length) { showToast('No leads to export.', 'error'); return; }

    const headers = ['#','Date','Name','Email','Phone','Company','Industry','Monthly Revenue','Monthly Ad Spend','Score','PDF Downloaded','Contacted','Notes'];
    const rows = leads.map((l, i) => [
      leads.length - i,
      l.date ? new Date(l.date).toLocaleDateString('en-GB') : '',
      l.name || '',
      l.email || '',
      l.phone || '',
      l.company || '',
      l.industry || '',
      l.monthlyRevenue || '',
      l.monthlyAdSpend || '',
      l.score || '',
      l.pdfDownloaded ? 'Yes' : 'No',
      l.contacted ? 'Yes' : 'No',
      (l.notes || '').replace(/"/g,'""'),
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `uch-roi-leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${leads.length} leads to CSV.`);
  });

  // Refresh
  document.getElementById('btn-refresh-leads')?.addEventListener('click', renderLeadsTable);

  // Clear all leads
  document.getElementById('btn-clear-leads')?.addEventListener('click', () => {
    if (!confirm('Delete ALL leads? This cannot be undone.')) return;
    saveLeads([]);
    renderLeadsTable();
    showToast('All leads cleared.');
  });

  // ─── Cloud Sync on Load ─────────────────────────────────────────────────────
  // If Supabase is configured, pull latest content and refresh form fields.

  (async function initCloudSync() {
    const topbarSaved = document.getElementById('topbar-saved');

    // Show mode in topbar
    const isCloud = typeof window.isSupabaseMode === 'function' && window.isSupabaseMode();
    if (topbarSaved) {
      const dot = document.createElement('span');
      dot.className = 'cloud-sync-dot ' + (isCloud ? 'syncing' : 'offline');
      topbarSaved.prepend(dot);
      window._syncDot = dot;
    }

    if (!isCloud) {
      // Update security note to make it clear it's MVP mode
      const note = document.querySelector('.security-note');
      if (note) {
        note.innerHTML = '&#9888;&nbsp; <strong>Legacy Mode</strong> &mdash; Content is stored in this browser only. <a href="../docs/supabase-setup.sql" target="_blank" style="color:var(--warning);text-decoration:underline">Set up Supabase</a> to sync across devices and get real server-side auth.';
      }
      return;
    }

    // Hide security note when Supabase is active
    const note = document.querySelector('.security-note');
    if (note) note.style.display = 'none';

    try {
      const result = await window.syncFromCloud();
      if (window._syncDot) {
        window._syncDot.className = 'cloud-sync-dot ' + (result.synced ? 'synced' : 'offline');
      }
      if (result.synced) {
        // Re-load current panel fields with fresh data
        const activePanel = document.querySelector('.admin-panel.active');
        if (activePanel) {
          const panelId = activePanel.id.replace('panel-', '');
          loadPanelContent(panelId);
        }
        if (topbarSaved) {
          const now = new Date();
          const savedSpan = topbarSaved.querySelector('span:not(.cloud-sync-dot)') || topbarSaved;
          savedSpan.textContent = `Synced from cloud`;
        }
      }
    } catch (e) {
      if (window._syncDot) window._syncDot.className = 'cloud-sync-dot offline';
    }
  })();

  // ─── Save Button ────────────────────────────────────────────────────────────

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const activePanel = document.querySelector('.admin-panel.active');
      if (!activePanel) return;

      saveBtn.textContent  = 'Saving…';
      saveBtn.disabled     = true;
      saveBtn.classList.add('saving');
      if (window._syncDot) window._syncDot.className = 'cloud-sync-dot syncing';

      const panelId = activePanel.id.replace('panel-', '');
      const result  = await savePanelContent(panelId);

      const savedTo = result?.source === 'supabase' ? 'Saved to cloud ✓' : 'Saved locally ✓';
      if (window._syncDot) {
        window._syncDot.className = 'cloud-sync-dot ' + (result?.source === 'supabase' ? 'synced' : 'offline');
      }

      saveBtn.textContent = savedTo;
      saveBtn.disabled    = false;
      saveBtn.classList.remove('saving');
      saveBtn.classList.add('saved');
      showToast(result?.source === 'supabase' ? 'Saved to cloud.' : 'Saved locally (Supabase not configured).');

      setTimeout(() => {
        saveBtn.textContent = 'Save Changes';
        saveBtn.classList.remove('saved');
      }, 2200);
    });
  }

  // ─── Image Preview ───────────────────────────────────────────────────────────

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('img-url-input')) {
      const preview = e.target.closest('.img-field-wrap')?.querySelector('.img-preview');
      if (!preview) return;
      const url = e.target.value.trim();
      if (url) {
        preview.innerHTML = `<img src="${url}" alt="preview" onerror="this.parentElement.innerHTML='<span class=\\'img-preview-empty\\'>Invalid URL</span>'">`;
      } else {
        preview.innerHTML = '<span class="img-preview-empty">No image</span>';
      }
    }
  });

  // ─── Toggle Switches ────────────────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle')) {
      e.target.classList.toggle('on');
    }
  });

  // ─── List Editor ─────────────────────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    // Add item
    if (e.target.closest('.list-add-btn')) {
      const btn  = e.target.closest('.list-add-btn');
      const list = btn.closest('.list-editor');
      if (!list) return;
      const item = createListItem('');
      list.insertBefore(item, btn);
      item.querySelector('input')?.focus();
    }

    // Remove item
    if (e.target.closest('.list-item-del')) {
      const item = e.target.closest('.list-editor-item');
      if (item) item.remove();
    }

    // Move up
    if (e.target.closest('.list-item-up')) {
      const item = e.target.closest('.list-editor-item');
      const prev = item?.previousElementSibling;
      if (item && prev) item.parentNode.insertBefore(item, prev);
    }

    // Move down
    if (e.target.closest('.list-item-dn')) {
      const item = e.target.closest('.list-editor-item');
      const next = item?.nextElementSibling;
      if (item && next) item.parentNode.insertBefore(next, item);
    }
  });

  function createListItem(value) {
    const div = document.createElement('div');
    div.className = 'list-editor-item';
    div.innerHTML = `
      <input type="text" class="field-input" value="${escapeHtml(value)}" placeholder="Enter item…">
      <button class="list-btn-sm list-item-up" title="Move up">&#8593;</button>
      <button class="list-btn-sm list-item-dn" title="Move down">&#8595;</button>
      <button class="list-btn-sm del list-item-del" title="Remove">&#215;</button>
    `;
    return div;
  }

  function getListValues(listEl) {
    return Array.from(listEl.querySelectorAll('.list-editor-item input'))
      .map(i => i.value.trim())
      .filter(Boolean);
  }

  function populateList(listEl, values) {
    // Remove all existing items (but keep the Add button)
    const addBtn = listEl.querySelector('.list-add-btn');
    listEl.querySelectorAll('.list-editor-item').forEach(i => i.remove());
    values.forEach(v => {
      const item = createListItem(v);
      listEl.insertBefore(item, addBtn);
    });
  }

  // ─── Rich Text Toolbar ───────────────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.rich-btn[data-cmd]');
    if (!btn) return;
    e.preventDefault();

    const cmd = btn.dataset.cmd;
    const val = btn.dataset.val || null;

    // Find the associated contenteditable
    const toolbar  = btn.closest('.rich-toolbar');
    const editable = toolbar?.nextElementSibling;
    if (!editable) return;

    editable.focus();

    // TODO: execCommand is deprecated but still widely supported.
    // TODO: Replace with TipTap or Quill in production.
    document.execCommand(cmd, false, val);
  });

  // ─── Color Picker Live Preview ────────────────────────────────────────────────

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('color-input')) {
      const swatch = e.target.closest('.color-field-wrap')?.querySelector('.color-swatch');
      if (swatch) swatch.style.background = e.target.value;

      // Live apply to CSS variable if data-var is set
      const cssVar = e.target.dataset.cssVar;
      if (cssVar) document.documentElement.style.setProperty(cssVar, e.target.value);
    }
  });

  // ─── Case Study Expand/Collapse ───────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    const header = e.target.closest('.cs-editor-header');
    if (!header) return;
    const body = header.nextElementSibling;
    if (body && body.classList.contains('cs-editor-body')) {
      body.classList.toggle('open');
    }
  });

  // ─── Quick link cards (dashboard) ────────────────────────────────────────────

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.quick-link-card[data-goto]');
    if (!card) return;
    activatePanel(card.dataset.goto);
  });

  // ─── Settings Panel: Export/Import/Reset ──────────────────────────────────────

  const exportBtn = document.getElementById('btn-export');
  const importBtn = document.getElementById('btn-import');
  const importInput = document.getElementById('import-file-input');
  const resetBtn  = document.getElementById('btn-reset');

  if (exportBtn) exportBtn.addEventListener('click', exportContent);
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async () => {
      const file = importInput.files[0];
      if (!file) return;
      try {
        const count = await importContent(file);
        showToast(`Imported ${count} content fields.`);
        // Reload current panel content
        const activePanel = document.querySelector('.admin-panel.active');
        if (activePanel) {
          const pid = activePanel.id.replace('panel-', '');
          loadPanelContent(pid);
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
      importInput.value = '';
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetToDefaults();
      const activePanel = document.querySelector('.admin-panel.active');
      if (activePanel) {
        const pid = activePanel.id.replace('panel-', '');
        loadPanelContent(pid);
      }
    });
  }

  // ─── Change Admin Password ─────────────────────────────────────────────────

  const changePwBtn = document.getElementById('btn-change-password');
  if (changePwBtn) {
    changePwBtn.addEventListener('click', () => {
      // TODO: In production, this should call a backend endpoint.
      showToast('Password change requires backend integration. See code comments.', 'error');
    });
  }

  // ─── Load/Save Helpers ────────────────────────────────────────────────────────

  /**
   * Populate form fields in a panel with stored content
   */
  function loadPanelContent(panelId) {
    if (panelId === 'leads') { renderLeadsTable(); return; }
    const panel = document.getElementById(`panel-${panelId}`);
    if (!panel) return;

    // All inputs with data-key get populated
    panel.querySelectorAll('[data-key]').forEach(el => {
      const key     = el.dataset.key;
      const defVal  = el.dataset.default || '';
      const stored  = getContent(key, defVal);

      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.value = stored;
        // Trigger swatch update for color inputs
        if (el.classList.contains('color-input')) {
          const swatch = el.closest('.color-field-wrap')?.querySelector('.color-swatch');
          if (swatch) swatch.style.background = stored;
        }
        // Trigger img preview update
        if (el.classList.contains('img-url-input')) {
          const preview = el.closest('.img-field-wrap')?.querySelector('.img-preview');
          if (preview && stored) {
            preview.innerHTML = `<img src="${stored}" alt="preview">`;
          }
        }
      } else if (el.tagName === 'TEXTAREA') {
        el.value = stored;
      } else if (el.contentEditable === 'true') {
        el.innerHTML = stored;
      } else if (el.classList.contains('toggle')) {
        if (stored === 'true') el.classList.add('on');
        else el.classList.remove('on');
      }
    });

    // Populate list editors
    panel.querySelectorAll('.list-editor[data-key]').forEach(list => {
      const key    = list.dataset.key;
      const defVal = list.dataset.default || '[]';
      let values   = [];
      try { values = JSON.parse(getContent(key, defVal)); } catch {}
      if (Array.isArray(values) && values.length) populateList(list, values);
    });
  }

  /**
   * Read form fields from a panel and save to localStorage
   */
  async function savePanelContent(panelId) {
    const panel = document.getElementById(`panel-${panelId}`);
    if (!panel) return { ok: false, source: 'none' };

    const batch = {};

    panel.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      let value = '';

      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        value = el.value;
      } else if (el.tagName === 'TEXTAREA') {
        value = el.value;
      } else if (el.contentEditable === 'true') {
        value = el.innerHTML;
      } else if (el.classList.contains('toggle')) {
        value = el.classList.contains('on') ? 'true' : 'false';
      }

      batch[key] = value;
      flashField(el);
    });

    // Add list editors to batch
    panel.querySelectorAll('.list-editor[data-key]').forEach(list => {
      const key    = list.dataset.key;
      const values = getListValues(list);
      batch[key]   = JSON.stringify(values);
    });

    // One batched save — syncs both localStorage + Supabase
    const result = await saveAll(batch);

    // Apply settings if in settings panel
    if (panelId === 'settings') applySettings();

    return result;
  }

  /**
   * Apply colour and analytics settings live
   */
  function applySettings() {
    const corpRed = getContent('corp_red', '');
    if (corpRed) document.documentElement.style.setProperty('--corp-red', corpRed);
  }

  // ─── Utility ──────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Expose activatePanel for inline onclick attrs
  window.activatePanel = activatePanel;

  // Apply any saved CSS overrides immediately
  applySettings();

  // ─── Admin Firebase Platform Panels ─────────────────────────────────────────
  // Lazy-load Firebase only when Freelancers/Jobs/Notifications panels are opened

  const FIREBASE_PANELS = ['freelancers', 'jobs', 'notifications'];
  let fbModule = null;

  async function loadFBModule() {
    if (fbModule) return fbModule;
    // Use dedicated REST-API module — avoids Firebase SDK hanging in admin context
    fbModule = await import('./firebase-admin.js');
    return fbModule;
  }

  // Hook into activatePanel to lazy-load Firebase panels
  const _origActivate = window.activatePanel;
  window.activatePanel = async function(panelId) {
    _origActivate(panelId);
    if (!FIREBASE_PANELS.includes(panelId)) return;
    const fb = await loadFBModule();
    if (panelId === 'freelancers')    loadAdminFreelancers(fb);
    if (panelId === 'jobs')           loadAdminJobs(fb);
    if (panelId === 'notifications')  loadAdminNotifications(fb);
  };

  // ─── Freelancers panel ───────────────────────────────────────────────────────

  let allFreelancers = [];
  let flFilter = 'all';

  async function loadAdminFreelancers(fb) {
    const tbody = document.getElementById('fl-admin-tbody');
    try {
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--steel)">Loading…</td></tr>`;
      console.log('[UCH Admin] Fetching freelancers from Firestore…');
      const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout — Firestore did not respond in 10s. Firestore rules may still require auth. Set: allow read: if true')), 10000)
      );
      allFreelancers = await Promise.race([fb.getAllFreelancers(), timeout]);
      console.log('[UCH Admin] Loaded', allFreelancers.length, 'freelancer(s)');
    } catch (err) {
      console.error('loadAdminFreelancers failed', err);
      const code = err?.code || err?.message || 'unknown';
      const hint = code.includes('permission') || code.includes('PERMISSION')
        ? `Firestore rules are blocking reads.<br>
           <strong style="color:#fff">Fix 1 (recommended):</strong> Firebase Console → Authentication → Sign-in method → Anonymous → <strong>Enable</strong><br>
           <strong style="color:#fff">Then update Firestore Rules:</strong><br>
           <code style="font-size:10px;display:block;margin:6px 0;background:rgba(255,255,255,0.05);padding:6px;border-radius:3px;white-space:pre">match /freelancers/{uid} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid;
}</code>`
        : `Error: ${code}`;
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="padding:20px 16px;color:var(--corp-red);line-height:1.8;font-size:12px">
        ⚠️ Could not load freelancers<br>${hint}
      </td></tr>`;
      return;
    }
    renderFreelancersTable();
    updateFlStats();

    // Filter tabs
    document.querySelectorAll('[data-fl-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-fl-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        flFilter = btn.dataset.flFilter;
        renderFreelancersTable();
      });
    });

    // Modal close
    document.getElementById('fl-modal-close')?.addEventListener('click', () => {
      document.getElementById('fl-detail-modal').style.display = 'none';
    });
  }

  function updateFlStats() {
    const setS = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setS('fl-stat-total-admin',   allFreelancers.length);
    setS('fl-stat-pending-admin', allFreelancers.filter(f => f.status === 'pending').length);
    setS('fl-stat-active-admin',  allFreelancers.filter(f => f.status === 'approved').length);
    const ratings = allFreelancers.filter(f => f.rating > 0).map(f => f.rating);
    setS('fl-stat-avg-rating', ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1)+'★' : '—');
  }

  function renderFreelancersTable() {
    const tbody = document.getElementById('fl-admin-tbody');
    if (!tbody) return;
    const filtered = flFilter === 'all' ? allFreelancers : allFreelancers.filter(f => f.status === flFilter);
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--steel)">No freelancers in this category.</td></tr>`;
      return;
    }
    const tierColor = { gold:'#FFD700', silver:'#c0c0c0', bronze:'#cd7f32' };
    tbody.innerHTML = filtered.map(f => `
      <tr>
        <td>
          <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.07);overflow:hidden;flex-shrink:0">
            ${f.profilePhoto ? `<img src="${f.profilePhoto}" style="width:100%;height:100%;object-fit:cover">` : ''}
          </div>
        </td>
        <td style="font-weight:500">${escapeHtml(f.fullName || '—')}</td>
        <td style="font-size:12px;color:var(--steel)">${escapeHtml(f.specialisation || '—')}</td>
        <td style="font-size:11px">${(f.skills||[]).slice(0,3).map(s=>`<span style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;margin-right:3px">${escapeHtml(s)}</span>`).join('')}</td>
        <td><span style="color:${tierColor[f.tier]||'#cd7f32'};font-size:12px;font-weight:500">${(f.tier||'bronze').toUpperCase()}</span></td>
        <td>${f.completedJobs||0}</td>
        <td>${f.rating ? f.rating.toFixed(1)+'★' : '—'}</td>
        <td><span class="leads-score-badge ${f.status==='approved'?'high':f.status==='pending'?'mid':'low'}">${f.status||'pending'}</span></td>
        <td><button class="leads-action-btn fl-view-btn" data-uid="${f.uid}">View</button></td>
      </tr>`).join('');

    tbody.querySelectorAll('.fl-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fl = allFreelancers.find(f => f.uid === btn.dataset.uid);
        if (fl) showFreelancerModal(fl);
      });
    });
  }

  async function showFreelancerModal(fl) {
    const modal   = document.getElementById('fl-detail-modal');
    const nameEl  = document.getElementById('fl-modal-name');
    const bodyEl  = document.getElementById('fl-modal-body');
    const actEl   = document.getElementById('fl-modal-actions');
    if (!modal) return;

    nameEl.textContent = fl.fullName + ' — ' + (fl.id || '');
    bodyEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><span style="color:var(--steel)">Email:</span> <a href="mailto:${fl.email}" style="color:var(--corp-red)">${fl.email||'—'}</a></div>
        <div><span style="color:var(--steel)">Phone:</span> ${fl.phone||'—'}</div>
        <div><span style="color:var(--steel)">Location:</span> ${fl.location||'—'}</div>
        <div><span style="color:var(--steel)">Experience:</span> ${fl.yearsExperience||'—'} yrs</div>
        <div><span style="color:var(--steel)">Capacity:</span> ${fl.weeklyCapacity||'—'} hrs/week</div>
        <div><span style="color:var(--steel)">Joined:</span> ${fl.joinDate?.toDate ? fl.joinDate.toDate().toLocaleDateString() : '—'}</div>
      </div>
      <p style="margin-top:12px;font-size:13px;color:rgba(255,255,255,0.7)">${fl.bio||''}</p>
      <div style="margin-top:16px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--steel);margin-bottom:8px">Skills</p>
        <div>${(fl.skills||[]).map(s=>`<span style="background:rgba(255,255,255,0.06);padding:3px 8px;border-radius:3px;margin:2px;display:inline-block;font-size:12px">${escapeHtml(s)}</span>`).join('')}</div>
      </div>
      <div style="margin-top:16px">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--steel);margin-bottom:8px">Portfolio (${(fl.portfolioItems||[]).length} items)</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px">
          ${(fl.portfolioItems||[]).map(item => `
            <div style="position:relative">
              <div style="aspect-ratio:1;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;${item.thumbnail?`background-image:url(${item.thumbnail});background-size:cover`:''}">${!item.thumbnail?'<span style="color:var(--steel);font-size:11px;display:flex;align-items:center;justify-content:center;height:100%">No img</span>':''}</div>
              <p style="font-size:10px;color:var(--steel);margin-top:4px">${escapeHtml(item.title||'')}</p>
              <span style="font-size:10px;color:${item.approved?'#3ecf8e':'var(--warning)'}">${item.approved?'✓':'Pending'}</span>
            </div>`).join('')}
        </div>
      </div>
      <div style="margin-top:16px">
        <label style="font-size:12px;color:var(--steel);display:block;margin-bottom:6px">Set Rating (1–5)</label>
        <input type="number" id="fl-set-rating" min="1" max="5" step="0.1" value="${fl.rating||0}" class="field-input" style="width:100px">
        <label style="font-size:12px;color:var(--steel);display:block;margin-top:12px;margin-bottom:6px">Admin Notes</label>
        <textarea id="fl-admin-notes" class="field-textarea" rows="2">${fl.adminNotes||''}</textarea>
      </div>`;

    const fb = await loadFBModule();
    actEl.innerHTML = '';

    if (fl.status === 'pending') {
      addModalBtn(actEl, 'Approve', 'btn-export', async () => {
        await fb.adminUpdateFreelancer(fl.uid, { status: 'approved' });
        fl.status = 'approved';
        showToast('Freelancer approved.'); modal.style.display='none'; renderFreelancersTable(); updateFlStats();
      });
      addModalBtn(actEl, 'Reject', 'btn-danger', async () => {
        const reason = prompt('Rejection reason (shown to freelancer):');
        if (reason === null) return;
        await fb.adminUpdateFreelancer(fl.uid, { status: 'rejected', adminNotes: reason });
        fl.status = 'rejected'; modal.style.display='none'; renderFreelancersTable(); updateFlStats();
      });
    }
    if (fl.status === 'approved') {
      addModalBtn(actEl, 'Suspend', 'btn-danger', async () => {
        await fb.adminUpdateFreelancer(fl.uid, { status: 'suspended' });
        fl.status = 'suspended'; modal.style.display='none'; renderFreelancersTable();
      });
    }
    ['bronze','silver','gold'].forEach(tier => {
      addModalBtn(actEl, '→ ' + tier.charAt(0).toUpperCase()+tier.slice(1), 'btn-export', async () => {
        await fb.adminUpdateFreelancer(fl.uid, { tier });
        fl.tier = tier; showToast(`Tier set to ${tier}.`);
      });
    });
    addModalBtn(actEl, 'Save Rating & Notes', 'btn-export', async () => {
      const rating = parseFloat(document.getElementById('fl-set-rating')?.value) || 0;
      const notes  = document.getElementById('fl-admin-notes')?.value || '';
      await fb.adminUpdateFreelancer(fl.uid, { rating, adminNotes: notes });
      showToast('Saved.');
    });

    modal.style.display = 'flex';
  }

  function addModalBtn(container, label, cls, handler) {
    const btn = document.createElement('button');
    btn.className = cls; btn.textContent = label;
    btn.style.fontSize = '12px'; btn.style.padding = '8px 14px';
    btn.addEventListener('click', handler);
    container.appendChild(btn);
  }

  // ─── Jobs panel ──────────────────────────────────────────────────────────────

  let allJobs = [];
  let jobFilter = 'all';

  async function loadAdminJobs(fb) {
    allJobs = await fb.getAllJobs();
    renderJobsTable();

    document.querySelectorAll('[data-job-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-job-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        jobFilter = btn.dataset.jobFilter;
        renderJobsTable();
      });
    });

    document.getElementById('job-modal-close')?.addEventListener('click', () => {
      document.getElementById('job-detail-modal').style.display = 'none';
    });
  }

  function renderJobsTable() {
    const tbody = document.getElementById('jobs-admin-tbody');
    if (!tbody) return;
    const filtered = jobFilter === 'all' ? allJobs : allJobs.filter(j => j.status === jobFilter);
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--steel)">No jobs in this category.</td></tr>`;
      return;
    }
    const statusColor = { new:'var(--corp-red)', reviewing:'var(--warning)', assigned:'#60a5fa',
      in_progress:'#a78bfa', delivered:'#34d399', completed:'#3ecf8e' };
    tbody.innerHTML = filtered.map(j => `
      <tr>
        <td style="font-family:monospace;font-size:11px;color:var(--corp-red)">${(j.id||'').slice(0,14)}</td>
        <td style="font-size:11px;color:var(--steel)">${j.submittedAt?.toDate ? j.submittedAt.toDate().toLocaleDateString('en-GB') : '—'}</td>
        <td style="font-size:13px">${escapeHtml(j.clientName||'—')}</td>
        <td style="font-size:12px;color:var(--steel)">${escapeHtml(j.serviceType||'—')}</td>
        <td style="font-size:12px">${j.budget||'—'}</td>
        <td style="font-size:12px;color:var(--steel)">${j.deadline||'—'}</td>
        <td><span style="color:${statusColor[j.status]||'var(--steel)'};font-size:12px">${j.status||'new'}</span></td>
        <td style="font-size:11px;color:var(--steel)">${(j.assignedFreelancers||[]).length ? j.assignedFreelancers.length + ' assigned' : '—'}</td>
        <td><button class="leads-action-btn job-view-btn" data-id="${j.id}">View</button></td>
      </tr>`).join('');

    tbody.querySelectorAll('.job-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const job = allJobs.find(j => j.id === btn.dataset.id);
        if (job) showJobModal(job);
      });
    });
  }

  async function showJobModal(job) {
    const modal  = document.getElementById('job-detail-modal');
    const titleEl = document.getElementById('job-modal-title');
    const bodyEl  = document.getElementById('job-modal-body');
    const actEl   = document.getElementById('job-modal-actions');
    if (!modal) return;

    titleEl.textContent = `${job.serviceType||'Job'} — ${(job.id||'').slice(0,16)}`;
    bodyEl.innerHTML = `
      <div style="background:rgba(193,18,31,0.08);border:1px solid rgba(193,18,31,0.2);border-radius:4px;padding:12px;margin-bottom:16px;font-size:12px;color:rgba(255,255,255,0.7)">
        <strong style="color:var(--corp-red)">Client Details (confidential)</strong><br>
        ${escapeHtml(job.clientName||'—')} &bull; <a href="mailto:${job.clientEmail}" style="color:var(--corp-red)">${job.clientEmail||'—'}</a> &bull; ${job.clientPhone||'—'}
        ${job.clientCompany ? ` &bull; ${escapeHtml(job.clientCompany)}` : ''}
      </div>
      <div style="font-size:13px;line-height:1.7;color:rgba(255,255,255,0.75);margin-bottom:16px">${job.description||'No description.'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;margin-bottom:16px">
        <div><span style="color:var(--steel)">Budget:</span> ${job.budget||'—'}</div>
        <div><span style="color:var(--steel)">Deadline:</span> ${job.deadline||'—'}</div>
        <div><span style="color:var(--steel)">Status:</span> ${job.status||'new'}</div>
        <div><span style="color:var(--steel)">UCH Cut:</span> ${job.uchCutPercent||25}%</div>
        <div><span style="color:var(--steel)">Freelancer Payout:</span> ${job.freelancerPayout ? '৳'+Number(job.freelancerPayout).toLocaleString() : 'Not set'}</div>
        <div><span style="color:var(--steel)">Assigned:</span> ${(job.assignedFreelancers||[]).length} freelancer(s)</div>
      </div>
      ${job.referenceLinks?.length ? `<div style="margin-bottom:12px;font-size:12px"><span style="color:var(--steel)">References: </span>${job.referenceLinks.map(l=>`<a href="${l}" target="_blank" style="color:var(--corp-red)">${l}</a>`).join(', ')}</div>` : ''}
      <div style="margin-top:12px">
        <label style="font-size:12px;color:var(--steel);display:block;margin-bottom:6px">Update Status</label>
        <select id="job-status-select" class="field-input" style="width:200px">
          ${['new','reviewing','assigned','in_progress','delivered','completed'].map(s=>`<option value="${s}" ${job.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div style="margin-top:12px">
        <label style="font-size:12px;color:var(--steel);display:block;margin-bottom:6px">UCH Cut %</label>
        <input type="number" id="job-cut-input" value="${job.uchCutPercent||25}" min="0" max="100" class="field-input" style="width:100px">
      </div>
      <div style="margin-top:12px">
        <label style="font-size:12px;color:var(--steel);display:block;margin-bottom:6px">Admin Notes</label>
        <textarea id="job-admin-notes" class="field-textarea" rows="2">${job.adminNotes||''}</textarea>
      </div>`;

    const fb = await loadFBModule();
    actEl.innerHTML = '';
    addModalBtn(actEl, 'Save Changes', 'btn-export', async () => {
      const newStatus = document.getElementById('job-status-select')?.value;
      const newCut    = parseInt(document.getElementById('job-cut-input')?.value) || 25;
      const notes     = document.getElementById('job-admin-notes')?.value || '';
      await fb.updateJob(job.id, { status: newStatus, uchCutPercent: newCut, adminNotes: notes });
      job.status = newStatus; job.uchCutPercent = newCut; job.adminNotes = notes;
      showToast('Job updated.'); renderJobsTable();
    });
    if (job.deliverables?.length) {
      addModalBtn(actEl, `Download Deliverables (${job.deliverables.length})`, 'btn-export', () => {
        job.deliverables.forEach((url, i) => {
          const a = document.createElement('a');
          a.href = url; a.download = `deliverable_${i+1}`; a.target = '_blank';
          a.click();
        });
      });
    }

    modal.style.display = 'flex';
  }

  // ─── Notifications panel ─────────────────────────────────────────────────────

  async function loadAdminNotifications(fb) {
    const notifs = await fb.getAdminNotifications(100);
    renderAdminNotifications(notifs, fb);

    document.getElementById('btn-refresh-notifs')?.addEventListener('click', async () => {
      const fresh = await fb.getAdminNotifications(100);
      renderAdminNotifications(fresh, fb);
    });
    document.getElementById('btn-mark-all-read')?.addEventListener('click', async () => {
      await Promise.all(notifs.filter(n=>!n.read).map(n => fb.markNotificationRead(n.id)));
      notifs.forEach(n => n.read = true);
      renderAdminNotifications(notifs, fb);
      const badge = document.getElementById('admin-notif-badge');
      if (badge) badge.style.display = 'none';
    });

    // Update badge
    const unread = notifs.filter(n => !n.read).length;
    const badge  = document.getElementById('admin-notif-badge');
    if (badge) { badge.textContent = unread; badge.style.display = unread ? '' : 'none'; }
  }

  function renderAdminNotifications(notifs, fb) {
    const el = document.getElementById('admin-notif-list');
    if (!el) return;
    if (!notifs.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--steel)">No notifications yet.</div>'; return; }

    const icons = {
      new_application:      '🔴',
      new_brief:            '🟡',
      deliverable_uploaded: '🟢',
      admin_message:        '🔵',
    };
    el.innerHTML = notifs.map(n => `
      <div class="activity-item ${n.read ? '' : 'unread-notif'}" data-id="${n.id}" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04)">
        <span style="font-size:16px;margin-right:10px">${icons[n.type]||'⚪'}</span>
        <div style="flex:1">
          <p style="font-size:13px;font-weight:${n.read?'400':'500'}">${n.body||n.title}</p>
          <span style="font-size:11px;color:var(--steel)">${n.createdAt?.toDate ? timeAgo(n.createdAt.toDate()) : '—'}</span>
        </div>
        ${!n.read ? '<span style="width:6px;height:6px;border-radius:50%;background:var(--corp-red);flex-shrink:0;margin-left:8px;align-self:center"></span>' : ''}
      </div>`).join('');

    el.querySelectorAll('[data-id]').forEach(item => {
      item.addEventListener('click', () => {
        fb.markNotificationRead(item.dataset.id);
        item.classList.remove('unread-notif');
        item.querySelector('span[style*="border-radius:50%"]')?.remove();
      });
    });
  }

  function timeAgo(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff/60) + 'm ago';
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
    return Math.floor(diff/86400) + 'd ago';
  }
});
