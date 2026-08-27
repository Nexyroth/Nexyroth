/**
 * NEXYROTH OS — EASTER EGGS & HIDDEN INTERACTIONS
 * "The details are not the details. They make the design."
 */

window.EasterEggs = (function() {
  'use strict';

  let konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIndex = 0;

  function init() {
    document.addEventListener('keydown', handleKeyDown);
    setupLogoReplay();
    setupTerminalSecret();
    console.log("%cNEXYROTH OS %cSystem ready. Try the Konami code.", "color: #00ffff; font-weight: bold; font-size: 20px;", "color: #888;");
  }

  function handleKeyDown(e) {
    // Konami Code Check
    if (e.key === konamiCode[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === konamiCode.length) {
        activateMatrixMode();
        konamiIndex = 0;
      }
    } else {
      konamiIndex = 0;
    }

    // Re-boot shortcut (Ctrl + Shift + R)
    if (e.ctrlKey && e.shiftKey && e.key === 'B') {
      e.preventDefault();
      replayBootSequence();
    }
  }

  function activateMatrixMode() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,20,0,0.9); z-index:100000; color:#0f0; font-family:monospace; padding:20px; overflow:hidden; pointer-events:none;';
    overlay.id = 'matrixOverlay';
    document.body.appendChild(overlay);

    let lines = 0;
    const interval = setInterval(() => {
      const line = document.createElement('div');
      line.textContent = Math.random().toString(2).substring(2, 15);
      line.style.opacity = Math.random();
      overlay.appendChild(line);
      overlay.scrollTop = overlay.scrollHeight;
      lines++;
      if (lines > 100) clearInterval(interval);
    }, 50);

    setTimeout(() => {
      overlay.style.transition = 'opacity 2s ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 2000);
    }, 5000);
  }

  function replayBootSequence() {
    // boot.js already owns a correct replay() implementation that clones
    // #bootLoaderTemplate, sets its internal bootEl closure variable, and
    // resets its own hasCompleted/aborted state. This function used to
    // duplicate that DOM-cloning logic here AND call
    // `window.BootSequence.init()`, which was never a real method on the
    // public API (only `start` and `replay` are exposed) -- so this threw
    // an uncaught TypeError every time it ran, and even without that bug,
    // boot.js's internal bootEl reference would never have been updated,
    // leaving the two modules' boot state out of sync. Delegating to the
    // single real implementation fixes both problems at once.
    if (window.BootSequence && window.BootSequence.replay) {
      window.BootSequence.replay();
    } else {
      console.warn('[EasterEggs] BootSequence.replay() not available.');
    }
  }

  function setupLogoReplay() {
    const logo = document.querySelector('.nav-logo');
    if (logo) {
      logo.addEventListener('dblclick', () => {
        replayBootSequence();
      });
    }
  }

  function setupTerminalSecret() {
    // Listen for specific commands in the terminal simulation if needed
    // Currently handled in terminal.js, but we can hook here
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return {
    init: init,
    replayBoot: replayBootSequence,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();

// NOTE: previously self-init'd on DOMContentLoaded, independent of the
// boot-gated sequence -- now called from js/main.js's managed module
// list, after Hero Reveal like every other module.