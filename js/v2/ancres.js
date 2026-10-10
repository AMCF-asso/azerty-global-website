/* Refonte — ouverture d'un accordéon désigné par l'ancre de l'URL.

   Transverse depuis le 2026-08-31 : `/faq` et `/histoire-azerty` en dépendent
   toutes les deux, et d'autres pages à accordéons suivront. Une réponse ciblée
   par un lien entrant qui arrive repliée est une réponse manquée — `/comparatif`
   pointe vers `/faq#stickers`, et `/histoire-azerty` porte 26 ancres citables.

   ⛔ Ce script ne fait QUE cela. Le filtre de `/faq` vit dans js/v2/faq.js. */

(function () {
  "use strict";

  function ouvrirCible() {
    if (!window.location.hash) return;

    var identifiant = window.location.hash.slice(1);
    var cible = null;
    try {
      /* Une ancre peut arriver encodée depuis un lien externe ; un identifiant
         invalide ne doit pas emporter le reste du script. */
      cible = document.getElementById(decodeURIComponent(identifiant));
    } catch (erreur) {
      cible = null;
    }
    if (!cible) cible = document.getElementById(identifiant);
    if (!cible) return;

    /* L'ancre peut viser l'accordéon lui-même, ou un élément à l'intérieur. */
    var accordeon = cible.tagName === "DETAILS" ? cible
      : (cible.closest ? cible.closest("details") : null);
    if (!accordeon) return;

    accordeon.open = true;
    accordeon.scrollIntoView({ block: "start" });
  }

  ouvrirCible();
  window.addEventListener("hashchange", ouvrirCible);
})();
