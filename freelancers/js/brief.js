/**
 * brief.js — Client Project Brief Submission
 */
import { createJob, generateId } from '../../js/firebase.js';

let attachedFiles   = [];
let refLinkCount    = 1;

document.addEventListener('DOMContentLoaded', () => {
  setupDescCounter();
  setupRefLinks();
  setupFileUpload();
  setupFormSubmit();
});

// ─── Description character counter ───────────────────────────────────────────
function setupDescCounter() {
  const desc  = document.getElementById('project-desc');
  const count = document.getElementById('desc-count');
  if (!desc || !count) return;
  desc.addEventListener('input', () => {
    const n = desc.value.length;
    count.textContent = `${n} character${n !== 1 ? 's' : ''}`;
    count.style.color = n >= 100 ? '#3ecf8e' : 'var(--steel)';
  });
}

// ─── Reference links (dynamic add/remove) ────────────────────────────────────
function setupRefLinks() {
  const addBtn    = document.getElementById('add-ref-link');
  const container = document.getElementById('ref-links-container');
  if (!addBtn || !container) return;

  addBtn.addEventListener('click', () => {
    if (refLinkCount >= 5) { addBtn.style.display = 'none'; return; }
    refLinkCount++;
    const row = document.createElement('div');
    row.className = 'fl-ref-link-row';
    row.innerHTML = `
      <input type="url" class="fl-input ref-link-input" placeholder="https://example.com">
      <button type="button" class="fl-remove-ref" title="Remove">×</button>`;
    row.querySelector('.fl-remove-ref').addEventListener('click', () => {
      row.remove();
      refLinkCount--;
      addBtn.style.display = '';
    });
    container.appendChild(row);
  });
}

// ─── File attachment ──────────────────────────────────────────────────────────
function setupFileUpload() {
  const drop     = document.getElementById('brief-file-drop');
  const input    = document.getElementById('brief-file-input');
  const listEl   = document.getElementById('brief-file-list');
  if (!drop || !input) return;

  drop.addEventListener('click', () => input.click());

  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('drag-over');
    processFiles(Array.from(e.dataTransfer.files), listEl);
  });

  input.addEventListener('change', () => {
    processFiles(Array.from(input.files), listEl);
    input.value = '';
  });
}

function processFiles(files, listEl) {
  files.forEach(file => {
    if (attachedFiles.length >= 5) return;
    if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large (max 10MB).`); return; }
    if (!attachedFiles.find(f => f.name === file.name)) attachedFiles.push(file);
  });
  renderFileList(listEl);
}

function renderFileList(listEl) {
  if (!listEl) return;
  listEl.innerHTML = attachedFiles.map((f, i) => `
    <div class="fl-brief-file-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:14px;height:14px;flex-shrink:0;color:var(--steel)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span style="flex:1;font-size:13px">${f.name}</span>
      <span style="font-size:11px;color:var(--steel)">${(f.size/1024).toFixed(0)} KB</span>
      <button type="button" class="fl-remove-ref" data-idx="${i}" title="Remove">×</button>
    </div>`).join('');

  listEl.querySelectorAll('.fl-remove-ref').forEach(btn => {
    btn.addEventListener('click', () => {
      attachedFiles.splice(parseInt(btn.dataset.idx), 1);
      renderFileList(listEl);
    });
  });
}

// ─── Form submission ──────────────────────────────────────────────────────────
function setupFormSubmit() {
  const form    = document.getElementById('brief-form');
  const errEl   = document.getElementById('brief-error');
  const btnText = document.getElementById('brief-btn-text');
  const spinner = document.getElementById('brief-btn-spinner');
  const btn     = document.getElementById('btn-submit-brief');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(errEl);

    // Validate
    const clientName  = document.getElementById('client-name')?.value.trim();
    const clientEmail = document.getElementById('client-email')?.value.trim();
    const clientPhone = document.getElementById('client-phone')?.value.trim();
    const projTitle   = document.getElementById('project-title')?.value.trim();
    const serviceType = document.getElementById('service-type')?.value;
    const description = document.getElementById('project-desc')?.value.trim();
    const budget      = document.getElementById('budget')?.value;
    const deadline    = document.getElementById('deadline')?.value;
    const agreed      = document.getElementById('brief-agree')?.checked;

    if (!clientName)  return showError(errEl, 'Your full name is required.');
    if (!clientEmail || !/\S+@\S+\.\S+/.test(clientEmail)) return showError(errEl, 'Valid email is required.');
    if (!clientPhone) return showError(errEl, 'Phone number is required.');
    if (!projTitle)   return showError(errEl, 'Project title is required.');
    if (!serviceType) return showError(errEl, 'Please select the service you need.');
    if (!description || description.length < 100) return showError(errEl, 'Please describe your project in at least 100 characters.');
    if (!budget)      return showError(errEl, 'Please select a budget range.');
    if (!deadline)    return showError(errEl, 'Please select a deadline.');
    if (!agreed)      return showError(errEl, 'Please confirm the agreement.');

    // Collect ref links
    const refLinks = Array.from(document.querySelectorAll('.ref-link-input'))
      .map(i => i.value.trim())
      .filter(Boolean);

    // Read files as data URLs for storage
    const attachmentData = await Promise.all(attachedFiles.map(f => new Promise(res => {
      if (!f.type.startsWith('image/')) { res({ name: f.name, size: f.size, type: f.type }); return; }
      const reader = new FileReader();
      reader.onload = e => res({ name: f.name, size: f.size, type: f.type, dataUrl: e.target.result });
      reader.readAsDataURL(f);
    })));

    // Show loading
    if (btn)    btn.disabled    = true;
    if (btnText) btnText.style.display = 'none';
    if (spinner) spinner.style.display = '';

    const jobData = {
      clientName,
      clientEmail,
      clientPhone,
      clientCompany:  document.getElementById('client-company')?.value.trim() || '',
      clientIndustry: document.getElementById('client-industry')?.value || '',
      projectTitle:   projTitle,
      serviceType,
      description,
      budget,
      deadline,
      heardFrom:      document.getElementById('heard-from')?.value || '',
      referenceLinks: refLinks,
      attachments:    attachmentData,
      budgetMin:      budgetToMin(budget),
    };

    try {
      const jobId = await createJob(jobData);

      // Optional webhook
      const webhookUrl = localStorage.getItem('uch_webhook_url');
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'new_brief', jobId, ...jobData }),
        }).catch(() => {});
      }

      // Show success
      form.style.display = 'none';
      const success = document.getElementById('brief-success');
      if (success) success.style.display = '';
      setEl('brief-job-id',      jobId.slice(0, 16));
      setEl('brief-client-email', clientEmail);

    } catch (err) {
      if (btn)    btn.disabled    = false;
      if (btnText) btnText.style.display = '';
      if (spinner) spinner.style.display = 'none';
      showError(errEl, 'Submission failed. Please try again or contact us directly.');
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function showError(el, msg) {
  if (el) { el.textContent = msg; el.style.display = ''; }
  return false;
}
function clearError(el) {
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function budgetToMin(val) {
  const map = {
    'under-10k': 5000, '10k-25k': 10000, '25k-50k': 25000,
    '50k-1lac': 50000, '1lac-2.5lac': 100000, '2.5lac+': 250000,
    'uch-recommend': 0,
  };
  return map[val] || 0;
}
