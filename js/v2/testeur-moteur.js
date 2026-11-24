/* Moteur de frappe du testeur — tout ce qui se calcule sans la page.

   Sorti de `js/v2/testeur.js` au lot 0 de la refonte du testeur (2026-11-11),
   sans changement de comportement : le mode libre et la recherche de
   caractères des lots suivants réutiliseront ce moteur sans passer par le
   parcours. Les fonctions sont celles de `testeur.js`, déplacées, pas
   réécrites ; seule `ligneGeste` est nouvelle.

   Aucune lecture de `document`, `window` ni `navigator` ici : ce qui vient de
   la page (les trois JSON, la plateforme) est passé à `creer`, et ce qui
   dépend de l'étape en cours (ses gestes préférés, le mode `strict`) est un
   argument de la fonction appelée.

   Script classique, pas de module ES : le navigateur le charge en `defer`
   avant `testeur.js` (global `TesteurMoteur`) et Node le charge par
   `require` (tests/unit/testeur-moteur.test.js).

   CSP : `script-src 'self'`. Fichier externe. */

(function (racine) {
  'use strict';

  /* Les huit niveaux de la table de frappe, dans l'ordre de
     `tester/keyboard.js` : le rang vaut AltGr×4 + Verr. Maj.×2 + Maj×1. */
  var couche = ['base', 'maj', 'verrmaj', 'verrmaj', 'altgr', 'majaltgr', 'altgr', 'majaltgr'];
  var modificateurs = [
    [], ['Maj'], ['Verr. Maj.'], ['Verr. Maj.', 'Maj'],
    ['AltGr'], ['AltGr', 'Maj'], ['Verr. Maj.', 'AltGr'], ['Verr. Maj.', 'AltGr', 'Maj']
  ];
  var noms = { maj: 'Maj', verrmaj: 'Verr. Maj.', altgr: 'AltGr' };

  /* Le niveau d'une frappe. `etat` : { altgr, verrmaj, maj, alt, ctrl }, des
     booléens que la page lit sur l'événement (`getModifierState('AltGraph')`,
     `getModifierState('CapsLock')`, `shiftKey`, `altKey`, `ctrlKey`).
     Sous Windows, AltGr arrive comme Ctrl+Alt ; sous macOS, c'est Option. */
  function niveau(etat, mac) {
    var altgr = etat.altgr || (mac ? etat.alt : (etat.ctrl && etat.alt));
    return (altgr ? 4 : 0)
      + (etat.verrmaj ? 2 : 0)
      + (etat.maj ? 1 : 0);
  }

  /* Un clavier Mac ISO intervertit Backquote et IntlBackslash par rapport au
     `event.code` que la table attend. */
  function recoder(code, mac) {
    if (!mac) return code;
    return { Backquote: 'IntlBackslash', IntlBackslash: 'Backquote', AltLeft: 'AltRight' }[code] || code;
  }

  /* Touches qui ne produisent rien et qu'on tape sans les chercher. */
  var TOUCHES_SILENCIEUSES = /^(Shift|Control|Alt|AltGraph|Meta|OS|CapsLock|NumLock|ScrollLock|Tab|Escape|Enter|ContextMenu|Pause|PrintScreen|Insert|Delete|Home|End|PageUp|PageDown|Arrow(Up|Down|Left|Right)|F\d{1,2})$/;

  function toucheSilencieuse(key) {
    return TOUCHES_SILENCIEUSES.test(key);
  }

  /* Le nom d'un caractère dans une phrase, à l'écran comme au lecteur d'écran.
     Les espaces n'ont pas de glyphe : on les nomme (revue du 2026-11-10 : seule
     l'espace ordinaire l'était, les deux insécables donnaient un message muet).
     Une ponctuation est mise entre guillemets, sinon « x au lieu de . » finit
     par « .. ». U+202F : espace fine insécable ; U+00A0 : espace insécable. */
  function nommerCaractere(caractere) {
    if (caractere === ' ') return 'espace';
    if (caractere === ' ') return 'espace fine insécable';
    if (caractere === ' ') return 'espace insécable';
    if (caractere && !/[\p{L}\p{N}]/u.test(caractere)) return '« ' + caractere + ' »';
    return caractere;
  }

  /* Une espace se dit, un autre caractère se lit tel quel : « espace écrit. »
     plutôt qu'un blanc. */
  function lireCaractere(caractere) {
    return /[   ]/.test(caractere) ? nommerCaractere(caractere) : caractere;
  }

  /* Frappe tolérante (décision du 2026-09-29) : l'espace, la fine et
     l'insécable se valent, ' vaut ’. Sauf dans l'étape Documents (`strict`),
     où l'on tape pour de vrai de la typographie : l'espace ordinaire n'y
     remplace pas une insécable, et ’ est exigé. U+202F et U+00A0 s'y valent.
     Les guillemets droits du code ne sont jamais relâchés.
     ⚠️ Pas symétrique : `attendu` est le caractère du modèle, `tape` celui que
     la personne a produit. Taper U+00A0 quand l'espace est attendue passe,
     l'inverse échoue en `strict`. */
  var ESPACES = '   ';
  function equivalent(attendu, tape, strict) {
    var valeur = tape;
    strict = Boolean(strict);
    if (valeur === attendu) return true;
    if (ESPACES.indexOf(valeur) !== -1 && ESPACES.indexOf(attendu) !== -1) {
      if (!strict || attendu === ' ') return true;
      return valeur !== ' ';
    }
    return !strict && valeur === '\'' && attendu === '’';
  }

  /* options : { table, canonique, traditionnel, mac }
     `table` : /tester/azerty-global.json (keymap, deadkeys) ;
     `canonique` : /data/AZERTY Global.json (le dessin) ;
     `traditionnel` : /data/AZERTY Traditionnel.json (le nom gravé) ;
     `mac` : vrai sous macOS (la page lit `navigator.platform`). */
  function creerMoteur(options) {
    var table = options.table;
    var canonique = options.canonique;
    var traditionnel = options.traditionnel;
    var mac = Boolean(options.mac);

    var parPosition = {};
    var positionTraditionnelle = {};
    var positionParCode = {};

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

    /* Le code est-il une touche de la table ? Une touche absente (commande,
       navigation) n'est pas une touche sans caractère à ce niveau. */
    function codeConnu(code) {
      return Boolean(table.keymap[code]);
    }

    /* Ce que la table donne pour `code` au niveau `rang` : un caractère, un
       identifiant de touche morte (`dk_circumflex`), `null` quand rien n'est
       gravé à ce niveau, `undefined` quand le code n'est pas dans la table. */
    function caractere(code, rang) {
      var valeurs = table.keymap[code];
      return valeurs ? valeurs[rang] : undefined;
    }

    /* La sortie est-elle une touche morte ? */
    function estMorte(valeur) {
      return Boolean(table.deadkeys[valeur]);
    }

    /* La touche morte posée, puis une lettre : le caractère composé, ou la
       lettre telle quelle quand la touche morte ne la combine pas. */
    function composer(morte, valeur) {
      var suite = table.deadkeys[morte];
      return (suite && suite[valeur]) || valeur;
    }

    /* Le message quand une touche ne donne rien à ce niveau. Verr. Maj. est un
       verrou, pas une touche qu'on presse avec les autres : on le dit à part
       (revue du 2026-11-10). */
    function texteAbsent(code, rang) {
      var pressees = modificateurs[rang].filter(function (m) { return m !== 'Verr. Maj.'; });
      var verrou = modificateurs[rang].length !== pressees.length;
      return 'Aucun caractère sur la touche ' + nomTouche(positionParCode[code])
        + (pressees.length ? ' avec ' + pressees.join(' + ') : '')
        + (verrou ? (pressees.length ? ', Verr. Maj. étant actif' : ' avec Verr. Maj. actif') : '') + '.';
    }

    /* Parmi toutes les façons de produire un caractère, la plus simple gagne :
       le moins de modificateurs, puis le niveau le plus bas. */
    function chercherCaractere(valeurCherchee) {
      var trouves = [];
      Object.keys(table.keymap).forEach(function (code) {
        if (!positionParCode[code]) return;
        table.keymap[code].forEach(function (valeur, rang) {
          if (valeur === valeurCherchee) {
            trouves.push({ code: code, position: positionParCode[code], rang: rang });
          }
        });
      });
      return trouves.sort(function (a, b) {
        return modificateurs[a.rang].length - modificateurs[b.rang].length || a.rang - b.rang;
      })[0];
    }

    /* Un caractère qui s'obtient par une touche morte puis une lettre (í ò ã ɛ ɔ
       ŋ ɲ ɓ ɗ, mais aussi É par ^ puis é). `voulue` force la touche morte quand
       l'étape enseigne ce geste-là. Le moins de modificateurs gagne. */
    function chercherSequence(valeurCherchee, voulue) {
      var meilleur = null;
      Object.keys(table.deadkeys).forEach(function (dk) {
        if (voulue && dk !== voulue) return;
        var suite = table.deadkeys[dk];
        var morte = chercherCaractere(dk);
        if (!morte) return;
        Object.keys(suite).forEach(function (base) {
          if (suite[base] !== valeurCherchee) return;
          var lettre = chercherCaractere(base);
          if (!lettre) return;
          var cout = modificateurs[morte.rang].length + modificateurs[lettre.rang].length;
          if (!meilleur || cout < meilleur.cout) {
            meilleur = { dk: dk, morte: morte, base: lettre, cout: cout };
          }
        });
      });
      return meilleur;
    }

    /* Le geste à montrer : le geste préféré s'il existe, sinon la frappe
       directe, sinon la touche morte suivie de la lettre. `gestesPreferes` :
       { caractère: identifiant de touche morte }, celui de l'étape en cours
       (`etapes[n].gestes`), ou rien.
       Rend { direct: {code, position, rang} }, { sequence: {dk, morte, base,
       cout} } ou null. */
    function trouverGeste(valeurCherchee, gestesPreferes) {
      var voulue = gestesPreferes && gestesPreferes[valeurCherchee];
      var sequence = chercherSequence(valeurCherchee, voulue);
      if (voulue && sequence) return { sequence: sequence };
      var direct = chercherCaractere(valeurCherchee);
      if (direct) return { direct: direct };
      return sequence ? { sequence: chercherSequence(valeurCherchee) } : null;
    }

    /* Les temps d'une touche à presser. Verr. Maj. est un verrou : il fait un
       temps à lui (« Verr. Maj., puis é »), comme dans la consigne du parcours.
       Les autres modificateurs se pressent avec la touche (« AltGr + E »). */
    function temps(touche) {
      var mods = modificateurs[touche.rang];
      var pressees = mods.filter(function (m) { return m !== 'Verr. Maj.'; });
      var texte = pressees.concat([nomTouche(touche.position)]).join(' + ');
      return pressees.length !== mods.length ? ['Verr. Maj.', texte] : [texte];
    }

    /* La ligne de geste d'un caractère : « É : Verr. Maj., puis é. »,
       « € : AltGr + E. », « Ê : ^, puis Maj + E. ». Le nom d'une touche est
       celui de `nomTouche`. Rien (null) si la table ne sait pas l'écrire. */
    function ligneGeste(valeurCherchee, gestesPreferes) {
      var geste = trouverGeste(valeurCherchee, gestesPreferes);
      if (!geste) return null;
      var suite = geste.direct
        ? temps(geste.direct)
        : temps(geste.sequence.morte).concat(temps(geste.sequence.base));
      return valeurCherchee + ' : ' + suite.join(', puis ') + '.';
    }

    return {
      table: table,
      mac: mac,
      couche: couche,
      modificateurs: modificateurs,
      noms: noms,
      parPosition: parPosition,
      positionTraditionnelle: positionTraditionnelle,
      positionParCode: positionParCode,
      niveau: function (etat) { return niveau(etat, mac); },
      recoder: function (code) { return recoder(code, mac); },
      nomTouche: nomTouche,
      codeConnu: codeConnu,
      caractere: caractere,
      estMorte: estMorte,
      composer: composer,
      texteAbsent: texteAbsent,
      toucheSilencieuse: toucheSilencieuse,
      nommerCaractere: nommerCaractere,
      lireCaractere: lireCaractere,
      equivalent: equivalent,
      chercherCaractere: chercherCaractere,
      chercherSequence: chercherSequence,
      trouverGeste: trouverGeste,
      ligneGeste: ligneGeste
    };
  }

  /* Ce qui ne dépend d'aucun JSON est aussi sur l'API elle-même : la page en a
     besoin avant la fin du chargement (une touche relâchée pendant qu'il court
     recalcule le niveau). */
  var api = {
    creer: creerMoteur,
    couche: couche,
    modificateurs: modificateurs,
    noms: noms,
    niveau: niveau,
    recoder: recoder,
    equivalent: equivalent,
    nommerCaractere: nommerCaractere,
    lireCaractere: lireCaractere,
    toucheSilencieuse: toucheSilencieuse
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.TesteurMoteur = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
