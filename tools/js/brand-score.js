/* ═══════════════════════════════════════════════════════════
   BRAND-SCORE.JS — Umbrella Corp HQ
   Brand Score Audit Tool — Gemini Pro AI Integration
   ─────────────────────────────────────────────────────────
   DROP YOUR GEMINI API KEY BELOW:
═══════════════════════════════════════════════════════════ */

const GROQ_API_KEY = window.UCH_GROQ_KEY || '';

/* ─── Groq endpoint ─────────────────────────────────────── */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/* ─── State ─────────────────────────────────────────────── */
let currentStep  = 1;
const TOTAL_STEPS = 4;
const formData   = {};
let auditResult  = null;

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initStepNavigation();
  initSliders();
  initCheckboxGroups();
  initResultActions();
  updateStepUI();
});

/* ═══════════════════════════════════════════════════════════
   STEP NAVIGATION
═══════════════════════════════════════════════════════════ */
function initStepNavigation() {
  /* Next buttons */
  document.querySelectorAll('.bs-next-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateCurrentStep()) advanceStep();
    });
  });

  /* Back buttons */
  document.querySelectorAll('.bs-back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStep--;
      updateStepUI();
      window.scrollTo({ top: document.getElementById('bs-form-section').offsetTop - 80, behavior: 'smooth' });
    });
  });

  /* Final submit */
  const submitBtn = document.getElementById('bs-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (validateCurrentStep()) runAudit();
    });
  }

  /* Step indicator clicks (go back only) */
  document.querySelectorAll('.bs-step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const target = parseInt(dot.dataset.step);
      if (target < currentStep) {
        currentStep = target;
        updateStepUI();
        window.scrollTo({ top: document.getElementById('bs-form-section').offsetTop - 80, behavior: 'smooth' });
      }
    });
  });
}

function advanceStep() {
  collectStepData(currentStep);
  currentStep++;
  updateStepUI();
  window.scrollTo({ top: document.getElementById('bs-form-section').offsetTop - 80, behavior: 'smooth' });
}

function updateStepUI() {
  /* Show/hide step panels */
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const panel = document.getElementById(`bs-step-${i}`);
    if (panel) panel.style.display = i === currentStep ? 'block' : 'none';
  }

  /* Step indicator dots */
  document.querySelectorAll('.bs-step-dot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.classList.toggle('is-active',    s === currentStep);
    dot.classList.toggle('is-complete',  s < currentStep);
    dot.classList.toggle('is-upcoming',  s > currentStep);
  });

  /* Step connector lines */
  document.querySelectorAll('.bs-step-connector').forEach(conn => {
    const s = parseInt(conn.dataset.step);
    conn.classList.toggle('is-filled', s < currentStep);
  });

  /* Step label */
  const label = document.getElementById('bs-step-label');
  if (label) {
    const labels = ['', 'Brand Basics', 'Digital Presence', 'Brand Identity', 'Marketing Activity'];
    label.textContent = `STEP 0${currentStep} — ${labels[currentStep]}`;
  }

  /* Progress bar */
  const pct = ((currentStep - 1) / TOTAL_STEPS) * 100;
  const bar = document.getElementById('bs-progress-fill');
  if (bar) bar.style.width = pct + '%';
}

/* ═══════════════════════════════════════════════════════════
   COLLECT DATA
═══════════════════════════════════════════════════════════ */
function collectStepData(step) {
  const panel = document.getElementById(`bs-step-${step}`);
  if (!panel) return;

  panel.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'checkbox') return; // handled by group collectors
    if (el.type === 'radio')    return; // handled below
    if (el.name) formData[el.name] = el.value;
  });

  /* Radio groups — only capture checked value */
  const radioNames = new Set(
    [...panel.querySelectorAll('input[type=radio]')].map(r => r.name)
  );
  radioNames.forEach(name => {
    const checked = panel.querySelector(`input[type=radio][name="${name}"]:checked`);
    if (checked) formData[name] = checked.value;
  });

  /* Checkbox groups */
  panel.querySelectorAll('.bs-checkbox-group[data-name]').forEach(group => {
    const name = group.dataset.name;
    const checked = [...group.querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
    formData[name] = checked;
  });
}

/* ═══════════════════════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════════════════════ */
function validateCurrentStep() {
  const panel = document.getElementById(`bs-step-${currentStep}`);
  if (!panel) return true;
  let ok = true;

  panel.querySelectorAll('[required]').forEach(el => {
    clearError(el);
    const val = el.value.trim();
    if (!val) {
      showError(el, 'This field is required.');
      ok = false;
    }
  });

  return ok;
}

function showError(el, msg) {
  el.classList.add('is-error');
  const errId = el.getAttribute('aria-describedby');
  const errEl = errId ? document.getElementById(errId) : null;
  if (errEl) errEl.textContent = msg;
}

function clearError(el) {
  el.classList.remove('is-error');
  const errId = el.getAttribute('aria-describedby');
  const errEl = errId ? document.getElementById(errId) : null;
  if (errEl) errEl.textContent = '';
}

/* ═══════════════════════════════════════════════════════════
   SLIDERS
═══════════════════════════════════════════════════════════ */
function initSliders() {
  document.querySelectorAll('.bs-range-slider').forEach(slider => {
    const displayId = slider.dataset.display;
    const display   = displayId ? document.getElementById(displayId) : null;
    const prefix    = slider.dataset.prefix  || '';
    const suffix    = slider.dataset.suffix  || '';
    const isNumber  = !slider.dataset.labels;

    function update() {
      if (!display) return;
      if (slider.dataset.labels) {
        const labels = JSON.parse(slider.dataset.labels);
        display.textContent = labels[slider.value] || slider.value;
      } else {
        const n = parseInt(slider.value);
        display.textContent = prefix + n.toLocaleString('en-IN') + suffix;
      }
      /* Red fill */
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.background = `linear-gradient(90deg, var(--corp-red) ${pct}%, #2a2a2a ${pct}%)`;
    }

    slider.addEventListener('input', update);
    update();
  });
}

/* ═══════════════════════════════════════════════════════════
   CHECKBOX GROUPS (styled pill toggles)
═══════════════════════════════════════════════════════════ */
function initCheckboxGroups() {
  document.querySelectorAll('.bs-pill-toggle').forEach(label => {
    label.addEventListener('click', () => {
      const cb = label.querySelector('input[type=checkbox]');
      if (cb) {
        cb.checked = !cb.checked;
        label.classList.toggle('is-checked', cb.checked);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   BUILD GEMINI PROMPT
═══════════════════════════════════════════════════════════ */
function buildPrompt() {
  /* Collect any remaining unsaved step data */
  collectStepData(currentStep);

  const fd = formData;

  const socials = Array.isArray(fd.socials) ? fd.socials.join(', ') : (fd.socials || 'none specified');
  const channels = Array.isArray(fd.channels) ? fd.channels.join(', ') : (fd.channels || 'none specified');

  return `You are a senior brand strategist specialising in Bangladesh businesses.

IMPORTANT: Your entire response must be a single raw JSON object. Do not include any text before or after it. Do not use markdown code fences (no \`\`\`json). Just the JSON object and nothing else.

Conduct a brand audit for the following business:

BUSINESS DATA:
- Business name: ${fd['brand-name'] || 'Not specified'}
- Industry: ${fd['industry'] || 'Not specified'}
- Business age: ${fd['business-age'] || 'Not specified'}
- Team size: ${fd['team-size'] || 'Not specified'}
- Target audience: ${fd['target-audience'] || 'Not specified'}
- Has website: ${fd['has-website'] || 'No'}
- Website quality (self-rated): ${fd['website-quality'] || 'N/A'}
- Active social platforms: ${socials}
- Posting frequency: ${fd['posting-freq'] || 'Not specified'}
- Follower range: ${fd['follower-range'] || 'Not specified'}
- Has professional logo: ${fd['has-logo'] || 'No'}
- Brand colours defined: ${fd['has-colors'] || 'No'}
- Has tagline/slogan: ${fd['has-tagline'] || 'No'}
- Brand voice description: ${fd['brand-voice'] || 'Not described'}
- Unique differentiator: ${fd['differentiator'] || 'Not described'}
- Monthly marketing budget (BDT): ${fd['budget-range'] || 'Not specified'}
- Marketing channels used: ${channels}
- Tracks analytics: ${fd['tracks-analytics'] || 'No'}
- Biggest marketing challenge: ${fd['marketing-challenge'] || 'Not specified'}

Score each of the 5 dimensions out of 20. The overall score = sum of all 5 dimensions (max 100). Be honest and realistic — most BD small businesses score 30-65. Scores above 80 should be rare and only for genuinely excellent brands.

Respond with ONLY this JSON structure (no extra keys):
{
  "overall": <number 0-100>,
  "headline": "<single punchy sentence summarising brand health, max 12 words>",
  "summary": "<2-3 sentences honest brand health overview, Bangladesh market context>",
  "dimensions": {
    "visual":       { "score": <0-20>, "verdict": "<one of: Critical|Needs Work|Average|Good|Excellent>", "insight": "<one sentence specific to their answers>" },
    "digital":      { "score": <0-20>, "verdict": "<one of: Critical|Needs Work|Average|Good|Excellent>", "insight": "<one sentence>" },
    "messaging":    { "score": <0-20>, "verdict": "<one of: Critical|Needs Work|Average|Good|Excellent>", "insight": "<one sentence>" },
    "marketing":    { "score": <0-20>, "verdict": "<one of: Critical|Needs Work|Average|Good|Excellent>", "insight": "<one sentence>" },
    "consistency":  { "score": <0-20>, "verdict": "<one of: Critical|Needs Work|Average|Good|Excellent>", "insight": "<one sentence>" }
  },
  "recommendations": [
    { "priority": 1, "area": "<dimension name>", "action": "<specific actionable task, 1 sentence>", "impact": "<High|Medium|Low>", "timeframe": "<e.g. 1-2 weeks>" },
    { "priority": 2, "area": "<dimension name>", "action": "<specific actionable task>", "impact": "<High|Medium|Low>", "timeframe": "<e.g. 1 month>" },
    { "priority": 3, "area": "<dimension name>", "action": "<specific actionable task>", "impact": "<High|Medium|Low>", "timeframe": "<e.g. 2-4 weeks>" }
  ],
  "positioning": "<2 sentences about where this brand sits vs. BD competitors in their industry, and one concrete next milestone>"
}`;
}

/* ═══════════════════════════════════════════════════════════
   RUN AUDIT
═══════════════════════════════════════════════════════════ */
async function runAudit() {
  /* Hide form, show loader */
  document.getElementById('bs-form-section').style.display   = 'none';
  document.getElementById('bs-loading-section').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Progress animation */
  const loadingMessages = [
    'Evaluating your visual identity…',
    'Analysing digital presence…',
    'Scoring brand messaging…',
    'Benchmarking against BD brands…',
    'Generating recommendations…',
    'Almost there…',
  ];
  let msgIdx = 0;
  const msgEl  = document.getElementById('bs-loading-msg');
  const barEl  = document.getElementById('bs-loading-bar');
  const msgTimer = setInterval(() => {
    if (msgEl) msgEl.textContent = loadingMessages[Math.min(msgIdx++, loadingMessages.length - 1)];
    const pct = Math.min((msgIdx / loadingMessages.length) * 90, 90);
    if (barEl) barEl.style.width = pct + '%';
  }, 1200);

  try {
    const payload = JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens:  1200,
      messages: [
        { role: 'system', content: 'You are a senior brand strategist. Always respond with raw JSON only — no markdown, no code fences, no extra text.' },
        { role: 'user',   content: buildPrompt() },
      ],
    });

    /* ── Fetch with auto-retry on rate limit ── */
    let response;
    let attempts = 0;
    while (attempts < 4) {
      response = await fetch(GROQ_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: payload,
      });

      if (response.status !== 429 && response.status !== 503) break;

      /* Parse suggested retry delay from error body */
      const errBody  = await response.json();
      const errMsg   = errBody.error?.message || '';
      const retryMatch = errMsg.match(/retry in ([\d.]+)s/i);
      const waitSec  = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 20;

      attempts++;
      if (attempts >= 4) { response = { ok: false, _body: errBody }; break; }

      /* Show countdown in loading message */
      let remaining = waitSec;
      const countdown = setInterval(() => {
        if (msgEl) msgEl.textContent = `Rate limit hit — retrying in ${remaining}s…`;
        remaining--;
        if (remaining <= 0) clearInterval(countdown);
      }, 1000);

      await new Promise(r => setTimeout(r, waitSec * 1000));
      clearInterval(countdown);
      if (msgEl) msgEl.textContent = 'Retrying analysis…';
    }

    clearInterval(msgTimer);
    if (barEl) barEl.style.width = '100%';

    if (!response.ok) {
      const errData = response._body || await response.json();
      throw new Error(errData.error?.message || `Gemini API error (${response.status})`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    /* Strip any accidental markdown fences */
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    auditResult = JSON.parse(cleaned);

    /* Small delay so progress bar fills */
    await new Promise(r => setTimeout(r, 600));

    renderResults(auditResult);

  } catch (err) {
    clearInterval(msgTimer);
    console.error('Brand audit error:', err);
    document.getElementById('bs-loading-section').style.display = 'none';
    document.getElementById('bs-form-section').style.display    = 'block';
    currentStep = TOTAL_STEPS;
    updateStepUI();
    showGlobalError(`Analysis failed: ${err.message}. Please try again in a moment.`);
  }
}

/* ═══════════════════════════════════════════════════════════
   RENDER RESULTS
═══════════════════════════════════════════════════════════ */
function renderResults(r) {
  document.getElementById('bs-loading-section').style.display  = 'none';
  document.getElementById('bs-results-section').style.display  = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const brandName = formData['brand-name'] || 'Your Brand';

  /* ── Brand name ── */
  const nameEl = document.getElementById('bs-result-brand');
  if (nameEl) nameEl.textContent = brandName;

  /* ── Headline ── */
  const headlineEl = document.getElementById('bs-result-headline');
  if (headlineEl) headlineEl.textContent = r.headline || 'Your brand audit is complete.';

  /* ── Summary ── */
  const summaryEl = document.getElementById('bs-result-summary');
  if (summaryEl) summaryEl.textContent = r.summary || '';

  /* ── Score ring ── */
  const score = Math.min(100, Math.max(0, r.overall || 0));
  animateScore(score);

  /* ── Score label ── */
  const scoreLabelEl = document.getElementById('bs-score-label');
  if (scoreLabelEl) {
    const { label, cls } = scoreLabel(score);
    scoreLabelEl.textContent = label;
    scoreLabelEl.className   = `bs-score-verdict ${cls}`;
  }

  /* ── Dimensions ── */
  const dimKeys = [
    { key: 'visual',      label: 'Visual Identity',    icon: '🎨' },
    { key: 'digital',     label: 'Digital Presence',   icon: '🌐' },
    { key: 'messaging',   label: 'Brand Messaging',    icon: '💬' },
    { key: 'marketing',   label: 'Marketing Activity', icon: '📣' },
    { key: 'consistency', label: 'Brand Consistency',  icon: '🔗' },
  ];

  dimKeys.forEach(({ key, label, icon }) => {
    const dim   = r.dimensions?.[key] || {};
    const score = Math.min(20, Math.max(0, dim.score || 0));
    const pct   = (score / 20) * 100;

    const row = document.getElementById(`bs-dim-${key}`);
    if (!row) return;

    const barFill  = row.querySelector('.bs-dim-bar-fill');
    const scoreNum = row.querySelector('.bs-dim-score');
    const verdict  = row.querySelector('.bs-dim-verdict');
    const insight  = row.querySelector('.bs-dim-insight');

    if (barFill)  { setTimeout(() => { barFill.style.width = pct + '%'; barFill.className = `bs-dim-bar-fill ${verdictClass(dim.verdict)}`; }, 100); }
    if (scoreNum) scoreNum.textContent = `${score}/20`;
    if (verdict)  { verdict.textContent = dim.verdict || ''; verdict.className = `bs-dim-verdict-pill ${verdictClass(dim.verdict)}`; }
    if (insight)  insight.textContent = dim.insight || '';
  });

  /* ── Recommendations ── */
  const recsContainer = document.getElementById('bs-recs-list');
  if (recsContainer && Array.isArray(r.recommendations)) {
    recsContainer.innerHTML = r.recommendations.map((rec, i) => `
      <div class="bs-rec-card">
        <div class="bs-rec-priority">0${rec.priority || (i + 1)}</div>
        <div class="bs-rec-body">
          <div class="bs-rec-meta">
            <span class="bs-rec-area">${rec.area || ''}</span>
            <span class="bs-rec-impact bs-impact-${(rec.impact || 'medium').toLowerCase()}">${rec.impact || 'Medium'} Impact</span>
            <span class="bs-rec-timeframe">⏱ ${rec.timeframe || ''}</span>
          </div>
          <p class="bs-rec-action">${rec.action || ''}</p>
        </div>
      </div>
    `).join('');
  }

  /* ── Positioning ── */
  const posEl = document.getElementById('bs-positioning');
  if (posEl) posEl.textContent = r.positioning || '';

  /* ── CTA brand name ── */
  document.querySelectorAll('.bs-result-brand-name').forEach(el => el.textContent = brandName);
}

/* ─── Score ring animation ──────────────────────────────── */
function animateScore(score) {
  const circle = document.getElementById('bs-score-circle');
  const numEl  = document.getElementById('bs-score-num');
  if (!circle || !numEl) return;

  const circumference = 339.3; // 2π × 54
  const targetOffset  = circumference - (score / 100) * circumference;

  /* Color the ring based on score */
  if      (score >= 75) circle.style.stroke = '#22c55e'; // green
  else if (score >= 50) circle.style.stroke = '#f59e0b'; // amber
  else if (score >= 25) circle.style.stroke = '#c1121f'; // red
  else                  circle.style.stroke = '#7f1d1d'; // dark red

  /* Animate dashoffset */
  requestAnimationFrame(() => {
    circle.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)';
    circle.style.strokeDashoffset = targetOffset;
  });

  /* Count-up number */
  let current = 0;
  const step  = score / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, score);
    numEl.textContent = Math.round(current);
    if (current >= score) clearInterval(timer);
  }, 25);
}

/* ─── Helpers ───────────────────────────────────────────── */
function scoreLabel(score) {
  if (score >= 80) return { label: 'Strong Brand',       cls: 'is-excellent' };
  if (score >= 65) return { label: 'Good Foundation',    cls: 'is-good'      };
  if (score >= 50) return { label: 'Room to Grow',       cls: 'is-average'   };
  if (score >= 30) return { label: 'Needs Attention',    cls: 'is-needs-work' };
  return              { label: 'Critical Issues',    cls: 'is-critical'  };
}

function verdictClass(verdict) {
  const map = {
    'Critical':   'is-critical',
    'Needs Work': 'is-needs-work',
    'Average':    'is-average',
    'Good':       'is-good',
    'Excellent':  'is-excellent',
  };
  return map[verdict] || 'is-average';
}

function showGlobalError(msg) {
  const el = document.getElementById('bs-global-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

/* ═══════════════════════════════════════════════════════════
   RESULT ACTIONS (restart / share)
═══════════════════════════════════════════════════════════ */
function initResultActions() {
  /* Restart */
  const restartBtn = document.getElementById('bs-restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      Object.keys(formData).forEach(k => delete formData[k]);
      auditResult = null;
      currentStep = 1;
      document.getElementById('bs-results-section').style.display = 'none';
      document.getElementById('bs-form-section').style.display    = 'block';
      updateStepUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      /* Reset inputs */
      document.querySelectorAll('#bs-form-section input, #bs-form-section select, #bs-form-section textarea').forEach(el => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = el.defaultValue || '';
      });
      document.querySelectorAll('.bs-pill-toggle').forEach(l => l.classList.remove('is-checked'));
      initSliders();
    });
  }

  /* Share score */
  const shareBtn = document.getElementById('bs-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const score = auditResult?.overall || 0;
      const brand = formData['brand-name'] || 'My Brand';
      const text  = `${brand} scored ${score}/100 on the Brand Score Audit by Umbrella Corp HQ! Get your free brand audit at umbrellacorphq.com/tools/brand-score-audit.html`;
      try {
        if (navigator.share) {
          await navigator.share({ title: 'My Brand Score', text });
        } else {
          await navigator.clipboard.writeText(text);
          shareBtn.textContent = '✓  Copied!';
          setTimeout(() => shareBtn.textContent = '↗  Share Score', 2500);
        }
      } catch {}
    });
  }
}
