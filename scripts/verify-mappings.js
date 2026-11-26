const fs = require('fs');
const path = require('path');

const MASTER_FILENAME = 'AZERTY Global.json';

const SITE_ROOT = path.resolve(__dirname, '..');
const main = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, 'data', MASTER_FILENAME), 'utf8'));
const idx = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, 'tester', 'character-index.json'), 'utf8'));
const characters = idx.characters || {};

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

function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function layerValue(key, prop) {
  if (!key) return null;
  if (hasOwn(key, prop)) return key[prop];
  if (prop === 'caps') return key.base ?? null;
  if (prop === 'caps_shift') return key.shift ?? null;
  if (prop === 'caps_alt_gr') return key.alt_gr ?? null;
  if (prop === 'caps_shift_alt_gr') return key.shift_alt_gr ?? null;
  return null;
}

const codeToKey = {};
for (const row of main.rows) {
  for (const key of row.keys) {
    const code = POS_TO_CODE[key.position];
    if (code) codeToKey[code] = key;
  }
}

const errors = [];

for (const [char, data] of Object.entries(characters)) {
  for (const method of data.methods || []) {
    const key = codeToKey[method.key];
    const prop = LAYER_TO_PROP[method.layer];
    const value = layerValue(key, prop);

    if (method.type === 'direct') {
      if (value !== char) {
        errors.push(`${char}: direct ${method.key}/${method.layer} produit ${value}`);
      }
    } else if (method.type === 'deadkey_activation') {
      if (value !== method.deadkey) {
        errors.push(`${char}: activation ${method.key}/${method.layer} produit ${value}, attendu ${method.deadkey}`);
      }
    } else if (method.type === 'deadkey') {
      const table = main.dead_keys?.[method.deadkey]?.table;
      if (!table) {
        errors.push(`${char}: touche morte inconnue ${method.deadkey}`);
        continue;
      }
      // Seconde touche morte : c'est son signe isolé (entrée « espace » de sa table) que
      // le pilote Windows et l'app cherchent dans la table de la première, pas son
      // symbole d'affichage (audit de l'app du 25/11/2026, mesuré par ToUnicodeEx).
      const trigger = value && value.startsWith?.('dk_')
        ? main.dead_keys?.[value]?.table?.[' ']
        : value;
      if (table[trigger] !== char) {
        errors.push(`${char}: ${method.deadkey} + ${method.key}/${method.layer} utilise ${trigger}, résultat ${table[trigger]}`);
      }
    }
  }
}

console.log(`=== Checking character-index methods against ${MASTER_FILENAME} ===`);

if (errors.length) {
  errors.slice(0, 100).forEach((error) => console.log(`MISMATCH: ${error}`));
  if (errors.length > 100) console.log(`... and ${errors.length - 100} more`);
  console.log(`Total mismatches: ${errors.length}`);
  process.exitCode = 1;
} else {
  console.log('All character-index methods match the master layout.');
}
