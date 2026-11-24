/* Vue « Chercher un caractère » du testeur (lot 3 de la refonte, 2026-11-12).

   Un champ, 20 résultats au plus, et le clavier de la page qui répond : le
   premier résultat est choisi d'office, ses touches s'allument (en deux temps
   pour une touche morte), sa ligne de geste s'écrit sous le champ. Tout ce qui
   pilote le clavier passe par `window.Testeur`, documentée en tête de
   `js/v2/testeur.js` ; ce fichier ne touche ni `testeur.js` ni `testeur.njk`.

   Portage de la recherche du site v1 (`js/tester-search.js` : normalisation,
   mots, scores) et de celle de l'application 1.3.0 (`CharacterSearch.cs`,
   `MatchScore`, `:502-606`) : caractère exact 100, casse 90, U+xxxx 90, alias
   80, nom de signe 80, nom français 70, nom anglais 50, langue 45, langue et
   lettre 40 ; le préfixe d'un nom de langue compte dès 3 lettres. Les noms de
   langue et de signe viennent de `tester/language-search.json`, copié de
   l'application (provenance : `tester/language-search.PROVENANCE.md`).

   Le geste ne vient JAMAIS d'une table d'ici : la méthode de l'index n'est pas
   lue. `moteur.trouverGeste` donne les touches allumées, `moteur.ligneGeste` le
   texte. Un caractère que le moteur ne sait pas produire n'est pas affiché
   (20 sur 1 100 dans l'index du 2026-11-12, dont 6 trouvés par la table des
   langues).

   Les deux JSON sont chargés à la première entrée dans la vue, jamais à
   l'arrivée sur la page. Rien n'est écrit sur l'appareil, rien n'est envoyé.

   CSP : `script-src 'self'`. Aucun `style=`, aucune balise `<style>`, aucun
   gestionnaire en ligne, jamais d'`innerHTML` : tout se pose par `textContent`. */

(function () {
  'use strict';

  var Testeur = window.Testeur;
  if (!Testeur) return;
  var montage = Testeur.montage('recherche');
  if (!montage) return;

  /* Textes posés par cette vue (provisoires jusqu'au QCM d'Antoine). */
  var PLACEHOLDER = 'Nom, caractère ou langue';
  var AUCUN = 'Aucun caractère trouvé. Essayez un autre nom, ou collez le caractère.';
  var ERREUR = 'La recherche n’a pas pu se charger. Rechargez la page.';

  var MAX = 20;
  var ATTENTE = 150;
  /* Champ vide : trois recherches à lancer d'un clic, une par façon de
     chercher (le caractère, son nom, une langue). QCM d'Antoine, 2026-11-12. */
  var EXEMPLES_TITRE = 'Par exemple :';
  var EXEMPLES = ['œ', 'guillemet', 'wolof'];
  var FINE = ' ';
  var SEPARATEURS = /[\s\-'’()]+/;
  /* Une marque combinante seule se pose sur ◌ (`tester/deadkeys.js:230`). */
  var MARQUES = /^[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯]+$/;
  /* Espaces et marques de mise en forme : une case pointillée, jamais ␣. */
  var INVISIBLE = /^[\s­​-‏⁠﻿]$/;
  /* « accent circonflexe » veut la touche morte, pas l'AltGr direct (v1 et
     application : QUERY_METHOD_OVERRIDES, ApplyQuerySpecificMethod). */
  var PREFERES = {
    'accent circonflexe': ['^', 'dk_circumflex'],
    'circumflex accent': ['^', 'dk_circumflex'],
    'accent grave': ['`', 'dk_grave'],
    'grave accent': ['`', 'dk_grave']
  };

  var moteur = null;
  var index = null;       /* entrées préparées, une fois les deux JSON chargés */
  var promesse = null;
  var ui = null;
  var actif = false;
  var minuterie = 0;
  var resultats = [];
  var choisi = -1;
  var temps = 1;
  var etatAucun = false;
  var dernierePosition = '';
  var derniereRequete = '';   /* la requête dont la liste est affichée */

  /* ───────────── Données ───────────── */

  function normaliser(texte) {
    return texte ? texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : '';
  }

  function mots(texte) {
    return normaliser(texte).split(SEPARATEURS).filter(Boolean);
  }

  function lireJson(url) {
    return fetch(url).then(function (reponse) {
      if (!reponse.ok) throw new Error(url);
      return reponse.json();
    });
  }

  /* Une seule demande, même si l'on entre et sort de la vue pendant le
     chargement ; un échec laisse la porte ouverte à une nouvelle tentative. */
  function charger() {
    if (!promesse) {
      promesse = Promise.all([
        lireJson('/tester/character-index.json'),
        lireJson('/tester/language-search.json')
      ]).then(function (jeux) {
        index = preparer(jeux[0].characters, jeux[1].groupes || []);
        return true;
      }).catch(function () {
        promesse = null;
        return false;
      });
    }
    return promesse;
  }

  function preparer(caracteres, groupes) {
    var parCar = {};
    groupes.forEach(function (groupe) {
      var noms = (groupe.alias || []).map(function (a) { return mots(a.alias); })
        .filter(function (m) { return m.length; });
      (groupe.caracteres || []).forEach(function (c) {
        var f = parCar[c] || (parCar[c] = { langues: [], signes: [] });
        noms.forEach(function (n) { (groupe.type === 'signe' ? f.signes : f.langues).push(n); });
      });
    });
    return Object.keys(caracteres).map(function (c) {
      var d = caracteres[c];
      var f = parCar[c] || { langues: [], signes: [] };
      var mort = c.indexOf('dk:') === 0;
      return {
        c: c,
        bas: c.toLowerCase(),
        valeur: mort ? c.replace('dk:', 'dk_') : c,
        mort: mort,
        affiche: mort ? (d.displayChar || c) : c,
        nom: d.unicodeNameFr || d.unicodeName || '',
        nomNorm: normaliser(d.unicodeNameFr || d.unicodeName),
        nomFr: mots(d.unicodeNameFr),
        nomEn: mots(d.unicodeName),
        aliasFr: (d.frenchAliases || []).map(mots),
        aliasEn: (d.englishAliases || []).map(mots),
        cp: d.codePoint || '',
        normCar: normaliser(c),
        direct: Boolean(d.methods && d.methods.some(function (m) { return m.recommended && m.type === 'direct'; })),
        langues: f.langues,
        signes: f.signes
      };
    });
  }

  /* ───────────── Recherche ───────────── */

  /* Un mot de la requête est un mot de la cible (une lettre seule : égalité ;
     sinon début de mot), ou son synonyme : les noms Unicode disent « capital »
     et « small », jamais « uppercase » ni « lowercase ». */
  function motTrouve(qw, syn, cible) {
    return cible.some(function (tw) {
      return qw.length === 1 ? tw === qw : tw.indexOf(qw) === 0 || Boolean(syn) && tw.indexOf(syn) === 0;
    });
  }

  function tousLesMots(q, cible) {
    return cible.length > 0 && q.mots.length > 0 && q.mots.every(function (qw, i) { return motTrouve(qw, q.syn[i], cible); });
  }

  function dansAlias(liste, q) {
    return q.mots.length > 0 && liste.some(function (alias) { return tousLesMots(q, alias); });
  }

  /* Langue : chaque mot de la requête est un mot de l'alias (un début de mot à
     partir de 3 lettres : « pul » trouve « pulaar », « ma » ne trouve pas toutes
     les langues en « ma… »). Avec les noms du caractère, un mot peut venir du
     nom, si au moins un vient de l'alias : « wolof e ». */
  function dansLangue(liste, q, nomFr, nomEn) {
    if (!liste.length || !q.mots.length) return false;
    var duNom = function (qw, nom) {
      return Boolean(nom) && nom.some(function (tw) { return qw.length === 1 ? tw === qw : tw.indexOf(qw) === 0; });
    };
    return liste.some(function (alias) {
      var deAlias = false;
      var tous = q.mots.every(function (qw) {
        if (alias.some(function (aw) { return aw === qw || qw.length >= 3 && aw.indexOf(qw) === 0; })) {
          deAlias = true;
          return true;
        }
        return duNom(qw, nomFr) || duNom(qw, nomEn);
      });
      return tous && deAlias;
    });
  }

  function note(e, q) {
    var s = 0;
    if (e.c === q.brut) s = 100;
    else if (e.bas === q.bas) s = 90;
    else if (dansAlias(e.aliasFr, q) || dansAlias(e.aliasEn, q)) s = 80;
    else if (dansLangue(e.signes, q, null, null)) s = 80;
    else if (tousLesMots(q, e.nomFr)) s = 70;
    if (!s && tousLesMots(q, e.nomEn)) s = 50;
    if (!s && dansLangue(e.langues, q, null, null)) s = 45;
    if (!s && q.mots.length > 1 && dansLangue(e.langues, q, e.nomFr, e.nomEn)) s = 40;
    if (!s && q.bas.indexOf('u+') === 0 && e.cp.toLowerCase() === q.bas) s = 90;
    if (!s) return 0;

    if (q.orig.indexOf(e.c) !== -1 || q.orig.indexOf(e.bas) !== -1) s += 50;
    else if (q.mots.indexOf(e.normCar) !== -1) s += 10;
    if (q.orig.length === 1 && q.orig[0].length === 1 && (e.c === q.orig[0] || e.bas === q.orig[0].toLowerCase())) s += 100;
    var cp = e.cp.indexOf('U+') === 0 ? parseInt(e.cp.slice(2), 16) : -1;
    if (cp >= 0x20 && cp <= 0x7F) s += 15;
    if (e.c.length === 1 && e.c === e.bas && e.c !== e.c.toUpperCase()) s += 5;
    if (e.direct) s += 10;
    if (e.mort) s += 30;
    if (e.nomNorm.indexOf(q.norm) === 0) s += 15;
    if (q.prefere && q.prefere[0] === e.c) s += 50;
    return s;
  }

  function preparerRequete(texte) {
    var norm = normaliser(texte);
    var m = norm.split(SEPARATEURS).filter(Boolean);
    return {
      brut: texte,
      bas: texte.toLowerCase(),
      norm: norm,
      mots: m,
      orig: texte.toLowerCase().split(/\s+/).filter(Boolean),
      syn: m.map(function (qw) {
        if (qw.length < 2) return null;
        if ('uppercase'.indexOf(qw) === 0) return 'capital';
        return 'lowercase'.indexOf(qw) === 0 ? 'small' : null;
      }),
      prefere: PREFERES[norm] || null
    };
  }

  /* Le geste, sorti du moteur. `corps` : « AltGr + O » ; `segments` : les deux
     temps d'une touche morte (« ^ », « Maj + E »), coupés sur la ligne du
     moteur (qui n'exporte pas ses temps). Verr. Maj. fait un temps à lui. */
  function geste(e, prefere) {
    var prefs;
    if (prefere && prefere[0] === e.c) {
      prefs = {};
      prefs[prefere[0]] = prefere[1];
    }
    var brut = moteur.trouverGeste(e.valeur, prefs);
    var ligne = brut && moteur.ligneGeste(e.valeur, prefs);
    if (!ligne) return null;
    var corps = ligne.slice(e.valeur.length + 3, -1);
    var parts = corps.split(', puis ');
    var segments = null;
    if (brut.sequence) {
      var verrou = moteur.modificateurs[brut.sequence.morte.rang].indexOf('Verr. Maj.') !== -1 ? 2 : 1;
      segments = [parts.slice(0, verrou).join(', puis '), parts.slice(verrou).join(', puis ')];
    }
    return { brut: brut, corps: corps, segments: segments };
  }

  function chercher(texte) {
    var q = preparerRequete(texte);
    var notes = [];
    index.forEach(function (e) {
      var s = note(e, q);
      if (s) notes.push({ e: e, s: s });
    });
    notes.sort(function (a, b) { return b.s - a.s || a.e.c.localeCompare(b.e.c); });
    var sortie = [];
    for (var i = 0; i < notes.length && sortie.length < MAX; i++) {
      var e = notes[i].e;
      var g = geste(e, q.prefere);
      if (!g) continue;
      sortie.push(montrable(e, g));
    }
    return sortie;
  }

  /* ───────────── Affichage d'un caractère ───────────── */

  /* Les noms Unicode arrivent en capitales : casse de phrase, sauf les lettres
     nommées seules (« n ») et les codes (« U+0273 »). */
  function phrase(nom) {
    var s = nom.split(' ').map(function (m) {
      return m.length < 2 || m.indexOf('U+') === 0 ? m : m.toLocaleLowerCase('fr');
    }).join(' ');
    return s.charAt(0).toLocaleUpperCase('fr') + s.slice(1);
  }

  function montrable(e, g) {
    var vide = INVISIBLE.test(e.affiche);
    var nom = phrase(e.nom);
    var texte = MARQUES.test(e.affiche) ? '◌' + e.affiche : e.affiche;
    var dit = texte;
    if (vide) {
      var lu = moteur.lireCaractere(e.affiche);
      dit = lu !== e.affiche ? lu : nom;
    }
    return { e: e, g: g, nom: nom, vide: vide, texte: texte, dit: dit };
  }

  function el(balise, classe, texte) {
    var n = document.createElement(balise);
    if (classe) n.className = classe;
    if (texte) n.textContent = texte;
    return n;
  }

  function glyphe(r, classe) {
    var n = el('span', 'tr__car' + (classe ? ' ' + classe : ''));
    if (r.vide) {
      n.className += ' tr__car--vide';
      n.setAttribute('role', 'img');
      n.setAttribute('aria-label', r.dit);
    } else {
      n.textContent = r.texte;
    }
    return n;
  }

  /* ───────────── Interface ───────────── */

  function construire() {
    var champ = el('input', 'saisie tr__saisie');
    champ.type = 'search';
    champ.id = 'tr-champ';
    champ.placeholder = PLACEHOLDER;
    champ.setAttribute('aria-labelledby', 'tc-titre-recherche');
    champ.setAttribute('aria-controls', 'tr-liste');
    champ.setAttribute('autocomplete', 'off');
    champ.setAttribute('autocapitalize', 'off');
    champ.setAttribute('spellcheck', 'false');
    var zoneChamp = el('div', 'tr__champ');
    zoneChamp.appendChild(champ);

    var ligne = el('p', 'tr__geste');
    var liste = el('div', 'tr__liste');
    liste.id = 'tr-liste';
    liste.setAttribute('role', 'listbox');
    liste.setAttribute('aria-labelledby', 'tc-titre-recherche');
    liste.hidden = true;
    /* Une liste qui défile devient un arrêt de Tab où les flèches ne font
       rien : elle se pilote depuis le champ. */
    liste.tabIndex = -1;
    var exemples = el('p', 'tr__exemples');
    exemples.appendChild(el('span', 'tr__exemples-titre', EXEMPLES_TITRE));
    EXEMPLES.forEach(function (texte) {
      var b = el('button', 'tr__exemple', texte);
      b.type = 'button';
      b.addEventListener('click', function () {
        champ.value = texte;
        champ.focus({ preventScroll: true });
        lancer();
      });
      exemples.appendChild(b);
    });
    var aucun = el('p', 'tr__aucun', AUCUN);
    aucun.hidden = true;
    var droite = el('div', 'tr__droite');
    droite.appendChild(exemples);
    droite.appendChild(liste);
    droite.appendChild(aucun);
    var erreur = el('p', 'message message--erreur tr__erreur', ERREUR);
    erreur.setAttribute('role', 'alert');
    erreur.hidden = true;

    [zoneChamp, ligne, droite, erreur].forEach(function (n) { montage.appendChild(n); });
    ui = { champ: champ, zoneChamp: zoneChamp, ligne: ligne, liste: liste, exemples: exemples, aucun: aucun, droite: droite, erreur: erreur };

    /* `search` : la croix et Échap d'un champ de recherche vident le champ. */
    var surSaisie = function () {
      clearTimeout(minuterie);
      if (!champ.value.trim()) { lancer(); return; }
      minuterie = setTimeout(lancer, ATTENTE);
    };
    champ.addEventListener('input', surSaisie);
    champ.addEventListener('search', surSaisie);
    champ.addEventListener('keydown', function (evenement) {
      if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return;
      if (!resultats.length) return;
      evenement.preventDefault();
      var pas = evenement.key === 'ArrowDown' ? 1 : -1;
      choisir(Math.max(0, Math.min(resultats.length - 1, choisi + pas)));
    });
    /* Le focus reste dans le champ : ni clic ni survol ne le prennent. */
    liste.addEventListener('mousedown', function (evenement) { evenement.preventDefault(); });
    liste.addEventListener('click', function (evenement) {
      var o = evenement.target.closest('[role="option"]');
      if (o) choisir(Number(o.dataset.rang));
    });
    /* Le survol choisit, mais seulement si la souris a bougé : une liste qui
       défile sous une souris immobile (flèches) ne doit rien changer. */
    liste.addEventListener('mousemove', function (evenement) {
      var position = evenement.clientX + ',' + evenement.clientY;
      if (position === dernierePosition) return;
      dernierePosition = position;
      var o = evenement.target.closest('[role="option"]');
      if (o && Number(o.dataset.rang) !== choisi) choisir(Number(o.dataset.rang), true);
    });
  }

  function lancer() {
    clearTimeout(minuterie);
    var texte = ui.champ.value.trim();
    if (!texte) { vider(); return; }
    if (!index) return;
    /* Entrée dans le champ rejoue `search` : la même requête garde sa liste,
       son choix et le focus posé sur un temps de touche morte. */
    if (texte === derniereRequete) return;
    derniereRequete = texte;
    ui.exemples.hidden = true;
    resultats = chercher(texte);
    ui.liste.textContent = '';
    if (!resultats.length) {
      aucunResultat();
      return;
    }
    etatAucun = false;
    ui.aucun.hidden = true;
    resultats.forEach(function (r, i) {
      var o = el('div', 'tr__option');
      o.id = 'tr-o-' + i;
      o.dataset.rang = String(i);
      o.setAttribute('role', 'option');
      o.setAttribute('aria-selected', 'false');
      o.setAttribute('aria-label', r.dit + ', ' + r.nom + ', ' + r.g.corps);
      var nom = el('span', 'tr__nom', r.nom);
      var chemin = el('span', 'tr__chemin', r.g.corps);
      [glyphe(r), nom, chemin].forEach(function (n) { o.appendChild(n); });
      ui.liste.appendChild(o);
    });
    ui.liste.hidden = false;
    ui.liste.scrollTop = 0;
    choisir(0, false, true);
  }

  function aucunResultat() {
    ui.liste.hidden = true;
    ui.aucun.hidden = false;
    effacerChoix();
    if (!etatAucun) Testeur.annoncer(AUCUN);
    etatAucun = true;
  }

  function effacerChoix() {
    choisi = -1;
    ui.champ.removeAttribute('aria-activedescendant');
    ui.ligne.textContent = '';
    Testeur.eteindre();
  }

  function vider() {
    resultats = [];
    derniereRequete = '';
    ui.exemples.hidden = false;
    etatAucun = false;
    ui.liste.textContent = '';
    ui.liste.hidden = true;
    ui.aucun.hidden = true;
    effacerChoix();
  }

  /* `survol` : le choix vient de la souris, la liste ne défile pas ;
     `annonce` : un lecteur d'écran entend le geste du premier résultat. Avec
     les flèches, c'est `aria-activedescendant` qui parle. */
  function choisir(i, survol, annonce) {
    var r = resultats[i];
    if (!r) return;
    choisi = i;
    temps = 1;
    Array.prototype.forEach.call(ui.liste.children, function (o, rang) {
      var vrai = rang === i;
      o.setAttribute('aria-selected', vrai ? 'true' : 'false');
      if (vrai) {
        ui.champ.setAttribute('aria-activedescendant', o.id);
        if (!survol) rendreVisible(o);
      }
    });
    ecrireGeste(r);
    Testeur.allumer(r.g.brut);
    if (annonce) Testeur.annoncer(dire(r));
  }

  /* Le bas de la liste se fond (son `padding-bottom` en donne la hauteur) :
     le résultat choisi s'arrête au-dessus, sinon son texte perd son contraste. */
  function rendreVisible(o) {
    var l = ui.liste;
    var bas = l.clientHeight - (parseFloat(getComputedStyle(l).paddingBottom) || 0);
    if (o.offsetTop < l.scrollTop) l.scrollTop = o.offsetTop;
    else if (o.offsetTop + o.offsetHeight > l.scrollTop + bas) l.scrollTop = o.offsetTop + o.offsetHeight - bas;
  }

  /* « œ : AltGr + O. », espace fine insécable devant les deux-points (le moteur
     écrit une espace ordinaire : la ligne est recomposée ici). */
  function dire(r) {
    return r.dit + FINE + ': ' + r.g.corps + '.';
  }

  function ecrireGeste(r) {
    var ligne = ui.ligne;
    ligne.textContent = '';
    ligne.appendChild(glyphe(r, 'tr__car--grand'));
    ligne.appendChild(document.createTextNode(FINE + ': '));
    if (!r.g.segments) {
      ligne.appendChild(document.createTextNode(r.g.corps));
    } else {
      var boutons = r.g.segments.map(function (texte, n) {
        var b = el('button', 'tr__temps', texte);
        b.type = 'button';
        b.setAttribute('aria-pressed', n === 0 ? 'true' : 'false');
        b.addEventListener('mousedown', function (evenement) { evenement.preventDefault(); });
        b.addEventListener('click', function () {
          temps = n + 1;
          boutons.forEach(function (autre, k) { autre.setAttribute('aria-pressed', k === n ? 'true' : 'false'); });
          Testeur.allumer(r.g.brut, temps);
        });
        return b;
      });
      ligne.appendChild(boutons[0]);
      ligne.appendChild(document.createTextNode(', puis '));
      ligne.appendChild(boutons[1]);
    }
    ligne.appendChild(document.createTextNode('.'));
  }

  function montrerErreur(oui) {
    ui.erreur.hidden = !oui;
    ui.zoneChamp.hidden = oui;
    ui.ligne.hidden = oui;
    ui.droite.hidden = oui;
  }

  Testeur.enregistrerVue('recherche', {
    entrer: function (info) {
      actif = true;
      moteur = (info && info.moteur) || Testeur.moteur;
      if (!ui) construire();
      montage.dataset.pret = 'true';
      ui.champ.focus({ preventScroll: true });
      charger().then(function (ok) {
        if (!actif) return;
        montrerErreur(!ok);
        /* Au retour dans la vue, la même requête rallume ses touches. */
        derniereRequete = '';
        if (ok) lancer();
      });
    },
    sortir: function () {
      actif = false;
      clearTimeout(minuterie);
      Testeur.eteindre();
      montage.removeAttribute('data-pret');
    },
    /* Une recherche se tape dans un champ : la touche enfoncée n'est pas
       allumée sur le clavier. */
    appuyees: false,
    frappe: function () {}
  });
})();
