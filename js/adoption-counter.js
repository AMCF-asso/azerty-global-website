// Compteur animé de la section « Ils l'ont adopté » (index).
// Progressive enhancement : le HTML contient déjà la valeur finale statique.
(function () {
  'use strict';

  var el = document.querySelector('[data-count-to]');
  if (!el) return;

  var target = parseInt(el.getAttribute('data-count-to'), 10);
  if (!isFinite(target) || target <= 0) return;

  var suffix = el.getAttribute('data-count-suffix') || '';

  function format(n) {
    // fr-FR peut produire une espace fine insécable (U+202F) : normaliser en NBSP.
    return n.toLocaleString('fr-FR').replace(/ /g, ' ') + suffix;
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window) || !window.requestAnimationFrame) {
    el.textContent = format(target);
    return;
  }

  var started = false;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || started) return;
      started = true;
      observer.disconnect();

      var duration = 1400;
      var startTime = null;

      function tick(now) {
        if (startTime === null) startTime = now;
        var p = Math.min((now - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });

  observer.observe(el);
})();
