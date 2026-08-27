/**
 * ENERGY CORE -- Nexyroth OS's signature visual (Phase 3: "Create the Soul")
 *
 * WHY THIS EXISTS: replaces the old 2D canvas particle-network background
 * (the single most generic visual in the project) with a real faceted 3D
 * form -- depth, lighting, parallax between layers -- that a flat canvas
 * genuinely cannot do.
 *
 * WHAT IT IS: a faceted icosahedron "core" (the visible kernel), a slower
 * counter-rotating wireframe "shell" around it, and a sparse field of
 * orbiting energy points. It tilts subtly toward the cursor.
 *
 * THREE.JS VERSION: pinned to r128 via cdnjs (matches the project's
 * ui-ux-pro-max-skill Three.js guidance: r128 is the last version with a
 * working global/UMD build, so it loads as a plain `<script defer>` like
 * every other vendor library here -- window.THREE, no ES module, no
 * load-order event juggling). An earlier draft used a newer version via
 * ES module import; reverted in favor of this simpler, more consistent,
 * skill-recommended approach.
 *
 * Fixes applied per that same skill guidance after a second pass:
 * - Added a DirectionalLight (MeshStandardMaterial needs Ambient +
 *   Directional at minimum, or faceted shading contrast is lost even
 *   though the emissive glow alone would still show).
 * - Rotation is now driven by elapsed time, not fixed per-frame
 *   increments -- the old version would spin ~2x faster on a 120Hz
 *   display than on 60Hz.
 * - prefers-reduced-motion is read reactively (matchMedia 'change'
 *   listener), not as a one-time snapshot at load -- a user who toggles
 *   the OS setting mid-session is now respected immediately.
 * - Resize uses ResizeObserver on the container instead of window
 *   'resize' -- correct for a canvas inside a sized container rather
 *   than filling the viewport.
 * - Added basic touch support alongside mouse, so the tilt interaction
 *   isn't mouse-only.
 * - Explicit camera.lookAt() before first render (was implicitly correct
 *   before by coincidence of camera/object placement, not by design).
 *
 * DEGRADATION: if WebGL isn't available, or the Three.js CDN fails to
 * load, this fails silently -- a visual enhancement, not a functional
 * dependency.
 */

window.EnergyCore = (function () {
  'use strict';

  let scene, camera, renderer, core, shell, points;
  let container, canvas;
  let rafId = null;
  let isPaused = false;
  let isSetUp = false;
  let noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetRotY = 0, targetRotX = 0;
  let startTime = null;
  let speedFactor = 1;
  let targetSpeedFactor = 1;
  let isShutdown = false;
  let emissiveFade = 1;
  let targetEmissiveFade = 1;

  function init() {
    canvas = document.getElementById('energyCoreCanvas');
    container = document.getElementById('coreStage');
    if (!canvas || !container) return;

    // Reactive reduced-motion: a one-time snapshot would miss a mid-session
    // OS-level toggle.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      noMotion = e.matches;
      if (noMotion) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (renderer && scene && camera) renderer.render(scene, camera);
      } else if (isSetUp && !isPaused && !rafId) {
        rafId = requestAnimationFrame(animate);
      }
    });

    if (window.THREE) {
      setup();
    } else {
      // Vendor CDN may still be loading (it's `defer`red, same class of
      // timing risk flagged for GSAP/Lenis/SplitType in Phase 1) -- this
      // is a visual enhancement, not core functionality, so a bounded
      // retry then silent no-op is the right degrade, never a blocking
      // wait.
      let attempts = 0;
      const waitForThree = setInterval(() => {
        attempts++;
        if (window.THREE) {
          clearInterval(waitForThree);
          setup();
        } else if (attempts > 40) { // ~4s at 100ms
          clearInterval(waitForThree);
          console.warn('[EnergyCore] Three.js did not load in time -- Hero renders without the Core.');
        }
      }, 100);
    }
  }

  function setup() {
    if (isSetUp) return;
    const THREE = window.THREE;
    if (!THREE) return;

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const lowPower = document.body.classList.contains('low-power-mode');

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: !lowPower });
    } catch (e) {
      console.warn('[EnergyCore] WebGL unavailable -- Hero renders without the Core.', e);
      return;
    }
    renderer.setPixelRatio(lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);

    // Faceted inner core. flatShading is what gives it the "crystalline
    // kernel" look rather than a smooth sphere (which would just read as
    // a generic glowing orb).
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0a2540,
      emissive: 0x00bfff,
      emissiveIntensity: 0.55,
      metalness: 0.35,
      roughness: 0.45,
      flatShading: true
    });
    core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Wireframe outer shell, counter-rotating at a different speed -- what
    // makes it read as a layered 3D object with real depth.
    const shellGeo = new THREE.IcosahedronGeometry(2.0, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x00bfff,
      wireframe: true,
      transparent: true,
      opacity: 0.32
    });
    shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // Orbiting energy points: BufferGeometry + Points (not individual
    // meshes -- the skill's Particles guidance is explicit that Mesh-based
    // particles stop scaling past a few hundred).
    const pointCount = lowPower ? 50 : 150;
    const positions = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      const radius = 2.6 + Math.random() * 1.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: 0x66e0ff,
      size: 0.035,
      transparent: true,
      opacity: 0.7
    });
    points = new THREE.Points(pointsGeo, pointsMat);
    scene.add(points);

    // Lighting: MeshStandardMaterial needs Ambient (fill) + Directional
    // (shading direction) at minimum, or faceted contrast between faces is
    // lost -- the emissive glow alone would still show, but the "faceted"
    // read this whole shape exists for would not. PointLight added on top
    // purely for the localized glow falloff near the core.
    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(3, 4, 5);
    scene.add(dirLight);
    const keyLight = new THREE.PointLight(0x00bfff, 2.2, 12);
    keyLight.position.set(2, 2, 3);
    scene.add(keyLight);

    isSetUp = true;
    setupInteraction();
    setupResize();
    setupSignalListener();

    if (noMotion) {
      renderer.render(scene, camera); // one static frame -- no continuous motion
    } else {
      rafId = requestAnimationFrame(animate);
    }
  }

  function setupInteraction() {
    // Scoped to the Core's own container, not the whole document -- a
    // localized "environment reacts to you" effect.
    function handlePointer(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
      targetRotY = nx * 0.25;
      targetRotX = ny * 0.15;
    }

    container.addEventListener('mousemove', (e) => {
      handlePointer(e.clientX, e.clientY);
    });

    // Touch parity -- the skill's Responsive guidance calls out mouse-only
    // interaction as leaving mobile users with no interaction at all.
    container.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
  }

  function setupResize() {
    // ResizeObserver over window 'resize': .core-stage is a sized
    // container, not the full viewport, so it can change size (responsive
    // breakpoints, layout reflow elsewhere on the page) independently of
    // the window itself resizing.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        if (!width || !height || !camera || !renderer) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        if (noMotion) renderer.render(scene, camera);
      });
      ro.observe(container);
    } else {
      // Fallback for older browsers without ResizeObserver.
      window.addEventListener('resize', () => {
        if (!camera || !renderer || !container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        if (noMotion) renderer.render(scene, camera);
      });
    }
  }

  // NOTE (Phase 7): a setupVisibilityPause() function used to live here,
  // with its own document.addEventListener('visibilitychange', ...).
  // Removed -- js/kernel-runtime.js now owns the one visibilitychange
  // listener for the whole app, and calls this module's pause()/resume()
  // (exposed in the public API below) directly instead.

  let glowBoost = 0;
  let glowBoostExpires = 0;
  const GLOW_BOOST_DURATION = 1800; // ms

  function setupSignalListener() {
    if (!window.NexyrothSignals) return;
    // "Core phát sáng" when the rest of the OS is doing something --
    // reacts to the shared signal bus without ever needing to know
    // Architecture (or anything else) exists.
    window.NexyrothSignals.on('module:hover', () => {
      glowBoost = 0.5;
      glowBoostExpires = Date.now() + GLOW_BOOST_DURATION;
    });

    // Ambient Life (Task 4): the core visibly settles into a slower,
    // quieter rhythm when nobody's interacted in a while, and picks back
    // up smoothly (lerped, not snapped) on the next signal.
    window.NexyrothSignals.on('system:idle', () => {
      targetSpeedFactor = 0.25;
    });
    window.NexyrothSignals.on('system:wake', () => {
      if (!isShutdown) targetSpeedFactor = 1;
    });

    // Footer Shutdown Sequence (Task 3): one-way, not reversible by a
    // later 'system:wake' -- once the user has scrolled to the very
    // bottom and the OS is "shutting down", coming back up shouldn't
    // resurrect it mid-animation. A full page reload is the only way
    // back, same as a real OS.
    window.NexyrothSignals.on('system:shutdown', () => {
      isShutdown = true;
      targetSpeedFactor = 0.03;
      targetEmissiveFade = 0;
    });
  }

  let lastFrameTime = null;
  let corePhase = 0, shellPhaseY = 0, shellPhaseX = 0, pointsPhase = 0, breathePhase = 0;

  function animate(time) {
    if (startTime === null) startTime = time;
    if (lastFrameTime === null) lastFrameTime = time;
    const delta = (time - lastFrameTime) / 1000; // seconds since last frame
    lastFrameTime = time;

    // Ease the speed factor toward its target rather than snapping --
    // Ambient Life's idle/wake signals set targetSpeedFactor, and this
    // makes the core visibly "settle" into idle or "spool up" on wake
    // instead of an abrupt speed change.
    speedFactor += (targetSpeedFactor - speedFactor) * 0.01;
    emissiveFade += (targetEmissiveFade - emissiveFade) * 0.006;

    // Rotation/breathing are accumulated phase advanced by real elapsed
    // delta each frame (delta * rate * speedFactor), not a fixed
    // per-frame increment and not recomputed from absolute elapsed time.
    // Both matter: a fixed per-frame increment runs faster on a 120Hz
    // display than 60Hz (the Phase 4 fix); recomputing from absolute
    // elapsed time with a *variable* speedFactor would make the phase
    // jump discontinuously the instant speedFactor changes. Accumulating
    // by real delta avoids both problems at once.
    corePhase += delta * 0.18 * speedFactor;
    breathePhase += delta * 0.8 * speedFactor;
    shellPhaseY += delta * -0.11 * speedFactor;
    shellPhaseX += delta * 0.06 * speedFactor;
    pointsPhase += delta * 0.035 * speedFactor;

    if (core) {
      core.rotation.y = corePhase;
      core.rotation.x = corePhase * 0.5; // matches the original 0.09 : 0.18 ratio
      const breathe = 1 + Math.sin(breathePhase) * 0.04;
      core.scale.set(breathe, breathe, breathe);

      // Signal-driven glow: decays linearly back to the resting 0.55
      // rather than snapping, so a hover reads as a pulse settling.
      // emissiveFade multiplies on top -- stays at 1 normally, eases
      // toward 0 only during the Footer Shutdown Sequence.
      const now = Date.now();
      const activeBoost = now < glowBoostExpires ? glowBoost * ((glowBoostExpires - now) / GLOW_BOOST_DURATION) : 0;
      core.material.emissiveIntensity = (0.55 + activeBoost) * emissiveFade;
    }
    if (shell) {
      shell.rotation.y = shellPhaseY;
      shell.rotation.x = shellPhaseX;
    }
    if (points) {
      points.rotation.y = pointsPhase;
      // Ambient Life: "particles giảm" while idle -- tied directly to
      // speedFactor (already smoothed/eased) rather than a separate
      // signal listener, so it settles in lockstep with the rotation
      // slowdown instead of on its own timing.
      points.material.opacity = 0.3 + 0.4 * speedFactor;
    }
    if (camera) {
      camera.rotation.y += (targetRotY - camera.rotation.y) * 0.04;
      camera.rotation.x += (targetRotX - camera.rotation.x) * 0.04;
    }
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    rafId = requestAnimationFrame(animate);
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // Kernel Runtime calls these directly (typeof-checked on its side, so
  // it's safe that not every module implements all of them) -- this
  // module used to decide for itself, via its own visibilitychange
  // listener, when to pause; now it just reacts when told.
  function pause() {
    isPaused = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function resume() {
    if (!isSetUp || noMotion) return;
    if (isPaused) {
      isPaused = false;
      rafId = requestAnimationFrame(animate);
    }
  }

  function ready() {
    // Nothing extra needed beyond what init()/setup() already do --
    // exists so the Kernel's readyModule() has something to typeof-check
    // and call, keeping this module's lifecycle shape consistent with
    // the rest (Task 11: "khong con module viet theo nhieu style khac
    // nhau").
  }

  function destroy() {
    // Not expected to be called in this single-page site's lifetime (no
    // client-side routing ever unmounts a section) -- implemented anyway
    // for lifecycle-shape consistency and because it's cheap and correct
    // to have a real teardown path rather than a documented gap.
    pause();
    if (renderer) {
      renderer.dispose();
    }
    isSetUp = false;
  }

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();
