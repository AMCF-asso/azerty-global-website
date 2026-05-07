/**
 * Cache le sticky .header pendant que le zoom change (pinch en cours),
 * et le réaffiche dès que le zoom se stabilise (geste terminé).
 *
 * Vrai au scale 1 comme à scale > 1 : ce qui compte, c'est qu'on ne voit
 * pas le header bouger pendant le geste de zoom.
 *
 * Cible UNIQUEMENT document.querySelector('.header'). Aucun autre élément.
 * No-op sur desktop (Ctrl+wheel ne change pas visualViewport.scale).
 */
(function () {
  'use strict';

  if (!window.visualViewport) return;

  var STABILIZE_DELAY_MS = 200;

  function init() {
    var header = document.querySelector('.header');
    if (!header) return;

    var vv = window.visualViewport;
    var lastScale = vv.scale;
    var stabilizeTimer = null;
    var hidden = false;

    function hide() {
      if (hidden) return;
      header.style.opacity = '0';
      header.style.pointerEvents = 'none';
      hidden = true;
    }

    function show() {
      if (!hidden) return;
      header.style.opacity = '';
      header.style.pointerEvents = '';
      hidden = false;
    }

    function onResize() {
      if (vv.scale === lastScale) return;
      lastScale = vv.scale;
      hide();
      if (stabilizeTimer !== null) clearTimeout(stabilizeTimer);
      stabilizeTimer = setTimeout(function () {
        stabilizeTimer = null;
        show();
      }, STABILIZE_DELAY_MS);
    }

    vv.addEventListener('resize', onResize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
