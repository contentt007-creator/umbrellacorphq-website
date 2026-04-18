/**
 * Umbrella Corp HQ — 3D Hero Mark
 * Three.js crosshair logo mark with full animation stack
 * Built programmatically — no SVG import
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
   * CONSTANTS
   * ───────────────────────────────────────────── */
  const CORP_RED   = 0xc1121f;
  const DEEP_RED   = 0x7a0d15;
  const IVORY      = 0xf0ede8;
  const VOID       = 0x0a0a0a;
  const IS_MOBILE  = window.innerWidth < 768;

  /* ─────────────────────────────────────────────
   * CANVAS + RENDERER
   * ───────────────────────────────────────────── */
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0); // transparent

  /* ─────────────────────────────────────────────
   * SCENE + CAMERA
   * ───────────────────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  /* ─────────────────────────────────────────────
   * LIGHTING
   * ───────────────────────────────────────────── */
  const ambientLight = new THREE.AmbientLight(0x1a0a0a, 0.5);
  scene.add(ambientLight);

  const redKeyLight = new THREE.PointLight(CORP_RED, 1.2, 8, 2);
  redKeyLight.position.set(0, 0, 3);
  scene.add(redKeyLight);

  const rimLight = new THREE.PointLight(IVORY, 0.3, 12);
  rimLight.position.set(-4, 3, -2);
  scene.add(rimLight);

  /* ─────────────────────────────────────────────
   * MATERIALS
   * ───────────────────────────────────────────── */
  const redMat = new THREE.MeshStandardMaterial({
    color: CORP_RED,
    emissive: DEEP_RED,
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.6,
  });

  const redLineMat = new THREE.LineBasicMaterial({
    color: CORP_RED,
    transparent: true,
    opacity: 0.5,
  });

  const diagMat = new THREE.MeshStandardMaterial({
    color: CORP_RED,
    emissive: DEEP_RED,
    emissiveIntensity: 0.2,
    roughness: 0.4,
    metalness: 0.6,
    transparent: true,
    opacity: 0.35,
  });

  const voidMat = new THREE.MeshStandardMaterial({
    color: VOID,
    roughness: 1.0,
    metalness: 0.0,
  });

  /* ─────────────────────────────────────────────
   * LOGO MARK GROUP
   * ───────────────────────────────────────────── */
  const logoMark = new THREE.Group();

  // 1. OUTER RING
  const outerRingGeo = new THREE.TorusGeometry(
    2.8,
    0.018,
    IS_MOBILE ? 64 : 128,
    IS_MOBILE ? 128 : 256
  );
  const outerRing = new THREE.Mesh(outerRingGeo, redMat);
  logoMark.add(outerRing);

  // 2. INNER DASHED RING (custom LineLoop with gaps)
  (function buildDashedRing() {
    const dashCount   = 32;
    const dashFrac    = 0.55; // fraction of arc that is visible per segment
    const r           = 2.0;
    const points      = [];

    for (let i = 0; i < dashCount; i++) {
      const segStart = (i / dashCount) * Math.PI * 2;
      const segEnd   = segStart + (Math.PI * 2 / dashCount) * dashFrac;
      const steps    = 6;
      for (let s = 0; s <= steps; s++) {
        const angle = segStart + (segEnd - segStart) * (s / steps);
        points.push(new THREE.Vector3(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0
        ));
      }
      // Gap: jump to start of next segment without a line
      // We break the line by starting a new LineSegments primitive
    }

    // Build as individual dash segments (each its own line)
    for (let i = 0; i < dashCount; i++) {
      const segStart = (i / dashCount) * Math.PI * 2;
      const segEnd   = segStart + (Math.PI * 2 / dashCount) * dashFrac;
      const steps    = 6;
      const segPts   = [];

      for (let s = 0; s <= steps; s++) {
        const angle = segStart + (segEnd - segStart) * (s / steps);
        segPts.push(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          0
        );
      }

      const geo  = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(segPts, 3));
      const line = new THREE.Line(geo, redLineMat);
      logoMark.add(line);
    }
  })();

  // 3. CROSS LINES — Horizontal + Vertical
  function makeCrossLine(length, rotationZ) {
    const geo  = new THREE.CylinderGeometry(0.012, 0.012, length, 8, 1);
    const mesh = new THREE.Mesh(geo, redMat);
    mesh.rotation.z = rotationZ; // 0 = vertical, Math.PI/2 = horizontal
    return mesh;
  }

  const crossLineLength = 5.6; // full diameter (2 * 2.8)
  const vertLine  = makeCrossLine(crossLineLength, 0);               // vertical
  const horizLine = makeCrossLine(crossLineLength, Math.PI / 2);     // horizontal
  logoMark.add(vertLine);
  logoMark.add(horizLine);

  // 4. DIAGONAL LINES
  const diagLine1 = makeCrossLine(crossLineLength, Math.PI / 4);     //  45°
  const diagLine2 = makeCrossLine(crossLineLength, -Math.PI / 4);    // -45°

  diagLine1.material = diagMat;
  diagLine2.material = diagMat;
  logoMark.add(diagLine1);
  logoMark.add(diagLine2);

  // 5. CENTER DOT + VOID CUTOUT
  const dotGeo  = new THREE.SphereGeometry(0.18, 32, 32);
  const dot     = new THREE.Mesh(dotGeo, redMat);
  logoMark.add(dot);

  const voidGeo  = new THREE.SphereGeometry(0.08, 32, 32);
  const voidDot  = new THREE.Mesh(voidGeo, voidMat);
  voidDot.position.z = 0.12; // slightly forward to punch through
  logoMark.add(voidDot);

  // Mobile scale
  if (IS_MOBILE) {
    logoMark.scale.set(0.7, 0.7, 0.7);
  }

  scene.add(logoMark);

  /* ─────────────────────────────────────────────
   * PARTICLE FIELD
   * ───────────────────────────────────────────── */
  const PARTICLE_COUNT  = IS_MOBILE ? 600 : 1500;
  const IVORY_COUNT     = Math.floor(PARTICLE_COUNT * 0.8);
  const RED_COUNT       = PARTICLE_COUNT - IVORY_COUNT;
  const SPHERE_RADIUS   = 8;

  const positions   = new Float32Array(PARTICLE_COUNT * 3);
  const colors      = new Float32Array(PARTICLE_COUNT * 3);
  const velocities  = [];

  const ivoryColor  = new THREE.Color(IVORY);
  const redColor    = new THREE.Color(CORP_RED);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // Random spherical distribution
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = SPHERE_RADIUS * Math.cbrt(Math.random()); // cube root for uniform volume

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Velocity
    velocities.push(new THREE.Vector3(
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002,
      (Math.random() - 0.5) * 0.002
    ));

    // Color
    const col = i < IVORY_COUNT ? ivoryColor : redColor;
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: IS_MOBILE ? 0.035 : 0.025,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ─────────────────────────────────────────────
   * MOUSE PARALLAX
   * ───────────────────────────────────────────── */
  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;
  let parallaxActive = !IS_MOBILE;

  if (!IS_MOBILE) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      targetRotX = mouseY * 0.3;
      targetRotY = mouseX * 0.3;
    }, { passive: true });
  } else {
    // Gyroscope on mobile
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          targetRotY =  (e.gamma / 45) * 0.3;
          targetRotX = ((e.beta - 45) / 45) * 0.3;
        }
      }, { passive: true });
    }
  }

  /* ─────────────────────────────────────────────
   * SCROLL STATE
   * ───────────────────────────────────────────── */
  let scrollProgress = 0;

  function updateScroll() {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const h  = hero.offsetHeight;
    const sy = window.scrollY;
    scrollProgress = Math.min(Math.max(sy / h, 0), 1);
  }

  window.addEventListener('scroll', updateScroll, { passive: true });

  /* ─────────────────────────────────────────────
   * CLICK EASTER EGG
   * ───────────────────────────────────────────── */
  let pulseActive = false;
  let pulseStart  = 0;

  canvas.addEventListener('click', () => {
    if (pulseActive) return;
    pulseActive = true;
    pulseStart  = performance.now();
  });

  function applyPulse(now) {
    if (!pulseActive) return;
    const elapsed = (now - pulseStart) / 1000;
    const duration = 0.6;

    if (elapsed > duration) {
      pulseActive = false;
      outerRing.scale.set(1, 1, 1);
      return;
    }

    // Ease out: scale up then back
    const t = elapsed / duration;
    const scale = t < 0.5
      ? 1 + (t * 2) * 0.15           // 0→0.3s: grow to 1.15×
      : 1 + (1 - (t - 0.5) * 2) * 0.15; // 0.3→0.6s: shrink back

    outerRing.scale.set(scale, scale, scale);

    // Scatter particles slightly
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const strength = Math.sin(t * Math.PI) * 0.006;
      posArr[i * 3]     += velocities[i].x * strength * 15;
      posArr[i * 3 + 1] += velocities[i].y * strength * 15;
      posArr[i * 3 + 2] += velocities[i].z * strength * 15;
    }
    particleGeo.attributes.position.needsUpdate = true;
  }

  /* ─────────────────────────────────────────────
   * CLOCK
   * ───────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let   currentRotX = 0, currentRotY = 0;

  /* ─────────────────────────────────────────────
   * ANIMATION LOOP
   * ───────────────────────────────────────────── */
  let animFrameId = null;
  let lastTime = 0;

  function animate(now = 0) {
    animFrameId = requestAnimationFrame(animate);

    // 30fps cap on mobile
    if (IS_MOBILE) {
      if (now - lastTime < 33) return;
      lastTime = now;
    }

    const elapsed = clock.getElapsedTime();

    // ── LAYER 1: Base Y rotation
    logoMark.rotation.y += 0.003;

    // ── LAYER 2: X-axis tilt oscillation
    const baseX = Math.sin(elapsed * 0.3) * 0.15;

    // ── LAYER 3: Mouse parallax lerp
    currentRotX += (targetRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY - currentRotY) * 0.05;
    logoMark.rotation.x = baseX + currentRotX;
    // Y gets base rotation + mouse
    // (y rotation is additive per frame, mouse is applied on top of ongoing)
    logoMark.rotation.y += currentRotY * 0.01;

    // ── LAYER 4: Pulsing scale
    const pulse = 1 + Math.sin(elapsed * 0.8) * 0.015;
    const baseScale = IS_MOBILE ? 0.7 : 1.0;
    if (!pulseActive) {
      logoMark.scale.set(baseScale * pulse, baseScale * pulse, baseScale * pulse);
    }

    // ── LAYER 5: Scroll-driven Z rotation + canvas opacity
    updateScroll();
    logoMark.rotation.z = scrollProgress * Math.PI * 0.5;
    canvas.style.opacity = String(1 - scrollProgress * 2.5); // fade out fast

    // ── Camera pull-back on scroll
    camera.position.z = 6 + scrollProgress * 3;

    // ── Particle drift
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArr[i * 3]     += velocities[i].x;
      posArr[i * 3 + 1] += velocities[i].y;
      posArr[i * 3 + 2] += velocities[i].z;

      // Boundary bounce
      for (const axis of [0, 1, 2]) {
        if (Math.abs(posArr[i * 3 + axis]) > SPHERE_RADIUS) {
          velocities[i].setComponent(axis, -velocities[i].getComponent(axis));
        }
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Slow particle system rotation
    particles.rotation.y += 0.0005;

    // ── Easter egg pulse
    applyPulse(now);

    renderer.render(scene, camera);
  }

  animate();

  /* ─────────────────────────────────────────────
   * PAUSE WHEN TAB HIDDEN
   * ───────────────────────────────────────────── */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrameId);
    } else {
      clock.start();
      animate();
    }
  });

  /* ─────────────────────────────────────────────
   * SCROLL TRIGGER — pause when hero is off screen
   * ───────────────────────────────────────────── */
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#hero',
      start: 'bottom top',
      onLeave: () => {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      },
      onEnterBack: () => {
        if (!animFrameId) animate();
      },
    });
  }

  /* ─────────────────────────────────────────────
   * RESIZE
   * ───────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  /* ─────────────────────────────────────────────
   * MEMORY CLEANUP
   * ───────────────────────────────────────────── */
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animFrameId);
    renderer.dispose();
    outerRingGeo.dispose();
    particleGeo.dispose();
    redMat.dispose();
    redLineMat.dispose();
    diagMat.dispose();
    voidMat.dispose();
    particleMat.dispose();
  });

})();
