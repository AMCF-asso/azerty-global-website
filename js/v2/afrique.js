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

  function choisirPays(code, langueVoulue) {
    var p = infosPays(code);
    if (!p) return;
    etat.pays = code;
    etat.langue = "";
    if (liste.value !== code) liste.value = code;
    if (recherche && recherche.value !== p.nom) recherche.value = p.nom;
    marquer(code);
    rendreAttente(p);
    ecrireHash();
    charger(code).then(function (d) {
      if (etat.pays !== code) return;
      rendrePanneau(p, d, langueVoulue);
    }).catch(function () {
      if (etat.pays !== code) return;
      vider(panneau);
      panneau.appendChild(el("h2", null, p.nom));
      panneau.appendChild(el("p", "texte-2", "Les fiches de ce pays n’ont pas pu être chargées. Réessayez, ou passez par le guide des touches mortes."));
      ajouterActions();
    });
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

  function rendrePanneau(p, d, langueVoulue) {
    var langues = d.langues || [];
    vider(panneau);
    panneau.appendChild(el("h2", null, p.nom));

    if (p.hors) {
      var ecritures = p.ecritures.toLowerCase();
      panneau.appendChild(el("p", "afrique-panneau__meta",
        "Écriture " + ecritures + " (" + p.hors + ") : non proposée ici. Vous trouverez sur cette page les langues à alphabet latin."));
    }

    if (!langues.length) {
      panneau.appendChild(el("p", "texte-2",
        p.hors
          ? "Aucune langue à alphabet latin n’est répertoriée ici pour ce pays."
          : "Les alphabets des langues de ce pays ne sont pas encore documentés sur cette page."));
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
      panneau.appendChild(el("p", "afrique-panneau__meta", "Langues officielles aussi : " + p.euro + "."));
    }

    ajouterActions();
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
      chip.addEventListener("click", function () { choisirLangue(l, zoneLangue); });
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
      zoneLangue.appendChild(el("p", "afrique-langue__suffit",
        "Le " + l.nom.toLowerCase() + " s’écrit avec les 26 lettres de l’alphabet : votre AZERTY suffit déjà."));
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
      var cellules = el("div", "syllabaire__cellules");
      premiers.forEach(function (ch) {
        var cellule = el("div", "syllabaire__cellule");
        if (!ch.methode) cellule.classList.add("syllabaire__cellule--non-saisissable");
        var glyphe = el("span", "syllabaire__glyphe", ch.char);
        if (ch.nomUnicode) glyphe.setAttribute("title", ch.nomUnicode);
        cellule.appendChild(glyphe);
        cellule.appendChild(frappe(ch));
        cellules.appendChild(cellule);
      });
      premiers.forEach(function (ch) {
        if (!ch.majuscule || !ch.majuscule.char || !ch.methode) return;
        var cellule = el("div", "syllabaire__cellule syllabaire__cellule--majuscule");
        cellule.appendChild(el("span", "syllabaire__glyphe", ch.majuscule.char));
        cellule.appendChild(frappeMajuscule(ch, entete));
        cellules.appendChild(cellule);
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
    actions.appendChild(telecharger);
    actions.appendChild(guide);
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
    if (cible) choisirPays(cible.getAttribute("data-pays"));
  });

  liste.addEventListener("change", function () {
    if (liste.value) choisirPays(liste.value);
    else rendreAmorce();
  });

  if (recherche) {
    function choisirDepuisRecherche() {
      var saisie = recherche.value.trim().toLocaleLowerCase("fr");
      var options = liste.querySelectorAll("option[data-nom]");
      for (var i = 0; i < options.length; i++) {
        if ((options[i].getAttribute("data-nom") || "").toLocaleLowerCase("fr") === saisie) {
          choisirPays(options[i].value);
          return true;
        }
      }
      return false;
    }
    function fermerSuggestions() {
      if (!suggestions) return;
      suggestions.hidden = true;
      recherche.setAttribute("aria-expanded", "false");
    }

    function filtrerSuggestions() {
      if (!suggestions) return;
      var saisie = recherche.value.trim().toLocaleLowerCase("fr");
      var boutons = suggestions.querySelectorAll("button[data-nom]");
      var visibles = 0;
      for (var i = 0; i < boutons.length; i++) {
        var correspond = saisie && (boutons[i].getAttribute("data-nom") || "").toLocaleLowerCase("fr").indexOf(saisie) !== -1;
        boutons[i].hidden = !correspond || visibles >= 8;
        if (correspond && visibles < 8) visibles++;
      }
      suggestions.hidden = !visibles;
      recherche.setAttribute("aria-expanded", visibles ? "true" : "false");
    }

    recherche.addEventListener("input", function () {
      if (choisirDepuisRecherche()) fermerSuggestions();
      else filtrerSuggestions();
    });
    recherche.addEventListener("change", function () {
      if (!choisirDepuisRecherche() && !recherche.value.trim()) rendreAmorce();
    });
    recherche.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fermerSuggestions();
      if (e.key === "ArrowDown" && suggestions && !suggestions.hidden) {
        var premiere = suggestions.querySelector("button:not([hidden])");
        if (premiere) { e.preventDefault(); premiere.focus(); }
      }
    });
    recherche.addEventListener("blur", function () {
      window.setTimeout(fermerSuggestions, 120);
    });

    if (suggestions) {
      suggestions.addEventListener("click", function (e) {
        var bouton = e.target.closest("button[data-code]");
        if (!bouton) return;
        choisirPays(bouton.getAttribute("data-code"));
        fermerSuggestions();
        recherche.focus();
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

  /* ——— Démarrage ——— */

  lireHash();
})();
