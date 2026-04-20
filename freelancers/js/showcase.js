/**
 * freelancers/js/showcase.js
 * Public freelancer showcase page logic.
 * ES Module — imports from the shared Firebase utility layer.
 */

import { getApprovedFreelancers, TIERS, timeAgo, formatBDT } from '../../js/firebase.js';

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let allFreelancers = [];   // full list fetched from Firestore
let activeFilters  = {
  talentType: 'all',
  skill:      'all',
  tier:       'all',
  avail:      'all',
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM references
// ─────────────────────────────────────────────────────────────────────────────

const grid        = document.getElementById('fl-grid');
const loading     = document.getElementById('fl-loading');
const empty       = document.getElementById('fl-empty');
const statTotal   = document.getElementById('fl-stat-total');
const statJobs    = document.getElementById('fl-stat-jobs');

const modal        = document.getElementById('portfolio-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose   = document.getElementById('modal-close');
const modalName    = document.getElementById('modal-name');
const modalSpec    = document.getElementById('modal-spec');
const modalSkills  = document.getElementById('modal-skills');
const modalAvatar  = document.getElementById('modal-avatar');
const modalPortfolio = document.getElementById('modal-portfolio');

const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render star rating string for a numeric rating (0–5).
 * Full stars, half-star, empty stars using unicode characters.
 */
function renderStars(rating) {
  if (!rating && rating !== 0) return '';
  const r      = Math.max(0, Math.min(5, rating));
  const full   = Math.floor(r);
  const half   = r - full >= 0.5 ? 1 : 0;
  const empty  = 5 - full - half;
  let html = '';
  for (let i = 0; i < full;  i++) html += '<span class="fl-star fl-star--full">&#9733;</span>';
  if (half)                        html += '<span class="fl-star fl-star--half">&#189;</span>';
  for (let i = 0; i < empty; i++) html += '<span class="fl-star fl-star--empty">&#9734;</span>';
  return `<span class="fl-stars" aria-label="${r.toFixed(1)} out of 5">${html}</span>`;
}

/**
 * Normalise a skills array to lowercase for filter matching.
 */
function skillsLower(skills) {
  return (skills || []).map(s => s.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Card rendering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the HTML string for a single freelancer card.
 * @param {object} fl — Firestore freelancer document
 * @returns {string} HTML
 */
function renderCard(fl) {
  const tier        = (fl.tier || 'bronze').toLowerCase();
  const tierInfo    = TIERS[tier] || TIERS.bronze;
  const isAvail     = fl.availableForWork === true;
  const eventTypes  = fl.skills || fl.eventTypes || [];
  const visEvents   = eventTypes.slice(0, 3);
  const photoUrl    = fl.photoUrl || '';
  const rating      = typeof fl.rating === 'number' ? fl.rating : 0;
  const jobs        = typeof fl.completedJobs === 'number' ? fl.completedJobs : 0;
  const talentType  = fl.talentType || fl.specialisation || '';

  // Talent type icon
  const isPhoto  = talentType.toLowerCase().includes('photo');
  const typeIcon = isPhoto
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:11px;height:11px"><circle cx="12" cy="13" r="4"/><path d="M5 7h2l2-3h6l2 3h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:11px;height:11px"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M22 8l-6 4 6 4V8z"/></svg>';

  const availDot = isAvail
    ? '<span class="fl-avail-dot" title="Available for work"></span>'
    : '';

  const eventTags = visEvents
    .map(s => `<span class="fl-skill-tag">${s}</span>`)
    .join('');

  return `
    <div class="fl-card"
         data-skills="${skillsLower(eventTypes).join(',')}"
         data-talenttype="${talentType.toLowerCase()}"
         data-tier="${tier}"
         data-available="${isAvail}">
      <div class="fl-card-photo">
        <img
          src="${photoUrl}"
          alt="${fl.fullName || 'Talent'}"
          loading="lazy"
          onerror="this.src='assets/icons/favicon.svg'">
        <span class="fl-tier-badge fl-tier-${tier}">${tierInfo.label}</span>
        ${availDot}
      </div>
      <div class="fl-card-body">
        <h3 class="fl-card-name">${fl.fullName || 'Unnamed'}</h3>
        <p class="fl-card-spec">${typeIcon} ${talentType}</p>
        <div class="fl-card-rating">${renderStars(rating)}</div>
        <div class="fl-card-skills">${eventTags}</div>
        <p class="fl-card-jobs">${jobs} shoot${jobs !== 1 ? 's' : ''} completed</p>
        <button class="fl-card-cta" data-uid="${fl.uid}">View Portfolio &rarr;</button>
      </div>
    </div>
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────────────────────

function applyFilters(list) {
  return list.filter(fl => {
    // Talent type filter (Photographer / Cinematographer)
    if (activeFilters.talentType !== 'all') {
      const flType = (fl.talentType || fl.specialisation || '').toLowerCase();
      if (!flType.includes(activeFilters.talentType.toLowerCase())) return false;
    }
    // Event type / skill filter
    if (activeFilters.skill !== 'all') {
      const needle   = activeFilters.skill.toLowerCase();
      const haystack = skillsLower(fl.skills || fl.eventTypes || []);
      if (!haystack.some(s => s.includes(needle))) return false;
    }
    // Tier filter
    if (activeFilters.tier !== 'all') {
      if ((fl.tier || 'bronze').toLowerCase() !== activeFilters.tier) return false;
    }
    // Availability filter
    if (activeFilters.avail === 'available') {
      if (fl.availableForWork !== true) return false;
    }
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Render grid
// ─────────────────────────────────────────────────────────────────────────────

function renderGrid(filtered) {
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(renderCard).join('');

  // Attach "View Portfolio" listeners
  grid.querySelectorAll('.fl-card-cta').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const fl  = allFreelancers.find(f => f.uid === uid);
      if (fl) openModal(fl);
    });
  });

  // Stagger animation via GSAP (available globally via CDN)
  if (window.gsap) {
    gsap.from('.fl-card', {
      opacity:  0,
      y:        20,
      stagger:  0.05,
      duration: 0.3,
      ease:     'power2.out',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter tab interaction
// ─────────────────────────────────────────────────────────────────────────────

function initFilterTabs() {
  document.querySelectorAll('.fl-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const filterType = tab.dataset.filter;   // 'skill' | 'tier' | 'avail'
      const value      = tab.dataset.value;

      // Update active state for this filter group
      document.querySelectorAll(`.fl-filter-tab[data-filter="${filterType}"]`)
        .forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active filter state
      activeFilters[filterType] = value;

      // Re-render
      renderGrid(applyFilters(allFreelancers));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats update
// ─────────────────────────────────────────────────────────────────────────────

function updateStats(freelancers) {
  const total     = freelancers.length;
  const totalJobs = freelancers.reduce((sum, fl) => sum + (fl.completedJobs || 0), 0);

  if (statTotal) statTotal.textContent = total > 0 ? `${total}+` : '0';
  if (statJobs)  statJobs.textContent  = totalJobs > 0 ? `${totalJobs}+` : '0';
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio modal
// ─────────────────────────────────────────────────────────────────────────────

function openModal(fl) {
  // Populate header
  modalName.textContent  = fl.fullName || 'Unnamed';
  modalSpec.textContent  = fl.specialisation || '';

  // Skills
  const skills = fl.skills || [];
  modalSkills.innerHTML  = skills
    .map(s => `<span class="fl-modal-skill-tag">${s}</span>`)
    .join('');

  // Avatar
  if (fl.photoUrl) {
    modalAvatar.innerHTML = `<img src="${fl.photoUrl}" alt="${fl.fullName || ''}" onerror="this.src='assets/icons/favicon.svg'">`;
  } else {
    const initials = (fl.fullName || 'U')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    modalAvatar.innerHTML = `<span class="fl-modal-avatar-initials">${initials}</span>`;
  }

  // Portfolio items — only approved ones
  const items = (fl.portfolioItems || []).filter(item => item.approved === true);

  if (items.length === 0) {
    modalPortfolio.innerHTML = `
      <p class="fl-modal-no-portfolio">No portfolio items available yet.</p>
    `;
  } else {
    modalPortfolio.innerHTML = items.map(item => {
      const toolTags = (item.tools || [])
        .map(t => `<span class="fl-portfolio-tool">${t}</span>`)
        .join('');

      const thumb = item.thumbnailUrl || item.imageUrl || '';

      return `
        <div class="fl-portfolio-item">
          <div class="fl-portfolio-thumb" data-fullimg="${item.imageUrl || thumb}">
            ${thumb
              ? `<img src="${thumb}" alt="${item.title || 'Portfolio item'}" loading="lazy" onerror="this.parentElement.classList.add('fl-portfolio-thumb--no-img')">`
              : `<div class="fl-portfolio-thumb--no-img"></div>`
            }
            <div class="fl-portfolio-overlay">
              <span class="fl-portfolio-zoom">&#9906;</span>
            </div>
          </div>
          <div class="fl-portfolio-meta">
            <p class="fl-portfolio-title">${item.title || 'Untitled'}</p>
            ${item.category ? `<p class="fl-portfolio-cat">${item.category}</p>` : ''}
            ${toolTags ? `<div class="fl-portfolio-tools">${toolTags}</div>` : ''}
          </div>
        </div>
      `.trim();
    }).join('');

    // Attach lightbox listeners
    modalPortfolio.querySelectorAll('.fl-portfolio-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const src = thumb.dataset.fullimg;
        if (src) openLightbox(src);
      });
    });
  }

  // Show modal
  modal.style.display  = 'flex';
  document.body.style.overflow = 'hidden';

  // Animate in
  if (window.gsap) {
    gsap.fromTo('.fl-modal-inner', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }
}

function closeModal() {
  modal.style.display          = 'none';
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────

function openLightbox(src) {
  lightboxImg.src           = src;
  lightbox.style.display    = 'flex';
  document.body.style.overflow = 'hidden';

  if (window.gsap) {
    gsap.fromTo('#lightbox', { opacity: 0 }, { opacity: 1, duration: 0.25 });
  }
}

function closeLightbox() {
  lightbox.style.display       = 'none';
  lightboxImg.src              = '';
  // Only restore scroll if modal is also closed
  if (!modal || modal.style.display === 'none') {
    document.body.style.overflow = '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event wiring
// ─────────────────────────────────────────────────────────────────────────────

function initEvents() {
  // Modal close button
  if (modalClose)   modalClose.addEventListener('click',   closeModal);
  // Modal overlay click
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

  // Lightbox close button
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  // Lightbox overlay click (click outside image)
  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target === lightboxImg) return;
      closeLightbox();
    });
  }

  // Keyboard: Escape closes lightbox first, then modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (lightbox && lightbox.style.display !== 'none') {
      closeLightbox();
    } else if (modal && modal.style.display !== 'none') {
      closeModal();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  initFilterTabs();
  initEvents();

  try {
    allFreelancers = await getApprovedFreelancers();
  } catch (err) {
    console.error('[showcase] Failed to load freelancers:', err);
    allFreelancers = [];
  }

  // Hide spinner
  if (loading) loading.style.display = 'none';

  // Update stats counters
  updateStats(allFreelancers);

  // Render initial grid (no filters applied yet)
  renderGrid(applyFilters(allFreelancers));
}

init();
