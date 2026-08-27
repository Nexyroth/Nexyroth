/**
 * NEXYROTH OS — CINEMATIC ANIME.JS ORCHESTRATOR v3.0
 * Pure Motion-Driven Storytelling.
 * 
 * CHAPTERS:
 * Chapter 1: Awakening (Hero)
 * Chapter 2: Architecture (Modular Grid)
 * Chapter 3: AI & Neural Core
 * Chapter 4: Technology & Realtime Engine
 * Chapter 5: Future & Vision
 * Chapter 6: Launch Terminal
 */

window.Animations = (function() {
  'use strict';

  let hasAnime = typeof anime !== 'undefined';

  function init() {
    if (!hasAnime && typeof anime !== 'undefined') {
      hasAnime = true;
    }

    console.log('✓ Cinematic Anime.js Orchestrator initialized');
    setupSectionTransitions();
    setupAnimatedCounters();
    setupStaggeredCards();
  }

  /**
   * Staggered Counter Animation using Anime.js
   */
  function setupAnimatedCounters() {
    const statElements = document.querySelectorAll('.stat-number, [data-counter]');
    if (!statElements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const endValue = parseFloat(target.getAttribute('data-value') || target.textContent.replace(/[^0-9.]/g, '')) || 100;
          const prefix = target.getAttribute('data-prefix') || '';
          const suffix = target.getAttribute('data-suffix') || '';

          if (hasAnime) {
            const obj = { val: 0 };
            anime({
              targets: obj,
              val: endValue,
              round: endValue % 1 === 0 ? 1 : 10,
              easing: 'easeOutExpo',
              duration: 2000,
              update: function() {
                target.textContent = prefix + obj.val + suffix;
              }
            });
          } else {
            target.textContent = prefix + endValue + suffix;
          }
          observer.unobserve(target);
        }
      });
    }, { threshold: 0.5 });

    statElements.forEach(el => observer.observe(el));
  }

  /**
   * Chapter-based Cinematic Transitions with unique motions per section
   */
  function setupSectionTransitions() {
    const sections = document.querySelectorAll('section, .chapter-section');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target;
          const sectionId = section.id || section.getAttribute('data-chapter');

          playChapterMotion(section, sectionId);
          observer.unobserve(section);
        }
      });
    }, { threshold: 0.2 });

    sections.forEach(sec => observer.observe(sec));
  }

  function playChapterMotion(section, sectionId) {
    if (!hasAnime) {
      section.classList.add('chapter-revealed');
      return;
    }

    switch (sectionId) {
      case 'hero':
      case 'chapter-awakening':
        // Camera Zoom Out Effect
        anime({
          targets: '#hero .hero-content',
          scale: [1.08, 1],
          opacity: [0, 1],
          translateY: [40, 0],
          duration: 1200,
          easing: 'easeOutQuart'
        });
        break;

      case 'features':
      case 'architecture':
      case 'chapter-architecture':
        // Fade + Subtle 3D Rotate
        anime({
          targets: section.querySelectorAll('.grid-card, .feature-card, .arch-card'),
          opacity: [0, 1],
          translateY: [50, 0],
          rotateX: [12, 0],
          delay: anime.stagger(100),
          duration: 1000,
          easing: 'easeOutCubic'
        });
        break;

      case 'technology':
      case 'chapter-tech':
        // Light Sweep & Tech Stack Stagger
        anime({
          targets: section.querySelectorAll('.tech-pill, .stack-item, .tech-card'),
          opacity: [0, 1],
          scale: [0.85, 1],
          delay: anime.stagger(60, { start: 200 }),
          duration: 800,
          easing: 'easeOutBack'
        });
        break;

      case 'roadmap':
      case 'chapter-future':
        // Sequential Build -- updated to target Mission Control's actual
        // markup (.mission-node). Previously targeted .timeline-item,
        // .roadmap-card -- neither exists since the Phase 6 rebuild,
        // so this whole reveal had gone silently dead (querySelectorAll
        // matching nothing throws nothing, so it was never an error,
        // just a section that stopped animating in on scroll).
        anime({
          targets: section.querySelectorAll('.mission-node'),
          opacity: [0, 1],
          translateX: [-40, 0],
          delay: anime.stagger(120),
          duration: 900,
          easing: 'easeOutExpo'
        });
        break;

      case 'vision':
      case 'chapter-launch':
        // Logo Assembly & Kinetic Text
        anime({
          targets: section.querySelectorAll('.vision-title, .vision-card, .cta-box'),
          opacity: [0, 1],
          translateY: [30, 0],
          scale: [0.96, 1],
          delay: anime.stagger(120),
          duration: 1000,
          easing: 'easeOutElastic(1, .8)'
        });
        break;

      default:
        anime({
          targets: section,
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 800,
          easing: 'easeOutCubic'
        });
        break;
    }
  }

  function setupStaggeredCards() {
    const cardGrids = document.querySelectorAll('.cards-grid, .features-grid, .tech-grid');
    cardGrids.forEach(grid => {
      const cards = grid.children;
      if (!cards.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && hasAnime) {
            anime({
              targets: cards,
              opacity: [0, 1],
              translateY: [40, 0],
              delay: anime.stagger(80),
              duration: 800,
              easing: 'easeOutQuad'
            });
            observer.unobserve(grid);
          }
        });
      }, { threshold: 0.1 });

      observer.observe(grid);
    });
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  function pause() {}
  function resume() {}
  function ready() {}
  function destroy() {}

  return {
    init: init,
    setupAnimatedCounters: setupAnimatedCounters,
    playChapterMotion: playChapterMotion,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();