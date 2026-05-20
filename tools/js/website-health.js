/* ═══════════════════════════════════════════════════════════
   WEBSITE-HEALTH.JS — Umbrella Corp HQ
   Website Health Checker — PageSpeed Insights + Groq AI
═══════════════════════════════════════════════════════════ */

const GROQ_API_KEY = window.UCH_GROQ_KEY || '';
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const PSI_URL      = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/* ─── State ─────────────────────────────────────────────── */
let currentStrategy = 'mobile'; // 'mobile' | 'desktop'
let lastResults     = null;
let currentURL      = '';

/* ─── DOM refs ──────────────────────────────────────────── */
const urlInput      = document.getElementById('wh-url-input');
const scanBtn       = document.getElementById('wh-scan-btn');
const loadingEl     = document.getElementById('wh-loading');
const errorEl       = document.getElementById('wh-error');
const resultsEl     = document.getElementById('wh-results');
const loadingStatus = document.getElementById('wh-loading-status');
const loadingBar    = document.getElementById('wh-loading-bar');

/* ═══════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  scanBtn.addEventListener('click', startScan);
  urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') startScan(); });

  document.querySelectorAll('.wh-device-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wh-device-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentStrategy = btn.dataset.strategy;
      if (lastResults) renderResults(lastResults[currentStrategy], currentURL);
    });
  });

  document.getElementById('wh-rescan-btn')?.addEventListener('click', () => {
    resultsEl.classList.remove('is-active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

/* ═══════════════════════════════════════════════════════════
   SCAN
═══════════════════════════════════════════════════════════ */
async function startScan() {
  let url = urlInput.value.trim();
  if (!url) { urlInput.focus(); return; }

  // Auto-add https://
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  // Basic URL validation
  try { new URL(url); } catch {
    showError('Invalid URL', 'Please enter a valid website address, e.g. https://example.com');
    return;
  }

  currentURL = url;
  hideAll();
  showLoading();

  try {
    setStatus('Fetching mobile metrics…', 10);
    const mobile = await fetchPSI(url, 'mobile');

    setStatus('Fetching desktop metrics…', 35);
    const desktop = await fetchPSI(url, 'desktop');

    setStatus('Analysing with Groq AI…', 65);
    const aiAnalysis = await fetchGroqAnalysis(url, mobile, desktop);

    setStatus('Building your report…', 90);
    lastResults = { mobile: { ...mobile, ai: aiAnalysis }, desktop: { ...desktop, ai: aiAnalysis } };

    setStatus('Done!', 100);
    setTimeout(() => {
      hideAll();
      resultsEl.classList.add('is-active');
      renderResults(lastResults[currentStrategy], url);
    }, 400);

  } catch (err) {
    console.error(err);
    showError('Scan failed', err.message || 'Could not reach the website. Make sure the URL is publicly accessible and try again.');
  }
}

/* ─── PageSpeed Insights API ────────────────────────────── */
async function fetchPSI(url, strategy) {
  const endpoint = `${PSI_URL}?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=seo&category=accessibility&category=best-practices`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `PageSpeed API error (${res.status})`);
  }
  const data = await res.json();
  return parsePSI(data);
}

function parsePSI(data) {
  const lh  = data.lighthouseResult;
  const cats = lh.categories;
  const aud  = lh.audits;

  const score = k => Math.round((cats[k]?.score ?? 0) * 100);
  const disp  = k => aud[k]?.displayValue ?? '—';
  const num   = k => aud[k]?.numericValue  ?? 0;

  return {
    performance:   score('performance'),
    seo:           score('seo'),
    accessibility: score('accessibility'),
    bestPractices: score('best-practices'),

    vitals: {
      lcp:   { value: disp('largest-contentful-paint'),    num: num('largest-contentful-paint'),    label: 'LCP',   desc: 'Largest Contentful Paint' },
      fcp:   { value: disp('first-contentful-paint'),      num: num('first-contentful-paint'),      label: 'FCP',   desc: 'First Contentful Paint' },
      tbt:   { value: disp('total-blocking-time'),         num: num('total-blocking-time'),         label: 'TBT',   desc: 'Total Blocking Time' },
      cls:   { value: disp('cumulative-layout-shift'),     num: num('cumulative-layout-shift'),     label: 'CLS',   desc: 'Cumulative Layout Shift' },
      si:    { value: disp('speed-index'),                 num: num('speed-index'),                 label: 'Speed Index', desc: 'How fast content loads visually' },
      tti:   { value: disp('interactive'),                 num: num('interactive'),                 label: 'TTI',   desc: 'Time to Interactive' },
    },

    // Top failing audits for AI context
    failedAudits: Object.values(aud)
      .filter(a => a.score !== null && a.score < 0.9 && a.details?.type !== 'debugdata')
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 10)
      .map(a => ({ id: a.id, title: a.title, score: a.score, displayValue: a.displayValue || '' })),
  };
}

/* ─── Groq AI Analysis ──────────────────────────────────── */
async function fetchGroqAnalysis(url, mobile, desktop) {
  const prompt = `You are a senior web performance and SEO consultant. Analyse the following Google PageSpeed Insights data for the website: ${url}

MOBILE SCORES: Performance ${mobile.performance}/100 | SEO ${mobile.seo}/100 | Accessibility ${mobile.accessibility}/100 | Best Practices ${mobile.bestPractices}/100
MOBILE VITALS: LCP ${mobile.vitals.lcp.value} | FCP ${mobile.vitals.fcp.value} | TBT ${mobile.vitals.tbt.value} | CLS ${mobile.vitals.cls.value} | Speed Index ${mobile.vitals.si.value}

DESKTOP SCORES: Performance ${desktop.performance}/100 | SEO ${desktop.seo}/100 | Accessibility ${desktop.accessibility}/100 | Best Practices ${desktop.bestPractices}/100

TOP FAILING AUDITS (mobile): ${mobile.failedAudits.map(a => `${a.title} (score: ${a.score?.toFixed(2) || 'fail'}${a.displayValue ? ', ' + a.displayValue : ''})`).join(' | ')}

Respond ONLY with a valid JSON object in this exact structure:
{
  "summary": "2-3 sentence plain-English overview of the site's health. Be specific about scores. Mention the biggest win and biggest problem.",
  "issues": [
    { "severity": "critical|warning|pass", "text": "Specific issue or strength in one sentence" },
    { "severity": "critical|warning|pass", "text": "..." },
    { "severity": "critical|warning|pass", "text": "..." },
    { "severity": "critical|warning|pass", "text": "..." },
    { "severity": "critical|warning|pass", "text": "..." }
  ],
  "recommendations": [
    "Specific actionable fix #1 with expected impact",
    "Specific actionable fix #2 with expected impact",
    "Specific actionable fix #3 with expected impact",
    "Specific actionable fix #4 with expected impact",
    "Specific actionable fix #5 with expected impact"
  ]
}`;

  const res = await fetch(GROQ_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens:  900,
      messages:    [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error('AI analysis failed — showing metrics only.');

  const data    = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned unexpected format.');
  return JSON.parse(match[0]);
}

/* ═══════════════════════════════════════════════════════════
   RENDER RESULTS
═══════════════════════════════════════════════════════════ */
function renderResults(data, url) {
  // Scanned URL bar
  document.getElementById('wh-scanned-url-text').textContent = url;

  // Overall score
  const overall = Math.round((data.performance + data.seo + data.accessibility + data.bestPractices) / 4);
  renderOverallScore(overall);

  // Category scores
  renderCatScore('perf',  data.performance);
  renderCatScore('seo',   data.seo);
  renderCatScore('a11y',  data.accessibility);
  renderCatScore('bp',    data.bestPractices);

  // Core Web Vitals
  renderVitals(data.vitals);

  // AI Analysis
  if (data.ai) renderAI(data.ai);

  // Scroll to results
  setTimeout(() => {
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function renderOverallScore(score) {
  const numEl   = document.getElementById('wh-overall-num');
  const fillEl  = document.getElementById('wh-circle-fill');
  const gradeEl = document.getElementById('wh-overall-grade');

  numEl.textContent = score;

  // Animate circle: circumference = 2π×68 ≈ 427
  const offset = 427 - (427 * score / 100);
  fillEl.style.strokeDashoffset = offset;

  const cls = scoreClass(score);
  fillEl.className = `wh-circle-fill fill-${cls}`;

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
    if (valEl) {
      const cls = vitalClass(key, v.num);
      valEl.textContent = v.value;
      valEl.className   = `wh-vital-value score-${cls}`;
      el.className      = `wh-vital-card v-${cls}`;
    }
  });
}

function renderAI(ai) {
  const summaryEl = document.getElementById('wh-ai-summary');
  const issuesEl  = document.getElementById('wh-issues-list');
  const recsEl    = document.getElementById('wh-recs-list');

  if (summaryEl) summaryEl.textContent = ai.summary || '';

  if (issuesEl && ai.issues) {
    issuesEl.innerHTML = ai.issues.map(issue => `
      <li class="wh-issue-item issue-${issue.severity}">
        <span class="wh-issue-dot"></span>
        <span>${issue.text}</span>
      </li>`).join('');
  }

  if (recsEl && ai.recommendations) {
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

// Thresholds per Core Web Vital
const VITAL_THRESHOLDS = {
  lcp: [2500, 4000],   // ms
  fcp: [1800, 3000],   // ms
  tbt: [200,  600],    // ms
  cls: [0.1,  0.25],   // unitless
  si:  [3400, 5800],   // ms
  tti: [3800, 7300],   // ms
};

function vitalClass(key, num) {
  const t = VITAL_THRESHOLDS[key];
  if (!t) return 'avg';
  if (num <= t[0]) return 'good';
  if (num <= t[1]) return 'avg';
  return 'poor';
}

function setStatus(msg, pct) {
  if (loadingStatus) loadingStatus.textContent = msg;
  if (loadingBar)    loadingBar.style.width     = pct + '%';
}

function showLoading() {
  loadingEl.classList.add('is-active');
  scanBtn.disabled = true;
}

function hideAll() {
  loadingEl.classList.remove('is-active');
  errorEl.classList.remove('is-active');
  resultsEl.classList.remove('is-active');
  scanBtn.disabled = false;
  if (loadingBar) loadingBar.style.width = '0%';
}

function showError(title, msg) {
  hideAll();
  document.getElementById('wh-error-title').textContent = title;
  document.getElementById('wh-error-msg').textContent   = msg;
  errorEl.classList.add('is-active');
}
