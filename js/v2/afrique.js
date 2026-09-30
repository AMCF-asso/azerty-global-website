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
  var agrandir = racine.querySelector("[data-afrique-agrandir]");
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

  function rendreAmorce() {
    etat.pays = "";
    etat.langue = "";
    marquer("");
    if (recherche) recherche.value = "";
    vider(panneau);
    panneau.appendChild(el("p", "afrique-panneau__amorce texte-2",
      "Choisissez un pays sur la carte ou dans la liste : ses langues s’affichent ici, avec chaque lettre et la façon de la taper."));
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

  function rendreVoisins(codes) {
    var groupe = el("div", "afrique-chips afrique-voisins");
    groupe.setAttribute("role", "group");
    groupe.setAttribute("aria-label", "Pays voisins");
    codes.forEach(function (code) {
      var bouton = el("button", "afrique-chip", infosPays(code).nom);
      bouton.type = "button";
      bouton.addEventListener("click", function () { choisirPays(code, "", true); });
      groupe.appendChild(bouton);
    });
    return groupe;
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
      panneau.appendChild(el("p", sansFiche ? "afrique-panneau__hors" : "afrique-panneau__meta",
        phraseHors(p) + (!sansFiche
          ? " Voici les langues du pays qui s’écrivent en alphabet latin."
          : voisins.length
            ? " AZERTY Global couvre ici les langues à alphabet latin, par exemple chez les voisins\u00A0:"
            : " AZERTY Global couvre ici les langues à alphabet latin.")));
    }

    if (sansFiche) {
      if (voisins.length) panneau.appendChild(rendreVoisins(voisins));
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
      var chipsVedettes = rendreChips(vedettes, zoneLangue);
      panneau.appendChild(chipsVedettes);

      if (autres.length) {
        var toutes = el("details", "notice afrique-toutes");
        toutes.appendChild(el("summary", null, "Toutes les langues (" + langues.length + ")"));
        var contenu = el("div", "notice__contenu");
        contenu.appendChild(rendreChips(autres, zoneLangue));
        toutes.appendChild(contenu);
        panneau.appendChild(toutes);
      }

      panneau.appendChild(zoneLangue);

      var premiere = (langueVoulue && parId[langueVoulue]) || vedettes[0] || langues[0];
      choisirLangue(premiere, zoneLangue);
    }

    if (p.euro) {
      panneau.appendChild(el("p", "afrique-panneau__meta afrique-panneau__euro", "Langues officielles aussi : " + p.euro + "."));
    }

    if (!sansFiche) ajouterActions();

    annoncer(langues.length
      ? p.nom + " : " + pluriel(langues.length, "langue", "langues") + ". " + ficheDe(premiere.nom)
      : p.nom + (p.hors
        ? " : aucune langue à alphabet latin sur cette page."
        : " : langues pas encore documentées sur cette page."));
  }

  function rendreChips(langues, zoneLangue) {
    var groupe = el("div", "afrique-chips");
    groupe.setAttribute("role", "group");
    groupe.setAttribute("aria-label", "Langues");
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
      chips[i].setAttribute("aria-pressed", chips[i].getAttribute("data-langue") === l.id ? "true" : "false");
    }
    vider(zoneLangue);
    zoneLangue.appendChild(el("h3", null, l.nom));
    if (!l.caracteres || !l.caracteres.length) {
      var nom = l.nom.toLocaleLowerCase("fr");
      zoneLangue.appendChild(el("p", "afrique-langue__suffit",
        (/^[aeiouyàâéèêîïôû]/.test(nom) ? "L’" : "Le ") + nom + " s’écrit avec les 26 lettres de l’alphabet : votre AZERTY suffit déjà."));
    } else {
      if (l.caracteres.length > 8) {
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
    if (l.provisoire) {
      var note = el("p", "afrique-note-provisoire texte-petit texte-2");
      note.appendChild(document.createTextNode("Alphabet à confirmer ("));
      var ref = (l.source && l.source.ref) || "";
      if (/^https?:\/\//.test(ref)) {
        var a = el("a", null, "source");
        a.href = ref;
        a.rel = "noopener";
        note.appendChild(a);
      } else {
        note.appendChild(document.createTextNode(ref || "source"));
      }
      note.appendChild(document.createTextNode(") : certains caractères peuvent manquer dans cette liste."));
      zoneLangue.appendChild(note);
    }
    ecrireHash();
  }

  /* ——— Grille syllabaire : une bande par touche morte, glyphe, frappe écrite
     dessous (décision 10, direction D de la page Guinée) ——— */

  function cleBande(ch) {
    var m = ch.methode;
    if (!m) return "non";
    if (m.type === "morte") return m.morte;
    return m.type;
  }

  function titreBande(ch) {
    var m = ch.methode;
    if (!m) return { titre: "Caractères non disponibles avec AZERTY Global", accord: "" };
    if (m.type === "morte") return { titre: "Touche morte " + m.nomMorte, accord: m.accord };
    if (m.type === "direct") return { titre: "Accès direct", accord: "" };
    if (m.type === "composition") return { titre: "Composition", accord: "deux touches mortes" };
    return { titre: m.texte || "", accord: "" };
  }

  function frappe(ch) {
    var m = ch.methode;
    var u = el("span", "syllabaire__frappe");
    if (!m) { u.textContent = "Non disponible"; return u; }
    if (m.type === "morte") {
      u.appendChild(document.createTextNode("puis "));
      u.appendChild(el("b", null, m.touche));
      return u;
    }
    if (m.type === "direct") {
      u.appendChild(document.createTextNode("touche "));
      u.appendChild(el("b", null, m.accord));
      return u;
    }
    if (m.type === "composition" && m.etapes) {
      u.textContent = m.etapes.map(function (e) {
        return e.type === "morte" ? e.nomMorte + " puis " + e.touche : "touche " + e.accord;
      }).join(", puis ");
      return u;
    }
    u.textContent = m.texte || "";
    return u;
  }

  function frappeMajuscule(ch, bande) {
    var u = el("span", "syllabaire__frappe");
    var texte = (ch.majuscule && ch.majuscule.texte) || "";
    texte = texte.replace(/ \([^)]*\)/g, "");
    if (bande.titre && texte.indexOf(bande.titre) === 0) {
      var morceaux = texte.split(", puis ");
      var dernier = morceaux[morceaux.length - 1];
      u.appendChild(document.createTextNode("puis "));
      u.appendChild(el("b", null, "Maj " + dernier));
      return u;
    }
    u.textContent = texte;
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
      });
    });
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
    ordre.forEach(function (cle) {
      var premiers = bandes[cle];
      var entete = titreBande(premiers[0]);
      var bande = el("section", "syllabaire__bande");
      if (cle === "non") bande.classList.add("syllabaire__bande--non-saisissable");
      var titre = el("h4", "syllabaire__titre");
      titre.appendChild(el("span", null, entete.titre));
      if (entete.accord) {
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
        var cellule = el("div", "syllabaire__cellule");
        if (!ch.methode) cellule.classList.add("syllabaire__cellule--non-saisissable");
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
        majuscule.appendChild(frappeMajuscule(ch, entete));
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

  function ajouterActions() {
    var actions = el("div", "afrique-panneau__actions");
    var telecharger = el("a", "bouton bouton--primaire", "Télécharger");
    telecharger.href = "/download";
    var guide = el("a", "bouton bouton--secondaire", "Voir les touches mortes");
    guide.href = "/guide";
    var essayer = el("a", "bouton bouton--secondaire", "Essayer en ligne");
    essayer.href = "/testeur";
    actions.appendChild(telecharger);
    actions.appendChild(guide);
    actions.appendChild(essayer);
    panneau.appendChild(actions);
  }

  /* ——— Fragment #cc/lang (décision 15) ——— */

  function lireHash() {
    var m = /^#([a-z]{2})(?:\/([A-Za-z_]+))?$/.exec(location.hash);
    if (!m) return false;
    if (!optionDe(m[1])) return false;
    choisirPays(m[1], m[2] || "");
    return true;
  }

  window.addEventListener("hashchange", function () {
    var m = /^#([a-z]{2})/.exec(location.hash);
    if (m && m[1] !== etat.pays) lireHash();
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
        .replace(/[’'\-]/g, " ").replace(/\s+/g, " ").trim();
    }
    var candidats = [];
    liste.querySelectorAll("option[data-nom]").forEach(function (o) {
      candidats.push({ code: o.value, noms: [o.getAttribute("data-nom")].concat(ALIAS[o.value] || []).map(cle) });
    });

    // Pays dont un nom contient la saisie, les noms exacts en tête.
    function correspondances(saisie) {
      var s = cle(saisie);
      if (!s) return [];
      var exacts = [];
      var autres = [];
      candidats.forEach(function (c) {
        if (c.noms.indexOf(s) !== -1) exacts.push(c.code);
        else if (c.noms.some(function (n) { return n.indexOf(s) !== -1; })) autres.push(c.code);
      });
      return exacts.concat(autres);
    }

    function fermerSuggestions() {
      if (!suggestions) return;
      suggestions.hidden = true;
      recherche.setAttribute("aria-expanded", "false");
    }

    function ecrireStatut(texte) {
      if (statut && statut.textContent !== texte) statut.textContent = texte;
    }

    function filtrerSuggestions(codes) {
      if (!suggestions) return;
      var retenus = codes.slice(0, MAX_SUGGESTIONS);
      var boutons = suggestions.querySelectorAll("button[data-code]");
      for (var i = 0; i < boutons.length; i++) {
        boutons[i].hidden = retenus.indexOf(boutons[i].getAttribute("data-code")) === -1;
      }
      // Ordre du DOM = ordre affiché = ordre lu : les noms exacts d'abord.
      retenus.forEach(function (code) {
        suggestions.appendChild(suggestions.querySelector('button[data-code="' + code + '"]'));
      });
      suggestions.hidden = !retenus.length;
      recherche.setAttribute("aria-expanded", retenus.length ? "true" : "false");
    }

    function boutonsVisibles() {
      if (!suggestions) return [];
      return Array.prototype.filter.call(suggestions.querySelectorAll("button[data-code]"), function (b) { return !b.hidden; });
    }

    // Un seul pays possible : il s'ouvre dès la frappe, sans déplacer le focus.
    // Plusieurs (« Guinée », « Niger », « Congo ») : la liste reste ouverte.
    recherche.addEventListener("input", function () {
      var saisie = recherche.value.trim();
      var codes = correspondances(saisie);
      ecrireStatut(saisie && !codes.length
        ? "Aucun pays ne correspond à « " + saisie + " ». Vérifiez l’orthographe ou tapez le début du nom, par exemple « Cam » pour Cameroun."
        : "");
      if (codes.length === 1) {
        fermerSuggestions();
        if (codes[0] !== etat.pays) choisirPays(codes[0]);
      } else {
        filtrerSuggestions(codes);
      }
      if (!saisie) rendreAmorce();
    });
    recherche.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fermerSuggestions();
      if (e.key === "Enter") {
        var codes = correspondances(recherche.value);
        if (codes.length) {
          e.preventDefault();
          fermerSuggestions();
          ecrireStatut("");
          recherche.value = infosPays(codes[0]).nom;
          choisirPays(codes[0], "", true);
        }
      }
      if (e.key === "ArrowDown" && suggestions && !suggestions.hidden) {
        var premiere = boutonsVisibles()[0];
        if (premiere) { e.preventDefault(); premiere.focus(); }
      }
    });
    recherche.addEventListener("blur", function () {
      window.setTimeout(function () {
        if (!suggestions || !suggestions.contains(document.activeElement)) fermerSuggestions();
      }, 120);
    });

    if (suggestions) {
      suggestions.addEventListener("click", function (e) {
        var bouton = e.target.closest("button[data-code]");
        if (!bouton) return;
        fermerSuggestions();
        ecrireStatut("");
        choisirPays(bouton.getAttribute("data-code"), "", true);
      });
      // Flèches haut et bas d'une option à l'autre ; au-dessus de la première, retour au champ.
      suggestions.addEventListener("keydown", function (e) {
        var visibles = boutonsVisibles();
        var i = visibles.indexOf(document.activeElement);
        if (i === -1) return;
        if (e.key === "ArrowDown" && i < visibles.length - 1) { e.preventDefault(); visibles[i + 1].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? visibles[i - 1] : recherche).focus(); }
        else if (e.key === "Home") { e.preventDefault(); visibles[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); visibles[visibles.length - 1].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); fermerSuggestions(); recherche.focus(); }
      });
      suggestions.addEventListener("focusout", function () {
        window.setTimeout(function () {
          if (document.activeElement !== recherche && !suggestions.contains(document.activeElement)) fermerSuggestions();
        }, 120);
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

  if (agrandir) {
    agrandir.addEventListener("click", function () {
      var ouvert = racine.classList.toggle("afrique-carte--agrandie");
      agrandir.setAttribute("aria-expanded", ouvert ? "true" : "false");
      agrandir.textContent = ouvert ? "Réduire la carte" : "Agrandir la carte";
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
