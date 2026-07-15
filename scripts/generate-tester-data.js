/**
 * Generate tester data from AZERTY Global.
 *
 * Source of truth: data/AZERTY Global.json (read-only).
 * Outputs:
 * - tester/azerty-global.json
 * - tester/character-index.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.resolve(__dirname, '..');
const FINAL_PATH = path.join(SITE_ROOT, 'data', 'AZERTY Global.json');
const TESTER_LAYOUT_PATH = path.join(SITE_ROOT, 'tester', 'azerty-global.json');
const CHARACTER_INDEX_PATH = path.join(SITE_ROOT, 'tester', 'character-index.json');

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

const LAYERS = [
  { prop: 'base', layer: 'Base' },
  { prop: 'shift', layer: 'Shift' },
  { prop: 'caps', layer: 'Caps' },
  { prop: 'caps_shift', layer: 'Caps+Shift' },
  { prop: 'alt_gr', layer: 'AltGr' },
  { prop: 'shift_alt_gr', layer: 'Shift+AltGr' },
  { prop: 'caps_alt_gr', layer: 'Caps+AltGr' },
  { prop: 'caps_shift_alt_gr', layer: 'Caps+Shift+AltGr' }
];

const DEAD_KEY_SYMBOLS = {
  dk_circumflex: '^',
  dk_diaeresis: '¨',
  dk_acute: '´',
  dk_grave: '`',
  dk_tilde: '~',
  dk_cedilla: '¸',
  dk_macron: '¯',
  dk_breve: '˘',
  dk_dot_above: '˙',
  dk_ring_above: '˚',
  dk_caron: 'ˇ',
  dk_ogonek: '˛',
  dk_double_acute: '˝',
  dk_stroke: '/',
  dk_horizontal_stroke: '−',
  dk_hook: '\u0309',
  dk_horn: '\u031B',
  dk_comma: ',',
  dk_dot_below: '.',
  dk_double_grave: '\u030F',
  dk_inverted_breve: '\u0311',
  dk_greek: 'µ',
  dk_cyrillic: 'я',
  dk_punctuation: '§',
  dk_currencies: '¤',
  dk_scientific: '±',
  dk_misc_symbols: '→',
  dk_phonetic: 'ʁ',
  dk_extended_latin: 'ə'
};

const DEAD_KEY_NAMES_FR = {
  dk_circumflex: 'CIRCONFLEXE',
  dk_diaeresis: 'TRÉMA',
  dk_acute: 'ACCENT AIGU',
  dk_grave: 'ACCENT GRAVE',
  dk_tilde: 'TILDE',
  dk_dot_above: 'POINT EN CHEF',
  dk_dot_below: 'POINT SOUSCRIT',
  dk_double_acute: 'DOUBLE ACCENT AIGU',
  dk_double_grave: 'DOUBLE ACCENT GRAVE',
  dk_horn: 'CORNU',
  dk_hook: 'CROCHET EN CHEF',
  dk_caron: 'CARON',
  dk_ogonek: 'OGONEK',
  dk_breve: 'BRÈVE',
  dk_inverted_breve: 'BRÈVE INVERSÉE',
  dk_stroke: 'BARRE OBLIQUE',
  dk_horizontal_stroke: 'BARRE HORIZONTALE',
  dk_macron: 'MACRON',
  dk_extended_latin: 'LATIN ÉTENDU',
  dk_cedilla: 'CÉDILLE',
  dk_comma: 'VIRGULE SOUSCRITE',
  dk_phonetic: 'ALPHABET PHONÉTIQUE',
  dk_ring_above: 'ROND EN CHEF',
  dk_greek: 'ALPHABET GREC',
  dk_cyrillic: 'ALPHABET CYRILLIQUE',
  dk_misc_symbols: 'SYMBOLES DIVERS',
  dk_scientific: 'SYMBOLES SCIENTIFIQUES',
  dk_currencies: 'SYMBOLES MONÉTAIRES',
  dk_punctuation: 'SYMBOLES DE PONCTUATION'
};

const CHARACTER_METADATA_OVERRIDES = {
  '^': {
    unicodeName: 'CIRCUMFLEX ACCENT',
    unicodeNameFr: 'CIRCONFLEXE',
    frenchAliases: ['accent circonflexe'],
    englishAliases: ['circumflex accent', 'caret']
  },
  '`': {
    unicodeName: 'GRAVE ACCENT',
    unicodeNameFr: 'BACKTICK',
    frenchAliases: ['backtick', 'accent grave'],
    englishAliases: ['backtick', 'grave accent']
  },
  '<': {
    unicodeName: 'LESS-THAN SIGN',
    unicodeNameFr: 'SIGNE INFÉRIEUR À',
    frenchAliases: ['chevron ouvrant'],
    englishAliases: ['less than', 'left angle bracket']
  },
  '>': {
    unicodeName: 'GREATER-THAN SIGN',
    unicodeNameFr: 'SIGNE SUPÉRIEUR À',
    frenchAliases: ['chevron fermant'],
    englishAliases: ['greater than', 'right angle bracket']
  },
  '\u0253': {
    unicodeName: 'LATIN SMALL LETTER B WITH HOOK',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE B CROSSE',
    frenchAliases: ['b crochet', 'b crosse'],
    englishAliases: ['b hook']
  },
  '\u0181': {
    unicodeName: 'LATIN CAPITAL LETTER B WITH HOOK',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE B CROSSE',
    frenchAliases: ['b majuscule crochet', 'b majuscule crosse'],
    englishAliases: ['b hook capital']
  },
  '\u0199': {
    unicodeName: 'LATIN SMALL LETTER K WITH HOOK',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE K CROSSE',
    frenchAliases: ['k crochet', 'k crosse'],
    englishAliases: ['k hook']
  },
  '\u0198': {
    unicodeName: 'LATIN CAPITAL LETTER K WITH HOOK',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE K CROSSE',
    frenchAliases: ['k majuscule crochet', 'k majuscule crosse'],
    englishAliases: ['k hook capital']
  },
  '\u0272': {
    unicodeName: 'LATIN SMALL LETTER N WITH LEFT HOOK',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE N HAMEÇON GAUCHE',
    frenchAliases: ['n palatal', 'n crochet gauche'],
    englishAliases: ['n left hook']
  },
  '\u019D': {
    unicodeName: 'LATIN CAPITAL LETTER N WITH LEFT HOOK',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE N HAMEÇON GAUCHE',
    frenchAliases: ['n palatal majuscule', 'n majuscule crochet gauche'],
    englishAliases: ['n left hook capital']
  },
  '\u0269': {
    unicodeName: 'LATIN SMALL LETTER IOTA',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE IOTA',
    frenchAliases: ['iota latin'],
    englishAliases: ['iota']
  },
  '\u0196': {
    unicodeName: 'LATIN CAPITAL LETTER IOTA',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE IOTA',
    frenchAliases: ['iota latin majuscule'],
    englishAliases: ['iota capital']
  },
  '\u0133': {
    unicodeName: 'LATIN SMALL LIGATURE IJ',
    unicodeNameFr: 'LIGATURE LATINE IJ MINUSCULE',
    frenchAliases: ['ij minuscule'],
    englishAliases: ['ij ligature lowercase']
  },
  '\u0132': {
    unicodeName: 'LATIN CAPITAL LIGATURE IJ',
    unicodeNameFr: 'LIGATURE LATINE IJ MAJUSCULE',
    frenchAliases: ['ij majuscule'],
    englishAliases: ['ij ligature capital']
  },
  '\u017F': {
    unicodeName: 'LATIN SMALL LETTER LONG S',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE S LONG',
    frenchAliases: ['s long'],
    englishAliases: ['long s']
  },
  '\u0188': {
    unicodeName: 'LATIN SMALL LETTER C WITH HOOK',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE C CROSSE',
    frenchAliases: ['c crochet', 'c crosse'],
    englishAliases: ['c hook']
  },
  '\u0187': {
    unicodeName: 'LATIN CAPITAL LETTER C WITH HOOK',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE C CROSSE',
    frenchAliases: ['c majuscule crochet', 'c majuscule crosse'],
    englishAliases: ['c hook capital']
  },
  '\u01A5': {
    unicodeName: 'LATIN SMALL LETTER P WITH HOOK',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE P CROSSE',
    frenchAliases: ['p crochet', 'p crosse'],
    englishAliases: ['p hook']
  },
  '\u01A4': {
    unicodeName: 'LATIN CAPITAL LETTER P WITH HOOK',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE P CROSSE',
    frenchAliases: ['p majuscule crochet', 'p majuscule crosse'],
    englishAliases: ['p hook capital']
  },
  '\u2116': {
    unicodeName: 'NUMERO SIGN',
    unicodeNameFr: 'SYMBOLE NUMÉRO',
    frenchAliases: ['numero', 'numéro', 'no'],
    englishAliases: ['numero', 'numero sign']
  },
  '\u018E': {
    unicodeName: 'LATIN CAPITAL LETTER REVERSED E',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE E RENVERSÉ',
    frenchAliases: ['e renversé majuscule'],
    englishAliases: ['reversed e capital']
  },
  '\u01DD': {
    unicodeName: 'LATIN SMALL LETTER TURNED E',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE E RETOURNÉ',
    frenchAliases: ['e retourné', 'e renversé minuscule'],
    englishAliases: ['turned e']
  },
  '\u2209': {
    unicodeName: 'NOT AN ELEMENT OF',
    unicodeNameFr: "N'APPARTIENT PAS À",
    frenchAliases: ['pas élément de', "n'appartient pas"],
    englishAliases: ['not an element of', 'does not belong']
  },
  '\u2286': {
    unicodeName: 'SUBSET OF OR EQUAL TO',
    unicodeNameFr: 'SOUS-ENSEMBLE OU ÉGAL À',
    frenchAliases: ['inclus dans', 'sous ensemble égal'],
    englishAliases: ['subset or equal']
  },
  '\u2287': {
    unicodeName: 'SUPERSET OF OR EQUAL TO',
    unicodeNameFr: 'SUR-ENSEMBLE OU ÉGAL À',
    frenchAliases: ['contient', 'sur ensemble égal'],
    englishAliases: ['superset or equal']
  },
  '\u025B': {
    unicodeName: 'LATIN SMALL LETTER OPEN E',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE EPSILON OUVERT',
    frenchAliases: ['epsilon ouvert', 'epsilon latin'],
    englishAliases: ['open e']
  },
  '\u0190': {
    unicodeName: 'LATIN CAPITAL LETTER OPEN E',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE EPSILON OUVERT',
    frenchAliases: ['epsilon ouvert majuscule', 'epsilon latin majuscule'],
    englishAliases: ['open e capital']
  },
  '\u0259': {
    unicodeName: 'LATIN SMALL LETTER SCHWA',
    unicodeNameFr: 'LETTRE MINUSCULE LATINE SCHWA',
    frenchAliases: ['schwa'],
    englishAliases: ['schwa']
  },
  '\u018F': {
    unicodeName: 'LATIN CAPITAL LETTER SCHWA',
    unicodeNameFr: 'LETTRE MAJUSCULE LATINE SCHWA',
    frenchAliases: ['schwa majuscule'],
    englishAliases: ['schwa capital']
  }
};

const RECOMMENDED_METHOD_OVERRIDES = {
  '\u0253': { type: 'deadkey', deadkey: 'dk_acute', key: 'KeyB', layer: 'Base' },
  '\u0181': { type: 'deadkey', deadkey: 'dk_acute', key: 'KeyB', layer: 'Shift' },
  '\u0199': { type: 'deadkey', deadkey: 'dk_circumflex', key: 'KeyK', layer: 'Base' },
  '\u0198': { type: 'deadkey', deadkey: 'dk_circumflex', key: 'KeyK', layer: 'Shift' },
  '\u0272': { type: 'deadkey', deadkey: 'dk_extended_latin', key: 'KeyJ', layer: 'Base' },
  '\u019D': { type: 'deadkey', deadkey: 'dk_extended_latin', key: 'KeyJ', layer: 'Shift' },
  '\u0269': { type: 'deadkey', deadkey: 'dk_extended_latin', key: 'KeyI', layer: 'Base' },
  '\u0196': { type: 'deadkey', deadkey: 'dk_extended_latin', key: 'KeyI', layer: 'Shift' },
  '\u0188': { type: 'deadkey', deadkey: 'dk_hook', key: 'KeyC', layer: 'Base' },
  '\u0187': { type: 'deadkey', deadkey: 'dk_hook', key: 'KeyC', layer: 'Shift' },
  '\u01A5': { type: 'deadkey', deadkey: 'dk_hook', key: 'KeyP', layer: 'Base' },
  '\u01A4': { type: 'deadkey', deadkey: 'dk_hook', key: 'KeyP', layer: 'Shift' },
  '\u02BC': { type: 'deadkey', deadkey: 'dk_acute', key: 'Digit4', layer: 'Base' },
  '\u2116': { type: 'deadkey', deadkey: 'dk_misc_symbols', key: 'Backquote', layer: 'Base' },
  '\u2209': { type: 'deadkey', deadkey: 'dk_scientific', key: 'KeyE', layer: 'AltGr' },
  '\u2286': { type: 'deadkey', deadkey: 'dk_scientific', key: 'KeyJ', layer: 'AltGr' },
  '\u2287': { type: 'deadkey', deadkey: 'dk_scientific', key: 'KeyK', layer: 'AltGr' }
};

const MANUAL_METADATA = {
  '\u02BB': {
    unicodeName: 'MODIFIER LETTER TURNED COMMA',
    unicodeNameFr: 'LETTRE MODIFICATIVE VIRGULE RENVERSÉE',
    frenchAliases: ['virgule culbutée', 'okina'],
    englishAliases: ['turned comma', 'okina']
  },
  '\u02BC': {
    unicodeName: 'MODIFIER LETTER APOSTROPHE',
    unicodeNameFr: 'LETTRE MODIFICATIVE APOSTROPHE',
    frenchAliases: ['apostrophe modificative'],
    englishAliases: ['modifier apostrophe']
  },
  '\u0402': {
    unicodeName: 'CYRILLIC CAPITAL LETTER DJE',
    unicodeNameFr: 'CYRILLIQUE MAJUSCULE DJÉ',
    frenchAliases: ['dje majuscule'],
    englishAliases: ['dje capital']
  },
  '\u040B': {
    unicodeName: 'CYRILLIC CAPITAL LETTER TSHE',
    unicodeNameFr: 'CYRILLIQUE MAJUSCULE TCHÉ',
    frenchAliases: ['tshe majuscule', 'tché majuscule'],
    englishAliases: ['tshe capital']
  },
  '\u040F': {
    unicodeName: 'CYRILLIC CAPITAL LETTER DZHE',
    unicodeNameFr: 'CYRILLIQUE MAJUSCULE DJÉ MACÉDONIEN',
    frenchAliases: ['dzhe majuscule'],
    englishAliases: ['dzhe capital']
  },
  '\u045B': {
    unicodeName: 'CYRILLIC SMALL LETTER TSHE',
    unicodeNameFr: 'CYRILLIQUE MINUSCULE TCHÉ',
    frenchAliases: ['tshe minuscule', 'tché minuscule'],
    englishAliases: ['tshe']
  },
  '\u045F': {
    unicodeName: 'CYRILLIC SMALL LETTER DZHE',
    unicodeNameFr: 'CYRILLIQUE MINUSCULE DJÉ MACÉDONIEN',
    frenchAliases: ['dzhe minuscule'],
    englishAliases: ['dzhe']
  }
};

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function writeJSON(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function valueOrNull(value) {
  return value === undefined ? null : value;
}

function isSingleCharacter(value) {
  return typeof value === 'string' && !value.startsWith('dk_') && [...value].length === 1;
}

function buildKeymap(finalData, existingTester) {
  const keymap = {};

  for (const row of finalData.rows) {
    for (const key of row.keys) {
      const code = POS_TO_CODE[key.position];
      if (!code) continue;

      const base = valueOrNull(key.base);
      const shift = valueOrNull(key.shift);
      const altGr = valueOrNull(key.alt_gr);
      const shiftAltGr = valueOrNull(key.shift_alt_gr);
      const caps = hasOwn(key, 'caps') ? key.caps : base;
      const capsShift = hasOwn(key, 'caps_shift') ? key.caps_shift : shift;
      const capsAltGr = hasOwn(key, 'caps_alt_gr') ? key.caps_alt_gr : altGr;
      const capsShiftAltGr = hasOwn(key, 'caps_shift_alt_gr') ? key.caps_shift_alt_gr : shiftAltGr;

      keymap[code] = [base, shift, caps, capsShift, altGr, shiftAltGr, capsAltGr, capsShiftAltGr];
    }
  }

  for (const [key, value] of Object.entries(existingTester.keymap || {})) {
    if (key.startsWith('Numpad')) keymap[key] = value;
  }

  return keymap;
}

function buildDeadkeys(finalData) {
  const deadkeys = {};
  for (const [name, data] of Object.entries(finalData.dead_keys || {})) {
    deadkeys[name] = data.table || {};
  }
  return deadkeys;
}

function addMethod(map, char, method) {
  if (!isSingleCharacter(char)) return;
  const key = JSON.stringify(method);
  if (!map.has(char)) map.set(char, new Map());
  map.get(char).set(key, method);
}

function buildDirectAndActivationMethods(finalData) {
  const directMethods = new Map();
  const activationMethods = new Map();
  const symbolActivationMethods = new Map();

  for (const row of finalData.rows) {
    for (const key of row.keys) {
      const code = POS_TO_CODE[key.position];
      if (!code) continue;

      const layerValues = {
        base: valueOrNull(key.base),
        shift: valueOrNull(key.shift),
        caps: hasOwn(key, 'caps') ? key.caps : valueOrNull(key.base),
        caps_shift: hasOwn(key, 'caps_shift') ? key.caps_shift : valueOrNull(key.shift),
        alt_gr: valueOrNull(key.alt_gr),
        shift_alt_gr: valueOrNull(key.shift_alt_gr),
        caps_alt_gr: hasOwn(key, 'caps_alt_gr') ? key.caps_alt_gr : valueOrNull(key.alt_gr),
        caps_shift_alt_gr: hasOwn(key, 'caps_shift_alt_gr') ? key.caps_shift_alt_gr : valueOrNull(key.shift_alt_gr)
      };

      for (const { prop, layer } of LAYERS) {
        const value = layerValues[prop];
        if (typeof value === 'string' && value.startsWith('dk_')) {
          const method = { type: 'deadkey_activation', deadkey: value, key: code, layer };
          if (!activationMethods.has(value)) activationMethods.set(value, []);
          activationMethods.get(value).push(method);

          const symbol = DEAD_KEY_SYMBOLS[value];
          if (symbol) {
            if (!symbolActivationMethods.has(symbol)) symbolActivationMethods.set(symbol, []);
            symbolActivationMethods.get(symbol).push({ type: 'direct', key: code, layer });
          }
        } else {
          addMethod(directMethods, value, { type: 'direct', key: code, layer });
        }
      }
    }
  }

  return { directMethods, activationMethods, symbolActivationMethods };
}

function methodRank(method) {
  const layerRank = {
    Base: 0,
    Shift: 1,
    AltGr: 2,
    'Shift+AltGr': 3,
    Caps: 4,
    'Caps+Shift': 5,
    'Caps+AltGr': 6,
    'Caps+Shift+AltGr': 7
  };
  return layerRank[method.layer] ?? 99;
}

function matchesMethod(method, expected) {
  return Object.entries(expected).every(([key, value]) => method[key] === value);
}

function markRecommended(char, methods) {
  const sorted = [...methods].sort((a, b) => methodRank(a) - methodRank(b));
  let recommendedIndex = 0;
  const explicitRecommended = RECOMMENDED_METHOD_OVERRIDES[char];

  if (explicitRecommended) {
    const preferred = sorted.findIndex(method => matchesMethod(method, explicitRecommended));
    if (preferred >= 0) recommendedIndex = preferred;
  } else if (char === '#') {
    const backquoteShift = sorted.findIndex(m => m.type === 'direct' && m.key === 'Backquote' && m.layer === 'Shift');
    if (backquoteShift >= 0) recommendedIndex = backquoteShift;
  } else {
    const directNonCaps = sorted.findIndex(m => m.type === 'direct' && !String(m.layer).startsWith('Caps'));
    const directAny = sorted.findIndex(m => m.type === 'direct');
    const nonCaps = sorted.findIndex(m => !String(m.layer).startsWith('Caps'));
    if (directNonCaps >= 0) recommendedIndex = directNonCaps;
    else if (directAny >= 0) recommendedIndex = directAny;
    else if (nonCaps >= 0) recommendedIndex = nonCaps;
  }

  return sorted.map((method, index) => (
    index === recommendedIndex ? { ...method, recommended: true } : { ...method }
  ));
}

function metadataForCharacter(char, existingCharacters) {
  const existing = existingCharacters[char] || {};
  const { methods, ...metadata } = existing;
  const override = CHARACTER_METADATA_OVERRIDES[char] || {};
  const manual = MANUAL_METADATA[char] || {};
  const codePoint = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;

  return {
    codePoint: override.codePoint || metadata.codePoint || manual.codePoint || codePoint,
    unicodeName: override.unicodeName || metadata.unicodeName || manual.unicodeName || codePoint,
    unicodeNameFr: override.unicodeNameFr || metadata.unicodeNameFr || manual.unicodeNameFr || metadata.unicodeName || manual.unicodeName || codePoint,
    ...(override.frenchAliases || metadata.frenchAliases || manual.frenchAliases
      ? { frenchAliases: override.frenchAliases || metadata.frenchAliases || manual.frenchAliases }
      : {}),
    ...(override.englishAliases || metadata.englishAliases || manual.englishAliases
      ? { englishAliases: override.englishAliases || metadata.englishAliases || manual.englishAliases }
      : {}),
    ...(metadata.displayChar ? { displayChar: metadata.displayChar } : {})
  };
}

function metadataForDeadkey(dkName, existingCharacters) {
  const colonName = `dk:${dkName.slice(3)}`;
  const existing = existingCharacters[colonName] || {};
  const { methods, ...metadata } = existing;
  const displayChar = metadata.displayChar || DEAD_KEY_SYMBOLS[dkName] || '◌';
  const frName = DEAD_KEY_NAMES_FR[dkName] || dkName.replace(/^dk_/, '').replace(/_/g, ' ').toUpperCase();

  return {
    codePoint: 'DEAD_KEY',
    unicodeName: metadata.unicodeName || `${dkName.slice(3).replace(/_/g, ' ').toUpperCase()} (dead key)`,
    unicodeNameFr: `${frName} (TOUCHE MORTE)`,
    displayChar
  };
}

function buildCharacterIndex(finalData, existingIndex) {
  const existingCharacters = existingIndex.characters || {};
  const { directMethods, activationMethods, symbolActivationMethods } = buildDirectAndActivationMethods(finalData);
  const deadkeys = buildDeadkeys(finalData);
  const allMethods = new Map();

  for (const [char, methods] of directMethods.entries()) {
    if (!allMethods.has(char)) allMethods.set(char, []);
    allMethods.get(char).push(...methods.values());
  }

  for (const [dkName, table] of Object.entries(deadkeys)) {
    const activation = activationMethods.get(dkName) || [];
    const colonName = `dk:${dkName.slice(3)}`;
    allMethods.set(colonName, activation);

    for (const [trigger, result] of Object.entries(table)) {
      if (!isSingleCharacter(result)) continue;
      const triggerMethods = [
        ...((directMethods.get(trigger) && [...directMethods.get(trigger).values()]) || []),
        ...(symbolActivationMethods.get(trigger) || [])
      ];
      if (!allMethods.has(result)) allMethods.set(result, []);
      for (const method of triggerMethods) {
        allMethods.get(result).push({
          type: 'deadkey',
          deadkey: dkName,
          key: method.key,
          layer: method.layer
        });
      }
    }
  }

  const characters = {};
  const sortedKeys = [...allMethods.keys()].sort((a, b) => {
    const aDead = a.startsWith('dk:');
    const bDead = b.startsWith('dk:');
    if (aDead !== bDead) return aDead ? 1 : -1;
    if (aDead && bDead) return a.localeCompare(b);
    return a.codePointAt(0) - b.codePointAt(0);
  });

  for (const char of sortedKeys) {
    const methods = allMethods.get(char) || [];
    if (char.startsWith('dk:')) {
      const dkName = `dk_${char.slice(3)}`;
      characters[char] = {
        ...metadataForDeadkey(dkName, existingCharacters),
        methods: markRecommended(char, methods)
      };
    } else {
      characters[char] = {
        ...metadataForCharacter(char, existingCharacters),
        methods: markRecommended(char, methods)
      };
    }
  }

  return {
    characters,
    generated: new Date().toISOString(),
    totalCharacters: Object.keys(characters).length
  };
}

function main() {
  const finalData = readJSON(FINAL_PATH);
  const existingTester = readJSON(TESTER_LAYOUT_PATH);
  const existingIndex = readJSON(CHARACTER_INDEX_PATH);

  const testerData = {
    name: existingTester.name || 'azerty-global',
    version: finalData.version || existingTester.version || '2026',
    geometry: existingTester.geometry || 'iso',
    capslock: existingTester.capslock !== false,
    altgr: existingTester.altgr !== false,
    keymap: buildKeymap(finalData, existingTester),
    deadkeys: buildDeadkeys(finalData)
  };

  const characterIndex = buildCharacterIndex(finalData, existingIndex);

  writeJSON(TESTER_LAYOUT_PATH, testerData);
  writeJSON(CHARACTER_INDEX_PATH, characterIndex);

  console.log(`Generated ${path.relative(SITE_ROOT, TESTER_LAYOUT_PATH)}`);
  console.log(`Generated ${path.relative(SITE_ROOT, CHARACTER_INDEX_PATH)} (${characterIndex.totalCharacters} entries)`);
}

if (require.main === module) {
  main();
}
