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
   * THEME STATE
   * ───────────────────────────────────────────── */
  let heroTheme = (document.documentElement.getAttribute('data-theme') || 'dark');

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
   * CLOUD GEOMETRY (shown in light / day mode)
   * ───────────────────────────────────────────── */
  const cloudMat = new THREE.MeshLambertMaterial({
    color:       0xffffff,
    transparent: true,
    opacity:     0.92,
  });

  const cloudConfigs = [
    { pos: [-3.8, 1.4, -2.0], blobs: [[0,0,0,0.7],[0.65,0.15,0,0.5],[-0.6,0.1,0,0.45],[0.2,0.3,0,0.4]] },
    { pos: [ 3.5, 0.6, -2.5], blobs: [[0,0,0,0.6],[0.6,0.2,0,0.45],[-0.55,0.05,0,0.4],[0.1,0.28,0,0.35]] },
    { pos: [-2.0,-1.6, -1.8], blobs: [[0,0,0,0.5],[0.5,0.12,0,0.38],[-0.45,0.08,0,0.35]] },
    { pos: [ 4.2, 2.0, -3.2], blobs: [[0,0,0,0.55],[0.55,0.18,0,0.4],[-0.5,0.1,0,0.38],[0.05,0.3,0,0.32]] },
    { pos: [-4.5,-0.3, -3.0], blobs: [[0,0,0,0.65],[0.6,0.2,0,0.48],[-0.58,0.1,0,0.44]] },
    { pos: [ 1.8, 2.5, -2.8], blobs: [[0,0,0,0.45],[0.45,0.1,0,0.35],[-0.4,0.06,0,0.3]] },
  ];

  const cloudGroups = [];
  const cloudDrifts = [];

  cloudConfigs.forEach((cfg, idx) => {
    const g = new THREE.Group();
    cfg.blobs.forEach(([bx, by, bz, br]) => {
      const geo  = new THREE.SphereGeometry(br, IS_MOBILE ? 6 : 10, IS_MOBILE ? 6 : 10);
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(bx, by, bz);
      g.add(mesh);
    });
    g.position.set(...cfg.pos);
    g.visible = false; // hidden until light mode
    scene.add(g);
    cloudGroups.push(g);
    cloudDrifts.push(idx % 2 === 0 ? 0.0007 : -0.0005);
  });

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
   * THEME SWITCH — day sky ↔ night space
   * ───────────────────────────────────────────── */
  function applyHeroTheme(t) {
    heroTheme = t;

    if (t === 'light') {
      /* ── DAY SKY ── */
      renderer.setClearColor(0x87ceeb, 1);           // solid sky blue
      scene.fog = new THREE.Fog(0xc5e8f7, 10, 28);  // soft sky depth
      ambientLight.color.setHex(0xfff4e0);
      ambientLight.intensity = 1.4;
      redKeyLight.color.setHex(0xffd580);            // warm sunlight
      redKeyLight.position.set(3, 4, 4);
      redKeyLight.intensity = 2.0;
      rimLight.color.setHex(0xaadcff);               // sky fill
      rimLight.intensity = 1.0;

      /* Particles → white floating sky mist */
      const whiteC = new THREE.Color(0xffffff);
      const creamC = new THREE.Color(0xffe8b0);
      const posArr = particleGeo.attributes.color.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i < IVORY_COUNT ? whiteC : creamC;
        posArr[i * 3]     = col.r;
        posArr[i * 3 + 1] = col.g;
        posArr[i * 3 + 2] = col.b;
      }
      particleGeo.attributes.color.needsUpdate = true;
      particleMat.size    = IS_MOBILE ? 0.06 : 0.045;
      particleMat.opacity = 0.55;

      /* Show clouds */
      cloudGroups.forEach(cg => { cg.visible = true; });

    } else {
      /* ── NIGHT SPACE ── */
      renderer.setClearColor(0x000000, 0);           // transparent → CSS bg shows
      scene.fog = null;
      ambientLight.color.setHex(0x1a0a0a);
      ambientLight.intensity = 0.5;
      redKeyLight.color.setHex(CORP_RED);
      redKeyLight.position.set(0, 0, 3);
      redKeyLight.intensity = 1.2;
      rimLight.color.setHex(IVORY);
      rimLight.intensity = 0.3;

      /* Particles → ivory + red stars */
      const ivoryC = new THREE.Color(IVORY);
      const redC   = new THREE.Color(CORP_RED);
      const posArr = particleGeo.attributes.color.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const col = i < IVORY_COUNT ? ivoryC : redC;
        posArr[i * 3]     = col.r;
        posArr[i * 3 + 1] = col.g;
        posArr[i * 3 + 2] = col.b;
      }
      particleGeo.attributes.color.needsUpdate = true;
      particleMat.size    = IS_MOBILE ? 0.035 : 0.025;
      particleMat.opacity = 0.7;

      /* Hide clouds */
      cloudGroups.forEach(cg => { cg.visible = false; });
    }
  }

  /* Apply initial theme */
  applyHeroTheme(heroTheme);

  /* Listen for toggle events */
  window.addEventListener('uch-themechange', (e) => {
    applyHeroTheme(e.detail.theme);
  });

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

    // ── Cloud drift (day mode)
    if (heroTheme === 'light') {
      cloudGroups.forEach((cg, i) => {
        cg.position.x += cloudDrifts[i];
        if (cg.position.x > 6.5)  cg.position.x = -6.5;
        if (cg.position.x < -6.5) cg.position.x =  6.5;
      });
    }

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
