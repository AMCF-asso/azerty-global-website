/* Refonte — page /feedback : les trois comportements propres à cette page.
   La validation, l'envoi et la confirmation sont dans js/v2/formulaire.js, qui
   sert les six pages à formulaire ; ⛔ ne rien remettre de tout cela ici.

   1. Le rappel Microsoft Store n'apparaît que sur Windows — c'est le seul
      système où l'application existe, et le proposer ailleurs est une impasse.
   2. La version installée n'est demandée qu'aux utilisateurs Windows, pour la
      même raison.
   3. Les paramètres `source` et `subject` viennent du guide typographique
      (src/_data/typographyGuide.js) et des notifications de l'application.
      ⚠️ `source` est validé contre une liste blanche : c'est une valeur qui
      part dans un e-mail, elle ne se recopie pas telle quelle depuis l'URL. */

(function () {
  "use strict";

  var formulaire = document.getElementById("formulaire-feedback");
  if (!formulaire) return;

  /* ——— 1. Rappel Store, sur Windows seulement ——— */

  var surWindows = /Windows/i.test(navigator.userAgent);
  var rappel = document.getElementById("rappel-store");
  if (rappel && surWindows) rappel.hidden = false;

  /* ——— 2. Version installée, conditionnée au système ——— */

  var systeme = document.getElementById("systeme-exploitation");
  var champInstallation = document.getElementById("champ-installation");
  var installation = document.getElementById("methode-installation");

  function accorderInstallation() {
    if (!systeme || !champInstallation || !installation) return;
    var valeur = systeme.value;

    /* Une version de Windows antérieure à 10 ne connaît que l'installeur
       classique : la question n'a qu'une réponse, autant la poser pour eux. */
    if (valeur === "win-other") {
      champInstallation.hidden = true;
      installation.value = "installeur";
      installation.required = false;
      return;
    }

    if (valeur.indexOf("win") === 0) {
      champInstallation.hidden = false;
      installation.required = true;
      return;
    }

    champInstallation.hidden = true;
    installation.value = "";
    installation.required = false;
  }

  if (systeme) {
    systeme.addEventListener("change", accorderInstallation);
    /* Au chargement aussi : un rechargement de page restaure la valeur choisie
       sans émettre « change », et le champ conditionnel resterait fermé. */
    accorderInstallation();
  }

  /* ——— 3. Provenance et sujet pré-rempli ——— */

  var SOURCES_ADMISES = ["guide-typographique", "typography-guide", "app-notification"];

  var parametres = new URLSearchParams(window.location.search);

  var source = parametres.get("source");
  var champSource = document.getElementById("feedback-source");
  if (champSource && source && SOURCES_ADMISES.indexOf(source) !== -1) {
    champSource.value = source;
  }

  var sujet = parametres.get("subject");
  var description = document.getElementById("description");
  if (description && sujet && !description.value) {
    description.value = sujet.slice(0, 180);
  }
})();
