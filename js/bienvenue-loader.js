(function () {
  'use strict';
  const start = document.getElementById('welcome-start');
  if (!start) return;
  const root = document.getElementById('welcome-trial');
  let ready = false;
  let pending = null;
  let generation = 0;

  function cancelLoading(event) {
    if (ready) return;
    event?.preventDefault();
    generation++;
    root.hidden = true;
    start.removeAttribute('aria-busy');
    start.focus();
  }
  document.getElementById('welcome-quit').addEventListener('click', cancelLoading);
  document.addEventListener('keydown', event => {
    if (!ready && (pending || !root.hidden) && event.key === 'Escape') cancelLoading(event);
  });

  function loadKeyboardStyles() {
    return new Promise((resolve, reject) => {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = '/tester/keyboard.css?v=final-20260801-1';
      stylesheet.onload = resolve;
      stylesheet.onerror = () => { stylesheet.remove(); reject(new Error('Keyboard stylesheet unavailable')); };
      document.head.append(stylesheet);
    });
  }

  start.addEventListener('click', async (event) => {
    if (ready) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (pending) return;
    const request = ++generation;
    const initialCaps = Boolean(event.getModifierState?.('CapsLock'));
    start.setAttribute('aria-busy', 'true');
    pending = Promise.all([
      loadKeyboardStyles(),
      import('./bienvenue-trial.js?v=20260905-1')
    ]);
    try {
      await pending;
      ready = true;
      if (request !== generation) return;
      // Preserve the actual modifier snapshot from the user's initial click.
      const replay = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.defineProperty(replay, 'getModifierState', { value: key => key === 'CapsLock' && initialCaps });
      start.dispatchEvent(replay);
    } catch (_) {
      if (request !== generation) return;
      root.hidden = false;
      root.tabIndex = -1;
      document.getElementById('welcome-exercise').hidden = true;
      document.getElementById('welcome-error').hidden = false;
      root.focus();
    } finally {
      pending = null;
      start.removeAttribute('aria-busy');
    }
  }, true);
})();
