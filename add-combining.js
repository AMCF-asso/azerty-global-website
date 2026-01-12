/**
 * Add missing characters to character-index.json
 */
const fs = require('fs');

const charIndex = JSON.parse(fs.readFileSync('tester/character-index.json', 'utf8'));
const characters = charIndex.characters || charIndex;

// Missing combining diacriticals from dead keys
const combiningDiacriticals = {
  '\u0302': { name: 'COMBINING CIRCUMFLEX ACCENT', nameFr: 'ACCENT CIRCONFLEXE COMBINANT', dk: 'dk_circumflex', trigger: '^' },
  '\u0308': { name: 'COMBINING DIAERESIS', nameFr: 'TRÉMA COMBINANT', dk: 'dk_diaeresis', trigger: '¨' },
  '\u0301': { name: 'COMBINING ACUTE ACCENT', nameFr: 'ACCENT AIGU COMBINANT', dk: 'dk_acute', trigger: '´' },
  '\u0300': { name: 'COMBINING GRAVE ACCENT', nameFr: 'ACCENT GRAVE COMBINANT', dk: 'dk_grave', trigger: '`' },
  '\u0303': { name: 'COMBINING TILDE', nameFr: 'TILDE COMBINANT', dk: 'dk_tilde', trigger: '~' },
  '\u0307': { name: 'COMBINING DOT ABOVE', nameFr: 'POINT EN CHEF COMBINANT', dk: 'dk_dot_above', trigger: '˙' },
  '\u0323': { name: 'COMBINING DOT BELOW', nameFr: 'POINT SOUSCRIT COMBINANT', dk: 'dk_dot_below', trigger: '̣' },
  '\u030B': { name: 'COMBINING DOUBLE ACUTE ACCENT', nameFr: 'DOUBLE ACCENT AIGU COMBINANT', dk: 'dk_double_acute', trigger: '˝' },
  '\u030F': { name: 'COMBINING DOUBLE GRAVE ACCENT', nameFr: 'DOUBLE ACCENT GRAVE COMBINANT', dk: 'dk_double_grave', trigger: '̏' },
  '\u031B': { name: 'COMBINING HORN', nameFr: 'CORNU COMBINANT', dk: 'dk_horn', trigger: '̛' },
  '\u0309': { name: 'COMBINING HOOK ABOVE', nameFr: 'CROCHET EN CHEF COMBINANT', dk: 'dk_hook', trigger: '̉' },
  '\u030C': { name: 'COMBINING CARON', nameFr: 'CARON COMBINANT', dk: 'dk_caron', trigger: 'ˇ' },
  '\u0328': { name: 'COMBINING OGONEK', nameFr: 'OGONEK COMBINANT', dk: 'dk_ogonek', trigger: '˛' },
  '\u0306': { name: 'COMBINING BREVE', nameFr: 'BRÈVE COMBINANT', dk: 'dk_breve', trigger: '˘' },
  '\u0311': { name: 'COMBINING INVERTED BREVE', nameFr: 'BRÈVE RENVERSÉE COMBINANT', dk: 'dk_inverted_breve', trigger: '̑' },
  '\u0337': { name: 'COMBINING SHORT SOLIDUS OVERLAY', nameFr: 'BARRE OBLIQUE COURTE COMBINANT', dk: 'dk_stroke', trigger: '/' },
  '\u0336': { name: 'COMBINING LONG STROKE OVERLAY', nameFr: 'BARRE HORIZONTALE COMBINANT', dk: 'dk_horizontal_stroke', trigger: '-' },
  '\u0304': { name: 'COMBINING MACRON', nameFr: 'MACRON COMBINANT', dk: 'dk_macron', trigger: '¯' }, 
  '\u0331': { name: 'COMBINING MACRON BELOW', nameFr: 'MACRON SOUSCRIT COMBINANT', dk: 'dk_macron', trigger: '_' },
  '\u0305': { name: 'COMBINING OVERLINE', nameFr: 'MACRON EN CHEF COMBINANT', dk: 'dk_macron', trigger: '8' },
  '\u0327': { name: 'COMBINING CEDILLA', nameFr: 'CÉDILLE COMBINANT', dk: 'dk_cedilla', trigger: '¸' },
  '\u0326': { name: 'COMBINING COMMA BELOW', nameFr: 'VIRGULE SOUSCRITE COMBINANT', dk: 'dk_comma', trigger: '̦' },
  '\u030A': { name: 'COMBINING RING ABOVE', nameFr: 'ROND EN CHEF COMBINANT', dk: 'dk_ring_above', trigger: '˚' },
  '\u032D': { name: 'COMBINING CIRCUMFLEX ACCENT BELOW', nameFr: 'ACCENT CIRCONFLEXE SOUSCRIT COMBINANT', dk: 'dk_extended_latin', trigger: '^' },
  '\u0324': { name: 'COMBINING DIAERESIS BELOW', nameFr: 'TRÉMA SOUSCRIT COMBINANT', dk: 'dk_extended_latin', trigger: '¨' },
  '\u032C': { name: 'COMBINING CARON BELOW', nameFr: 'CARON SOUSCRIT COMBINANT', dk: 'dk_extended_latin', trigger: 'ˇ' },
  '\u032E': { name: 'COMBINING BREVE BELOW', nameFr: 'BRÈVE SOUSCRITE COMBINANT', dk: 'dk_extended_latin', trigger: '˘' },
  '\u0325': { name: 'COMBINING RING BELOW', nameFr: 'ROND SOUSCRIT COMBINANT', dk: 'dk_extended_latin', trigger: '˚' },
  '\u0330': { name: 'COMBINING TILDE BELOW', nameFr: 'TILDE SOUSCRIT COMBINANT', dk: 'dk_extended_latin', trigger: '~' },
  '\u031A': { name: 'COMBINING LEFT ANGLE ABOVE', nameFr: 'ANGLE GAUCHE EN CHEF COMBINANT', dk: 'dk_phonetic', trigger: '=' },
  '\u032F': { name: 'COMBINING INVERTED BREVE BELOW', nameFr: 'BRÈVE RENVERSÉE SOUSCRITE COMBINANT', dk: 'dk_phonetic', trigger: '˘' },
  '\u0329': { name: 'COMBINING VERTICAL LINE BELOW', nameFr: 'LIGNE VERTICALE SOUSCRITE COMBINANT', dk: 'dk_phonetic', trigger: '|' },
};

// Missing mathematical operators (dk_scientific)
const mathOperators = {
  '\u2227': { name: 'LOGICAL AND', nameFr: 'ET LOGIQUE', desc: 'dk_scientific + ^' },
  '\u2228': { name: 'LOGICAL OR', nameFr: 'OU LOGIQUE', desc: 'dk_scientific + ¨' },
};

// Missing punctuation
const punctuation = {
  '\u2038': { name: 'CARET', nameFr: 'SIGNE D\'INSERTION', desc: 'dk_punctuation + ^' },
};

let added = 0;

// Add combining diacriticals
for (const [char, data] of Object.entries(combiningDiacriticals)) {
  if (!characters[char]) {
    const cp = char.codePointAt(0);
    characters[char] = {
      codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      unicodeName: data.name,
      unicodeNameFr: data.nameFr,
      frenchAliases: ['diacritique combinant'],
      methods: [{
        type: 'deadkey',
        deadkey: data.dk,
        key: 'Space', // Approximate - combining chars are via dead key + symbol
        layer: 'Base',
        recommended: true
      }]
    };
    added++;
  }
}

// Add mathematical operators
for (const [char, data] of Object.entries(mathOperators)) {
  if (!characters[char]) {
    const cp = char.codePointAt(0);
    const keyInfo = char === '\u2227' ? { key: 'BracketLeft', layer: 'Base' } : { key: 'BracketLeft', layer: 'Shift' };
    characters[char] = {
      codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      unicodeName: data.name,
      unicodeNameFr: data.nameFr,
      frenchAliases: [],
      methods: [{
        type: 'deadkey',
        deadkey: 'dk_scientific',
        key: keyInfo.key,
        layer: keyInfo.layer,
        recommended: true
      }]
    };
    added++;
  }
}

// Add punctuation
for (const [char, data] of Object.entries(punctuation)) {
  if (!characters[char]) {
    const cp = char.codePointAt(0);
    characters[char] = {
      codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      unicodeName: data.name,
      unicodeNameFr: data.nameFr,
      frenchAliases: [],
      methods: [{
        type: 'deadkey',
        deadkey: 'dk_punctuation',
        key: 'BracketLeft',
        layer: 'Base',
        recommended: true
      }]
    };
    added++;
  }
}

// Sort by code point
const sortedChars = {};
const sortedKeys = Object.keys(characters).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
for (const key of sortedKeys) {
  sortedChars[key] = characters[key];
}

// Write back
const output = charIndex.characters ? { ...charIndex, characters: sortedChars } : sortedChars;
fs.writeFileSync('tester/character-index.json', JSON.stringify(output, null, 4));

console.log(`Added ${added} missing characters to character-index.json`);
