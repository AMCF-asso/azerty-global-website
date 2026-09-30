/* Refonte — /pilote (lot 7 vague 5, 2026-09-30) : champ propre au profil.
   Validation, envoi, bilan d'erreurs, confirmation et échec sont ceux de
   js/v2/formulaire.js ; ce script ne fait que révéler le `.champ[data-profil]`
   du profil choisi.

   Un champ masqué est aussi désactivé : js/v2/formulaire.js saute les `.champ`
   masqués, et `disabled` le retire du FormData, comme en v1 (un profil changé
   n'envoie pas la réponse de l'ancien). Il redevient `required` à l'affichage :
   le HTML ne le porte pas, pour que la validation native du cas sans script
   ne bute pas sur un champ invisible. */

(function () {
  "use strict";

  var formulaire = document.getElementById("pilot-request-form");
  if (!formulaire) return;

  var profil = formulaire.querySelector("#pilot-profile");
  var champs = Array.prototype.slice.call(formulaire.querySelectorAll(".champ[data-profil]"));
  if (!profil || !champs.length) return;

  function actualiser() {
    champs.forEach(function (champ) {
      var actif = champ.dataset.profil === profil.value;
      champ.hidden = !actif;
      Array.prototype.forEach.call(champ.querySelectorAll("input, select, textarea"), function (controle) {
        controle.disabled = !actif;
        controle.required = actif;
        if (!actif) controle.value = "";
      });
    });
  }

  profil.addEventListener("change", actualiser);
  actualiser();
})();
