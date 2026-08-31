/* Refonte — page /faq : filtre client sur les questions, et ouverture par ancre.

   Deux principes tenus ici :

   1. Le champ de filtre est `hidden` dans le HTML et révélé par ce script. Un
      champ de recherche qui ne filtre rien vaut moins que rien — même précédent
      que la vérification « une frappe » de /guide. Sans JS, les seize questions
      restent lisibles dans le flux, chacune dans son accordéon natif.
   2. Le filtre masque par l'attribut `hidden`, ⛔ jamais par `element.style`.
      La v1 écrivait `style.display`, ce qui rend le repli plus fragile et mêle
      la présentation au script. */

(function () {
  "use strict";

  var filtre = document.querySelector(".faq-filtre");
  var champ = document.getElementById("faq-recherche");
  var compte = document.getElementById("faq-compte");
  var effacer = document.getElementById("faq-effacer");
  var questions = Array.prototype.slice.call(document.querySelectorAll("[data-faq]"));
  var titres = Array.prototype.slice.call(document.querySelectorAll("[data-faq-section]"));

  var enAnglais = /^en/i.test(document.documentElement.lang || "fr");
  function t(fr, en) { return enAnglais ? en : fr; }

  /* ——— Ouverture par ancre ———
     Une question ciblée par le lien entrant s'ouvre : /comparatif pointe vers
     /faq#stickers, et une réponse repliée à l'arrivée est une réponse manquée. */

  function ouvrirCible() {
    if (!window.location.hash) return;
    var cible = document.getElementById(window.location.hash.slice(1));
    if (cible && cible.tagName === "DETAILS") {
      cible.open = true;
      cible.scrollIntoView({ block: "start" });
    }
  }

  ouvrirCible();
  window.addEventListener("hashchange", ouvrirCible);

  if (!filtre || !champ || !questions.length) return;
  filtre.hidden = false;

  /* ——— Filtre ———
     Comparaison sur du texte replié : sans accents, sans casse, et avec œ et æ
     ramenées à leurs deux lettres. Sans cela, « majuscule accentuee » ne
     trouverait pas « majuscules accentuées », et « coeur » raterait « cœur ». */

  function replier(texte) {
    return texte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/\s+/g, " ");
  }

  /* Le texte de chaque question est replié UNE fois : le relire à chaque frappe
     forcerait un calcul de mise en page par question et par caractère tapé. */
  var index = questions.map(function (question) {
    return { element: question, texte: replier(question.textContent) };
  });

  function sectionDe(titre) {
    var suivant = titre.nextElementSibling;
    var lot = [];
    while (suivant && !suivant.hasAttribute("data-faq-section")) {
      if (suivant.hasAttribute("data-faq")) lot.push(suivant);
      suivant = suivant.nextElementSibling;
    }
    return lot;
  }

  var sections = titres.map(function (titre) {
    return { titre: titre, questions: sectionDe(titre) };
  });

  function filtrer(saisie) {
    var terme = replier(saisie.trim());

    if (!terme) {
      index.forEach(function (entree) { entree.element.hidden = false; });
      sections.forEach(function (section) { section.titre.hidden = false; });
      compte.textContent = "";
      compte.dataset.etat = "";
      effacer.hidden = true;
      return;
    }

    var trouvees = 0;
    index.forEach(function (entree) {
      var correspond = entree.texte.indexOf(terme) !== -1;
      entree.element.hidden = !correspond;
      /* Une question retenue s'ouvre : la réponse est ce qu'on cherchait. */
      if (correspond) { entree.element.open = true; trouvees++; }
    });

    sections.forEach(function (section) {
      section.titre.hidden = !section.questions.some(function (q) { return !q.hidden; });
    });

    effacer.hidden = false;
    compte.dataset.etat = trouvees ? "trouve" : "vide";
    if (!trouvees) {
      compte.textContent = t("Aucune question ne correspond. Essayez un autre mot.",
                             "No question matches. Try another word.");
    } else if (trouvees === 1) {
      compte.textContent = t("1 question sur " + index.length,
                             "1 question out of " + index.length);
    } else {
      compte.textContent = t(trouvees + " questions sur " + index.length,
                             trouvees + " questions out of " + index.length);
    }
  }

  champ.addEventListener("input", function () { filtrer(champ.value); });

  champ.addEventListener("keydown", function (evenement) {
    if (evenement.key !== "Escape") return;
    champ.value = "";
    filtrer("");
  });

  effacer.addEventListener("click", function () {
    champ.value = "";
    filtrer("");
    champ.focus();
  });
})();
