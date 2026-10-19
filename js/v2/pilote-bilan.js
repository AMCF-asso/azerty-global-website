/* Refonte — page /pilote-bilan : ce qui est propre à cette page (lot P2,
   PBILAN, 19/10/2026). La validation, l'envoi et la confirmation sont dans
   js/v2/formulaire.js ; ⛔ ne rien remettre de tout cela ici.

   « Oui, prolonger ou étendre » rend l'e-mail OBLIGATOIRE : sans adresse,
   personne ne peut organiser la suite. Pour tout autre choix, l'e-mail reste
   facultatif.

   1. Sans ce script, l'e-mail n'a pas `required` dans le gabarit : le bilan
      s'envoie, et l'aide sous le champ dit ce que coûte l'absence d'adresse.
      C'est ici, jamais dans le gabarit, que `required` est posé.
   2. La confirmation porte une phrase de plus quand « oui » est choisi : elle
      est dans le gabarit, `hidden`, et révélée ici selon la réponse. */

(function () {
  "use strict";

  var formulaire = document.getElementById("pilot-report-form");
  if (!formulaire) return;

  var email = document.getElementById("report-email");
  var suite = Array.prototype.slice.call(formulaire.querySelectorAll("input[name=\"envie-de-continuer\"]"));
  var phraseOui = document.getElementById("bilan-confirmation-prolonger");
  if (!email || !suite.length) return;

  function appliquer() {
    var prolonger = suite.some(function (rond) { return rond.checked && rond.value === "oui"; });
    var etaitRequis = email.required;
    email.required = prolonger;
    if (phraseOui) phraseOui.hidden = !prolonger;

    /* Un « e-mail nécessaire » affiché après un envoi manqué disparaît dès que
       le choix change : js/v2/formulaire.js relit le champ sur « change ». */
    if (etaitRequis && !prolonger) email.dispatchEvent(new Event("change", { bubbles: true }));
  }

  formulaire.addEventListener("change", function (evenement) {
    if (suite.indexOf(evenement.target) !== -1) appliquer();
  });

  appliquer();
})();
