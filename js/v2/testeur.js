/* Testeur v2 — parcours de trois exercices sur la page /testeur.

   Portage de la maquette retenue par Antoine le 2026-09-21 (variante C). La
   composition, les textes et les états viennent de cette maquette ; ce fichier
   n'en change que ce qu'exige la mise en production (notice tactile, arrivée
   depuis une page caractère, suivi de conversion du site).

   Ce que le testeur ne fait plus, par rapport à la chaîne `init-tester.js`
   qu'il remplace ici : ni mode libre, ni recherche de caractères, ni reprise
   du parcours d'une visite à l'autre. Rien n'est écrit sur l'appareil, rien
   n'est envoyé. La chaîne `/js/tester-*.js` reste en place : la modale de la
   home v1 l'utilise toujours par `lazy-tester.js`.

   Les positions de touches et les caractères ne sont jamais écrits ici : ils
   sortent de `/tester/azerty-global.json` (table de frappe, huit niveaux),
   de `/data/AZERTY Global.json` (dessin canonique) et de
   `/data/AZERTY Traditionnel.json` (nom gravé sur la touche physique).

   CSP : `script-src 'self'`. Fichier externe, aucun `style=`, aucun `<style>`. */

(async function () {
  'use strict';

  var racine = document.querySelector('#testeur');
  if (!racine) return;

  /* Le plateau est masque tant que ce drapeau n'est pas la : sans JavaScript,
     la page montre la sortie `<noscript>` au lieu d'un composant inerte. */
  racine.dataset.js = 'true';

  var $ = function (selecteur) { return racine.querySelector(selecteur); };
  var $$ = function (selecteur) { return Array.from(racine.querySelectorAll(selecteur)); };

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

  var etat = {
    ecran: 'intro',
    etape: 0,
    cible: 0,
    saisi: [],
    erreurs: 0,
    valides: [false, false, false],
    connu: false,
    reussite: false,
    usages: [],
    morte: null,
    niveau: 0
  };

  var table;          /* /tester/azerty-global.json */
  var canonique;      /* /data/AZERTY Global.json */
  var traditionnel;   /* /data/AZERTY Traditionnel.json */
  var parPosition = {};
  var positionTraditionnelle = {};
  var positionParCode = {};
  var minuteur;
  var indiceTouche = null;
  var indiceCaractere = null;

  /* Profil général : on n'affiche en AltGr que les caractères utiles au
     français courant. `?profil=complet` lève le filtre et montre la carte
     entière des légendes directes. */
  var supplementsVisibles = new Set(Array.from('«»œæ—–…’€@#{}\\|[]°'));

  var etapes = [
    {
      titre: 'Les majuscules accentuées.',
      sous: 'É, È, À et Ç avec Verr. Maj., sur les touches que vous connaissez.',
      cibles: ['É', 'ÇA GÈLE DÉJÀ !'],
      caracteres: 'ÉÈÀÇ',
      explication: 'Sur l’AZERTY classique, Verr. Maj. puis é donne un 2. Ici, vous obtenez É.'
    },
    {
      titre: 'La typographie française.',
      sous: 'Les guillemets et les ligatures se tapent directement avec AltGr.',
      cibles: ['« Un chef-d\'œuvre » — Lætitia'],
      caracteres: '«»—œæ',
      explication: 'Maintenez AltGr pour écrire le caractère à droite de la touche.'
    },
    {
      titre: 'Une adresse, sans détour.',
      sous: 'L’arobase en haut à gauche, le point sans Majuscule.',
      cibles: ['jean.dupont@email.fr #contact'],
      caracteres: '@#.',
      explication: 'L’arobase est sur l’ancienne touche ². Son ancien accès avec AltGr fonctionne aussi.'
    }
  ];

  /* Les huit niveaux de la table de frappe, dans l'ordre de
     `tester/keyboard.js` : le rang vaut AltGr×4 + Verr. Maj.×2 + Maj×1. */
  var couche = ['base', 'maj', 'verrmaj', 'verrmaj', 'altgr', 'majaltgr', 'altgr', 'majaltgr'];
  var modificateurs = [
    [], ['Maj'], ['Verr. Maj.'], ['Verr. Maj.', 'Maj'],
    ['AltGr'], ['AltGr', 'Maj'], ['Verr. Maj.', 'AltGr'], ['Verr. Maj.', 'AltGr', 'Maj']
  ];
  var noms = { maj: 'Maj', verrmaj: 'Verr. Maj.', altgr: 'AltGr' };

  /* Le nom prononçable d'une touche est celui gravé sur le clavier physique
     de l'utilisateur, donc celui de l'AZERTY traditionnel — jamais celui
     d'AZERTY Global, qu'il n'a pas encore installé. */
  function nomTouche(position) {
    var touche = positionTraditionnelle[position];
    var valeur = touche && touche.base;
    if (valeur === ' ') return 'Espace';
    if (valeur && valeur.indexOf('dk_') === 0) return '^';
    if (touche && valeur && touche.shift === valeur.toLocaleUpperCase('fr')) return touche.shift;
    return valeur || position;
  }

  function cibleCourante() {
    return etapes[etat.etape].cibles[etat.cible];
  }

  function annoncer(texte) {
    $('[data-annonce]').textContent = texte;
  }

  function effacerIndice() {
    clearTimeout(minuteur);
    indiceTouche = null;
    indiceCaractere = null;
    $$('[data-attendue],[data-mod-attendu]').forEach(function (element) {
      element.removeAttribute('data-attendue');
      element.removeAttribute('data-mod-attendu');
    });
  }

  /* Parmi toutes les façons de produire un caractère, la plus simple gagne :
     le moins de modificateurs, puis le niveau le plus bas. */
  function chercherCaractere(caractere) {
    var trouves = [];
    Object.keys(table.keymap).forEach(function (code) {
      if (!positionParCode[code]) return;
      table.keymap[code].forEach(function (valeur, rang) {
        if (valeur === caractere) {
          trouves.push({ code: code, position: positionParCode[code], rang: rang });
        }
      });
    });
    return trouves.sort(function (a, b) {
      return modificateurs[a.rang].length - modificateurs[b.rang].length || a.rang - b.rang;
    })[0];
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

  /* Le niveau courant ne déplace aucune légende : il change la couleur et la
     graisse de celle qui est active. Décision 2A du 2026-09-21. */
  function niveauActif(rang) {
    etat.niveau = rang;

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

    Object.keys(noms).forEach(function (identifiant) {
      if (modificateurs[rang].indexOf(noms[identifiant]) === -1) return;
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
  function consigne() {
    if (!indiceTouche) return;
    var touche = indiceTouche;
    var caractere = indiceCaractere;
    var nom = nomTouche(touche.position);
    var texte = modificateurs[touche.rang].concat([nom]).join(' + ');

    if (touche.rang & 2) {
      $('[data-indice]').textContent =
        (etat.niveau & 2 ? 'Verr. Maj. est actif : appuyez sur ' : 'Activez Verr. Maj., puis appuyez sur ')
        + nom + '.';
    } else if ((etat.niveau & 2) && touche.rang < 2) {
      var equivalent = table.keymap[touche.code][touche.rang + 2] === caractere;
      $('[data-indice]').textContent = equivalent
        ? 'Appuyez sur ' + nom + ' pour ' + caractere
        : 'Désactivez Verr. Maj., puis ' + texte;
    } else {
      $('[data-indice]').textContent = 'Appuyez sur ' + texte + '.';
    }
  }

  /* Décision 3A : seules les nouveautés de l'exercice en cours sont mises en
     évidence sur le clavier. */
  function accentuerExercice() {
    $$('[data-exercice]').forEach(function (glyphe) { glyphe.removeAttribute('data-exercice'); });
    if (etat.ecran !== 'parcours') return;
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
    if (etat.ecran !== 'parcours') return;

    var caractere = Array.from(cibleCourante())[etat.saisi.length];
    if (!caractere) return;
    var touche = chercherCaractere(caractere);
    if (!touche) return;

    var montrer = function () {
      var element = $('[data-position="' + touche.position + '"]');
      if (element) element.dataset.attendue = '';
      Object.keys(noms).forEach(function (identifiant) {
        if (modificateurs[touche.rang].indexOf(noms[identifiant]) === -1) return;
        $$('[data-mod="' + identifiant + '"], [data-mod^="' + identifiant + '-"]').forEach(function (mod) {
          mod.dataset.modAttendu = '';
        });
      });
      indiceTouche = touche;
      indiceCaractere = caractere;
      consigne();
      if (etapes[etat.etape].caracteres.indexOf(caractere) === -1) {
        minuteur = setTimeout(function () {
          effacerIndice();
          $('[data-indice]').textContent = 'Continuez à votre rythme.';
        }, 3500);
      }
    };

    if (forcer || etapes[etat.etape].caracteres.indexOf(caractere) !== -1) {
      montrer();
    } else {
      $('[data-indice]').textContent = 'Continuez à votre rythme.';
      minuteur = setTimeout(montrer, 3000);
    }
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

    $('#tc-frappe').setAttribute('aria-label',
      'À écrire : ' + cibleCourante() + '. Saisi : ' + (etat.saisi.join('') || 'rien'));

    var fini = etat.saisi.join('') === cibleCourante();
    $('[data-action="suivant"]').hidden = !fini;
    $('[data-action="passer-exercice"]').hidden = etat.erreurs < 2;
    $('[data-reussite]').textContent = '';
    $('[data-installer]').hidden = !etat.reussite;

    if (fini) {
      effacerIndice();
      $('[data-indice]').textContent = 'C’est écrit. Continuez quand vous voulez.';
      annoncer('Exercice réussi. Bouton Continuer pour la suite.');
    }
    return fini;
  }

  function vue(ecran, prendreLeFocus) {
    effacerIndice();
    etat.ecran = ecran;
    racine.dataset.ecran = ecran;
    $$('[data-vue]').forEach(function (section) { section.hidden = section.dataset.vue !== ecran; });

    $$('[data-jalon]').forEach(function (jalon) {
      jalon.removeAttribute('aria-current');
      if (ecran === 'parcours' && Number(jalon.dataset.jalon) === etat.etape) {
        jalon.setAttribute('aria-current', 'step');
      }
    });

    $('[data-installer]').hidden = ecran !== 'parcours' || !etat.reussite;

    if (ecran === 'parcours') {
      $('[data-titre]').textContent = etapes[etat.etape].titre;
      $('[data-sous-titre]').textContent = etapes[etat.etape].sous;
      $('[data-explication]').textContent = etapes[etat.etape].explication;
      dessinerLigne();
      indice(false);
      if (prendreLeFocus) $('#tc-frappe').focus({ preventScroll: true });
    } else if (ecran === 'synthese') {
      var tout = etat.valides.every(Boolean);
      var certains = etat.valides.some(Boolean);
      $('[data-titre]').textContent = tout
        ? 'Votre clavier peut maintenant faire plus avec AZERTY Global.'
        : certains ? 'Votre clavier peut maintenant faire plus.'
          : 'Voici ce que change AZERTY Global.';
      $('[data-sous-titre]').textContent = tout
        ? 'Les lettres restent à leur place. Les caractères utiles deviennent directs.'
        : 'Retrouvez les changements essayés et ceux qu’il reste à découvrir.';
      $$('[data-bilan]').forEach(function (element) {
        var rang = Number(element.dataset.bilan);
        var valide = etat.valides[rang];
        element.textContent = valide ? 'Essayé'
          : rang === 0 && etat.connu ? 'Déjà connu' : 'Pas encore essayé';
        element.toggleAttribute('data-valide', valide);
      });
      if (prendreLeFocus) {
        $('[data-titre]').tabIndex = -1;
        $('[data-titre]').focus({ preventScroll: true });
      }
    } else {
      $('[data-titre]').textContent = 'Essayez AZERTY Global.';
      $('[data-sous-titre]').textContent =
        'AZERTY Global améliore le clavier AZERTY : les lettres restent à leur place, les accents et les symboles deviennent plus faciles à taper.';
    }

    accentuerExercice();
    if (ecran !== 'parcours') niveauActif(0);
  }

  function demarrer() {
    etat.usages = $$('[data-usage][aria-pressed="true"]').map(function (bouton) {
      return bouton.dataset.usage;
    });
    /* Qui tape déjà Verr. Maj. + é connaît le geste : on lui épargne
       l'exercice 1 et on commence par la typographie. */
    etat.etape = etat.connu ? 1 : 0;
    etat.cible = 0;
    etat.saisi = [];
    etat.erreurs = 0;
    vue('parcours', true);
  }

  function suivant(passer) {
    if (!passer && etat.cible + 1 < etapes[etat.etape].cibles.length) {
      etat.cible += 1;
    } else {
      if (!passer) etat.valides[etat.etape] = true;
      etat.etape += 1;
      etat.cible = 0;
    }
    etat.saisi = [];
    etat.erreurs = 0;
    etat.morte = null;

    if (etat.etape >= etapes.length) {
      etat.etape = 2;
      vue('synthese', true);
    } else {
      vue('parcours', true);
    }
  }

  var repliques = {
    copier: 'Ici, É se tape avec Verr. Maj. puis é.',
    alt: 'Ici, deux touches suffisent : Verr. Maj. puis é.',
    correcteur: 'Vous pourrez écrire É directement, avant toute correction.',
    table: 'Vous pourrez écrire É sans ouvrir une autre fenêtre.',
    logiciel: 'Essayez le même caractère avec AZERTY Global.',
    verrmaj: 'Vous connaissez déjà ce geste. Nous commencerons par la typographie.'
  };

  racine.addEventListener('click', async function (evenement) {
    var usage = evenement.target.closest('[data-usage]');
    if (usage) {
      usage.setAttribute('aria-pressed', usage.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      return;
    }

    var reponse = evenement.target.closest('[data-reponse]');
    if (reponse) {
      etat.connu = reponse.dataset.reponse === 'verrmaj';
      $('[data-replique]').textContent = repliques[reponse.dataset.reponse];
      $('[data-question="1"]').hidden = true;
      $('[data-question="3"]').hidden = false;
      $('[data-action="commencer"]').focus({ preventScroll: true });
      return;
    }

    var action = evenement.target.closest('[data-action]');
    action = action && action.dataset.action;
    if (!action) return;

    if (action === 'questions-suite') {
      $('[data-question="2"]').hidden = true;
      $('[data-question="1"]').hidden = false;
      $('[data-reponse]').focus({ preventScroll: true });
    }
    if (action === 'commencer' || action === 'passer-intro') demarrer();
    if (action === 'suivant') suivant(false);
    if (action === 'passer-exercice') suivant(true);
    if (action === 'passer-parcours') vue('synthese', true);
    if (action === 'refaire') {
      etat.connu = false;
      etat.valides = [false, false, false];
      etat.reussite = false;
      demarrer();
    }
    if (action === 'partager') await partager(evenement.target);
  });

  /* Partage : `navigator.share` quand il existe, sinon copie du lien. Le texte
     est celui d'Antoine et parle à sa place, jamais à la nôtre. */
  async function partager(bouton) {
    var url = 'https://azerty.global/testeur';
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'AZERTY Global',
          text: 'J’ai essayé le clavier français réparé : É, È, À, Ç en majuscules, enfin.',
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

  var mac = /Mac/.test(navigator.platform);

  /* Sous Windows, AltGr arrive comme Ctrl+Alt ; sous macOS, c'est Option. */
  function niveauDe(evenement) {
    var altgr = evenement.getModifierState('AltGraph')
      || (mac ? evenement.altKey : (evenement.ctrlKey && evenement.altKey));
    return (altgr ? 4 : 0)
      + (evenement.getModifierState('CapsLock') ? 2 : 0)
      + (evenement.shiftKey ? 1 : 0);
  }

  /* Un clavier Mac ISO intervertit Backquote et IntlBackslash par rapport au
     `event.code` que la table attend. */
  function recoder(code) {
    if (!mac) return code;
    return { Backquote: 'IntlBackslash', IntlBackslash: 'Backquote', AltLeft: 'AltRight' }[code] || code;
  }

  var zone = $('#tc-frappe');

  zone.addEventListener('keydown', function (evenement) {
    if (etat.ecran !== 'parcours' || evenement.key === 'Tab' || evenement.metaKey) return;
    var niveau = niveauDe(evenement);
    niveauActif(niveau);

    if (evenement.key === 'Backspace') {
      evenement.preventDefault();
      var efface = etat.saisi.pop();
      etat.morte = null;
      dessinerLigne();
      indice(false);
      /* ⛔ Sans cette annonce, la région live gardait le texte de l'erreur
         précédente : au retour arrière, un lecteur d'écran n'avait aucun
         retour et l'utilisateur entendait encore « z au lieu de É » après
         avoir corrigé. Mesuré à l'arbre d'accessibilité le 2026-09-22
         (WCAG 2.2, SC 4.1.3 Messages d'état). */
      var attendu = Array.from(cibleCourante())[etat.saisi.length];
      annoncer(efface
        ? efface + ' effacé. À écrire : ' + attendu + '.'
        : 'Rien à effacer.');
      return;
    }
    if (evenement.key === 'Enter' && etat.saisi.join('') === cibleCourante()) {
      evenement.preventDefault();
      suivant(false);
      return;
    }
    if (evenement.ctrlKey && !evenement.altKey) return;

    var code = recoder(evenement.code);
    var valeurs = table.keymap[code];
    if (!valeurs) return;

    evenement.preventDefault();
    if (evenement.repeat) return;

    var touche = $('[data-position="' + positionParCode[code] + '"]');
    if (touche) touche.dataset.appuyee = '';

    var valeur = valeurs[niveau];
    if (!valeur) return;

    if (table.deadkeys[valeur]) {
      etat.morte = valeur;
      return;
    }
    if (etat.morte) {
      var suite = table.deadkeys[etat.morte];
      valeur = (suite && suite[valeur]) || valeur;
      etat.morte = null;
    }

    if (etat.saisi.length >= Array.from(cibleCourante()).length) return;

    var attendu = Array.from(cibleCourante())[etat.saisi.length];
    var juste = valeur === attendu;
    etat.saisi.push(valeur);
    etat.erreurs = juste ? 0 : etat.erreurs + 1;
    if (juste && valeur === 'É') etat.reussite = true;

    annoncer(juste
      ? valeur + ' écrit.'
      : valeur + ' au lieu de ' + attendu + '. Retour arrière pour corriger.');

    if (!dessinerLigne()) indice(!juste);
  });

  zone.addEventListener('keyup', function (evenement) {
    var touche = $('[data-position="' + positionParCode[recoder(evenement.code)] + '"]');
    if (touche) touche.removeAttribute('data-appuyee');
    niveauActif(niveauDe(evenement));
  });

  /* Perdre le focus ne désactive pas le verrouillage de l'utilisateur : on dit
     que la frappe est inactive, pas que Verr. Maj. l'est. */
  zone.addEventListener('blur', function () {
    $$('[data-appuyee]').forEach(function (touche) { touche.removeAttribute('data-appuyee'); });
    niveauActif(etat.niveau & 2);
    $('[data-mode]').textContent = 'Frappe inactive';
  });

  /* P14d : arrivée depuis une page caractère, par `?de=<slug>`. L'hôte porte
     la carte `slug:module:leçon` rendue depuis `landings.js` — une seule
     source, jamais recopiée ici. Le parcours n'ayant que trois exercices, on
     retient celui qui couvre le module du caractère ; un module sans exercice
     correspondant ouvre le parcours au début plutôt que de mentir. */
  var MODULE_VERS_ETAPE = { 1: 0, 3: 1, 0: 2 };

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
    table = reponses[0];
    canonique = reponses[1];
    traditionnel = reponses[2];

    /* `event.code` → position du dessin : on apparie par la signature des
       quatre niveaux directs, pas par un tableau de correspondance écrit à la
       main qui dériverait à la première évolution de la disposition. */
    var signature = function (touche) {
      return [touche.base, touche.shift, touche.alt_gr, touche.shift_alt_gr]
        .map(function (valeur) { return valeur || ''; }).join('|');
    };
    var signatures = new Map();
    canonique.rows.flatMap(function (rangee) { return rangee.keys; }).forEach(function (touche) {
      parPosition[touche.position] = touche;
      signatures.set(signature(touche), touche.position);
    });
    traditionnel.rows.flatMap(function (rangee) { return rangee.keys; }).forEach(function (touche) {
      positionTraditionnelle[touche.position] = touche;
    });
    Object.keys(table.keymap).forEach(function (code) {
      if (code.indexOf('Numpad') === 0) return;
      var valeurs = table.keymap[code];
      var position = signatures.get(
        [valeurs[0], valeurs[1], valeurs[4], valeurs[5]]
          .map(function (valeur) { return valeur || ''; }).join('|')
      );
      if (position) positionParCode[code] = position;
    });

    poserLegendes();
    niveauActif(0);

    var depuisCaractere = etapeDOrigine();
    var ecranDemande = parametres.get('ecran');

    if (ecranDemande === 'parcours') {
      etat.etape = Math.max(0, Math.min(2, Number(parametres.get('etape') || 1) - 1));
      etat.cible = etat.etape === 0 ? 1 : 0;
      etat.reussite = etat.etape === 0;
      vue('parcours', false);
    } else if (ecranDemande === 'synthese') {
      etat.valides = [true, true, true];
      etat.reussite = true;
      vue('synthese', false);
    } else if (depuisCaractere !== null) {
      etat.etape = depuisCaractere;
      vue('parcours', true);
    } else {
      vue('intro', false);
    }

    racine.dataset.ready = 'true';
  } catch (erreur) {
    $('[data-sous-titre]').textContent =
      'Le clavier n’a pas pu être chargé. Rechargez la page pour réessayer.';
    annoncer('Chargement du clavier impossible.');
    console.error(erreur);
  }
})();
