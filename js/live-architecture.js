/**
 * LIVE ARCHITECTURE
 *
 * The emit side of Phase 5's cross-module reactivity. This module knows
 * nothing about Terminal, SystemMonitor, Cursor, or EnergyCore -- it only
 * knows the Architecture diagram's own DOM (js/energy-core.js and the
 * others each independently listen for the 'module:hover' / 'module:leave'
 * signals this emits; see js/signal-bus.js for why it's built this way).
 *
 * Also wires the navbar's Launch App button (Phase 6, Task 5's explicit
 * example: hovering Launch reads as "Preparing kernel..." in the
 * Terminal) -- kept in this file rather than a new one for one button,
 * since it's the same emit-side concern.
 */

window.LiveArchitecture = (function () {
  'use strict';

  function init() {
    const nodes = document.querySelectorAll('.os-node[data-module]');
    if (!nodes.length || !window.NexyrothSignals) return;

    nodes.forEach((node) => {
      const moduleName = node.getAttribute('data-module');

      node.addEventListener('mouseenter', () => {
        window.NexyrothSignals.emit('module:hover', { module: moduleName });
      });

      node.addEventListener('mouseleave', () => {
        window.NexyrothSignals.emit('module:leave', { module: moduleName });
      });

      // Touch parity: a tap both hovers and (shortly after) leaves, so
      // mobile users get the same reactive moment instead of nothing.
      node.addEventListener('touchstart', () => {
        window.NexyrothSignals.emit('module:hover', { module: moduleName });
      }, { passive: true });
      node.addEventListener('touchend', () => {
        window.NexyrothSignals.emit('module:leave', { module: moduleName });
      }, { passive: true });
    });

    setupLaunchButton();
  }

  function setupLaunchButton() {
    // Task 5's explicit example: hovering the Launch button should read
    // as "Preparing kernel..." in the Terminal, same as any other
    // module:hover -- reuses the 'kernel' module key Terminal already
    // maps to that exact phrase, no new listener vocabulary needed.
    const btn = document.getElementById('launchBtn');
    if (!btn || !window.NexyrothSignals) return;

    btn.addEventListener('mouseenter', () => {
      window.NexyrothSignals.emit('module:hover', { module: 'kernel' });
    });
    btn.addEventListener('mouseleave', () => {
      window.NexyrothSignals.emit('module:leave', { module: 'kernel' });
    });
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // No-op pause/resume: this module only attaches hover/touch listeners
  // once in init() -- there's no ongoing per-frame work to pause. Exposed
  // for lifecycle-shape consistency with every other module.
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return { init: init, ready: ready, pause: pause, resume: resume, destroy: destroy };
})();
