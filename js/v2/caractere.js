/* Refonte — pages caractère : copie du glyphe vedette dans le presse-papier.
   Remplace js/copy-char.js (v1) : plus de toast, le retour se fait sur le
   bouton lui-même (libellé « Copié », bordure succès) et dans une zone de
   statut pour les lecteurs d'écran. Externe et sans inline : la CSP du site
   (`script-src 'self'`) l'exige. Sans presse-papier disponible (contexte non
   sécurisé), le bouton reste inerte et le caractère reste sélectionnable.

   Bulle (QCM d'Antoine du 2026-10-13) : un bouton qui porte
   `data-copier-bulle="<id>"` ouvre, après une copie réussie seulement, le
   popover de cet id (src/_includes/v2/pastille-copie.njk). Non modale, elle
   reste ouverte jusqu'au clic ailleurs, Échap ou ×, que le navigateur gère
   (`popover="auto"`). Le script la pose sous le bouton, en coordonnées du
   document pour qu'elle suive le défilement, et rend le focus au bouton si
   elle se ferme alors qu'il était dedans. Sans `showPopover`, elle reste
   masquée (CSS) et la copie garde son retour habituel. Un refus du
   presse-papier n'ouvre jamais la bulle. */

(function () {
  "use strict";

  var boutons = Array.prototype.slice.call(document.querySelectorAll("[data-copier]"));
  if (!boutons.length || !navigator.clipboard || !navigator.clipboard.writeText) return;

  var ECART_BULLE = 8;
  var MARGE_BORD = 16;

  /* La bulle du bouton, ou null quand le bouton n'en a pas ou que le
     navigateur n'a pas `popover`. */
  function bulleDe(bouton) {
    var id = bouton.getAttribute("data-copier-bulle");
    var bulle = id ? document.getElementById(id) : null;
    return bulle && typeof bulle.showPopover === "function" ? bulle : null;
  }

  function placer(bouton, bulle) {
    var r = bouton.getBoundingClientRect();
    var racine = document.documentElement;
    var largeur = bulle.offsetWidth;
    var gauche = r.left + window.pageXOffset;
    /* Bouton dans la moitié droite : la bulle s'aligne sur son bord droit. */
    if (r.left + r.width / 2 > racine.clientWidth / 2) gauche = r.right + window.pageXOffset - largeur;
    var maxi = racine.clientWidth + window.pageXOffset - MARGE_BORD - largeur;
    bulle.style.top = Math.round(r.bottom + window.pageYOffset + ECART_BULLE) + "px";
    bulle.style.left = Math.round(Math.max(MARGE_BORD + window.pageXOffset, Math.min(gauche, maxi))) + "px";
  }

  boutons.forEach(function (bouton) {
    var libelle = bouton.querySelector("[data-copier-libelle]");
    var statut = bouton.querySelector("[data-copier-statut]");
    var libelleInitial = libelle ? libelle.textContent : "";
    var minuterie = null;
    var bulle = bulleDe(bouton);

    if (bulle) {
      bulle.addEventListener("toggle", function (evenement) {
        if (evenement.newState === "closed" && bulle.contains(document.activeElement)) bouton.focus();
      });
      window.addEventListener("resize", function () {
        if (bulle.matches(":popover-open")) placer(bouton, bulle);
      });
    }

    function annoncer(texteLibelle, texteStatut, copie) {
      bouton.classList.toggle("est-copie", copie);
      if (libelle) libelle.textContent = texteLibelle;
      if (statut) statut.textContent = texteStatut;
      clearTimeout(minuterie);
      minuterie = setTimeout(function () {
        bouton.classList.remove("est-copie");
        if (libelle) libelle.textContent = libelleInitial;
        if (statut) statut.textContent = "";
      }, copie ? 1500 : 3000);
    }

    bouton.addEventListener("click", function () {
      var caractere = bouton.getAttribute("data-copier");
      /* Le navigateur peut refuser l'écriture (permission, document sans
         focus) : le bouton le dit au lieu de rester muet. */
      navigator.clipboard.writeText(caractere).then(function () {
        if (window.AGMesure) window.AGMesure.evenement("copie_caractere", { caractere: caractere });
        annoncer("Copié", caractere + " copié dans le presse-papier", true);
        if (bulle) {
          if (!bulle.matches(":popover-open")) bulle.showPopover();
          placer(bouton, bulle);
        }
      }, function () {
        annoncer("Copie refusée", "Le navigateur a refusé de copier " + caractere, false);
      });
    });
  });
})();
