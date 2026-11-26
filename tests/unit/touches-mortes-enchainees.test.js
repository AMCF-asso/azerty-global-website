'use strict';

/* Touches mortes enchaînées : quand une touche morte est pressée alors qu'une
   autre est active, le pilote Windows et l'app cherchent dans la table de la
   PREMIÈRE le signe isolé de la SECONDE (son entrée « espace »), pas son
   symbole d'affichage. Audit de l'app du 2026-11-25, mesuré par ToUnicodeEx :
   l'index du testeur prenait « . » pour dk_dot_below et « , » pour dk_comma,
   et publiait 14 méthodes que ni le pilote ni l'app ne rendent.

   Ce test relit le vrai `tester/character-index.json` contre le vrai
   `data/AZERTY Global.json`, sans passer par `scripts/verify-mappings.js`,
   pour qu'une régression de l'un ne masque pas celle de l'autre. */

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const siteRoot = path.resolve(__dirname, '..', '..');
const readJson = (...parts) => JSON.parse(readFileSync(path.join(siteRoot, ...parts), 'utf8'));

const layout = readJson('data', 'AZERTY Global.json');
const characters = readJson('tester', 'character-index.json').characters;

const POS_TO_CODE = {
  E00: 'Backquote', E01: 'Digit1', E02: 'Digit2', E03: 'Digit3', E04: 'Digit4',
  E05: 'Digit5', E06: 'Digit6', E07: 'Digit7', E08: 'Digit8', E09: 'Digit9',
  E10: 'Digit0', E11: 'Minus', E12: 'Equal',
  D01: 'KeyQ', D02: 'KeyW', D03: 'KeyE', D04: 'KeyR', D05: 'KeyT',
  D06: 'KeyY', D07: 'KeyU', D08: 'KeyI', D09: 'KeyO', D10: 'KeyP',
  D11: 'BracketLeft', D12: 'BracketRight',
  C01: 'KeyA', C02: 'KeyS', C03: 'KeyD', C04: 'KeyF', C05: 'KeyG',
  C06: 'KeyH', C07: 'KeyJ', C08: 'KeyK', C09: 'KeyL', C10: 'Semicolon',
  C11: 'Quote', C12: 'Backslash',
  B00: 'IntlBackslash', B01: 'KeyZ', B02: 'KeyX', B03: 'KeyC', B04: 'KeyV',
  B05: 'KeyB', B06: 'KeyN', B07: 'KeyM', B08: 'Comma', B09: 'Period', B10: 'Slash',
  A03: 'Space'
};

const LAYER_TO_PROP = {
  Base: 'base',
  Shift: 'shift',
  Caps: 'caps',
  'Caps+Shift': 'caps_shift',
  AltGr: 'alt_gr',
  'Shift+AltGr': 'shift_alt_gr',
  'Caps+AltGr': 'caps_alt_gr',
  'Caps+Shift+AltGr': 'caps_shift_alt_gr'
};

/* Une couche Verr. Maj. absente reprend la couche sans Verr. Maj. */
const CAPS_FALLBACK = {
  caps: 'base',
  caps_shift: 'shift',
  caps_alt_gr: 'alt_gr',
  caps_shift_alt_gr: 'shift_alt_gr'
};

const keyByCode = {};
for (const row of layout.rows) {
  for (const key of row.keys) {
    const code = POS_TO_CODE[key.position];
    if (code) keyByCode[code] = key;
  }
}

function produced(code, layer) {
  const key = keyByCode[code];
  const prop = LAYER_TO_PROP[layer];
  if (!key || !prop) return undefined;
  if (Object.prototype.hasOwnProperty.call(key, prop)) return key[prop];
  return CAPS_FALLBACK[prop] ? key[CAPS_FALLBACK[prop]] : undefined;
}

const deadTable = (name) => layout.dead_keys?.[name]?.table;

/* Toutes les méthodes « première touche morte, puis une touche qui donne une
   seconde touche morte ». */
const chained = [];
for (const [char, entry] of Object.entries(characters)) {
  for (const method of entry.methods || []) {
    if (method.type !== 'deadkey') continue;
    const second = produced(method.key, method.layer);
    if (typeof second === 'string' && second.startsWith('dk_')) {
      chained.push({ char, first: method.deadkey, second, key: method.key, layer: method.layer });
    }
  }
}

const label = (m) => `${m.char} (U+${m.char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) : ` +
  `${m.first} puis ${m.key}/${m.layer} = ${m.second}`;

test('l\'index publie des méthodes à touches mortes enchaînées (le test n\'est pas vide)', () => {
  assert.ok(chained.length > 0, 'aucune méthode enchaînée trouvée : le contrôle ne contrôlerait rien');
});

test('chaque seconde touche morte a un signe isolé non vide', () => {
  const sansSigne = chained.filter((m) => {
    const sign = deadTable(m.second)?.[' '];
    return typeof sign !== 'string' || sign.trim() === '';
  });
  assert.deepEqual(sansSigne.map(label), []);
});

test('chaque méthode enchaînée rend le caractère indexé : table de la première [signe isolé de la seconde]', () => {
  const faux = [];
  for (const m of chained) {
    const first = deadTable(m.first);
    if (!first) {
      faux.push(`${label(m)} : touche morte ${m.first} absente de data/AZERTY Global.json`);
      continue;
    }
    const sign = deadTable(m.second)?.[' '];
    const rendu = first[sign];
    if (rendu !== m.char) faux.push(`${label(m)} : ${m.first}[${JSON.stringify(sign)}] rend ${JSON.stringify(rendu)}`);
  }
  assert.deepEqual(faux, []);
});

test('les points et virgules souscrits enchaînés ne passent plus par leur symbole d\'affichage', () => {
  /* Témoin de la panne du 2026-11-25 : « . » et « , » étaient les symboles
     d'affichage de dk_dot_below et dk_comma. Une méthode qui ne tiendrait
     que par cette clé serait fausse dans le pilote. */
  const parAffichage = chained.filter((m) => {
    const display = { dk_dot_below: '.', dk_comma: ',' }[m.second];
    if (!display) return false;
    const sign = deadTable(m.second)?.[' '];
    return sign !== display && deadTable(m.first)?.[display] === m.char && deadTable(m.first)?.[sign] !== m.char;
  });
  assert.deepEqual(parAffichage.map(label), []);
});
