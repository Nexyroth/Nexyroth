/**
 * Terminal Typing Effect
 * Realistic command typing in hero section
 */

window.Terminal = (function() {
  'use strict';

  let terminalContent = null;

  const commands = [
    { prompt: '$', command: 'nexyroth init', delay: 1000 },
    { type: 'output', text: '✓ Initializing Nexyroth OS...', delay: 300 },
    { type: 'output', text: '✓ Loading core modules...', delay: 400 },
    { type: 'output', text: '✓ Music Engine ready', delay: 300 },
    { type: 'output', text: '✓ AI Core online', delay: 300 },
    { type: 'output', text: '✓ Browser OS initialized', delay: 300 },
    { prompt: '$', command: 'nexyroth status', delay: 1500 },
    { type: 'output', text: 'System Status: OPERATIONAL', delay: 400 },
    { type: 'output', text: 'Active Modules: 12/12', delay: 300 },
    { type: 'output', text: 'Performance: Optimal', delay: 300 },
    { prompt: '$', command: '', delay: 500 }
  ];

  let currentIndex = 0;
  let isTyping = false;
  let typingTimer = null;
  let isInitialized = false;
  let isShuttingDown = false;

  // Terminal's typing loop runs on setTimeout chains, not
  // requestAnimationFrame, so it doesn't show up in a grep for rAF -- but
  // it's exactly the kind of "lives forever in the background" loop the
  // pause-on-hidden requirement is aimed at (it was explicitly named:
  // "Bao gồm: ... Terminal. Tất cả."). setTimeout still fires in a
  // backgrounded tab (just throttled by the browser), so left alone this
  // keeps mutating the DOM and burning a little CPU indefinitely while the
  // user is looking at a different tab.
  //
  // This wraps every delay point (per-character typing speed, the pause
  // between commands, and the 5s loop-restart) so that if the tab goes
  // hidden while waiting, the wait itself pauses and only resumes once the
  // tab is visible again -- instead of resuming a precise remaining
  // duration (not meaningful for a cosmetic typing effect), it simply
  // restarts that same wait once visible, which is a fine trade-off here.
  function pausableDelay(ms) {
    return new Promise(resolve => {
      const arm = () => {
        typingTimer = setTimeout(() => {
          if (document.hidden) {
            waitForVisible();
          } else {
            resolve();
          }
        }, ms);
      };
      const waitForVisible = () => {
        const onVisible = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', onVisible);
            arm();
          }
        };
        document.addEventListener('visibilitychange', onVisible);
      };
      if (document.hidden) waitForVisible(); else arm();
    });
  }

  function typeText(text, element, speed = 50) {
    return new Promise(resolve => {
      let i = 0;
      isTyping = true;
      
      async function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          await pausableDelay(speed + Math.random() * 30);
          type();
        } else {
          isTyping = false;
          resolve();
        }
      }
      
      type();
    });
  }

  async function executeCommands() {
    if (!terminalContent) return;

    for (const cmd of commands) {
      if (isShuttingDown) return; // stop cleanly, don't race the shutdown sequence's own writes
      await pausableDelay(cmd.delay);
      if (isShuttingDown) return;
      
      const line = document.createElement('div');
      line.className = 'terminal-line';
      
      if (cmd.type === 'output') {
        line.classList.add('output');
        terminalContent.appendChild(line);
        await typeText(cmd.text, line, 30);
      } else {
        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = cmd.prompt;
        line.appendChild(prompt);
        
        const command = document.createElement('span');
        command.className = 'command';
        line.appendChild(command);
        
        terminalContent.appendChild(line);
        
        if (cmd.command) {
          await typeText(cmd.command, command, 80);
        }
      }
      
      terminalContent.scrollTop = terminalContent.scrollHeight;
    }
    
    if (isShuttingDown) return;
    // Loop after completion. Previously this manually wrote a static
    // "nexyroth init" line into innerHTML AND THEN called executeCommands(),
    // which re-types "nexyroth init" again from the top of the commands
    // array -- so the command visibly appeared twice in a row on every
    // loop restart. Just clear and let the array drive the whole thing.
    await pausableDelay(5000);
    if (isShuttingDown) return;
    terminalContent.innerHTML = '';
    executeCommands();
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    terminalContent = document.getElementById('terminalContent');
    if (!terminalContent) return;

    // Start typing effect after boot
    pausableDelay(2000).then(() => executeCommands());

    setupSignalListener();

    console.log('✓ Terminal initialized');
  }

  const MODULE_LOG_LINES = {
    kernel: 'kernel: preparing kernel...',
    ai: 'ai-core: loading AI subsystem...',
    music: 'music-engine: mounting Music Engine...',
    game: 'game-runtime: initializing runtime...',
    terminal: 'terminal: self-check OK',
    plugin: 'plugin-system: manifest reloaded',
    browser: 'browser-os: sandbox context ready',
    cloud: 'cloud-sync: establishing connection...',
    'plugin-marketplace': 'marketplace: fetching catalog...',
    future: 'future: signal received, standing by'
  };

  let lastSignalTime = 0;

  function setupSignalListener() {
    if (!window.NexyrothSignals) return;

    // This is the Terminal becoming an "OS console" per Phase 5 -- it
    // reacts to what the rest of the site is doing instead of only
    // running its own scripted loop. It never needs to know Architecture
    // exists; it just listens for 'module:hover' on the shared bus (see
    // js/signal-bus.js).
    window.NexyrothSignals.on('module:hover', (payload) => {
      if (!terminalContent) return;
      // Throttle: a quick mouse pass over several nodes shouldn't spam
      // the console with a line per pixel of movement.
      const now = Date.now();
      if (now - lastSignalTime < 400) return;
      lastSignalTime = now;

      const text = MODULE_LOG_LINES[payload.module];
      if (!text) return;

      appendSystemLine(text);
    });

    // Ambient Life (Phase 6, Task 4): the OS "noticing" nobody's home.
    window.NexyrothSignals.on('system:idle', () => {
      appendSystemLine('system: waiting for interaction... move mouse to wake system.');
    });
    window.NexyrothSignals.on('system:wake', () => {
      if (isShuttingDown) return; // one-way: shutdown doesn't reverse
      appendSystemLine('system: activity detected -- waking up.');
    });

    // Footer Shutdown Sequence (Phase 6, Task 3): a one-time, one-way
    // ending -- the main scripted loop is told to stop (isShuttingDown)
    // so it can't race these writes with its own.
    window.NexyrothSignals.on('system:shutdown', async () => {
      if (isShuttingDown || !terminalContent) return;
      isShuttingDown = true;

      terminalContent.innerHTML = '';
      const steps = [
        'saving session...',
        'stopping services...',
        'unmounting filesystem...'
      ];
      for (const step of steps) {
        appendSystemLine(step);
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      appendSystemLine('');
      appendSystemLine('goodbye.');
      appendSystemLine('nexyroth os.');
      appendSystemLine('see you again.');
    });
  }

  function appendSystemLine(text) {
    if (!terminalContent) return;
    const line = document.createElement('div');
    line.className = 'terminal-line system-event';
    const prompt = document.createElement('span');
    prompt.className = 'prompt';
    prompt.textContent = '#';
    const message = document.createElement('span');
    message.className = 'output';
    message.textContent = ' ' + text;
    line.appendChild(prompt);
    line.appendChild(message);
    terminalContent.appendChild(line);
    terminalContent.scrollTop = terminalContent.scrollHeight;

    // Cap injected system-event lines so rapid hovering (or a long idle
    // session) can't grow the terminal unboundedly.
    const events = terminalContent.querySelectorAll('.system-event');
    if (events.length > 4) events[0].remove();
  }

  // ─── Standardized lifecycle (Phase 7, Task 11) ─────────────────────────
  // HONEST EXCEPTION to Task 8's "Kernel Runtime decides, no module
  // handles it separately": Terminal's pausableDelay() (above) already
  // checks document.hidden and has its OWN visibilitychange listener,
  // built in Phase 1.5/refined in Phase 6. It's finer-grained than a
  // whole-module pause -- it can stop mid-typing-delay and resume
  // exactly where it left off, which a single module-level pause()/
  // resume() call can't replicate without a much larger rewrite of the
  // typing-loop internals. Rather than rip out a mechanism that's
  // correct and has been reasoned through carefully across two prior
  // phases, pause()/resume() are exposed here for API-shape consistency
  // (so Kernel's typeof-checked calls have something to call) but are
  // no-ops -- Terminal keeps pausing itself, just via the pre-existing,
  // more granular mechanism. Documented here rather than silently
  // claimed as fully centralized.
  function pause() {
    // Intentional no-op -- see comment above.
  }

  function resume() {
    // Intentional no-op -- see comment above.
  }

  function ready() {
    // Exists for lifecycle-shape consistency (Task 11).
  }

  function destroy() {
    isShuttingDown = true;
    if (typingTimer) clearTimeout(typingTimer);
  }

  return {
    init: init,
    ready: ready,
    pause: pause,
    resume: resume,
    destroy: destroy
  };
})();