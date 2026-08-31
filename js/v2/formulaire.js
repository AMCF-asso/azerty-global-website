/* Refonte — comportement transverse des formulaires v2 (famille conçue sur
   /feedback le 2026-08-31). Un formulaire s'y branche en portant
   `data-formulaire` ; ce script ne connaît aucun champ en particulier.

   Trois principes tenus ici :

   1. Le formulaire marche SANS ce script. Le `action` et la clé Web3Forms sont
      dans le HTML, `novalidate` est posé par le JS et pas par le HTML : sans
      JS, le navigateur valide nativement et le message part quand même (la
      confirmation est alors celle de Web3Forms, hors marque). ⛔ Ne pas écrire
      `novalidate` dans le gabarit : ce serait retirer la validation à ceux qui
      n'ont que celle-là.
   2. Une erreur s'annonce DEUX fois : en tête de formulaire dans un bilan qui
      reçoit le focus, et sous le champ fautif. Le bilan ne porte pas de
      `role="alert"` — le déplacement du focus l'annonce déjà, et les deux
      ensemble font une double lecture.
   3. Les textes éditoriaux ne sont pas ici. Le panneau de confirmation et le
      message d'échec réseau sont des blocs `hidden` de la page, désignés par
      `data-fin` et `data-echec` ; ce script les révèle. Les seules chaînes du
      script sont les messages de validation, qui décrivent une contrainte
      technique et non un contenu. */

(function () {
  "use strict";

  var formulaires = Array.prototype.slice.call(document.querySelectorAll("form[data-formulaire]"));
  if (!formulaires.length) return;

  var enAnglais = /^en/i.test(document.documentElement.lang || "fr");
  function t(fr, en) { return enAnglais ? en : fr; }

  var URL_ENVOI = "https://api.web3forms.com/submit";
  var compteur = 0;

  /* ——— Messages de validation ——— */

  function messageDefaut(controle) {
    var etat = controle.validity;

    if (etat.valueMissing) {
      if (controle.type === "checkbox") return t("Cochez cette case pour continuer.", "Tick this box to continue.");
      if (controle.type === "radio") return t("Choisissez une réponse.", "Choose an answer.");
      if (controle.tagName === "SELECT") return t("Choisissez une option dans la liste.", "Choose an option from the list.");
      return t("Ce champ est nécessaire pour envoyer le formulaire.", "This field is required to send the form.");
    }
    if (etat.typeMismatch && controle.type === "email") {
      return t("Cette adresse e-mail n’a pas un format valide.", "This email address is not in a valid format.");
    }
    if (etat.tooShort) {
      return t("Ce texte est trop court.", "This text is too short.");
    }
    if (etat.tooLong) {
      return t("Ce texte est trop long.", "This text is too long.");
    }
    /* Repli : le message du navigateur, dans sa langue. */
    return controle.validationMessage;
  }

  /* ——— Lecture d'un bloc .champ ——— */

  function controlesDe(champ) {
    return Array.prototype.filter.call(
      champ.querySelectorAll("input, select, textarea"),
      function (controle) { return controle.willValidate; }
    );
  }

  function intituleDe(champ) {
    var source = champ.querySelector(".champ__intitule");
    if (!source) return t("Ce champ", "This field");
    var copie = source.cloneNode(true);
    var facultatif = copie.querySelector(".champ__facultatif");
    if (facultatif) facultatif.parentNode.removeChild(facultatif);
    return copie.textContent.replace(/\s+/g, " ").trim().replace(/\s*:$/, "");
  }

  function ardoiseDe(champ, premier) {
    var ardoise = champ.querySelector(".champ__erreur");
    if (!ardoise) {
      ardoise = document.createElement("span");
      ardoise.className = "champ__erreur";
      ardoise.hidden = true;
      champ.appendChild(ardoise);
    }
    if (!ardoise.id) {
      ardoise.id = (premier.id || "champ-" + (++compteur)) + "-erreur";
    }
    return ardoise;
  }

  /* aria-describedby est une LISTE : un champ peut déjà pointer vers son aide.
     Ajouter l'erreur sans écraser, la retirer sans emporter le reste. */
  function decrire(controle, identifiant, ajouter) {
    var liste = (controle.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    var position = liste.indexOf(identifiant);
    if (ajouter && position === -1) liste.push(identifiant);
    if (!ajouter && position !== -1) liste.splice(position, 1);
    if (liste.length) controle.setAttribute("aria-describedby", liste.join(" "));
    else controle.removeAttribute("aria-describedby");
  }

  function marquer(champ, message) {
    var controles = controlesDe(champ);
    if (!controles.length) return null;
    var ardoise = ardoiseDe(champ, controles[0]);

    ardoise.textContent = message || "";

    if (message) {
      ardoise.hidden = false;
      ardoise.classList.remove("champ__erreur--reservee");
      /* Marque de passage : a partir d'ici, ce champ ne rendra plus sa ligne. */
      ardoise.dataset.deja = "1";
    } else if (ardoise.dataset.deja) {
      /* ⛔ Ne PAS repasser en `hidden` : rendre la ligne deplace la page sous
         le doigt entre le mousedown et le mouseup, et le clic est perdu.
         Mesure et precedent dans css/v2/composants.css. */
      ardoise.hidden = false;
      ardoise.classList.add("champ__erreur--reservee");
    } else {
      ardoise.hidden = true;
    }

    controles.forEach(function (controle) {
      if (message) controle.setAttribute("aria-invalid", "true");
      else controle.removeAttribute("aria-invalid");
      decrire(controle, ardoise.id, !!message);
    });

    return controles[0];
  }

  /* ——— Passe de validation ——— */

  function verifier(formulaire) {
    var fautifs = [];

    Array.prototype.forEach.call(formulaire.querySelectorAll(".champ"), function (champ) {
      /* Un champ conditionnel masque ne se valide pas : `hidden` n'a aucun effet
         sur `willValidate`, donc sans cette ligne un formulaire pourrait rester
         bloque sur un champ que personne ne voit. La page qui masque le bloc
         retire aussi `required` — les deux, parce que la validation native du
         cas sans JS ne lit que le second. */
      if (champ.hidden) { marquer(champ, ""); return; }

      var controles = controlesDe(champ);
      if (!controles.length) return;

      var fautif = null;
      for (var i = 0; i < controles.length; i++) {
        /* .validity et non .checkValidity() : la méthode émet un évènement
           « invalid » par contrôle, dont personne n'a besoin ici. */
        if (!controles[i].validity.valid) { fautif = controles[i]; break; }
      }

      if (!fautif) { marquer(champ, ""); return; }

      var message = champ.dataset.erreur || messageDefaut(fautif);
      marquer(champ, message);
      fautifs.push({ champ: champ, controle: fautif, message: message });
    });

    return fautifs;
  }

  function afficherBilan(formulaire, fautifs) {
    var bilan = formulaire.querySelector(".formulaire__bilan");
    if (!bilan) return;

    var titre = bilan.querySelector(".message__titre");
    var liste = bilan.querySelector("ol");
    if (!liste) return;

    if (titre) {
      titre.textContent = fautifs.length === 1
        ? t("Un champ demande une correction", "One field needs a correction")
        : t(fautifs.length + " champs demandent une correction", fautifs.length + " fields need a correction");
    }

    liste.textContent = "";
    fautifs.forEach(function (fautif) {
      var element = document.createElement("li");
      var lien = document.createElement("a");
      lien.href = "#" + (fautif.controle.id || "");
      lien.textContent = intituleDe(fautif.champ) + " — " + fautif.message;
      lien.addEventListener("click", function (evenement) {
        evenement.preventDefault();
        fautif.controle.focus();
      });
      element.appendChild(lien);
      liste.appendChild(element);
    });

    bilan.hidden = false;
    bilan.focus();
  }

  function cacherBilan(formulaire) {
    var bilan = formulaire.querySelector(".formulaire__bilan");
    if (bilan) bilan.hidden = true;
  }

  function blocDesigne(formulaire, cle) {
    var identifiant = formulaire.dataset[cle];
    return identifiant ? document.getElementById(identifiant) : null;
  }

  /* ——— Envoi ——— */

  function envoyer(formulaire) {
    var bouton = formulaire.querySelector("button[type=\"submit\"]");
    var libelle = bouton ? bouton.textContent : "";
    var echec = blocDesigne(formulaire, "echec");

    if (echec) echec.hidden = true;
    if (bouton) {
      bouton.disabled = true;
      bouton.textContent = t("Envoi en cours…", "Sending…");
    }
    formulaire.setAttribute("aria-busy", "true");

    var donnees = new FormData(formulaire);
    donnees.set("date", new Date().toISOString());

    fetch(URL_ENVOI, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: donnees
    }).then(function (reponse) {
      return reponse.json().catch(function () { return {}; }).then(function (resultat) {
        if (!reponse.ok || resultat.success === false) throw new Error(resultat.message || "");
        return resultat;
      });
    }).then(function () {
      var fin = blocDesigne(formulaire, "fin");
      formulaire.removeAttribute("aria-busy");
      formulaire.hidden = true;
      if (fin) {
        fin.hidden = false;
        fin.focus();
      }
    }).catch(function (erreur) {
      formulaire.removeAttribute("aria-busy");
      if (bouton) {
        bouton.disabled = false;
        bouton.textContent = libelle;
      }
      if (echec) {
        echec.hidden = false;
        echec.focus();
      }
      if (window.console) window.console.error("Envoi du formulaire", erreur);
    });
  }

  /* ——— Branchement ——— */

  formulaires.forEach(function (formulaire) {
    /* Posé ici et pas dans le gabarit : sans ce script, la validation native
       reste la seule qu'il y ait. */
    formulaire.noValidate = true;

    var soumisUneFois = false;

    formulaire.addEventListener("submit", function (evenement) {
      evenement.preventDefault();
      soumisUneFois = true;

      var fautifs = verifier(formulaire);
      if (fautifs.length) {
        afficherBilan(formulaire, fautifs);
        return;
      }

      cacherBilan(formulaire);
      envoyer(formulaire);
    });

    /* Après un premier échec, un champ corrigé se déverrouille tout de suite :
       laisser une erreur affichée sous un champ devenu valide est un mensonge.
       Capture obligatoire — « blur » ne remonte pas. */
    ["change", "blur"].forEach(function (type) {
      formulaire.addEventListener(type, function (evenement) {
        if (!soumisUneFois) return;
        var cible = evenement.target;
        if (!cible || !cible.willValidate) return;
        var champ = cible.closest ? cible.closest(".champ") : null;
        if (!champ) return;
        if (controlesDe(champ).every(function (controle) { return controle.validity.valid; })) {
          marquer(champ, "");
        }
      }, true);
    });
  });
})();
