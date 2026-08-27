/**
 * NEXYROTH KERNEL RUNTIME
 *
 * Phase 7: "Kernel Runtime -> Signal Bus -> Modules -> UI", not
 * "Module A calls Module B calls Module C". This file is the piece that
 * makes that true.
 *
 * WHAT CHANGES FROM PHASE 5/6's ARCHITECTURE: js/signal-bus.js already
 * gave every module a way to talk without knowing about each other --
 * that part was already right and stays. What was missing was a single
 * source of truth for WHAT STATE THE WHOLE SYSTEM IS IN, and a single
 * place that decides when modules pause/resume, instead of five separate
 * modules (hero, cursor, energy-core, system-monitor, ambient-life) each
 * independently listening to visibilitychange and deciding for
 * themselves. That decision now lives here, once.
 *
 * DIVISION OF RESPONSIBILITY (Task 2's "Signal Bus must not contain
 * business logic"):
 * - js/signal-bus.js: transport only. on/off/emit. Doesn't know what
 *   any event NAME means, doesn't validate anything, doesn't hold state.
 * - js/kernel-runtime.js (this file): owns the state machine, owns the
 *   module registry, decides valid transitions, decides when to
 *   pause/resume every registered module. It USES the signal bus to
 *   broadcast ('kernel:state', 'kernel:hover', etc.) but the validation
 *   and decision logic lives here, not there.
 *
 * STATE MACHINE (Task 7): transitions are validated against an explicit
 * table. BOOTING can only ever go to INITIALIZING or ERROR -- it can
 * never jump straight to SHUTDOWN, matching the brief's example exactly.
 *
 *   BOOTING -> INITIALIZING -> READY -> ACTIVE <-> IDLE <-> SLEEP
 *                                          \_________________/
 *                                                  |
 *                                              SHUTDOWN (terminal)
 *
 * MODULE LIFECYCLE (Task 3, Task 11): every module registers itself with
 * registerModule(name, ref), then the kernel is what calls ref.ready(),
 * ref.pause(), ref.resume() -- not main.js, not the module's own
 * visibilitychange listener. A module that doesn't implement one of
 * these methods just doesn't get that step called on it (checked with
 * typeof, never assumed) -- this lets older/simpler modules (Navigation,
 * Scroll) register without needing to invent a pause() that wouldn't
 * mean anything for them.
 */

window.KernelRuntime = (function () {
  'use strict';

  const VERSION = '1.0.0';

  // ─── State machine ────────────────────────────────────────────────────
  const VALID_TRANSITIONS = {
    BOOTING: ['INITIALIZING', 'ERROR'],
    INITIALIZING: ['READY', 'ERROR'],
    READY: ['ACTIVE', 'ERROR'],
    ACTIVE: ['IDLE', 'SLEEP', 'SHUTDOWN', 'ERROR'],
    IDLE: ['ACTIVE', 'SLEEP', 'SHUTDOWN', 'ERROR'],
    SLEEP: ['ACTIVE', 'SHUTDOWN', 'ERROR'],
    SHUTDOWN: [], // terminal -- matches Task 3's Footer Shutdown Sequence
                  // being explicitly one-way (see js/shutdown-sequence.js)
    ERROR: ['INITIALIZING'] // the one recovery path
  };

  let state = 'BOOTING';

  // ─── Module registry ───────────────────────────────────────────────────
  // name -> { ref, lifecycleState, registeredAt }
  // lifecycleState is this module's OWN small lifecycle, independent of
  // the kernel's system-wide state: 'registered' -> 'ready' -> 'active'
  // -> ('paused' <-> 'active') -> 'destroyed'.
  const modules = new Map();

  // ─── Event log (Task 5: Realtime Event Timeline, read by the Kernel
  // Inspector). Capped so a long session doesn't grow this unboundedly. ──
  const eventLog = [];
  const MAX_LOG_ENTRIES = 300;

  function logEvent(type, detail) {
    const entry = {
      type: type,
      detail: detail || {},
      time: Date.now()
    };
    eventLog.push(entry);
    if (eventLog.length > MAX_LOG_ENTRIES) eventLog.shift();
    // Broadcast for anything listening (the Kernel Inspector does) --
    // this is the one place the kernel uses the signal bus as transport,
    // per this file's own division-of-responsibility rule above.
    if (window.NexyrothSignals) {
      window.NexyrothSignals.emit('kernel:log', entry);
    }
    return entry;
  }

  function transition(newState, reason) {
    const allowed = VALID_TRANSITIONS[state] || [];
    if (!allowed.includes(newState)) {
      console.error(`[Kernel] Rejected invalid transition: ${state} -> ${newState}`);
      logEvent('transition-rejected', { from: state, to: newState, reason: reason });
      return false;
    }
    const previous = state;
    state = newState;
    logEvent('transition', { from: previous, to: newState, reason: reason });
    if (window.NexyrothSignals) {
      window.NexyrothSignals.emit('kernel:state', { state: newState, previous: previous });
    }
    return true;
  }

  function getState() {
    return state;
  }

  // ─── Module registration (Task 3, Task 11) ─────────────────────────────
  function registerModule(name, ref) {
    if (modules.has(name)) {
      console.warn(`[Kernel] Module "${name}" already registered -- ignoring duplicate registration.`);
      return;
    }
    modules.set(name, {
      ref: ref,
      lifecycleState: 'registered',
      registeredAt: Date.now()
    });
    logEvent('module-register', { module: name });
  }

  function callIfExists(name, methodName) {
    const entry = modules.get(name);
    if (!entry || !entry.ref) return false;
    const fn = entry.ref[methodName];
    if (typeof fn !== 'function') return false;
    try {
      fn.call(entry.ref);
      return true;
    } catch (e) {
      console.error(`[Kernel] Module "${name}".${methodName}() threw:`, e);
      logEvent('module-error', { module: name, method: methodName, message: String(e && e.message) });
      return false;
    }
  }

  function readyModule(name) {
    const entry = modules.get(name);
    if (!entry) return;
    callIfExists(name, 'ready');
    entry.lifecycleState = 'ready';
    logEvent('module-ready', { module: name });
  }

  function activateModule(name) {
    const entry = modules.get(name);
    if (!entry) return;
    // A module's own init() (still called by main.js -- see that file's
    // comments) is what actually sets it up; activateModule() marks it
    // as the kernel's record of "this module is live", which is what
    // pauseAllModules()/resumeAllModules() check before calling
    // pause()/resume() on it.
    entry.lifecycleState = 'active';
    logEvent('module-active', { module: name });
  }

  function destroyModule(name) {
    const entry = modules.get(name);
    if (!entry) return;
    if (entry.lifecycleState === 'destroyed') {
      console.warn(`[Kernel] Module "${name}" already destroyed -- ignoring duplicate destroy() call.`);
      return;
    }
    callIfExists(name, 'destroy');
    entry.lifecycleState = 'destroyed';
    logEvent('module-destroy', { module: name });
  }

  function getModuleSnapshot() {
    // Returns plain data (not the Map or the live refs) -- safe for the
    // Kernel Inspector to read and render without risk of it mutating
    // kernel-internal state.
    const snapshot = {};
    modules.forEach((entry, name) => {
      snapshot[name] = {
        lifecycleState: entry.lifecycleState,
        registeredAt: entry.registeredAt,
        hasReady: typeof entry.ref?.ready === 'function',
        hasPause: typeof entry.ref?.pause === 'function',
        hasResume: typeof entry.ref?.resume === 'function',
        hasDestroy: typeof entry.ref?.destroy === 'function'
      };
    });
    return snapshot;
  }

  // ─── Centralized pause/resume (Task 8: Performance Layer) ──────────────
  // This replaces five separate visibilitychange listeners that used to
  // live in hero.js/cursor.js/energy-core.js/system-monitor.js -- each
  // deciding independently when to pause. Now there's exactly one
  // listener, here, and it asks every ACTIVE module (via typeof-checked
  // pause()/resume()) to do its part.
  function pauseAllModules() {
    document.body.classList.add('tab-hidden');
    modules.forEach((entry, name) => {
      if (entry.lifecycleState === 'active') {
        if (callIfExists(name, 'pause')) {
          entry.lifecycleState = 'paused';
        }
      }
    });
    logEvent('kernel-pause-all', {});
  }

  function resumeAllModules() {
    document.body.classList.remove('tab-hidden');
    modules.forEach((entry, name) => {
      if (entry.lifecycleState === 'paused') {
        if (callIfExists(name, 'resume')) {
          entry.lifecycleState = 'active';
        }
      }
    });
    logEvent('kernel-resume-all', {});
  }

  function setupPerformanceLayer() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseAllModules();
      } else {
        resumeAllModules();
      }
    });

    // bfcache restore (same reasoning as the Phase 5 boot.js fix): a
    // frozen-then-thawed page should come back active, not stay paused
    // forever because the freeze happened while hidden.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        resumeAllModules();
      }
    });
  }

  setupPerformanceLayer();

  // ─── Public API ─────────────────────────────────────────────────────────
  return {
    VERSION: VERSION,
    transition: transition,
    getState: getState,
    registerModule: registerModule,
    readyModule: readyModule,
    activateModule: activateModule,
    destroyModule: destroyModule,
    pauseAllModules: pauseAllModules,
    resumeAllModules: resumeAllModules,
    getModuleSnapshot: getModuleSnapshot,
    getEventLog: () => eventLog.slice(),
    logEvent: logEvent
  };
})();
