/* /afrique-francophone : présélectionne le pays du formulaire de pilote
   depuis l'adresse (?pays=sn), quand le visiteur arrive d'une page pays.
   Code inconnu ou absent : la liste reste sur « Choisir… ». */

(function () {
  "use strict";

  var liste = document.getElementById("afr-pays");
  if (!liste) return;

  var code = new URLSearchParams(window.location.search).get("pays");
  if (!code) return;
  code = code.toLowerCase();

  for (var i = 0; i < liste.options.length; i++) {
    if (liste.options[i].value === code) {
      liste.value = code;
      return;
    }
  }
})();
