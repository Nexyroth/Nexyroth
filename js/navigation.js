/**
 * Navigation Module
 *
 * Phase 7: converted from a plain object literal (window.Navigation = {
 * init() {...}, ... }) to the same IIFE-returning-an-object pattern every
 * other module in this project uses. This was a real, confirmed
 * inconsistency flagged by Task 11 ("khong con module viet theo nhieu
 * style khac nhau") -- Navigation was the one module written differently
 * from all the others, for no functional reason. Behavior is unchanged;
 * every `this.x` became a module-scope variable instead.
 */

window.Navigation = (function () {
  'use strict';

  let navbar = null;
  let navLinks = null;
  let mobileToggle = null;
  let lastScroll = 0;

  function init() {
    navbar = document.getElementById('navbar');
    navLinks = document.querySelectorAll('.nav-link');
    mobileToggle = document.getElementById('mobileMenuToggle');

    setupScrollBehavior();
    setupActiveLinks();
    setupMobileMenu();
  }

  function setupScrollBehavior() {
    // Previously missing { passive: true } -- the brief's own performance
    // requirements explicitly call for passive scroll listeners; without
    // it the browser can't assume this handler will never call
    // preventDefault(), which can block scroll-thread optimizations.
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;

      // Add scrolled class
      if (scrollY > 50) {
        navbar?.classList.add('scrolled');
      } else {
        navbar?.classList.remove('scrolled');
      }

      lastScroll = scrollY;
    }, { passive: true });
  }

  function setupActiveLinks() {
    // Smooth scroll
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href?.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Update active on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
              link.classList.remove('active');
              if (link.getAttribute('href') === `#${id}`) {
                link.classList.add('active');
              }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    document.querySelectorAll('section[id]').forEach(section => {
      observer.observe(section);
    });
  }

  function setupMobileMenu() {
    if (!mobileToggle || !navLinks || !navLinks.length) return;
    const navLinksContainer = document.querySelector('.nav-links');
    if (!navLinksContainer) return;
    const overlay = document.getElementById('mobileNavOverlay');

    const closeMenu = () => {
      const wasOpen = navLinksContainer.classList.contains('mobile-open');
      navLinksContainer.classList.remove('mobile-open');
      mobileToggle.classList.remove('active');
      mobileToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mobile-menu-open');
      overlay?.classList.remove('active');
      // Return focus to the trigger -- without this, a keyboard user who
      // opened the menu loses their place in the page entirely once it
      // closes (focus would otherwise remain on/inside a now-hidden link).
      if (wasOpen) mobileToggle.focus();
    };

    const openMenu = () => {
      navLinksContainer.classList.add('mobile-open');
      mobileToggle.classList.add('active');
      mobileToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mobile-menu-open');
      overlay?.classList.add('active');
      // Move focus into the menu so a keyboard/screen-reader user lands
      // somewhere meaningful instead of on a now-visually-relocated toggle.
      const firstLink = navLinksContainer.querySelector('.nav-link');
      if (firstLink) firstLink.focus();
    };

    overlay?.addEventListener('click', closeMenu);

    // Focus trap: while open, Tab/Shift+Tab cycle only within the menu's
    // own links instead of escaping into the page content sitting behind
    // it. Without this, a keyboard user can Tab straight past the open
    // menu into hero/section content that's still visually covered by it.
    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      if (!navLinksContainer.classList.contains('mobile-open')) return;

      const focusable = Array.from(navLinksContainer.querySelectorAll('.nav-link'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    mobileToggle.addEventListener('click', () => {
      const isOpen = navLinksContainer.classList.contains('mobile-open');
      if (isOpen) closeMenu(); else openMenu();
    });

    // Close on link click (so navigating actually dismisses the menu)
    navLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape and on outside click; trap Tab within the open menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
      trapFocus(e);
    });
    document.addEventListener('click', (e) => {
      const isOpen = navLinksContainer.classList.contains('mobile-open');
      if (!isOpen) return;
      if (!navLinksContainer.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMenu();
      }
    });

    // If the viewport grows back past the mobile breakpoint, don't leave
    // the menu stuck open with .nav-links now forced visible by desktop CSS.
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
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
