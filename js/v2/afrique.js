/* Refonte — page /afrique : carte cliquable, liste de repli synchronisée,
   panneau des langues et grille syllabaire, fragment d'URL, info-bulle,
   pincement mobile (décisions du 2026-09-11, nuit du 2026-09-13).

   Principes tenus ici :
   1. La carte est `aria-hidden` : le clavier et le lecteur d'écran passent par
      la liste `<select>`, que ce script garde synchronisée avec la carte.
   2. Un fichier par pays, chargé au clic (`/data/afrique/<cc>.json`, décision
      36) et gardé en mémoire : « le visiteur cliquera au maximum sur trois ou
      quatre pays ».
   3. Aucun chiffre ni nom écrit ici : tout vient des `<option>` rendues au
      build et des JSON générés par scripts/build-afrique-data.mjs.
   4. L'état passe par des classes et l'attribut `hidden`, jamais par
      `element.style` — sauf la position de la bulle et le zoom, qui sont des
      mesures (CSSOM autorisé sous la CSP `style-src 'self'`). */

(function () {
  "use strict";

  var racine = document.querySelector("[data-afrique-carte]");
  var liste = document.querySelector("[data-afrique-liste]");
  var recherche = document.querySelector("[data-afrique-recherche]");
  var suggestions = document.querySelector("[data-afrique-suggestions]");
  var panneau = document.querySelector("[data-afrique-panneau]");
  if (!racine || !liste || !panneau) return;

  var filtreLangues = document.querySelector("[data-afrique-filtre-langues]");
  if (filtreLangues) {
    filtreLangues.hidden = false;
    document.querySelector("[data-afrique-filtre-label]").hidden = false;
    var languesIndex = document.querySelectorAll("#afrique-langues-index li");
    function normaliserNom(texte) {
      return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
    }
    filtreLangues.addEventListener("input", function () {
      var terme = normaliserNom(filtreLangues.value.trim());
      var trouve = false;
      languesIndex.forEach(function (item) {
        item.hidden = normaliserNom(item.textContent).indexOf(terme) === -1;
        if (!item.hidden) trouve = true;
      });
      document.querySelector("[data-afrique-langue-absente]").hidden = trouve;
    });
  }

  var svg = racine.querySelector("svg[data-carte-afrique]");
  var bulle = racine.querySelector("[data-afrique-bulle]");
  var reset = racine.querySelector("[data-afrique-reset]");
  var cache = {};
  var etat = { pays: "", langue: "" };
  var CLASSE_ACTIF = "carte-afrique__pays--actif";

  /* ——— Utilitaires DOM ——— */

  function el(tag, classe, texte) {
    var noeud = document.createElement(tag);
    if (classe) noeud.className = classe;
    if (texte !== undefined && texte !== null) noeud.textContent = texte;
    return noeud;
  }

  function vider(noeud) {
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
  }

  /* Annonce courte (role=status), au lieu de relire toute la fiche : le pays et
     son nombre de langues, puis la langue affichée. */
  var annonce = document.querySelector("[data-afrique-annonce]");
  function annoncer(texte) {
    if (!annonce) return;
    annonce.textContent = "";
    window.setTimeout(function () { annonce.textContent = texte; }, 60);
  }
  function ficheDe(nom) {
    var n = nom.charAt(0).toLocaleLowerCase("fr") + nom.slice(1);
    return "Fiche " + (/^[aeiouyàâéèêîïôû]/.test(n) ? "de l’" : "du ") + n + ".";
  }

  function pluriel(n, singulier, plurielForme) {
    return n + " " + (n > 1 ? plurielForme : singulier);
  }

  /* ——— Les pays, lus dans les <option> rendues au build ——— */

  function optionDe(code) {
    return liste.querySelector('option[value="' + code + '"]');
  }

  function infosPays(code) {
    var o = optionDe(code);
    if (!o) return null;
    return {
      code: code,
      nom: o.getAttribute("data-nom") || o.textContent,
      nb: Number(o.getAttribute("data-nb") || 0),
      vedettes: (o.getAttribute("data-vedettes") || "").split(",").filter(Boolean),
      euro: o.getAttribute("data-euro") || "",
      hors: o.getAttribute("data-hors") || "",
      ecritures: o.getAttribute("data-ecritures") || "",
      sansFiche: o.hasAttribute("data-sans-fiche")
    };
  }

  /* ——— Info-bulle : nom seul, au survol uniquement ——— */

  function texteBulle(cible) {
    var p = infosPays(cible.getAttribute("data-pays"));
    return p ? p.nom : (cible.getAttribute("data-nom") || "");
  }

  function montrerBulle(cible, x, y) {
    if (!bulle) return;
    var cadre = racine.getBoundingClientRect();
    bulle.textContent = texteBulle(cible);
    bulle.hidden = false;
    var mesure = bulle.getBoundingClientRect();
    var gauche = x - cadre.left - mesure.width / 2;
    gauche = Math.max(0, Math.min(gauche, cadre.width - mesure.width));
    var haut = y - cadre.top - mesure.height - 14;
    if (haut < 0) haut = y - cadre.top + 18;
    bulle.style.left = gauche + "px";
    bulle.style.top = haut + "px";
  }

  function cacherBulle() {
    if (bulle) bulle.hidden = true;
  }

  function cibleSous(e) {
    var t = e.target;
    if (!t || !t.closest) return null;
    return t.closest("[data-pays], [data-statut]");
  }

  var survolDisponible = window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (survolDisponible) {
    svg.addEventListener("pointermove", function (e) {
      var cible = cibleSous(e);
      if (cible) montrerBulle(cible, e.clientX, e.clientY);
      else cacherBulle();
    });
    svg.addEventListener("pointerleave", cacherBulle);
  }
  svg.addEventListener("pointerdown", cacherBulle);
  svg.addEventListener("touchstart", cacherBulle, { passive: true });

  /* ——— Sélection d'un pays ——— */

  function marquer(code) {
    var actifs = svg.querySelectorAll("." + CLASSE_ACTIF);
    for (var i = 0; i < actifs.length; i++) actifs[i].classList.remove(CLASSE_ACTIF);
    if (!code) return;
    var cibles = svg.querySelectorAll('[data-pays="' + code + '"]');
    for (var j = 0; j < cibles.length; j++) cibles[j].classList.add(CLASSE_ACTIF);
  }

  function charger(code) {
    if (cache[code]) return Promise.resolve(cache[code]);
    return fetch("/data/afrique/" + code + ".json").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      cache[code] = d;
      return d;
    });
  }

  function ecrireHash() {
    if (!window.history || !history.replaceState) return;
    var h = etat.pays ? "#" + etat.pays + (etat.langue ? "/" + etat.langue : "") : "";
    history.replaceState(null, "", location.pathname + location.search + h);
  }

  /* `reveler` : clic sur la carte ou sur une suggestion. La fiche s'ouvre sous la
     carte, souvent hors écran : la page y défile et le focus passe sur son titre
     (A050). Jamais pendant la frappe ni à l'ouverture par un fragment #. */
  function choisirPays(code, langueVoulue, reveler) {
    var p = infosPays(code);
    if (!p) return;
    etat.pays = code;
    etat.langue = "";
    if (liste.value !== code) liste.value = code;
    // Un pays choisi (carte, lien, ancre) efface un « Aucun pays ne correspond » resté affiché.
    var statutRecherche = document.querySelector("[data-afrique-recherche-statut]");
    if (statutRecherche) statutRecherche.textContent = "";
    // Pendant la frappe, la saisie reste celle du visiteur (« Rw » ouvre le Rwanda).
    if (recherche && recherche.value !== p.nom && document.activeElement !== recherche) recherche.value = p.nom;
    marquer(code);
    rendreAttente(p);
    ecrireHash();
    charger(code).then(function (d) {
      if (etat.pays !== code) return;
      rendrePanneau(p, d, langueVoulue);
      if (reveler) revelerPanneau();
    }).catch(function () {
      if (etat.pays !== code) return;
      vider(panneau);
      panneau.appendChild(el("h2", null, p.nom));
      panneau.appendChild(el("p", "texte-2", "Les fiches de ce pays n’ont pas pu être chargées. Réessayez, ou passez par le guide des touches mortes."));
      ajouterActions();
      annoncer(p.nom + " : les fiches n’ont pas pu être chargées.");
      if (reveler) revelerPanneau();
    });
  }

  function revelerPanneau() {
    var titre = panneau.querySelector("h2");
    if (!titre) return;
    titre.setAttribute("tabindex", "-1");
    // Un titre visible tout en bas laisse les lettres sous la ligne de flottaison :
    // on défile aussi quand il est dans la moitié basse de l'écran.
    var cadre = titre.getBoundingClientRect();
    if (cadre.top < 0 || cadre.top > window.innerHeight / 2) {
      var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      titre.scrollIntoView({ block: "start", behavior: reduit ? "auto" : "smooth" });
    }
    titre.focus({ preventScroll: true });
  }

  function rendreAttente(p) {
    vider(panneau);
    panneau.appendChild(el("h2", null, p.nom));
    panneau.appendChild(el("p", "afrique-panneau__amorce texte-2", "Chargement des langues…"));
  }

  function rendreAmorce(garderSaisie) {
    etat.pays = "";
    etat.langue = "";
    marquer("");
    if (recherche && !garderSaisie) recherche.value = "";
    liste.value = "";
    vider(panneau);
    panneau.appendChild(el("p", "afrique-panneau__amorce texte-2",
      "Choisissez un pays sur la carte ou par la recherche : ses langues s’affichent ici, avec chaque lettre et la façon de la taper."));
    ecrireHash();
  }

  /* ——— Panneau : chips des vedettes, première ouverte, « toutes les langues »,
     ligne « officielles aussi », phrase hors périmètre, CTA (décisions 7, 19,
     27, 29, 34) ——— */

  /* ——— Langues d'une autre écriture et pays sans fiche latine ——— */

  // Voisins terrestres qui ont des fiches latines, pour les quatre pays qui n'en ont aucune.
  var VOISINS = { eg: ["sd"], ly: ["dz", "ne", "td", "sd"], tn: ["dz"], er: ["et", "dj", "sd"] };

  function liste2(items) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " et " + items[items.length - 1];
  }

  // « L’arabe et le hassanya (alphabet arabe) demandent un autre clavier. »
  function phraseHors(p) {
    var noms = p.hors.split(", ");
    var ecritures = p.ecritures.split(", ");
    var groupes = [];
    noms.forEach(function (nom, i) {
      var e = (ecritures[i] || "").toLocaleLowerCase("fr");
      var g = groupes.filter(function (x) { return x.ecriture === e; })[0];
      if (!g) { g = { ecriture: e, noms: [] }; groupes.push(g); }
      g.noms.push((/^[aeiouyàâéèêîïôû]/.test(nom) ? "l’" : "le ") + nom);
    });
    var parties = groupes.map(function (g) {
      var alphabet = g.ecriture === "tifinagh" || g.ecriture === "n’ko" ? g.ecriture : "alphabet " + g.ecriture;
      return liste2(g.noms) + " (" + alphabet + ")";
    });
    var phrase = liste2(parties);
    return phrase.charAt(0).toLocaleUpperCase("fr") + phrase.slice(1) +
      (noms.length > 1 ? " demandent" : " demande") + " un autre clavier.";
  }

  // Voisins en liens dans la phrase : « … chez les voisins : Algérie, Niger et Soudan. »
  function ajouterVoisins(paragraphe, codes) {
    paragraphe.appendChild(document.createTextNode(" "));
    codes.forEach(function (code, i) {
      if (i > 0) paragraphe.appendChild(document.createTextNode(i === codes.length - 1 ? " et " : ", "));
      var lien = el("a", null, infosPays(code).nom);
      lien.href = "#" + code;
      lien.addEventListener("click", function (e) {
        e.preventDefault();
        choisirPays(code, "", true);
      });
      paragraphe.appendChild(lien);
    });
    paragraphe.appendChild(document.createTextNode("."));
  }

  function rendrePanneau(p, d, langueVoulue) {
    var langues = d.langues || [];
    vider(panneau);
    panneau.appendChild(el("h2", null, p.nom));

    // Pays sans aucune fiche latine (Égypte, Libye, Tunisie, Érythrée) : une phrase,
    // puis les voisins qui en ont, sans les trois actions (impasse de la critique).
    var sansFiche = !langues.length && !!p.hors;
    var voisins = sansFiche ? (VOISINS[p.code] || []).filter(optionDe) : [];
    if (p.hors) {
      var phrase = el("p", sansFiche ? "afrique-panneau__hors" : "afrique-panneau__meta",
        phraseHors(p) + (!sansFiche
          ? " Voici les langues du pays qui s’écrivent en alphabet latin."
          : voisins.length
            ? " AZERTY Global couvre ici les langues à alphabet latin, par exemple chez les voisins\u00A0:"
            : " AZERTY Global couvre ici les langues à alphabet latin."));
      if (voisins.length) ajouterVoisins(phrase, voisins);
      panneau.appendChild(phrase);
    }

    if (sansFiche) {
      // Rien d'autre : la phrase et ses voisins suffisent.
    } else if (!langues.length) {
      panneau.appendChild(el("p", "texte-2", "Les alphabets des langues de ce pays ne sont pas encore documentés sur cette page."));
    } else {
      var vedettes = [];
      var autres = [];
      var parId = {};
      langues.forEach(function (l) { parId[l.id] = l; });
      p.vedettes.forEach(function (id) { if (parId[id]) vedettes.push(parId[id]); });
      langues.forEach(function (l) { if (p.vedettes.indexOf(l.id) === -1) autres.push(l); });
      if (!vedettes.length) { vedettes = autres; autres = []; }

      var zoneLangue = el("div", "afrique-langue");
      var chipsVedettes = rendreChips(vedettes, zoneLangue, autres.length ? "Langues principales" : "Langues");
      panneau.appendChild(chipsVedettes);

      if (autres.length) {
        var toutes = el("details", "notice afrique-toutes");
        toutes.appendChild(el("summary", null, "Autres langues (" + autres.length + ")"));
        var contenu = el("div", "notice__contenu");
        contenu.appendChild(rendreChips(autres, zoneLangue, "Autres langues"));
        toutes.appendChild(contenu);
        panneau.appendChild(toutes);
      }

      panneau.appendChild(zoneLangue);

      // Première vedette qui a des lettres à montrer (l'oromo, sans lettre propre, ne
      // doit pas ouvrir l'Éthiopie) ; un lien #cc/langue reste prioritaire.
      var avecLettres = function (l) { return l.caracteres && l.caracteres.length; };
      var premiere = (langueVoulue && parId[langueVoulue]) || vedettes.filter(avecLettres)[0] || vedettes[0] || langues[0];
      choisirLangue(premiere, zoneLangue);
    }

    if (p.euro) {
      // Sans fiche latine, « aussi » ne renvoie à rien.
      panneau.appendChild(el("p", "afrique-panneau__meta afrique-panneau__euro", !langues.length
        ? (p.euro.indexOf(",") !== -1 ? "Langues officielles européennes : " : "Langue officielle européenne : ") + p.euro + "."
        : "Langues officielles aussi : " + p.euro + "."));
    }

    // Fiche vide (Seychelles, São Tomé) : le guide seul, pas de « Télécharger ».
    if (!sansFiche) ajouterActions(!langues.length);

    annoncer(langues.length
      ? p.nom + " : " + pluriel(langues.length, "langue", "langues") + ". " + ficheDe(premiere.nom)
      : p.nom + (p.hors
        ? " : aucune langue à alphabet latin sur cette page."
        : " : langues pas encore documentées sur cette page."));
  }

  function rendreChips(langues, zoneLangue, nomGroupe) {
    var groupe = el("div", "afrique-chips");
    groupe.setAttribute("role", "group");
    groupe.setAttribute("aria-label", nomGroupe);
    langues.forEach(function (l) {
      var chip = el("button", "afrique-chip", l.nom);
      chip.type = "button";
      chip.setAttribute("data-langue", l.id);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", function () {
        choisirLangue(l, zoneLangue);
        annoncer(ficheDe(l.nom));
      });
      groupe.appendChild(chip);
    });
    return groupe;
  }

  function choisirLangue(l, zoneLangue) {
    etat.langue = l.id;
    var chips = panneau.querySelectorAll(".afrique-chip");
    for (var i = 0; i < chips.length; i++) {
      var active = chips[i].getAttribute("data-langue") === l.id;
      chips[i].setAttribute("aria-pressed", active ? "true" : "false");
      // La langue choisie reste visible, même rangée dans « Autres langues ».
      var repli = active && chips[i].closest("details");
      if (repli) repli.open = true;
    }
    vider(zoneLangue);
    zoneLangue.appendChild(el("h3", null, l.nom));
    // Statut de la fiche sous son titre, pas juste avant « Télécharger » (critique du 2026-09-30).
    if (l.provisoire) {
      var note = el("p", "afrique-note-provisoire texte-petit texte-2");
      note.appendChild(document.createTextNode("Alphabet à confirmer ("));
      var ref = (l.source && l.source.ref) || "";
      if (/^https?:\/\//.test(ref)) {
        var a = el("a", null, "source");
        a.href = ref;
        a.rel = "noopener";
        a.setAttribute("aria-label", "source de l’alphabet " + l.nom.toLocaleLowerCase("fr"));
        note.appendChild(a);
      } else {
        note.appendChild(document.createTextNode(ref || "source"));
      }
      note.appendChild(document.createTextNode(") : certains caractères peuvent manquer dans cette liste."));
      zoneLangue.appendChild(note);
    }
    if (!l.caracteres || !l.caracteres.length) {
      var nom = l.nom.toLocaleLowerCase("fr");
      zoneLangue.appendChild(el("p", "afrique-langue__suffit",
        (/^[aeiouyàâéèêîïôû]/.test(nom) ? "L’" : "Le ") + nom + " s’écrit avec les 26 lettres de l’alphabet : votre AZERTY suffit déjà."));
    } else {
      // Grille complète jusqu'à 16 lettres, dépliant au-delà (QCM du 2026-09-30).
      if (l.caracteres.length > 16) {
        var apercu = el("p", "afrique-langue__apercu", l.caracteres.slice(0, 8).map(function (c) { return c.char; }).join("  "));
        zoneLangue.appendChild(apercu);
        var tous = el("details", "notice afrique-caracteres-tous");
        tous.appendChild(el("summary", null, "Voir les " + l.caracteres.length + " caractères et leur frappe"));
        var contenuTous = el("div", "notice__contenu");
        contenuTous.appendChild(rendreSyllabaire(l.caracteres));
        tous.appendChild(contenuTous);
        zoneLangue.appendChild(tous);
      } else {
        zoneLangue.appendChild(rendreSyllabaire(l.caracteres));
      }
    }
    ecrireHash();
  }

  /* ——— Grille syllabaire : une bande par touche morte, glyphe, frappe écrite
     dessous (décision 10, direction D de la page Guinée) ——— */

  // Signe de ton ou de nasale seul (´ ` ˆ ˇ ˜) : une bande « Tons et signes » en fin de
  // grille, chaque signe montré sur une voyelle de la langue (QCM du 2026-09-30).
  function estSigne(ch) { return /^[̀-ͯ]$/.test(ch.char); }

  function cleBande(ch) {
    var m = ch.methode;
    if (!m) return "non";
    if (m.type === "morte" && estSigne(ch)) return "tons";
    if (m.type === "morte") return m.morte;
    return m.type;
  }

  function titreBande(ch) {
    var m = ch.methode;
    if (!m) return { titre: "Caractères non disponibles avec AZERTY Global", accord: "" };
    if (m.type === "morte" && estSigne(ch)) return { titre: "Tons et signes", accord: "" };
    if (m.type === "morte") return { titre: "Touche morte " + m.nomMorte, accord: m.accord };
    if (m.type === "direct") return { titre: "Accès direct", accord: "" };
    if (m.type === "composition") return { titre: "Composition", accord: "" };
    return { titre: m.texte || "", accord: "" };
  }

  /* Grammaire unique des frappes (QCM du 2026-09-30) : notation « AltGr + 6 »,
     « puis » entre deux temps, la lettre gravée pour l'accès direct (« touche à »,
     jamais « touche 0 »). Dans une bande, la touche morte est dans le titre :
     la cellule ne dit que la suite (« puis n », « puis Maj + N »). */
  function accordCourt(accord) {
    return accord.replace("touche accent aigu", "´").replace("touche circonflexe", "^");
  }

  function etape(m) {
    if (m.type === "morte") return accordCourt(m.accord) + ", puis " + m.toucheAffichee;
    if (m.type === "direct") return m.toucheAffichee;
    if (m.type === "composition" && m.etapes) return m.etapes.map(etape).join(", puis ");
    return m.texte || "";
  }

  function suite(u, touche) {
    u.appendChild(document.createTextNode("puis "));
    u.appendChild(el("b", null, touche));
    return u;
  }

  function frappe(ch) {
    var m = ch.methode;
    var u = el("span", "syllabaire__frappe");
    if (!m) { u.textContent = "Non disponible"; return u; }
    if (m.type === "morte") return suite(u, m.toucheAffichee);
    if (m.type === "direct") {
      if (m.toucheAffichee === ch.char) {
        u.appendChild(document.createTextNode("touche "));
        u.appendChild(el("b", null, ch.char));
      } else {
        u.appendChild(el("b", null, m.toucheAffichee));
      }
      return u;
    }
    u.textContent = etape(m);
    return u;
  }

  function frappeMajuscule(ch) {
    var u = el("span", "syllabaire__frappe");
    var mm = ch.majuscule && ch.majuscule.methode;
    if (!mm) { u.textContent = (ch.majuscule && ch.majuscule.texte) || ""; return u; }
    // Même touche morte que la bande : la suite seule.
    if (mm.type === "morte" && ch.methode.type === "morte" && mm.morte === ch.methode.morte) return suite(u, mm.toucheAffichee);
    if (mm.type === "direct") { u.appendChild(el("b", null, mm.toucheAffichee)); return u; }
    u.textContent = etape(mm);
    return u;
  }

  /* Caractère absent du clavier (clics du nama) : son nom en clair, et un bouton
     de copie au même retour que .copie (« Copié » 1,5 s, annonce). */
  var NOMS_NON_SAISISSABLES = {
    "ǀ": "Clic dental",
    "ǁ": "Clic latéral",
    "ǂ": "Clic alvéolaire",
    "ǃ": "Clic rétroflexe"
  };
  var peutCopier = !!(navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext);

  function celluleNonSaisissable(ch) {
    var nom = NOMS_NON_SAISISSABLES[ch.char] || ch.nomUnicode ||
      "Caractère U+" + ch.char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
    var cellule = el(peutCopier ? "button" : "div", "syllabaire__cellule syllabaire__cellule--non-saisissable");
    var glyphe = el("span", "syllabaire__glyphe", ch.char);
    cellule.appendChild(glyphe);
    cellule.appendChild(el("span", "syllabaire__frappe syllabaire__nom", nom));
    if (!peutCopier) return cellule;
    cellule.type = "button";
    cellule.classList.add("syllabaire__copie");
    var libelle = el("span", "syllabaire__copier", "Copier");
    cellule.appendChild(libelle);
    var minuterie = null;
    cellule.addEventListener("click", function () {
      navigator.clipboard.writeText(ch.char).then(function () {
        cellule.classList.add("est-copie");
        libelle.textContent = "Copié";
        annoncer(nom + " copié.");
        window.clearTimeout(minuterie);
        minuterie = window.setTimeout(function () {
          cellule.classList.remove("est-copie");
          libelle.textContent = "Copier";
        }, 1500);
      }, function () {
        // Presse-papier refusé : le glyphe est sélectionné, la copie reste au clavier.
        var selection = window.getSelection && window.getSelection();
        if (selection) selection.selectAllChildren(glyphe);
        libelle.textContent = "Copiez avec Ctrl + C";
        annoncer(nom + " sélectionné. Copiez avec Ctrl + C.");
        window.clearTimeout(minuterie);
        minuterie = window.setTimeout(function () { libelle.textContent = "Copier"; }, 3000);
      });
    });
    return cellule;
  }

  /* Le signe se tape après la voyelle, par deux frappes de sa touche morte : la
     case le montre sur une vraie voyelle (« ɛ́ » : « ɛ, puis ´ deux fois »). */
  function celluleSigne(ch, voyelle) {
    var m = ch.methode;
    var cellule = el("div", "syllabaire__cellule");
    var glyphe = el("span", "syllabaire__glyphe", voyelle + ch.char);
    glyphe.setAttribute("role", "img");
    glyphe.setAttribute("aria-label", voyelle + " avec " + m.nomMorte.toLocaleLowerCase("fr"));
    cellule.appendChild(glyphe);
    var u = el("span", "syllabaire__frappe");
    u.appendChild(document.createTextNode(voyelle + ", puis "));
    u.appendChild(el("b", null, accordCourt(m.accord) + " deux fois"));
    cellule.appendChild(u);
    return cellule;
  }

  function rendreSyllabaire(caracteres) {
    var grille = el("div", "syllabaire");
    var bandes = {};
    var ordre = [];
    caracteres.forEach(function (ch) {
      var cle = cleBande(ch);
      if (!bandes[cle]) { bandes[cle] = []; ordre.push(cle); }
      bandes[cle].push(ch);
    });
    // Les tons ferment la grille, juste avant les caractères non disponibles.
    if (bandes.tons) {
      ordre.splice(ordre.indexOf("tons"), 1);
      var rangNon = ordre.indexOf("non");
      ordre.splice(rangNon === -1 ? ordre.length : rangNon, 0, "tons");
    }
    var voyelle = caracteres.some(function (c) { return c.char === "ɛ"; }) ? "ɛ" : "a";
    ordre.forEach(function (cle) {
      var premiers = bandes[cle];
      var entete = titreBande(premiers[0]);
      var bande = el("section", "syllabaire__bande");
      if (cle === "non") bande.classList.add("syllabaire__bande--non-saisissable");
      var titre = el("h4", "syllabaire__titre");
      titre.appendChild(el("span", null, entete.titre));
      if (entete.accord) {
        // Séparateur lu seulement : sinon « Accent aigutouche accent aigu ».
        titre.appendChild(el("span", "visuellement-cache", ", "));
        var accord = el("span", "syllabaire__accord");
        if (premiers[0].methode && premiers[0].methode.type === "morte") {
          entete.accord.split(" + ").forEach(function (t, i) {
            if (i) accord.appendChild(document.createTextNode(" + "));
            accord.appendChild(el("kbd", null, t));
          });
        } else {
          accord.textContent = entete.accord;
        }
        titre.appendChild(accord);
      }
      bande.appendChild(titre);
      /* Une colonne par lettre : la minuscule en premiere rangee, sa majuscule
         juste dessous, dans la meme colonne. Les caracteres sans majuscule
         (accents et signes) ferment la rangee (demande du 2026-09-17). */
      var cellules = el("div", "syllabaire__cellules");
      var celluleMinuscule = function (ch) {
        if (!ch.methode) return celluleNonSaisissable(ch);
        if (cle === "tons") return celluleSigne(ch, voyelle);
        var cellule = el("div", "syllabaire__cellule");
        var glyphe = el("span", "syllabaire__glyphe", ch.char);
        if (ch.nomUnicode) glyphe.setAttribute("title", ch.nomUnicode);
        cellule.appendChild(glyphe);
        cellule.appendChild(frappe(ch));
        return cellule;
      };
      var paires = [];
      var seuls = [];
      premiers.forEach(function (ch) {
        if (ch.majuscule && ch.majuscule.char && ch.methode) paires.push(ch);
        else seuls.push(ch);
      });
      paires.forEach(function (ch) {
        var paire = el("div", "syllabaire__paire");
        paire.appendChild(celluleMinuscule(ch));
        var majuscule = el("div", "syllabaire__cellule syllabaire__cellule--majuscule");
        majuscule.appendChild(el("span", "syllabaire__glyphe", ch.majuscule.char));
        majuscule.appendChild(frappeMajuscule(ch));
        paire.appendChild(majuscule);
        cellules.appendChild(paire);
      });
      seuls.forEach(function (ch) {
        var paire = el("div", "syllabaire__paire syllabaire__paire--seule");
        paire.appendChild(celluleMinuscule(ch));
        cellules.appendChild(paire);
      });
      bande.appendChild(cellules);
      grille.appendChild(bande);
    });
    return grille;
  }

  /* ——— CTA du panneau (décision 27) ——— */

  function ajouterActions(guideSeul) {
    var actions = el("div", "afrique-panneau__actions");
    var guide = el("a", "bouton bouton--secondaire", "Voir les touches mortes");
    guide.href = "/guide";
    if (!guideSeul) {
      var telecharger = el("a", "bouton bouton--primaire", "Télécharger");
      telecharger.href = "/download";
      actions.appendChild(telecharger);
    }
    actions.appendChild(guide);
    if (!guideSeul) {
      var essayer = el("a", "bouton bouton--secondaire", "Essayer en ligne");
      essayer.href = "/testeur";
      actions.appendChild(essayer);
    }
    panneau.appendChild(actions);
  }

  /* ——— Fragment #cc/lang (décision 15) ——— */

  function lireHash() {
    var m = /^#([a-z]{2})(?:\/([A-Za-z0-9_-]+))?$/.exec(location.hash);
    if (!m) return false;
    if (!optionDe(m[1])) return false;
    choisirPays(m[1], m[2] || "");
    return true;
  }

  // Le même pays avec une autre langue (#na/naq → #na/hz) doit aussi suivre.
  window.addEventListener("hashchange", function () {
    var m = /^#([a-z]{2})(?:\/([A-Za-z0-9_-]+))?$/.exec(location.hash);
    if (m && (m[1] !== etat.pays || (m[2] && m[2] !== etat.langue))) lireHash();
  });

  /* ——— Événements carte et liste ——— */

  svg.addEventListener("click", function (e) {
    var t = e.target;
    var cible = t && t.closest ? t.closest("[data-pays]") : null;
    cacherBulle();
    if (cible) choisirPays(cible.getAttribute("data-pays"), "", true);
  });

  liste.addEventListener("change", function () {
    if (liste.value) choisirPays(liste.value);
    else rendreAmorce();
  });

  if (recherche) {
    /* Casse, accents, apostrophes et tirets ignorés : « senegal », « cote d ivoire ».
       Les alias mènent au pays, toujours affiché sous son nom officiel. */
    var ALIAS = {
      cd: ["RDC", "RD Congo", "Congo-Kinshasa"],
      cg: ["Congo-Brazzaville"],
      cf: ["Centrafrique"],
      cv: ["Cabo Verde"],
      sz: ["Swaziland"]
    };
    var statut = document.querySelector("[data-afrique-recherche-statut]");

    // Lien de la légende (mobile) : va au champ sans écrire #afrique-recherche,
    // car le fragment porte le pays choisi.
    var versRecherche = document.querySelector("[data-afrique-vers-recherche]");
    if (versRecherche) {
      versRecherche.addEventListener("click", function (e) {
        e.preventDefault();
        var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        recherche.scrollIntoView({ block: "center", behavior: reduit ? "auto" : "smooth" });
        recherche.focus({ preventScroll: true });
      });
    }
    var MAX_SUGGESTIONS = 8;

    function cle(texte) {
      return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr")
        .replace(/[’'\-()]/g, " ").replace(/\s+/g, " ").trim();
    }
    // Candidats : les pays, puis une entrée par couple langue-pays (« Wolof — Sénégal »,
    // QCM du 2026-09-30). La clé vaut « sn » ou « sn/wol ».
    var candidats = [];
    liste.querySelectorAll("option[data-nom]").forEach(function (o) {
      candidats.push({ cle: o.value, langue: false, noms: [o.getAttribute("data-nom")].concat(ALIAS[o.value] || []).map(cle) });
    });
    if (suggestions) {
      suggestions.querySelectorAll("button[data-langue]").forEach(function (b) {
        candidats.push({ cle: b.getAttribute("data-cle"), langue: true, noms: [cle(b.getAttribute("data-nom"))] });
      });
    }

    // Classement : nom exact, puis nom qui commence par la saisie, puis un mot du nom
    // qui commence par elle, puis simple sous-chaîne (« Ni » : Niger, Nigeria avant Bénin).
    function rang(noms, s) {
      var r = 4;
      noms.forEach(function (n) {
        var v = n === s ? 0 : n.indexOf(s) === 0 ? 1 : (" " + n).indexOf(" " + s) !== -1 ? 2 : n.indexOf(s) !== -1 ? 3 : 4;
        if (v < r) r = v;
      });
      return r;
    }
    function correspondances(saisie) {
      var s = cle(saisie);
      if (!s) return [];
      var trouves = [];
      candidats.forEach(function (c, i) {
        var r = rang(c.noms, s);
        if (r < 4) trouves.push({ cle: c.cle, pays: c.langue ? 1 : 0, r: r, i: i });
      });
      // Pays d'abord, puis langues ; chacun par rang puis ordre alphabétique.
      trouves.sort(function (a, b) { return a.pays - b.pays || a.r - b.r || a.i - b.i; });
      return trouves.map(function (t) { return t.cle; });
    }
    function ouvrir(cleChoisie, reveler) {
      var morceaux = cleChoisie.split("/");
      choisirPays(morceaux[0], morceaux[1] || "", reveler);
    }

    /* Combobox (motif APG « liste de suggestions ») : le focus reste dans le champ,
       les flèches déplacent l'option active (aria-activedescendant + aria-selected),
       Entrée la choisit, Tab ferme la liste et avance. Les options sont hors
       tabulation. */
    var actif = -1;
    if (suggestions) {
      suggestions.querySelectorAll("button[data-cle]").forEach(function (b) {
        b.id = "afrique-option-" + b.getAttribute("data-cle").replace("/", "-");
        b.tabIndex = -1;
        b.setAttribute("aria-selected", "false");
      });
    }

    function boutonsVisibles() {
      if (!suggestions || suggestions.hidden) return [];
      return Array.prototype.filter.call(suggestions.querySelectorAll("button[data-code]"), function (b) { return !b.hidden; });
    }

    function activer(i) {
      var visibles = boutonsVisibles();
      actif = i >= 0 && i < visibles.length ? i : -1;
      visibles.forEach(function (b, k) { b.setAttribute("aria-selected", k === actif ? "true" : "false"); });
      if (actif >= 0) {
        recherche.setAttribute("aria-activedescendant", visibles[actif].id);
        visibles[actif].scrollIntoView({ block: "nearest" });
      } else {
        recherche.removeAttribute("aria-activedescendant");
      }
    }

    function fermerSuggestions() {
      if (!suggestions) return;
      activer(-1);
      suggestions.hidden = true;
      recherche.setAttribute("aria-expanded", "false");
    }

    function ecrireStatut(texte) {
      if (statut && statut.textContent !== texte) statut.textContent = texte;
    }

    function filtrerSuggestions(codes) {
      if (!suggestions) return;
      var retenus = codes.slice(0, MAX_SUGGESTIONS);
      var boutons = suggestions.querySelectorAll("button[data-cle]");
      for (var i = 0; i < boutons.length; i++) {
        boutons[i].hidden = retenus.indexOf(boutons[i].getAttribute("data-cle")) === -1;
      }
      // Ordre du DOM = ordre affiché = ordre lu : le classement ci-dessus.
      retenus.forEach(function (c) {
        suggestions.appendChild(suggestions.querySelector('button[data-cle="' + c + '"]'));
      });
      suggestions.hidden = !retenus.length;
      recherche.setAttribute("aria-expanded", retenus.length ? "true" : "false");
      activer(-1);
    }

    function choisirSuggestion(c) {
      fermerSuggestions();
      ecrireStatut("");
      var bouton = suggestions && suggestions.querySelector('button[data-cle="' + c + '"]');
      recherche.value = bouton ? bouton.textContent : infosPays(c.split("/")[0]).nom;
      ouvrir(c, true);
    }

    // Une seule correspondance : elle s'ouvre dès la frappe, sans déplacer le focus.
    // Plusieurs (« Guinée », « Niger », « Congo », « wolof ») : la liste reste ouverte.
    // Aucune : la fiche précédente s'efface, pour ne pas contredire le message.
    recherche.addEventListener("input", function () {
      var saisie = recherche.value.trim();
      var codes = correspondances(saisie);
      ecrireStatut(saisie && !codes.length
        ? "Aucun pays ni aucune langue ne correspond à « " + saisie + " ». Vérifiez l’orthographe ou tapez le début du nom, par exemple « Cam » pour Cameroun."
        : "");
      // Un seul pays suffit, même si des langues le citent (« Pulaar (peul Sénégal) ») ;
      // une langue seule s'ouvre quand aucun pays ne correspond.
      var pays = codes.filter(function (c) { return c.indexOf("/") === -1; });
      var unique = pays.length === 1 ? pays[0] : !pays.length && codes.length === 1 ? codes[0] : "";
      if (unique) {
        fermerSuggestions();
        var ouverte = etat.pays + (unique.indexOf("/") !== -1 ? "/" + etat.langue : "");
        if (unique !== ouverte) ouvrir(unique);
      } else {
        filtrerSuggestions(codes);
        if (saisie && !codes.length && etat.pays) rendreAmorce(true);
      }
      if (!saisie) rendreAmorce();
    });
    recherche.addEventListener("keydown", function (e) {
      var ouvert = suggestions && !suggestions.hidden;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!ouvert) {
          var codes = correspondances(recherche.value);
          if (codes.length < 2) return;
          filtrerSuggestions(codes);
        }
        e.preventDefault();
        var n = boutonsVisibles().length;
        if (e.key === "ArrowDown") activer(actif < n - 1 ? actif + 1 : actif);
        else activer(actif - 1);
      } else if (e.key === "Enter") {
        var visibles = boutonsVisibles();
        if (ouvert && actif >= 0 && visibles[actif]) {
          e.preventDefault();
          choisirSuggestion(visibles[actif].getAttribute("data-cle"));
          return;
        }
        var trouves = correspondances(recherche.value);
        if (trouves.length) {
          e.preventDefault();
          choisirSuggestion(trouves[0]);
        }
      } else if (e.key === "Escape") {
        if (ouvert) { e.preventDefault(); fermerSuggestions(); }
      } else if (e.key === "Tab") {
        fermerSuggestions();
      }
    });
    recherche.addEventListener("blur", function () {
      window.setTimeout(fermerSuggestions, 120);
    });

    if (suggestions) {
      // Le clic ne retire pas le focus du champ.
      suggestions.addEventListener("mousedown", function (e) { e.preventDefault(); });
      suggestions.addEventListener("click", function (e) {
        var bouton = e.target.closest("button[data-cle]");
        if (bouton) choisirSuggestion(bouton.getAttribute("data-cle"));
      });
    }
  }

  /* ——— Gestes tactiles : un doigt fait défiler la page à l'échelle 1, puis
     déplace la carte après un pincement ; deux doigts règlent le zoom. ——— */

  var zoom = { echelle: 1, x: 0, y: 0 };
  var pince = null;
  var glisse = null;

  function distance(t) {
    var dx = t[0].clientX - t[1].clientX;
    var dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function milieu(t, cadre) {
    return {
      x: (t[0].clientX + t[1].clientX) / 2 - cadre.left,
      y: (t[0].clientY + t[1].clientY) / 2 - cadre.top
    };
  }

  function appliquerZoom() {
    var cadre = racine.getBoundingClientRect();
    var s = zoom.echelle;
    zoom.x = Math.min(0, Math.max(cadre.width * (1 - s), zoom.x));
    zoom.y = Math.min(0, Math.max(svg.getBoundingClientRect().height / s * (1 - s), zoom.y));
    svg.style.transform = s === 1 ? "" : "translate(" + zoom.x + "px, " + zoom.y + "px) scale(" + s + ")";
    racine.classList.toggle("afrique-carte--zoome", s > 1);
    if (reset) reset.hidden = s === 1;
  }

  if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
    racine.addEventListener("touchstart", function (e) {
      if (e.touches.length === 1 && zoom.echelle > 1) {
        glisse = { x: e.touches[0].clientX, y: e.touches[0].clientY, x0: zoom.x, y0: zoom.y };
        return;
      }
      if (e.touches.length !== 2) return;
      glisse = null;
      var cadre = racine.getBoundingClientRect();
      var m = milieu(e.touches, cadre);
      pince = { d0: distance(e.touches), e0: zoom.echelle, x0: zoom.x, y0: zoom.y, m0: m };
    }, { passive: true });

    racine.addEventListener("touchmove", function (e) {
      if (glisse && e.touches.length === 1) {
        e.preventDefault();
        zoom.x = glisse.x0 + e.touches[0].clientX - glisse.x;
        zoom.y = glisse.y0 + e.touches[0].clientY - glisse.y;
        appliquerZoom();
        return;
      }
      if (!pince || e.touches.length !== 2) return;
      e.preventDefault();
      var cadre = racine.getBoundingClientRect();
      var s = Math.max(1, Math.min(4, pince.e0 * distance(e.touches) / pince.d0));
      var m = milieu(e.touches, cadre);
      var rapport = s / pince.e0;
      zoom.x = m.x - (pince.m0.x - pince.x0) * rapport;
      zoom.y = m.y - (pince.m0.y - pince.y0) * rapport;
      zoom.echelle = s;
      appliquerZoom();
    }, { passive: false });

    racine.addEventListener("touchend", function (e) {
      if (e.touches.length < 2) pince = null;
      if (!e.touches.length) glisse = null;
    });
  }

  if (reset) {
    reset.addEventListener("click", function () {
      zoom = { echelle: 1, x: 0, y: 0 };
      appliquerZoom();
    });
  }

  /* ——— Étiquettes des îles : 14 px rendus quelle que soit la largeur de la
     carte, et un trait de rappel de la pastille au nom posé en mer (A190). La
     largeur vient du conteneur, pas du SVG : le zoom tactile ne compte pas. ——— */

  var SVG_NS = "http://www.w3.org/2000/svg";

  function reglerEtiquettes() {
    var largeur = racine.clientWidth;
    var vb = svg.viewBox && svg.viewBox.baseVal;
    if (!largeur || !vb || !vb.width) return;
    // Arrondi au dixième supérieur : jamais sous 14 px rendus.
    svg.style.setProperty("--carte-etiquette", Math.ceil(140 * vb.width / largeur) / 10 + "px");
    var groupes = svg.querySelectorAll(".carte-afrique__pastille-groupe");
    for (var i = 0; i < groupes.length; i++) {
      var rond = groupes[i].querySelector(".carte-afrique__pastille");
      var texte = groupes[i].querySelector(".carte-afrique__etiquette");
      if (!rond || !texte || getComputedStyle(texte).display === "none") continue;
      var cx = rond.cx.baseVal.value;
      var cy = rond.cy.baseVal.value;
      var r = rond.r.baseVal.value;
      var b = texte.getBBox();
      // Point du cadre du nom le plus proche du centre de la pastille.
      var px = Math.max(b.x, Math.min(cx, b.x + b.width));
      var py = Math.max(b.y, Math.min(cy, b.y + b.height));
      var dx = px - cx;
      var dy = py - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      var trait = groupes[i].querySelector(".carte-afrique__rappel");
      if (d < r + 8) { if (trait) trait.remove(); continue; }
      if (!trait) {
        trait = document.createElementNS(SVG_NS, "line");
        trait.setAttribute("class", "carte-afrique__rappel");
        groupes[i].insertBefore(trait, texte);
      }
      trait.setAttribute("x1", (cx + dx / d * (r + 2)).toFixed(1));
      trait.setAttribute("y1", (cy + dy / d * (r + 2)).toFixed(1));
      trait.setAttribute("x2", (px - dx / d * 3).toFixed(1));
      trait.setAttribute("y2", (py - dy / d * 3).toFixed(1));
    }
  }

  /* Cibles tactiles sous 768 px : chaque petit État (zone élargie) et chaque île
     (zone invisible sous sa pastille) couvre au moins 24 px rendus. Les zones
     trop proches (Rwanda et Burundi, São Tomé et Guinée équatoriale) s'écartent
     le long de leur axe pour ne pas se chevaucher. Au-delà, retour aux valeurs
     du gabarit. La pastille visible garde sa taille. */
  var CIBLE_PX = 24.5; // marge d'arrondi : jamais sous 24 px rendus
  var cibles = [];
  svg.querySelectorAll(".carte-afrique__zone").forEach(function (c) { cibles.push(c); });
  svg.querySelectorAll(".carte-afrique__pastille-groupe").forEach(function (g) {
    var rond = g.querySelector(".carte-afrique__pastille");
    if (!rond) return;
    var zone = document.createElementNS(SVG_NS, "circle");
    zone.setAttribute("class", "carte-afrique__zone carte-afrique__zone--ile");
    zone.setAttribute("cx", rond.getAttribute("cx"));
    zone.setAttribute("cy", rond.getAttribute("cy"));
    zone.setAttribute("r", "0");
    g.appendChild(zone);
    cibles.push(zone);
  });
  cibles.forEach(function (c) {
    c.setAttribute("data-cx", c.getAttribute("cx"));
    c.setAttribute("data-cy", c.getAttribute("cy"));
    c.setAttribute("data-r", c.getAttribute("r"));
  });

  function reglerCibles() {
    // Échelle réelle unités → pixels : en mobile, la hauteur de la carte la borne
    // (viewBox centré), donc la largeur du conteneur ne suffit pas. Zoom exclu.
    var ctm = svg.getScreenCTM && svg.getScreenCTM();
    var echelle = ctm ? Math.abs(ctm.a) / zoom.echelle : 0;
    if (!echelle) return;
    var mobile = window.matchMedia("(max-width: 767px)").matches;
    var rayon = (CIBLE_PX / 2) / echelle;
    var pos = cibles.map(function (c) {
      return { x: Number(c.getAttribute("data-cx")), y: Number(c.getAttribute("data-cy")) };
    });
    if (mobile) {
      for (var passe = 0; passe < 20; passe++) {
        var bouge = false;
        for (var i = 0; i < pos.length; i++) {
          for (var j = i + 1; j < pos.length; j++) {
            var dx = pos[j].x - pos[i].x;
            var dy = pos[j].y - pos[i].y;
            var d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d >= 2 * rayon) continue;
            var ecart = (2 * rayon - d) / 2;
            pos[i].x -= dx / d * ecart; pos[i].y -= dy / d * ecart;
            pos[j].x += dx / d * ecart; pos[j].y += dy / d * ecart;
            bouge = true;
          }
        }
        if (!bouge) break;
      }
    }
    cibles.forEach(function (c, k) {
      c.setAttribute("cx", mobile ? pos[k].x.toFixed(1) : c.getAttribute("data-cx"));
      c.setAttribute("cy", mobile ? pos[k].y.toFixed(1) : c.getAttribute("data-cy"));
      c.setAttribute("r", mobile ? Math.max(Number(c.getAttribute("data-r")), rayon).toFixed(1) : c.getAttribute("data-r"));
    });
  }

  function reglerCarte() {
    reglerEtiquettes();
    reglerCibles();
  }

  if (window.ResizeObserver) new ResizeObserver(reglerCarte).observe(racine);
  else window.addEventListener("resize", reglerCarte);
  var seuilMobile = window.matchMedia("(max-width: 767px)");
  if (seuilMobile.addEventListener) seuilMobile.addEventListener("change", reglerCarte);
  reglerCarte();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reglerEtiquettes);

  /* ——— Démarrage ——— */

  lireHash();
})();
