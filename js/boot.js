/**
 * NEXYROTH OS — CINEMATIC BOOT SEQUENCE v3
 * Director's Cut: Every frame has a reason to exist.
 * 
 * SEQUENCE:
 * [0.0s] VOID        — Pure black. The universe before.
 * [0.5s] POWER LED   — A single point of light.
 * [1.2s] CRT WARMUP  — The screen wakes up.
 * [2.0s] BIOS POST   — Hardware initialization.
 * [4.5s] MEMORY TEST — RAM allocation visualization.
 * [6.0s] KERNEL LOAD — The OS kernel streams in.
 * [8.0s] SIGNAL LOCK — Acquiring signal.
 * [9.5s] LOGO BIRTH  — Identity assembles from particles.
 * [11.5s] MATERIALIZE — The world comes into being.
 * [13.0s] HERO       — Welcome, Operator.
 */

window.BootSequence = (function () {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────────────
  let phase = 0;
  let canvas, ctx;
  let particles = [];
  let animFrame;
  let bootEl;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // CRITICAL: guards so complete() can only ever run once, and so the
  // fail-safe timer can cleanly abort an in-flight sequence instead of
  // racing it (previously: fail-safe fired at 6s while the full cinematic
  // chain took ~17s, so complete() ran twice -- double white-flash,
  // double NexyrothApp.init(), and DOM writes onto an already-removed
  // boot element).
  let hasCompleted = false;
  let aborted = false;

  // Cooperative cancellation point: every phase awaits this between steps.
  // If the fail-safe has fired, we stop scheduling further work instead of
  // letting the promise chain run to completion in the background.
  function checkAborted() {
    if (aborted) throw new Error('__BOOT_ABORTED__');
  }

  // Renders the END STATE of every boot phase instantly (no typing, no
  // per-bar stagger, no particle assembly) so prefers-reduced-motion users
  // still see the actual BIOS/kernel/logo content instead of a blank
  // black rectangle for 400-500ms. This is content parity, not motion --
  // exactly what reduced-motion is supposed to preserve.
  function renderReducedMotionSnapshot() {
    const led = bootEl.querySelector('.boot-led');
    if (led) { led.style.opacity = '1'; led.style.boxShadow = '0 0 8px #00ffff'; }

    const crt = bootEl.querySelector('.boot-crt');
    if (crt) crt.style.opacity = '1';

    const biosEl = bootEl.querySelector('.boot-bios');
    if (biosEl) {
      biosEl.innerHTML = biosLines.map(function(line) {
        return '<div class="bios-line" style="color:' + (line.color || '#f0f4ff') + '">' + line.text + '</div>';
      }).join('');
    }

    const memEl = bootEl.querySelector('.boot-memory');
    if (memEl) {
      memEl.querySelectorAll('.mem-bar').forEach(function(bar) { bar.style.width = '100%'; });
      memEl.querySelectorAll('.mem-status').forEach(function(s) { s.textContent = 'OK'; s.style.color = '#00ff88'; });
    }

    const kernelEl = bootEl.querySelector('.boot-kernel');
    if (kernelEl) {
      kernelEl.innerHTML = kernelLines.map(function(t) { return '<div class="kernel-line">' + t + '</div>'; }).join('');
    }

    const signalEl = bootEl.querySelector('.boot-signal');
    if (signalEl) {
      const ring = signalEl.querySelector('.signal-ring');
      const text = signalEl.querySelector('.signal-text');
      const pct = signalEl.querySelector('.signal-pct');
      if (ring) ring.style.borderColor = '#00ff88';
      if (text) { text.textContent = 'SIGNAL LOCKED'; text.style.color = '#00ff88'; }
      if (pct) pct.textContent = '100%';
    }

    const logoEl = bootEl.querySelector('.boot-logo-final');
    if (logoEl) {
      logoEl.style.opacity = '1';
      const logoText = logoEl.querySelector('.logo-text-final');
      if (logoText) { logoText.style.opacity = '1'; logoText.style.transform = 'scale(1)'; }
    }

    const finalEl = bootEl.querySelector('.boot-final');
    if (finalEl) {
      finalEl.style.display = 'flex';
      finalEl.style.opacity = '1';
      const welcomeText = finalEl.querySelector('.welcome-text');
      if (welcomeText) welcomeText.textContent = 'Welcome, Operator.';
    }
  }

  // ─── BIOS Data ────────────────────────────────────────────────────────────
  const biosLines = [
    { text: 'NEXYROTH BIOS v3.14.159  Copyright (C) 2026 Nexyroth Systems', delay: 0, color: '#f0f4ff' },
    { text: '', delay: 40 },
    { text: 'CPU: NEXYROTH NEURAL CORE x128  @ 4.20 GHz', delay: 80, color: '#00ffff' },
    { text: 'RAM: Testing...', delay: 120, color: '#f0f4ff', id: 'ram-line' },
    { text: 'GPU: NEXYROTH RENDER ENGINE  [WebGPU ENABLED]', delay: 400, color: '#00ffff' },
    { text: 'STORAGE: NX-NVME 2TB  [OK]', delay: 480, color: '#00ff88' },
    { text: 'NEURAL CORE: INITIALIZING...', delay: 560, color: '#a92eff' },
    { text: '', delay: 600 },
    { text: 'Press [DEL] to enter BIOS Setup  |  Press [F12] for Boot Menu', delay: 640, color: '#6699c2' },
  ];

  const kernelLines = [
    '[    0.000000] Nexyroth kernel 3.0.0 booting on x86_64',
    '[    0.001337] Neural core initialized — 128 threads active',
    '[    0.002048] Memory: 65536K/67108864K available',
    '[    0.003721] ACPI: RSDP 0x00000000000F05B0 000014 (v00 NEXRTH)',
    '[    0.005192] PCI: Using configuration type 1 for base access',
    '[    0.007834] clocksource: tsc-early: mask: 0xffffffffffffffff',
    '[    0.009001] NEXYROTH_AUDIO: Music engine loaded — 192kHz/32bit',
    '[    0.011456] NEXYROTH_GPU: WebGPU adapter acquired',
    '[    0.013892] NEXYROTH_AI: Neural subsystem online',
    '[    0.016234] NEXYROTH_NET: Realtime sync protocol active',
    '[    0.018901] NEXYROTH_BROWSER: Chromium engine mounted',
    '[    0.021337] NEXYROTH_TERMINAL: Shell initialized',
    '[    0.024891] NEXYROTH_PLUGIN: Marketplace connected',
    '[    0.027456] Starting system services...',
    '[    0.029123] All modules loaded. System ready.',
  ];

  // ─── Particle System for Logo Assembly ───────────────────────────────────
  function createLogoParticles() {
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    particles = [];

    // Create particles that will form the "N" lettermark
    const cx = W / 2;
    const cy = H / 2;
    const count = reducedMotion ? 0 : 120;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const radius = 80 + Math.random() * 200;
      particles.push({
        x: cx + Math.cos(angle) * radius * (0.5 + Math.random()),
        y: cy + Math.sin(angle) * radius * (0.5 + Math.random()),
        tx: cx + (Math.random() - 0.5) * 60,  // target x (near logo)
        ty: cy + (Math.random() - 0.5) * 60,  // target y
        size: 1 + Math.random() * 2,
        opacity: 0,
        color: Math.random() > 0.5 ? '#00ffff' : '#a92eff',
        speed: 0.02 + Math.random() * 0.04,
        progress: 0,
      });
    }
  }

  function animateParticles(progress) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.progress = Math.min(p.progress + p.speed, progress);
      const t = easeOutCubic(p.progress);
      const x = p.x + (p.tx - p.x) * t;
      const y = p.y + (p.ty - p.y) * t;
      p.opacity = Math.min(p.progress * 2, 1);

      ctx.save();
      ctx.globalAlpha = p.opacity * 0.8;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ─── Phase Runners ────────────────────────────────────────────────────────

  function phaseVoid() {
    return new Promise(resolve => {
      // Pure black — already the default
      setTimeout(resolve, reducedMotion ? 100 : 500);
    });
  }

  function phasePowerLED() {
    return new Promise(resolve => {
      const led = bootEl.querySelector('.boot-led');
      if (led) {
        led.style.opacity = '1';
        led.style.boxShadow = '0 0 8px #00ffff, 0 0 20px #00ffff44';
      }
      setTimeout(resolve, reducedMotion ? 50 : 700);
    });
  }

  function phaseCRTWarmup() {
    return new Promise(resolve => {
      const crt = bootEl.querySelector('.boot-crt');
      if (!crt) { resolve(); return; }

      if (reducedMotion) {
        crt.style.opacity = '1';
        resolve();
        return;
      }

      // Flicker effect
      let flickers = 0;
      const maxFlickers = 4;
      const flicker = () => {
        crt.style.opacity = Math.random() > 0.4 ? '1' : '0.3';
        flickers++;
        if (flickers < maxFlickers) {
          setTimeout(flicker, 50 + Math.random() * 70);
        } else {
          crt.style.opacity = '1';
          setTimeout(resolve, 200);
        }
      };
      setTimeout(flicker, 120);
    });
  }

  function phaseBIOS() {
    return new Promise(resolve => {
      const biosEl = bootEl.querySelector('.boot-bios');
      if (!biosEl) { resolve(); return; }
      biosEl.style.display = 'block';

      if (reducedMotion) {
        biosEl.innerHTML = biosLines.map(l =>
          `<div class="bios-line" style="color:${l.color || '#f0f4ff'}">${l.text}</div>`
        ).join('');
        setTimeout(resolve, 200);
        return;
      }

      let lineIndex = 0;
      const addLine = () => {
        if (aborted) { resolve(); return; }
        if (lineIndex >= biosLines.length) {
          setTimeout(resolve, 300);
          return;
        }
        const line = biosLines[lineIndex];
        const div = document.createElement('div');
        div.className = 'bios-line';
        if (line.id) div.id = line.id;
        div.style.color = line.color || '#f0f4ff';
        div.textContent = line.text;
        biosEl.appendChild(div);
        lineIndex++;
        setTimeout(addLine, line.delay || 40);
      };
      addLine();
    });
  }

  function phaseMemoryTest() {
    return new Promise(resolve => {
      const memEl = bootEl.querySelector('.boot-memory');
      if (!memEl) { resolve(); return; }
      memEl.style.display = 'block';

      const modules = [
        { name: 'KERNEL', size: '2048MB', color: '#00ffff' },
        { name: 'NEURAL', size: '16384MB', color: '#a92eff' },
        { name: 'AUDIO', size: '4096MB', color: '#00ff88' },
        { name: 'RENDER', size: '8192MB', color: '#ff6b35' },
        { name: 'SYSTEM', size: '32768MB', color: '#f0f4ff' },
      ];

      memEl.innerHTML = `
        <div class="mem-title">MEMORY TEST — 65536MB TOTAL</div>
        ${modules.map(m => `
          <div class="mem-row">
            <span class="mem-name">${m.name}</span>
            <div class="mem-bar-wrap">
              <div class="mem-bar" data-color="${m.color}" style="background:${m.color}"></div>
            </div>
            <span class="mem-size">${m.size}</span>
            <span class="mem-status">...</span>
          </div>
        `).join('')}
      `;

      if (reducedMotion) {
        memEl.querySelectorAll('.mem-bar').forEach(b => b.style.width = '100%');
        memEl.querySelectorAll('.mem-status').forEach(s => s.textContent = 'OK');
        setTimeout(resolve, 100);
        return;
      }

      const bars = memEl.querySelectorAll('.mem-bar');
      const statuses = memEl.querySelectorAll('.mem-status');
      let done = 0;

      bars.forEach((bar, i) => {
        setTimeout(() => {
          bar.style.transition = `width ${260 + i * 40}ms cubic-bezier(0.4, 0, 0.2, 1)`;
          bar.style.width = '100%';
          setTimeout(() => {
            statuses[i].textContent = 'OK';
            statuses[i].style.color = '#00ff88';
            done++;
            if (done === bars.length) setTimeout(resolve, 200);
          }, 300 + i * 40);
        }, i * 90);
      });
    });
  }

  function phaseKernelLoad() {
    return new Promise(resolve => {
      const kernelEl = bootEl.querySelector('.boot-kernel');
      if (!kernelEl) { resolve(); return; }

      // Hide BIOS, show kernel
      const biosEl = bootEl.querySelector('.boot-bios');
      const memEl = bootEl.querySelector('.boot-memory');
      if (biosEl) biosEl.style.display = 'none';
      if (memEl) memEl.style.display = 'none';
      kernelEl.style.display = 'block';

      if (reducedMotion) {
        kernelEl.innerHTML = kernelLines.map(l =>
          `<div class="kernel-line">${l}</div>`
        ).join('');
        setTimeout(resolve, 100);
        return;
      }

      let i = 0;
      const addKernelLine = () => {
        if (aborted) { resolve(); return; }
        if (i >= kernelLines.length) {
          setTimeout(resolve, 250);
          return;
        }
        const div = document.createElement('div');
        div.className = 'kernel-line';
        div.textContent = kernelLines[i];

        // Color-code important lines
        if (kernelLines[i].includes('NEXYROTH')) {
          div.style.color = '#00ffff';
        } else if (kernelLines[i].includes('ready')) {
          div.style.color = '#00ff88';
          div.style.fontWeight = '600';
        }

        kernelEl.appendChild(div);
        kernelEl.scrollTop = kernelEl.scrollHeight;
        i++;
        setTimeout(addKernelLine, 35 + Math.random() * 25);
      };
      addKernelLine();
    });
  }

  function phaseSignalLock() {
    return new Promise(resolve => {
      const kernelEl = bootEl.querySelector('.boot-kernel');
      const signalEl = bootEl.querySelector('.boot-signal');
      if (!signalEl) { resolve(); return; }

      if (kernelEl) kernelEl.style.display = 'none';
      signalEl.style.display = 'flex';

      if (reducedMotion) {
        signalEl.querySelector('.signal-text').textContent = 'SIGNAL LOCKED';
        resolve();
        return;
      }

      const ring = signalEl.querySelector('.signal-ring');
      const text = signalEl.querySelector('.signal-text');
      const pct = signalEl.querySelector('.signal-pct');

      let progress = 0;
      const interval = setInterval(() => {
        if (aborted) { clearInterval(interval); resolve(); return; }
        progress += 4 + Math.random() * 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          if (text) text.textContent = 'SIGNAL LOCKED';
          if (text) text.style.color = '#00ff88';
          if (ring) ring.style.borderColor = '#00ff88';
          setTimeout(resolve, 350);
        }
        if (pct) pct.textContent = Math.floor(progress) + '%';
        if (ring) {
          ring.style.background = `conic-gradient(#00ffff ${progress * 3.6}deg, transparent 0deg)`;
        }
      }, 25);
    });
  }

  function phaseLogoAssembly() {
    return new Promise(resolve => {
      const signalEl = bootEl.querySelector('.boot-signal');
      const logoEl = bootEl.querySelector('.boot-logo-final');
      if (!logoEl) { resolve(); return; }

      if (signalEl) signalEl.style.display = 'none';
      logoEl.style.display = 'flex';

      // Setup canvas
      canvas = logoEl.querySelector('canvas');
      if (canvas) {
        canvas.width = canvas.offsetWidth || 400;
        canvas.height = canvas.offsetHeight || 300;
        ctx = canvas.getContext('2d');
        createLogoParticles();
      }

      if (reducedMotion) {
        const logoText = logoEl.querySelector('.logo-text-final');
        if (logoText) logoText.style.opacity = '1';
        setTimeout(resolve, 200);
        return;
      }

      let progress = 0;
      const animate = () => {
        if (aborted) { if (animFrame) cancelAnimationFrame(animFrame); resolve(); return; }
        progress += 0.022;
        if (canvas && ctx) animateParticles(progress);

        if (progress < 1) {
          animFrame = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animFrame);
          // Reveal logo text
          const logoText = logoEl.querySelector('.logo-text-final');
          if (logoText) {
            logoText.style.transition = 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
            logoText.style.opacity = '1';
            logoText.style.transform = 'scale(1)';
          }
          setTimeout(resolve, 600);
        }
      };
      animate();
    });
  }

  function phaseMaterialize() {
    return new Promise(resolve => {
      const logoEl = bootEl.querySelector('.boot-logo-final');
      const finalEl = bootEl.querySelector('.boot-final');
      if (!finalEl) { resolve(); return; }

      if (logoEl) {
        logoEl.style.transition = 'opacity 0.5s ease';
        logoEl.style.opacity = '0';
        setTimeout(() => { logoEl.style.display = 'none'; }, 500);
      }

      setTimeout(() => {
        finalEl.style.display = 'flex';
        finalEl.style.opacity = '0';
        finalEl.style.transition = 'opacity 0.8s ease';
        setTimeout(() => { finalEl.style.opacity = '1'; }, 50);

        const welcomeText = finalEl.querySelector('.welcome-text');
        if (welcomeText && !reducedMotion) {
          typeText(welcomeText, 'Welcome, Operator.', 32, () => {
            setTimeout(resolve, 450);
          });
        } else {
          if (welcomeText) welcomeText.textContent = 'Welcome, Operator.';
          setTimeout(resolve, reducedMotion ? 200 : 600);
        }
      }, 350);
    });
  }

  function typeText(el, text, speed, callback) {
    el.textContent = '';
    let i = 0;
    const type = () => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(type, speed);
      } else if (callback) {
        callback();
      }
    };
    type();
  }

  // ─── Main Sequence ────────────────────────────────────────────────────────

  async function runSequence() {
    try {
      await phaseVoid();          checkAborted();
      await phasePowerLED();      checkAborted();
      await phaseCRTWarmup();     checkAborted();
      await phaseBIOS();          checkAborted();
      await phaseMemoryTest();    checkAborted();
      await phaseKernelLoad();    checkAborted();
      await phaseSignalLock();    checkAborted();
      await phaseLogoAssembly();  checkAborted();
      await phaseMaterialize();   checkAborted();
      complete();
    } catch (err) {
      if (err && err.message === '__BOOT_ABORTED__') {
        return;
      }
      console.warn('[Boot] Sequence error, forcing complete:', err);
      complete();
    }
  }

  function complete() {
    if (hasCompleted) return;
    hasCompleted = true;
    aborted = true;

    if (animFrame) cancelAnimationFrame(animFrame);
    if (failSafeTimer) clearTimeout(failSafeTimer);

    if (!bootEl) {
      if (window.NexyrothApp && window.NexyrothApp.init) window.NexyrothApp.init();
      return;
    }

    // Cinematic exit: flash white then fade to black then reveal
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; inset: 0; background: white;
      z-index: 99999; opacity: 0; pointer-events: none;
      transition: opacity 0.15s ease;
    `;
    document.body.appendChild(flash);

    setTimeout(() => { flash.style.opacity = '1'; }, 50);
    setTimeout(() => { flash.style.opacity = '0'; }, 250);
    setTimeout(() => {
      flash.remove();
      bootEl.style.transition = 'opacity 0.6s ease';
      bootEl.style.opacity = '0';
      
      // Reveal hero section
      const hero = document.getElementById('hero');
      if (hero) hero.classList.add('visible');

      setTimeout(() => {
        if (bootEl && bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
        
        // Enable scrolling
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        if (window.NexyrothApp && window.NexyrothApp.init) window.NexyrothApp.init();
        triggerEntranceAnimations();
      }, 650);
    }, 500);

    console.log('%c✓ NEXYROTH OS BOOT COMPLETE', 'color: #00ffff; font-weight: bold; font-size: 14px;');
    console.log('%cWelcome, Operator. Type nexyroth.unlock() to access developer mode.', 'color: #a92eff;');
  }

  function triggerEntranceAnimations() {
    const heroContent = document.querySelector('.hero-content');
    if (!heroContent) return;

    const elements = Array.from(heroContent.children);
    elements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
      setTimeout(() => {
        el.style.transition = `opacity 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120}ms, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100 + i * 120);
    });

    // Also animate hero visual
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual) {
      heroVisual.style.opacity = '0';
      heroVisual.style.transform = 'translateX(40px)';
      setTimeout(() => {
        heroVisual.style.transition = 'opacity 0.9s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)';
        heroVisual.style.opacity = '1';
        heroVisual.style.transform = 'translateX(0)';
      }, 400);
    }
  }

  // ─── Fail-safe ────────────────────────────────────────────────────────────
  let failSafeTimer;

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    start() {
      bootEl = document.getElementById('bootLoader');
      
      // Disable scrolling during boot
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      if (!bootEl) {
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        if (window.NexyrothApp && window.NexyrothApp.init) window.NexyrothApp.init();
        return;
      }

      // Fail-safe: the natural sequence now finishes in ~7-8s (see the
      // per-phase timing rework above). This timer is a true safety net for
      // when something genuinely stalls (a phase's promise never resolving),
      // not a countdown that's expected to race the sequence -- it sits
      // comfortably above the natural runtime. complete() is idempotent
      // (hasCompleted guard) so even if both paths somehow fire, only the
      // first one acts.
      failSafeTimer = setTimeout(() => {
        console.warn('[Boot] Fail-safe timeout triggered -- a phase likely stalled');
        complete();
      }, reducedMotion ? 500 : 9000);

      if (reducedMotion) {
        // Reduced motion must NOT mean "no boot at all". Previously this
        // path only did setTimeout(complete, 400) without ever touching
        // .boot-crt/.boot-bios/etc opacity -- since those default to
        // opacity:0 in CSS, the entire 400ms was a plain black rectangle
        // with zero visible content, which reads as "boot never appeared"
        // even though technically bootEl existed and complete() ran.
        // Fix: instantly render the final state of every phase (no
        // per-character typing, no per-bar stagger, no particle assembly --
        // just the end result of each), so a reduced-motion user still
        // sees the BIOS/kernel/logo content, just without the motion.
        renderReducedMotionSnapshot();
        setTimeout(complete, 500);
        return;
      }

      runSequence();
    },

    // Allow replay via easter egg
    replay() {
      if (bootEl) return; // Already running

      // Reset completion/abort state from the previous run -- without this
      // the first checkAborted() in runSequence() would throw immediately
      // and the "replay" would silently no-op.
      hasCompleted = false;
      aborted = false;
      if (failSafeTimer) clearTimeout(failSafeTimer);

      // Match start()'s Body Locked step -- without this, replaying boot
      // mid-page leaves scrolling enabled during the cinematic.
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      const newBoot = document.createElement('div');
      newBoot.id = 'bootLoader';
      newBoot.className = 'boot-loader';
      newBoot.innerHTML = document.querySelector('#bootLoaderTemplate')?.innerHTML || '';
      document.body.prepend(newBoot);
      bootEl = newBoot;

      failSafeTimer = setTimeout(() => {
        console.warn('[Boot] Fail-safe timeout triggered on replay');
        complete();
      }, reducedMotion ? 500 : 9000);

      runSequence();
    },

    // Escape hatch for the bfcache-restore edge case: if a user navigates
    // away WHILE boot is still mid-sequence and the page gets frozen +
    // later thawed from bfcache (event.persisted via 'pageshow' -- wired
    // in index.html), there's no guarantee the frozen setTimeout/rAF
    // chain resumes into a sane state. Rather than leave a possibly-stuck
    // boot overlay on screen, this forces a clean finish. complete()'s own
    // hasCompleted guard makes this a no-op if boot already finished
    // normally, so it's always safe to call.
    forceComplete() {
      if (!hasCompleted) complete();
    }
  };
})();