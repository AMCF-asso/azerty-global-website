/* Refonte — composant de copie réutilisable (guide typographique, 2026-09-24).
   Tout bouton `[data-copier="<texte>"]` copie ce texte dans le presse-papier.
   Retour : classe `est-copie` 1,5 s, libellé `[data-copier-libelle]` remplacé
   par « Copié », annonce dans le `[data-copier-statut]` du bouton ou, à défaut,
   dans celui de son bloc `.copies`. Destiné à remplacer js/v2/caractere.js.
   Sans presse-papier (contexte non sécurisé), les boutons restent inertes ;
   un refus du presse-papier est annoncé (critique du 2026-09-30). */

(function () {
  "use strict";

  var boutons = Array.prototype.slice.call(document.querySelectorAll("[data-copier]"));
  if (!boutons.length || !navigator.clipboard || !navigator.clipboard.writeText) return;

  var anglais = (document.documentElement.lang || "").indexOf("en") === 0;
  var MOT_COPIE = anglais ? "Copied" : "Copié";
  var ECHEC = anglais ? "Copy failed, select the character" : "Copie impossible, sélectionnez le caractère";

  function statutDe(bouton) {
    var propre = bouton.querySelector("[data-copier-statut]");
    if (propre) return propre;
    var bloc = bouton.closest(".copies");
    return bloc ? bloc.querySelector("[data-copier-statut]") : null;
  }

  boutons.forEach(function (bouton) {
    var libelle = bouton.querySelector("[data-copier-libelle]");
    var libelleInitial = libelle ? libelle.textContent : "";
    var minuterie = null;

    bouton.addEventListener("click", function () {
      var texte = bouton.getAttribute("data-copier");
      navigator.clipboard.writeText(texte).then(function () {
        if (window.AGMesure) window.AGMesure.evenement("copie_caractere", { caractere: texte });
        var statut = statutDe(bouton);
        var nom = bouton.getAttribute("aria-label") || texte;
        bouton.classList.add("est-copie");
        if (libelle) libelle.textContent = MOT_COPIE;
        if (statut) statut.textContent = anglais ? nom.replace(/^Copy /, "") + " copied" : MOT_COPIE + "\u00a0: " + nom.replace(/^Copier /, "");
        clearTimeout(minuterie);
        minuterie = setTimeout(function () {
          bouton.classList.remove("est-copie");
          if (libelle) libelle.textContent = libelleInitial;
          if (statut) statut.textContent = "";
        }, 1500);
      }, function () {
        var statut = statutDe(bouton);
        if (statut) statut.textContent = ECHEC;
      });
    });
  });
})();
