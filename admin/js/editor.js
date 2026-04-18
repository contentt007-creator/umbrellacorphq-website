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

    // Update topbar
    if (panelTitle && link) {
      panelTitle.textContent = 'Umbrella Corp HQ \u2014 ' + link.querySelector('.link-label')?.textContent;
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

  // ─── Save Button ────────────────────────────────────────────────────────────

  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const activePanel = document.querySelector('.admin-panel.active');
      if (!activePanel) return;

      saveBtn.textContent = 'Saving…';
      saveBtn.classList.add('saving');

      const panelId = activePanel.id.replace('panel-', '');
      savePanelContent(panelId);

      setTimeout(() => {
        saveBtn.textContent = 'Saved \u2713';
        saveBtn.classList.remove('saving');
        saveBtn.classList.add('saved');
        showToast('Changes saved successfully.');

        setTimeout(() => {
          saveBtn.textContent = 'Save Changes';
          saveBtn.classList.remove('saved');
        }, 2000);
      }, 300);
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
  function savePanelContent(panelId) {
    const panel = document.getElementById(`panel-${panelId}`);
    if (!panel) return;

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

      saveContent(key, value);
      flashField(el);
    });

    // Save list editors
    panel.querySelectorAll('.list-editor[data-key]').forEach(list => {
      const key    = list.dataset.key;
      const values = getListValues(list);
      saveContent(key, JSON.stringify(values));
    });

    // Apply settings if in settings panel
    if (panelId === 'settings') applySettings();
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
});
