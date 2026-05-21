/* ═══════════════════════════════════════════════════════════
   WEBSITE-HEALTH.JS — Umbrella Corp HQ
   Website Health Checker — PageSpeed Insights + Groq AI
═══════════════════════════════════════════════════════════ */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PSI_URL  = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/* ─── State ─────────────────────────────────────────────── */
let currentStrategy = 'mobile';
let lastResults     = null;
let currentURL      = '';

/* ─── DOM refs (set in init) ────────────────────────────── */
let urlInput, scanBtn, loadingEl, errorEl, resultsEl, loadingStatus, loadingBar;

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  /* Grab DOM refs safely */
  urlInput      = document.getElementById('wh-url-input');
  scanBtn       = document.getElementById('wh-scan-btn');
  loadingEl     = document.getElementById('wh-loading');
  errorEl       = document.getElementById('wh-error');
  resultsEl     = document.getElementById('wh-results');
  loadingStatus = document.getElementById('wh-loading-status');
  loadingBar    = document.getElementById('wh-loading-bar');

  if (!urlInput || !scanBtn) {
    console.error('[UCH] Website Health Checker: required elements not found');
    return;
  }

  scanBtn.addEventListener('click', startScan);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') startScan(); });

  /* Device toggle */
  document.querySelectorAll('.wh-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wh-device-btn').forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      currentStrategy = btn.dataset.strategy;
      if (lastResults) renderResults(lastResults[currentStrategy], currentURL);
    });
  });

  /* Rescan button */
  const rescanBtn = document.getElementById('wh-rescan-btn');
  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      hideAll();
      urlInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  console.log('[UCH] Website Health Checker ready');
});

/* ═══════════════════════════════════════════════════════════
   SCAN
═══════════════════════════════════════════════════════════ */
async function startScan() {
  let url = urlInput.value.trim();

  if (!url) {
    urlInput.focus();
    urlInput.style.outline = '2px solid var(--corp-red)';
    setTimeout(() => urlInput.style.outline = '', 1500);
    return;
  }

  /* Auto-add https:// */
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  /* Validate */
  try {
    new URL(url);
  } catch (e) {
    showError('Invalid URL', 'Please enter a valid website address, e.g. https://example.com');
    return;
  }

  currentURL = url;
  urlInput.value = url;
  hideAll();
  showLoading(url);

  try {
    stepActive(1); startTips();
    const mobile = await fetchPSI(url, 'mobile');
    stepDone(1); setBar(38);

    stepActive(2);
    const desktop = await fetchPSI(url, 'desktop');
    stepDone(2); stepDone(3); setBar(70);

    stepActive(4);
    let aiAnalysis = null;
    try {
      aiAnalysis = await fetchGroqAnalysis(url, mobile, desktop);
    } catch (aiErr) {
      console.warn('[UCH] AI analysis skipped:', aiErr.message);
    }
    stepDone(4); setBar(90);

    stepActive(5);
    lastResults = {
      mobile:  { ...mobile,  ai: aiAnalysis },
      desktop: { ...desktop, ai: aiAnalysis },
    };
    stepDone(5); setBar(100);
    stopTips(); setStatus('Report ready!');

    setTimeout(() => {
      hideAll();
      resultsEl.classList.add('is-active');
      renderResults(lastResults[currentStrategy], url);
    }, 600);

  } catch (err) {
    console.error('[UCH] Scan error:', err);
    showError(
      'Scan failed',
      err.message || 'Could not reach the website. Make sure the URL is publicly accessible and try again.'
    );
  }
}

/* ─── PageSpeed Insights API ────────────────────────────── */
async function fetchPSI(url, strategy) {
  const psiKey = (typeof window !== 'undefined' && window.UCH_PSI_KEY) ? `&key=${window.UCH_PSI_KEY}` : '';
  const endpoint =
    `${PSI_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}` +
    `&category=performance&category=seo&category=accessibility&category=best-practices${psiKey}`;

  let res;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000); // 60s timeout
    res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timer);
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      throw new Error('Request timed out (60s). The PageSpeed API may be slow — try again.');
    }
    throw new Error('Network error — check your internet connection.');
  }

  if (!res.ok) {
    let msg = `PageSpeed API error (${res.status})`;
    try {
      const errBody = await res.json();
      msg = errBody?.error?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();

  /* PSI can return 200 but with an error field */
  if (data.error) {
    throw new Error(data.error.message || 'PageSpeed API returned an error');
  }
  if (!data.lighthouseResult) {
    throw new Error('PageSpeed could not analyse this URL. Make sure it is publicly accessible.');
  }

  return parsePSI(data);
}

function parsePSI(data) {
  const lh   = data.lighthouseResult;
  const cats = lh.categories  || {};
  const aud  = lh.audits      || {};

  const score = k => Math.round((cats[k]?.score ?? 0) * 100);
  const disp  = k => aud[k]?.displayValue ?? '—';
  const num   = k => aud[k]?.numericValue  ?? 0;

  return {
    performance:   score('performance'),
    seo:           score('seo'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),

    vitals: {
      lcp: { value: disp('largest-contentful-paint'), num: num('largest-contentful-paint'), label: 'LCP',         desc: 'Largest Contentful Paint' },
      fcp: { value: disp('first-contentful-paint'),   num: num('first-contentful-paint'),   label: 'FCP',         desc: 'First Contentful Paint' },
      tbt: { value: disp('total-blocking-time'),       num: num('total-blocking-time'),       label: 'TBT',         desc: 'Total Blocking Time' },
      cls: { value: disp('cumulative-layout-shift'),   num: num('cumulative-layout-shift'),   label: 'CLS',         desc: 'Cumulative Layout Shift' },
      si:  { value: disp('speed-index'),               num: num('speed-index'),               label: 'Speed Index', desc: 'How fast content loads visually' },
      tti: { value: disp('interactive'),               num: num('interactive'),               label: 'TTI',         desc: 'Time to Interactive' },
    },

    failedAudits: Object.values(aud)
      .filter(a => a.score !== null && a.score !== undefined && a.score < 0.9 && a.details?.type !== 'debugdata')
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 10)
      .map(a => ({ id: a.id, title: a.title, score: a.score, displayValue: a.displayValue || '' })),
  };
}

/* ─── Groq AI Analysis ──────────────────────────────────── */
async function fetchGroqAnalysis(url, mobile, desktop) {
  const key = (typeof window !== 'undefined' && window.UCH_GROQ_KEY) ? window.UCH_GROQ_KEY : '';
  if (!key) throw new Error('Groq API key not configured');

  const prompt = `You are a senior web performance and SEO consultant. Analyse this PageSpeed Insights data for: ${url}

MOBILE — Performance: ${mobile.performance}/100 | SEO: ${mobile.seo}/100 | Accessibility: ${mobile.accessibility}/100 | Best Practices: ${mobile.bestPractices}/100
MOBILE VITALS — LCP: ${mobile.vitals.lcp.value} | FCP: ${mobile.vitals.fcp.value} | TBT: ${mobile.vitals.tbt.value} | CLS: ${mobile.vitals.cls.value} | Speed Index: ${mobile.vitals.si.value}
DESKTOP — Performance: ${desktop.performance}/100 | SEO: ${desktop.seo}/100 | Accessibility: ${desktop.accessibility}/100 | Best Practices: ${desktop.bestPractices}/100
TOP FAILING AUDITS: ${mobile.failedAudits.map(a => `${a.title} (score:${a.score?.toFixed(2)||'fail'}${a.displayValue?', '+a.displayValue:''})`).join(' | ')}

Respond ONLY with valid JSON in this exact structure (no extra text outside the JSON):
{
  "summary": "2-3 sentence plain-English overview. Be specific about the scores. Mention biggest win and biggest problem.",
  "issues": [
    { "severity": "critical", "text": "one specific issue or strength" },
    { "severity": "warning",  "text": "one specific issue or strength" },
    { "severity": "pass",     "text": "one specific issue or strength" },
    { "severity": "critical", "text": "one specific issue or strength" },
    { "severity": "warning",  "text": "one specific issue or strength" }
  ],
  "recommendations": [
    "Actionable fix #1 with expected impact",
    "Actionable fix #2 with expected impact",
    "Actionable fix #3 with expected impact",
    "Actionable fix #4 with expected impact",
    "Actionable fix #5 with expected impact"
  ]
}`;

  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens:  900,
      messages:    [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Groq API error (${res.status})`);
  }

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned unexpected format');
  return JSON.parse(match[0]);
}

/* ═══════════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════════ */
function renderResults(data, url) {
  const urlEl = document.getElementById('wh-scanned-url-text');
  if (urlEl) urlEl.textContent = url;

  const overall = Math.round(
    (data.performance + data.seo + data.accessibility + data.bestPractices) / 4
  );
  renderOverallScore(overall);
  renderCatScore('perf', data.performance);
  renderCatScore('seo',  data.seo);
  renderCatScore('a11y', data.accessibility);
  renderCatScore('bp',   data.bestPractices);
  renderVitals(data.vitals);

  if (data.ai) {
    renderAI(data.ai);
  } else {
    /* Hide AI section gracefully if Groq failed */
    const aiSection = document.querySelector('.wh-ai-section');
    if (aiSection) aiSection.style.display = 'none';
  }

  setTimeout(() => {
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

function renderOverallScore(score) {
  const numEl   = document.getElementById('wh-overall-num');
  const fillEl  = document.getElementById('wh-circle-fill');
  const gradeEl = document.getElementById('wh-overall-grade');
  if (!numEl || !fillEl || !gradeEl) return;

  numEl.textContent = score;
  /* circumference = 2π × 68 ≈ 427 */
  fillEl.style.strokeDashoffset = 427 - (427 * score / 100);
  const cls = scoreClass(score);
  fillEl.className   = `wh-circle-fill fill-${cls}`;
  gradeEl.textContent = scoreGrade(score);
  gradeEl.className   = `wh-overall-grade grade-${cls}`;
}

function renderCatScore(id, score) {
  const scoreEl = document.getElementById(`wh-cat-score-${id}`);
  const barEl   = document.getElementById(`wh-cat-bar-${id}`);
  if (!scoreEl || !barEl) return;
  const cls = scoreClass(score);
  scoreEl.textContent = score;
  scoreEl.className   = `wh-cat-score score-${cls}`;
  barEl.style.width   = score + '%';
  barEl.className     = `wh-cat-bar bar-${cls}`;
}

function renderVitals(vitals) {
  Object.entries(vitals).forEach(([key, v]) => {
    const el = document.getElementById(`wh-vital-${key}`);
    if (!el) return;
    const valEl = el.querySelector('.wh-vital-value');
    if (!valEl) return;
    const cls = vitalClass(key, v.num);
    valEl.textContent = v.value;
    valEl.className   = `wh-vital-value score-${cls}`;
    el.className      = `wh-vital-card v-${cls}`;
  });
}

function renderAI(ai) {
  const summaryEl = document.getElementById('wh-ai-summary');
  const issuesEl  = document.getElementById('wh-issues-list');
  const recsEl    = document.getElementById('wh-recs-list');

  if (summaryEl && ai.summary) summaryEl.textContent = ai.summary;

  if (issuesEl && Array.isArray(ai.issues)) {
    issuesEl.innerHTML = ai.issues.map(issue => `
      <li class="wh-issue-item issue-${issue.severity}">
        <span class="wh-issue-dot"></span>
        <span>${issue.text}</span>
      </li>`).join('');
  }

  if (recsEl && Array.isArray(ai.recommendations)) {
    recsEl.innerHTML = ai.recommendations.map((rec, i) => `
      <li class="wh-rec-item">
        <span class="wh-rec-num">${i + 1}</span>
        <span>${rec}</span>
      </li>`).join('');
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function scoreClass(s) {
  if (s >= 90) return 'good';
  if (s >= 50) return 'avg';
  return 'poor';
}

function scoreGrade(s) {
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Good';
  if (s >= 50) return 'Needs Work';
  return 'Critical';
}

const VITAL_THRESHOLDS = {
  lcp: [2500, 4000],
  fcp: [1800, 3000],
  tbt: [200,  600],
  cls: [0.1,  0.25],
  si:  [3400, 5800],
  tti: [3800, 7300],
};

function vitalClass(key, num) {
  const t = VITAL_THRESHOLDS[key];
  if (!t) return 'avg';
  if (num <= t[0]) return 'good';
  if (num <= t[1]) return 'avg';
  return 'poor';
}

/* ─── Step helpers ──────────────────────────────────────── */
const SPINNER_SVG = `<svg class="wh-step-check" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="rgba(48,209,88,0.3)" stroke-width="1.5"/><polyline points="4.5,8 7,10.5 11.5,5.5" stroke="#30d158" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function stepActive(n) {
  const el = document.getElementById(`wh-step-${n}`);
  if (!el) return;
  el.classList.add('is-active');
  el.querySelector('.wh-step-icon').innerHTML = '<span class="wh-step-spinner"></span>';
}

function stepDone(n) {
  const el = document.getElementById(`wh-step-${n}`);
  if (!el) return;
  el.classList.remove('is-active');
  el.classList.add('is-done');
  el.querySelector('.wh-step-icon').innerHTML = SPINNER_SVG;
}

function setBar(pct) {
  if (loadingBar) loadingBar.style.width = pct + '%';
}

/* ─── Rotating tips while waiting ──────────────────────── */
const TIPS = [
  'Lighthouse is loading your full page…',
  'Measuring largest contentful paint…',
  'Checking render-blocking resources…',
  'Analysing JavaScript execution time…',
  'Testing mobile network conditions…',
  'Checking image compression…',
  'Measuring cumulative layout shift…',
  'Evaluating SEO meta tags…',
  'Checking accessibility issues…',
  'Almost there — compiling results…',
];
let tipsInterval = null;
let tipIndex = 0;

function startTips() {
  tipIndex = 0;
  setStatus(TIPS[0]);
  tipsInterval = setInterval(() => {
    tipIndex = (tipIndex + 1) % TIPS.length;
    if (loadingStatus) {
      loadingStatus.style.opacity = '0';
      setTimeout(() => {
        setStatus(TIPS[tipIndex]);
        loadingStatus.style.opacity = '1';
      }, 200);
    }
  }, 3500);
}

function stopTips() {
  clearInterval(tipsInterval);
  tipsInterval = null;
}

function setStatus(msg) {
  if (loadingStatus) loadingStatus.textContent = msg;
}

function showLoading(url) {
  if (loadingEl) loadingEl.classList.add('is-active');
  if (scanBtn)   scanBtn.disabled = true;
  /* Show URL being scanned */
  const urlLabel = document.getElementById('wh-loading-url');
  if (urlLabel) urlLabel.textContent = url || '';
  /* Reset all steps */
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`wh-step-${i}`);
    if (el) {
      el.className = 'wh-step';
      el.querySelector('.wh-step-icon').innerHTML = '<span class="wh-step-dot"></span>';
    }
  }
  setBar(5);
}

function hideAll() {
  if (loadingEl) loadingEl.classList.remove('is-active');
  if (errorEl)   errorEl.classList.remove('is-active');
  if (resultsEl) resultsEl.classList.remove('is-active');
  if (scanBtn)   scanBtn.disabled = false;
  if (loadingBar) loadingBar.style.width = '0%';
}

function showError(title, msg) {
  hideAll();
  const titleEl = document.getElementById('wh-error-title');
  const msgEl   = document.getElementById('wh-error-msg');
  if (titleEl) titleEl.textContent = title;
  if (msgEl)   msgEl.textContent   = msg;
  if (errorEl) errorEl.classList.add('is-active');
}
