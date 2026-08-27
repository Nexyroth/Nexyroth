/**
 * NEXYROTH OS — PREMIUM MICRO-INTERACTIONS v3.0
 * 
 * Every component has its own personality:
 * - Buttons: Magnetic pull + ripple + elastic press
 * - Cards: 3D tilt + dynamic reflection + border glow
 * - Nav links: Magnetic + underline sweep
 * - Timeline: Depth reveal + glow trail
 * - Social icons: Magnetic + color shift
 * 
 * Per motion.csv: Hover micro-interactions use 150-300ms, power2.out easing.
 * Per ui-reasoning.csv: Nexyroth is "Futuristic OS" → Holographic/HUD + Dark Mode.
 */

window.Interactions = (function() {
  'use strict';

  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    if (reducedMotion) return;
    setupMagneticButtons();
    setupDynamicBorderGlow();
    setupNavMagnetic();
    setupSocialMagnetic();
    setupRippleEffect();
    setupButtonPress();
    setupMouseSpeedGlow();
  }

  // ─── 1. MAGNETIC BUTTONS (Elastic Pull) ────────────────────────────────
  // motion.csv Tier: Complex hover, elastic.out(1,0.4), 300-500ms
  function setupMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-ghost, .btn-outline');
    
    buttons.forEach(btn => {
      let rafId = null;
      let currentX = 0, currentY = 0;
      let targetX = 0, targetY = 0;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        targetX = (e.clientX - rect.left - rect.width / 2) * 0.25;
        targetY = (e.clientY - rect.top - rect.height / 2) * 0.25;

        if (!rafId) {
          const animate = () => {
            currentX += (targetX - currentX) * 0.15;
            currentY += (targetY - currentY) * 0.15;
            btn.style.transform = `translate(${currentX}px, ${currentY}px)`;
            if (Math.abs(currentX - targetX) > 0.1 || Math.abs(currentY - targetY) > 0.1) {
              rafId = requestAnimationFrame(animate);
            } else {
              rafId = null;
            }
          };
          rafId = requestAnimationFrame(animate);
        }
      });

      btn.addEventListener('mouseleave', () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        currentX = 0; currentY = 0;
        btn.style.transform = '';
      });
    });
  }

  // ─── 2. CARD 3D TILT PREMIUM ───────────────────────────────────────────
  // motion.csv Tier: Standard hover, 200-300ms, power2.out
  // Card hover effects: previously three independent, uncoordinated JS
  // effects (3D tilt, light-sweep reflection, border glow) all fired on
  // the same mousemove across the same cards -- flagged in an earlier
  // design review as competing rather than reinforcing each other, and
  // not serving any particular narrative. Phase 4 asks for cards to read
  // as "modules waking up" with one coherent signal, so this keeps only
  // the border energy-glow (renamed in spirit to "energy flow" below) and
  // drops the tilt + reflection effects entirely rather than layering a
  // fourth effect on top of three already-competing ones.
  function setupDynamicBorderGlow() {
    const cards = document.querySelectorAll('.feature-card, .tech-card, .module-card, .arch-card');
    
    cards.forEach(card => {
      const border = document.createElement('div');
      border.className = 'card-border-glow';
      border.style.cssText = `
        position: absolute; inset: -1px; pointer-events: none;
        border-radius: inherit; z-index: 3;
        opacity: 0; transition: opacity 0.3s ease;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        -webkit-mask-composite: xor;
        padding: 1px;
      `;
      card.style.position = 'relative';
      card.appendChild(border);

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        // Single-hue cyan energy glow -- was cyan+violet; narrowed to one
        // signature color for the same reason the Hero gradient text was
        // narrowed in Phase 3 (one accent color reads as a signal, two
        // competing neon hues reads as a template default).
        border.style.background = `
          radial-gradient(circle at ${x}% ${y}%, 
            rgba(26, 201, 255, 0.5) 0%, 
            rgba(26, 201, 255, 0.15) 40%, 
            transparent 70%
          )
        `;
        border.style.opacity = '1';
      });

      card.addEventListener('mouseleave', () => {
        border.style.opacity = '0';
      });
    });
  }

  // ─── 5. NAV MAGNETIC (Smooth Follow) ───────────────────────────────────
  function setupNavMagnetic() {
    const navLinks = document.querySelectorAll('.nav-link, .nav-item a');
    
    navLinks.forEach(link => {
      link.addEventListener('mousemove', (e) => {
        const rect = link.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.2;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.2;
        link.style.transform = `translate(${x}px, ${y}px)`;
      });

      link.addEventListener('mouseleave', () => {
        link.style.transform = '';
      });
    });
  }

  // ─── 6. TIMELINE HOVER (Depth Reveal) ──────────────────────────────────
  // NOTE (Phase 6 motion audit): a setupTimelineHover() function used to
  // live here, targeting .timeline-item/.roadmap-card/.timeline-dot/
  // .roadmap-dot -- none of which exist since Mission Control replaced
  // the old vertical timeline. Its job (dot glow + translateX on hover)
  // is now fully covered by .mission-node:hover in css/components.css,
  // so this wasn't ported, just removed.

  // ─── 7. SOCIAL MAGNETIC ────────────────────────────────────────────────
  function setupSocialMagnetic() {
    const socialLinks = document.querySelectorAll('.footer-social a, .social-link');
    
    socialLinks.forEach(link => {
      link.addEventListener('mousemove', (e) => {
        const rect = link.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.4;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.4;
        link.style.transform = `translate(${x}px, ${y}px) scale(1.15)`;
        link.style.transition = 'transform 0.1s ease';
      });

      link.addEventListener('mouseleave', () => {
        link.style.transform = '';
        link.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });
    });
  }

  // ─── 8. RIPPLE EFFECT ──────────────────────────────────────────────────
  function setupRippleEffect() {
    const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-ghost, .btn-outline');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        ripple.style.cssText = `
          position: absolute; left: ${x}px; top: ${y}px;
          width: 0; height: 0; border-radius: 50%;
          background: rgba(0, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: rippleAnim 0.6s ease-out forwards;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      });
    });
  }

  // ─── 9. BUTTON PRESS (Elastic Scale) ───────────────────────────────────
  function setupButtonPress() {
    const buttons = document.querySelectorAll('.btn, .btn-primary, .btn-ghost, .btn-outline');
    
    buttons.forEach(btn => {
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.96)';
        btn.style.transition = 'transform 0.1s ease';
      });

      btn.addEventListener('mouseup', () => {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ─── 10. MOUSE SPEED GLOW ──────────────────────────────────────────────
  function setupMouseSpeedGlow() {
    const glowElements = document.querySelectorAll('.hero-glow, .bg-glow, .mouse-glow');
    if (!glowElements.length) return;

    let lastX = 0, lastY = 0;
    let speed = 0;
    let rafId = null;

    document.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      speed = Math.sqrt(dx * dx + dy * dy);
      lastX = e.clientX;
      lastY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          glowElements.forEach(el => {
            const intensity = Math.min(speed / 20, 1);
            el.style.setProperty('--glow-intensity', intensity);
          });
          rafId = null;
        });
      }
    });
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // No-op pause/resume: every rAF loop here is bounded (self-terminates
  // on mouseleave or convergence, or is a one-shot-per-mousemove debounce
  // -- confirmed in the Phase 6 audit), not a perpetual loop.
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