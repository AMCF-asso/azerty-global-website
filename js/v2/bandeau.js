/* Bandeau d'annonce (src/_includes/v2/bandeau.njk, données src/_data/bandeau.js).
   Chargé en synchrone juste après le bandeau : il le masque avant le premier
   rendu quand il est périmé (data-bandeau-fin) ou déjà fermé (clé en
   localStorage), puis branche le bouton de fermeture.
   Le choix reste dans le navigateur et n'en sort jamais (déclaré dans
   src/_data/mesure.js, page /confidentialite). Sans stockage disponible, la
   fermeture vaut pour la page seulement. */
(function () {
  "use strict";

  var bandeau = document.querySelector("[data-bandeau]");
  if (!bandeau) return;

  var cle = bandeau.getAttribute("data-bandeau-cle");
  var fin = Date.parse(bandeau.getAttribute("data-bandeau-fin"));

  function lireFerme() {
    try { return window.localStorage.getItem(cle) === "1"; }
    catch (e) { return false; /* stockage bloqué */ }
  }

  function memoriserFerme() {
    try { window.localStorage.setItem(cle, "1"); }
    catch (e) { /* stockage bloqué : fermé pour cette page seulement */ }
  }

  if ((!isNaN(fin) && Date.now() >= fin) || lireFerme()) {
    bandeau.hidden = true;
    return;
  }

  var bouton = bandeau.querySelector("[data-bandeau-fermer]");
  if (!bouton) return;
  bouton.addEventListener("click", function () {
    bandeau.hidden = true;
    memoriserFerme();
  });
})();
