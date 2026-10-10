/* Refonte — page /questionnaire : les comportements propres à cette page
   (lot 7 vague 4, QCM d'Antoine du 2026-09-30 ; remplace js/beta.js).
   La validation, l'envoi, le bilan d'erreurs et la confirmation sont dans
   js/v2/formulaire.js ; ⛔ ne rien remettre de tout cela ici.

   1. Champs conditionnels : tout bloc qui porte `data-si="nom=v1 v2"` s'ouvre
      quand le contrôle `nom` a l'une de ces valeurs. Même double levier que
      js/v2/contact.js : `hidden` sur le bloc ET sur chacun de ses `.champ`,
      `required` retiré de ses contrôles, valeurs vidées à la fermeture (un
      champ que personne ne voit ne doit pas partir). `data-requis` marque un
      contrôle obligatoire seulement une fois ouvert : sans script tout est
      visible, et l'e-mail ne doit pas bloquer celui qui répond « Non merci ».
   2. Groupes de cases : « au moins une » (`data-au-moins-un`) et « au plus 3 »
      (`data-au-plus`) passent par setCustomValidity sur la première case,
      que js/v2/formulaire.js lit comme n'importe quelle contrainte native.
      Rien n'est désactivé au-delà de 3 (QCM 2026-09-30) : l'erreur s'affiche
      à l'envoi, les cases restent lisibles et atteignables.
      ⚠️ Écoute sur `document` en capture : formulaire.js écoute « change » en
      capture sur le formulaire et relit la validité à ce moment-là ; passer
      après lui laisserait une ardoise sur un groupe déjà corrigé.
   3. Brouillon : les CHOIX seulement (listes, ronds, cases), 24 heures, effacé
      à l'envoi ou par « Effacer mes réponses ». Jamais les textes ni l'e-mail.
      Même clé que la v1 : un brouillon en cours survit à la migration. Texte
      public tenu dans la page et dans src/_data/mesure.js (stockageLocal).
   4. Compteur : une question est répondue dès qu'un de ses contrôles visibles
      a une valeur. */

(function () {
  "use strict";

  var formulaire = document.getElementById("formulaire-questionnaire");
  if (!formulaire) return;

  var CLE_BROUILLON = "azerty-questionnaire-feedback";
  var DUREE_BROUILLON = 24 * 60 * 60 * 1000;

  function tableau(liste) { return Array.prototype.slice.call(liste); }

  function controlesDe(element) {
    return tableau(element.querySelectorAll("input, select, textarea"));
  }

  /* Valeurs choisies pour un `name` : cases et ronds cochés, ou valeur d'une
     liste ou d'un champ. */
  function valeursDe(nom) {
    return tableau(formulaire.elements).filter(function (controle) {
      if (controle.name !== nom) return false;
      if (controle.type === "checkbox" || controle.type === "radio") return controle.checked;
      return controle.value !== "";
    }).map(function (controle) { return controle.value; });
  }

  /* ——— 1. Champs conditionnels ——— */

  function accorder(element, ouvert) {
    element.hidden = !ouvert;

    if (!element.classList.contains("champ")) {
      tableau(element.querySelectorAll(".champ")).forEach(function (champ) {
        champ.hidden = !ouvert;
      });
    }

    controlesDe(element).forEach(function (controle) {
      if (controle.dataset.requisInitial === undefined) {
        controle.dataset.requisInitial = controle.required ? "1" : "";
      }
      var requis = controle.dataset.requisInitial === "1" || controle.hasAttribute("data-requis");
      controle.required = ouvert && requis;

      if (!ouvert) {
        if (controle.type === "checkbox" || controle.type === "radio") controle.checked = false;
        else controle.value = "";
      }
    });
  }

  var conditionnels = tableau(formulaire.querySelectorAll("[data-si]"));
  var systeme = document.getElementById("os");
  var installation = document.getElementById("install-method");

  function accorderConditionnels() {
    /* Ordre du document : une condition qui dépend d'un champ lui-même
       conditionnel (version utilisée → fonctions de l'application) lit sa
       valeur après que ce champ a été ouvert ou vidé. */
    conditionnels.forEach(function (element) {
      var regle = element.dataset.si.split("=");
      var attendues = regle[1].split(/\s+/);
      var ouvert = valeursDe(regle[0]).some(function (valeur) {
        return attendues.indexOf(valeur) !== -1;
      });
      accorder(element, ouvert);

      /* Windows (autre) ne connaît que l'installateur classique : la question
         n'a qu'une réponse, la page la donne pour eux (comme la v1). */
      if (element.contains(installation) && systeme && systeme.value === "windows-autre") {
        installation.value = "installeur";
      }
    });
  }

  /* ——— 2. Groupes de cases ——— */

  var groupes = tableau(formulaire.querySelectorAll("[data-au-moins-un], [data-au-plus], [data-exclusif]"));

  function casesDe(groupe) {
    return tableau(groupe.querySelectorAll("input[type=\"checkbox\"]"));
  }

  function exclure(groupe, cible) {
    var exclusif = groupe.dataset.exclusif;
    if (!exclusif || !cible.checked) return;
    casesDe(groupe).forEach(function (caseACocher) {
      if (caseACocher === cible) return;
      if (cible.value === exclusif || caseACocher.value === exclusif) caseACocher.checked = false;
    });
  }

  function validerGroupes() {
    groupes.forEach(function (groupe) {
      var cases = casesDe(groupe);
      if (!cases.length) return;
      var cochees = cases.filter(function (c) { return c.checked; }).length;
      var message = "";
      if (groupe.hasAttribute("data-au-moins-un") && cochees === 0) message = groupe.dataset.erreurVide || "";
      var auPlus = Number(groupe.dataset.auPlus);
      if (auPlus && cochees > auPlus) message = groupe.dataset.erreurTrop || "";
      cases[0].setCustomValidity(message);
    });
  }

  /* ——— 3. Brouillon ——— */

  var indicateur = document.getElementById("brouillon-indicateur");

  function estUnChoix(controle) {
    return controle.tagName === "SELECT" || controle.type === "radio" || controle.type === "checkbox";
  }

  function effacerBrouillon() {
    try { localStorage.removeItem(CLE_BROUILLON); } catch (_) { /* stockage bloqué */ }
    if (indicateur) indicateur.hidden = true;
  }

  function enregistrerBrouillon() {
    var reponses = Object.create(null);
    tableau(formulaire.elements).forEach(function (controle) {
      if (!controle.name || controle.disabled || controle.name === "botcheck" || !estUnChoix(controle)) return;
      if (controle.tagName !== "SELECT" && !controle.checked) return;
      if (controle.value) (reponses[controle.name] = reponses[controle.name] || []).push(controle.value);
    });
    try {
      localStorage.setItem(CLE_BROUILLON, JSON.stringify({ savedAt: Date.now(), answers: reponses }));
    } catch (_) { return; }
    if (indicateur) indicateur.hidden = false;
  }

  function restaurerBrouillon() {
    var brouillon;
    try {
      var texte = localStorage.getItem(CLE_BROUILLON);
      if (!texte) return;
      brouillon = JSON.parse(texte);
    } catch (_) { effacerBrouillon(); return; }

    var age = Date.now() - (brouillon && brouillon.savedAt);
    if (!brouillon || !isFinite(brouillon.savedAt) || age < 0 || age >= DUREE_BROUILLON ||
        !brouillon.answers || typeof brouillon.answers !== "object" || Array.isArray(brouillon.answers)) {
      /* Efface aussi un vieux brouillon v1 qui contiendrait du texte. */
      effacerBrouillon();
      return;
    }

    tableau(formulaire.elements).forEach(function (controle) {
      if (!estUnChoix(controle) || controle.name === "botcheck" || controle.disabled) return;
      var valeurs = Object.prototype.hasOwnProperty.call(brouillon.answers, controle.name)
        ? brouillon.answers[controle.name] : null;
      if (!Array.isArray(valeurs)) return;
      if (controle.tagName === "SELECT") {
        var option = tableau(controle.options).filter(function (o) {
          return !o.disabled && valeurs.indexOf(o.value) !== -1;
        })[0];
        if (option) controle.value = option.value;
      } else if (valeurs.indexOf(controle.value) !== -1) {
        controle.checked = true;
      }
    });
    if (indicateur) indicateur.hidden = false;
  }

  /* ——— 4. Compteur ——— */

  var questions = tableau(formulaire.querySelectorAll(".question"));
  var compte = document.getElementById("progression-compte");
  var barre = document.getElementById("progression-barre");
  var remplissage = document.getElementById("progression-remplissage");

  function estRepondue(question) {
    return controlesDe(question).some(function (controle) {
      if (controle.type === "hidden") return false;
      var champ = controle.closest(".champ");
      if (champ && champ.hidden) return false;
      if (controle.type === "checkbox" || controle.type === "radio") return controle.checked;
      return controle.value.trim() !== "";
    });
  }

  function compter() {
    if (!compte || !barre) return;
    var total = questions.length;
    var repondues = questions.filter(estRepondue).length;
    var pluriel = repondues > 1 ? "s" : "";
    var texte = repondues + " question" + pluriel + " sur " + total + " répondue" + pluriel;
    compte.textContent = texte;
    barre.setAttribute("aria-valuemax", String(total));
    barre.setAttribute("aria-valuenow", String(repondues));
    barre.setAttribute("aria-valuetext", texte);
    /* Propriété CSSOM, pas attribut `style` : la CSP de production ne retire
       que les attributs écrits dans le HTML. */
    if (remplissage) remplissage.style.transform = "scaleX(" + (total ? repondues / total : 0) + ")";
  }

  /* ——— Branchement ——— */

  function toutAccorder() {
    accorderConditionnels();
    validerGroupes();
    compter();
  }

  document.addEventListener("change", function (evenement) {
    var cible = evenement.target;
    if (!cible || !formulaire.contains(cible)) return;
    groupes.forEach(function (groupe) { if (groupe.contains(cible)) exclure(groupe, cible); });
    toutAccorder();
    if (estUnChoix(cible)) enregistrerBrouillon();
  }, true);

  formulaire.addEventListener("input", compter);

  /* Envoi réussi : formulaire.js masque le formulaire. C'est le seul signal
     public du succès ; le brouillon part avec lui. */
  new MutationObserver(function () {
    if (formulaire.hidden) {
      effacerBrouillon();
      var progression = document.getElementById("progression");
      var note = document.getElementById("brouillon");
      if (progression) progression.hidden = true;
      if (note) note.hidden = true;
    }
  }).observe(formulaire, { attributes: true, attributeFilter: ["hidden"] });

  var boutonEffacer = document.getElementById("brouillon-effacer");
  if (boutonEffacer) {
    boutonEffacer.addEventListener("click", function () {
      if (!window.confirm("Effacer toutes vos réponses ? Le brouillon gardé dans ce navigateur sera supprimé.")) return;
      effacerBrouillon();
      formulaire.reset();
      var bilan = formulaire.querySelector(".formulaire__bilan");
      if (bilan) bilan.hidden = true;
      toutAccorder();
    });
  }

  restaurerBrouillon();
  toutAccorder();

  var progression = document.getElementById("progression");
  var note = document.getElementById("brouillon");
  if (progression) progression.hidden = false;
  if (note) note.hidden = false;
})();
