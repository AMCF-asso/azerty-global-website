/* Refonte — /e-aigu-majuscule : l'essai « tapez ÉCOLE » (src/pages/e-aigu-majuscule.njk).
   Le champ garde ce que le clavier du visiteur écrit vraiment ; la ligne du
   dessous montre ce qu'AZERTY Global écrirait avec les mêmes touches, lu dans
   la table de l'essai libre (window.AGClavier, js/v2/clavier.js, chargé
   avant). Le dessin réglé de la page s'allume à la frappe.
   Mesure : essai_debut à la première frappe, essai_fin quand la ligne
   AZERTY Global contient ÉCOLE. Sur écran tactile la section est masquée en
   CSS (css/v2/e-majuscule.css) et ce script ne fait rien. */

(function () {
  "use strict";

  var zone = document.querySelector("[data-em-essai]");
  var api = window.AGClavier;
  if (!zone || !api) return;
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var champ = zone.querySelector("[data-em-champ]");
  var sortie = zone.querySelector("[data-em-global]");
  var verdict = zone.querySelector("[data-em-verdict]");
  var actions = zone.querySelector("[data-em-actions]");
  var clavier = document.getElementById("clavier-e-aigu-majuscule");
  if (!champ || !sortie || !verdict) return;

  var CIBLE = "ÉCOLE";
  var donnees = null;
  var frappes = [];
  var commence = false;
  var fini = false;

  if (clavier) api.relierFrappe(clavier, champ);

  /* Chargée dès l'arrivée (clavier physique seulement) : une frappe faite
     avant la fin du chargement ne doit pas manquer à la ligne AZERTY Global. */
  api.donnees().then(function (d) { donnees = d; }, function () {
    verdict.textContent = "L’essai ne peut pas se charger. Le testeur en ligne reste disponible.";
  });

  function mesurer(nom) {
    if (window.AGMesure) window.AGMesure.evenement(nom, { caractere: "É" });
  }

  function afficher() {
    sortie.textContent = "";
    if (!frappes.length) {
      var vide = document.createElement("span");
      vide.className = "em-essai__vide";
      vide.textContent = "Tapez dans le champ ci-dessus";
      sortie.appendChild(vide);
      return;
    }
    frappes.forEach(function (f) {
      if (!f.global) return;
      if (f.global !== f.natif) {
        var juste = document.createElement("span");
        juste.className = "em-essai__juste";
        juste.textContent = f.global;
        sortie.appendChild(juste);
      } else {
        sortie.appendChild(document.createTextNode(f.global));
      }
    });
  }

  function juger(verrouille) {
    var texte = frappes.map(function (f) { return f.global; }).join("");
    var deux = frappes.some(function (f) { return f.global === "É" && f.natif === "2"; });
    var dejaJuste = frappes.some(function (f) { return f.global === "É" && f.natif === "É"; });

    if (!fini && texte.indexOf(CIBLE) !== -1) {
      fini = true;
      mesurer("essai_fin");
      if (actions) actions.hidden = false;
    }

    if (fini && deux) {
      verdict.textContent = "Votre clavier a écrit « " + frappes.map(function (f) { return f.natif; }).join("") +
        " ». AZERTY Global écrit ÉCOLE avec les mêmes touches.";
    } else if (deux) {
      verdict.textContent = "Votre clavier a écrit 2 là où AZERTY Global écrit É, avec les mêmes touches.";
    } else if (dejaJuste) {
      verdict.textContent = "Votre clavier écrit déjà É avec Verr. Maj. AZERTY Global fait de même pour È, Ç et À, sur Windows, macOS et Linux.";
    } else if (verrouille === false && frappes.length) {
      verdict.textContent = "Activez Verr. Maj., puis appuyez sur la touche é.";
    } else {
      verdict.textContent = "";
    }
  }

  champ.addEventListener("keydown", function (evenement) {
    if (evenement.isComposing) return;
    /* Le curseur reste en fin de champ : la ligne AZERTY Global suit la
       frappe dans l'ordre, sans édition au milieu. */
    if (/^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/.test(evenement.key)) {
      evenement.preventDefault();
      return;
    }
    if (evenement.key === "Backspace") {
      frappes.pop();
      afficher();
      juger();
      return;
    }
    if (evenement.ctrlKey && !evenement.altKey) return;
    if (evenement.metaKey) return;

    /* Une frappe par caractère du champ, toujours : une touche que la table
       ne connaît pas (ou une table pas encore chargée) recopie ce que le
       clavier écrit ; une touche morte d'AZERTY Global n'écrit rien encore. */
    var natif = evenement.key && evenement.key.length === 1 ? evenement.key : "";
    if (!natif) return;
    var valeur = donnees ? api.valeurFrappe(donnees, evenement) : null;
    if (typeof valeur !== "string") valeur = natif;
    else if (/^dk_/.test(valeur)) valeur = "";

    if (!commence) {
      commence = true;
      mesurer("essai_debut");
    }
    frappes.push({ global: valeur, natif: natif });
    afficher();
    var verr = evenement.getModifierState ? evenement.getModifierState("CapsLock") : undefined;
    juger(verr);
  });

  /* Collage, glisser-déposer, suppression d'une sélection : la ligne
     AZERTY Global se cale sur la longueur du champ ou repart de zéro. */
  champ.addEventListener("input", function (evenement) {
    var type = evenement.inputType || "";
    if (type === "insertText" || type === "insertCompositionText") return;
    if (/^delete/.test(type)) {
      if (frappes.length > champ.value.length) frappes.length = champ.value.length;
    } else {
      champ.value = "";
      frappes = [];
    }
    afficher();
    juger();
  });
})();
