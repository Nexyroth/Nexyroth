/**
 * Smooth Scroll & Reveal Animations
 * Progress bar, scroll reveals, parallax
 */

window.ScrollManager = (function() {
  'use strict';

  function init() {
    // Scroll Progress Bar
    const scrollProgress = document.getElementById('scrollProgress');
    
    function updateScrollProgress() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      if (scrollProgress) {
        scrollProgress.style.transform = `scaleX(${progress / 100})`;
      }
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // Scroll hint ("Scroll to explore"): fade out and remove once the user
    // has actually started scrolling, instead of persisting for the whole
    // session. Also fixes the earlier CSS class collision (see
    // css/smooth-scroll.css) that was pinning this element to the wrong
    // position -- now that collision is gone, this is the only piece
    // still needed: the hint should disappear once its job is done.
    const scrollHint = document.querySelector('.scroll-indicator');
    if (scrollHint) {
      let hintDismissed = false;
      const dismissHint = () => {
        if (hintDismissed) return;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        if (progress > 0.12) {
          hintDismissed = true;
          scrollHint.style.transition = 'opacity 0.5s ease';
          scrollHint.style.opacity = '0';
          scrollHint.style.pointerEvents = 'none';
          setTimeout(() => scrollHint.remove(), 550);
          window.removeEventListener('scroll', dismissHint);
        }
      };
      window.addEventListener('scroll', dismissHint, { passive: true });
    }

    // Scroll Reveal with Intersection Observer
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    });

    // Observe all scroll-reveal elements
    document.querySelectorAll('.scroll-reveal, .scroll-reveal-fade-up, .scroll-reveal-scale, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-blur, .mask-reveal').forEach(el => {
      revealObserver.observe(el);
    });

    // Staggered reveals
    document.querySelectorAll('.scroll-reveal-stagger').forEach((el, index) => {
      el.style.transitionDelay = `${index * 100}ms`;
      revealObserver.observe(el);
    });

    // Parallax Effect
    const parallaxElements = document.querySelectorAll('[data-scroll-speed]');
    
    function updateParallax() {
      const scrollTop = window.pageYOffset;
      
      parallaxElements.forEach(el => {
        const speed = parseFloat(el.dataset.scrollSpeed) || 0.5;
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrollTop;
        const viewportHeight = window.innerHeight;
        
        if (rect.top < viewportHeight && rect.bottom > 0) {
          const translateY = (scrollTop - elementTop + viewportHeight) * (1 - speed) * 0.5;
          el.style.transform = `translateY(${translateY}px)`;
        }
      });
    }

    let parallaxFrame;
    window.addEventListener('scroll', () => {
      if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
      parallaxFrame = requestAnimationFrame(updateParallax);
    }, { passive: true });

    // Scroll to top button
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    if (scrollToTopBtn) {
      window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
          scrollToTopBtn.classList.add('visible');
        } else {
          scrollToTopBtn.classList.remove('visible');
        }
      }, { passive: true });
      
      scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Disable on reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-scroll-speed]').forEach(el => {
        el.style.transform = 'none';
      });
    }

    console.log('✓ Smooth scroll initialized');
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // No-op pause/resume: the parallax rAF here is a one-shot-per-scroll-
  // event debounce (self-cancelling, not a perpetual loop -- confirmed
  // in the Phase 6 audit), so there's no ongoing work to pause.
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