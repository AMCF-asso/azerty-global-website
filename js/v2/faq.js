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

  /* ⛔ L'ouverture par ancre n'est plus ici : elle est passée transverse dans
     js/v2/ancres.js le 2026-08-31, quand /histoire-azerty en a eu besoin à son
     tour avec ses 26 ancres citables. Les deux pages le déclarent. */

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
  /* `brut` garde casse et accents : une recherche d'un seul caractère (« É »)
     repliée devenait « e », présent partout, et ne filtrait rien (lot 7,
     critique du 2026-09-27). */
  var index = questions.map(function (question) {
    return {
      element: question,
      texte: replier(question.textContent),
      brut: question.textContent.replace(/\s+/g, " "),
      ouvertAvant: null
    };
  });

  /* Au-delà de trois résultats, les ouvrir tous rallongeait la page de
     plusieurs écrans : on laisse la liste des questions à parcourir. */
  var OUVERTURE_MAX = 3;

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

  /* Un caractère seul se compare tel quel ; sinon chaque mot replié doit être
     présent, dans n'importe quel ordre (« lettres accentuées » trouve
     « majuscules accentuées… lettre accentuée »). */
  function correspondance(saisie) {
    var nettoyee = saisie.trim();
    if (Array.from(nettoyee).length === 1) {
      return function (entree) { return entree.brut.indexOf(nettoyee) !== -1; };
    }
    var mots = replier(nettoyee).split(" ");
    return function (entree) {
      return mots.every(function (mot) { return entree.texte.indexOf(mot) !== -1; });
    };
  }

  function filtrer(saisie) {
    var terme = replier(saisie.trim());

    /* Filtre effacé : chaque question retrouve l'état ouvert ou fermé qu'elle
       avait avant la recherche. */
    if (!terme) {
      index.forEach(function (entree) {
        entree.element.hidden = false;
        if (entree.ouvertAvant !== null) {
          entree.element.open = entree.ouvertAvant;
          entree.ouvertAvant = null;
        }
      });
      sections.forEach(function (section) { section.titre.hidden = false; });
      compte.textContent = "";
      compte.dataset.etat = "";
      effacer.hidden = true;
      return;
    }

    index.forEach(function (entree) {
      if (entree.ouvertAvant === null) entree.ouvertAvant = entree.element.open;
    });

    var correspond = correspondance(saisie);
    var retenues = index.filter(correspond);
    var trouvees = retenues.length;
    index.forEach(function (entree) {
      var retenue = retenues.indexOf(entree) !== -1;
      entree.element.hidden = !retenue;
      /* Peu de résultats : ils s'ouvrent, la réponse est ce qu'on cherchait. */
      entree.element.open = retenue && trouvees <= OUVERTURE_MAX ? true : entree.ouvertAvant;
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
