/* Moteur de frappe du testeur — garde-fous.
 *
 * `js/v2/testeur-moteur.js` est sorti de `js/v2/testeur.js` au lot 0 de la
 * refonte du testeur (2026-11-11), sans changement de comportement. Ces tests
 * tournent sur les vraies données (`tester/azerty-global.json` et les deux
 * dessins de `data/`), pas sur une table de jouet : le jour où la disposition
 * bouge, ils rougissent et disent quel geste a changé.
 *
 * Les espaces insécables s'écrivent en `\u` : U+202F (fine) et U+00A0 se
 * confondent à l'œil avec l'espace ordinaire, et un éditeur les aplatit.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const TesteurMoteur = require('../../js/v2/testeur-moteur.js');
const table = require('../../tester/azerty-global.json');
const canonique = require('../../data/AZERTY Global.json');
const traditionnel = require('../../data/AZERTY Traditionnel.json');

const FINE = ' ';
const INSECABLE = ' ';
const APOSTROPHE = '’';

const windows = TesteurMoteur.creer({ table, canonique, traditionnel, mac: false });
const mac = TesteurMoteur.creer({ table, canonique, traditionnel, mac: true });

/* Les cinq modificateurs que la page lit sur l'événement. */
const sans = { altgr: false, verrmaj: false, maj: false, alt: false, ctrl: false };
const avec = (changements) => Object.assign({}, sans, changements);

test('le rang vaut AltGr×4 + Verr. Maj.×2 + Maj×1 : les huit niveaux', () => {
  const attendus = [
    [sans, 0],
    [avec({ maj: true }), 1],
    [avec({ verrmaj: true }), 2],
    [avec({ verrmaj: true, maj: true }), 3],
    [avec({ altgr: true }), 4],
    [avec({ altgr: true, maj: true }), 5],
    [avec({ altgr: true, verrmaj: true }), 6],
    [avec({ altgr: true, verrmaj: true, maj: true }), 7]
  ];
  for (const [etat, rang] of attendus) {
    assert.strictEqual(windows.niveau(etat), rang, JSON.stringify(etat));
  }
  assert.strictEqual(windows.modificateurs.length, 8);
  assert.strictEqual(windows.couche.length, 8);
  /* Les modificateurs d'un rang sont ceux qui le composent, Verr. Maj. compris. */
  assert.deepStrictEqual(windows.modificateurs[7], ['Verr. Maj.', 'AltGr', 'Maj']);
});

test('les huit niveaux se lisent dans la table : touche é (Digit2)', () => {
  const lus = [0, 1, 2, 3, 4, 5, 6, 7].map((rang) => windows.caractere('Digit2', rang));
  assert.deepStrictEqual(lus, [
    'é', '2', 'É', '2',
    'dk_double_acute', 'dk_double_grave', 'dk_double_acute', 'dk_double_grave'
  ]);
});

test('É par Verr. Maj. + é, € par AltGr + E', () => {
  const verrouille = windows.niveau(avec({ verrmaj: true }));
  assert.strictEqual(windows.caractere('Digit2', verrouille), 'É');
  assert.strictEqual(windows.caractere('KeyE', windows.niveau(avec({ altgr: true }))), '€');
});

test('code inconnu, niveau vide, valeur : trois issues qui ne se confondent pas', () => {
  assert.strictEqual(windows.codeConnu('Escape'), false);
  assert.strictEqual(windows.caractere('Escape', 0), undefined);
  assert.strictEqual(windows.codeConnu('Digit8'), true);
  assert.strictEqual(windows.caractere('Digit8', 5), null);
  assert.strictEqual(windows.caractere('Digit8', 0), '_');
});

test('touche morte en deux temps : ^ puis e donne ê, ^ puis Maj + E donne Ê', () => {
  const morte = windows.caractere('BracketLeft', 0);
  assert.strictEqual(morte, 'dk_circumflex');
  assert.strictEqual(windows.estMorte(morte), true);
  assert.strictEqual(windows.estMorte('e'), false);

  const e = windows.caractere('KeyE', windows.niveau(sans));
  const majE = windows.caractere('KeyE', windows.niveau(avec({ maj: true })));
  assert.strictEqual(windows.composer(morte, e), 'ê');
  assert.strictEqual(windows.composer(morte, majE), 'Ê');
});

test('une touche morte qui ne combine pas la lettre rend la lettre telle quelle', () => {
  assert.strictEqual(table.deadkeys.dk_circumflex['%'], undefined);
  assert.strictEqual(windows.composer('dk_circumflex', '%'), '%');
  assert.strictEqual(windows.composer('dk_inexistante', 'e'), 'e');
});

test('frappe tolérante : espace, fine et insécable se valent, \' vaut ’', () => {
  for (const attendu of [' ', FINE, INSECABLE]) {
    for (const tape of [' ', FINE, INSECABLE]) {
      assert.strictEqual(windows.equivalent(attendu, tape, false), true, JSON.stringify([attendu, tape]));
    }
  }
  assert.strictEqual(windows.equivalent(APOSTROPHE, '\'', false), true);
  assert.strictEqual(windows.equivalent('a', 'a', false), true);
  assert.strictEqual(windows.equivalent('a', 'b', false), false);
  /* `strict` absent vaut « pas strict », comme `Boolean(etape.strict)`. */
  assert.strictEqual(windows.equivalent(APOSTROPHE, '\''), true);
});

test('frappe tolérante : refus en mode strict, et dans le sens où l\'on a le droit de refuser', () => {
  /* ’ est exigé. */
  assert.strictEqual(windows.equivalent(APOSTROPHE, '\'', true), false);
  /* L'espace ordinaire ne remplace pas une insécable... */
  assert.strictEqual(windows.equivalent(INSECABLE, ' ', true), false);
  assert.strictEqual(windows.equivalent(FINE, ' ', true), false);
  /* ... mais une insécable remplace l'espace attendue, et fine et insécable se valent. */
  assert.strictEqual(windows.equivalent(' ', INSECABLE, true), true);
  assert.strictEqual(windows.equivalent(' ', FINE, true), true);
  assert.strictEqual(windows.equivalent(FINE, INSECABLE, true), true);
  assert.strictEqual(windows.equivalent(INSECABLE, FINE, true), true);
  /* Pas symétrique : taper ’ quand ' est attendu ne passe jamais. */
  assert.strictEqual(windows.equivalent('\'', APOSTROPHE, false), false);
  assert.strictEqual(windows.equivalent('\'', APOSTROPHE, true), false);
});

test('trouverGeste : geste direct, le moins de modificateurs gagne', () => {
  /* € existe en AltGr (rang 4) et en Verr. Maj. + AltGr (rang 6) : le premier. */
  const euro = windows.trouverGeste('€');
  assert.deepStrictEqual(euro, {
    direct: { code: 'KeyE', position: windows.positionParCode.KeyE, rang: 4 }
  });
  /* É : Verr. Maj. + é, pas la touche morte. */
  const e = windows.trouverGeste('É');
  assert.strictEqual(e.sequence, undefined);
  assert.strictEqual(e.direct.code, 'Digit2');
  assert.strictEqual(e.direct.rang, 2);
});

test('trouverGeste : geste par touche morte quand rien ne se tape directement', () => {
  const geste = windows.trouverGeste('Ê');
  assert.strictEqual(geste.direct, undefined);
  assert.strictEqual(geste.sequence.dk, 'dk_circumflex');
  assert.strictEqual(geste.sequence.morte.code, 'BracketLeft');
  assert.strictEqual(geste.sequence.morte.rang, 0);
  assert.strictEqual(geste.sequence.base.code, 'KeyE');
  assert.strictEqual(geste.sequence.base.rang, 1);
  assert.strictEqual(geste.sequence.cout, 1);
  assert.strictEqual(windows.trouverGeste('\u{1F600}'), null);
});

test('trouverGeste : le geste préféré de l\'étape l\'emporte sur le geste direct', () => {
  /* Messages : ^ puis ç, plutôt que Verr. Maj. + 9. */
  const messages = { 'Ç': 'dk_circumflex', 'À': 'dk_circumflex' };
  assert.strictEqual(windows.trouverGeste('Ç').direct.code, 'Digit9');
  const prefere = windows.trouverGeste('Ç', messages);
  assert.strictEqual(prefere.direct, undefined);
  assert.strictEqual(prefere.sequence.dk, 'dk_circumflex');
  assert.strictEqual(prefere.sequence.base.code, 'Digit9');
  assert.strictEqual(prefere.sequence.base.rang, 0);
  /* Une préférence qui ne concerne pas ce caractère ne change rien. */
  assert.deepStrictEqual(windows.trouverGeste('€', messages), windows.trouverGeste('€'));
  /* Une touche morte préférée qui ne donne pas ce caractère : le geste direct reste. */
  assert.deepStrictEqual(
    windows.trouverGeste('€', { '€': 'dk_circumflex' }),
    windows.trouverGeste('€')
  );
});

test('ligneGeste : « caractère : touches. »', () => {
  assert.strictEqual(windows.ligneGeste('É'), 'É : Verr. Maj., puis é.');
  assert.strictEqual(windows.ligneGeste('€'), '€ : AltGr + E.');
  assert.strictEqual(windows.ligneGeste('Ê'), 'Ê : ^, puis Maj + E.');
});

test('ligneGeste : le nom de la touche est celui du clavier physique, la préférence s\'applique', () => {
  /* Une touche morte se nomme ^, la barre d'espace Espace. */
  assert.strictEqual(windows.nomTouche(windows.positionParCode.BracketLeft), '^');
  assert.strictEqual(windows.nomTouche(windows.positionParCode.Space), 'Espace');
  assert.strictEqual(windows.ligneGeste(' '), '  : Espace.');
  assert.strictEqual(
    windows.ligneGeste('Ç', { 'Ç': 'dk_circumflex' }),
    'Ç : ^, puis ç.'
  );
  assert.strictEqual(windows.ligneGeste('\u{1F600}'), null);
});

test('le message d\'une touche sans caractère dit le modificateur, et le verrou à part', () => {
  assert.strictEqual(windows.texteAbsent('Digit8', 5), 'Aucun caractère sur la touche _ avec AltGr + Maj.');
  assert.strictEqual(
    windows.texteAbsent('Digit8', 7),
    'Aucun caractère sur la touche _ avec AltGr + Maj, Verr. Maj. étant actif.'
  );
});

test('l\'index des positions : une position par code, hors pavé numérique', () => {
  const codes = Object.keys(windows.positionParCode);
  assert.ok(codes.length >= 48, 'au moins les 48 touches gravées : ' + codes.length);
  assert.ok(codes.every((code) => code.indexOf('Numpad') !== 0));
  assert.strictEqual(windows.nomTouche(windows.positionParCode.KeyE), 'E');
  assert.strictEqual(windows.nomTouche(windows.positionParCode.Digit2), 'é');
  assert.strictEqual(windows.nomTouche('inconnue'), 'inconnue');
  assert.strictEqual(windows.parPosition[windows.positionParCode.KeyE].base, 'e');
});

test('macOS : Option tient lieu d\'AltGr, Ctrl + Alt n\'est plus AltGr, les trois codes sont recodés', () => {
  const option = avec({ alt: true });
  assert.strictEqual(mac.niveau(option), 4);
  assert.strictEqual(windows.niveau(option), 0, 'Alt seul n\'est pas AltGr sous Windows');
  const ctrlAlt = avec({ ctrl: true, alt: true });
  assert.strictEqual(windows.niveau(ctrlAlt), 4);
  assert.strictEqual(mac.niveau(avec({ ctrl: true })), 0);
  assert.strictEqual(mac.niveau(avec({ alt: true, maj: true })), 5);
  /* Le navigateur peut déjà donner AltGraph, sur les deux plateformes. */
  assert.strictEqual(mac.niveau(avec({ altgr: true })), 4);
  assert.strictEqual(windows.niveau(avec({ altgr: true })), 4);

  assert.strictEqual(mac.recoder('Backquote'), 'IntlBackslash');
  assert.strictEqual(mac.recoder('IntlBackslash'), 'Backquote');
  assert.strictEqual(mac.recoder('AltLeft'), 'AltRight');
  assert.strictEqual(mac.recoder('KeyA'), 'KeyA');
  for (const code of ['Backquote', 'IntlBackslash', 'AltLeft', 'KeyA']) {
    assert.strictEqual(windows.recoder(code), code, 'pas de recodage sous Windows : ' + code);
  }
  /* Le code recodé existe dans la table : la frappe d'un Mac ISO se lit. */
  assert.strictEqual(mac.codeConnu(mac.recoder('Backquote')), true);
  assert.strictEqual(mac.codeConnu(mac.recoder('IntlBackslash')), true);
});

test('ce qui ne dépend d\'aucun JSON est aussi sur l\'API, pour les touches relâchées avant la fin du chargement', () => {
  assert.strictEqual(TesteurMoteur.niveau(avec({ alt: true }), true), 4);
  assert.strictEqual(TesteurMoteur.niveau(avec({ alt: true }), false), 0);
  assert.strictEqual(TesteurMoteur.recoder('Backquote', true), 'IntlBackslash');
  assert.strictEqual(TesteurMoteur.recoder('Backquote', false), 'Backquote');
  assert.strictEqual(TesteurMoteur.modificateurs, windows.modificateurs);
  assert.strictEqual(TesteurMoteur.equivalent(APOSTROPHE, '\'', false), true);
});

test('nommer et lire un caractère : les espaces se disent, la ponctuation s\'entoure', () => {
  assert.strictEqual(windows.nommerCaractere(' '), 'espace');
  assert.strictEqual(windows.nommerCaractere(FINE), 'espace fine insécable');
  assert.strictEqual(windows.nommerCaractere(INSECABLE), 'espace insécable');
  assert.strictEqual(windows.nommerCaractere('.'), '«' + INSECABLE + '.' + INSECABLE + '»');
  assert.strictEqual(windows.nommerCaractere('é'), 'é');
  assert.strictEqual(windows.lireCaractere(FINE), 'espace fine insécable');
  assert.strictEqual(windows.lireCaractere('é'), 'é');
});

test('les touches de commande et de navigation sont silencieuses, pas les autres', () => {
  for (const touche of ['Shift', 'CapsLock', 'Tab', 'Escape', 'ArrowLeft', 'F5', 'F12']) {
    assert.strictEqual(windows.toucheSilencieuse(touche), true, touche);
  }
  for (const touche of ['a', 'Dead', 'Process', 'Backspace', 'F123']) {
    assert.strictEqual(windows.toucheSilencieuse(touche), false, touche);
  }
});
