/**
 * Custom Cursor Professional
 * Desktop only, smooth lag, multiple states
 *
 * Phase 7: state hoisted from inside init() to module scope so pause()/
 * resume() (called by js/kernel-runtime.js, not by this file's own
 * visibilitychange listener anymore) can reach the rAF loop.
 */

window.CursorEffect = (function() {
  'use strict';

  let cursor = null, cursorDot = null;
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let dotX = 0, dotY = 0;
  const cursorSpeed = 0.15; // Lag factor for outer ring
  const dotSpeed = 0.25;    // Faster for dot
  let cursorRafId = null;
  let cursorPaused = false;
  let isDesktop = false;

  function animateCursor() {
    // Outer ring (slower)
    cursorX += (mouseX - cursorX) * cursorSpeed;
    cursorY += (mouseY - cursorY) * cursorSpeed;

    // Center dot (faster)
    dotX += (mouseX - dotX) * dotSpeed;
    dotY += (mouseY - dotY) * dotSpeed;

    cursor.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    cursorDot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;

    cursorRafId = requestAnimationFrame(animateCursor);
  }

  function init() {
    // Check if device supports fine pointer (desktop)
    isDesktop = window.matchMedia('(pointer: fine)').matches;
    if (!isDesktop) return;

    cursor = document.getElementById('customCursor');
    cursorDot = document.getElementById('customCursorDot');

    if (!cursor || !cursorDot) return;

    // Activate cursor after small delay
    setTimeout(() => {
      cursor.classList.add('active');
      cursorDot.classList.add('active');
    }, 100);

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    animateCursor();

    // Hover states for different elements
    const hoverTargets = {
      button: 'button, .btn, [role="button"]',
      link: 'a:not(.btn)',
      image: 'img, .image-hover',
      hover: '[data-cursor="hover"]'
    };

    // Add hover listeners
    function addHoverEffect(selector, className) {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('mouseenter', () => {
          cursor.classList.add(className);
          cursorDot.classList.add(className);
        });

        el.addEventListener('mouseleave', () => {
          cursor.classList.remove(className);
          cursorDot.classList.remove(className);
        });
      });
    }

    // Initialize hover effects
    addHoverEffect(hoverTargets.button, 'hover-button');
    addHoverEffect(hoverTargets.link, 'hover-link');
    addHoverEffect(hoverTargets.image, 'hover-image');
    addHoverEffect(hoverTargets.hover, 'hover');

    // Reacts to Architecture (or any future emitter) via the shared
    // signal bus -- cursor never needs to know Architecture exists.
    if (window.NexyrothSignals) {
      window.NexyrothSignals.on('module:hover', () => {
        cursor.classList.add('module-active');
        cursorDot.classList.add('module-active');
      });
      window.NexyrothSignals.on('module:leave', () => {
        cursor.classList.remove('module-active');
        cursorDot.classList.remove('module-active');
      });
    }

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      cursor.classList.add('hidden');
      cursorDot.classList.add('hidden');
    });

    document.addEventListener('mouseenter', () => {
      cursor.classList.remove('hidden');
      cursorDot.classList.remove('hidden');
    });

    // Magnetic effect for special elements
    const magneticElements = document.querySelectorAll('[data-cursor="magnetic"]');

    magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) * 0.3;
        const deltaY = (e.clientY - centerY) * 0.3;

        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0)';
      });
    });

    // Disable on reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cursor.style.transition = 'none';
      cursorDot.style.transition = 'none';
    }

    console.log('✓ Custom cursor initialized');
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // Kernel Runtime calls these directly instead of this module deciding
  // for itself via its own visibilitychange listener (removed here, same
  // as js/energy-core.js -- see that file's comments for the reasoning).
  function pause() {
    if (!isDesktop || !cursor) return;
    cursorPaused = true;
    if (cursorRafId) cancelAnimationFrame(cursorRafId);
    cursorRafId = null;
  }

  function resume() {
    if (!isDesktop || !cursor) return;
    if (cursorPaused) {
      cursorPaused = false;
      animateCursor();
    }
  }

  function ready() {
    // Exists for lifecycle-shape consistency with the rest of the
    // modules (Task 11) -- init() already does everything this module
    // needs before it's usable.
  }

  function destroy() {
    pause();
    if (cursor) { cursor.classList.add('hidden'); }
    if (cursorDot) { cursorDot.classList.add('hidden'); }
  }

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();
