/* Refonte — page /guide : la vérification « une frappe » du héros.
   Contrat : operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md §2.1.1.

   Une seule touche suffit à nommer la disposition active : la touche marquée
   « ; » sur un clavier français porte trois caractères différents selon la
   disposition installée. La table de signatures n'est pas écrite ici — elle
   arrive par attributs, calculée au build depuis les définitions du dépôt
   (src/_data/verifInstallation.js). Ce script ne fait que comparer.

   Le champ est caché tant que ce script n'a pas tourné : un champ qui ne
   répond à rien vaut moins que rien. */

(function () {
  "use strict";

  var bloc = document.querySelector("[data-verif]");
  if (!bloc) return;

  var champ = bloc.querySelector(".verif__champ");
  var verdict = bloc.querySelector("[data-verif-verdict]");
  if (!champ || !verdict) return;

  var CODE = bloc.getAttribute("data-verif-code");
  var CODE_QWERTY = bloc.getAttribute("data-verif-code-qwerty");
  var NOM_QWERTY = bloc.getAttribute("data-verif-nom-qwerty");
  var CIBLE = bloc.getAttribute("data-verif-cible");
  var MARQUAGE = bloc.getAttribute("data-verif-marquage");

  var SIGNATURES;
  try {
    SIGNATURES = JSON.parse(bloc.getAttribute("data-verif-signatures") || "{}");
  } catch (e) {
    return;
  }
  if (!CODE || !CIBLE || !SIGNATURES[CIBLE]) return;

  /* Les touches qui ne sont pas une réponse : on les laisse au navigateur pour
     que la page reste parcourable au clavier. */
  var TRANSPARENTES = {
    Tab: true,
    Escape: true,
    Enter: true,
    Shift: true,
    Control: true,
    Alt: true,
    AltGraph: true,
    Meta: true,
    CapsLock: true
  };

  function annoncer(etat, texte, lien) {
    verdict.setAttribute("data-etat", etat);
    verdict.textContent = texte;
    if (!lien) return;
    verdict.appendChild(document.createTextNode(" "));
    var a = document.createElement("a");
    a.href = "#installer";
    a.textContent = "Installer et vérifier";
    verdict.appendChild(a);
  }

  function juger(evenement) {
    if (TRANSPARENTES[evenement.key]) return;

    /* Un clavier virtuel de téléphone n'envoie pas de code physique : on ne
       prétend pas mesurer ce qu'on ne peut pas mesurer. */
    if (!evenement.code) {
      evenement.preventDefault();
      annoncer("neutre", "Cette vérification demande un clavier physique.");
      return;
    }

    evenement.preventDefault();

    if (evenement.code === CODE_QWERTY) {
      annoncer(
        "echec",
        "Vous êtes sur " + NOM_QWERTY + ". AZERTY Global n’est pas actif sur ce poste.",
        true
      );
      return;
    }

    if (evenement.code !== CODE) {
      annoncer(
        "neutre",
        "Ce n’est pas la touche attendue : appuyez sur la touche marquée " + MARQUAGE + "."
      );
      return;
    }

    var produit = evenement.key;

    if (produit === CIBLE) {
      annoncer("succes", "Un point sans Majuscule — AZERTY Global est actif.");
      return;
    }

    if (Object.prototype.hasOwnProperty.call(SIGNATURES, produit)) {
      annoncer(
        "echec",
        "Vous êtes sur " + SIGNATURES[produit] + ". AZERTY Global n’est pas actif sur ce poste.",
        true
      );
      return;
    }

    annoncer(
      "echec",
      "Cette touche écrit « " + produit + " ». Ce n’est aucune des dispositions que cette page sait nommer.",
      true
    );
  }

  champ.addEventListener("keydown", juger);

  /* Le champ ne reçoit jamais de texte : on répond à la frappe, on ne la
     collecte pas. Un coller ou une saisie vocale ne prouverait rien. */
  champ.addEventListener("input", function () {
    champ.value = "";
  });

  bloc.hidden = false;
})();
