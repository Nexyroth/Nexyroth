/**
 * Hero Section Manager v4.0
 *
 * The canvas particle-network background (50 dots connecting with faint
 * lines when nearby) has been removed here. It was the single most
 * generic visual in the whole project -- functionally identical to
 * thousands of "AI startup" / crypto / SaaS templates going back to
 * ~2018 (the classic tsParticles look). Per Phase 3's explicit direction
 * ("bỏ bớt hiệu ứng cũ nếu cần, đổi lấy một ngôn ngữ thiết kế mạnh hơn"),
 * it is retired rather than kept alongside the new Energy Core -- the
 * Core (js/energy-core.js) now owns the Hero's signature visual role.
 *
 * What stays here: the stat counter animation, which is a content
 * behavior unrelated to the visual-identity problem.
 */

window.HeroEffects = (function() {
  'use strict';

  function init() {
    initStats();
  }

  function initStats() {
    const stats = document.querySelectorAll('.stat-value');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = parseInt(entry.target.getAttribute('data-target') || '0', 10);
          animateValue(entry.target, 0, target, 2000);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
  }

  function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        element.textContent = end.toString();
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current).toString();
      }
    }, 16);
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // No-op pause/resume: this module has no ongoing per-frame work since
  // its particle canvas was removed in Phase 3 (see file header) --
  // exposed anyway for lifecycle-shape consistency with every other
  // module, not because there's anything to actually pause here.
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();
