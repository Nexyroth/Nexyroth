/**
 * LIVE ROADMAP (Mission Control)
 *
 * The emit side for the Roadmap section, exactly parallel to
 * js/live-architecture.js. Deliberately reuses the same 'module:hover' /
 * 'module:leave' signal names and the same { module: '<name>' } payload
 * shape -- Terminal, SystemMonitor, Cursor, and EnergyCore already listen
 * for those signals (see js/signal-bus.js) and need zero changes to also
 * react to Mission Control nodes. Two emitters, one shared vocabulary,
 * no new listener code required for it to "just work" for whichever
 * module keys those listeners already recognize (kernel/ai/music/game/
 * plugin/browser/terminal). New module keys this section introduces
 * (cloud, plugin-marketplace, future) that a listener doesn't recognize
 * are handled gracefully by each listener's own existing fallback (no
 * match -> no-op), not a special case here.
 */

window.LiveRoadmap = (function () {
  'use strict';

  function init() {
    const nodes = document.querySelectorAll('.mission-node[data-module]');
    if (!nodes.length || !window.NexyrothSignals) return;

    nodes.forEach((node) => {
      const moduleName = node.getAttribute('data-module');

      node.addEventListener('mouseenter', () => {
        window.NexyrothSignals.emit('module:hover', { module: moduleName });
      });

      node.addEventListener('mouseleave', () => {
        window.NexyrothSignals.emit('module:leave', { module: moduleName });
      });

      node.addEventListener('touchstart', () => {
        window.NexyrothSignals.emit('module:hover', { module: moduleName });
      }, { passive: true });
      node.addEventListener('touchend', () => {
        window.NexyrothSignals.emit('module:leave', { module: moduleName });
      }, { passive: true });
    });
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return { init: init, ready: ready, pause: pause, resume: resume, destroy: destroy };
})();
