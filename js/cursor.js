/**
 * Umbrella Corp HQ — Custom Cursor
 * Red dot + lagging ring. Transform-only movement (GPU layer).
 * NOTE: Do NOT guard with ontouchstart / maxTouchPoints —
 * Windows 10/11 reports touch even on pure desktop PCs, killing the cursor.
 * CSS handles hiding on actual touch devices via pointer: coarse media query.
 */

(function () {
  const dot  = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = -999, mouseY = -999;
  let ringX  = -999, ringY  = -999;
  const LERP = 0.14;

  // Start invisible; reveal on first real mousemove
  dot.style.opacity  = '0';
  ring.style.opacity = '0';
  let active = false;

  function move(el, x, y) {
    el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%)';
  }

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!active) {
      active = true;
      ringX  = mouseX;
      ringY  = mouseY;
      move(dot,  mouseX, mouseY);
      move(ring, ringX,  ringY);
      dot.style.opacity  = '1';
      ring.style.opacity = '1';
    }
  });

  // rAF loop
  (function loop() {
    move(dot, mouseX, mouseY);
    ringX += (mouseX - ringX) * LERP;
    ringY += (mouseY - ringY) * LERP;
    move(ring, ringX, ringY);
    requestAnimationFrame(loop);
  })();

  // Hover — ring grows, dot hides
  var hoverEls = 'a,button,label,input,textarea,select,[role="button"],.nav-cta,.filter-tab,.faq-question,.hamburger,.expand-toggle';

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(hoverEls)) {
      ring.classList.add('is-hovering');
      dot.classList.add('is-hovering');
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(hoverEls)) {
      ring.classList.remove('is-hovering');
      dot.classList.remove('is-hovering');
    }
  });

  // Click — ring shrinks
  document.addEventListener('mousedown', function () { ring.classList.add('is-clicking'); });
  document.addEventListener('mouseup',   function () { ring.classList.remove('is-clicking'); });

  // Leave / enter window
  document.addEventListener('mouseleave', function () {
    dot.style.opacity = ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function () {
    if (active) dot.style.opacity = ring.style.opacity = '1';
  });
})();
