/**
 * NEXYROTH OS — PERFORMANCE OPTIMIZER
 * Ensures 60fps experience by managing heavy effects.
 */

window.PerformanceOptimizer = (function() {
  'use strict';

  const state = {
    lowPowerMode: false,
    isScrolling: false,
    scrollTimeout: null
  };

  function init() {
    checkHardware();
    setupScrollOptimization();
    
    // Add performance class to body
    document.body.classList.add('perf-optimized');
  }

  function checkHardware() {
    // Basic check for low-end devices
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      enableLowPowerMode();
    }
    
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      enableLowPowerMode();
    }
  }

  function enableLowPowerMode() {
    state.lowPowerMode = true;
    document.body.classList.add('low-power-mode');
    console.log("NEXYROTH OS: Low power mode enabled for performance.");
  }

  function setupScrollOptimization() {
    window.addEventListener('scroll', () => {
      if (!state.isScrolling) {
        state.isScrolling = true;
        document.body.classList.add('is-scrolling');
      }

      clearTimeout(state.scrollTimeout);
      state.scrollTimeout = setTimeout(() => {
        state.isScrolling = false;
        document.body.classList.remove('is-scrolling');
      }, 200);
    }, { passive: true });
  }

  // NOTE (Phase 7): a setupVisibilityHandler() function used to live
  // here, with its own document.addEventListener('visibilitychange',
  // ...) toggling a 'tab-hidden' body class. This was actually the
  // THIRD independent visibilitychange listener found in this codebase
  // (alongside energy-core.js/cursor.js/system-monitor.js's own, already
  // centralized above) -- removed and folded into
  // js/kernel-runtime.js's pauseAllModules()/resumeAllModules(), which
  // now toggles the same class as part of its one listener.

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return {
    init: init,
    isLowPower: () => state.lowPowerMode,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();

// NOTE: this used to self-init on DOMContentLoaded independently of the
// boot sequence, meaning it (and the body classes it sets) could run
// before, during, or after Boot depending on timing -- a real violation
// of "no module initializes before Hero Reveal". It's now called from
// js/main.js's managed module list instead, in the same gated order as
// every other module.