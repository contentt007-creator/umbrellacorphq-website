/**
 * freelancers/js/showcase.js
 * Public freelancer showcase page logic.
 *
 * Desktop  : beautiful portrait-card grid with hover reveal
 * Mobile   : Tinder-style swipe deck (< 640px)
 */

import { getApprovedFreelancers, TIERS, timeAgo, formatBDT } from '../../js/firebase.js';

// ─── State ────────────────────────────────────────────────────────────────────

let allFreelancers = [];
let activeFilters  = { talentType: 'all', skill: 'all', tier: 'all', avail: 'all' };

// Swipe state
let swipeList  = [];
let swipeIndex = 0;
let swipeHistory = [];   // for undo

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const grid         = document.getElementById('fl-grid');
const loading      = document.getElementById('fl-loading');
const empty        = document.getElementById('fl-empty');
const statTotal    = document.getElementById('fl-stat-total');
const statJobs     = document.getElementById('fl-stat-jobs');
const swipeSection = document.getElementById('fl-swipe-section');
const swipeStage   = document.getElementById('fl-swipe-stage');
const swipeCounter = document.getElementById('fl-swipe-counter');
const swipeSkipBtn = document.getElementById('fl-swipe-skip');
const swipeViewBtn = document.getElementById('fl-swipe-view');
const swipeBackBtn = document.getElementById('fl-swipe-back');

const modal         = document.getElementById('portfolio-modal');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');
const modalName     = document.getElementById('modal-name');
const modalSpec     = document.getElementById('modal-spec');
const modalSkills   = document.getElementById('modal-skills');
const modalAvatar   = document.getElementById('modal-avatar');
const modalPortfolio = document.getElementById('modal-portfolio');
const lightbox      = document.getElementById('lightbox');
const lightboxImg   = document.getElementById('lightbox-img');
const lightboxClose = document.getElementById('lightbox-close');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMobile() { return window.innerWidth < 640; }

function skillsLower(skills) { return (skills || []).map(s => s.toLowerCase()); }

function renderStars(rating) {
  if (!rating && rating !== 0) return '';
  const r     = Math.max(0, Math.min(5, rating));
  const full  = Math.floor(r);
  const half  = r - full >= 0.5 ? 1 : 0;
  const emp   = 5 - full - half;
  let html = '';
  for (let i = 0; i < full; i++) html += '<span class="fl-star--full">&#9733;</span>';
  if (half)                       html += '<span class="fl-star--half">&#189;</span>';
  for (let i = 0; i < emp;  i++) html += '<span class="fl-star--empty">&#9734;</span>';
  return `<span class="fl-stars" aria-label="${r.toFixed(1)} out of 5">${html}</span>`;
}

function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function applyFilters(list) {
  return list.filter(fl => {
    if (activeFilters.talentType !== 'all') {
      const t = (fl.talentType || fl.specialisation || '').toLowerCase();
      if (!t.includes(activeFilters.talentType.toLowerCase())) return false;
    }
    if (activeFilters.skill !== 'all') {
      const needle   = activeFilters.skill.toLowerCase();
      const haystack = skillsLower(fl.skills || fl.eventTypes || []);
      if (!haystack.some(s => s.includes(needle))) return false;
    }
    if (activeFilters.tier !== 'all') {
      if ((fl.tier || 'bronze').toLowerCase() !== activeFilters.tier) return false;
    }
    if (activeFilters.avail === 'available') {
      if (fl.availableForWork !== true) return false;
    }
    return true;
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function updateStats(list) {
  const totalJobs = list.reduce((s, f) => s + (f.completedJobs || 0), 0);
  if (statTotal) statTotal.textContent = list.length > 0 ? `${list.length}+` : '0';
  if (statJobs)  statJobs.textContent  = totalJobs > 0   ? `${totalJobs}+`   : '0';
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP GRID
// ─────────────────────────────────────────────────────────────────────────────

function renderCard(fl) {
  const tier      = (fl.tier || 'bronze').toLowerCase();
  const tierInfo  = TIERS[tier] || TIERS.bronze;
  const isAvail   = fl.availableForWork === true;
  const events    = fl.skills || fl.eventTypes || [];
  const photoUrl  = fl.profilePhoto || fl.photoUrl || '';
  const initials  = getInitials(fl.fullName);
  const rating    = typeof fl.rating === 'number' ? fl.rating : 0;
  const jobs      = typeof fl.completedJobs === 'number' ? fl.completedJobs : 0;
  const talent    = fl.talentType || fl.specialisation || '';
  const isPhoto   = talent.toLowerCase().includes('photo');
  const typeIcon  = isPhoto ? '📷' : '🎬';

  return `
    <div class="fl-card"
         data-skills="${skillsLower(events).join(',')}"
         data-talenttype="${talent.toLowerCase()}"
         data-tier="${tier}"
         data-available="${isAvail}">

      <div class="fl-card-photo">
        <div class="fl-card-initials-bg">${initials}</div>
        ${photoUrl ? `<img src="${photoUrl}" alt="${fl.fullName || 'Talent'}" loading="lazy" onerror="this.style.opacity='0'">` : ''}
      </div>

      <div class="fl-card-badges">
        <span class="fl-tier-badge fl-tier-${tier}">${tierInfo.label}</span>
        ${isAvail ? '<span class="fl-avail-dot" title="Available now"></span>' : ''}
      </div>

      <div class="fl-card-overlay">
        <div class="fl-card-info">
          ${rating > 0 ? `<div class="fl-card-rating">${renderStars(rating)}</div>` : ''}
          <h3 class="fl-card-name">${fl.fullName || 'Unnamed'}</h3>
          <p class="fl-card-spec">${typeIcon} ${talent}</p>
          <div class="fl-card-skills">
            ${events.slice(0, 3).map(s => `<span class="fl-skill-tag">${s}</span>`).join('')}
          </div>
          ${jobs > 0 ? `<p class="fl-card-jobs">${jobs} shoot${jobs !== 1 ? 's' : ''} completed</p>` : ''}
          <button class="fl-card-cta" data-uid="${fl.uid}">View Portfolio →</button>
        </div>
      </div>
    </div>
  `.trim();
}

function renderGrid(filtered) {
  if (!grid) return;
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = filtered.map(renderCard).join('');

  grid.querySelectorAll('.fl-card-cta').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const fl = allFreelancers.find(f => f.uid === btn.dataset.uid);
      if (fl) openModal(fl);
    });
  });

  // Also make whole card clickable
  grid.querySelectorAll('.fl-card').forEach(card => {
    card.addEventListener('click', () => {
      const cta = card.querySelector('.fl-card-cta');
      if (cta) {
        const fl = allFreelancers.find(f => f.uid === cta.dataset.uid);
        if (fl) openModal(fl);
      }
    });
  });

  if (window.gsap) {
    gsap.from('.fl-card', { opacity: 0, y: 30, stagger: 0.06, duration: 0.5, ease: 'power2.out' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE SWIPE DECK
// ─────────────────────────────────────────────────────────────────────────────

function buildSwipeCard(fl, stackPos) {
  const tier     = (fl.tier || 'bronze').toLowerCase();
  const tierInfo = TIERS[tier] || TIERS.bronze;
  const isAvail  = fl.availableForWork === true;
  const photoUrl = fl.profilePhoto || fl.photoUrl || '';
  const initials = getInitials(fl.fullName);
  const talent   = fl.talentType || fl.specialisation || '';
  const events   = (fl.skills || fl.eventTypes || []).slice(0, 3);
  const isPhoto  = talent.toLowerCase().includes('photo');
  const typeIcon = isPhoto ? '📷' : '🎬';

  const card = document.createElement('div');
  card.className  = 'fl-swipe-card';
  card.dataset.uid = fl.uid;
  card.dataset.pos  = stackPos;

  // Stack visuals: cards behind are scaled down and shifted
  const scale = 1 - stackPos * 0.045;
  const ty    = stackPos * 12;
  const rot   = stackPos === 1 ? -1.5 : stackPos === 2 ? 1.5 : 0;
  card.style.cssText = `
    transform: scale(${scale}) translateY(${ty}px) rotate(${rot}deg);
    z-index:   ${20 - stackPos};
    opacity:   ${stackPos > 2 ? 0 : 1};
    pointer-events: ${stackPos === 0 ? 'auto' : 'none'};
    transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275),
                opacity 0.3s ease;
  `;

  card.innerHTML = `
    <div class="fl-swipe-card-photo">
      <div class="fl-swipe-card-initials">${initials}</div>
      ${photoUrl ? `<img src="${photoUrl}" alt="${fl.fullName}" onerror="this.style.opacity='0'">` : ''}
    </div>
    <div class="fl-swipe-card-badges">
      <span class="fl-tier-badge fl-tier-${tier}">${tierInfo.label}</span>
      ${isAvail ? '<span class="fl-avail-dot"></span>' : ''}
    </div>
    <div class="fl-swipe-card-overlay">
      <h3 class="fl-swipe-card-name">${fl.fullName || 'Unnamed'}</h3>
      <p class="fl-swipe-card-spec">${typeIcon} ${talent}</p>
      <div class="fl-swipe-card-skills">
        ${events.map(s => `<span>${s}</span>`).join('')}
      </div>
    </div>
    <div class="fl-swipe-nope">SKIP</div>
    <div class="fl-swipe-like">VIEW</div>
  `;
  return card;
}

function renderSwipeDeck() {
  if (!swipeStage) return;
  swipeStage.innerHTML = '';

  const list = swipeList;

  if (list.length === 0 || swipeIndex >= list.length) {
    swipeStage.innerHTML = `
      <div class="fl-swipe-empty">
        <p>You've seen all ${list.length} talent${list.length !== 1 ? 's' : ''}!</p>
        <p style="font-size:13px;margin-top:8px;color:rgba(255,255,255,0.3)">Adjust filters or check back soon.</p>
      </div>`;
    if (swipeCounter) swipeCounter.textContent = `${list.length} / ${list.length}`;
    return;
  }

  // Render up to 3 cards in the stack (back to front)
  for (let i = Math.min(swipeIndex + 2, list.length - 1); i >= swipeIndex; i--) {
    const pos  = i - swipeIndex;
    const card = buildSwipeCard(list[i], pos);
    swipeStage.appendChild(card);
  }

  if (swipeCounter) swipeCounter.textContent = `${swipeIndex + 1} / ${list.length}`;

  // Wire touch + mouse events on the top card
  const topCard = swipeStage.querySelector('[data-pos="0"]');
  if (topCard) attachSwipeEvents(topCard);
}

function attachSwipeEvents(card) {
  let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  const likeEl = card.querySelector('.fl-swipe-like');
  const nopeEl = card.querySelector('.fl-swipe-nope');

  function onStart(e) {
    dragging = true;
    card.style.transition = 'none';
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
  }

  function onMove(e) {
    if (!dragging) return;
    if (e.cancelable) e.preventDefault();
    const p = e.touches ? e.touches[0] : e;
    dx = p.clientX - startX;
    dy = p.clientY - startY;

    const rot = dx * 0.08;
    card.style.transform = `translateX(${dx}px) translateY(${dy * 0.25}px) rotate(${rot}deg)`;

    const progress = Math.abs(dx) / 80;
    if (dx > 20) {
      if (likeEl) likeEl.style.opacity = Math.min(1, progress - 0.25);
      if (nopeEl) nopeEl.style.opacity = 0;
    } else if (dx < -20) {
      if (nopeEl) nopeEl.style.opacity = Math.min(1, progress - 0.25);
      if (likeEl) likeEl.style.opacity = 0;
    } else {
      if (likeEl) likeEl.style.opacity = 0;
      if (nopeEl) nopeEl.style.opacity = 0;
    }
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    card.style.transition = 'transform 0.45s cubic-bezier(0.175,0.885,0.32,1.275)';

    const THRESHOLD = 90;
    if (dx > THRESHOLD) {
      flyOut(card, 'right', () => {
        const fl = allFreelancers.find(f => f.uid === card.dataset.uid);
        if (fl) openModal(fl);
        advance();
      });
    } else if (dx < -THRESHOLD) {
      flyOut(card, 'left', () => advance());
    } else {
      // Snap back
      card.style.transform = 'translateX(0) translateY(0) rotate(0)';
      if (likeEl) likeEl.style.opacity = 0;
      if (nopeEl) nopeEl.style.opacity = 0;
    }
    dx = 0; dy = 0;
  }

  // Touch
  card.addEventListener('touchstart', onStart, { passive: true });
  card.addEventListener('touchmove',  onMove,  { passive: false });
  card.addEventListener('touchend',   onEnd);

  // Mouse (desktop testing)
  card.addEventListener('mousedown', onStart);
  const mmove = e => { if (dragging) onMove(e); };
  const mup   = () => { if (dragging) onEnd(); };
  document.addEventListener('mousemove', mmove);
  document.addEventListener('mouseup',   mup);
  // Clean up mouse listeners when card is removed
  card._cleanup = () => {
    document.removeEventListener('mousemove', mmove);
    document.removeEventListener('mouseup',   mup);
  };
}

function flyOut(card, dir, callback) {
  const x   = dir === 'right' ? '130vw' : '-130vw';
  const rot = dir === 'right' ? '30deg' : '-30deg';
  card.style.transition = 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease';
  card.style.transform  = `translateX(${x}) rotate(${rot})`;
  card.style.opacity    = '0';
  if (card._cleanup) card._cleanup();
  setTimeout(callback, 380);
}

function advance() {
  swipeHistory.push(swipeIndex);
  swipeIndex++;
  renderSwipeDeck();
}

function goBack() {
  if (swipeHistory.length === 0) return;
  swipeIndex = swipeHistory.pop();
  renderSwipeDeck();
}

// Button wiring
if (swipeSkipBtn) swipeSkipBtn.addEventListener('click', () => {
  const top = swipeStage?.querySelector('[data-pos="0"]');
  if (!top) return;
  flyOut(top, 'left', () => advance());
});

if (swipeViewBtn) swipeViewBtn.addEventListener('click', () => {
  const top = swipeStage?.querySelector('[data-pos="0"]');
  if (!top) return;
  const fl = allFreelancers.find(f => f.uid === top.dataset.uid);
  flyOut(top, 'right', () => {
    if (fl) openModal(fl);
    advance();
  });
});

if (swipeBackBtn) swipeBackBtn.addEventListener('click', () => goBack());

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openModal(fl) {
  modalName.textContent = fl.fullName || 'Unnamed';
  modalSpec.textContent = fl.specialisation || fl.talentType || '';

  modalSkills.innerHTML = (fl.skills || [])
    .map(s => `<span class="fl-modal-skill-tag">${s}</span>`).join('');

  const avatarSrc = fl.profilePhoto || fl.photoUrl || '';
  const inits     = getInitials(fl.fullName);
  modalAvatar.innerHTML = `
    <span class="fl-modal-avatar-initials">${inits}</span>
    ${avatarSrc ? `<img src="${avatarSrc}" alt="${fl.fullName || ''}" onerror="this.style.opacity='0'">` : ''}
  `;

  const items = (fl.portfolioItems || []).filter(item => item.approved === true);

  if (items.length === 0) {
    modalPortfolio.innerHTML = `<p class="fl-modal-no-portfolio">No portfolio items available yet.</p>`;
  } else {
    modalPortfolio.innerHTML = items.map(item => {
      const thumb    = item.thumbnail || item.thumbnailUrl || item.imageUrl || item.storageUrl || '';
      const toolTags = (item.tools || []).map(t => `<span class="fl-portfolio-tool">${t}</span>`).join('');
      return `
        <div class="fl-portfolio-item">
          <div class="fl-portfolio-thumb" data-fullimg="${item.imageUrl || item.storageUrl || thumb}">
            ${thumb
              ? `<img src="${thumb}" alt="${item.title || ''}" loading="lazy" onerror="this.parentElement.classList.add('fl-portfolio-thumb--no-img')">`
              : `<div class="fl-portfolio-thumb--no-img"></div>`}
            <div class="fl-portfolio-overlay"><span class="fl-portfolio-zoom">&#9906;</span></div>
          </div>
          <div class="fl-portfolio-meta">
            <p class="fl-portfolio-title">${item.title || 'Untitled'}</p>
            ${item.category ? `<p class="fl-portfolio-cat">${item.category}</p>` : ''}
            ${toolTags ? `<div class="fl-portfolio-tools">${toolTags}</div>` : ''}
          </div>
        </div>`.trim();
    }).join('');

    modalPortfolio.querySelectorAll('.fl-portfolio-thumb').forEach(t => {
      t.addEventListener('click', () => {
        const src = t.dataset.fullimg;
        if (src) openLightbox(src);
      });
    });
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  if (window.gsap) {
    gsap.fromTo('.fl-modal-inner', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  }
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function openLightbox(src) {
  lightboxImg.src        = src;
  lightbox.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (window.gsap) gsap.fromTo('#lightbox', { opacity: 0 }, { opacity: 1, duration: 0.25 });
}

function closeLightbox() {
  lightbox.style.display = 'none';
  lightboxImg.src = '';
  if (!modal || modal.style.display === 'none') document.body.style.overflow = '';
}

// ─── Event wiring ─────────────────────────────────────────────────────────────

function initEvents() {
  if (modalClose)   modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (lightbox?.style.display !== 'none') closeLightbox();
    else if (modal?.style.display !== 'none') closeModal();
  });
}

function initFilterTabs() {
  document.querySelectorAll('.fl-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const type  = tab.dataset.filter;
      const value = tab.dataset.value;
      document.querySelectorAll(`.fl-filter-tab[data-filter="${type}"]`)
        .forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilters[type] = value;

      const filtered = applyFilters(allFreelancers);
      if (isMobile()) {
        swipeList  = filtered;
        swipeIndex = 0;
        swipeHistory = [];
        renderSwipeDeck();
      } else {
        renderGrid(filtered);
      }
    });
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function init() {
  initFilterTabs();
  initEvents();

  try {
    allFreelancers = await getApprovedFreelancers();
    console.log('[UCH] Loaded', allFreelancers.length, 'freelancer(s)');
  } catch (err) {
    console.error('[showcase] Failed to load freelancers:', err);
    allFreelancers = [];
  }

  if (loading) loading.style.display = 'none';
  updateStats(allFreelancers);

  const filtered = applyFilters(allFreelancers);

  if (isMobile()) {
    // Mobile: swipe deck
    swipeList  = filtered;
    swipeIndex = 0;
    renderSwipeDeck();
  } else {
    // Desktop: grid
    renderGrid(filtered);
  }

  // Re-render on significant resize
  let lastMobile = isMobile();
  window.addEventListener('resize', () => {
    const nowMobile = isMobile();
    if (nowMobile === lastMobile) return;
    lastMobile = nowMobile;
    const f = applyFilters(allFreelancers);
    if (nowMobile) {
      swipeList  = f;
      swipeIndex = 0;
      swipeHistory = [];
      renderSwipeDeck();
    } else {
      renderGrid(f);
    }
  });
}

init();
