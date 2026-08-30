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


/* ——— « Installer et vérifier » : le sélecteur de système ———————————————

   Même motif que /download (composant transverse `.selecteur-os`), même
   règle : la détection choisit l'onglet ouvert, elle ne redirige rien et ne
   déclenche aucun téléchargement.

   ⚠️ Les trois panneaux sortent du gabarit SANS `hidden` et c'est ce script
   qui replie les inactifs. Sur /download le `hidden` est dans le HTML, donc un
   lecteur sans script n'y voit jamais les instructions macOS ni Linux ; ici
   la version précédente les donnait à tout le monde en cinq accordéons, et on
   ne retire pas du contenu en refondant. */

(function () {
  "use strict";

  var section = document.getElementById("installer");
  if (!section) return;

  var onglets = Array.prototype.slice.call(section.querySelectorAll(".selecteur-os__onglet"));
  if (!onglets.length) return;

  function panneauDe(onglet) {
    return document.getElementById("guide-os-" + onglet.getAttribute("data-os"));
  }

  function activer(os, prendreLeFocus) {
    onglets.forEach(function (onglet) {
      var actif = onglet.getAttribute("data-os") === os;
      onglet.setAttribute("aria-selected", actif ? "true" : "false");
      onglet.tabIndex = actif ? 0 : -1;
      var panneau = panneauDe(onglet);
      if (panneau) panneau.hidden = !actif;
      if (actif && prendreLeFocus) onglet.focus();
    });
  }

  onglets.forEach(function (onglet, index) {
    onglet.addEventListener("click", function () {
      activer(onglet.getAttribute("data-os"), false);
    });
    onglet.addEventListener("keydown", function (evenement) {
      var pas = evenement.key === "ArrowRight" ? 1 : evenement.key === "ArrowLeft" ? -1 : 0;
      if (!pas) return;
      evenement.preventDefault();
      var cible = onglets[(index + pas + onglets.length) % onglets.length];
      activer(cible.getAttribute("data-os"), true);
    });
  });

  /* Un téléphone retombe sur Windows : AZERTY Global s'installe depuis un
     ordinateur, et deviner « macOS » depuis un iPhone ouvrirait le mauvais
     mode d'emploi. */
  function systemeDetecte() {
    var plateforme =
      (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    var texte = (plateforme + " " + (navigator.userAgent || "")).toLowerCase();
    if (texte.indexOf("android") !== -1 || /iphone|ipad|ipod/.test(texte)) return "windows";
    if (texte.indexOf("win") !== -1) return "windows";
    if (texte.indexOf("mac") !== -1) return "macos";
    if (texte.indexOf("linux") !== -1 || texte.indexOf("x11") !== -1) return "linux";
    return "windows";
  }

  activer(systemeDetecte(), false);
})();
