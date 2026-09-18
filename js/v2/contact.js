/* Refonte — page /contact : les comportements propres à cette page.
   La validation, l'envoi et la confirmation sont dans js/v2/formulaire.js, qui
   sert les pages à formulaire ; ⛔ ne rien remettre de tout cela ici.

   /contact absorbe /feedback et /bug (décision D11, mise en œuvre le
   2026-09-18) : un seul formulaire, dont le premier champ — le motif — ouvre
   les groupes qui le concernent.

   1. Un groupe conditionnel se ferme sur DEUX leviers à la fois : `hidden` sur
      le bloc et sur chacun de ses `.champ`, et `required` retiré de ses
      contrôles. Les deux sont nécessaires et aucun ne remplace l'autre :
      js/v2/formulaire.js ne saute que les `.champ` masqués (`hidden` sur le
      seul `fieldset` laisserait ses champs dans la passe de validation), et la
      validation native du cas sans JS ne lit, elle, que `required`.
   2. Sans ce script, aucun groupe n'est masqué : le formulaire est plus long,
      jamais cassé. C'est pourquoi `required` est écrit dans le gabarit et
      retiré ici, et jamais l'inverse.
   3. Le rappel Microsoft Store n'apparaît que sur Windows — c'est le seul
      système où l'application existe, et le proposer ailleurs est une impasse.
   4. Le paramètre `source` est validé contre une liste blanche : c'est une
      valeur qui part dans un e-mail, elle ne se recopie pas telle quelle
      depuis l'URL. */

(function () {
  "use strict";

  var formulaire = document.getElementById("formulaire-contact");
  if (!formulaire) return;

  var motif = document.getElementById("motif");

  /* ——— Ouverture et fermeture d'un groupe conditionnel ——— */

  function controlesDe(element) {
    return Array.prototype.slice.call(element.querySelectorAll("input, select, textarea"));
  }

  function accorder(element, ouvert) {
    element.hidden = !ouvert;

    /* Un `.champ` porté directement par l'attribut est son propre bloc ; un
       `fieldset` masque en plus chacun des siens. */
    if (!element.classList.contains("champ")) {
      Array.prototype.forEach.call(element.querySelectorAll(".champ"), function (champ) {
        champ.hidden = !ouvert;
      });
    }

    controlesDe(element).forEach(function (controle) {
      /* Mémorisé au premier passage : après un retrait, l'attribut du gabarit
         n'est plus lisible sur le contrôle. */
      if (controle.dataset.requisInitial === undefined) {
        controle.dataset.requisInitial = controle.required ? "1" : "";
      }
      controle.required = ouvert && controle.dataset.requisInitial === "1";

      /* Un groupe fermé rend ses champs vides. Mesuré le 2026-09-18 : sans
         cette remise à zéro, quelqu'un qui décrit un bug puis repasse sur
         « presse » envoie quand même son système d'exploitation — une donnée
         qu'il ne voit plus et qu'il n'a pas voulu joindre. Le prix est qu'un
         aller-retour entre deux motifs efface ce qui avait été saisi ; c'est
         le bon sens du côté de ce qui part. */
      if (!ouvert) {
        if (controle.type === "checkbox" || controle.type === "radio") controle.checked = false;
        else controle.value = "";
      }
    });
  }

  var groupes = Array.prototype.slice.call(
    formulaire.querySelectorAll("[data-motifs], [data-motifs-exclus]")
  );

  /* « bug » ouvre les quatre motifs `bug-*` : le préfixe suffit, et une
     catégorie de bug ajoutée au gabarit n'aura rien à câbler ici. */
  function motifCorrespond(valeur, jeton) {
    return valeur === jeton || valeur.indexOf(jeton + "-") === 0;
  }

  function accorderGroupes() {
    var valeur = motif ? motif.value : "";

    groupes.forEach(function (groupe) {
      var inclus = groupe.dataset.motifs;
      var exclus = groupe.dataset.motifsExclus;
      var ouvert;

      if (inclus) {
        ouvert = valeur !== "" && motifCorrespond(valeur, inclus);
      } else {
        /* Un groupe à exclusion est ouvert par défaut, y compris tant qu'aucun
           motif n'est choisi : le fermer au chargement ferait sauter la page
           au premier choix. */
        ouvert = !(valeur !== "" && motifCorrespond(valeur, exclus));
      }

      accorder(groupe, ouvert);
    });

    accorderInstallation();
    accorderSujet();
  }

  /* ——— Version installée, conditionnée au système ———
     Doublement conditionnel : ce champ vit dans un groupe qui peut lui-même
     être fermé. Le rouvrir alors que son groupe est fermé remettrait un champ
     obligatoire hors de vue. */

  var systeme = document.getElementById("systeme-exploitation");
  var groupeConfiguration = document.getElementById("groupe-configuration");
  var champInstallation = document.getElementById("champ-installation");
  var installation = document.getElementById("methode-installation");

  function accorderInstallation() {
    if (!systeme || !champInstallation || !installation) return;

    if (groupeConfiguration && groupeConfiguration.hidden) {
      champInstallation.hidden = true;
      installation.required = false;
      return;
    }

    var valeur = systeme.value;

    /* Une version de Windows antérieure à 10 ne connaît que l'installateur
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

  /* ——— Sujet de l'e-mail, aligné sur le motif ———
     Ce qui arrive dans la boîte se trie à la lecture de l'objet ; un objet
     unique pour cinq natures de message annule ce tri. */

  var enAnglais = /^en/i.test(document.documentElement.lang || "fr");

  var SUJETS = enAnglais ? {
    "positif": "Positive feedback — AZERTY Global",
    "suggestion": "Suggestion — AZERTY Global",
    "question": "Question — AZERTY Global",
    "bug": "Bug report — AZERTY Global",
    "presse": "Press or partnership enquiry — AZERTY Global"
  } : {
    "positif": "Retour positif — AZERTY Global",
    "suggestion": "Suggestion — AZERTY Global",
    "question": "Question — AZERTY Global",
    "bug": "Signalement de bug — AZERTY Global",
    "presse": "Demande presse ou partenariat — AZERTY Global"
  };

  var champSujet = document.getElementById("contact-sujet");

  function accorderSujet() {
    if (!champSujet || !motif) return;
    var valeur = motif.value;
    if (!valeur) return;

    var jeton = valeur.indexOf("bug-") === 0 ? "bug" : valeur;
    if (SUJETS[jeton]) champSujet.value = SUJETS[jeton];
  }

  /* ——— Branchement ——— */

  if (motif) {
    motif.addEventListener("change", accorderGroupes);
  }

  if (systeme) {
    systeme.addEventListener("change", accorderInstallation);
  }

  /* Au chargement aussi : un rechargement de page restaure les valeurs choisies
     sans émettre « change », et les groupes conditionnels resteraient fermés
     sur un formulaire à demi rempli. */
  accorderGroupes();

  /* ——— Rappel Store, sur Windows seulement ——— */

  var rappel = document.getElementById("rappel-store");
  if (rappel && /Windows/i.test(navigator.userAgent)) rappel.hidden = false;

  /* ——— Provenance et message pré-rempli ——— */

  var SOURCES_ADMISES = [
    "guide-typographique",
    "typography-guide",
    "app-notification",
    "feedback",
    "bug"
  ];

  var parametres = new URLSearchParams(window.location.search);

  var source = parametres.get("source");
  var champSource = document.getElementById("contact-source");
  if (champSource && source && SOURCES_ADMISES.indexOf(source) !== -1) {
    champSource.value = source;
  }

  var sujet = parametres.get("subject");
  var description = document.getElementById("description");
  if (description && sujet && !description.value) {
    description.value = sujet.slice(0, 180);
  }
})();
