/**
 * NEXYROTH SIGNAL BUS
 *
 * WHY THIS EXISTS: Phase 5 asks for "hover AI -> Kernel reacts -> Terminal
 * logs -> Core glows -> System Monitor CPU rises -> Cursor changes state"
 * -- one action, five+ modules reacting. Wiring that directly (Architecture
 * imports Terminal, imports SystemMonitor, imports Cursor, imports
 * EnergyCore...) would create exactly the tangled, module-depends-on-
 * module mess this project has been trying to get away from since
 * Phase 1. A tiny pub/sub bus is the one idea that makes all of it
 * possible without any module needing to know the others exist.
 *
 * Architecture doesn't call Terminal.logMusicEngine(). It emits
 * 'module:hover' with { module: 'music' }. Terminal, SystemMonitor,
 * Cursor, and EnergyCore each independently subscribe to that one event
 * and decide what it means for them. Architecture never needs to change
 * if a new listener is added later, and any listener can be removed
 * without touching Architecture.
 *
 * This file has no dependencies and needs none of the DOM/other modules
 * to exist -- it just needs to be a plain global object, so unlike every
 * other module it isn't in main.js's ordered init() list at all. It's
 * simply defined (like this IIFE always is) before any module's init()
 * ever runs, since all scripts load synchronously well before boot even
 * starts, let alone completes.
 */

window.NexyrothSignals = (function () {
  'use strict';

  const listeners = Object.create(null);

  // A rolling log of recent emissions -- still a transport-layer concern
  // (recording what passed through, like a network switch's packet
  // capture), not business logic (deciding what any event MEANS, which
  // stays out of this file per its own header comment). Read by
  // js/kernel-inspector.js for its Signal Queue display.
  const recentEmissions = [];
  const MAX_RECENT = 50;

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    // Returns an unsubscribe function -- callers that might be torn down
    // (none currently are, per the established "no destroy() for a
    // static single-page site" reasoning, but this keeps the option open
    // cheaply) can drop their own listener without reaching back into
    // this module's internals.
    return function unsubscribe() {
      off(event, callback);
    };
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((cb) => cb !== callback);
  }

  function emit(event, payload) {
    recentEmissions.push({ event: event, payload: payload, time: Date.now() });
    if (recentEmissions.length > MAX_RECENT) recentEmissions.shift();

    if (!listeners[event] || !listeners[event].length) return;
    // Snapshot with slice() before iterating: if a listener's own
    // callback synchronously subscribes or unsubscribes another listener
    // for the same event (not expected here, but cheap to guard), this
    // avoids mutating the array mid-iteration.
    listeners[event].slice().forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error(`[Signals] a listener for "${event}" threw:`, e);
      }
    });
  }

  return { on: on, off: off, emit: emit, getRecentEmissions: () => recentEmissions.slice() };
})();
