/**
 * AMBIENT LIFE
 *
 * Phase 6, Task 4: the OS should feel alive even when nobody is doing
 * anything -- and equally, feel like it "notices" when nobody has done
 * anything in a while, rather than running at full activity forever
 * regardless of whether anyone's there.
 *
 * This module's only job is detecting idle/active state and broadcasting
 * it on the Signal Bus as 'system:idle' / 'system:wake'. It doesn't touch
 * SystemMonitor, EnergyCore, or Terminal directly -- each of those
 * already independently listens for signals (same pattern as
 * 'module:hover' from Phase 5/Live Architecture), so this file doesn't
 * need to know any of them exist, and none of them need to know this
 * file exists either.
 *
 * Phase 7: the idle-check interval's own visibilitychange listener is
 * gone -- js/kernel-runtime.js now owns the one listener for the whole
 * app, and calls pause()/resume() (public API below) directly.
 */

window.AmbientLife = (function () {
  'use strict';

  const IDLE_THRESHOLD = 120000; // 2 minutes, per the brief
  let lastActivity = Date.now();
  let isIdle = false;
  let checkInterval = null;
  let isSetUp = false;

  function markActive() {
    lastActivity = Date.now();
    if (isIdle) {
      isIdle = false;
      if (window.NexyrothSignals) window.NexyrothSignals.emit('system:wake', {});
    }
  }

  function checkIdle() {
    if (!isIdle && Date.now() - lastActivity >= IDLE_THRESHOLD) {
      isIdle = true;
      if (window.NexyrothSignals) window.NexyrothSignals.emit('system:idle', {});
    }
  }

  function init() {
    if (!window.NexyrothSignals) return;
    isSetUp = true;

    // Any of these counts as "someone is here". passive: true on all of
    // them -- this module only reads timing, never calls preventDefault.
    window.addEventListener('mousemove', markActive, { passive: true });
    window.addEventListener('mousedown', markActive, { passive: true });
    window.addEventListener('keydown', markActive);
    window.addEventListener('touchstart', markActive, { passive: true });
    window.addEventListener('scroll', markActive, { passive: true });

    checkInterval = setInterval(checkIdle, 5000);
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = null;
  }

  function resume() {
    if (!isSetUp) return;
    lastActivity = Date.now(); // don't count the hidden/paused time as idle
    if (!checkInterval) checkInterval = setInterval(checkIdle, 5000);
  }

  function ready() {
    // Exists for lifecycle-shape consistency (Task 11).
  }

  function destroy() {
    pause();
    window.removeEventListener('mousemove', markActive);
    window.removeEventListener('mousedown', markActive);
    window.removeEventListener('keydown', markActive);
    window.removeEventListener('touchstart', markActive);
    window.removeEventListener('scroll', markActive);
  }

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy,
    getStatus: () => ({
      isIdle: isIdle,
      msSinceActivity: Date.now() - lastActivity,
      idleThreshold: IDLE_THRESHOLD
    })
  };
})();
