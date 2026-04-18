/**
 * Umbrella Corp HQ — Admin Storage
 *
 * All site content is stored in localStorage with the 'uch_' prefix.
 * Public pages read from localStorage first, falling back to hardcoded defaults.
 *
 * IMPORTANT:
 * - localStorage is suitable for a static site MVP.
 * - For multi-editor or sensitive data, replace with a backend API.
 * - Export/import provides a manual backup mechanism.
 *
 * Key conventions:
 *   uch_hero_line1        → Hero heading line 1
 *   uch_stat1_number      → Stats counter #1 number
 *   uch_testimonial1_text → Testimonial #1 quote text
 *   uch_cs1_*             → Case study #1 fields
 *   etc.
 */

const KEY_PREFIX = 'uch_';

/** Get a stored value, or return the default */
function getContent(key, defaultValue = '') {
  return localStorage.getItem(KEY_PREFIX + key) ?? defaultValue;
}

/** Save a value to localStorage */
function saveContent(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, value);
    return true;
  } catch (e) {
    console.error('Storage error:', e);
    return false;
  }
}

/** Remove a specific key */
function removeContent(key) {
  localStorage.removeItem(KEY_PREFIX + key);
}

/**
 * Save multiple key-value pairs at once
 * @param {Object} data — plain object of { key: value }
 */
function saveAll(data) {
  let success = true;
  Object.entries(data).forEach(([key, value]) => {
    if (!saveContent(key, value)) success = false;
  });
  return success;
}

/**
 * Export all uch_ keys as a JSON file download
 */
function exportContent() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) {
      data[key.replace(KEY_PREFIX, '')] = localStorage.getItem(key);
    }
  }

  const json    = JSON.stringify(data, null, 2);
  const blob    = new Blob([json], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  const date    = new Date().toISOString().split('T')[0];
  a.href        = url;
  a.download    = `uch-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import content from a JSON file
 * Overwrites all existing uch_ keys with imported values.
 * @param {File} file
 * @returns {Promise<void>}
 */
function importContent(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (typeof data !== 'object' || Array.isArray(data)) {
          return reject(new Error('Invalid JSON format'));
        }

        if (!confirm('This will replace ALL current site content with the imported data. Continue?')) {
          return reject(new Error('Import cancelled'));
        }

        // Clear existing uch_ keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(KEY_PREFIX)) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Write new keys
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(KEY_PREFIX + key, value);
        });

        resolve(Object.keys(data).length);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

/**
 * Reset all uch_ keys to defaults by clearing localStorage
 * (Public pages will fall back to hardcoded HTML defaults)
 */
function resetToDefaults() {
  if (!confirm('This will reset ALL site content to defaults. This cannot be undone. Continue?')) return;

  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  showToast('Content reset to defaults.');
}

// ─── Toast notification helper ─────────────────────────────────────────────

/**
 * Show a brief toast notification at bottom-right
 * @param {string} message
 * @param {string} type — 'success' | 'error'
 */
function showToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'admin-toast';
    toast.innerHTML = `<div class="toast-msg"></div><div class="toast-time"></div>`;
    document.body.appendChild(toast);
  }

  const msg  = toast.querySelector('.toast-msg');
  const time = toast.querySelector('.toast-time');
  if (msg) msg.textContent = message;
  if (time) time.textContent = 'Just now';

  toast.style.borderLeftColor = type === 'error' ? '#e74c3c' : 'var(--success)';
  toast.classList.add('show');

  // Update topbar saved timestamp
  const savedEl = document.getElementById('topbar-saved');
  if (savedEl) {
    const now = new Date();
    savedEl.textContent = `Last saved: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/**
 * Flash a field green to confirm it saved
 * @param {HTMLElement} el
 */
function flashField(el) {
  if (!el) return;
  el.classList.add('saved-flash');
  setTimeout(() => el.classList.remove('saved-flash'), 800);
}

// Expose to global scope for inline usage
window.getContent   = getContent;
window.saveContent  = saveContent;
window.saveAll      = saveAll;
window.exportContent = exportContent;
window.importContent = importContent;
window.resetToDefaults = resetToDefaults;
window.showToast    = showToast;
window.flashField   = flashField;
