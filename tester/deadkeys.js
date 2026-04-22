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
  dk_horn: 'Corne',
  dk_hook: 'Crochet',
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
  'ə': 'Touche morte latin étendu'
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
