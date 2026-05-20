/* ═══════════════════════════════════════════════════════════
   COMPETITOR-TRACKER.JS — Umbrella Corp HQ
   Competitor Tracker Tool — Groq (Llama 3.3 70B)
═══════════════════════════════════════════════════════════ */

const GROQ_API_KEY = window.UCH_GROQ_KEY || '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';

/* ─── State ─────────────────────────────────────────────── */
let currentStep   = 1;
const TOTAL_STEPS = 3;
const formData    = {};
let competitors   = [{ name: '', strengths: '', position: '' }];
let trackResult   = null;

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initStepNavigation();
  initCompetitorBuilder();
  initResultActions();
  renderCompetitorSlots();
  updateStepUI();
});

/* ═══════════════════════════════════════════════════════════
   STEP NAVIGATION
═══════════════════════════════════════════════════════════ */
function initStepNavigation() {
  document.querySelectorAll('.ct-next-btn').forEach(btn => {
    btn.addEventListener('click', () => { if (validateCurrentStep()) advanceStep(); });
  });
  document.querySelectorAll('.ct-back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStep--;
      updateStepUI();
      scrollToForm();
    });
  });
  const submitBtn = document.getElementById('ct-submit-btn');
  if (submitBtn) submitBtn.addEventListener('click', () => { if (validateCurrentStep()) runTracker(); });

  document.querySelectorAll('.ct-step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const t = parseInt(dot.dataset.step);
      if (t < currentStep) { currentStep = t; updateStepUI(); scrollToForm(); }
    });
  });
}

function advanceStep() {
  collectStepData(currentStep);
  currentStep++;
  updateStepUI();
  scrollToForm();
}

function scrollToForm() {
  const el = document.getElementById('ct-form-section');
  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
}

function updateStepUI() {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const p = document.getElementById(`ct-step-${i}`);
    if (p) p.style.display = i === currentStep ? 'block' : 'none';
  }
  document.querySelectorAll('.ct-step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('is-active',   s === currentStep);
    dot.classList.toggle('is-complete', s < currentStep);
    dot.classList.toggle('is-upcoming', s > currentStep);
  });
  document.querySelectorAll('.ct-step-connector').forEach(c => {
    c.classList.toggle('is-filled', parseInt(c.dataset.step) < currentStep);
  });
  const labels = ['', 'Your Business', 'Your Competitors', 'Analysis Focus'];
  const lbl = document.getElementById('ct-step-label');
  if (lbl) lbl.textContent = `STEP 0${currentStep} — ${labels[currentStep]}`;
  const bar = document.getElementById('ct-progress-fill');
  if (bar) bar.style.width = (((currentStep - 1) / TOTAL_STEPS) * 100) + '%';
}

/* ═══════════════════════════════════════════════════════════
   COLLECT DATA
═══════════════════════════════════════════════════════════ */
function collectStepData(step) {
  const panel = document.getElementById(`ct-step-${step}`);
  if (!panel) return;
  panel.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') return;
    formData[el.name] = el.value;
  });
  panel.querySelectorAll('.ct-checkbox-group[data-name]').forEach(group => {
    const checked = [...group.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
    formData[group.dataset.name] = checked;
  });
  /* Sync competitor data from DOM */
  syncCompetitorsFromDOM();
}

function syncCompetitorsFromDOM() {
  const slots = document.querySelectorAll('.ct-competitor-slot');
  competitors = [];
  slots.forEach(slot => {
    const name      = slot.querySelector('.ct-comp-name')?.value?.trim()      || '';
    const strengths = slot.querySelector('.ct-comp-strengths')?.value?.trim() || '';
    const position  = slot.querySelector('.ct-comp-position')?.value          || '';
    if (name) competitors.push({ name, strengths, position });
  });
}

/* ═══════════════════════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════════════════════ */
function validateCurrentStep() {
  const panel = document.getElementById(`ct-step-${currentStep}`);
  if (!panel) return true;
  let ok = true;
  panel.querySelectorAll('[required]').forEach(el => {
    el.classList.remove('is-error');
    const errEl = el.getAttribute('aria-describedby') ? document.getElementById(el.getAttribute('aria-describedby')) : null;
    if (errEl) errEl.textContent = '';
    if (!el.value.trim()) {
      el.classList.add('is-error');
      if (errEl) errEl.textContent = 'This field is required.';
      ok = false;
    }
  });
  /* Step 2: need at least 1 named competitor */
  if (currentStep === 2) {
    syncCompetitorsFromDOM();
    if (competitors.length === 0) {
      showGlobalError('Please add at least one competitor name.');
      ok = false;
    }
  }
  return ok;
}

/* ═══════════════════════════════════════════════════════════
   COMPETITOR SLOT BUILDER
═══════════════════════════════════════════════════════════ */
function initCompetitorBuilder() {
  document.getElementById('ct-add-competitor')?.addEventListener('click', () => {
    if (competitors.length >= 5) return;
    competitors.push({ name: '', strengths: '', position: '' });
    renderCompetitorSlots();
  });
}

function renderCompetitorSlots() {
  const container = document.getElementById('ct-competitors-container');
  if (!container) return;

  container.innerHTML = competitors.map((comp, i) => `
    <div class="ct-competitor-slot" data-index="${i}">
      <div class="ct-slot-header">
        <span class="ct-slot-num">Competitor ${i + 1}</span>
        ${competitors.length > 1 ? `<button type="button" class="ct-remove-btn" data-index="${i}" aria-label="Remove competitor ${i + 1}">&#10005;</button>` : ''}
      </div>
      <div class="ct-slot-body">
        <div class="ct-form-group">
          <label class="ct-label" for="comp-name-${i}">Business / Brand Name <span class="ct-required">*</span></label>
          <input type="text" id="comp-name-${i}" class="ct-input ct-comp-name" placeholder="e.g. Rival Brand BD" value="${comp.name}" maxlength="100">
        </div>
        <div class="ct-form-row">
          <div class="ct-form-group">
            <label class="ct-label" for="comp-pos-${i}">Their market position</label>
            <select id="comp-pos-${i}" class="ct-select ct-comp-position">
              <option value="Market Leader"       ${comp.position==='Market Leader'       ? 'selected':''}>Market Leader</option>
              <option value="Strong Competitor"   ${comp.position==='Strong Competitor'   ? 'selected':''}>Strong Competitor</option>
              <option value="Similar to us"       ${comp.position==='Similar to us'       ? 'selected':''}>Similar to us</option>
              <option value="Smaller / niche"     ${comp.position==='Smaller / niche'     ? 'selected':''}>Smaller / niche</option>
              <option value="Not sure"            ${comp.position==='Not sure'            ? 'selected':''}>Not sure</option>
            </select>
          </div>
          <div class="ct-form-group">
            <label class="ct-label" for="comp-str-${i}">Known strengths (optional)</label>
            <input type="text" id="comp-str-${i}" class="ct-input ct-comp-strengths" placeholder="e.g. big social following, low prices" value="${comp.strengths}" maxlength="200">
          </div>
        </div>
      </div>
    </div>
  `).join('');

  /* Add slot count display */
  const countEl = document.getElementById('ct-competitor-count');
  if (countEl) countEl.textContent = `${competitors.length}/5`;
  const addBtn = document.getElementById('ct-add-competitor');
  if (addBtn) addBtn.disabled = competitors.length >= 5;

  /* Remove buttons */
  container.querySelectorAll('.ct-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      competitors.splice(idx, 1);
      renderCompetitorSlots();
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   BUILD PROMPT
═══════════════════════════════════════════════════════════ */
function buildPrompt() {
  collectStepData(currentStep);
  const fd = formData;
  const focusAreas = Array.isArray(fd['focus-areas']) ? fd['focus-areas'].join(', ') : 'all areas';
  const compList = competitors.map((c, i) =>
    `Competitor ${i+1}: "${c.name}" — Position: ${c.position || 'unknown'} — Known strengths: ${c.strengths || 'not specified'}`
  ).join('\n');

  return `You are a senior competitive strategy consultant specialising in Bangladesh businesses.

Analyse the competitive landscape for this business and respond ONLY with a single raw JSON object. No markdown, no code fences, just JSON.

MY BUSINESS:
- Name: ${fd['brand-name'] || 'Not specified'}
- Industry: ${fd['industry'] || 'Not specified'}
- Business age: ${fd['business-age'] || 'Not specified'}
- Target market: ${fd['target-market'] || 'Not specified'}
- My key strengths: ${fd['my-strengths'] || 'Not specified'}
- My biggest weakness: ${fd['my-weakness'] || 'Not specified'}
- Monthly revenue range: ${fd['revenue-range'] || 'Not specified'}

COMPETITORS:
${compList}

ANALYSIS FOCUS AREAS: ${focusAreas}

Respond with ONLY this JSON (no extra keys):
{
  "market_position": "<one of: Market Leader|Strong Challenger|Mid-Pack|Niche Player|Underdog>",
  "position_context": "<1-2 sentences about where this business sits vs competitors in the BD market>",
  "threat_summary": "<one sentence overall competitive threat level>",
  "competitors": [
    {
      "name": "<competitor name>",
      "threat_level": "<High|Medium|Low>",
      "their_edge": "<their single biggest competitive advantage, 1 sentence>",
      "their_weakness": "<their most exploitable weakness, 1 sentence>",
      "how_to_beat": "<specific tactic to outperform this competitor, 1 sentence>"
    }
  ],
  "your_advantages": [
    "<advantage 1 — specific, not generic>",
    "<advantage 2>",
    "<advantage 3>"
  ],
  "your_gaps": [
    "<gap 1 — specific area where competitors beat you>",
    "<gap 2>",
    "<gap 3>"
  ],
  "strategic_moves": [
    { "priority": 1, "move": "<specific action>", "rationale": "<why this move wins>", "timeframe": "<e.g. 2-4 weeks>", "impact": "<High|Medium>" },
    { "priority": 2, "move": "<specific action>", "rationale": "<why>", "timeframe": "<timeframe>", "impact": "<High|Medium>" },
    { "priority": 3, "move": "<specific action>", "rationale": "<why>", "timeframe": "<timeframe>", "impact": "<High|Medium>" }
  ],
  "market_opportunity": "<2 sentences: a specific untapped opportunity in this competitive space in Bangladesh that this business could seize>"
}`;
}

/* ═══════════════════════════════════════════════════════════
   RUN TRACKER
═══════════════════════════════════════════════════════════ */
async function runTracker() {
  document.getElementById('ct-form-section').style.display    = 'none';
  document.getElementById('ct-loading-section').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const messages = [
    'Mapping the competitive landscape…',
    'Analysing competitor strengths…',
    'Identifying your advantages…',
    'Finding exploitable gaps…',
    'Building strategic moves…',
    'Almost done…',
  ];
  let msgIdx = 0;
  const msgEl  = document.getElementById('ct-loading-msg');
  const barEl  = document.getElementById('ct-loading-bar');
  const msgTimer = setInterval(() => {
    if (msgEl) msgEl.textContent = messages[Math.min(msgIdx++, messages.length - 1)];
    const pct = Math.min((msgIdx / messages.length) * 90, 90);
    if (barEl) barEl.style.width = pct + '%';
  }, 1100);

  try {
    const payload = JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.45,
      max_tokens:  1800,
      messages: [
        { role: 'system', content: 'You are a competitive strategy consultant. Always respond with raw JSON only — no markdown, no code fences.' },
        { role: 'user',   content: buildPrompt() },
      ],
    });

    let response;
    let attempts = 0;
    while (attempts < 4) {
      response = await fetch(GROQ_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body:    payload,
      });
      if (response.status !== 429 && response.status !== 503) break;
      const errBody    = await response.json();
      const errMsg     = errBody.error?.message || '';
      const retryMatch = errMsg.match(/retry in ([\d.]+)s/i);
      const waitSec    = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 20;
      attempts++;
      if (attempts >= 4) { response = { ok: false, _body: errBody }; break; }
      let rem = waitSec;
      const cd = setInterval(() => { if (msgEl) msgEl.textContent = `Rate limited — retrying in ${rem--}s…`; if (rem < 0) clearInterval(cd); }, 1000);
      await new Promise(r => setTimeout(r, waitSec * 1000));
      clearInterval(cd);
      if (msgEl) msgEl.textContent = 'Retrying…';
    }

    clearInterval(msgTimer);
    if (barEl) barEl.style.width = '100%';

    if (!response.ok) {
      const errData = response._body || await response.json();
      throw new Error(errData.error?.message || `API error (${response.status})`);
    }

    const data    = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    trackResult   = JSON.parse(cleaned);

    await new Promise(r => setTimeout(r, 500));
    renderResults(trackResult);

  } catch (err) {
    clearInterval(msgTimer);
    console.error('Competitor tracker error:', err);
    document.getElementById('ct-loading-section').style.display = 'none';
    document.getElementById('ct-form-section').style.display    = 'block';
    currentStep = TOTAL_STEPS;
    updateStepUI();
    showGlobalError(`Analysis failed: ${err.message}. Please try again.`);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER RESULTS
═══════════════════════════════════════════════════════════ */
function renderResults(r) {
  document.getElementById('ct-loading-section').style.display  = 'none';
  document.getElementById('ct-results-section').style.display  = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const brandName = formData['brand-name'] || 'Your Brand';
  document.querySelectorAll('.ct-brand-name').forEach(el => el.textContent = brandName);

  /* ── Market position badge ── */
  const posEl  = document.getElementById('ct-market-position');
  const posCtx = document.getElementById('ct-position-context');
  const posThrt = document.getElementById('ct-threat-summary');
  if (posEl)   { posEl.textContent = r.market_position || '—'; posEl.className = `ct-position-badge ${positionClass(r.market_position)}`; }
  if (posCtx)  posCtx.textContent  = r.position_context  || '';
  if (posThrt) posThrt.textContent = r.threat_summary     || '';

  /* ── Competitor cards ── */
  const compGrid = document.getElementById('ct-comp-grid');
  if (compGrid && Array.isArray(r.competitors)) {
    compGrid.innerHTML = r.competitors.map(comp => `
      <div class="ct-comp-card">
        <div class="ct-comp-card-header">
          <h4 class="ct-comp-card-name">${comp.name || '—'}</h4>
          <span class="ct-threat-pill ct-threat-${(comp.threat_level||'medium').toLowerCase()}">${comp.threat_level || 'Medium'} Threat</span>
        </div>
        <div class="ct-comp-rows">
          <div class="ct-comp-row">
            <span class="ct-comp-row-label">&#128200; Their Edge</span>
            <span class="ct-comp-row-val">${comp.their_edge || '—'}</span>
          </div>
          <div class="ct-comp-row">
            <span class="ct-comp-row-label">&#128313; Weakness</span>
            <span class="ct-comp-row-val">${comp.their_weakness || '—'}</span>
          </div>
          <div class="ct-comp-row ct-comp-row--beat">
            <span class="ct-comp-row-label">&#127919; How to Beat</span>
            <span class="ct-comp-row-val">${comp.how_to_beat || '—'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ── Advantages & Gaps ── */
  const advList = document.getElementById('ct-advantages-list');
  if (advList && Array.isArray(r.your_advantages)) {
    advList.innerHTML = r.your_advantages.map(a => `<li class="ct-adv-item"><span class="ct-adv-icon">&#10003;</span>${a}</li>`).join('');
  }

  const gapList = document.getElementById('ct-gaps-list');
  if (gapList && Array.isArray(r.your_gaps)) {
    gapList.innerHTML = r.your_gaps.map(g => `<li class="ct-gap-item"><span class="ct-gap-icon">&#9651;</span>${g}</li>`).join('');
  }

  /* ── Strategic moves ── */
  const movesContainer = document.getElementById('ct-moves-list');
  if (movesContainer && Array.isArray(r.strategic_moves)) {
    movesContainer.innerHTML = r.strategic_moves.map((m, i) => `
      <div class="ct-move-card">
        <div class="ct-move-priority">0${m.priority || (i+1)}</div>
        <div class="ct-move-body">
          <div class="ct-move-meta">
            <span class="ct-move-impact ct-impact-${(m.impact||'medium').toLowerCase()}">${m.impact || 'Medium'} Impact</span>
            <span class="ct-move-timeframe">&#9200; ${m.timeframe || ''}</span>
          </div>
          <p class="ct-move-action">${m.move || ''}</p>
          <p class="ct-move-rationale">${m.rationale || ''}</p>
        </div>
      </div>
    `).join('');
  }

  /* ── Market opportunity ── */
  const oppEl = document.getElementById('ct-opportunity');
  if (oppEl) oppEl.textContent = r.market_opportunity || '';
}

/* ─── Helpers ───────────────────────────────────────────── */
function positionClass(pos) {
  const map = {
    'Market Leader':     'is-leader',
    'Strong Challenger': 'is-challenger',
    'Mid-Pack':          'is-midpack',
    'Niche Player':      'is-niche',
    'Underdog':          'is-underdog',
  };
  return map[pos] || 'is-midpack';
}

function showGlobalError(msg) {
  const el = document.getElementById('ct-global-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

/* ═══════════════════════════════════════════════════════════
   RESULT ACTIONS
═══════════════════════════════════════════════════════════ */
function initResultActions() {
  document.getElementById('ct-restart-btn')?.addEventListener('click', () => {
    Object.keys(formData).forEach(k => delete formData[k]);
    trackResult  = null;
    currentStep  = 1;
    competitors  = [{ name: '', strengths: '', position: '' }];
    document.getElementById('ct-results-section').style.display = 'none';
    document.getElementById('ct-form-section').style.display    = 'block';
    updateStepUI();
    renderCompetitorSlots();
    document.querySelectorAll('#ct-form-section input, #ct-form-section select, #ct-form-section textarea').forEach(el => {
      if (el.type !== 'checkbox') el.value = el.defaultValue || '';
      else el.checked = false;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('ct-share-btn')?.addEventListener('click', async () => {
    const pos   = trackResult?.market_position || '';
    const brand = formData['brand-name'] || 'My Brand';
    const text  = `${brand} is a "${pos}" in their market — analysed by Umbrella Corp HQ's free Competitor Tracker. Try it at umbrellacorphq.com/tools/competitor-tracker.html`;
    try {
      if (navigator.share) await navigator.share({ title: 'My Competitive Position', text });
      else {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('ct-share-btn');
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '↗ Share', 2500); }
      }
    } catch {}
  });
}
