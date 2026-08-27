/* Refonte — visionneuse d'images. Les captures des modes d'emploi s'ouvrent en
   grand (retour d'Antoine, 2026-08-27 : « les images ne sont pas cliquables pour
   être vues en plein écran »).

   Sans ce script, les images restent affichées et lisibles : c'est un
   enrichissement, pas une dépendance. Chaque image devient un vrai bouton, donc
   atteignable au clavier ; <dialog> ferme nativement avec Échap et rend le focus
   à l'élément qui l'a ouverte. */

(function () {
  "use strict";

  var images = Array.prototype.slice.call(
    document.querySelectorAll(".notice__contenu img, .zoomable")
  );
  if (!images.length || typeof HTMLDialogElement === "undefined") return;

  var EN = (document.documentElement.lang || "fr").slice(0, 2) === "en";
  var LIBELLE_OUVRIR = EN ? "Enlarge the image: " : "Agrandir l’image : ";
  var LIBELLE_FERMER = EN ? "Close" : "Fermer";

  var dialogue = document.createElement("dialog");
  dialogue.className = "visionneuse";
  dialogue.innerHTML =
    '<form method="dialog" class="visionneuse__fermer-forme">' +
    '<button class="visionneuse__fermer" value="fermer"></button>' +
    "</form>" +
    '<img class="visionneuse__image" alt="">';
  document.body.appendChild(dialogue);

  var grande = dialogue.querySelector(".visionneuse__image");
  dialogue.querySelector(".visionneuse__fermer").textContent = LIBELLE_FERMER;

  // Le clic sur le fond ferme : hors de l'image et hors du bouton.
  dialogue.addEventListener("click", function (evenement) {
    if (evenement.target === dialogue) dialogue.close();
  });

  images.forEach(function (image) {
    var conteneur = image.closest("picture") || image;
    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "zoom-bouton";
    bouton.setAttribute("aria-label", LIBELLE_OUVRIR + (image.getAttribute("alt") || ""));

    conteneur.parentNode.insertBefore(bouton, conteneur);
    bouton.appendChild(conteneur);

    bouton.addEventListener("click", function () {
      grande.src = image.currentSrc || image.src;
      grande.alt = image.getAttribute("alt") || "";
      dialogue.showModal();
    });
  });
})();
