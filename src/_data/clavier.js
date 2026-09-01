/**
 * Vue dérivée du clavier — consommée par la macro src/_includes/v2/clavier.njk.
 *
 * Contrat : operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md §1.2.
 *
 *   « Aucune position ne s'écrit de mémoire. »
 *
 * Ce fichier ne contient donc AUCUNE position de touche. Il lit les deux
 * définitions canoniques du dépôt et calcule tout :
 *
 *   - data/AZERTY Global.json      — la disposition rendue (lecture seule) ;
 *   - data/AZERTY Traditionnel.json — la référence, pour marquer ce qui change.
 *
 * Le seul tableau écrit à la main est le CADRE physique : largeurs des touches
 * d'un clavier ISO 105 en unités « u ». C'est de la géométrie de clavier, pas
 * une position de caractère, et elle ne dépend d'aucune disposition.
 *
 * Le parcours « Ce qui change » déclare des CARACTÈRES (le texte public) ; les
 * positions surlignées sont résolues ici, dans le JSON. Un caractère déclaré
 * qui ne se trouve nulle part fait échouer le build : une étape qui ne surligne
 * rien ne doit pas pouvoir passer en silence.
 *
 * `populations` reproduit exactement la définition de
 * scripts/count-displaced-chars.py, qui produit les chiffres publiés sur
 * /comparatif. tests/unit/clavier.test.js épingle ces nombres : le jour où la
 * disposition bouge, le test rougit et force à mettre à jour le dessin ET les
 * chiffres ensemble, au lieu de laisser les deux diverger en silence.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEAD_KEY_SYMBOLS,
  DEAD_KEY_NAMES_FR,
  estToucheMorte
} = require('../../scripts/lib/touches-mortes');

const RACINE = path.resolve(__dirname, '..', '..');
const CIBLE = path.join(RACINE, 'data', 'AZERTY Global.json');
const REFERENCE = path.join(RACINE, 'data', 'AZERTY Traditionnel.json');

/* Les quatre niveaux comparés — strictement ceux de count-displaced-chars.py.
   `caps` en est absent des deux côtés : c'est ce qui rend la confrontation
   exacte. */
const NIVEAUX_COMPARES = ['base', 'shift', 'alt_gr', 'shift_alt_gr'];

/* Tous les niveaux où un caractère peut se trouver, pour résoudre le parcours. */
const NIVEAUX_RESOLUS = ['base', 'shift', 'caps', 'caps_shift', 'alt_gr', 'shift_alt_gr'];

/* Les couches affichables. `verrmaj` retombe sur `base` quand `caps` est vide :
   c'est le verrouillage majuscule intelligent, qui ne touche que les lettres
   (data/AZERTY Global.json, changes_from_traditional_azerty). */
const COUCHES = [
  { id: 'base', libelle: 'Base', source: 'base', repli: null, modificateurs: [] },
  { id: 'maj', libelle: 'Maj', source: 'shift', repli: null, modificateurs: ['maj-g', 'maj-d'] },
  { id: 'verrmaj', libelle: 'Verr. Maj.', source: 'caps', repli: 'base', modificateurs: ['verrmaj'] },
  { id: 'altgr', libelle: 'AltGr', source: 'alt_gr', repli: null, modificateurs: ['altgr'] },
  { id: 'majaltgr', libelle: 'AltGr + Maj', source: 'shift_alt_gr', repli: null, modificateurs: ['altgr', 'maj-g', 'maj-d'] },
  { id: 'synthese', libelle: 'Tout', source: null, repli: null, modificateurs: [] }
];

/* ——— Géométrie : cadre ISO 105, en quarts d'unité ———
   Une rangée fait 15 u, soit 60 quarts. Les largeurs ci-dessous sont celles
   d'un clavier ISO du commerce ; aucune n'est propre à AZERTY Global. */

const QUARTS_PAR_U = 4;
const COLONNES = 15 * QUARTS_PAR_U;

const CADRE = {
  E: { ligne: 1, avant: [], apres: [{ id: 'retour', libelle: 'Retour', u: 2 }] },
  D: { ligne: 2, avant: [{ id: 'tab', libelle: 'Tab', u: 1.5 }], apres: [] },
  C: { ligne: 3, avant: [{ id: 'verrmaj', libelle: 'Verr. Maj.', u: 1.75 }], apres: [] },
  B: { ligne: 4, avant: [{ id: 'maj-g', libelle: 'Maj', u: 1.25 }], apres: [{ id: 'maj-d', libelle: 'Maj', u: 2.75 }] },
  A: { ligne: 5, avant: [], apres: [] }
};

/* La rangée du bas ne porte qu'Espace et AltGr (décision 2 : ni Ctrl, ni Alt,
   ni touches système). Les vides gardent AltGr à sa place réelle : sur un ISO,
   Ctrl + Win + Alt occupent 3,75 u avant la barre d'espace. */
const RANGEE_BASSE = [
  { type: 'vide', u: 3.75 },
  { type: 'espace', u: 6.25 },
  { type: 'modificateur', id: 'altgr', libelle: 'AltGr', u: 1.25 },
  { type: 'vide', u: 3.75 }
];

/* L'Entrée ISO enjambe les rangées D et C : 1,5 u en haut, 1,25 u en bas.
   Le CSS lui découpe son encoche, l'écart entre les deux. */
const ENTREE = { id: 'entree', libelle: 'Entrée', uHaut: 1.5, uBas: 1.25 };

/* Fin attendue du cadre de chaque rangée, en quarts. Une rangée fait toujours
   15 u ; ce que la boucle pose s'arrête plus tôt là où l'Entrée ISO ou les
   vides de la rangée basse prennent le relais. Un écart = un cadre faux. */
const FINS_ATTENDUES = {
  1: COLONNES,
  2: COLONNES - ENTREE.uHaut * QUARTS_PAR_U,
  3: COLONNES - ENTREE.uBas * QUARTS_PAR_U,
  4: COLONNES,
  5: COLONNES - RANGEE_BASSE[RANGEE_BASSE.length - 1].u * QUARTS_PAR_U
};

/* ——— Parcours « Ce qui change » (contrat §1.6) ———
   Six étapes : les cinq changements annoncés, plus les ajouts. Chaque étape
   déclare ses CARACTÈRES ; les positions sortent du JSON. Les textes suivent le
   moule « la panne nommée, puis la réponse » de la décision testeur du
   2026-08-22 §3, pour que le site ne dise qu'une seule chose de chaque
   changement.

   Un caractère se déclare de deux façons :

     '{'                                        — partout où le JSON le trouve ;
     { caractere: '#', niveau: 'alt_gr' }       — à ce niveau-là seulement.

   Le niveau sert quand un caractère existe à plusieurs endroits et que l'étape
   ne parle que de l'un d'eux : # est sur E00 en Maj et sur B09 en AltGr, et
   l'étape 3 ne parle que du premier. ⛔ Ce n'est pas une position écrite à la
   main : la position reste résolue dans le JSON, on ne fait que dire de quel
   niveau on parle.

   Une déclaration peut porter `marque: 'ajoutee'`. C'est un arrêt éditorial
   (Antoine, 2026-08-30) : la marque d'une touche vaut pour la touche entière,
   or à l'étape 4 le circonflexe, le dièse et les chevrons sont des accès
   ergonomiques ajoutés sur des touches dont la gravure a changé pour une
   autre raison. Sans cette surcharge, l'étape peindrait « emplacement
   modifié » là où elle parle d'un ajout. */
const ETAPES = [
  {
    id: 'verr-maj',
    titre: 'Verrouillage majuscule intelligent',
    texte: 'Fini les chiffres surprise. Sur l’AZERTY classique, Verr. Maj. puis é écrit 2. Ici : É È À Ç. La ponctuation et les chiffres, eux, ne changent pas.',
    couche: 'verrmaj',
    caracteres: ['É', 'È', 'À', 'Ç'],
    lien: { href: '/e-aigu-majuscule', libelle: 'La page du É majuscule' }
  },
  {
    id: 'point',
    titre: 'Le point sans Majuscule',
    texte: 'Fini la touche Majuscule pour terminer une phrase. Le point est en accès direct, comme partout ailleurs dans le monde. Le point-virgule, bien plus rare, passe en Maj + point.',
    couche: 'base',
    caracteres: ['.', ';'],
    lien: null
  },
  {
    id: 'arobase',
    titre: 'Arobase et dièse en haut à gauche',
    /* La dernière phrase explique la seconde touche surlignée : @ reste sur
       AltGr + à, sa place classique (vérifié dans la définition, E10 alt_gr).
       Sans elle, l'étape surligne une touche dont elle ne parle pas. */
    texte: 'Fini AltGr + à pour écrire une adresse mail. @ et # sont sur l’ancienne touche ², à gauche du 1, comme sur l’AZERTY de macOS. L’ancien AltGr + à continue de fonctionner.',
    couche: 'base',
    /* Le dièse est pris en Maj seulement : son autre accès, AltGr + deux
       points, est un confort de développeur qui appartient à l'étape 4 et pas
       au propos de celle-ci (retour d'Antoine, 2026-08-30). */
    caracteres: ['@', { caractere: '#', niveau: 'shift' }],
    lien: { href: '/arobase', libelle: 'La page de l’arobase' }
  },
  {
    id: 'symboles-dev',
    titre: 'Symboles de programmation sur la rangée de repos',
    texte: 'Fini les extensions de main. Les accolades, les crochets, la barre oblique inversée et la barre verticale tombent sous vos doigts avec AltGr, plus accessibles que sur le QWERTY américain. AltGr ouvre aussi un accès direct au tilde, à l’accent grave, au circonflexe, au dièse et aux chevrons.',
    couche: 'altgr',
    caracteres: [
      '{', '}', '[', ']', '\\', '|',
      /* Les six accès ergonomiques. Le niveau les épingle — les chevrons
         restent aussi à leur place classique sur la touche à gauche du W, et
         le dièse est également en Maj à l'étape 3. La surcharge de marque dit
         qu'ici le caractère est un ajout, quand la touche, elle, a pu changer
         de gravure pour une autre raison. */
      { caractere: '~', niveau: 'alt_gr', marque: 'ajoutee' },
      { caractere: '`', niveau: 'alt_gr', marque: 'ajoutee' },
      { caractere: '^', niveau: 'alt_gr', marque: 'ajoutee' },
      { caractere: '#', niveau: 'alt_gr', marque: 'ajoutee' },
      { caractere: '<', niveau: 'alt_gr', marque: 'ajoutee' },
      { caractere: '>', niveau: 'alt_gr', marque: 'ajoutee' }
    ],
    lien: { href: '/accolades', libelle: 'La page des accolades' }
  },
  {
    id: 'accents',
    titre: 'Accents internationaux sur la touche ù',
    texte: 'Trois accents morts prennent la place du ù : aigu pour á í ó ú, grave pour ì ò, tilde pour ã ñ õ. L’espagnol, l’italien et le portugais se tapent directement. Le ù reste en AltGr + U, le pour cent passe en Maj + parenthèse fermante.',
    /* Vue synthèse et non `base` : les cinq caractères de l'étape vivent sur
       des niveaux différents (aigu en base, grave en Maj, tilde en AltGr sur la
       même touche, ù en AltGr + U, pour cent en Maj). En couche base, presque
       tous étaient invisibles sur le dessin — l'étape surlignait des touches
       vides (retour d'Antoine, 2026-08-30). Le tilde ajouté le 2026-09-01 :
       C11 alt_gr vaut dk_tilde dans data/AZERTY Global.json, l'étape n'en
       parlait pas. */
    couche: 'synthese',
    caracteres: ['dk_acute', 'dk_grave', 'dk_tilde', 'ù', '%'],
    lien: null
  },
  {
    id: 'ajouts',
    titre: 'Et des centaines de caractères en plus',
    texte: 'Ce n’est pas un changement : c’est ce que l’AZERTY classique n’avait pas. Les guillemets français, le tiret cadratin, les ligatures œ et æ, et des touches mortes qui ouvrent le grec, le cyrillique, l’alphabet phonétique et les symboles scientifiques.',
    couche: 'altgr',
    caracteres: null, /* toutes les touches marquées « ajoutée » */
    /* Seule étape où les touches mortes se distinguent des autres ajouts, par
       un contour pointillé : c'est elle qui en parle. Ailleurs, une touche qui
       porte par ailleurs une touche morte n'a pas à s'annoncer — l'étape 3
       pointait ainsi le à en pointillé pour un ʁ dont elle ne dit rien
       (arbitrage d'Antoine, 2026-08-30). */
    distinguerTouchesMortes: true,
    lien: null
  }
];

/* ——— Familles du mémo (arbitrage d'Antoine, 2026-08-30) ———

   ⚠️ La SEULE table de classement écrit à la main de ce fichier. Les blocs
   Unicode s'en approchent mais ne se lisent pas (« Latin-1 Supplement »
   mélange le ¥, le æ et le ß) : le regroupement est éditorial, pas technique.
   Ordre = ordre d'affichage, du plus utile à un rédacteur français au plus
   spécialisé. ⛔ Un caractère ajouté qui n'est dans aucune famille fait
   échouer le build : le mémo ne peut pas perdre une entrée en silence. */
const FAMILLES_MEMO = [
  { id: 'guillemets', titre: 'Guillemets et apostrophes', valeurs: ['«', '»', '“', '”', '’', '‘'] },
  { id: 'tirets', titre: 'Tirets et espaces', valeurs: ['–', '—', '‑', ' ', ' '] },
  { id: 'lettres', titre: 'Ligatures et lettres', valeurs: ['œ', 'Œ', 'æ', 'Æ', 'ß', 'ẞ', 'Ù'] },
  { id: 'ponctuation', titre: 'Ponctuation', valeurs: ['¿', '¡', '·'] },
  { id: 'programmation', titre: 'Programmation', valeurs: ['`', '~'] },
  { id: 'maths', titre: 'Mathématiques et monnaie', valeurs: ['≤', '≥', '¥'] }
];

/* ——— Lecture et comparaison ——— */

function lire(chemin) {
  return JSON.parse(fs.readFileSync(chemin, 'utf-8'));
}

/** {valeur: Set("POSITION|niveau")} sur les quatre niveaux comparés. */
function indexerPositions(disposition) {
  const index = new Map();
  for (const rangee of disposition.rows || []) {
    for (const touche of rangee.keys || []) {
      for (const niveau of NIVEAUX_COMPARES) {
        const valeur = touche[niveau];
        if (!valeur) continue;
        if (!index.has(valeur)) index.set(valeur, new Set());
        index.get(valeur).add(touche.position + '|' + niveau);
      }
    }
  }
  return index;
}

function touchesDe(places) {
  return new Set(Array.from(places, (place) => place.split('|')[0]));
}

function intersecte(a, b) {
  for (const valeur of a) if (b.has(valeur)) return true;
  return false;
}

/**
 * Même classement que scripts/count-displaced-chars.py : pour chaque valeur de
 * la référence, disparue / inchangée / déplacée sur la même touche / déplacée
 * sur une autre touche. Puis les valeurs que la référence n'avait pas.
 */
function comparer(reference, cible) {
  const changeDeTouche = [];
  const memeTouche = [];
  const disparus = [];

  for (const [valeur, places] of reference) {
    const apres = cible.get(valeur);
    if (!apres) {
      disparus.push(valeur);
      continue;
    }
    if (intersecte(apres, places)) continue;
    const touchesAvant = touchesDe(places);
    const touchesApres = touchesDe(apres);
    const entree = { valeur, avant: Array.from(touchesAvant).sort(), apres: Array.from(touchesApres).sort() };
    if (intersecte(touchesAvant, touchesApres)) memeTouche.push(entree);
    else changeDeTouche.push(entree);
  }

  const ajoutes = Array.from(cible.keys()).filter((valeur) => !reference.has(valeur));

  /* Deux ensembles, deux usages. `destinations` compte comme le script Python
     — les touches d'arrivée d'un caractère qui a changé de touche — et sert
     au chiffre publié. `gravureFausse` sert au dessin : une touche dont le
     caractère n'a fait que changer de niveau (le point et le point-virgule
     sur B08) porte elle aussi une gravure devenue fausse, et c'est le
     changement phare de la disposition. Les confondre marquerait B08
     « caractère ajouté ». */
  const destinations = new Set();
  for (const entree of changeDeTouche) for (const position of entree.apres) destinations.add(position);
  const gravureFausse = new Set(destinations);
  for (const entree of memeTouche) for (const position of entree.apres) gravureFausse.add(position);

  return { changeDeTouche, memeTouche, disparus, ajoutes, destinations, gravureFausse };
}

/* ——— Glyphes ——— */

/* Espaces, marques combinantes et formats ne dessinent rien : sur une touche
   comme dans un mémo, ils doivent se dire par leur nom. Les noms français
   viennent de tester/character-index.json, artefact du dépôt, jamais écrits
   ici — une touche nommée de mémoire est une touche fausse en puissance. */
const INVISIBLE = /^[\p{Z}\p{C}\p{M}]$/u;

let nomsUnicode = null;
function nomUnicode(caractere) {
  if (nomsUnicode === null) {
    nomsUnicode = new Map();
    try {
      const index = JSON.parse(fs.readFileSync(path.join(RACINE, 'tester', 'character-index.json'), 'utf-8'));
      for (const [cle, entree] of Object.entries(index.characters || {})) {
        if (entree && entree.unicodeNameFr) nomsUnicode.set(cle, entree.unicodeNameFr);
      }
    } catch (erreur) {
      /* index absent : le composant se rabat sur le point de code */
    }
  }
  return nomsUnicode.get(caractere) || null;
}

function glyphe(valeur) {
  if (!valeur) return null;
  if (estToucheMorte(valeur)) {
    return {
      texte: DEAD_KEY_SYMBOLS[valeur] || '◌',
      morte: true,
      invisible: false,
      nom: DEAD_KEY_NAMES_FR[valeur] || valeur.replace(/^dk_/, '').replace(/_/g, ' ').toUpperCase()
    };
  }
  if (INVISIBLE.test(valeur)) {
    const code = 'U+' + valeur.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    return {
      texte: '␣',
      morte: false,
      invisible: true,
      nom: nomUnicode(valeur) || code
    };
  }
  return { texte: valeur, morte: false, invisible: false, nom: null };
}

/* ——— Assemblage ——— */

function construire() {
  const cible = lire(CIBLE);
  const reference = lire(REFERENCE);
  const valeursReference = indexerPositions(reference);
  const comparaison = comparer(valeursReference, indexerPositions(cible));

  /* Index de résolution : valeur → positions, tous niveaux confondus. Sert au
     parcours, et lui seul : jamais une position écrite à la main. */
  const ouEst = new Map();
  const ouEstAuNiveau = new Map();
  for (const rangee of cible.rows || []) {
    for (const touche of rangee.keys || []) {
      for (const niveau of NIVEAUX_RESOLUS) {
        const valeur = touche[niveau];
        if (!valeur) continue;
        if (!ouEst.has(valeur)) ouEst.set(valeur, new Set());
        ouEst.get(valeur).add(touche.position);
        const cle = valeur + '|' + niveau;
        if (!ouEstAuNiveau.has(cle)) ouEstAuNiveau.set(cle, new Set());
        ouEstAuNiveau.get(cle).add(touche.position);
      }
    }
  }

  const touches = [];
  const marques = new Map();

  /* Une touche à caractères, quelle que soit sa largeur : la barre d'espace en
     est une (elle porte l'espace fine insécable en AltGr et l'insécable en
     AltGr + Maj), elle est juste plus large et se nomme au lieu de se graver. */
  function toucheCaractere(touche, ligne, colonne, largeur) {
    const glyphes = {};
    for (const couche of COUCHES) {
      if (!couche.source) continue;
      const valeur = touche[couche.source] || (couche.repli ? touche[couche.repli] : null);
      glyphes[couche.id] = glyphe(valeur);
    }

    /* Marquage : gravure devenue fausse d'abord, sinon porteuse d'une valeur
       que la référence n'avait pas — caractère ou touche morte nouvelle. */
    let marque = null;
    if (comparaison.gravureFausse.has(touche.position)) {
      marque = 'changee';
    } else {
      for (const niveau of NIVEAUX_COMPARES) {
        const valeur = touche[niveau];
        if (valeur && !valeursReference.has(valeur)) {
          marque = 'ajoutee';
          break;
        }
      }
    }
    if (marque) marques.set(touche.position, marque);

    /* Une touche de lettre s'engrave d'un seul glyphe, sa capitale — comme un
       vrai clavier. Le critère est calculé, pas listé. */
    const base = touche.base;
    const maj = touche.shift;
    const lettreSimple =
      typeof base === 'string' &&
      typeof maj === 'string' &&
      base.length === 1 &&
      base.toLocaleUpperCase('fr') === maj &&
      base !== maj;

    /* Une touche ne se grave pas deux fois du même glyphe : la barre d'espace
       porte le même espace en base et en Maj, et la vue synthèse affichait
       « Espace » deux fois. */
    const majRedondante = typeof base === 'string' && base === maj;

    return {
      type: 'caractere',
      position: touche.position,
      ligne,
      colonne,
      largeur,
      lignes: 1,
      glyphes,
      lettreSimple,
      majRedondante,
      marque,
      /* La touche porte au moins une touche morte, à un niveau quelconque.
         Sert au parcours : à l'étape des ajouts, ces touches se distinguent
         des autres par un contour pointillé, comme la pastille de la légende
         (arbitrage d'Antoine, 2026-08-30). */
      morte: Object.values(glyphes).some((g) => g && g.morte)
    };
  }

  for (const rangee of cible.rows || []) {
    const lettreRangee = (rangee.keys[0] || {}).position.charAt(0);
    const gabarit = CADRE[lettreRangee];
    if (!gabarit) throw new Error('Rangée inconnue dans la définition : ' + lettreRangee);

    /* Rangée du bas : Espace et AltGr, cadre fixe. */
    if (lettreRangee === 'A') {
      let colonne = 1;
      for (const bloc of RANGEE_BASSE) {
        const largeur = bloc.u * QUARTS_PAR_U;
        if (bloc.type === 'espace') {
          const espace = rangee.keys[0];
          if (!espace) throw new Error('Rangée basse : la barre d’espace est absente de la définition.');
          touches.push(toucheCaractere(espace, gabarit.ligne, colonne, largeur));
        } else if (bloc.type !== 'vide') {
          touches.push({
            type: 'modificateur',
            id: bloc.id,
            libelle: bloc.libelle,
            ligne: gabarit.ligne,
            colonne,
            largeur,
            lignes: 1
          });
        }
        colonne += largeur;
      }
      continue;
    }

    let colonne = 1;
    for (const modificateur of gabarit.avant) {
      const largeur = modificateur.u * QUARTS_PAR_U;
      touches.push({
        type: 'modificateur',
        id: modificateur.id,
        libelle: modificateur.libelle,
        ligne: gabarit.ligne,
        colonne,
        largeur,
        lignes: 1
      });
      colonne += largeur;
    }

    for (const touche of rangee.keys) {
      touches.push(toucheCaractere(touche, gabarit.ligne, colonne, QUARTS_PAR_U));
      colonne += QUARTS_PAR_U;
    }

    for (const modificateur of gabarit.apres) {
      const largeur = modificateur.u * QUARTS_PAR_U;
      touches.push({
        type: 'modificateur',
        id: modificateur.id,
        libelle: modificateur.libelle,
        ligne: gabarit.ligne,
        colonne,
        largeur,
        lignes: 1
      });
      colonne += largeur;
    }

    /* L'Entrée ISO se pose après la rangée D et couvre aussi la rangée C. */
    if (lettreRangee === 'D') {
      const largeur = ENTREE.uHaut * QUARTS_PAR_U;
      touches.push({
        type: 'modificateur',
        id: ENTREE.id,
        libelle: ENTREE.libelle,
        ligne: gabarit.ligne,
        colonne: COLONNES - largeur + 1,
        largeur,
        lignes: 2,
        entreeIso: true
      });
    }
  }

  /* Contrôle de cadre : une rangée qui ne tombe pas juste dessine un clavier
     faux sans rien casser par ailleurs. Le build doit s'arrêter. */
  for (const [ligne, attendu] of Object.entries(FINS_ATTENDUES)) {
    const surLaLigne = touches.filter((t) => t.ligne === Number(ligne) && !t.entreeIso);
    if (!surLaLigne.length) throw new Error(`Rangée ${ligne} : aucune touche posée.`);
    const derniere = surLaLigne[surLaLigne.length - 1];
    const fin = derniere.colonne + derniere.largeur - 1;
    if (fin !== attendu) {
      throw new Error(`Rangée ${ligne} : le cadre s'arrête à ${fin} quarts au lieu de ${attendu}.`);
    }
  }

  /* Résolution du parcours : caractères déclarés → positions du JSON. */
  const positionsAjoutees = Array.from(marques.entries())
    .filter(([, marque]) => marque === 'ajoutee')
    .map(([position]) => position);

  /* Une déclaration de parcours est une chaîne ou un objet ; les deux se lisent
     de la même façon ici, et nulle part ailleurs. */
  const declaration = (item) =>
    typeof item === 'string'
      ? { caractere: item, niveau: null, marque: null }
      : { caractere: item.caractere, niveau: item.niveau || null, marque: item.marque || null };

  const parcours = ETAPES.map((etape, index) => {
    let positions;
    const surcharges = {};
    if (etape.caracteres === null) {
      positions = positionsAjoutees;
    } else {
      const trouvees = new Set();
      for (const item of etape.caracteres) {
        const { caractere, niveau, marque } = declaration(item);
        const places = niveau ? ouEstAuNiveau.get(caractere + '|' + niveau) : ouEst.get(caractere);
        if (!places || !places.size) {
          throw new Error(
            `Parcours « ${etape.titre} » : « ${caractere} »` +
            (niveau ? ` au niveau ${niveau}` : '') +
            ' ne se trouve nulle part dans data/AZERTY Global.json. ' +
            'Le texte de l’étape et la disposition ont divergé.'
          );
        }
        for (const position of places) {
          trouvees.add(position);
          if (marque) surcharges[position] = marque;
        }
      }
      positions = Array.from(trouvees).sort();
    }
    if (!positions.length) {
      throw new Error(`Parcours « ${etape.titre} » : aucune touche à surligner.`);
    }
    return {
      id: etape.id,
      numero: index + 1,
      titre: etape.titre,
      texte: etape.texte,
      couche: etape.couche,
      lien: etape.lien,
      positions,
      distinguerTouchesMortes: etape.distinguerTouchesMortes === true,
      /* Marques valables pour cette étape seulement, « POSITION:marque ».
         Vide quand la marque de la touche suffit. */
      marques: Object.keys(surcharges)
        .sort()
        .map((position) => position + ':' + surcharges[position]),
      /* Les caractères repris en pastilles sous le clavier : sur mobile, les
         touches sont trop petites pour être lues (contrat §1.4). */
      pastilles: (etape.caracteres || [])
        .map((item) => glyphe(declaration(item).caractere))
        .filter(Boolean)
    };
  });

  /* ——— Mémo des nouveaux caractères ———
     Ce que la référence n'avait pas, avec la frappe qui le produit. Séparé en
     deux : les caractères, et les touches mortes — qui ne sont pas des
     caractères mais des portes vers des tables entières. Confondre les deux
     gonflerait le décompte des « caractères ajoutés » de 25 unités. */
  /* Le nom d'une touche, c'est ce qui est gravé dessus dans LA disposition
     considérée : la même position se nomme « À » sur l'AZERTY classique et
     « À » aussi ici, mais la touche du point se nomme « ; » là-bas et « . »
     ici. D'où une table par disposition — sans quoi une frappe « avant »
     serait décrite avec la gravure « après ». */
  function nomsDeTouches(disposition) {
    const noms = new Map();
    for (const rangee of disposition.rows || []) {
      for (const touche of rangee.keys || []) {
        const base = touche.base;
        if (typeof base !== 'string') continue;
        /* Une touche dont la base est morte se nomme par son symbole gravé (^,
           ´) : sans cela la frappe sortait « AltGr + D11 » sur la feuille A4.
           La barre d'espace se nomme, elle ne se grave pas. */
        const g = glyphe(base);
        noms.set(
          touche.position,
          g.invisible ? 'Espace' : (g.morte ? g.texte : g.texte.toLocaleUpperCase('fr'))
        );
      }
    }
    return noms;
  }

  const libelleTouche = nomsDeTouches(cible);
  const libelleToucheReference = nomsDeTouches(reference);

  const FRAPPE = {
    base: (touche) => touche,
    shift: (touche) => 'Maj + ' + touche,
    caps: (touche) => 'Verr. Maj. + ' + touche,
    caps_shift: (touche) => 'Verr. Maj. + Maj + ' + touche,
    alt_gr: (touche) => 'AltGr + ' + touche,
    shift_alt_gr: (touche) => 'AltGr + Maj + ' + touche
  };

  /* Toutes les façons de produire une valeur dans une disposition, dans
     l'ordre des niveaux. `niveau` restreint la recherche quand une étape a
     épinglé le sien. Rendu vide quand la disposition ne produit pas la
     valeur : c'est le cas de É sur l'AZERTY classique, et c'est une
     information, pas une erreur. */
  function frappesDe(disposition, noms, valeur, niveau) {
    const chercher = (niveaux) => {
      const trouvees = [];
      for (const rangee of disposition.rows || []) {
        for (const touche of rangee.keys || []) {
          for (const n of niveaux) {
            if (niveau && n !== niveau) continue;
            if (touche[n] !== valeur) continue;
            const nom = noms.get(touche.position) || touche.position;
            const frappe = FRAPPE[n](nom);
            if (trouvees.indexOf(frappe) === -1) trouvees.push(frappe);
          }
        }
      }
      return trouvees;
    };

    /* Le verrouillage majuscule en dernier recours seulement : sur l'AZERTY
       classique il redouble base et Maj pour tout ce qui n'est pas une lettre,
       et le point sortait « Maj + ; / Verr. Maj. + ; ». Il ne reste que quand
       il est la seule voie — c'est le cas de É È À Ç ici. */
    const directes = chercher(NIVEAUX_COMPARES);
    return directes.length ? directes : chercher(['caps', 'caps_shift']);
  }

  const memoCaracteres = [];
  const memoTouchesMortes = [];
  for (const rangee of cible.rows || []) {
    for (const touche of rangee.keys || []) {
      for (const niveau of NIVEAUX_COMPARES) {
        const valeur = touche[niveau];
        if (!valeur || valeursReference.has(valeur)) continue;
        const nomTouche = libelleTouche.get(touche.position) || touche.position;
        const entree = {
          valeur,
          glyphe: glyphe(valeur),
          frappe: FRAPPE[niveau](nomTouche),
          position: touche.position
        };
        if (estToucheMorte(valeur)) memoTouchesMortes.push(entree);
        else memoCaracteres.push(entree);
      }
    }
  }

  /* ——— Mémo restructuré (arbitrage d'Antoine, 2026-08-30) ———

     Le mémo d'origine ne disait que les ajouts, et les 25 touches mortes y
     occupaient la moitié de la surface pour un public marginal. Trois blocs,
     du plus utile au plus rare : ce qu'il faut réapprendre, les ajouts par
     famille, puis les touches mortes. */

  /* 1. Ce qu'il faut mémoriser : les caractères des cinq changements, la
     frappe d'avant et celle de maintenant, calculées dans les deux
     définitions. ⛔ Aucune frappe écrite à la main. */
  const memoire = ETAPES.filter((etape) => etape.caracteres !== null).map((etape) => ({
    id: etape.id,
    titre: etape.titre,
    entrees: etape.caracteres.map((item) => {
      const { caractere, niveau } = declaration(item);
      return {
        valeur: caractere,
        glyphe: glyphe(caractere),
        avant: frappesDe(reference, libelleToucheReference, caractere, null),
        apres: frappesDe(cible, libelleTouche, caractere, niveau)
      };
    })
  }));

  /* 2. Les ajouts par famille. Le classement est déclaré en tête de fichier ;
     ici on vérifie seulement qu'il couvre tout. */
  const famillePar = new Map();
  for (const famille of FAMILLES_MEMO) {
    for (const valeur of famille.valeurs) famillePar.set(valeur, famille.id);
  }
  const nonClasses = memoCaracteres.filter((entree) => !famillePar.has(entree.valeur));
  if (nonClasses.length) {
    throw new Error(
      'Mémo : ' + nonClasses.length + ' caractère(s) ajouté(s) sans famille — ' +
        nonClasses.map((e) => JSON.stringify(e.valeur)).join(', ') +
        '. Compléter FAMILLES_MEMO dans src/_data/clavier.js.'
    );
  }
  const memoFamilles = FAMILLES_MEMO.map((famille) => ({
    id: famille.id,
    titre: famille.titre,
    /* L'ordre de la famille fait foi : il est éditorial (« « » » avant les
       apostrophes), là où l'ordre du clavier serait celui des rangées. */
    entrees: famille.valeurs
      .map((valeur) => memoCaracteres.find((entree) => entree.valeur === valeur))
      .filter(Boolean)
  })).filter((famille) => famille.entrees.length);

  return {
    colonnes: COLONNES,
    memo: { caracteres: memoCaracteres, touchesMortes: memoTouchesMortes },
    memoire,
    memoFamilles,
    couches: COUCHES.map(({ id, libelle, modificateurs }) => ({ id, libelle, modificateurs })),
    touches,
    parcours,
    legende: [
      { marque: 'changee', libelle: 'Emplacement modifié' },
      { marque: 'ajoutee', libelle: 'Caractère ajouté' },
      { marque: 'morte', libelle: 'Touche morte' }
    ],
    /* Confrontation : mêmes définitions que count-displaced-chars.py. */
    populations: {
      reference: 'AZERTY Traditionnel.json',
      caracteresDeReference: valeursReference.size,
      changeDeTouche: comparaison.changeDeTouche.length,
      memeTouche: comparaison.memeTouche.length,
      deplacesTotal: comparaison.changeDeTouche.length + comparaison.memeTouche.length,
      touchesDeDestination: comparaison.destinations.size,
      ajoutes: comparaison.ajoutes.length,
      disparus: comparaison.disparus.length
    }
  };
}

module.exports = construire();
