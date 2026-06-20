/* fit-title.js — Calibration des titres « length-aware » (Phase 1 DA, 2026-06-21).
 *
 * Pose deux variables CSS par titre :
 *   --title-chars : nombre de caracteres visibles (hors icone aria-hidden)
 *   --title-w     : largeur disponible reelle du titre (px)
 * La taille est ensuite calculee par la FORMULE CSS (cf. components.css) :
 *   font-size: clamp(MIN, calc(K * var(--title-w) / var(--title-chars)), MAX)
 * => taille fonction de (largeur d'ecran x longueur du titre), une seule formule,
 *    sans clamp() magique par breakpoint.
 *
 * Conforme CSP : aucun style inline en HTML, on ne fait que CSSOM setProperty.
 */
(function () {
  'use strict';

  var SELECTOR = '.hero__title, .section__title, .card__title';

  // Longueur du texte visible, icone decorative exclue.
  function visibleLength(el) {
    var clone = el.cloneNode(true);
    var icons = clone.querySelectorAll('[aria-hidden="true"]');
    for (var i = 0; i < icons.length; i++) {
      icons[i].parentNode.removeChild(icons[i]);
    }
    return clone.textContent.replace(/\s+/g, ' ').trim().length;
  }

  function apply() {
    var titles = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < titles.length; i++) {
      var el = titles[i];
      var chars = visibleLength(el);
      if (chars < 1) continue;
      el.style.setProperty('--title-chars', chars);
      el.style.setProperty('--title-w', Math.round(el.clientWidth) + 'px');
    }
  }

  function schedule() {
    window.requestAnimationFrame(apply);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }

  // Recalcule une fois les polices chargees (les metriques changent la largeur).
  if (document.fonts && typeof document.fonts.ready === 'object') {
    document.fonts.ready.then(schedule);
  }

  // Recalcule au redimensionnement (la largeur disponible change).
  var timer = null;
  window.addEventListener('resize', function () {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(apply, 150);
  });
})();
