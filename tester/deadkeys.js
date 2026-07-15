// Source unique des tables de touches mortes du testeur.
// Convention interne : clés "dk_xxx". Le character-index.json utilise "dk:xxx"
// — utiliser toDeadKeyUnderscore/toDeadKeyColon pour convertir si besoin.
// Note: dk_greek = 'µ' (U+00B5 MICRO SIGN), source de vérité azerty-global.json:1317.

export const DEAD_KEY_SYMBOLS = {
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
  dk_hook: '̉',
  dk_horn: '̛',
  dk_comma: ',',
  dk_dot_below: '.',
  dk_double_grave: '̏',
  dk_inverted_breve: '̑',
  dk_greek: 'µ',
  dk_cyrillic: 'я',
  dk_punctuation: '§',
  dk_currencies: '¤',
  dk_scientific: '±',
  dk_misc_symbols: '→',
  dk_phonetic: 'ʁ',
  dk_extended_latin: 'ə'
};

export const DEAD_KEY_NAMES_FR = {
  dk_circumflex: 'Circonflexe',
  dk_diaeresis: 'Tréma',
  dk_acute: 'Accent aigu',
  dk_grave: 'Accent grave',
  dk_tilde: 'Tilde',
  dk_dot_above: 'Point en chef',
  dk_dot_below: 'Point souscrit',
  dk_double_acute: 'Double accent aigu',
  dk_double_grave: 'Double accent grave',
  dk_horn: 'Cornu',
  dk_hook: 'Crochet en chef',
  dk_caron: 'Caron',
  dk_ogonek: 'Ogonek',
  dk_breve: 'Brève',
  dk_inverted_breve: 'Brève inversée',
  dk_stroke: 'Barre oblique',
  dk_horizontal_stroke: 'Barre horizontale',
  dk_macron: 'Macron',
  dk_extended_latin: 'Latin étendu',
  dk_cedilla: 'Cédille',
  dk_comma: 'Virgule souscrite',
  dk_phonetic: 'Alphabet phonétique',
  dk_ring_above: 'Rond en chef',
  dk_greek: 'Alphabet grec',
  dk_cyrillic: 'Alphabet cyrillique',
  dk_misc_symbols: 'Symboles divers',
  dk_scientific: 'Symboles scientifiques',
  dk_currencies: 'Symboles monétaires',
  dk_punctuation: 'Symboles de ponctuation'
};

// Noms anglais validés — copie de DeadKeyNamesEn (app v1.1.0, L.Keyboard.cs).
export const DEAD_KEY_NAMES_EN = {
  dk_circumflex: 'Circumflex',
  dk_diaeresis: 'Diaeresis',
  dk_acute: 'Acute accent',
  dk_grave: 'Grave accent',
  dk_tilde: 'Tilde',
  dk_dot_above: 'Dot above',
  dk_dot_below: 'Dot below',
  dk_double_acute: 'Double acute',
  dk_double_grave: 'Double grave',
  dk_horn: 'Horn',
  dk_hook: 'Hook above',
  dk_caron: 'Caron',
  dk_ogonek: 'Ogonek',
  dk_breve: 'Breve',
  dk_inverted_breve: 'Inverted breve',
  dk_stroke: 'Stroke',
  dk_horizontal_stroke: 'Horizontal stroke',
  dk_macron: 'Macron',
  dk_extended_latin: 'Extended Latin',
  dk_cedilla: 'Cedilla',
  dk_comma: 'Comma below',
  dk_phonetic: 'Phonetic alphabet',
  dk_ring_above: 'Ring above',
  dk_greek: 'Greek alphabet',
  dk_cyrillic: 'Cyrillic alphabet',
  dk_misc_symbols: 'Miscellaneous symbols',
  dk_scientific: 'Scientific symbols',
  dk_currencies: 'Currency symbols',
  dk_punctuation: 'Punctuation symbols'
};

// Note : ces noms sont utilisés UNIQUEMENT par tester-search.js, qui ne consulte
// cette table que si l'élément a la classe CSS `dead-key`. On peut donc inclure
// des symboles partagés avec des caractères normaux ('.', ',', '/') sans risque
// de faux positifs sur les touches non-dead-key.
export const DEAD_KEY_SYMBOL_NAMES = {
  '^': 'Touche morte circonflexe',
  '¨': 'Touche morte tréma',
  '´': 'Touche morte accent aigu',
  '`': 'Touche morte accent grave',
  '~': 'Touche morte tilde',
  'ˇ': 'Touche morte caron',
  '˛': 'Touche morte ogonek',
  '˙': 'Touche morte point en chef',
  '˝': 'Touche morte double accent aigu',
  '˘': 'Touche morte brève',
  '¯': 'Touche morte macron',
  '¸': 'Touche morte cédille',
  '˚': 'Touche morte rond en chef',
  '¤': 'Touche morte monnaies',
  '±': 'Touche morte scientifique',
  '→': 'Touche morte symboles divers',
  'µ': 'Touche morte grec',
  'я': 'Touche morte cyrillique',
  '§': 'Touche morte ponctuation',
  'ʁ': 'Touche morte phonétique',
  'ə': 'Touche morte latin étendu',
  // Symboles partagés (cf. note ci-dessus) — alignés sur DEAD_KEY_SYMBOLS
  '.': 'Touche morte point souscrit',
  ',': 'Touche morte virgule souscrite',
  '/': 'Touche morte barre oblique',
  '−': 'Touche morte barre horizontale',
  '̏': 'Touche morte double accent grave',
  '̛': 'Touche morte corne',
  '̉': 'Touche morte crochet en chef',
  '̑': 'Touche morte brève inversée'
};

// Équivalent anglais de DEAD_KEY_SYMBOL_NAMES — mêmes clés, même ordre.
export const DEAD_KEY_SYMBOL_NAMES_EN = {
  '^': 'Circumflex dead key',
  '¨': 'Diaeresis dead key',
  '´': 'Acute accent dead key',
  '`': 'Grave accent dead key',
  '~': 'Tilde dead key',
  'ˇ': 'Caron dead key',
  '˛': 'Ogonek dead key',
  '˙': 'Dot above dead key',
  '˝': 'Double acute dead key',
  '˘': 'Breve dead key',
  '¯': 'Macron dead key',
  '¸': 'Cedilla dead key',
  '˚': 'Ring above dead key',
  '¤': 'Currency symbols dead key',
  '±': 'Scientific symbols dead key',
  '→': 'Miscellaneous symbols dead key',
  'µ': 'Greek alphabet dead key',
  'я': 'Cyrillic alphabet dead key',
  '§': 'Punctuation symbols dead key',
  'ʁ': 'Phonetic alphabet dead key',
  'ə': 'Extended Latin dead key',
  '.': 'Dot below dead key',
  ',': 'Comma below dead key',
  '/': 'Stroke dead key',
  '−': 'Horizontal stroke dead key',
  '̏': 'Double grave dead key',
  '̛': 'Horn dead key',
  '̉': 'Hook above dead key',
  '̑': 'Inverted breve dead key'
};

export function toDeadKeyColon(dkName) {
  return typeof dkName === 'string' && dkName.startsWith('dk_')
    ? 'dk:' + dkName.slice(3)
    : dkName;
}

export function toDeadKeyUnderscore(dkName) {
  return typeof dkName === 'string' && dkName.startsWith('dk:')
    ? 'dk_' + dkName.slice(3)
    : dkName;
}

export function getDeadKeySymbol(dkName, deadkeys) {
  const k = toDeadKeyUnderscore(dkName);
  if (DEAD_KEY_SYMBOLS[k]) return DEAD_KEY_SYMBOLS[k];
  if (deadkeys && deadkeys[k]) {
    return deadkeys[k]['\u0020'] || deadkeys[k][' '] || '\u25cc';
  }
  return '\u25cc';
}
