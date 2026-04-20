'use strict';

/* ═══════════════════════════════════════════════
   UMBRELLA CORP HQ — MARKETING ROI PREDICTOR
   Version: 1.0.0
   Proxy URL: window.UCH_PROXY_URL || 'http://localhost:3001'
═══════════════════════════════════════════════ */

const PROXY_URL = (window.UCH_PROXY_URL || 'http://localhost:3001').replace(/\/$/, '');

/* ── INDUSTRY BENCHMARKS (Bangladesh-specific) ── */
const bdBenchmarks = {
  restaurant:   { avgROI: 3.2, topROI: 5.8,  metaCPM: 25, googleCPC: 8,  conversionRate: 4.2, uchProjectedROI: 4.9, industryGrowth: '23% YoY in Dhaka F&B market' },
  retail:       { avgROI: 2.8, topROI: 6.2,  metaCPM: 30, googleCPC: 12, conversionRate: 2.8, uchProjectedROI: 5.1, industryGrowth: '41% YoY in BD e-commerce' },
  fashion:      { avgROI: 3.5, topROI: 7.1,  metaCPM: 22, googleCPC: 9,  conversionRate: 3.1, uchProjectedROI: 5.8, industryGrowth: '18% YoY in BD fashion' },
  real_estate:  { avgROI: 4.1, topROI: 9.2,  metaCPM: 45, googleCPC: 35, conversionRate: 1.2, uchProjectedROI: 7.3, industryGrowth: '15% YoY in Dhaka property' },
  healthcare:   { avgROI: 2.5, topROI: 4.8,  metaCPM: 20, googleCPC: 18, conversionRate: 5.1, uchProjectedROI: 4.1, industryGrowth: '31% YoY in BD healthcare' },
  education:    { avgROI: 3.8, topROI: 7.4,  metaCPM: 18, googleCPC: 10, conversionRate: 6.2, uchProjectedROI: 6.1, industryGrowth: '27% YoY in BD edtech' },
  technology:   { avgROI: 4.5, topROI: 11.2, metaCPM: 35, googleCPC: 22, conversionRate: 2.1, uchProjectedROI: 8.2, industryGrowth: '52% YoY in BD tech sector' },
  manufacturing:{ avgROI: 2.2, topROI: 4.1,  metaCPM: 28, googleCPC: 15, conversionRate: 1.8, uchProjectedROI: 3.6, industryGrowth: '12% YoY in BD manufacturing' },
  beauty:       { avgROI: 4.2, topROI: 8.3,  metaCPM: 20, googleCPC: 8,  conversionRate: 5.8, uchProjectedROI: 6.9, industryGrowth: '35% YoY in BD beauty' },
  logistics:    { avgROI: 2.1, topROI: 3.8,  metaCPM: 25, googleCPC: 12, conversionRate: 2.2, uchProjectedROI: 3.2, industryGrowth: '44% YoY in BD logistics' },
  finance:      { avgROI: 3.1, topROI: 6.8,  metaCPM: 40, googleCPC: 28, conversionRate: 1.5, uchProjectedROI: 5.4, industryGrowth: '22% YoY in BD fintech' },
  hospitality:  { avgROI: 2.9, topROI: 5.5,  metaCPM: 30, googleCPC: 14, conversionRate: 3.4, uchProjectedROI: 4.7, industryGrowth: '19% YoY in BD tourism' },
  agriculture:  { avgROI: 1.8, topROI: 3.2,  metaCPM: 15, googleCPC: 6,  conversionRate: 2.8, uchProjectedROI: 2.9, industryGrowth: '16% YoY in BD agritech' },
  construction: { avgROI: 3.3, topROI: 6.1,  metaCPM: 35, googleCPC: 20, conversionRate: 1.4, uchProjectedROI: 5.2, industryGrowth: '21% YoY in BD construction' },
  media:        { avgROI: 3.9, topROI: 8.8,  metaCPM: 22, googleCPC: 11, conversionRate: 3.8, uchProjectedROI: 7.1, industryGrowth: '38% YoY in BD media' },
  other:        { avgROI: 2.8, topROI: 5.5,  metaCPM: 25, googleCPC: 12, conversionRate: 3.0, uchProjectedROI: 4.5, industryGrowth: '20% YoY average BD market' },
  /* HTML dropdown aliases */
  ecommerce:    { avgROI: 2.8, topROI: 6.2,  metaCPM: 30, googleCPC: 12, conversionRate: 2.8, uchProjectedROI: 5.1, industryGrowth: '41% YoY in BD e-commerce' },
  food_bev:     { avgROI: 3.2, topROI: 5.8,  metaCPM: 25, googleCPC: 8,  conversionRate: 4.2, uchProjectedROI: 4.9, industryGrowth: '23% YoY in Dhaka F&B market' },
  health:       { avgROI: 2.5, topROI: 4.8,  metaCPM: 20, googleCPC: 18, conversionRate: 5.1, uchProjectedROI: 4.1, industryGrowth: '31% YoY in BD healthcare' },
  ngo:          { avgROI: 1.5, topROI: 3.0,  metaCPM: 15, googleCPC: 8,  conversionRate: 3.5, uchProjectedROI: 2.5, industryGrowth: '10% YoY in BD NGO sector' },
};

/* ── INDUSTRIES LIST ── */
const industries = [
  { value: 'restaurant',    label: 'Restaurant / Food & Beverage' },
  { value: 'retail',        label: 'Retail / E-commerce' },
  { value: 'fashion',       label: 'Fashion / Apparel' },
  { value: 'real_estate',   label: 'Real Estate / Property' },
  { value: 'healthcare',    label: 'Healthcare / Clinic / Pharmacy' },
  { value: 'education',     label: 'Education / Coaching / Training' },
  { value: 'technology',    label: 'Technology / Software / App' },
  { value: 'manufacturing', label: 'Manufacturing / B2B' },
  { value: 'beauty',        label: 'Beauty / Salon / Wellness' },
  { value: 'logistics',     label: 'Logistics / Transport' },
  { value: 'finance',       label: 'Finance / Insurance / Investment' },
  { value: 'hospitality',   label: 'Hotel / Travel / Tourism' },
  { value: 'agriculture',   label: 'Agriculture / Food Processing' },
  { value: 'construction',  label: 'Construction / Architecture' },
  { value: 'media',         label: 'Media / Content / Creative' },
  { value: 'other',         label: 'Other' },
];

/* ── LOADING MESSAGES ── */
var LOADING_MESSAGES = [
  'Comparing against 847 BD businesses\u2026',
  'Calculating your industry benchmark gap\u2026',
  'Identifying revenue leakage points\u2026',
  'Building your personalised report\u2026',
  'Almost ready\u2026',
];

/* ── EMAIL REGEX ── */
var EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/* ── APPLICATION STATE ── */
var state = {
  inputs: null,
  calculations: null,
  aiNarrative: null,
  leadData: null,
  chart: null,
};

/* ══════════════════════════════════════════════════════════
   SECTION 1: UTILITIES
══════════════════════════════════════════════════════════ */

/**
 * Format a number as BDT using the Indian grouping system.
 * 250000  → ৳2,50,000
 * 1000000 → ৳10,00,000
 * 50000   → ৳50,000
 * The Taka sign is ৳ (U+09F3).
 */
function formatBDT(n) {
  var num = Math.round(n);
  var isNeg = num < 0;
  var abs = Math.abs(num).toString();

  /* Indian grouping: last 3 digits, then groups of 2 */
  var result = '';
  if (abs.length <= 3) {
    result = abs;
  } else {
    var last3 = abs.slice(-3);
    var rest = abs.slice(0, abs.length - 3);
    var groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, rest.length - 2);
    }
    if (rest.length > 0) groups.unshift(rest);
    result = groups.join(',') + ',' + last3;
  }

  return (isNeg ? '-' : '') + '\u09F3' + result;
}

/**
 * Get benchmark, falling back to 'other' if key not found.
 */
function getBenchmark(industry) {
  return bdBenchmarks[industry] || bdBenchmarks['other'];
}

/* ══════════════════════════════════════════════════════════
   SECTION 2: DROPDOWN & SLIDER SETUP
══════════════════════════════════════════════════════════ */

/**
 * Build the #industry select from the industries array.
 * Note: The HTML already has its own options; this function
 * is additive-safe (checks for existing options first).
 */
function buildIndustryDropdown() {
  var sel = document.getElementById('industry');
  if (!sel) return;

  /* Only populate if the select has just the placeholder */
  if (sel.options.length <= 1) {
    industries.forEach(function(ind) {
      var opt = document.createElement('option');
      opt.value = ind.value;
      opt.textContent = ind.label;
      sel.appendChild(opt);
    });
  }
}

/**
 * Initialise bidirectional slider ↔ text input ↔ display sync.
 */
function initSliders() {
  /* Revenue */
  var revSlider  = document.getElementById('revenue-slider');
  var revInput   = document.getElementById('monthly-revenue');
  var revDisplay = document.getElementById('revenue-display');

  /* Ad Spend */
  var spendSlider  = document.getElementById('spend-slider');
  var spendInput   = document.getElementById('ad-spend');
  var spendDisplay = document.getElementById('spend-display');

  function updateRevDisplay(val) {
    if (revDisplay) revDisplay.textContent = formatBDT(val);
  }

  function updateSpendDisplay(val) {
    if (spendDisplay) spendDisplay.textContent = formatBDT(val);
  }

  /* Set initial display values */
  if (revSlider) updateRevDisplay(revSlider.value);
  if (spendSlider) updateSpendDisplay(spendSlider.value);

  /* Slider → text input + display */
  if (revSlider) {
    revSlider.addEventListener('input', function() {
      var v = parseInt(this.value, 10);
      updateRevDisplay(v);
      if (revInput) revInput.value = v;
      if (revSlider) revSlider.setAttribute('aria-valuenow', v);
    });
  }

  if (spendSlider) {
    spendSlider.addEventListener('input', function() {
      var v = parseInt(this.value, 10);
      updateSpendDisplay(v);
      if (spendInput) spendInput.value = v;
      if (spendSlider) spendSlider.setAttribute('aria-valuenow', v);
    });
  }

  /* Text input → slider + display */
  if (revInput) {
    revInput.addEventListener('change', function() {
      var min = parseInt(revSlider ? revSlider.min : 50000, 10);
      var max = parseInt(revSlider ? revSlider.max : 50000000, 10);
      var v = parseInt(this.value, 10) || min;
      v = Math.min(max, Math.max(min, v));
      this.value = v;
      if (revSlider) {
        revSlider.value = v;
        revSlider.setAttribute('aria-valuenow', v);
      }
      updateRevDisplay(v);
    });
    revInput.addEventListener('input', function() {
      var v = parseInt(this.value, 10);
      if (!isNaN(v)) updateRevDisplay(v);
    });
  }

  if (spendInput) {
    spendInput.addEventListener('change', function() {
      var min = parseInt(spendSlider ? spendSlider.min : 0, 10);
      var max = parseInt(spendSlider ? spendSlider.max : 5000000, 10);
      var v = parseInt(this.value, 10);
      if (isNaN(v)) v = min;
      v = Math.min(max, Math.max(min, v));
      this.value = v;
      if (spendSlider) {
        spendSlider.value = v;
        spendSlider.setAttribute('aria-valuenow', v);
      }
      updateSpendDisplay(v);
    });
    spendInput.addEventListener('input', function() {
      var v = parseInt(this.value, 10);
      if (!isNaN(v)) updateSpendDisplay(v);
    });
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 3: CALCULATION ENGINE
══════════════════════════════════════════════════════════ */

function calculateROI(inputs) {
  var benchmark = getBenchmark(inputs.industry);
  var spend = inputs.adSpend;
  var revenue = inputs.monthlyRevenue;
  var currentROI = spend > 0 ? (revenue / spend) : 0;
  var currentRevenueFromAds = spend * currentROI;
  var industryAvgRevenue = spend * benchmark.avgROI;
  var industryTopRevenue = spend * benchmark.topROI;
  var uchProjectedRevenue = spend * benchmark.uchProjectedROI;
  var uchGain = uchProjectedRevenue - currentRevenueFromAds;
  var monthlyLeakage = Math.max(0, industryAvgRevenue - currentRevenueFromAds);
  var efficiencyScore = Math.min(100, Math.round((currentROI / benchmark.topROI) * 100));

  return {
    currentROI: currentROI.toFixed(1),
    industryAvgROI: benchmark.avgROI,
    industryTopROI: benchmark.topROI,
    uchProjectedROI: benchmark.uchProjectedROI,
    monthlyLeakage: Math.round(monthlyLeakage),
    uchMonthlyGain: Math.round(uchGain),
    ninetyDayGain: Math.round(uchGain * 3),
    annualGain: Math.round(uchGain * 12),
    efficiencyScore: efficiencyScore,
    uchROIMultiple: (benchmark.uchProjectedROI / (currentROI || 1)).toFixed(1),
    industryGrowth: benchmark.industryGrowth,
    benchmark: benchmark,
    /* convenience computed values */
    currentRevenueFromAds: Math.round(currentRevenueFromAds),
    industryAvgRevenue: Math.round(industryAvgRevenue),
    uchProjectedRevenue: Math.round(uchProjectedRevenue),
  };
}

/* ══════════════════════════════════════════════════════════
   SECTION 4: LOADING STATE
══════════════════════════════════════════════════════════ */

var _loadingTimer = null;
var _loadingMsgTimer = null;
var _loadingStart = null;
var _loadingRaf = null;

function showLoadingState() {
  var section = document.getElementById('loading-section');
  var bar     = document.getElementById('progress-bar');
  var msg     = document.getElementById('loading-message');

  if (section) section.style.display = 'block';
  if (bar) {
    bar.style.transition = 'none';
    bar.style.width = '0%';
  }

  /* Animate progress bar 0→100% over 5 seconds */
  _loadingStart = Date.now();
  (function animateBar() {
    var elapsed = Date.now() - _loadingStart;
    var pct = Math.min(100, (elapsed / 5000) * 100);
    if (bar) bar.style.width = pct + '%';
    if (pct < 100) {
      _loadingRaf = requestAnimationFrame(animateBar);
    }
  })();

  /* Rotate messages every 1.5s */
  var msgIndex = 0;
  if (msg) msg.textContent = LOADING_MESSAGES[0];
  _loadingMsgTimer = setInterval(function() {
    msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
    if (msg) msg.textContent = LOADING_MESSAGES[msgIndex];
  }, 1500);

  /* Scroll to loading section */
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideLoadingState() {
  var section = document.getElementById('loading-section');
  var bar     = document.getElementById('progress-bar');

  if (_loadingRaf) cancelAnimationFrame(_loadingRaf);
  if (_loadingMsgTimer) clearInterval(_loadingMsgTimer);
  _loadingRaf = null;
  _loadingMsgTimer = null;

  if (bar) bar.style.width = '100%';

  setTimeout(function() {
    if (section) section.style.display = 'none';
    if (bar) bar.style.width = '0%';
  }, 300);
}

/* ══════════════════════════════════════════════════════════
   SECTION 5: AI NARRATIVE
══════════════════════════════════════════════════════════ */

function buildPrompt(inputs, calculations) {
  return (
    'You are a senior marketing strategist specialising in Bangladesh digital marketing. ' +
    'Generate a JSON object with these exact keys: headline, currentState, opportunity, uchApproach, urgency.\n\n' +
    'Business: ' + inputs.businessName + '\n' +
    'Industry: ' + inputs.industry + '\n' +
    'Monthly Revenue: BDT ' + inputs.monthlyRevenue.toLocaleString() + '\n' +
    'Monthly Ad Spend: BDT ' + inputs.adSpend.toLocaleString() + '\n' +
    'Current ROI: ' + calculations.currentROI + 'x\n' +
    'Industry Average ROI: ' + calculations.industryAvgROI + 'x\n' +
    'Projected ROI with UCH: ' + calculations.uchProjectedROI + 'x\n' +
    'Monthly Revenue Leakage: BDT ' + calculations.monthlyLeakage.toLocaleString() + '\n' +
    'Annual Opportunity: BDT ' + calculations.annualGain.toLocaleString() + '\n' +
    'Efficiency Score: ' + calculations.efficiencyScore + '/100\n' +
    'Industry Growth: ' + calculations.industryGrowth + '\n' +
    'Ad Experience: ' + inputs.adExperience + '\n' +
    'Primary Goal: ' + inputs.goal + '\n' +
    'Biggest Challenge: ' + inputs.challenge + '\n\n' +
    'Instructions:\n' +
    '- headline: A single punchy headline (max 12 words) that captures their specific situation.\n' +
    '- currentState: 2-3 sentences about their current marketing performance using the specific numbers. Be direct.\n' +
    '- opportunity: 2-3 sentences about the revenue gap and what is possible in the BD market context.\n' +
    '- uchApproach: 2-3 sentences about what UCH would specifically do for this business given their challenge and goal.\n' +
    '- urgency: 1-2 sentences about the cost of waiting, referencing their monthly leakage amount.\n' +
    'Return ONLY valid JSON, no markdown, no explanation.'
  );
}

async function generateAINarrative(inputs, calculations) {
  var prompt = buildPrompt(inputs, calculations);
  var response = await fetch(PROXY_URL + '/api/narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt }),
  });

  if (!response.ok) {
    throw new Error('Narrative API returned ' + response.status);
  }

  var data = await response.json();
  var text = data.text || data.content || '';

  /* Strip any markdown fences if present */
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  var parsed = JSON.parse(text);
  return parsed;
}

function generateFallbackNarrative(inputs, calculations) {
  var name = inputs.businessName;
  var industry = inputs.industry;
  var currentROI = calculations.currentROI;
  var avgROI = calculations.industryAvgROI;
  var uchROI = calculations.uchProjectedROI;
  var leakage = formatBDT(calculations.monthlyLeakage);
  var annual = formatBDT(calculations.annualGain);
  var score = calculations.efficiencyScore;

  var industryLabel = industry.charAt(0).toUpperCase() + industry.slice(1).replace(/_/g, ' ');

  var headline;
  if (score < 30) {
    headline = name + ' Has Significant Untapped Revenue Potential';
  } else if (score < 60) {
    headline = name + ' Is Missing ' + leakage + ' Every Month';
  } else {
    headline = name + ' Is Close to Peak Performance — Let\u2019s Close the Gap';
  }

  var currentState =
    'Currently, ' + name + ' is generating a ' + currentROI + 'x return on ad spend, ' +
    'which places you ' + (parseFloat(currentROI) < avgROI ? 'below' : 'at or above') +
    ' the Bangladesh ' + industryLabel + ' industry average of ' + avgROI + 'x. ' +
    'With an efficiency score of ' + score + '/100, there is measurable room for improvement in how your marketing budget is working for you.';

  var opportunity =
    'The top-performing ' + industryLabel + ' businesses in Bangladesh are achieving up to ' + calculations.industryTopROI + 'x ROI. ' +
    'The gap between your current performance and the industry average alone represents ' + leakage + ' in monthly revenue you are not capturing. ' +
    'Over a full year, that adds up to ' + annual + ' in unrealised growth — real money that is currently going to your competitors.';

  var uchApproach;
  if (inputs.challenge === 'poor_conversion') {
    uchApproach =
      'UCH would begin with a full conversion rate audit, identifying where potential customers are dropping off in your funnel. ' +
      'We\u2019d rebuild your ad creative and landing page experience to align with high-intent BD audiences, then implement proper pixel tracking so every decision is data-driven. ' +
      'Our goal is to push your ROI from ' + currentROI + 'x to a projected ' + uchROI + 'x within 90 days.';
  } else if (inputs.challenge === 'wrong_audience') {
    uchApproach =
      'UCH would run a deep audience analysis for ' + name + ' in the Bangladesh market, building detailed lookalike and interest-based segments. ' +
      'We\u2019d restructure your campaigns to reach the right people at the right time, eliminating wasted spend. ' +
      'Our projected outcome: ' + uchROI + 'x ROI, pushing your annual revenue opportunity to ' + annual + '.';
  } else {
    uchApproach =
      'UCH would conduct a complete audit of your current campaigns and build a data-led strategy tailored to the Bangladesh ' + industryLabel + ' market. ' +
      'We\u2019d introduce proven creative frameworks, tighter audience targeting, and weekly performance reviews to compound gains. ' +
      'Based on your numbers, we project reaching ' + uchROI + 'x ROI within a 90-day engagement.';
  }

  var urgency =
    'Every month without an optimised strategy costs ' + name + ' approximately ' + leakage + ' in revenue that your competitors are capturing instead. ' +
    'Given the ' + calculations.industryGrowth + ', the window to establish dominance in your market is narrowing — the best time to act is now.';

  return {
    headline: headline,
    currentState: currentState,
    opportunity: opportunity,
    uchApproach: uchApproach,
    urgency: urgency,
    isFallback: true,
  };
}

/* ══════════════════════════════════════════════════════════
   SECTION 6: FORM VALIDATION & INPUT COLLECTION
══════════════════════════════════════════════════════════ */

function setError(id, msg) {
  var el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearErrors() {
  ['err-business-name', 'err-industry', 'err-monthly-revenue', 'err-ad-spend'].forEach(function(id) {
    setError(id, '');
  });
}

function validateForm() {
  clearErrors();
  var valid = true;

  var name = document.getElementById('business-name');
  if (!name || !name.value.trim()) {
    setError('err-business-name', 'Please enter your business name.');
    valid = false;
  }

  var industry = document.getElementById('industry');
  if (!industry || !industry.value) {
    setError('err-industry', 'Please select your industry.');
    valid = false;
  }

  var revenue = document.getElementById('monthly-revenue');
  var revVal = revenue ? parseFloat(revenue.value) : NaN;
  if (!revenue || !revenue.value || isNaN(revVal) || revVal < 50000) {
    setError('err-monthly-revenue', 'Please enter a monthly revenue of at least \u09F350,000.');
    valid = false;
  }

  var spend = document.getElementById('ad-spend');
  var spendVal = spend ? parseFloat(spend.value) : NaN;
  if (!spend || spend.value === '' || isNaN(spendVal) || spendVal < 0) {
    setError('err-ad-spend', 'Please enter your monthly ad spend (0 if none).');
    valid = false;
  }

  return valid;
}

function getFormInputs() {
  return {
    businessName: (document.getElementById('business-name') || {}).value.trim(),
    industry: (document.getElementById('industry') || {}).value,
    monthlyRevenue: parseFloat((document.getElementById('monthly-revenue') || {}).value) || 0,
    adSpend: parseFloat((document.getElementById('ad-spend') || {}).value) || 0,
    adExperience: (document.getElementById('ad-experience') || {}).value || '3_12m',
    goal: (document.getElementById('goal') || {}).value || 'lead_generation',
    challenge: (document.getElementById('challenge') || {}).value || 'poor_conversion',
  };
}

/* ══════════════════════════════════════════════════════════
   SECTION 7: PREVIEW SECTION
══════════════════════════════════════════════════════════ */

function renderPreview(calculations, headline) {
  var headlineEl  = document.getElementById('preview-headline');
  var currentEl   = document.getElementById('preview-current-roi');
  var avgEl       = document.getElementById('preview-avg-roi');
  var uchEl       = document.getElementById('preview-uch-roi');
  var previewSec  = document.getElementById('preview-section');

  if (headlineEl) headlineEl.textContent = headline || 'Your ROI Report Is Ready';
  if (currentEl)  currentEl.textContent  = calculations.currentROI + 'x';
  if (avgEl)      avgEl.textContent      = calculations.industryAvgROI + 'x';
  if (uchEl)      uchEl.textContent      = calculations.uchProjectedROI + 'x';

  if (previewSec) {
    previewSec.style.display = 'block';
    setTimeout(function() {
      previewSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 8: LEAD MODAL
══════════════════════════════════════════════════════════ */

function openLeadModal() {
  var overlay = document.getElementById('lead-modal-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    overlay.setAttribute('aria-hidden', 'false');
    /* Focus first input */
    var first = overlay.querySelector('input');
    if (first) setTimeout(function() { first.focus(); }, 50);
  }
}

function closeLeadModal() {
  var overlay = document.getElementById('lead-modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    overlay.setAttribute('aria-hidden', 'true');
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 9: LEAD FORM VALIDATION & SUBMISSION
══════════════════════════════════════════════════════════ */

function clearLeadErrors() {
  ['err-lead-name', 'err-lead-email', 'err-lead-phone', 'err-lead-company'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function validateLeadForm() {
  clearLeadErrors();
  var valid = true;

  var name = document.getElementById('lead-name');
  if (!name || !name.value.trim()) {
    var errN = document.getElementById('err-lead-name');
    if (errN) errN.textContent = 'Please enter your full name.';
    valid = false;
  }

  var email = document.getElementById('lead-email');
  if (!email || !email.value.trim() || !EMAIL_REGEX.test(email.value.trim())) {
    var errE = document.getElementById('err-lead-email');
    if (errE) errE.textContent = 'Please enter a valid email address.';
    valid = false;
  }

  var phone = document.getElementById('lead-phone');
  if (!phone || !phone.value.trim() || phone.value.trim().length < 7) {
    var errP = document.getElementById('err-lead-phone');
    if (errP) errP.textContent = 'Please enter a valid phone number.';
    valid = false;
  }

  var company = document.getElementById('lead-company');
  if (!company || !company.value.trim()) {
    var errC = document.getElementById('err-lead-company');
    if (errC) errC.textContent = 'Please enter your company name.';
    valid = false;
  }

  return valid;
}

async function submitLead(e) {
  e.preventDefault();

  if (!validateLeadForm()) return;

  var btn = document.getElementById('unlock-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Unlocking\u2026';
  }

  var leadData = {
    name:    (document.getElementById('lead-name')    || {}).value.trim(),
    email:   (document.getElementById('lead-email')   || {}).value.trim(),
    phone:   (document.getElementById('lead-phone')   || {}).value.trim(),
    company: (document.getElementById('lead-company') || {}).value.trim(),
    wantsPDF:     document.getElementById('cb-pdf')     ? document.getElementById('cb-pdf').checked     : true,
    wantsConsult: document.getElementById('cb-consult') ? document.getElementById('cb-consult').checked : true,
  };

  state.leadData = leadData;

  try {
    saveLead(leadData, state.inputs, state.calculations);
    await sendWebhook(leadData);
  } catch (err) {
    console.warn('[UCH] Lead save/webhook error:', err);
  }

  closeLeadModal();
  unlockFullResults(state.calculations, state.aiNarrative, state.inputs);

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Unlock My Report \u2192';
  }
}

function saveLead(leadData, inputs, calculations) {
  var leads = [];
  try {
    leads = JSON.parse(localStorage.getItem('uch_leads') || '[]');
  } catch (e) { leads = []; }

  var lead = {
    id: 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    name: leadData.name,
    email: leadData.email,
    phone: leadData.phone,
    company: leadData.company,
    industry: inputs ? inputs.industry : '',
    revenue: inputs ? inputs.monthlyRevenue : 0,
    adSpend: inputs ? inputs.adSpend : 0,
    score: calculations ? calculations.efficiencyScore : 0,
    reportDownloaded: false,
    note: '',
  };

  leads.push(lead);
  try {
    localStorage.setItem('uch_leads', JSON.stringify(leads));
  } catch (e) {
    console.warn('[UCH] localStorage write failed:', e);
  }

  console.log('[UCH Lead]', JSON.stringify(lead, null, 2));
}

async function sendWebhook(leadData) {
  var webhookUrl = localStorage.getItem('uch_webhook_url');
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadData: leadData,
        inputs: state.inputs,
        calculations: state.calculations,
        timestamp: new Date().toISOString(),
        source: 'roi-predictor',
      }),
    });
  } catch (e) {
    /* fail silently */
  }
}

/* ══════════════════════════════════════════════════════════
   SECTION 10: FULL RESULTS
══════════════════════════════════════════════════════════ */

function unlockFullResults(calculations, aiNarrative, inputs) {
  var section = document.getElementById('results-section');
  if (!section) return;

  section.style.display = 'block';

  renderScoreCircle(calculations.efficiencyScore);
  renderMetrics(calculations);
  renderNarrative(aiNarrative);
  renderChart(calculations, inputs);
  renderTimeline(calculations, inputs);

  setTimeout(function() {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 200);
}

/* ── Score Circle ── */
function renderScoreCircle(score) {
  var circle  = document.getElementById('score-circle-fill');
  var numEl   = document.getElementById('score-number');
  var ctxEl   = document.getElementById('score-context');

  var circumference = 339.3;
  var targetOffset  = circumference - (circumference * score / 100);

  if (circle) {
    /* Trigger reflow so transition works */
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = circumference;
    /* eslint-disable-next-line no-unused-expressions */
    circle.getBoundingClientRect();
    circle.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)';
    circle.style.strokeDashoffset = targetOffset;
  }

  /* Count-up animation */
  if (numEl) {
    var start = 0;
    var duration = 1400;
    var startTime = null;
    function countUp(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      /* ease-out */
      var eased = 1 - Math.pow(1 - progress, 3);
      numEl.textContent = Math.round(eased * score);
      if (progress < 1) requestAnimationFrame(countUp);
    }
    requestAnimationFrame(countUp);
  }

  /* Context text */
  if (ctxEl) {
    var percentile = Math.round(score);
    var msg;
    if (percentile >= 80) {
      msg = 'You\u2019re outperforming ' + percentile + '% of BD businesses in your industry.';
    } else if (percentile >= 50) {
      msg = 'You\u2019re outperforming ' + percentile + '% of BD businesses — strong foundation to build on.';
    } else if (percentile >= 30) {
      msg = 'You\u2019re ahead of ' + percentile + '% of BD businesses — significant gains within reach.';
    } else {
      msg = 'You\u2019re in the bottom ' + (100 - percentile) + '% for your industry — biggest upside opportunity.';
    }
    ctxEl.textContent = msg;
  }
}

/* ── Metrics ── */
function renderMetrics(calculations) {
  var map = {
    'res-current-roi': calculations.currentROI + 'x',
    'res-avg-roi':     calculations.industryAvgROI + 'x',
    'res-uch-roi':     calculations.uchProjectedROI + 'x',
    'res-annual':      formatBDT(calculations.annualGain),
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = map[id];
  });
}

/* ── Narrative ── */
function renderNarrative(aiNarrative) {
  if (!aiNarrative) return;

  var map = {
    'narrative-current-state': aiNarrative.currentState || '',
    'narrative-opportunity':   aiNarrative.opportunity   || '',
    'narrative-uch-approach':  aiNarrative.uchApproach   || '',
    'narrative-urgency':       aiNarrative.urgency       || '',
  };

  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = map[id];
  });

  var statusNote = document.getElementById('ai-status-note');
  if (statusNote && aiNarrative.isFallback) {
    statusNote.textContent = '\u24D8\u00A0 AI analysis temporarily unavailable \u2014 showing benchmark data. Figures are projections based on averages across our client portfolio. Individual results may vary.';
  }
}

/* ── Chart ── */
function renderChart(calculations, inputs) {
  var canvas = document.getElementById('roi-chart');
  if (!canvas) return;

  /* Destroy previous chart instance */
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  if (typeof Chart === 'undefined') {
    console.warn('[UCH] Chart.js not loaded.');
    return;
  }

  var spend = inputs.adSpend;
  var currentRev   = spend * parseFloat(calculations.currentROI);
  var industryRev  = spend * calculations.industryAvgROI;
  var uchRev       = spend * calculations.uchProjectedROI;

  var ctx = canvas.getContext('2d');

  state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Your Current', 'Industry Average', 'With UCH'],
      datasets: [{
        label: 'Monthly Revenue from Ad Spend (BDT)',
        data: [currentRev, industryRev, uchRev],
        backgroundColor: ['#3a3a3a', '#4a6b8a', '#c1121f'],
        borderColor:     ['#555555', '#5a7b9a', '#e02030'],
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ' ' + formatBDT(ctx.parsed.y);
            },
          },
          backgroundColor: '#1a1a1a',
          titleColor: '#ffffff',
          bodyColor: '#cccccc',
          borderColor: '#333333',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#cccccc', font: { family: 'DM Sans, sans-serif', size: 13 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.1)' },
        },
        y: {
          ticks: {
            color: '#cccccc',
            font: { family: 'DM Sans, sans-serif', size: 12 },
            callback: function(value) { return formatBDT(value); },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: 'rgba(255,255,255,0.1)' },
          beginAtZero: true,
        },
      },
      animation: {
        duration: 900,
        easing: 'easeOutQuart',
      },
    },
  });

  /* Patch canvas background for PDF screenshots */
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/* ── Timeline ── */
function renderTimeline(calculations, inputs) {
  var gain = calculations.uchMonthlyGain;
  var spend = inputs.adSpend;
  var baseRev = spend * parseFloat(calculations.currentROI);

  var m1Rev = Math.round(baseRev + (gain * 0.30));
  var m2Rev = Math.round(baseRev + (gain * 0.70));
  var m3Rev = Math.round(baseRev + (gain * 1.00));

  var m1El = document.getElementById('timeline-m1');
  var m2El = document.getElementById('timeline-m2');
  var m3El = document.getElementById('timeline-m3');

  if (m1El) m1El.textContent = 'Target: ' + formatBDT(m1Rev) + '/mo from ads';
  if (m2El) m2El.textContent = 'Target: ' + formatBDT(m2Rev) + '/mo from ads';
  if (m3El) m3El.textContent = 'Target: ' + formatBDT(m3Rev) + '/mo from ads';
}

/* ══════════════════════════════════════════════════════════
   SECTION 11: PDF GENERATION
══════════════════════════════════════════════════════════ */

function generatePDF(inputs, calculations, aiNarrative, leadData) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var pageW = 210;
  var pageH = 297;
  var margin = 20;
  var dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  var biz = inputs.businessName;
  var narrative = aiNarrative || generateFallbackNarrative(inputs, calculations);

  /* ─── Helper functions ─── */
  function addPage() { doc.addPage(); }

  function setFont(size, style, color) {
    doc.setFontSize(size || 11);
    doc.setFont('helvetica', style || 'normal');
    doc.setTextColor.apply(doc, color || [220, 220, 220]);
  }

  function drawRect(x, y, w, h, fillColor, strokeColor) {
    if (fillColor) {
      doc.setFillColor.apply(doc, fillColor);
      doc.rect(x, y, w, h, strokeColor ? 'FD' : 'F');
    }
    if (strokeColor) {
      doc.setDrawColor.apply(doc, strokeColor);
      doc.rect(x, y, w, h, 'S');
    }
  }

  function wrapText(text, x, y, maxW, lineH) {
    var lines = doc.splitTextToSize(String(text || ''), maxW);
    doc.text(lines, x, y);
    return y + (lines.length * lineH);
  }

  /* ─── PAGE 1: Cover ─── */
  /* Black background */
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, pageH, 'F');

  /* UCH Crosshair — centred at (105, 80) */
  var cx = 105, cy = 70, r1 = 28, r2 = 20;
  doc.setDrawColor(193, 18, 31);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r1, 'S');
  /* dashed inner circle via segments */
  doc.setLineDashPattern([2, 2], 0);
  doc.circle(cx, cy, r2, 'S');
  doc.setLineDashPattern([], 0);
  doc.line(cx - r1 - 4, cy, cx + r1 + 4, cy);
  doc.line(cx, cy - r1 - 4, cx, cy + r1 + 4);
  /* Diagonal cross lines */
  doc.setLineWidth(0.3);
  doc.setDrawColor(193, 18, 31, 0.35);
  doc.line(cx - r1 * 0.7, cy - r1 * 0.7, cx + r1 * 0.7, cy + r1 * 0.7);
  doc.line(cx + r1 * 0.7, cy - r1 * 0.7, cx - r1 * 0.7, cy + r1 * 0.7);
  /* Centre dot */
  doc.setLineWidth(0);
  doc.setFillColor(193, 18, 31);
  doc.circle(cx, cy, 3, 'F');
  doc.setFillColor(10, 10, 10);
  doc.circle(cx, cy, 1.2, 'F');

  /* Badge */
  doc.setFillColor(193, 18, 31);
  doc.rect(margin, 108, pageW - margin * 2, 0.8, 'F');

  /* Title */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('MARKETING ROI REPORT', pageW / 2, 120, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(193, 18, 31);
  doc.text('Prepared for: ' + biz, pageW / 2, 133, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  doc.text('Umbrella Corp HQ \u2014 umbrellacorphq.com', pageW / 2, 143, { align: 'center' });
  doc.text(dateStr, pageW / 2, 151, { align: 'center' });

  /* Efficiency score teaser */
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('Marketing Efficiency Score', pageW / 2, 168, { align: 'center' });
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.text(String(calculations.efficiencyScore), pageW / 2, 188, { align: 'center' });
  doc.setFontSize(18);
  doc.setTextColor(180, 180, 180);
  doc.text('/ 100', pageW / 2, 198, { align: 'center' });

  /* Red bottom strip */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, pageH - 18, pageW, 18, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('CONFIDENTIAL \u2014 Generated by Umbrella Corp HQ ROI Predictor Tool', pageW / 2, pageH - 7, { align: 'center' });

  /* ─── PAGE 2: Executive Summary ─── */
  addPage();
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageW, pageH, 'F');

  /* Header bar */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('UMBRELLA CORP HQ \u2014 MARKETING ROI REPORT', margin, 9);
  doc.text(biz.toUpperCase(), pageW - margin, 9, { align: 'right' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Executive Summary', margin, 30);

  /* AI Headline */
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bolditalic');
  doc.setTextColor(193, 18, 31);
  var headlineLines = doc.splitTextToSize('\u201C' + (narrative.headline || '') + '\u201D', pageW - margin * 2);
  doc.text(headlineLines, margin, 42);

  /* 4 metric boxes — 2×2 grid */
  var boxes = [
    { label: 'Current ROI',       value: calculations.currentROI + 'x',          sub: 'per \u09F3 spent' },
    { label: 'Industry Average',  value: calculations.industryAvgROI + 'x',       sub: 'BD benchmark' },
    { label: 'Projected with UCH',value: calculations.uchProjectedROI + 'x',      sub: 'projected ROI' },
    { label: 'Annual Opportunity',value: formatBDT(calculations.annualGain),       sub: 'potential gain' },
  ];
  var bxW = 80, bxH = 32, bxGap = 5;
  var bxStartX = margin;
  var bxStartY = 58;
  boxes.forEach(function(box, i) {
    var col = i % 2;
    var row = Math.floor(i / 2);
    var bx = bxStartX + col * (bxW + bxGap);
    var by = bxStartY + row * (bxH + bxGap);
    var bgCol = (i === 2) ? [193, 18, 31] : [25, 25, 25];
    drawRect(bx, by, bxW, bxH, bgCol, [60, 60, 60]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(box.label.toUpperCase(), bx + 5, by + 9);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(i === 2 ? 255 : 255, i === 2 ? 255 : 255, i === 2 ? 255 : 255);
    doc.text(box.value, bx + 5, by + 21);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(i === 2 ? 255 : 120, i === 2 ? 200 : 120, i === 2 ? 200 : 120);
    doc.text(box.sub, bx + 5, by + 28);
  });

  /* Separator */
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.5);
  doc.line(margin, 140, pageW - margin, 140);

  /* Input summary */
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Your Inputs', margin, 150);

  var summaryData = [
    ['Business', biz],
    ['Industry', inputs.industry.replace(/_/g, ' ')],
    ['Monthly Revenue', formatBDT(inputs.monthlyRevenue)],
    ['Monthly Ad Spend', formatBDT(inputs.adSpend)],
    ['Ad Experience', inputs.adExperience.replace(/_/g, ' ')],
    ['Primary Goal', inputs.goal.replace(/_/g, ' ')],
  ];
  var sy = 158;
  summaryData.forEach(function(row) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(row[0] + ':', margin, sy);
    doc.setTextColor(210, 210, 210);
    doc.text(row[1], margin + 45, sy);
    sy += 8;
  });

  /* Monthly leakage callout */
  doc.setFillColor(30, 10, 10);
  doc.setDrawColor(193, 18, 31);
  doc.setLineWidth(0.5);
  doc.rect(margin, sy + 4, pageW - margin * 2, 20, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('Estimated Monthly Revenue Leakage:', margin + 5, sy + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.setFontSize(13);
  doc.text(formatBDT(calculations.monthlyLeakage), pageW - margin - 5, sy + 14, { align: 'right' });

  /* Footer */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Page 2 of 5 \u2014 umbrellacorphq.com', pageW / 2, pageH - 5, { align: 'center' });

  /* ─── PAGE 3: Analysis ─── */
  addPage();
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageW, pageH, 'F');

  /* Header */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('UMBRELLA CORP HQ \u2014 MARKETING ROI REPORT', margin, 9);
  doc.text(biz.toUpperCase(), pageW - margin, 9, { align: 'right' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Analysis', margin, 30);

  /* Section: Where You Stand */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.text('WHERE YOU STAND', margin, 43);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  var y3 = wrapText(narrative.currentState, margin, 51, pageW - margin * 2, 5.5);

  /* Section: The Opportunity */
  y3 += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.text('THE OPPORTUNITY', margin, y3);
  y3 += 8;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  y3 = wrapText(narrative.opportunity, margin, y3, pageW - margin * 2, 5.5);

  /* Bar chart — 3 rectangles */
  y3 += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Revenue From Your Ad Spend', margin, y3);
  y3 += 6;

  var chartX = margin;
  var chartH_max = 40;
  var barW = 28;
  var barGap = 18;
  var chartBottomY = y3 + chartH_max;

  var currentRevC   = inputs.adSpend * parseFloat(calculations.currentROI);
  var industryRevC  = inputs.adSpend * calculations.industryAvgROI;
  var uchRevC       = inputs.adSpend * calculations.uchProjectedROI;
  var maxRevC = Math.max(currentRevC, industryRevC, uchRevC) || 1;

  var bars3 = [
    { label: 'Current',        val: currentRevC,  color: [58, 58, 58] },
    { label: 'Industry Avg',   val: industryRevC, color: [74, 107, 138] },
    { label: 'With UCH',       val: uchRevC,      color: [193, 18, 31] },
  ];

  bars3.forEach(function(bar, i) {
    var bh = Math.round((bar.val / maxRevC) * chartH_max);
    var bx = chartX + i * (barW + barGap);
    var by = chartBottomY - bh;
    doc.setFillColor.apply(doc, bar.color);
    doc.rect(bx, by, barW, bh, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(bar.label, bx + barW / 2, chartBottomY + 5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(220, 220, 220);
    doc.text(formatBDT(bar.val), bx + barW / 2, by - 2, { align: 'center' });
  });

  /* Footer */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Page 3 of 5 \u2014 umbrellacorphq.com', pageW / 2, pageH - 5, { align: 'center' });

  /* ─── PAGE 4: UCH Approach + Timeline ─── */
  addPage();
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageW, pageH, 'F');

  /* Header */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('UMBRELLA CORP HQ \u2014 MARKETING ROI REPORT', margin, 9);
  doc.text(biz.toUpperCase(), pageW - margin, 9, { align: 'right' });

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Strategy & Timeline', margin, 30);

  /* UCH Approach */
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.text('WHAT WE\u2019D DO', margin, 42);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  var y4 = wrapText(narrative.uchApproach, margin, 50, pageW - margin * 2, 5.5);

  /* Urgency */
  y4 += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 18, 31);
  doc.text('THE COST OF WAITING', margin, y4);
  y4 += 7;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  y4 = wrapText(narrative.urgency, margin, y4, pageW - margin * 2, 5.5);

  /* 90-Day Timeline */
  y4 += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Your 90-Day Growth Roadmap', margin, y4);
  y4 += 8;

  var gain4 = calculations.uchMonthlyGain;
  var baseRev4 = inputs.adSpend * parseFloat(calculations.currentROI);
  var phases = [
    { num: '01', month: 'Month 1', phase: 'Foundation',  desc: 'Audit, strategy, account setup & pixel installation', target: Math.round(baseRev4 + gain4 * 0.30) },
    { num: '02', month: 'Month 2', phase: 'Momentum',    desc: 'Campaign launch, creative testing & audience refinement', target: Math.round(baseRev4 + gain4 * 0.70) },
    { num: '03', month: 'Month 3', phase: 'Results',     desc: 'Scale winning campaigns & full performance reporting', target: Math.round(baseRev4 + gain4 * 1.00) },
  ];

  var tlW = (pageW - margin * 2 - 8) / 3;
  phases.forEach(function(ph, i) {
    var tx = margin + i * (tlW + 4);
    var isLast = i === phases.length - 1;
    var bgC = isLast ? [193, 18, 31] : [25, 25, 35];
    drawRect(tx, y4, tlW, 46, bgC, [50, 50, 70]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isLast ? 255 : 193, isLast ? 220 : 18, isLast ? 220 : 31);
    doc.text(ph.num, tx + 5, y4 + 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(ph.month + ' \u2014 ' + ph.phase, tx + 5, y4 + 21);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isLast ? 255 : 160, isLast ? 220 : 160, isLast ? 220 : 160);
    var descLines = doc.splitTextToSize(ph.desc, tlW - 10);
    doc.text(descLines, tx + 5, y4 + 29);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Target: ' + formatBDT(ph.target), tx + 5, y4 + 43);
  });

  /* Footer */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('Page 4 of 5 \u2014 umbrellacorphq.com', pageW / 2, pageH - 5, { align: 'center' });

  /* ─── PAGE 5: CTA ─── */
  addPage();
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, pageW, pageH, 'F');

  /* Header */
  doc.setFillColor(193, 18, 31);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('UMBRELLA CORP HQ \u2014 MARKETING ROI REPORT', margin, 9);
  doc.text(biz.toUpperCase(), pageW - margin, 9, { align: 'right' });

  /* Large CTA */
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Ready to Stop Leaving', pageW / 2, 55, { align: 'center' });
  doc.setTextColor(193, 18, 31);
  doc.text('Money Behind?', pageW / 2, 68, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  var ctaText = 'Book a free 30-minute strategy call. We\'ll walk through your numbers live and show you exactly what to do next.';
  var ctaLines = doc.splitTextToSize(ctaText, pageW - margin * 3);
  doc.text(ctaLines, pageW / 2, 82, { align: 'center' });

  /* Next steps boxes */
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Your Next Steps', margin, 110);

  var steps5 = [
    { num: '1', title: 'Book a Free Strategy Call',  desc: 'We\'ll review your ROI data live and map out a custom plan.' },
    { num: '2', title: 'Get a Custom Proposal',       desc: 'A tailored marketing strategy built specifically for ' + biz + '.' },
    { num: '3', title: 'Start Growing in 7 Days',     desc: 'We move fast. Most clients see results within the first 30 days.' },
  ];
  var sy5 = 118;
  steps5.forEach(function(step) {
    doc.setFillColor(20, 20, 20);
    doc.setDrawColor(50, 50, 50);
    doc.rect(margin, sy5, pageW - margin * 2, 22, 'FD');
    doc.setFillColor(193, 18, 31);
    doc.rect(margin, sy5, 8, 22, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(step.num, margin + 4, sy5 + 13, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(step.title, margin + 14, sy5 + 9);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(step.desc, margin + 14, sy5 + 17);
    sy5 += 27;
  });

  /* Contact details */
  doc.setFillColor(193, 18, 31);
  doc.rect(margin, sy5 + 5, pageW - margin * 2, 40, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Umbrella Corp HQ', pageW / 2, sy5 + 16, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('umbrellacorphq.com', pageW / 2, sy5 + 24, { align: 'center' });
  doc.text('Dhaka, Bangladesh', pageW / 2, sy5 + 31, { align: 'center' });
  doc.text('hello@umbrellacorphq.com', pageW / 2, sy5 + 38, { align: 'center' });

  /* Footer */
  doc.setFillColor(5, 5, 5);
  doc.rect(0, pageH - 14, pageW, 14, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Page 5 of 5 \u2014 Generated ' + dateStr + ' \u2014 Confidential', pageW / 2, pageH - 5, { align: 'center' });

  /* Save */
  var safeName = biz.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  var safeDate = new Date().toISOString().slice(0, 10);
  doc.save('UCH-ROI-Report-' + safeName + '-' + safeDate + '.pdf');

  /* Mark report as downloaded */
  try {
    var leads = JSON.parse(localStorage.getItem('uch_leads') || '[]');
    if (leads.length > 0) {
      leads[leads.length - 1].reportDownloaded = true;
      localStorage.setItem('uch_leads', JSON.stringify(leads));
    }
  } catch (e) { /* ignore */ }
}

/* ══════════════════════════════════════════════════════════
   SECTION 12: SHARE
══════════════════════════════════════════════════════════ */

function shareScore(calculations, inputs) {
  var score = calculations.efficiencyScore;
  var message =
    'I just scored ' + score + '/100 on the UCH Marketing ROI tool \ud83c\udfaf\n\n' +
    'Check your score: https://umbrellacorphq.com/tools/roi-predictor.html';
  window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
}

/* ══════════════════════════════════════════════════════════
   SECTION 13: MAIN HANDLER
══════════════════════════════════════════════════════════ */

async function handleCalculate(e) {
  e.preventDefault();

  if (!validateForm()) {
    var firstError = document.querySelector('.field-error:not(:empty)');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  var inputs = getFormInputs();
  var calculations = calculateROI(inputs);

  state.inputs = inputs;
  state.calculations = calculations;

  /* Hide previous results */
  var prevSec = document.getElementById('preview-section');
  var resSec  = document.getElementById('results-section');
  if (prevSec) prevSec.style.display = 'none';
  if (resSec)  resSec.style.display  = 'none';

  showLoadingState();

  var aiNarrative;
  try {
    aiNarrative = await generateAINarrative(inputs, calculations);
    aiNarrative.isFallback = false;
  } catch (err) {
    console.warn('[UCH] AI narrative failed, using fallback:', err);
    aiNarrative = generateFallbackNarrative(inputs, calculations);
  }

  state.aiNarrative = aiNarrative;

  hideLoadingState();

  setTimeout(function() {
    renderPreview(calculations, aiNarrative.headline);
  }, 350);
}

/* ══════════════════════════════════════════════════════════
   SECTION 14: INIT
══════════════════════════════════════════════════════════ */

function init() {
  buildIndustryDropdown();
  initSliders();

  /* Form submit */
  var form = document.getElementById('roi-form');
  if (form) form.addEventListener('submit', handleCalculate);

  /* Unlock button → open modal */
  var unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) unlockBtn.addEventListener('click', openLeadModal);

  /* Modal close button */
  var modalClose = document.getElementById('lead-modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLeadModal);

  /* Overlay click to close (not modal card) */
  var overlay = document.getElementById('lead-modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeLeadModal();
    });
  }

  /* Escape key to close modal */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLeadModal();
  });

  /* Lead form submit */
  var leadForm = document.getElementById('lead-form');
  if (leadForm) leadForm.addEventListener('submit', submitLead);

  /* PDF button */
  var btnPDF = document.getElementById('btn-pdf');
  if (btnPDF) {
    btnPDF.addEventListener('click', function() {
      if (state.inputs && state.calculations) {
        generatePDF(state.inputs, state.calculations, state.aiNarrative, state.leadData);
      }
    });
  }

  /* Share button */
  var btnShare = document.getElementById('btn-share');
  if (btnShare) {
    btnShare.addEventListener('click', function() {
      if (state.calculations && state.inputs) {
        shareScore(state.calculations, state.inputs);
      }
    });
  }

  /* Restore revenue slider display on load */
  var revSlider = document.getElementById('revenue-slider');
  var revDisplay = document.getElementById('revenue-display');
  if (revSlider && revDisplay) {
    revDisplay.textContent = formatBDT(parseInt(revSlider.value, 10));
  }
  var spendSlider = document.getElementById('spend-slider');
  var spendDisplay = document.getElementById('spend-display');
  if (spendSlider && spendDisplay) {
    spendDisplay.textContent = formatBDT(parseInt(spendSlider.value, 10));
  }
}

/* ── Boot ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
