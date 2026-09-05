/* A finite visual demonstration. The opt-in trial owns all real keyboard input. */
(function () {
  'use strict';
  const demo = document.getElementById('welcome-demo');
  const replay = document.getElementById('welcome-replay');
  if (!demo || !replay) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const letters = [...demo.querySelectorAll('[data-demo-key]')];
  const keycaps = [...demo.querySelectorAll('[data-demo-cap]')];
  let timer;

  function finish() {
    window.clearTimeout(timer);
    demo.classList.remove('is-playing');
    letters.forEach(letter => letter.classList.remove('is-typed'));
    keycaps.forEach(key => key.classList.remove('is-pressed'));
  }

  function play() {
    finish();
    if (reducedMotion.matches || document.hidden) return;
    demo.classList.add('is-playing');
    let index = 0;
    function typeNext() {
      keycaps.forEach(key => key.classList.remove('is-pressed'));
      const letter = letters[index++];
      if (!letter) { finish(); return; }
      letter.classList.add('is-typed');
      keycaps.find(key => key.dataset.demoCap === letter.dataset.demoKey)?.classList.add('is-pressed');
      timer = window.setTimeout(typeNext, 180);
    }
    timer = window.setTimeout(typeNext, 300);
  }

  function motionPreferenceChanged() {
    finish();
    replay.hidden = reducedMotion.matches;
  }
  motionPreferenceChanged();
  replay.addEventListener('click', play);
  reducedMotion.addEventListener('change', motionPreferenceChanged);
  document.getElementById('welcome-start')?.addEventListener('click', finish);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  window.addEventListener('pagehide', finish);
  play();
})();
