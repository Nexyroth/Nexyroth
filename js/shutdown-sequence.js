/**
 * SHUTDOWN SEQUENCE (Footer)
 *
 * Phase 6, Task 3: reaching the footer should feel like watching the OS
 * shut down, not like reaching the bottom of a webpage.
 *
 * This module's only job is detecting "user has scrolled to the footer"
 * and emitting one signal, 'system:shutdown', on the bus. Terminal,
 * EnergyCore, and SystemMonitor (see js/signal-bus.js for why this
 * pattern is used everywhere in this project) each independently own
 * their part of the sequence -- this file doesn't know or care what any
 * of them do in response.
 *
 * One-way by design: once triggered, it doesn't reverse if the user
 * scrolls back up (a real OS doesn't un-shut-down because you looked
 * away). A full page reload is the only way back -- boot runs again from
 * the top, which is thematically consistent with what boot already is.
 */

window.ShutdownSequence = (function () {
  'use strict';

  let triggered = false;

  function init() {
    const footer = document.querySelector('.footer');
    if (!footer || !window.NexyrothSignals) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          document.body.classList.add('os-shutting-down');
          window.NexyrothSignals.emit('system:shutdown', {});
          runFooterConsole();
          observer.unobserve(footer);
        }
      });
    }, { threshold: 0.4 });

    observer.observe(footer);
  }

  // The main Terminal (js/terminal.js) also reacts to 'system:shutdown',
  // but it lives in the Hero -- scrolled well out of view by the time
  // anyone reaches the footer to trigger this. This local console is the
  // one actually visible at the moment it matters. Kept in this file
  // rather than a separate module since it's UI that only exists as part
  // of this one sequence, not an independent concern.
  function runFooterConsole() {
    const console_ = document.getElementById('shutdownConsole');
    if (!console_) return;

    const steps = [
      'Saving session...',
      'Stopping services...',
      'Unmounting filesystem...'
    ];

    let i = 0;
    function nextLine() {
      if (i < steps.length) {
        appendLine(console_, steps[i]);
        i++;
        setTimeout(nextLine, 900);
      } else {
        appendLine(console_, '');
        appendLine(console_, 'Goodbye.');
        appendLine(console_, 'Nexyroth OS.');
        appendLine(console_, 'See you again.', true);
      }
    }
    nextLine();
  }

  function appendLine(container, text, isFinal) {
    const line = document.createElement('div');
    line.className = 'shutdown-line' + (isFinal ? ' shutdown-line-final' : '');
    line.textContent = text;
    container.appendChild(line);
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return { init: init, ready: ready, pause: pause, resume: resume, destroy: destroy, hasTriggered: () => triggered };
})();
