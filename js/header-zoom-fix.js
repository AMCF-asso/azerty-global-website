/**
 * Counter-scale the sticky .header when user pinch-zooms on mobile,
 * so it stays at 1:1 visual size instead of zooming with the page.
 *
 * Targets ONLY document.querySelector('.header'). No other element is touched.
 * No-op on desktop (Ctrl+wheel does not change visualViewport.scale).
 */
(function () {
  'use strict';

  if (!window.visualViewport) return;

  function init() {
    var header = document.querySelector('.header');
    if (!header) return;

    var vv = window.visualViewport;
    var rafId = null;

    function update() {
      rafId = null;
      if (vv.scale > 1.01) {
        header.style.transformOrigin = '0 0';
        header.style.transform =
          'translate(' + vv.offsetLeft + 'px, ' + vv.offsetTop + 'px) ' +
          'scale(' + (1 / vv.scale) + ')';
      } else {
        header.style.transform = '';
        header.style.transformOrigin = '';
      }
    }

    function schedule() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    }

    vv.addEventListener('resize', schedule);
    vv.addEventListener('scroll', schedule);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
