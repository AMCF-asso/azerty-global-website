/**
 * Cache le sticky .header pendant un pinch-zoom mobile pour éviter
 * que le logo "bouge" dans le visual viewport pendant le geste.
 * Réaffiche le header dès que le zoom revient à 1.
 *
 * Cible UNIQUEMENT document.querySelector('.header'). Aucun autre élément.
 * No-op sur desktop (Ctrl+wheel ne change pas visualViewport.scale).
 */
(function () {
  'use strict';

  if (!window.visualViewport) return;

  function init() {
    var header = document.querySelector('.header');
    if (!header) return;

    var vv = window.visualViewport;
    var rafId = null;
    var hidden = false;

    function update() {
      rafId = null;
      var shouldHide = vv.scale > 1.01;
      if (shouldHide && !hidden) {
        header.style.opacity = '0';
        header.style.pointerEvents = 'none';
        hidden = true;
      } else if (!shouldHide && hidden) {
        header.style.opacity = '';
        header.style.pointerEvents = '';
        hidden = false;
      }
    }

    function schedule() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    }

    vv.addEventListener('resize', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
