/* Testeur v2 — la page /testeur : un parcours de trois étapes, et deux outils
   (« Taper librement », « Chercher un caractère ») qui partagent le même clavier.

   Portage de la maquette retenue par Antoine le 2026-09-21 (variante C), refondu
   le 2026-11-11 (lot 1 de la refonte) : la page s'ouvre sur le parcours, prêt à
   taper, sans clic ; le clavier reste en place quand on change de vue.

   Ce que le testeur ne fait pas : reprise du parcours d'une visite à l'autre.
   Rien n'est écrit sur l'appareil, et la saisie n'est jamais envoyée : seuls
   partent les événements de mesure sans contenu (`testeur_debut`,
   `testeur_etape`, `testeur_fin`, via mesure.js). La chaîne `/js/tester-*.js`
   reste en place : la modale de la home v1 l'utilise toujours par
   `lazy-tester.js`.

   Les positions de touches et les caractères ne sont jamais écrits ici : ils
   sortent de `/tester/azerty-global.json` (table de frappe, huit niveaux),
   de `/data/AZERTY Global.json` (dessin canonique) et de
   `/data/AZERTY Traditionnel.json` (nom gravé sur la touche physique). Le calcul
   sans page (niveau, geste, composition) est dans `js/v2/testeur-moteur.js`.

   CSP : `script-src 'self'`. Fichier externe, aucun `style=`, aucun `<style>`.

   ══════════════════════════════════════════════════════════════════════════
   INTERFACE POUR LES VUES : `window.Testeur`
   ══════════════════════════════════════════════════════════════════════════
   Les lots 2 (« Taper librement », `testeur-libre.js`) et 3 (« Chercher un
   caractère », `testeur-recherche.js`) n'ont PAS le droit de modifier ce fichier
   ni `testeur.njk` : tout ce qu'ils doivent piloter passe par cet objet. Il est
   posé de façon synchrone à l'exécution de ce script, avant tout chargement,
   donc disponible dans les scripts qui le suivent (tous en `defer`, dans
   l'ordre de `testeur.njk`). Absent sur une page sans `#testeur` : une coquille
   commence par `if (!window.Testeur) return;`. Sur tactile, où le testeur ne
   démarre pas, l'objet existe mais `pret` ne se résout jamais : ni `entrer` ni
   `frappe` ne sont appelés.

   Les trois vues : 'parcours' (par défaut, interne), 'libre' et 'recherche'.
   Les vues 'libre' et 'recherche' ont un point de montage dans la page,
   `<section data-montage="…">` avec son titre, vide : la vue y construit son
   interface. Le clavier, lui, ne bouge pas.

   Testeur.pret : Promise
       Résolue, avec le moteur du lot 0 (`TesteurMoteur.creer(…)`), quand les trois
       fichiers de données sont chargés. Ne rejette jamais : si le chargement
       échoue, elle reste en attente et la page affiche son message d'erreur.
       Tant qu'elle n'est pas résolue, ni `entrer` ni `frappe` ne sont appelés.
       Le moteur donne `trouverGeste`, `ligneGeste`, `chercherCaractere`,
       `composer`, `estMorte`, `nommerCaractere`, `lireCaractere`, etc.

   Testeur.moteur : le même moteur, ou null avant `pret`.

   Testeur.vue() → 'parcours' | 'libre' | 'recherche'
   Testeur.vue(nom) → nom, ou false si le nom est inconnu
       Change de vue : la zone au-dessus du clavier change, le clavier reste. Le
       parcours garde son étape, sa cible et sa saisie : y revenir reprend là où
       on l'a laissé (une pause de réussite en cours est jouée avant de partir).
       Quitter une vue éteint les touches allumées et rend le niveau réel.

   Testeur.surVue(rappel) → fonction de désabonnement
       `rappel(nom, precedent)` est appelé après chaque changement de vue.

   Testeur.enregistrerVue(nom, { entrer, sortir, frappe })
       `nom` : 'libre' ou 'recherche'. Tous les crochets sont facultatifs.
       entrer({ montage, moteur, vue, precedent })
           La vue devient active (le point de montage est visible, `moteur` est
           chargé). Appelé aussi tout de suite si la vue est déjà active quand
           elle s'enregistre.
       sortir()
           La vue cesse d'être active.
       frappe(info)
           La vue active reçoit les frappes ; le parcours ne les traite plus tant
           qu'une autre vue est active. Appelé à chaque keydown ET keyup (y compris
           les répétitions et les touches de modification), pour toute cible du
           composant ou du corps de page (pas les liens, boutons, listes) : un
           champ posé dans le point de montage reçoit donc ses frappes aussi.
           `info` :
             type       'keydown' ou 'keyup'
             evenement  l'événement natif (`repeat`, `key`, `code`, `preventDefault`)
             code       le `code` de la touche, recodé pour macOS (`moteur.recoder`)
             position   la position de la touche sur le dessin (« E02 »…), ou null
             niveau     le niveau réel des modificateurs, 0 à 7 (AltGr×4 + Verr. Maj.×2
                        + Maj×1 ; `moteur.modificateurs[niveau]` les nomme)
             caractere  le caractère que le moteur produit à ce niveau ; pour une
                        touche morte, son identifiant (« dk_circumflex ») ; null
                        pour une touche de commande ou sans caractère à ce niveau
             morte      true si `caractere` est une touche morte (`moteur.composer`
                        combine une touche morte avec la lettre suivante)
           Le composant n'appelle PAS `preventDefault` pour une autre vue : si la
           vue remplace la frappe (texte écrit par la vue), c'est à elle de le faire.
           Le composant allume seul la touche enfoncée (`data-appuyee`) et le
           niveau réel ; `enregistrerVue(nom, { …, appuyees: false })` coupe
           l'allumage de la touche enfoncée (recherche dans un champ).

   Testeur.allumer(geste, temps = 1) → nombre de temps du geste (0 si rien à allumer)
       Allume la ou les touches attendues, et les modificateurs qu'elles
       demandent (Maj, AltGr, Verr. Maj.), comme le parcours le fait pour la
       consigne. Éteint d'abord ce qui était allumé. `geste` est :
         - le résultat de `moteur.trouverGeste(c)` : { direct: {position, rang} }
           ou { sequence: { morte, base } } ;
         - ou un tableau de touches { position, rang } allumées ensemble ;
         - ou une seule touche { position, rang }.
       Une touche morte se joue en deux temps : `allumer(geste)` allume la touche
       morte (temps 1, renvoie 2), puis `allumer(geste, 2)` la lettre à combiner.
       `rang` est le niveau de la touche (`modificateurs[rang]` donne les
       modificateurs à presser). Les touches allumées portent `data-attendue` /
       `data-mod-attendu` (halo orangé de la feuille).

   Testeur.eteindre()
       Éteint toutes les touches et tous les modificateurs allumés.

   Testeur.poserNiveau(niveau)
       Affiche les légendes d'un niveau (0 à 7 ; 1 = Maj, 4 = AltGr, 2 = Verr. Maj.,
       5 = Maj + AltGr…) quelles que soient les touches enfoncées : la bascule
       Maj / AltGr / Verr. Maj. du mode libre. Seules les légendes et la ligne
       d’état changent : les touches de modification du dessin ne s’allument
       que si elles sont réellement enfoncées. `poserNiveau(null)` (ou sans
       argument) revient au niveau réel des touches enfoncées.

   Testeur.annoncer(texte)
       Écrit dans la zone `aria-live` de la page.

   Testeur.montage(nom) → l'élément de montage de la vue 'libre' ou 'recherche'.
   ══════════════════════════════════════════════════════════════════════════ */

(async function () {
  'use strict';

  var racine = document.querySelector('#testeur');
  if (!racine) return;

  /* Le drapeau qui affiche le plateau est pose sur `<html>` par
     `js/v2/theme.js`, avant le premier rendu (P-01, audit perf du
     2026-10-05). Celui-ci reste pour les lecteurs qui s'y fient. */
  racine.dataset.js = 'true';

  var $ = function (selecteur) { return racine.querySelector(selecteur); };
  var $$ = function (selecteur) { return Array.from(racine.querySelectorAll(selecteur)); };

  var TITRE_PAGE = 'Essayez AZERTY Global.';
  var VUES = ['parcours', 'libre', 'recherche'];

  var etat = {
    vue: 'parcours',
    ecran: 'parcours',   /* parcours | usage | synthese */
    etape: 0,
    cible: 0,
    saisi: [],
    erreurs: 0,
    valides: [false, false, false],
    connu: false,
    methode: null,
    dernier: null,       /* le retour de la dernière cible réussie, repris en tête du bilan */
    usages: [],
    usageDemande: false,
    faits: [],
    fin: false,
    debut: false,
    bonus: false,
    usage: 'documents',
    morte: null,
    niveau: 0
  };

  /* Le moteur de frappe (js/v2/testeur-moteur.js) : tout ce qui se calcule
     sans la page, créé quand les trois JSON sont chargés. `parPosition` et
     `positionParCode` sont ses index, repris en variables d'ici : vides tant
     que le chargement court. */
  var moteur = null;
  var parPosition = {};
  var positionParCode = {};
  var minuteur;
  var minuteurSuite = null;
  var indiceTouche = null;
  var indiceCaractere = null;
  var indiceSequence = null;   /* { suite: touche | null } quand le geste passe par une touche morte */
  var niveauForce = null;      /* niveau posé par une vue (poserNiveau), null = niveau réel */

  /* ── L'interface `window.Testeur` : posée tout de suite, avant le test du
        tactile et avant le premier `await`. ──────────────────────────────── */
  var resoudrePret;
  var vues = {};
  var abonnes = [];
  var Testeur = {
    pret: new Promise(function (resoudre) { resoudrePret = resoudre; }),
    moteur: null,
    vue: function (nom) {
      if (nom === undefined) return etat.vue;
      return changerVue(nom);
    },
    surVue: function (rappel) {
      abonnes.push(rappel);
      return function () {
        var rang = abonnes.indexOf(rappel);
        if (rang !== -1) abonnes.splice(rang, 1);
      };
    },
    enregistrerVue: function (nom, definition) {
      if (nom !== 'libre' && nom !== 'recherche') return false;
      vues[nom] = definition || {};
      if (etat.vue === nom && moteur) entrerVue(nom, 'parcours');
      return true;
    },
    allumer: function (geste, temps) { return allumer(geste, temps); },
    eteindre: function () { eteindre(); },
    poserNiveau: function (niveau) { poserNiveau(niveau); },
    annoncer: function (texte) { annoncer(texte); },
    montage: function (nom) { return racine.querySelector('[data-montage="' + nom + '"]'); }
  };
  window.Testeur = Testeur;

  /* Tactile : le parcours suppose un clavier physique et des modificateurs.
     La notice `.tc__etroit` est déjà dans la page, la feuille l'affiche sous
     900 px ; ce drapeau couvre la tablette large, que la largeur ne trahit
     pas. Le testeur ne démarre pas du tout dans ce cas. */
  var tactile = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (tactile) {
    racine.dataset.tactile = 'true';
    return;
  }

  var parametres = new URLSearchParams(location.search);
  var complet = parametres.get('profil') === 'complet';
  var programmation = parametres.get('lecon') === 'programmation';

  /* Profil général : on n'affiche en AltGr que les caractères utiles au
     français courant. `?profil=complet` lève le filtre et montre la carte
     entière des légendes directes. */
  var supplementsVisibles = new Set(Array.from('«»œæ—–…’€@#{}\\|[]°'));

  /* Trois étapes : deux de tronc commun, une selon l'usage (lot B, 2026-11-10).
     Les textes viennent de operations/2026-09-29-contenu-lecons/decisions.md.
     `etapes[2]` est remplacée au départ par l'usage choisi (voir `usages`).
     Espaces : U+202F devant « ! » et « ? », U+00A0 devant « : » et dans les
     guillemets. */
  var etapes = [
    {
      titre: 'Les majuscules accentuées.',
      sous: 'É, È, À et Ç avec Verr. Maj., sur les touches que vous connaissez.',
      cibles: ['É', 'ÇA GÈLE À MONTRÉAL, PAS À ABIDJAN !'],
      caracteres: 'ÉÈÀÇ',
      explication: 'Sur l’AZERTY traditionnel, Verr. Maj. puis é donne un 2. Ici, vous obtenez É.',
      /* Le premier message ne dépend d'aucune réponse : bravoE(). */
      bravos: [null, {
        titre: 'Bravo, É, È, À et Ç sont écrits.',
        texte: 'Même geste pour les quatre : Verr. Maj., puis la touche de la lettre accentuée.'
      }]
    },
    {
      titre: 'Une adresse, sans détour.',
      sous: 'Le point sans Majuscule, l’arobase en haut à gauche.',
      cibles: ['.fr .com .org .net', 'contact@exemple.com'],
      caracteres: '@.',
      explications: [
        'Désactivez Verr. Maj. Le point n’a plus besoin de Maj.',
        'L’arobase n’a plus besoin d’AltGr : touche ², en haut à gauche.'
      ],
      bravos: [{
        titre: 'C’est écrit.',
        texte: 'Avec les mêmes touches, l’AZERTY traditionnel de Windows écrit « ;fr ;com ;org ;net ».'
      }, {
        titre: 'C’est écrit.',
        texte: 'Avec les mêmes touches, l’AZERTY traditionnel de Windows écrit « contact²exemple;com ».'
      }]
    },
    null
  ];

  /* L'étape d'usage, une seule dans le parcours. `strict` : Documents exige les
     espaces insécables et l'apostrophe typographique ; partout ailleurs la
     frappe est tolérante (espace ≡ insécable, ' ≡ ’). `gestes` : le geste
     préféré quand le caractère s'obtient de deux façons (Messages : ^ puis ç,
     plutôt que Verr. Maj. + 9). */
  var RETOUR = 'Avec les mêmes touches, l’AZERTY traditionnel de Windows écrit ';
  var usages = {
    documents: {
      titre: 'La typographie française avec AltGr',
      strict: true,
      sous: 'Les guillemets, le tiret et la ligature œ se tapent directement avec AltGr.',
      cibles: ['« Un chef-d’œuvre ! » — Maman'],
      caracteres: '«»’œ —',
      explication: 'Maintenez AltGr : W pour «, X pour », 4 pour ’ et O pour œ. L’indice montre les autres touches.',
      bravos: [{ titre: 'C’est écrit.', texte: RETOUR + '« Un chef-d{uvre!  Maman ».' }]
    },
    messages: {
      titre: 'La majuscule accentuée en début de phrase',
      sous: 'Une majuscule accentuée sans Verr. Maj., avec la touche morte ^.',
      cibles: ['À table ! Ça refroidit !'],
      caracteres: 'ÀÇ',
      gestes: { 'À': 'dk_circumflex', 'Ç': 'dk_circumflex', 'É': 'dk_circumflex', 'È': 'dk_circumflex' },
      explication: 'En début de phrase, appuyez sur ^, puis sur ç : vous obtenez Ç. Même geste avec à, é et è.',
      bravos: [{ titre: 'C’est écrit.', texte: RETOUR + '« ^à table ! ^ça refroidit ! ».' }]
    },
    code: {
      titre: 'Les symboles du code sur la rangée de repos',
      sous: 'Accolades, crochets, barre oblique inverse et barre verticale, sans quitter la rangée centrale.',
      cibles: ['if (a || b) { t[0] = "\\n"; }'],
      caracteres: '{}[]\\|',
      explication: 'Maintenez AltGr : { et } sur D et F, [ et ] sur J et K, \\ et | sur G et H.',
      bravos: [{
        titre: 'C’est écrit.',
        texte: 'Sur l’AZERTY traditionnel de Windows, ces symboles sont sur la rangée des chiffres, avec AltGr.'
      }]
    },
    langues: {
      titre: 'Les accents des autres langues',
      sous: 'Accent aigu, accent grave et tilde : une touche morte, puis la lettre.',
      cibles: ['María et Niccolò arrivent à São Paulo.'],
      caracteres: 'íòã',
      explication: 'Accent aigu : ù, puis la voyelle. Accent grave : Maj + ù, puis la voyelle. Tilde : AltGr + ù, puis la lettre.',
      bravos: [{ titre: 'C’est écrit.', texte: RETOUR + '« Marùia et Niccol%o arrivent à Sao Paulo; ».' }]
    },
    afrique: {
      titre: 'Les lettres des langues d’Afrique',
      sous: 'Des lettres que l’AZERTY traditionnel ne sait pas écrire.',
      cibles: ['ɛ ɔ ŋ ɲ ɓ ɗ', 'I ni sɔgɔma!'],
      caracteres: 'ɛɔŋɲɓɗ',
      explications: [
        'ɛ, ɔ, ŋ et ɲ : AltGr + 6, puis E, O, N ou J. ɓ : ù, puis B. ɗ : AltGr + 1, puis D.',
        'Maintenant, bonjour du matin en bambara.'
      ],
      bravos: [{
        titre: 'C’est écrit.',
        texte: RETOUR + '« |e |o |n |j ùb d ».'
      }, {
        titre: 'Bravo, les lettres sont écrites.',
        texte: 'Voilà « bonjour » du matin en bambara.'
      }]
    }
  };

  /* Le plus particulier d'abord (décision du 2026-10-01) ; rien de coché,
     Documents. */
  var ORDRE_USAGES = ['afrique', 'code', 'langues', 'documents', 'messages'];

  function usageChoisi() {
    for (var i = 0; i < ORDRE_USAGES.length; i += 1) {
      if (etat.usages.indexOf(ORDRE_USAGES[i]) !== -1) return ORDRE_USAGES[i];
    }
    return 'documents';
  }

  function poserUsage(identifiant) {
    etat.usage = identifiant;
    etapes[2] = usages[identifiant];
  }
  poserUsage('documents');

  /* La consigne d'arrivée (QCM du 2026-11-11), reprise tant que Verr. Maj. n'est
     pas actif sur le premier É. */
  var CONSIGNE_E = 'Tapez un É : Verr. Maj., puis la touche é.';

  /* Après le É, on dit ce que la personne peut oublier : la méthode choisie à
     la question qui suit le É (QCM d'Antoine du 2026-10-03, déplacée après le É
     le 2026-11-11). */
  var anciennesMethodes = {
    copier: 'Fini le copier-coller',
    alt: 'Plus besoin d’Alt 0201',
    correcteur: 'Plus besoin d’attendre le correcteur',
    table: 'Plus besoin d’ouvrir la table des caractères',
    logiciel: 'Plus besoin d’un autre logiciel'
  };

  function phraseMethode(reponse) {
    if (anciennesMethodes[reponse]) {
      return anciennesMethodes[reponse] + ' : avec AZERTY Global, c’est Verr. Maj. puis é.';
    }
    return reponse === 'verrmaj'
      ? 'Votre geste habituel : AZERTY Global le garde.'
      : 'Plus besoin d’y renoncer : en français, les majuscules gardent leurs accents.';
  }

  /* Le premier bravo : neutre, la question sur la méthode vient après. Sans
     réponse, la comparaison avec l'AZERTY traditionnel, qui ne vaut que pour
     Windows : sous macOS, Verr. Maj. puis é y donne déjà É. */
  function bravoE() {
    return {
      titre: 'Bravo, vous avez écrit É.',
      texte: mac
        ? 'Avec AZERTY Global, c’est Verr. Maj. puis é.'
        : 'Sur l’AZERTY traditionnel de Windows, vous auriez eu 2.'
    };
  }

  /* Le bilan du 20/10 (operations/2026-09-29-contenu-lecons/decisions.md:237-244 ;
     gestes vérifiés sur la table 2026.1 dans lot1-synthese-variantes.md). Les
     cinq changements du guide, dans l'ordre. Correspondance avec les étapes du
     code : le changement 1 vient de l'étape É, les changements 2 et 3 de l'étape
     adresse (l'« étape 3 » du 20/10), le 4 de l'usage code, le 5 de l'usage
     autres langues. Documents, Messages et Langues d'Afrique sont « En plus ». */
  var CHANGEMENTS = [
    {
      nom: 'Verrouillage majuscule intelligent',
      geste: 'Verr. Maj., puis é, è, à ou ç : É È À Ç',
      caracteres: 'É È À Ç'
    },
    {
      nom: 'Le point sans Majuscule',
      geste: 'Le point directement, sans Maj',
      caracteres: '.'
    },
    {
      nom: 'Arobase et dièse en haut à gauche',
      geste: '@ : touche ², en haut à gauche',
      caracteres: '@ #'
    },
    {
      nom: 'Symboles de programmation sur la rangée de repos',
      geste: 'AltGr + D et F : { } ; J et K : [ ] ; G et H : \\ |',
      caracteres: '{ } [ ] \\ |'
    },
    {
      nom: 'Accents internationaux sur la touche ù',
      geste: 'ù, Maj + ù ou AltGr + ù, puis la lettre : í ò ã',
      caracteres: 'í ò ã'
    }
  ];
  var EN_PLUS = {
    documents: {
      nom: 'La typographie française',
      geste: 'AltGr + W, X, 4 et O pour « » ’ œ'
    },
    messages: {
      nom: 'La majuscule en début de phrase',
      geste: '^ puis ç donne Ç, de même À É È'
    },
    afrique: {
      nom: 'Les lettres des langues d’Afrique',
      geste: 'AltGr + 6 puis E, O, N ou J pour ɛ ɔ ŋ ɲ ; ù puis B pour ɓ ; AltGr + 1 puis D pour ɗ'
    }
  };

  /* Libellés des boutons « Essayer aussi » (K4, 20/10). `adresses` : l'étape
     adresse passée, proposée au bilan (état partiel). */
  var LIBELLES_BONUS = {
    adresses: 'Des adresses . @',
    code: 'Du code { } [ ]',
    langues: 'D’autres langues í ò ã',
    documents: 'Des documents « » œ',
    messages: 'Des messages À Ç',
    afrique: 'Une langue d’Afrique ɛ ɔ ŋ'
  };

  var TITRE_BILAN = 'Pour écrire ainsi au quotidien, installez AZERTY Global.';
  var TITRE_BILAN_PASSE = 'Les 5 changements d’AZERTY Global';

  /* Les huit niveaux de la table de frappe (rang = AltGr×4 + Verr. Maj.×2 +
     Maj×1), leurs modificateurs et les noms des touches de modification : les
     constantes du moteur, qui ne dépendent d'aucun JSON. */
  var couche = TesteurMoteur.couche;
  var modificateurs = TesteurMoteur.modificateurs;
  var noms = TesteurMoteur.noms;

  var mac = /Mac/.test(navigator.platform);
  var zone = $('#tc-frappe');

  function cibleCourante() {
    return etapes[etat.etape].cibles[etat.cible];
  }

  function annoncer(texte) {
    $('[data-annonce]').textContent = texte;
  }

  /* Message court sous la phrase : une faute (couleur d'erreur) ou une frappe
     que le testeur ne peut pas lire (ton neutre). Il part à la frappe juste
     suivante, avec l'indice. Le lecteur d'écran l'entend par `annoncer`. Elle
     passe par-dessus le contenu de la bande de retour (la feuille masque ce qui
     l'accompagne) : la bande a une hauteur réservée, rien ne bouge. */
  function alerter(texte, neutre) {
    var alerte = $('[data-alerte]');
    alerte.textContent = texte;
    alerte.hidden = false;
    if (neutre) alerte.dataset.ton = 'neutre'; else alerte.removeAttribute('data-ton');
  }

  function eteindre() {
    $$('[data-attendue],[data-mod-attendu]').forEach(function (element) {
      element.removeAttribute('data-attendue');
      element.removeAttribute('data-mod-attendu');
    });
  }

  /* Fige la consigne : plus de minuteur, plus de recalcul au changement de
     niveau, la faute affichée part ; le texte et les touches allumées restent. */
  function figerIndice() {
    clearTimeout(minuteur);
    indiceTouche = null;
    indiceCaractere = null;
    indiceSequence = null;
    var alerte = $('[data-alerte]');
    alerte.textContent = '';
    alerte.hidden = true;
  }

  function effacerIndice() {
    figerIndice();
    eteindre();
  }

  /* Quatre coins par touche, un par famille de casse : base en bas à gauche,
     Maj en haut à gauche, AltGr en bas à droite, Maj+AltGr en haut à droite.
     Une seule légende par famille (jamais é ET É). Décision du 2026-09-21. */
  function poserLegendes() {
    $('[data-mod="maj-d"] .clavier__libelle').textContent = 'Majuscule';

    $$('.clavier__touche[data-position]').forEach(function (touche) {
      var donnees = parPosition[touche.dataset.position];
      var vues = new Set();
      var occupes = new Set();
      var champs = { base: 'base', maj: 'shift', verrmaj: 'caps', altgr: 'alt_gr', majaltgr: 'shift_alt_gr' };

      touche.querySelectorAll('[data-slot]').forEach(function (glyphe) {
        glyphe.removeAttribute('data-slot');
      });

      ['base', 'maj', 'altgr', 'majaltgr'].forEach(function (famille) {
        var glyphe = touche.querySelector('.clavier__glyphe--' + famille);
        if (!glyphe) return;
        var valeur = donnees[champs[famille]];
        if (!valeur) return;

        /* Le # en AltGr de B09 double celui de la touche ² : il n'a de sens
           que pour la leçon programmation et sur la carte complète. */
        if (!complet && !programmation && touche.dataset.position === 'B09'
            && famille === 'altgr' && valeur === '#') return;

        /* Une lettre garde une seule légende : sa minuscule au centre. */
        if (famille === 'maj' && touche.dataset.lettre) return;
        if ((famille === 'altgr' || famille === 'majaltgr') && !complet
            && !supplementsVisibles.has(valeur)) return;
        if (glyphe.dataset.invisible && famille !== 'base' && !complet) return;

        var identite = valeur.toLocaleLowerCase('fr');
        if (vues.has(identite)) return;
        if (occupes.has(famille)) return;

        glyphe.dataset.slot = famille;
        glyphe.dataset.original = glyphe.textContent;
        vues.add(identite);
        occupes.add(famille);
      });
    });

    $('.clavier').setAttribute('aria-label',
      'Clavier AZERTY Global. Lettres à leur place, légendes fixes. '
      + (complet ? 'Carte complète des légendes directes.' : 'Caractères utiles au français.'));

    if (complet) {
      $('[data-legende]').textContent =
        'Carte complète des légendes directes. Les caractères avec AltGr se lisent à droite des touches.';
    }
  }

  /* Le niveau réel (touches enfoncées) : mémorisé, affiché sauf si une vue a
     posé un autre niveau (`poserNiveau`). */
  function niveauActif(rang) {
    etat.niveau = rang;
    afficherNiveau(niveauForce === null ? rang : niveauForce);
  }

  function poserNiveau(niveau) {
    if (typeof niveau === 'number' && niveau >= 0 && niveau <= 7) {
      niveauForce = Math.floor(niveau);
      afficherNiveau(niveauForce);
    } else {
      niveauForce = null;
      afficherNiveau(etat.niveau);
    }
  }

  /* Le niveau affiché ne déplace aucune légende : il change la couleur et la
     graisse de celle qui est active. Décision 2A du 2026-09-21. */
  function afficherNiveau(rang) {
    $$('[data-actif],[data-mod-actif]').forEach(function (element) {
      element.removeAttribute('data-actif');
      element.removeAttribute('data-mod-actif');
    });

    racine.toggleAttribute('data-majuscules-actives', Boolean(rang & 2) && !(rang & 1));

    /* Verr. Maj. actif : la légende de base montre la majuscule à sa place,
       sans cinquième emplacement. */
    $$('.clavier__touche[data-position]').forEach(function (touche) {
      var donnees = parPosition[touche.dataset.position];
      var base = touche.querySelector('[data-slot="base"]');
      if (base && donnees.base && donnees.caps && donnees.base !== donnees.caps
          && donnees.base.toLocaleUpperCase('fr') === donnees.caps && !touche.dataset.lettre) {
        base.textContent = rang & 2 ? donnees.caps : base.dataset.original;
      }
    });

    $$('.clavier__touche[data-position]').forEach(function (touche) {
      var glyphe = touche.querySelector('.clavier__glyphe--' + couche[rang] + '[data-slot]');
      if (!glyphe && rang < 4) glyphe = touche.querySelector('[data-slot="base"]');
      if (glyphe) glyphe.dataset.actif = '';
    });

    accentuerExercice();

    /* Un niveau posé par une vue ne change que les légendes : les touches de
       modification du dessin disent ce qui est réellement enfoncé, sinon le
       dessin montre AltGr tenu alors que la frappe l’ignore. */
    var reel = niveauForce === null ? rang : (etat.niveau || 0);
    Object.keys(noms).forEach(function (identifiant) {
      if (modificateurs[reel].indexOf(noms[identifiant]) === -1) return;
      $$('[data-mod="' + identifiant + '"], [data-mod^="' + identifiant + '-"]').forEach(function (touche) {
        touche.dataset.modActif = '';
      });
    });

    $('[data-mode]').textContent = modificateurs[rang].length
      ? modificateurs[rang].join(' + ') + ' actif' + (modificateurs[rang].length > 1 ? 's' : '')
      : 'Sans modificateur';

    if (indiceTouche) consigne();
  }

  /* La consigne distingue « activez Verr. Maj. » de « Verr. Maj. est actif » :
     correction demandée par la revue A du 2026-09-21. */
  function marquerModificateurs(liste) {
    $$('[data-mod-attendu]').forEach(function (mod) { mod.removeAttribute('data-mod-attendu'); });
    Object.keys(noms).forEach(function (identifiant) {
      if (liste.indexOf(noms[identifiant]) === -1) return;
      $$('[data-mod="' + identifiant + '"], [data-mod^="' + identifiant + '-"]').forEach(function (mod) {
        mod.dataset.modAttendu = '';
      });
    });
  }

  /* Allumer les touches d'un geste, pour toute vue (`Testeur.allumer`). */
  function allumer(geste, temps) {
    var temps_ = [];
    if (Array.isArray(geste)) temps_ = [geste];
    else if (geste && geste.direct) temps_ = [[geste.direct]];
    else if (geste && geste.sequence) temps_ = [[geste.sequence.morte], [geste.sequence.base]];
    else if (geste && geste.position) temps_ = [[geste]];
    if (!temps_.length) return 0;

    eteindre();
    var voulu = Math.min(Math.max(Math.floor(temps || 1), 1), temps_.length);
    var presses = [];
    temps_[voulu - 1].forEach(function (touche) {
      var element = $('[data-position="' + touche.position + '"]');
      if (element) element.dataset.attendue = '';
      if (modificateurs[touche.rang]) presses = presses.concat(modificateurs[touche.rang]);
    });
    marquerModificateurs(presses);
    return temps_.length;
  }

  function consigne() {
    if (!indiceTouche) return;
    var touche = indiceTouche;
    var caractere = indiceCaractere;
    var nom = moteur.nomTouche(touche.position);
    var aPresser = modificateurs[touche.rang];
    var texte = aPresser.concat([nom]).join(' + ');

    if (indiceSequence) {
      /* Touche morte puis lettre : à deux temps, la consigne dit les deux. */
      var suite = indiceSequence.suite;
      $('[data-indice]').textContent = suite
        ? 'Appuyez sur ' + texte + ', puis sur '
          + avecPoint(modificateurs[suite.rang].concat([moteur.nomTouche(suite.position)]).join(' + '))
        : 'Maintenant, appuyez sur ' + avecPoint(texte);
      marquerModificateurs(aPresser);
      return;
    }

    if (touche.rang & 2) {
      /* Verr. Maj. déjà actif : il n'est plus à presser, on ne le surligne pas. */
      if (etat.niveau & 2) {
        aPresser = aPresser.filter(function (mod) { return mod !== 'Verr. Maj.'; });
      }
      $('[data-indice]').textContent = etat.niveau & 2
        ? 'Verr. Maj. est actif : appuyez sur ' + avecPoint(nom)
        : etat.etape === 0 && etat.cible === 0
          ? CONSIGNE_E
          : 'Activez Verr. Maj., puis appuyez sur ' + avecPoint(nom);
    } else if ((etat.niveau & 2) && touche.rang < 2) {
      /* Verr. Maj. déjà actif : on cherche d'abord le geste qui marche dans
         cet état, sans Maj puis avec. Avant le 2026-10-02, seul le rang + 2
         était essayé, et le A de « ÇA » (Maj + a, rang 1) demandait de
         désactiver Verr. Maj. alors qu'un simple a donnait A. */
      /* « pour A » après la touche A, ou « pour  » après Espace, ne disait
         rien (critique du 2026-10-03) : on ne nomme le caractère que s'il
         diffère de la touche. */
      var pour = caractere === ' ' || caractere === nom ? '' : ' pour ' + caractere;
      if (minusculeAttendue()) {
        /* Une minuscule est attendue et Verr. Maj. est resté actif (après l'étape
           des majuscules) : « Maj + F pour f » apprenait un détour. On demande
           d'abord de le désactiver, et la touche Verr. Maj. s'allume avant celle
           de la lettre (lot 1c, 2026-11-12). */
        aPresser = ['Verr. Maj.'].concat(aPresser);
        $('[data-indice]').textContent = 'Désactivez Verr. Maj., puis appuyez sur ' + avecPoint(texte);
      } else if (moteur.caractere(touche.code, 2) === caractere) {
        aPresser = [];
        $('[data-indice]').textContent = 'Verr. Maj. est actif : appuyez sur ' + avecPoint(nom + pour);
      } else if (moteur.caractere(touche.code, 3) === caractere) {
        aPresser = ['Maj'];
        $('[data-indice]').textContent = 'Verr. Maj. est actif : appuyez sur Maj + ' + avecPoint(nom + pour);
      } else {
        aPresser = ['Verr. Maj.'].concat(aPresser);
        $('[data-indice]').textContent = 'Désactivez Verr. Maj., puis appuyez sur ' + avecPoint(texte);
      }
    } else {
      $('[data-indice]').textContent = 'Appuyez sur ' + avecPoint(texte);
    }
    marquerModificateurs(aPresser);
  }

  /* « appuyez sur ; pour .. » : le caractère est déjà un point, la phrase n'en
     reçoit pas un second. */
  function avecPoint(texte) {
    return /\.$/.test(texte) ? texte : texte + '.';
  }

  /* La prochaine lettre à casse de la cible est-elle une minuscule ? Les signes
     sans casse (point, espace, guillemet) se sautent : au « . » de « .fr », la
     minuscule f est la suite, et Verr. Maj. doit déjà être éteint. Une
     majuscule d'abord (le A de « ÇA GÈLE ») : Verr. Maj. sert, on le garde. */
  function minusculeAttendue() {
    var cible = Array.from(cibleCourante());
    for (var i = etat.saisi.length; i < cible.length; i += 1) {
      var minuscule = cible[i].toLocaleLowerCase('fr');
      if (minuscule === cible[i].toLocaleUpperCase('fr')) continue;
      return cible[i] === minuscule;
    }
    return false;
  }

  /* Décision 3A : seules les nouveautés de l'exercice en cours sont mises en
     évidence sur le clavier. */
  function accentuerExercice() {
    $$('[data-exercice]').forEach(function (glyphe) { glyphe.removeAttribute('data-exercice'); });
    if (etat.vue !== 'parcours' || etat.ecran !== 'parcours') return;
    var attendus = etapes[etat.etape].caracteres.toLocaleLowerCase('fr');
    $$('.clavier__glyphe[data-slot]').forEach(function (glyphe) {
      if (glyphe.textContent.length === 1
          && attendus.indexOf(glyphe.textContent.toLocaleLowerCase('fr')) !== -1) {
        glyphe.dataset.exercice = '';
      }
    });
  }

  /* Guidage : immédiat sur les caractères que l'exercice enseigne, différé de
     trois secondes sur les autres, pour ne pas souffler une lettre connue. */
  function indice(forcer) {
    effacerIndice();
    if (!moteur || etat.vue !== 'parcours' || etat.ecran !== 'parcours') return;

    var caractere = Array.from(cibleCourante())[etat.saisi.length];
    if (!caractere) return;
    var geste = moteur.trouverGeste(caractere, etapes[etat.etape].gestes);
    if (!geste) return;
    /* Touche morte déjà posée comme prévu : reste la lettre à combiner. */
    var deuxieme = Boolean(geste.sequence) && etat.morte === geste.sequence.dk;
    var touche = geste.direct || (deuxieme ? geste.sequence.base : geste.sequence.morte);

    /* Immédiat : après une faute, sur un caractère que l'étape enseigne, et quand
       Verr. Maj. est resté actif alors qu'une minuscule vient (lot 1c) : le
       laisser trois secondes sans consigne, c'est laisser taper F pour f. */
    var capsAEteindre = Boolean(geste.direct) && (etat.niveau & 2) !== 0
      && touche.rang < 2 && minusculeAttendue();
    var immediat = forcer || capsAEteindre
      || etapes[etat.etape].caracteres.indexOf(caractere) !== -1;

    var montrer = function () {
      var element = $('[data-position="' + touche.position + '"]');
      if (element) element.dataset.attendue = '';
      indiceTouche = touche;
      indiceCaractere = caractere;
      indiceSequence = geste.sequence
        ? { suite: deuxieme ? null : geste.sequence.base }
        : null;
      consigne();
      /* Après une faute (forcer), la bonne touche reste allumée : la consigne
         ne s'éteint pas (décision du 2026-09-29). */
      if (!immediat) {
        minuteur = setTimeout(function () {
          effacerIndice();
          $('[data-indice]').textContent = '';
        }, 3500);
      }
    };

    if (immediat) {
      montrer();
    } else {
      /* Lettre connue : ligne vide, sa hauteur reste réservée (retour du
         2026-11-12 : « Continuez à votre rythme. » déconcentrait). */
      $('[data-indice]').textContent = '';
      minuteur = setTimeout(montrer, 3000);
    }
  }

  /* « Passer » (toujours là) devient « Passer cet exercice » après deux fautes
     de suite : un seul des deux est affiché à la fois. */
  function majPasser() {
    var enParcours = etat.vue === 'parcours' && etat.ecran === 'parcours';
    $('[data-action="passer"]').hidden = !enParcours || etat.erreurs >= 2;
    $('[data-action="passer-exercice"]').hidden = !enParcours || etat.erreurs < 2;
  }

  function dessinerLigne() {
    var ligne = $('[data-ligne]');
    ligne.replaceChildren();
    Array.from(cibleCourante()).forEach(function (caractere, index) {
      var span = document.createElement('span');
      var saisi = etat.saisi[index];
      span.dataset.etat = saisi
        ? (saisi === caractere ? 'juste' : 'erreur')
        : (index === etat.saisi.length ? 'attendu' : 'a-taper');
      span.textContent = saisi || caractere;
      ligne.append(span);
    });

    zone.setAttribute('aria-label',
      'À écrire : ' + cibleCourante() + '. Saisi : ' + (etat.saisi.join('') || 'rien'));

    var fini = etat.saisi.join('') === cibleCourante();
    majPasser();
    return fini;
  }

  /* Plus de bouton Continuer (QCM d'Antoine du 2026-10-03) : la cible réussie
     reste un instant à l'écran, en vert, puis la suivante arrive seule. La
     première frappe pendant ce temps l'appelle tout de suite et compte déjà
     pour elle : personne n'attend. Les félicitations restent affichées sous
     la nouvelle cible, le temps de les lire, et partent à la première vraie
     frappe de cette cible (retour d'Antoine du 2026-11-10, amende la
     décision du 2026-10-03). */
  var PAUSE_REUSSITE = 800;

  /* La cible qui suit, pour l'annonce ; rien quand la suite est la question
     d'usage ou le bilan. */
  function prochaineCible() {
    var cibles = etapes[etat.etape].cibles;
    if (etat.cible + 1 < cibles.length) return cibles[etat.cible + 1];
    if (etat.bonus) return null;
    if (etat.etape + 1 >= etapes.length) return null;
    if (etat.etape + 1 === 2 && !etat.usageDemande) return null;
    return etapes[etat.etape + 1].cibles[0];
  }

  function montrerBravo(bravo) {
    $('[data-bravo-titre]').textContent = bravo.titre;
    $('[data-bravo-texte]').textContent = bravo.texte;
    $('[data-bravo]').hidden = false;
  }

  function cacherBravo() {
    $('[data-bravo]').hidden = true;
  }

  /* La question sur la méthode, et la phrase qui la remplace après une
     réponse : toutes deux s'effacent avec le bravo, à la frappe suivante. */
  function montrerMethode() {
    $('[data-methode]').hidden = false;
    $('[data-methode-reponse]').hidden = true;
    majDroite();
    /* La question prend toute la zone et le parcours l'attend : la cible
       suivante ne s'affiche qu'après la réponse, ou « Passer la question »
       (retour d'Antoine du 2026-11-12). */
    etat.question = true;
    racine.dataset.question = '';
  }

  /* La question est close (réponse, « Passer la question », Entrée ou Échap) :
     le parcours reprend à la cible suivante. */
  function fermerQuestion(reprendre) {
    if (!etat.question) return;
    etat.question = false;
    delete racine.dataset.question;
    if (!reprendre) return;
    clearTimeout(minuteurSuite);
    minuteurSuite = setTimeout(avancer, PAUSE_REUSSITE);
    avancer();
  }

  function passerQuestion() {
    $('[data-methode]').hidden = true;
    majDroite();
    fermerQuestion(true);
    zone.focus({ preventScroll: true });
  }

  /* La partie droite de la bande ne garde sa place que si elle montre la question
     ou sa réponse : vide, elle cède toute la largeur au bravo, qui sans cela
     s'écrasait sur trois lignes et poussait le clavier (lot 1c). */
  function majDroite() {
    $('.tc__droite').hidden = $('[data-methode]').hidden && $('[data-methode-reponse]').hidden;
  }

  function effacerSuite() {
    cacherBravo();
    etat.dernier = null;
    $('[data-methode]').hidden = true;
    $('[data-methode-reponse]').hidden = true;
    majDroite();
    fermerQuestion(false);
  }

  /* La note d'arrivée cède la place à la bande de retour dès la première frappe
     comptée (ou le premier « Passer »), pour de bon. Pas au chargement : une
     arrivée `?de=` compte déjà le début, et la personne n'a encore rien tapé. */
  function cacherNote() {
    $('[data-note]').hidden = true;
  }

  function repondreMethode(reponse) {
    etat.methode = reponse;
    etat.connu = reponse === 'verrmaj';
    $('[data-methode]').hidden = true;
    var phrase = $('[data-methode-reponse]');
    phrase.textContent = phraseMethode(reponse);
    phrase.hidden = false;
    majDroite();
    fermerQuestion(true);
    /* Le clic a donné le focus au bouton, que la frappe ignore : la zone le
       reprend, la frappe continue. */
    zone.focus({ preventScroll: true });
  }

  function reussir() {
    /* La consigne et les touches allumées restent affichées pendant la pause :
       la cible suivante les remplace (avancer), rien ne s'éteint ni ne se vide
       avant (lot 1c, 2026-11-12). */
    figerIndice();
    var premier = etat.etape === 0 && etat.cible === 0;
    var bravo = premier ? bravoE() : etapes[etat.etape].bravos[etat.cible];
    montrerBravo(bravo);
    /* Si c'est la dernière cible, ce retour reste en tête du bilan. */
    etat.dernier = bravo;
    if (premier) montrerMethode();
    /* Le vert ne vient qu'ici : pendant la frappe, juste = encre grasse, que
       le gris « à taper » ne rejoint pas en luminance (critique du 2026-10-03). */
    zone.dataset.reussie = '';

    var ensuite = prochaineCible();
    annoncer(bravo.titre + ' ' + bravo.texte
      + (ensuite ? ' À écrire maintenant : ' + ensuite : ''));

    clearTimeout(minuteurSuite);
    /* Après le premier É, la question attend sa réponse : pas de minuteur. */
    minuteurSuite = premier ? null : setTimeout(avancer, PAUSE_REUSSITE);
  }

  function avancer() {
    if (minuteurSuite === null) return;
    clearTimeout(minuteurSuite);
    minuteurSuite = null;
    suivant(false);
  }

  /* ── Les vues ───────────────────────────────────────────────────────────── */

  /* Qui est visible : `data-zone` (une vue), `data-ecrans` (des écrans du
     parcours, seulement dans la vue parcours), `data-vues` (des vues). */
  function majVisibilite() {
    $$('[data-zone],[data-ecrans],[data-vues]').forEach(function (element) {
      var visible = true;
      if (element.dataset.zone) visible = visible && element.dataset.zone === etat.vue;
      if (element.dataset.ecrans) {
        visible = visible && etat.vue === 'parcours'
          && element.dataset.ecrans.split(' ').indexOf(etat.ecran) !== -1;
      }
      if (element.dataset.vues) visible = visible && element.dataset.vues.split(' ').indexOf(etat.vue) !== -1;
      element.hidden = !visible;
    });
    $$('.tc__outils [data-vue-cible]').forEach(function (bouton) {
      if (etat.vue !== 'parcours' && bouton.dataset.vueCible === etat.vue) {
        bouton.setAttribute('aria-current', 'page');
      } else {
        bouton.removeAttribute('aria-current');
      }
    });
    majPasser();
  }

  function titreBilan() {
    return etat.valides.some(Boolean) ? TITRE_BILAN : TITRE_BILAN_PASSE;
  }

  function majTitre() {
    $('[data-titre]').textContent = etat.vue === 'parcours' && etat.ecran === 'synthese'
      ? titreBilan()
      : TITRE_PAGE;
  }

  function element(balise, classe, texte) {
    var noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }

  /* Le bilan (B1, 20/10) : les changements essayés avec leur geste, ceux qu'il
     reste à essayer avec leurs caractères, puis « En plus ». */
  function dessinerBilan() {
    var statuts = [
      etat.valides[0],
      etat.valides[1],
      etat.valides[1],
      etat.faits.indexOf('code') !== -1,
      etat.faits.indexOf('langues') !== -1
    ];
    var faits = $('[data-bilan-faits]');
    var reste = $('[data-bilan-reste]');
    var plus = $('[data-bilan-plus]');
    [faits, reste, plus].forEach(function (liste) { liste.replaceChildren(); });

    CHANGEMENTS.forEach(function (changement, index) {
      var ligne = element('li');
      if (statuts[index]) {
        ligne.dataset.bilanFait = String(index);
        ligne.append(element('strong', '', changement.nom), element('span', '', changement.geste));
        faits.append(ligne);
      } else {
        ligne.dataset.bilanReste = String(index);
        ligne.append(element('strong', '', changement.caracteres), element('span', '', changement.nom));
        if (index === 0 && etat.connu) ligne.append(element('span', '', 'Déjà connu'));
        reste.append(ligne);
      }
    });

    ['documents', 'messages', 'afrique'].forEach(function (identifiant) {
      if (etat.faits.indexOf(identifiant) === -1) return;
      var ligne = element('li');
      ligne.dataset.bilanPlus = identifiant;
      ligne.append(element('strong', '', EN_PLUS[identifiant].nom), element('span', '', EN_PLUS[identifiant].geste));
      plus.append(ligne);
    });

    $('[data-bilan-faits-titre]').hidden = !faits.children.length;
    faits.hidden = !faits.children.length;
    $('[data-bilan-reste-titre]').hidden = !reste.children.length;
    reste.hidden = !reste.children.length;
    $('[data-bilan-plus-titre]').hidden = !plus.children.length;
    plus.hidden = !plus.children.length;

    /* Essayer aussi : l'étape adresse passée d'abord (état partiel), puis les
       usages cochés pas encore joués. « Ou encore : » seulement s'il y a un
       second lien. */
    var liste = $('[data-bonus-liste]');
    liste.replaceChildren();
    var offres = [];
    if (!etat.valides[1]) offres.push('adresses');
    ORDRE_USAGES.forEach(function (identifiant) {
      if (etat.usages.indexOf(identifiant) === -1 || etat.faits.indexOf(identifiant) !== -1
        || identifiant === usageChoisi()) return;
      offres.push(identifiant);
    });
    offres.forEach(function (identifiant, index) {
      if (index === 1) liste.append(element('span', 'tc__ou-encore', 'Ou encore :'));
      var bouton = element('button', 'tc__lien', LIBELLES_BONUS[identifiant]);
      bouton.type = 'button';
      bouton.dataset.action = 'bonus';
      bouton.dataset.bonus = identifiant;
      liste.append(bouton);
    });
    $('[data-bonus-bloc]').hidden = !offres.length;
  }

  /* Le dernier retour (« C’est écrit. Avec les mêmes touches… », décision du
     2026-10-03) : celui de la dernière cible réussie, en tête du bilan, sans clic
     ni délai. Rien quand le bilan vient d'un « Passer » ou d'une adresse directe :
     aucune cible n'a été réussie juste avant. */
  function montrerDernier() {
    var dernier = etat.dernier;
    $('[data-dernier]').hidden = !dernier;
    $('[data-dernier-titre]').textContent = dernier ? dernier.titre : '';
    $('[data-dernier-texte]').textContent = dernier ? dernier.texte : '';
  }

  /* L'écran du parcours : parcours (une cible à taper), usage (la question
     d'usage) ou synthese (le bilan). */
  function afficher(ecran, prendreLeFocus) {
    effacerIndice();
    clearTimeout(minuteurSuite);
    minuteurSuite = null;
    zone.removeAttribute('data-reussie');
    var entree = ecran === 'parcours' && etat.ecran !== 'parcours';
    etat.ecran = ecran;
    racine.dataset.ecran = ecran;
    majVisibilite();
    majTitre();

    if (ecran === 'parcours') {
      $('[data-etape-numero]').textContent = 'Étape ' + (etat.etape + 1) + ' sur ' + etapes.length;
      /* Les trois pas de la barre : faits, en cours, à venir (testeur.css). */
      racine.dataset.etape = String(etat.etape + 1);
      $('[data-etape-titre]').textContent = etapes[etat.etape].titre;
      $('[data-explication]').textContent = etapes[etat.etape].explications
        ? etapes[etat.etape].explications[etat.cible]
        : etapes[etat.etape].explication;
      dessinerLigne();
      indice(false);
      if (prendreLeFocus) zone.focus({ preventScroll: true });
      /* À l'entrée dans le parcours depuis le bilan, si la page a défilé, le
         testeur remonte en haut de l'écran (critique du 2026-10-03). À
         l'arrivée et depuis la question d'usage, il y est déjà : rien ne
         bouge. */
      if (prendreLeFocus && entree && racine.getBoundingClientRect().top < 0) {
        racine.scrollIntoView({ block: 'start' });
      }
    } else if (ecran === 'usage') {
      /* Le bravo de l'étape qui vient de finir n'a plus lieu d'être : sans cela,
         il se réaffichait, périmé, à l'arrivée de l'étape suivante (lot 1c). */
      effacerSuite();
      /* La question ouvre l'étape suivante : la barre garde ses trois pas et
         annonce cette étape, sans intitulé (il dépend de la réponse). */
      $('[data-etape-numero]').textContent = 'Étape ' + (etat.etape + 1) + ' sur ' + etapes.length;
      racine.dataset.etape = String(etat.etape + 1);
      $('[data-etape-titre]').textContent = '';
      annoncer('Qu’écrivez-vous au quotidien ? Plusieurs réponses possibles.');
    } else if (ecran === 'synthese') {
      dessinerBilan();
      montrerDernier();
      if (prendreLeFocus) {
        $('[data-titre]').tabIndex = -1;
        $('[data-titre]').focus({ preventScroll: true });
      }
    }

    accentuerExercice();
    if (ecran !== 'parcours') niveauActif(0);
  }

  function entrerVue(nom, precedent) {
    var definition = vues[nom];
    if (!definition || typeof definition.entrer !== 'function') return;
    definition.entrer({ montage: Testeur.montage(nom), moteur: moteur, vue: nom, precedent: precedent });
  }

  function changerVue(nom) {
    if (VUES.indexOf(nom) === -1) return false;
    if (nom === etat.vue) return nom;
    var precedent = etat.vue;

    if (precedent === 'parcours') {
      /* Une pause de réussite en cours est jouée : on revient à la cible
         suivante, prête. */
      if (minuteurSuite !== null) avancer();
      effacerIndice();
    } else if (vues[precedent] && typeof vues[precedent].sortir === 'function') {
      vues[precedent].sortir();
    }
    eteindre();
    niveauForce = null;

    etat.vue = nom;
    racine.dataset.vue = nom;
    majVisibilite();
    majTitre();

    if (nom === 'parcours') {
      /* Là où on l'a laissé : mêmes étape, cible et saisie, indice recalculé. */
      afficher(etat.ecran, true);
    } else {
      accentuerExercice();
      afficherNiveau(etat.niveau);
      if (moteur) entrerVue(nom, precedent);
    }
    abonnes.slice().forEach(function (rappel) { rappel(nom, precedent); });
    return nom;
  }

  /* Un seul décompte par parcours : le début est la première frappe comptée
     (ou le premier « Passer »), jamais le chargement de la page. */
  function commencerMesure() {
    if (etat.debut) return;
    etat.debut = true;
    mesurer('testeur_debut');
  }

  /* Plan de marquage du 2026-10-05 : début, étape terminée, fin. La fin est la
     synthèse atteinte au bout des exercices avec au moins une étape réussie ;
     « Passer » n'est pas une fin. */
  var NOMS_ETAPES = ['majuscules', 'adresse', 'usage'];
  function mesurer(nom, details) {
    if (window.AGMesure) window.AGMesure.evenement(nom, details);
  }

  function reinitialiserCible() {
    etat.cible = 0;
    etat.saisi = [];
    etat.erreurs = 0;
    etat.morte = null;
  }

  function suivant(passer) {
    if (passer) {
      effacerSuite();
      commencerMesure();
      cacherNote();
    }
    var termine = passer || etat.cible + 1 >= etapes[etat.etape].cibles.length;
    if (!termine) {
      etat.cible += 1;
      etat.saisi = [];
      etat.erreurs = 0;
      etat.morte = null;
    } else {
      if (!passer) {
        etat.valides[etat.etape] = true;
        if (etat.etape === 2 && etat.faits.indexOf(etat.usage) === -1) etat.faits.push(etat.usage);
        mesurer('testeur_etape', { etape: etat.etape === 2 ? etat.usage : NOMS_ETAPES[etat.etape] });
      }
      etat.etape += 1;
      reinitialiserCible();
    }

    if (termine && (etat.bonus || etat.etape >= etapes.length)) {
      etat.bonus = false;
      etat.etape = 2;
      afficher('synthese', true);
      if (etat.valides.some(Boolean) && !etat.fin) {
        etat.fin = true;
        mesurer('testeur_fin');
      }
    } else if (termine && etat.etape === 2 && !etat.usageDemande) {
      afficher('usage', false);
    } else {
      afficher('parcours', true);
    }
  }

  /* La question d'usage : « Continuer », ou une frappe, qui compte. Sans
     réponse cochée, l'usage par défaut (Documents). */
  function continuerUsage() {
    etat.usages = $$('[data-usage][aria-pressed="true"]').map(function (bouton) {
      return bouton.dataset.usage;
    });
    /* Un seul usage dans le parcours : le plus particulier des cochés. */
    poserUsage(usageChoisi());
    etat.usageDemande = true;
    etat.etape = 2;
    reinitialiserCible();
    afficher('parcours', true);
  }

  /* « Recommencer avec un autre usage » : le parcours reprend à la première
     étape, la question d'usage sera reposée avant la troisième. */
  function recommencer() {
    etat.connu = false;
    etat.methode = null;
    etat.faits = [];
    etat.fin = false;
    etat.bonus = false;
    etat.usageDemande = false;
    etat.valides = [false, false, false];
    etat.etape = 0;
    reinitialiserCible();
    effacerSuite();
    poserUsage('documents');
    afficher('parcours', true);
    etat.debut = false;
    commencerMesure();
  }

  racine.addEventListener('click', async function (evenement) {
    var usage = evenement.target.closest('[data-usage]');
    if (usage) {
      usage.setAttribute('aria-pressed', usage.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      return;
    }

    var reponse = evenement.target.closest('[data-reponse]');
    if (reponse) {
      repondreMethode(reponse.dataset.reponse);
      return;
    }

    if (evenement.target.closest('[data-action="passer-question"]')) {
      passerQuestion();
      return;
    }

    var action = evenement.target.closest('[data-action]');
    action = action && action.dataset.action;
    if (!action) return;

    if (action === 'vue') changerVue(evenement.target.closest('[data-vue-cible]').dataset.vueCible);
    if (action === 'usage-suite') continuerUsage();
    if (action === 'passer' || action === 'passer-exercice') suivant(true);
    if (action === 'bonus') {
      var bonus = evenement.target.closest('[data-bonus]').dataset.bonus;
      if (bonus === 'adresses') {
        etat.etape = 1;
      } else {
        poserUsage(bonus);
        etat.etape = 2;
      }
      etat.bonus = true;
      reinitialiserCible();
      effacerSuite();
      afficher('parcours', true);
      commencerMesure();
    }
    if (action === 'refaire') recommencer();
    if (action === 'partager') await partager(evenement.target);
  });

  /* Partage : `navigator.share` quand il existe, sinon copie du lien. Le texte
     est celui d'Antoine (M3, 20/10) et parle à sa place, jamais à la nôtre. */
  async function partager(bouton) {
    var url = 'https://azerty.global/testeur';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'AZERTY Global',
          text: 'J’ai essayé AZERTY Global, un AZERTY amélioré, gratuit et libre : É, È, À, Ç en majuscules et @ en accès direct. Enfin.',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        annoncer('Lien copié.');
        bouton.textContent = 'Lien copié';
      }
    } catch (erreur) {
      if (erreur.name !== 'AbortError') {
        annoncer('Partage indisponible. Le lien est azerty.global/testeur.');
      }
    }
  }

  /* Le niveau d'une frappe : la page lit l'événement, le moteur compte (AltGr
     arrive comme Ctrl+Alt sous Windows, comme Option sous macOS). Les deux
     fonctions sont celles de l'API statique, pas de l'instance : une touche
     relâchée pendant le chargement des JSON passe ici avant `moteur`. */
  function niveauDe(evenement) {
    return TesteurMoteur.niveau({
      altgr: evenement.getModifierState('AltGraph'),
      verrmaj: evenement.getModifierState('CapsLock'),
      maj: evenement.shiftKey,
      alt: evenement.altKey,
      ctrl: evenement.ctrlKey
    }, mac);
  }

  function recoder(code) {
    return TesteurMoteur.recoder(code, mac);
  }

  /* Une frappe qui compterait dans le parcours : une touche qui produit un
     caractère, ni répétition, ni raccourci. Sert à la question d'usage, où
     une frappe vaut « Continuer ». */
  function frappeComptable(evenement) {
    if (evenement.repeat || evenement.key === 'Backspace') return false;
    if (evenement.ctrlKey && !evenement.altKey) return false;
    if (evenement.isComposing || !evenement.code) return false;
    return moteur.codeConnu(recoder(evenement.code));
  }

  /* Les frappes des autres vues (libre, recherche) : le composant lit le
     niveau, allume la touche enfoncée, et passe la frappe à la vue active. */
  function frapperVue(evenement) {
    var niveau = niveauDe(evenement);
    niveauActif(niveau);
    var definition = vues[etat.vue];
    var code = recoder(evenement.code || '');
    var connu = Boolean(evenement.code) && moteur.codeConnu(code);
    var position = connu ? positionParCode[code] : null;
    if (position && evenement.type === 'keydown' && !(definition && definition.appuyees === false)) {
      var touche = $('[data-position="' + position + '"]');
      if (touche) touche.dataset.appuyee = '';
    }
    if (!definition || typeof definition.frappe !== 'function') return;
    var caractere = connu ? moteur.caractere(code, niveau) || null : null;
    definition.frappe({
      type: evenement.type,
      evenement: evenement,
      code: code,
      position: position,
      niveau: niveau,
      caractere: caractere,
      morte: Boolean(caractere) && moteur.estMorte(caractere)
    });
  }

  function frapper(evenement) {
    if (evenement.key === 'Tab' || evenement.metaKey || !moteur) return;
    /* Les autres vues reçoivent leurs frappes du gestionnaire du document. */
    if (etat.vue !== 'parcours') return;

    /* Question d'usage : une frappe vaut « Continuer » avec les usages cochés,
       et compte pour la première cible de l'étape. */
    if (etat.ecran === 'usage') {
      if (!frappeComptable(evenement)) return;
      continuerUsage();
    }

    /* La question sur la méthode attend sa réponse : Entrée ou Échap la
       passent, aucune autre frappe ne compte (elle viserait une cible qui
       n'est pas encore affichée). */
    if (etat.question) {
      if (evenement.key === 'Enter' || evenement.key === 'Escape') {
        evenement.preventDefault();
        passerQuestion();
      }
      return;
    }

    /* Cible réussie, la suivante pas encore affichée : Entrée ou toute autre
       frappe l'appelle, et cette frappe compte déjà pour elle. Une répétition
       ou un retour arrière n'efface pas une réussite. */
    if (minuteurSuite !== null) {
      /* Espace pour « continuer » vaut Entrée : aucune cible ne commence
         par une espace, elle aurait compté comme faute. */
      var passe = evenement.key === 'Enter' || evenement.code === 'Space';
      if (evenement.repeat || evenement.key === 'Backspace' || passe) evenement.preventDefault();
      if (evenement.repeat || evenement.key === 'Backspace') return;
      avancer();
      if (passe) return;
      if (etat.ecran === 'usage') {
        if (!frappeComptable(evenement)) return;
        continuerUsage();
      } else if (etat.ecran !== 'parcours') {
        return;
      }
    }

    var niveau = niveauDe(evenement);
    niveauActif(niveau);

    if (evenement.key === 'Backspace') {
      evenement.preventDefault();
      var efface = etat.saisi.pop();
      etat.morte = null;
      dessinerLigne();
      /* ⛔ Sans cette annonce, la région live gardait le texte de l'erreur
         précédente : au retour arrière, un lecteur d'écran n'avait aucun
         retour et l'utilisateur entendait encore « z au lieu de É » après
         avoir corrigé. Mesuré à l'arbre d'accessibilité le 2026-09-22
         (WCAG 2.2, SC 4.1.3 Messages d'état). */
      var attendu = Array.from(cibleCourante())[etat.saisi.length];
      /* Une faute n'est plus écrite : le retour arrière n'efface qu'une frappe
         juste, l'indice reprend son cours normal. */
      indice(false);
      annoncer(efface
        ? moteur.nommerCaractere(efface) + ' effacé. À écrire : ' + moteur.nommerCaractere(attendu) + '.'
        : 'Rien à effacer.');
      return;
    }
    if (evenement.ctrlKey && !evenement.altKey) return;

    /* Clavier virtuel ou méthode de saisie : `code` est vide ou trompeur, la
       frappe ne se lit pas. Le testeur le dit au lieu de rester muet. */
    if (evenement.isComposing || evenement.key === 'Process'
        || evenement.key === 'Unidentified' || !evenement.code) {
      if (evenement.repeat) return;
      alerter('Le testeur ne lit pas cette frappe (clavier à l’écran, saisie vocale ou accents assistés). Tapez sur les touches de votre clavier.', true);
      annoncer($('[data-alerte]').textContent);
      return;
    }

    var code = recoder(evenement.code);
    if (!moteur.codeConnu(code)) {
      /* Les touches de commande et de navigation ne sont pas des frappes
         ratées : silence. Le reste, le testeur le dit au lieu de se taire. */
      if (evenement.repeat || moteur.toucheSilencieuse(evenement.key)) return;
      alerter('Le testeur ne traite pas cette touche.', true);
      annoncer($('[data-alerte]').textContent);
      return;
    }

    evenement.preventDefault();
    if (evenement.repeat) return;

    var touche = $('[data-position="' + positionParCode[code] + '"]');
    if (touche) touche.dataset.appuyee = '';
    commencerMesure();
    cacherNote();

    var valeur = moteur.caractere(code, niveau);
    if (!valeur) {
      alerter(moteur.texteAbsent(code, niveau), true);
      annoncer($('[data-alerte]').textContent);
      return;
    }

    /* Le « bravo » de la cible réussie reste jusqu'ici : la première vraie
       frappe de la cible suivante le retire, avec la question sur la méthode
       (retour d'Antoine du 2026-11-10). */
    effacerSuite();

    if (moteur.estMorte(valeur)) {
      etat.morte = valeur;
      /* `valeur` est un identifiant (dk_circumflex) : on ne le montre pas. Les
         touches mortes ne font pas que des accents (grec, devises, ponctuation) :
         le texte tient pour toutes. */
      /* Une touche morte attendue (geste de l'étape) : pas d'alerte, la
         consigne passe à la lettre à combiner. Sinon, elle est accidentelle
         (AltGr + 3, par exemple) : on le dit et on propose la sortie. */
      indice(true);
      if (indiceSequence && indiceSequence.suite === null) {
        annoncer($('[data-indice]').textContent);
        return;
      }
      alerter('Touche morte : tapez le caractère à combiner. Si ce n’était pas voulu, tapez Espace.', true);
      annoncer($('[data-alerte]').textContent + ' ' + $('[data-indice]').textContent);
      return;
    }
    if (etat.morte) {
      valeur = moteur.composer(etat.morte, valeur);
      etat.morte = null;
    }

    /* Une faute n'est pas écrite (décision du 2026-09-29, retour d'Antoine du
       2026-11-10) : la ligne ne bouge pas, la bonne touche reste allumée, la
       frappe juste suivante continue. Avant, le faux caractère restait dans
       la ligne et bloquait la suite jusqu'au retour arrière. Une faute compte
       pour proposer « Passer cet exercice ». */
    var cibles = Array.from(cibleCourante());
    if (etat.saisi.length >= cibles.length) return;

    var attendu = cibles[etat.saisi.length];
    if (!moteur.equivalent(attendu, valeur, Boolean(etapes[etat.etape].strict))) {
      etat.erreurs += 1;
      dessinerLigne();
      signalerFaute(valeur, attendu);
      return;
    }
    /* Une frappe tolérée écrit le caractère du modèle : sinon la ligne ne
       serait jamais égale à la cible et l'étape ne finirait pas. */
    etat.saisi.push(attendu);
    etat.erreurs = 0;

    annoncer(moteur.lireCaractere(attendu) + ' écrit.');
    if (dessinerLigne()) reussir(); else indice(false);
  }

  /* La faute, à l'écran comme au lecteur d'écran : le caractère tapé, celui
     attendu, puis la consigne qui reste. */
  function signalerFaute(tape, attendu) {
    var texte = moteur.nommerCaractere(tape) + ' au lieu de ' + moteur.nommerCaractere(attendu) + '.';
    /* indice() commence par tout effacer, l'alerte comprise : elle vient après. */
    indice(true);
    alerter(texte);
    annoncer(texte + ' ' + $('[data-indice]').textContent);
  }

  zone.addEventListener('keydown', frapper);

  /* Une frappe ailleurs que dans la zone n'est plus perdue : dès l'arrivée, sans
     clic, elle est prise. Dans le parcours elle ramène le focus à la zone et
     compte (retour d'Antoine du 2026-10-03) ; dans une autre vue elle va à la
     vue. Les liens, boutons et champs gardent leurs touches ; la zone hors de
     l'écran, Espace fait défiler la page comme partout (lecture de la FAQ). */
  document.addEventListener('keydown', function (evenement) {
    if (!moteur) return;
    var cible = evenement.target;
    if (cible !== document.body && !racine.contains(cible)) return;
    if (cible.closest && cible.closest('a, button, select, summary')) return;
    if (evenement.key === 'Tab' || evenement.metaKey) return;

    if (etat.vue !== 'parcours') {
      frapperVue(evenement);
      return;
    }
    if (evenement.defaultPrevented || etat.ecran === 'synthese') return;
    /* Pendant la question, la zone de frappe est masquée : elle ne peut pas
       recevoir le focus, et la frappe arrive sur la page. Entrée et Échap
       passent la question d'ici aussi ; frapper() ignore le reste. */
    if (etat.question) {
      frapper(evenement);
      return;
    }
    if (etat.ecran === 'usage') {
      frapper(evenement);
      return;
    }
    if (cible === zone || zone.contains(cible)) return;
    if (cible.closest && cible.closest('input, textarea, [contenteditable="true"]')) return;
    if (evenement.ctrlKey && !evenement.altKey) return;
    var cadre = zone.getBoundingClientRect();
    if (cadre.bottom <= 0 || cadre.top >= window.innerHeight) return;
    zone.focus({ preventScroll: true });
    frapper(evenement);
  });

  /* Un clic sur le clavier dessiné ou dans le cadre de l'exercice laisse le
     focus à la zone de frappe : les touches dessinées ne sont pas cliquables. */
  racine.addEventListener('mousedown', function (evenement) {
    if (etat.vue !== 'parcours' || etat.ecran !== 'parcours' || evenement.button !== 0) return;
    if (evenement.target.closest('a, button, input, select, textarea, summary, .tc__retours')) return;
    if (!evenement.target.closest('.tc__instrument, .tc__exercice')) return;
    evenement.preventDefault();
    zone.focus({ preventScroll: true });
  });

  /* Le cadre du clavier ne défile que sous 640 px, où le testeur ne s'affiche
     pas. Son arrêt de tabulation, posé au build, ne servait ici qu'à prendre
     le focus au clic : la frappe suivante l'entourait de l'anneau bleu et ne
     s'écrivait plus (retour d'Antoine du 2026-10-03). */
  var cadreClavier = $('.clavier-defilement');
  if (cadreClavier) {
    ['tabindex', 'role', 'aria-label'].forEach(function (nom) { cadreClavier.removeAttribute(nom); });
  }

  /* Le relâchement d'une touche : la touche s'éteint, le niveau suit, et la
     vue active le sait. */
  document.addEventListener('keyup', function (evenement) {
    if (!moteur) return;
    var cible = evenement.target;
    if (cible !== document.body && !racine.contains(cible)) return;
    var touche = $('[data-position="' + positionParCode[recoder(evenement.code)] + '"]');
    if (touche) touche.removeAttribute('data-appuyee');
    if (etat.vue !== 'parcours') frapperVue(evenement);
    else niveauActif(niveauDe(evenement));
  });

  /* Perdre le focus ne désactive pas le verrouillage de l'utilisateur : on dit
     que la frappe est inactive, pas que Verr. Maj. l'est. */
  zone.addEventListener('blur', function () {
    $$('[data-appuyee]').forEach(function (touche) { touche.removeAttribute('data-appuyee'); });
    niveauActif(etat.niveau & 2);
    $('[data-mode]').textContent = 'Frappe inactive';
  });
  window.addEventListener('blur', function () {
    $$('[data-appuyee]').forEach(function (touche) { touche.removeAttribute('data-appuyee'); });
  });

  /* P14d : arrivée depuis une page caractère, par `?de=<slug>`. L'hôte porte
     la carte `slug:module:leçon` rendue depuis `landings.js` — une seule
     source, jamais recopiée ici. Le parcours n'ayant que trois exercices, on
     retient celui qui couvre le module du caractère ; un module sans exercice
     correspondant ouvre le parcours au début plutôt que de mentir. */
  /* Module 1 (majuscules) → étape 1, module 0 (point et arobase) → étape 2,
     module 3 (typographie) → l'étape d'usage, sur Documents (`?de=guillemets`). */
  var MODULE_VERS_ETAPE = { 1: 0, 0: 1, 3: 2 };

  function etapeDOrigine() {
    var slug = parametres.get('de');
    if (!slug) return null;
    var carte = (racine.dataset.testeurLecons || '').trim().split(/\s+/);
    for (var i = 0; i < carte.length; i += 1) {
      var parts = carte[i].split(':');
      if (parts[0] !== slug) continue;
      var etape = MODULE_VERS_ETAPE[Number(parts[1])];
      return etape === undefined ? null : etape;
    }
    return null;
  }

  try {
    var reponses = await Promise.all(
      ['/tester/azerty-global.json', '/data/AZERTY Global.json', '/data/AZERTY Traditionnel.json']
        .map(async function (url) {
          var reponse = await fetch(url);
          if (!reponse.ok) throw new Error(url);
          return reponse.json();
        })
    );
    /* Le moteur apparie `event.code` et position du dessin (par la signature
       des quatre niveaux directs) et construit ses index à la création. */
    moteur = TesteurMoteur.creer({
      table: reponses[0],
      canonique: reponses[1],
      traditionnel: reponses[2],
      mac: mac
    });
    parPosition = moteur.parPosition;
    positionParCode = moteur.positionParCode;
    Testeur.moteur = moteur;

    poserLegendes();
    niveauActif(0);

    /* Arrivée : le parcours, prêt à taper, sans clic. Les adresses publiées
       (`?de=`, `?ecran=`, `?etape=`) restent, `?vue=` ouvre un outil. */
    var depuisCaractere = etapeDOrigine();
    var ecranDemande = parametres.get('ecran');

    if (ecranDemande === 'parcours') {
      etat.etape = Math.max(0, Math.min(2, Number(parametres.get('etape') || 1) - 1));
      etat.cible = etat.etape === 0 ? 1 : 0;
      afficher('parcours', false);
    } else if (ecranDemande === 'synthese') {
      etat.valides = [true, true, true];
      etat.faits = ['documents'];
      afficher('synthese', false);
    } else if (depuisCaractere !== null) {
      etat.etape = depuisCaractere;
      poserUsage('documents');
      afficher('parcours', true);
      /* Venu d'une page caractère : le parcours commence là, sans question. */
      commencerMesure();
    } else {
      afficher('parcours', false);
    }

    var vueDemandee = parametres.get('vue');
    if (vueDemandee === 'libre' || vueDemandee === 'recherche') changerVue(vueDemandee);

    racine.dataset.ready = 'true';
    resoudrePret(moteur);
  } catch (erreur) {
    var message = $('[data-sous-titre]');
    message.textContent = 'Le clavier n’a pas pu être chargé. Rechargez la page pour réessayer.';
    message.hidden = false;
    annoncer('Chargement du clavier impossible.');
    console.error(erreur);
  }
})();
