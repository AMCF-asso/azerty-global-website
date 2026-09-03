/* Refonte — pages caractère : copie du glyphe vedette dans le presse-papier.
   Remplace js/copy-char.js (v1) : plus de toast, le retour se fait sur le
   bouton lui-même (libellé « Copié », bordure succès) et dans une zone de
   statut pour les lecteurs d'écran. Externe et sans inline : la CSP du site
   (`script-src 'self'`) l'exige. Sans presse-papier disponible (contexte non
   sécurisé), le bouton reste inerte et le caractère reste sélectionnable. */

(function () {
  "use strict";

  var boutons = Array.prototype.slice.call(document.querySelectorAll("[data-copier]"));
  if (!boutons.length || !navigator.clipboard || !navigator.clipboard.writeText) return;

  boutons.forEach(function (bouton) {
    var libelle = bouton.querySelector("[data-copier-libelle]");
    var statut = bouton.querySelector("[data-copier-statut]");
    var libelleInitial = libelle ? libelle.textContent : "";
    var minuterie = null;

    bouton.addEventListener("click", function () {
      var caractere = bouton.getAttribute("data-copier");
      navigator.clipboard.writeText(caractere).then(function () {
        if (window.AzertyTrack && window.AzertyTrack.conversion) {
          window.AzertyTrack.conversion("copy_character", { char: caractere });
        }
        bouton.classList.add("est-copie");
        if (libelle) libelle.textContent = "Copié";
        if (statut) statut.textContent = caractere + " copié dans le presse-papier";
        clearTimeout(minuterie);
        minuterie = setTimeout(function () {
          bouton.classList.remove("est-copie");
          if (libelle) libelle.textContent = libelleInitial;
          if (statut) statut.textContent = "";
        }, 1500);
      });
    });
  });
})();
