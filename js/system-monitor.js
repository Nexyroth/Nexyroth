/**
 * NEXYROTH OS — SYSTEM MONITOR v2.0
 * Simulates real-time OS telemetry with Draggable Floating Widget capability.
 */

window.SystemMonitor = (function() {
  'use strict';

  const STORAGE_KEY = 'nexyroth_monitor_position';
  const SNAP_THRESHOLD = 20;

  const elements = {
    monitor: null,
    cpuBar: null,
    cpuValue: null,
    ramBar: null,
    ramValue: null,
    netValue: null,
    fpsValue: null,
    clock: null
  };

  let lastTime = window.performance ? window.performance.now() : Date.now();
  let frames = 0;
  let fps = 60;
  let fpsRafId = null;
  let statsIntervalId = null;
  let clockIntervalId = null;

  // Dragging state variables
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  function init() {
    elements.monitor = document.getElementById('systemMonitor');
    if (!elements.monitor) return;

    elements.cpuBar = document.getElementById('cpuBar');
    elements.cpuValue = document.getElementById('cpuValue');
    elements.ramBar = document.getElementById('ramBar');
    elements.ramValue = document.getElementById('ramValue');
    elements.netValue = document.getElementById('netValue');
    elements.fpsValue = document.getElementById('fpsValue');
    elements.clock = document.getElementById('systemClock');

    // Restore saved position or set default (top: 90px, left: 20px)
    restorePosition();

    // Enable drag interaction
    makeDraggable();

    setupSignalListener();

    // Activate widget
    elements.monitor.classList.add('active');

    // Start telemetry updates
    updateStats();
    statsIntervalId = setInterval(updateStats, 2000);
    updateClock();
    clockIntervalId = setInterval(updateClock, 1000);
    fpsRafId = requestAnimationFrame(measureFPS);

    console.log('✓ System Monitor initialized');
  }

  // NOTE (Phase 7): a setupVisibilityPause() function used to live here
  // with its own document.addEventListener('visibilitychange', ...).
  // Removed -- js/kernel-runtime.js now owns the one visibilitychange
  // listener for the whole app and calls this module's pause()/resume()
  // (public API below) directly instead.

  function restorePosition() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { left, top } = JSON.parse(saved);
        // Ensure within screen bounds
        const maxLeft = Math.max(10, window.innerWidth - elements.monitor.offsetWidth - 10);
        const maxTop = Math.max(10, window.innerHeight - elements.monitor.offsetHeight - 10);

        const safeLeft = Math.min(Math.max(10, left), maxLeft);
        const safeTop = Math.min(Math.max(80, top), maxTop); // Keep below navbar

        elements.monitor.style.left = `${safeLeft}px`;
        elements.monitor.style.top = `${safeTop}px`;
        return;
      }
    } catch (e) {
      console.warn('[SystemMonitor] Could not load saved position:', e);
    }

    // Default positioning
    elements.monitor.style.top = '90px';
    elements.monitor.style.left = '20px';
  }

  function savePosition(left, top) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    } catch (e) {
      console.warn('[SystemMonitor] Could not save position:', e);
    }
  }

  function makeDraggable() {
    const monitor = elements.monitor;

    monitor.addEventListener('mousedown', onMouseDown);
    touchDraggable(monitor);
  }

  function onMouseDown(e) {
    // Only primary mouse button
    if (e.button !== 0) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = elements.monitor.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    elements.monitor.classList.add('dragging');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault();
  }

  function onMouseMove(e) {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    let newLeft = initialLeft + deltaX;
    let newTop = initialTop + deltaY;

    // Window boundaries & Edge Snapping
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const widgetWidth = elements.monitor.offsetWidth;
    const widgetHeight = elements.monitor.offsetHeight;

    // Snap to left edge
    if (newLeft < SNAP_THRESHOLD) newLeft = 10;
    // Snap to right edge
    if (newLeft + widgetWidth > windowWidth - SNAP_THRESHOLD) {
      newLeft = windowWidth - widgetWidth - 10;
    }

    // Snap to top edge (leave room for navbar)
    if (newTop < 80 + SNAP_THRESHOLD) newTop = 80;
    // Snap to bottom edge
    if (newTop + widgetHeight > windowHeight - SNAP_THRESHOLD) {
      newTop = windowHeight - widgetHeight - 10;
    }

    // Clamp absolute limits
    newLeft = Math.max(10, Math.min(newLeft, windowWidth - widgetWidth - 10));
    newTop = Math.max(80, Math.min(newTop, windowHeight - widgetHeight - 10));

    elements.monitor.style.left = `${newLeft}px`;
    elements.monitor.style.top = `${newTop}px`;
  }

  function onMouseUp() {
    if (!isDragging) return;

    isDragging = false;
    elements.monitor.classList.remove('dragging');

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    const rect = elements.monitor.getBoundingClientRect();
    savePosition(rect.left, rect.top);
  }

  function touchDraggable(monitor) {
    monitor.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      isDragging = true;
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;

      const rect = monitor.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      monitor.classList.add('dragging');
    }, { passive: true });

    monitor.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartX;
      const deltaY = touch.clientY - dragStartY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      newLeft = Math.max(10, Math.min(newLeft, window.innerWidth - monitor.offsetWidth - 10));
      newTop = Math.max(80, Math.min(newTop, window.innerHeight - monitor.offsetHeight - 10));

      monitor.style.left = `${newLeft}px`;
      monitor.style.top = `${newTop}px`;
    }, { passive: true });

    monitor.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      monitor.classList.remove('dragging');

      const rect = monitor.getBoundingClientRect();
      savePosition(rect.left, rect.top);
    });
  }

  function updateStats() {
    const now = Date.now();

    // Ambient Life: idle means idle -- low, barely-moving numbers,
    // not the normal random baseline pretending something is happening.
    if (isSystemIdle) {
      if (elements.cpuBar) elements.cpuBar.style.width = '2%';
      if (elements.cpuValue) elements.cpuValue.textContent = '2%';
      if (elements.ramBar) elements.ramBar.style.width = '18%';
      if (elements.ramValue) elements.ramValue.textContent = '18%';
      if (elements.netValue) elements.netValue.textContent = '0.0 KB/s';
      return;
    }

    // Signal-driven boost, layered on top of the baseline random noise.
    // Decays linearly as the boost window closes rather than snapping
    // back to baseline -- reads as a spike settling, not a toggle.
    const cpuActive = now < cpuBoostExpires ? cpuBoostAmount * ((cpuBoostExpires - now) / BOOST_DURATION) : 0;
    const netActive = now < netBoostExpires ? netBoostAmount * ((netBoostExpires - now) / BOOST_DURATION) : 0;

    const cpu = Math.min(98, Math.floor(15 + Math.random() * 25 + cpuActive));
    if (elements.cpuBar) elements.cpuBar.style.width = `${cpu}%`;
    if (elements.cpuValue) elements.cpuValue.textContent = `${cpu}%`;

    const ram = Math.floor(42 + Math.random() * 5);
    if (elements.ramBar) elements.ramBar.style.width = `${ram}%`;
    if (elements.ramValue) elements.ramValue.textContent = `${ram}%`;

    const net = (Math.random() * 150 + netActive).toFixed(1);
    if (elements.netValue) elements.netValue.textContent = `${net} KB/s`;
  }

  const BOOST_DURATION = 2200; // ms
  let cpuBoostAmount = 0, cpuBoostExpires = 0;
  let netBoostAmount = 0, netBoostExpires = 0;
  let isSystemIdle = false;

  function setupSignalListener() {
    if (!window.NexyrothSignals) return;

    // System Monitor "reading real website state" per Phase 5, without
    // ever needing to know Architecture exists -- it only listens on the
    // shared bus (js/signal-bus.js). CPU reacts to compute-flavored
    // modules (AI/Kernel/rendering-ish Music+Game); Network reacts to
    // I/O-flavored ones (Plugin/Browser/Terminal). This widget only has
    // CPU/RAM/Network readouts (no separate GPU or process-count meter),
    // so those are the two that make sense to drive here.
    window.NexyrothSignals.on('module:hover', (payload) => {
      const now = Date.now();
      if (payload.module === 'ai' || payload.module === 'kernel') {
        cpuBoostAmount = 40;
        cpuBoostExpires = now + BOOST_DURATION;
      } else if (payload.module === 'music' || payload.module === 'game') {
        cpuBoostAmount = 22;
        cpuBoostExpires = now + BOOST_DURATION;
      } else if (
        payload.module === 'plugin' || payload.module === 'browser' ||
        payload.module === 'terminal' || payload.module === 'cloud' ||
        payload.module === 'plugin-marketplace'
      ) {
        netBoostAmount = 240;
        netBoostExpires = now + BOOST_DURATION;
      }
      // 'future' has no metric mapping -- it's a symbolic node (Mission
      // Control's "what comes after launch"), not a real subsystem, so
      // there's nothing honest to spike on the monitor for it.
    });

    // Ambient Life (Task 4): show the monitor genuinely idling rather
    // than pretending to be busy when nobody's around.
    window.NexyrothSignals.on('system:idle', () => {
      isSystemIdle = true;
      if (elements.monitor) elements.monitor.classList.add('idle');
    });
    window.NexyrothSignals.on('system:wake', () => {
      isSystemIdle = false;
      if (elements.monitor) elements.monitor.classList.remove('idle');
    });

    // Footer Shutdown Sequence (Task 3): rows switch off one at a time
    // rather than the whole widget vanishing at once.
    window.NexyrothSignals.on('system:shutdown', () => {
      if (!elements.monitor) return;
      const statusEl = elements.monitor.querySelector('.monitor-status');
      if (statusEl) statusEl.textContent = 'OFFLINE';
      const rows = elements.monitor.querySelectorAll('.monitor-item');
      rows.forEach((row, i) => {
        setTimeout(() => {
          row.classList.add('offline');
        }, i * 400);
      });
    });
  }

  function updateClock() {
    if (!elements.clock) return;
    const now = new Date();
    elements.clock.textContent = now.toTimeString().split(' ')[0];
  }

  function measureFPS(now) {
    frames++;
    const currentTime = now || (window.performance ? window.performance.now() : Date.now());

    if (currentTime > lastTime + 1000) {
      fps = Math.round((frames * 1000) / (currentTime - lastTime));
      if (elements.fpsValue) elements.fpsValue.textContent = fps;
      frames = 0;
      lastTime = currentTime;
    }
    fpsRafId = requestAnimationFrame(measureFPS);
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {
    if (fpsRafId) cancelAnimationFrame(fpsRafId);
    if (statsIntervalId) clearInterval(statsIntervalId);
    if (clockIntervalId) clearInterval(clockIntervalId);
    fpsRafId = statsIntervalId = clockIntervalId = null;
  }

  function resume() {
    if (!elements.monitor) return;
    if (!fpsRafId) fpsRafId = requestAnimationFrame(measureFPS);
    if (!statsIntervalId) statsIntervalId = setInterval(updateStats, 2000);
    if (!clockIntervalId) clockIntervalId = setInterval(updateClock, 1000);
  }

  function ready() {
    // Exists for lifecycle-shape consistency (Task 11) -- init() already
    // does everything this module needs before it's usable.
  }

  function destroy() {
    pause();
    if (elements.monitor) elements.monitor.classList.remove('active');
  }

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy,
    getFPS: () => fps
  };
})();