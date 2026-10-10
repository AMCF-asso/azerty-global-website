/**
 * Touches mortes — symbole affiché et nom français, source unique.
 *
 * Extrait de scripts/generate-tester-data.js le 2026-08-30, sans changer une
 * seule valeur, pour que le testeur v1 et le composant clavier v2
 * (src/_data/clavier.js) gravent le même symbole sur la même touche. Deux
 * tables recopiées auraient divergé au premier ajout de touche morte.
 *
 * Les clés sont les marqueurs `dk_*` des définitions de data/*.json.
 */
'use strict';

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
  dk_hook: '̉',
  dk_horn: '̛',
  dk_comma: ',',
  dk_dot_below: '.',
  dk_double_grave: '̏',
  dk_inverted_breve: '̑',
  dk_greek: 'µ',
  dk_cyrillic: 'я',
  dk_cyrillic_ext: 'ө',
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
  dk_stroke: 'BARRE DIAGONALE',
  dk_horizontal_stroke: 'BARRE HORIZONTALE',
  dk_macron: 'MACRON',
  dk_extended_latin: 'LATIN ÉTENDU',
  dk_cedilla: 'CÉDILLE',
  dk_comma: 'VIRGULE SOUSCRITE',
  dk_phonetic: 'ALPHABET PHONÉTIQUE',
  dk_ring_above: 'ROND EN CHEF',
  dk_greek: 'ALPHABET GREC',
  dk_cyrillic: 'ALPHABET CYRILLIQUE',
  dk_cyrillic_ext: 'CYRILLIQUE ÉTENDU',
  dk_misc_symbols: 'SYMBOLES DIVERS',
  dk_scientific: 'SYMBOLES SCIENTIFIQUES',
  dk_currencies: 'SYMBOLES MONÉTAIRES',
  dk_punctuation: 'SYMBOLES DE PONCTUATION'
};

/* Noms anglais (anglais américain, décision du 2026-08-31), pour la page
   /en/guide. Repris des bulles v1 (data/keyboard-hotspots.json, deadNameEn)
   et des noms Unicode usuels. ⚠️ Écrits en casse de phrase, et non en
   capitales comme les noms français : « Greek », « Cyrillic » et « Latin »
   gardent leur majuscule en anglais, qu'une mise en minuscules effacerait. */
const DEAD_KEY_NAMES_EN = {
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
  dk_cyrillic_ext: 'Extended Cyrillic',
  dk_misc_symbols: 'Miscellaneous symbols',
  dk_scientific: 'Scientific symbols',
  dk_currencies: 'Currency symbols',
  dk_punctuation: 'Punctuation symbols'
};

/** Un marqueur de touche morte, ou un caractère ordinaire ? */
function estToucheMorte(valeur) {
  return typeof valeur === 'string' && valeur.startsWith('dk_');
}

module.exports = { DEAD_KEY_SYMBOLS, DEAD_KEY_NAMES_FR, DEAD_KEY_NAMES_EN, estToucheMorte };
