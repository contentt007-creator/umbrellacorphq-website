/**
 * Umbrella Corp HQ — Admin Storage
 * ─────────────────────────────────────────────────────────────
 * DUAL MODE:
 *   ① Supabase mode  — syncs to cloud database (site_content table)
 *      All editors see the same content instantly on any device.
 *      localStorage acts as a write-through cache (offline support).
 *
 *   ② Legacy mode    — localStorage only
 *      Content lives in the browser. Clearing browser data = data loss.
 *      Use Export/Import for manual backups.
 * ─────────────────────────────────────────────────────────────
 */

const KEY_PREFIX = 'uch_';

/* ─────────────────────────────────────────────────────────────
 * LOW-LEVEL: localStorage read/write
 * ───────────────────────────────────────────────────────────── */

function lsGet(key, defaultValue = '') {
  return localStorage.getItem(KEY_PREFIX + key) ?? defaultValue;
}

function lsSet(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, value);
    return true;
  } catch (e) {
    console.error('[UCH] localStorage write failed:', e);
    return false;
  }
}

function lsRemove(key) {
  localStorage.removeItem(KEY_PREFIX + key);
}

/* ─────────────────────────────────────────────────────────────
 * PUBLIC API: getContent / saveContent / saveAll / removeContent
 * ───────────────────────────────────────────────────────────── */

/** Get a value — localStorage first (instant) */
function getContent(key, defaultValue = '') {
  return lsGet(key, defaultValue);
}

/**
 * Save a value.
 * Always writes to localStorage immediately.
 * If Supabase is configured, also upserts to the cloud DB.
 * Returns a Promise that resolves to { ok: bool, source: 'supabase'|'local' }
 */
async function saveContent(key, value) {
  lsSet(key, value); // write-through cache — always instant

  const sb = typeof window.getSupabaseClient === 'function'
    ? window.getSupabaseClient()
    : null;

  if (!sb) return { ok: true, source: 'local' };

  try {
    const { error } = await sb
      .from('site_content')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('[UCH] Supabase write error:', error.message);
      return { ok: false, source: 'local' };
    }

    return { ok: true, source: 'supabase' };
  } catch (e) {
    console.warn('[UCH] Supabase unreachable:', e.message);
    return { ok: false, source: 'local' };
  }
}

/**
 * Save multiple keys at once — batched upsert to Supabase.
 * @param {Object} data — { key: value, ... }
 */
async function saveAll(data) {
  // Write all to localStorage instantly
  Object.entries(data).forEach(([k, v]) => lsSet(k, v));

  const sb = typeof window.getSupabaseClient === 'function'
    ? window.getSupabaseClient()
    : null;

  if (!sb) return { ok: true, source: 'local' };

  try {
    const rows = Object.entries(data).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb
      .from('site_content')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      console.warn('[UCH] Supabase batch write error:', error.message);
      return { ok: false, source: 'local' };
    }

    return { ok: true, source: 'supabase' };
  } catch (e) {
    console.warn('[UCH] Supabase unreachable:', e.message);
    return { ok: false, source: 'local' };
  }
}

/** Remove a key from both localStorage and Supabase */
async function removeContent(key) {
  lsRemove(key);

  const sb = typeof window.getSupabaseClient === 'function'
    ? window.getSupabaseClient()
    : null;

  if (!sb) return;

  try {
    await sb.from('site_content').delete().eq('key', key);
  } catch (e) {
    console.warn('[UCH] Supabase delete error:', e.message);
  }
}

/* ─────────────────────────────────────────────────────────────
 * SYNC: Pull latest from Supabase → overwrite localStorage
 * Call on admin page load to ensure fresh data.
 * ───────────────────────────────────────────────────────────── */
async function syncFromCloud() {
  const sb = typeof window.getSupabaseClient === 'function'
    ? window.getSupabaseClient()
    : null;

  if (!sb) return { synced: false, count: 0 };

  try {
    const { data, error } = await sb
      .from('site_content')
      .select('key, value');

    if (error || !data) return { synced: false, count: 0 };

    data.forEach(({ key, value }) => lsSet(key, value));
    return { synced: true, count: data.length };
  } catch (e) {
    console.warn('[UCH] Cloud sync failed:', e.message);
    return { synced: false, count: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────
 * EXPORT / IMPORT / RESET
 * ───────────────────────────────────────────────────────────── */

function exportContent() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) {
      data[k.replace(KEY_PREFIX, '')] = localStorage.getItem(k);
    }
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href     = url;
  a.download = `uch-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importContent(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'));
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (typeof data !== 'object' || Array.isArray(data)) {
          return reject(new Error('Invalid JSON format'));
        }

        if (!confirm('This will replace ALL current site content. Continue?')) {
          return reject(new Error('Import cancelled'));
        }

        // Clear existing uch_ keys
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));

        // Write all new keys (fires Supabase batch too)
        await saveAll(data);

        resolve(Object.keys(data).length);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

async function resetToDefaults() {
  if (!confirm('Reset ALL site content to defaults? This cannot be undone.')) return;

  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));

  // Also clear from Supabase if configured
  const sb = typeof window.getSupabaseClient === 'function'
    ? window.getSupabaseClient()
    : null;

  if (sb) {
    try {
      await sb.from('site_content').delete().neq('key', '__placeholder__');
    } catch (e) {
      console.warn('[UCH] Cloud reset error:', e.message);
    }
  }

  showToast('Content reset to defaults.');
}

/* ─────────────────────────────────────────────────────────────
 * TOAST + FLASH helpers
 * ───────────────────────────────────────────────────────────── */

function showToast(message, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id        = 'admin-toast';
    toast.className = 'admin-toast';
    toast.innerHTML = '<div class="toast-msg"></div><div class="toast-time"></div>';
    document.body.appendChild(toast);
  }

  const msg  = toast.querySelector('.toast-msg');
  const time = toast.querySelector('.toast-time');
  if (msg)  msg.textContent  = message;
  if (time) time.textContent = 'Just now';

  toast.style.borderLeftColor = type === 'error' ? '#e74c3c' : 'var(--success)';
  toast.classList.add('show');

  const savedEl = document.getElementById('topbar-saved');
  if (savedEl) {
    const now = new Date();
    savedEl.textContent = `Last saved: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  }

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function flashField(el) {
  if (!el) return;
  el.classList.add('saved-flash');
  setTimeout(() => el.classList.remove('saved-flash'), 800);
}

// Expose globals
window.getContent      = getContent;
window.saveContent     = saveContent;
window.saveAll         = saveAll;
window.removeContent   = removeContent;
window.syncFromCloud   = syncFromCloud;
window.exportContent   = exportContent;
window.importContent   = importContent;
window.resetToDefaults = resetToDefaults;
window.showToast       = showToast;
window.flashField      = flashField;
