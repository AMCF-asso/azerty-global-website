/* Refonte — guide typographique : impression. Les boutons `[data-guide-imprimer]`
   lancent l'impression ; avant elle, tous les accordéons s'ouvrent (sinon les
   variantes et la FAQ manquent au papier), puis se referment. */

(function () {
  "use strict";

  var racine = document.querySelector("[data-guide-typo]");
  if (!racine) return;

  var ouverts = [];

  window.addEventListener("beforeprint", function () {
    ouverts = Array.prototype.slice.call(racine.querySelectorAll("details:not([open])"));
    ouverts.forEach(function (d) { d.open = true; });
  });

  window.addEventListener("afterprint", function () {
    ouverts.forEach(function (d) { d.open = false; });
    ouverts = [];
  });

  racine.querySelectorAll("[data-guide-imprimer]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      if (window.AzertyTrack && window.AzertyTrack.event) {
        window.AzertyTrack.event("typography_print", { language: racine.getAttribute("data-guide-lang") });
      }
      window.print();
    });
  });
})();
