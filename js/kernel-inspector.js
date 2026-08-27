/**
 * KERNEL INSPECTOR (Phase 7, Task 4 + Task 5)
 *
 * A developer-only panel, not part of the product experience -- opened
 * with Ctrl+Shift+K, closed the same way or with Escape. Its DOM is built
 * lazily on first open (not present in index.html at all), so it costs
 * regular visitors nothing beyond this one small script registering a
 * keydown listener.
 *
 * Shows a live snapshot of js/kernel-runtime.js's state + module
 * registry, plus a realtime timeline of kernel events (Task 5) sourced
 * directly from kernel.getEventLog() / the signal bus's own rolling
 * emission log -- this file doesn't maintain its own duplicate log, it
 * just renders the ones that already exist for other reasons.
 */

window.KernelInspector = (function () {
  'use strict';

  let panelEl = null;
  let isOpen = false;
  let refreshTimer = null;
  const REFRESH_MS = 500;

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    });
  }

  function toggle() {
    if (isOpen) close(); else open();
  }

  function open() {
    if (!panelEl) buildPanel();
    panelEl.style.display = 'block';
    isOpen = true;
    render();
    refreshTimer = setInterval(render, REFRESH_MS);
  }

  function close() {
    if (panelEl) panelEl.style.display = 'none';
    isOpen = false;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function buildPanel() {
    panelEl = document.createElement('div');
    panelEl.id = 'kernelInspector';
    panelEl.setAttribute('role', 'complementary');
    panelEl.setAttribute('aria-label', 'Kernel Inspector (developer tool)');
    panelEl.innerHTML = `
      <div class="ki-header">
        <span class="ki-title">KERNEL INSPECTOR</span>
        <span class="ki-close" id="kiClose">&times;</span>
      </div>
      <div class="ki-body">
        <div class="ki-section" id="kiOverview"></div>
        <div class="ki-section" id="kiModules"></div>
        <div class="ki-section" id="kiSignals"></div>
        <div class="ki-section" id="kiTimeline"></div>
      </div>
    `;
    document.body.appendChild(panelEl);
    document.getElementById('kiClose').addEventListener('click', close);
  }

  function fmtMs(ms) {
    if (ms < 1000) return ms + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  function render() {
    if (!panelEl) return;
    renderOverview();
    renderModules();
    renderSignals();
    renderTimeline();
  }

  function renderOverview() {
    const el = document.getElementById('kiOverview');
    if (!el) return;

    const kernel = window.KernelRuntime;
    const sysMon = window.SystemMonitor;
    const ambient = window.AmbientLife;
    const shutdown = window.ShutdownSequence;

    const fps = sysMon && sysMon.getFPS ? sysMon.getFPS() : '?';
    const memInfo = (performance && performance.memory)
      ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`
      : 'unavailable (non-Chromium)';
    const idleStatus = ambient && ambient.getStatus ? ambient.getStatus() : null;
    const activeSection = document.querySelector('.nav-link.active');
    const animCount = (typeof document.getAnimations === 'function')
      ? document.getAnimations().length
      : 'unavailable';

    el.innerHTML = `
      <h4>Overview</h4>
      <table class="ki-table">
        <tr><td>Kernel Version</td><td>${kernel ? kernel.VERSION : 'N/A'}</td></tr>
        <tr><td>Current State</td><td class="ki-state-${kernel ? kernel.getState() : 'unknown'}">${kernel ? kernel.getState() : 'N/A'}</td></tr>
        <tr><td>Current FPS</td><td>${fps}</td></tr>
        <tr><td>Memory Usage</td><td>${memInfo}</td></tr>
        <tr><td>Active Section</td><td>${activeSection ? activeSection.getAttribute('href') : 'none'}</td></tr>
        <tr><td>Idle Timer</td><td>${idleStatus ? (idleStatus.isIdle ? 'IDLE' : fmtMs(idleStatus.msSinceActivity) + ' since activity') : 'N/A'}</td></tr>
        <tr><td>Shutdown Triggered</td><td>${shutdown && shutdown.hasTriggered ? shutdown.hasTriggered() : 'N/A'}</td></tr>
        <tr><td>Three.js</td><td>${window.THREE ? 'loaded' : 'not loaded'}</td></tr>
        <tr><td>GSAP</td><td>${window.gsap ? 'loaded' : 'not loaded'}</td></tr>
        <tr><td>Lenis</td><td>${window.NexyrothLenis ? 'active' : 'not active'}</td></tr>
        <tr><td>Animation Count</td><td>${animCount}</td></tr>
      </table>
    `;
  }

  function renderModules() {
    const el = document.getElementById('kiModules');
    if (!el) return;
    const kernel = window.KernelRuntime;
    if (!kernel) { el.innerHTML = '<h4>Modules</h4><div>Kernel Runtime not available</div>'; return; }

    const snapshot = kernel.getModuleSnapshot();
    const names = Object.keys(snapshot);
    const failed = names.filter((n) => snapshot[n].lifecycleState === 'registered'); // never reached ready/active

    let rows = names.map((name) => {
      const m = snapshot[name];
      return `<tr><td>${name}</td><td class="ki-state-${m.lifecycleState}">${m.lifecycleState}</td></tr>`;
    }).join('');

    el.innerHTML = `
      <h4>Modules (${names.length} registered, ${failed.length} stuck)</h4>
      <table class="ki-table">${rows}</table>
    `;
  }

  function renderSignals() {
    const el = document.getElementById('kiSignals');
    if (!el) return;
    const bus = window.NexyrothSignals;
    if (!bus || !bus.getRecentEmissions) { el.innerHTML = '<h4>Signal Queue</h4><div>Signal Bus not available</div>'; return; }

    const recent = bus.getRecentEmissions().slice(-8).reverse();
    const rows = recent.map((e) => {
      const payloadStr = e.payload && Object.keys(e.payload).length ? JSON.stringify(e.payload) : '';
      return `<tr><td>${new Date(e.time).toLocaleTimeString()}</td><td>${e.event}</td><td>${payloadStr}</td></tr>`;
    }).join('');

    el.innerHTML = `
      <h4>Signal Queue (last 8)</h4>
      <table class="ki-table ki-signals">${rows || '<tr><td colspan="3">no signals yet</td></tr>'}</table>
    `;
  }

  function renderTimeline() {
    const el = document.getElementById('kiTimeline');
    if (!el) return;
    const kernel = window.KernelRuntime;
    if (!kernel) { el.innerHTML = '<h4>Event Timeline</h4><div>Kernel Runtime not available</div>'; return; }

    const log = kernel.getEventLog().slice(-15).reverse();
    let prevTime = null;
    const rows = log.map((entry) => {
      const duration = prevTime !== null ? (prevTime - entry.time) : 0;
      prevTime = entry.time;
      return `<div class="ki-timeline-entry ki-event-${entry.type}">
        <span class="ki-timeline-time">${new Date(entry.time).toLocaleTimeString()}</span>
        <span class="ki-timeline-type">${entry.type}</span>
        <span class="ki-timeline-duration">${duration > 0 ? '+' + duration + 'ms' : ''}</span>
      </div>`;
    }).join('');

    el.innerHTML = `
      <h4>Event Timeline (last 15)</h4>
      <div class="ki-timeline">${rows || '<div>no events logged yet</div>'}</div>
    `;
  }

  return { init: init, ready: () => {}, pause: () => {}, resume: () => {}, destroy: close };
})();
