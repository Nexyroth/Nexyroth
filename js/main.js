/**
 * NEXYROTH OS -- MAIN ORCHESTRATOR v8.0 (Phase 7: Kernel Runtime)
 *
 * WHAT CHANGED: this file used to be where module order AND module
 * lifecycle both lived -- it decided the order, called .init() on each,
 * and that was the whole lifecycle story. Phase 7 moves lifecycle
 * ownership to js/kernel-runtime.js: this file still decides the ORDER
 * (that part hasn't changed, and still needs to exist somewhere --
 * Hero's DOM needs to exist before EnergyCore looks for its canvas, etc),
 * but for each module it now does register -> init -> ready -> active
 * through the Kernel, instead of just calling init() and being done.
 *
 * REQUIRED INITIALIZATION ORDER (unchanged from v7.0):
 * Boot -> Performance -> Navigation -> Hero -> EnergyCore ->
 * LiveArchitecture -> LiveRoadmap -> AmbientLife -> ShutdownSequence ->
 * Terminal -> Scroll -> Cursor -> System Monitor -> Interactions ->
 * Easter Eggs -> Animations
 *
 * js/signal-bus.js (transport) and js/kernel-runtime.js (state machine +
 * module registry + centralized pause/resume) are both loaded before
 * this file and need no init() call -- see their own file headers for
 * why. This file's only new job regarding them is to register each
 * module with the kernel and drive the kernel's own state transitions
 * as boot hands off to "the OS is now running".
 */

window.NexyrothApp = (function () {
  'use strict';

  let isInitialized = false;

  function registerVendorLibs() {
    // GSAP + ScrollTrigger are optional-but-expected going forward. Guard
    // every access so a CDN hiccup degrades gracefully instead of throwing
    // and aborting the whole init() chain.
    if (window.gsap && window.ScrollTrigger) {
      try {
        window.gsap.registerPlugin(window.ScrollTrigger);
      } catch (e) {
        console.warn('[Main] GSAP ScrollTrigger registration failed:', e);
      }
    } else {
      console.warn('[Main] GSAP/ScrollTrigger not loaded -- scroll-driven modules will fall back to CSS-only behavior.');
    }

    // Lenis (smooth scroll) needs to hand its scroll ticks to GSAP's ticker
    // so ScrollTrigger stays in sync with the smoothed scroll position
    // instead of the raw (unsmoothed) native scroll event.
    if (window.Lenis && window.gsap) {
      try {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reducedMotion) {
          const lenis = new window.Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
          });

          lenis.on('scroll', window.ScrollTrigger ? window.ScrollTrigger.update : undefined);

          window.gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
          });
          window.gsap.ticker.lagSmoothing(0);

          window.NexyrothLenis = lenis;
        }
      } catch (e) {
        console.warn('[Main] Lenis init failed, falling back to native scroll:', e);
      }
    }
  }

  function init() {
    if (isInitialized) {
      console.warn('[Main] init() called again after already initialized -- ignoring.');
      return;
    }
    isInitialized = true;

    console.log('Initializing Nexyroth OS Core Modules...');

    const kernel = window.KernelRuntime;
    // Boot's cinematic runs entirely during the kernel's initial BOOTING
    // state (set at kernel-runtime.js load time). Reaching this function
    // at all means boot.js's complete() has run -- time to move past it.
    if (kernel) kernel.transition('INITIALIZING', 'boot complete, starting module init');

    registerVendorLibs();

    // Strict initialization order required by spec
    const modules = [
      { name: 'Performance', ref: window.PerformanceOptimizer },
      { name: 'Navigation', ref: window.Navigation },
      { name: 'Hero', ref: window.HeroEffects },
      { name: 'EnergyCore', ref: window.EnergyCore },
      { name: 'LiveArchitecture', ref: window.LiveArchitecture },
      { name: 'LiveRoadmap', ref: window.LiveRoadmap },
      { name: 'AmbientLife', ref: window.AmbientLife },
      { name: 'ShutdownSequence', ref: window.ShutdownSequence },
      { name: 'KernelInspector', ref: window.KernelInspector },
      { name: 'Terminal', ref: window.Terminal },
      { name: 'Scroll', ref: window.ScrollManager },
      { name: 'Cursor', ref: window.CursorEffect },
      { name: 'SystemMonitor', ref: window.SystemMonitor },
      { name: 'Interactions', ref: window.Interactions },
      { name: 'EasterEggs', ref: window.EasterEggs },
      { name: 'Animations', ref: window.Animations },
    ];

    modules.forEach((module) => {
      if (kernel && module.ref) kernel.registerModule(module.name, module.ref);

      try {
        if (module.ref && typeof module.ref.init === 'function') {
          module.ref.init();
        } else if (module.ref && typeof module.ref === 'function') {
          module.ref();
        }
        // A module that has no ready()/pause()/resume()/destroy() at all
        // (e.g. Navigation, Scroll -- plain event-listener setup with no
        // ongoing per-frame work to pause) still gets registered and
        // marked ready/active; readyModule()/activateModule() only CALL
        // ref.ready() if it exists (typeof-checked in kernel-runtime.js),
        // so this is safe for modules that don't implement the full
        // lifecycle shape.
        if (kernel && module.ref) {
          kernel.readyModule(module.name);
          kernel.activateModule(module.name);
        }
      } catch (e) {
        console.error(`[Main] Module ${module.name} failed to initialize:`, e);
        if (kernel) kernel.logEvent('module-init-error', { module: module.name, message: String(e && e.message) });
      }
    });

    // Let ScrollTrigger recompute trigger positions once every module has
    // had a chance to mount its DOM/height changes.
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }

    if (kernel) {
      kernel.transition('READY', 'all modules initialized');
      kernel.transition('ACTIVE', 'OS running');
    }

    console.log('\u2713 Nexyroth OS Core: All modules initialized in order.');
  }

  return {
    init: init,
    get isInitialized() { return isInitialized; },
  };
})();
