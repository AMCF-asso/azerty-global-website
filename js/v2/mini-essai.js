/* Refonte — mini-essai des pages caractère (QCM d'Antoine des 2026-09-30 et
   2026-10-03).

   Le visiteur tape deux textes sur son clavier : le caractère de la page trois
   fois, puis une phrase qui arrive seule une seconde après. Chaque touche est
   lue par sa position (event.code) et traduite par la table AZERTY Global
   2026.1, touches mortes et Verr. Maj. compris : la même lecture et le même
   dessin allumé que l'essai libre du composant (window.AGClavier, exposé par
   js/v2/clavier.js). Une faute ne s'écrit pas : le curseur attend le bon
   caractère et la ligne d'indice dit le geste. Frappe tolérante : l'espace
   vaut l'insécable, ' vaut ’. Au bout, la comparaison écrite au build (ce que
   l'AZERTY traditionnel aurait écrit, ou la méthode classique) et les deux
   boutons apparaissent.

   Porté du prototype revu le 2026-09-30
   (operations/2026-09-29-contenu-lecons/outils/essai_landings.js). Données de
   la page : attribut data-mini-essai-donnees, écrit au build par
   src/_data/miniEssai.js. Mesure : début et fin d'essai, jamais le texte
   tapé. */

(function () {
  "use strict";

  var zone = document.querySelector("[data-mini-essai]");
  var api = window.AGClavier;
  if (!zone || !api) return;
  if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var D;
  try {
    D = JSON.parse(zone.getAttribute("data-mini-essai-donnees"));
  } catch (e) {
    return;
  }

  var FINE = " ";
  var INSECABLE = " ";
  var APOSTROPHE = "’";
  var PAUSE_MS = 1000;
  var NOMS_TIRETS = { "–": "le tiret moyen (–)", "—": "le tiret cadratin (—)", "-": "le trait d’union (-)" };

  var clavier = document.getElementById(zone.getAttribute("data-mini-essai"));
  var champ = zone.querySelector("[data-saisie]");
  var elPhrase = zone.querySelector("[data-phrase]");
  var elIndice = zone.querySelector("[data-indice]");
  var elStatut = zone.querySelector("[data-statut]");
  var elRang = zone.querySelector("[data-rang]");
  var elVerr = zone.querySelector("[data-verr]");
  var elCible = zone.querySelector("[data-cible-texte]");
  var elComparaison = zone.querySelector("[data-comparaison]");
  var elActions = zone.querySelector("[data-cta]");
  var slug = (document.body.className.match(/page-caractere--([a-z-]+)/) || [])[1] || "";

  if (clavier) api.relierFrappe(clavier, champ);

  var s = null;
  var donnees = null;
  var commence = false;

  function estEspace(c) { return c === " " || c === FINE || c === INSECABLE; }
  function estMinuscule(c) { return c !== c.toLocaleUpperCase("fr"); }
  function estMajuscule(c) { return c !== c.toLocaleLowerCase("fr"); }

  function mesurer(nom, details) {
    if (window.AGMesure) window.AGMesure.evenement(nom, details);
  }

  /* « [[x]] » devient <kbd>x</kbd> ; une ponctuation collée à la touche reste
     sur sa ligne (même rendu que src/_data/miniEssai.js au build). */
  function ecrire(el, texte, pourLecteur) {
    el.textContent = "";
    var morceaux = String(texte).split(/\[\[(.+?)\]\]/);
    for (var i = 0; i < morceaux.length; i++) {
      var morceau = morceaux[i];
      if (!morceau) continue;
      if (i % 2) {
        var kbd = document.createElement("kbd");
        kbd.textContent = morceau;
        var suite = morceaux[i + 1] || "";
        var ponctuation = /^[.,;:!?]/.test(suite) ? suite.charAt(0) : "";
        if (ponctuation) {
          var bloc = document.createElement("span");
          bloc.className = "mini-essai__insecable";
          bloc.appendChild(kbd);
          bloc.appendChild(document.createTextNode(ponctuation));
          el.appendChild(bloc);
          morceaux[i + 1] = suite.slice(1);
        } else {
          el.appendChild(kbd);
        }
      } else {
        el.appendChild(document.createTextNode(morceau));
      }
    }
    if (pourLecteur) {
      var cache = document.createElement("span");
      cache.className = "visuellement-cache";
      cache.textContent = " " + pourLecteur.replace(/\[\[(.+?)\]\]/g, "$1");
      el.appendChild(cache);
    }
  }

  function egal(tape, attendu) {
    if (!tape) return false;
    if (tape === attendu) return true;
    if (estEspace(attendu) && estEspace(tape)) return true;
    return attendu === APOSTROPHE && tape === "'";
  }

  function nomTouche(code, niveau, declencheur) {
    if (code === "Space") return "Espace";
    if (D.chiffres[code] && ((niveau & 5) || declencheur)) return D.chiffres[code];
    return D.noms[code];
  }

  /* Ordre des modificateurs des pages caractère : AltGr, puis Maj. */
  function geste(touche, declencheur) {
    var mods = [];
    if (touche[1] & 4) mods.push("AltGr");
    if (touche[1] & 1) mods.push("Maj");
    return (mods.length ? mods.join(" + ") + " + " : "") + "[[" + nomTouche(touche[0], touche[1], declencheur) + "]]";
  }

  function montrer(c) {
    if (estEspace(c)) return "une espace";
    return NOMS_TIRETS[c] || "« " + c + " »";
  }

  function morteDe(touche) {
    var v = donnees && donnees.keymap[touche[0]] && donnees.keymap[touche[0]][touche[1]];
    return typeof v === "string" && v.indexOf("dk_") === 0 ? v : null;
  }

  function indice(etat, c) {
    if (estEspace(c)) return "Appuyez sur [[Espace]].";
    if (D.verr && etat.verr === false && estMajuscule(c)) {
      return "Activez Verr. Maj. " + indice({ verr: true, morte: etat.morte }, c);
    }
    if (etat.verr && estMinuscule(c)) {
      return "Désactivez Verr. Maj. " + indice({ verr: false, morte: etat.morte }, c);
    }
    if (c === ".") return "Appuyez sur la touche du point, sans Maj.";
    if (c === "@") return "Appuyez sur la touche [[²]], en haut à gauche.";
    var m = D.methodes[c];
    if (!m) return "Caractère attendu : " + montrer(c) + ".";
    if (m.length === 2) {
      if (etat.morte && etat.morte === morteDe(m[0])) return "Maintenant, appuyez sur " + geste(m[1]) + ".";
      return "Appuyez sur " + geste(m[0], true) + ", puis sur " + geste(m[1]) + ".";
    }
    return "Appuyez sur " + geste(m[0]) + ".";
  }

  /* La cause d'une faute, quand on la connaît : Verr. Maj. éteint, ou Maj
     tenu avec Verr. Maj. */
  function cause(tape, attendu) {
    if (D.verr && s.verr === false && estMajuscule(attendu) && tape === attendu.toLocaleLowerCase("fr")) {
      return "Verr. Maj. est désactivé : " + montrer(tape) + " au lieu de " + montrer(attendu) + ".";
    }
    if (s.verr && s.maj && estMajuscule(attendu) && /^[0-9]$/.test(tape || "")) {
      return "Relâchez Maj : avec Verr. Maj., Maj redonne le chiffre.";
    }
    return null;
  }

  function afficherVerr() {
    if (!elVerr) return;
    elVerr.hidden = s.verr === null || s.verr === undefined;
    elVerr.textContent = s.verr ? "Verr. Maj. activé" : "Verr. Maj. désactivé";
  }

  function statut(texte, ton, pourLecteur) {
    ecrire(elStatut, texte, pourLecteur);
    if (ton) elStatut.setAttribute("data-ton", ton);
    else elStatut.removeAttribute("data-ton");
  }

  function rendre() {
    var fragment = document.createDocumentFragment();
    var caracteres = Array.from(s.texte);
    for (var i = 0; i < caracteres.length; i++) {
      var c = caracteres[i];
      var span = document.createElement("span");
      span.textContent = c;
      if (D.focus.indexOf(c) !== -1) span.className = "cible";
      var etat = i < s.pos ? "juste" : (i === s.pos ? (s.enErreur ? "erreur" : (s.morte ? "morte" : "attendu")) : "a-taper");
      span.setAttribute("data-etat", etat);
      fragment.appendChild(span);
    }
    elPhrase.textContent = "";
    elPhrase.appendChild(fragment);
    elRang.textContent = s.seg === 0 ? "Trois fois" : "Dans une phrase";
  }

  function majIndice(forcer) {
    clearTimeout(s.minuteur);
    if (s.fini || s.pause) return;
    var c = s.caracteres[s.pos];
    var urgent = forcer || s.morte || D.focus.indexOf(c) !== -1 || (s.verr && estMinuscule(c)) ||
      (D.verr && s.verr === false && estMajuscule(c));
    if (urgent) {
      ecrire(elIndice, indice(s, c));
      return;
    }
    ecrire(elIndice, s.pos === 0 ? D.segments[s.seg].consigne : "Continuez à votre rythme.");
    s.minuteur = setTimeout(function () {
      if (!s.fini && !s.pause) ecrire(elIndice, indice(s, s.caracteres[s.pos]));
    }, 3000);
  }

  function finSegment() {
    clearTimeout(s.minuteur);
    ecrire(elIndice, "C’est écrit.");
    if (s.seg < D.segments.length - 1) {
      s.pause = true;
      statut("La phrase arrive.", "succes");
      s.suite = setTimeout(function () { if (s.pause) segmentSuivant(); }, PAUSE_MS);
      return;
    }
    s.fini = true;
    elComparaison.hidden = false;
    elActions.hidden = false;
    statut("Réussi. Entrée pour refaire.", "succes", elComparaison.textContent.replace(/\s+/g, " ").trim());
    /* La preuve et les boutons arrivent sous le pli à 1440 × 900 (critique
       du 2026-10-03) : la page descend juste assez pour les montrer, sans
       animation (DESIGN.md n'autorise que quatre transitions). */
    elActions.scrollIntoView({ block: "nearest" });
    mesurer("essai_fin", { caractere: slug });
  }

  function segmentSuivant() {
    clearTimeout(s.suite);
    s.seg++;
    s.pause = false;
    s.texte = D.segments[s.seg].texte;
    s.caracteres = Array.from(s.texte);
    s.pos = 0;
    s.enErreur = false;
    s.morte = null;
    champ.value = "";
    elCible.textContent = "Texte à taper : " + s.texte;
    rendre();
    ecrire(elIndice, D.segments[s.seg].consigne);
    /* Le lecteur d'écran entend aussi la phrase : la description du champ
       n'est pas relue quand elle change. */
    statut("Tapez la phrase.", null, "Texte à taper : " + s.texte);
  }

  function traiter(tape) {
    if (s.fini || s.pause) return;
    if (!commence) {
      commence = true;
      mesurer("essai_debut", { caractere: slug });
    }
    var attendu = s.caracteres[s.pos];
    s.morte = null;
    if (egal(tape, attendu)) {
      s.pos++;
      s.enErreur = false;
      champ.value = s.caracteres.slice(0, s.pos).join("");
      rendre();
      if (s.pos >= s.caracteres.length) {
        finSegment();
        return;
      }
      statut("", null);
      majIndice(false);
      return;
    }
    s.erreurs++;
    s.enErreur = true;
    champ.value = s.caracteres.slice(0, s.pos).join("");
    rendre();
    majIndice(true);
    var aide = indice(s, attendu);
    var voulu = montrer(attendu);
    var liaison = /^une /.test(voulu) ? " au lieu d’" + voulu : (/^le /.test(voulu) ? " au lieu du " + voulu.slice(3) : " au lieu de " + voulu);
    var vu = tape ? montrer(tape) : "";
    var debut = cause(tape, attendu) || (tape
      ? vu.charAt(0).toUpperCase() + vu.slice(1) + liaison + "."
      : "Cette combinaison n’écrit rien.");
    statut(debut, "erreur", aide);
  }

  function lireVerr(evenement) {
    if (!evenement.getModifierState) return;
    var verr = evenement.getModifierState("CapsLock");
    s.maj = !!evenement.shiftKey;
    if (verr !== s.verr) {
      s.verr = verr;
      afficherVerr();
      /* Une faute due à Verr. Maj. ne reste pas affichée une fois Verr. Maj.
         changé : le caractère attendu redevient simplement attendu. */
      if (s.enErreur) {
        s.enErreur = false;
        rendre();
        statut("", null);
      }
      majIndice(false);
    }
  }

  var IGNOREES = ["Shift", "Control", "Alt", "AltGraph", "Meta", "OS", "Tab", "Escape", "ContextMenu",
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

  function surTouche(evenement) {
    var k = evenement.key;
    lireVerr(evenement);
    if (k === "CapsLock" || IGNOREES.indexOf(k) !== -1) return;
    if ((evenement.ctrlKey || evenement.metaKey) && !(evenement.ctrlKey && evenement.altKey)) return;
    if (k === "Unidentified" || k === "Process" || evenement.isComposing) return;
    if (k === "Enter") {
      evenement.preventDefault();
      if (s.pause) segmentSuivant();
      else if (s.fini) charger(true);
      return;
    }
    if (k === "Backspace" || k === "Delete") {
      evenement.preventDefault();
      if (s.morte) {
        s.morte = null;
        rendre();
        majIndice(true);
        statut("Accent annulé.", null);
        return;
      }
      if (!s.fini && !s.pause) statut("Rien à effacer : le curseur attend " + montrer(s.caracteres[s.pos]) + ".", null);
      return;
    }
    if (!donnees) {
      /* Table pas encore là (premier focus) : on ne devine pas la frappe. */
      evenement.preventDefault();
      return;
    }
    var valeur = api.valeurFrappe(donnees, evenement);
    if (valeur === undefined && !(k && k.length === 1) && k !== "Dead") return;
    evenement.preventDefault();
    if (s.fini || s.pause || evenement.repeat) return;
    if (valeur === undefined) {
      if (k !== "Dead") traiter(k);
      return;
    }
    if (valeur === null) {
      traiter(null);
      return;
    }
    if (valeur.indexOf("dk_") === 0) {
      /* Aucune phrase de ces pages ne passe par une touche morte : une touche
         morte qui n'ouvre pas le caractère attendu est une faute, pas un
         accent à mettre en attente. */
      var attenduMethode = D.methodes[s.caracteres[s.pos]];
      if (!attenduMethode || attenduMethode.length !== 2 || morteDe(attenduMethode[0]) !== valeur) {
        traiter(null);
        return;
      }
      s.morte = valeur;
      s.enErreur = false;
      rendre();
      majIndice(true);
      statut("Accent en attente : appuyez maintenant sur la lettre.", null, indice(s, s.caracteres[s.pos]));
      return;
    }
    if (s.morte) {
      var table = donnees.deadkeys[s.morte];
      valeur = (table && table[valeur]) || valeur;
    }
    traiter(valeur);
  }

  /* Ce qui n'est pas passé par keydown (collage, glisser) : le collage est
     refusé, le reste est relu caractère par caractère. */
  function surAvantSaisie(evenement) {
    var type = evenement.inputType || "";
    if (/^insertFrom(Paste|Drop|Yank)/.test(type)) {
      evenement.preventDefault();
      statut("Le collage est désactivé : tapez le texte.", null);
      return;
    }
    if (!evenement.cancelable) return;
    evenement.preventDefault();
    if (type.indexOf("delete") === 0) return;
    if (evenement.data) Array.from(evenement.data).forEach(traiter);
  }

  function surSaisie() {
    var juste = s.caracteres.slice(0, s.pos).join("");
    var v = champ.value;
    if (v === juste) return;
    var ajout = v.indexOf(juste) === 0 ? v.slice(juste.length) : "";
    champ.value = juste;
    if (Array.from(ajout).length > 3) {
      statut("Le collage est désactivé : tapez le texte.", null);
      return;
    }
    Array.from(ajout).forEach(traiter);
  }

  function charger(refaire) {
    var avant = s;
    if (avant) {
      clearTimeout(avant.minuteur);
      clearTimeout(avant.suite);
    }
    s = {
      seg: 0, texte: D.segments[0].texte, caracteres: Array.from(D.segments[0].texte), pos: 0, erreurs: 0,
      fini: false, pause: false, enErreur: false, morte: null, maj: false,
      verr: avant ? avant.verr : null, minuteur: null, suite: null
    };
    elComparaison.hidden = true;
    elActions.hidden = true;
    elCible.textContent = "Texte à taper : " + s.texte;
    afficherVerr();
    champ.value = "";
    rendre();
    /* Pour refaire avec Verr. Maj. déjà allumé, la consigne de départ
       (« Activez Verr. Maj. ») serait fausse : l'indice dit le geste seul. */
    if (refaire && D.verr && s.verr) ecrire(elIndice, indice(s, s.caracteres[0]));
    else ecrire(elIndice, D.segments[0].consigne);
    if (refaire) statut("Tapez le texte.", null, "Texte à taper : " + s.texte);
  }

  /* La table (28 Ko, partagée avec le composant) se charge quand le
     navigateur est libre, pour que la première frappe ne se perde pas ; le
     focus la redemande si ce n'est pas encore fait. */
  function chargerTable() {
    api.donnees().then(function (table) {
      donnees = table;
    }).catch(function () {
      statut("L’essai ne peut pas se charger. Le testeur reste disponible.", "erreur");
    });
  }
  if (window.requestIdleCallback) window.requestIdleCallback(chargerTable, { timeout: 3000 });
  else setTimeout(chargerTable, 1500);
  champ.addEventListener("focus", function () {
    if (!donnees) chargerTable();
    /* « Allez dans le champ… » n'a plus d'objet une fois dedans. */
    if (!commence && elStatut.getAttribute("data-ton") === null) statut("", null);
  });
  champ.addEventListener("keydown", surTouche);
  champ.addEventListener("keyup", lireVerr);
  champ.addEventListener("beforeinput", surAvantSaisie);
  champ.addEventListener("input", surSaisie);

  charger(false);
})();
