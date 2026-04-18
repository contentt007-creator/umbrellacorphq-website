/**
 * Umbrella Corp HQ — Custom Cursor
 * Red dot + lagging ring with magnetic attraction.
 * Transform-only movement (GPU composited layer).
 *
 * NOTE: No JS device detection — Windows 10/11 reports maxTouchPoints > 0
 * even on pure desktop PCs. CSS @media (pointer: coarse) handles hiding.
 */

(function () {
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = -999, mouseY = -999;
  let ringX  = -999, ringY  = -999;
  const LERP = 0.14;

  // ─── Magnetic Config ────────────────────────────────────────
  const MAGNET_RADIUS   = 90;   // px — detection zone radius
  const MAGNET_STRENGTH = 0.42; // 0–1 pull factor
  const MAGNET_SEL      = '.btn-primary,.btn-secondary,.nav-cta,.hamburger,.filter-tab';

  let magnetOffX = 0;
  let magnetOffY = 0;

  function computeMagnet(mx, my) {
    const candidates = document.querySelectorAll(MAGNET_SEL);
    let nearestDist = MAGNET_RADIUS;
    let ox = 0, oy = 0;

    candidates.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dist = Math.hypot(mx - cx, my - cy);

      if (dist < nearestDist) {
        nearestDist = dist;
        const pull = (1 - dist / MAGNET_RADIUS) * MAGNET_STRENGTH;
        ox = (cx - mx) * pull;
        oy = (cy - my) * pull;
      }
    });

    magnetOffX = ox;
    magnetOffY = oy;
  }

  // ─── Positioning helper ──────────────────────────────────────
  function move(el, x, y) {
    el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
  }

  // ─── Start invisible; reveal on first real mousemove ─────────
  dot.style.opacity  = '0';
  ring.style.opacity = '0';
  let active = false;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    computeMagnet(mouseX, mouseY);

    if (!active) {
      active = true;
      ringX  = mouseX;
      ringY  = mouseY;
      move(dot,  mouseX, mouseY);
      move(ring, ringX + magnetOffX, ringY + magnetOffY);
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }
  });

  // ─── rAF render loop ─────────────────────────────────────────
  (function loop() {
    move(dot, mouseX, mouseY);

    // Ring lerps toward (cursor + magnetic pull offset)
    const targetX = mouseX + magnetOffX;
    const targetY = mouseY + magnetOffY;
    ringX += (targetX - ringX) * LERP;
    ringY += (targetY - ringY) * LERP;
    move(ring, ringX, ringY);

    requestAnimationFrame(loop);
  })();

  // ─── Hover state — ring grows, dot hides ─────────────────────
  const HOVER_SEL = [
    'a', 'button', 'label', 'input', 'textarea', 'select',
    '[role="button"]', '.nav-cta', '.filter-tab',
    '.faq-question', '.hamburger', '.expand-toggle',
  ].join(',');

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(HOVER_SEL)) {
      ring.classList.add('is-hovering');
      dot.classList.add('is-hovering');
    }
  });

  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(HOVER_SEL)) {
      ring.classList.remove('is-hovering');
      dot.classList.remove('is-hovering');
    }
  });

  // ─── Click state — ring shrinks ──────────────────────────────
  document.addEventListener('mousedown', function () { ring.classList.add('is-clicking'); });
  document.addEventListener('mouseup',   function () { ring.classList.remove('is-clicking'); });

  // ─── Window leave / re-enter ─────────────────────────────────
  document.addEventListener('mouseleave', function () {
    dot.style.opacity = ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function () {
    if (active) dot.style.opacity = ring.style.opacity = '1';
  });
})();
