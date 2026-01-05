/**
 * Generate Character Index for AZERTY Global
 * 
 * This script extracts all characters from azerty-global.json,
 * gets their Unicode names, and creates an index sorted by code point.
 * 
 * Usage: node generate-character-index.js
 */

const fs = require('fs');
const path = require('path');

// Load layout file
const layoutPath = path.join(__dirname, 'azerty-global.json');
const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));

// Layer names for reference
const LAYERS = ['Base', 'Shift', 'Caps', 'Caps+Shift', 'AltGr', 'Shift+AltGr', 'Caps+AltGr', 'Caps+Shift+AltGr'];

// Try to load unicode-name package, fallback to basic function if not available
let getUnicodeName;
try {
  const { unicodeName } = require('unicode-name');
  getUnicodeName = (char) => {
    try {
      return unicodeName(char) || null;
    } catch {
      return null;
    }
  };
} catch {
  console.log('Note: unicode-name package not installed. Run: npm install unicode-name');
  console.log('Using basic Unicode info only.\n');
  getUnicodeName = () => null;
}

// English to French translation table for Unicode terms
const UNICODE_TRANSLATIONS = {
  // Basic structure
  'LATIN': 'LATINE',
  'CAPITAL': 'MAJUSCULE',
  'SMALL': 'MINUSCULE',
  'LETTER': 'LETTRE',
  'DIGIT': 'CHIFFRE',
  'NUMBER': 'NOMBRE',
  'NUMERAL': 'CHIFFRE',
  
  // Diacritics
  'WITH': 'AVEC',
  'AND': 'ET',
  'ABOVE': 'SUSCRIT',
  'BELOW': 'SOUSCRIT',
  'ACUTE': 'AIGU',
  'GRAVE': 'GRAVE',
  'CIRCUMFLEX': 'CIRCONFLEXE',
  'DIAERESIS': 'TRÉMA',
  'TILDE': 'TILDE',
  'CEDILLA': 'CÉDILLE',
  'MACRON': 'MACRON',
  'BREVE': 'BRÈVE',
  'DOT': 'POINT',
  'RING': 'ROND',
  'CARON': 'CARON',
  'OGONEK': 'OGONEK',
  'HOOK': 'CROCHET',
  'HORN': 'CORNET',
  'STROKE': 'BARRE',
  'SLASH': 'BARRE OBLIQUE',
  'DOUBLE': 'DOUBLE',
  'INVERTED': 'RENVERSÉ',
  'ACCENT': 'ACCENT',
  'COMBINING': 'COMBINATOIRE',
  
  // Common characters
  'SPACE': 'ESPACE',
  'NO-BREAK': 'INSÉCABLE',
  'NARROW': 'FINE',
  'APOSTROPHE': 'APOSTROPHE',
  'QUOTATION': 'GUILLEMET',
  'MARK': 'SIGNE',
  'SIGN': 'SIGNE',
  'SYMBOL': 'SYMBOLE',
  'POINT': 'POINT',
  'COMMA': 'VIRGULE',
  'COLON': 'DEUX-POINTS',
  'SEMICOLON': 'POINT-VIRGULE',
  'EXCLAMATION': 'EXCLAMATION',
  'QUESTION': 'INTERROGATION',
  'HYPHEN': 'TRAIT D\'UNION',
  'MINUS': 'MOINS',
  'PLUS': 'PLUS',
  'EQUALS': 'ÉGAL',
  'DASH': 'TIRET',
  'PARENTHESIS': 'PARENTHÈSE',
  'BRACKET': 'CROCHET',
  'BRACE': 'ACCOLADE',
  'LEFT': 'GAUCHE',
  'RIGHT': 'DROITE',
  'OPENING': 'OUVRANT',
  'CLOSING': 'FERMANT',
  'SINGLE': 'SIMPLE',
  'LOW': 'BAS',
  'HIGH': 'HAUT',
  'TURNED': 'RETOURNÉ',
  'REVERSED': 'INVERSÉ',
  'MODIFIER': 'MODIFICATEUR',
  'SUPERSCRIPT': 'EXPOSANT',
  'SUBSCRIPT': 'INDICE',
  
  // Currencies
  'EURO': 'EURO',
  'POUND': 'LIVRE',
  'STERLING': 'STERLING',
  'DOLLAR': 'DOLLAR',
  'CENT': 'CENTIME',
  'YEN': 'YEN',
  'CURRENCY': 'MONNAIE',
  
  // Math
  'MULTIPLICATION': 'MULTIPLICATION',
  'DIVISION': 'DIVISION',
  'INFINITY': 'INFINI',
  'INTEGRAL': 'INTÉGRALE',
  'PARTIAL': 'PARTIELLE',
  'DIFFERENTIAL': 'DIFFÉRENTIELLE',
  'SUMMATION': 'SOMMATION',
  'PRODUCT': 'PRODUIT',
  'SQUARE': 'CARRÉ',
  'ROOT': 'RACINE',
  'EMPTY': 'VIDE',
  'SET': 'ENSEMBLE',
  'ELEMENT': 'ÉLÉMENT',
  'UNION': 'UNION',
  'INTERSECTION': 'INTERSECTION',
  'SUBSET': 'SOUS-ENSEMBLE',
  'SUPERSET': 'SUR-ENSEMBLE',
  'NOT': 'NON',
  'EQUAL': 'ÉGAL',
  'LESS-THAN': 'INFÉRIEUR À',
  'GREATER-THAN': 'SUPÉRIEUR À',
  'APPROXIMATELY': 'APPROXIMATIVEMENT',
  'EQUIVALENT': 'ÉQUIVALENT',
  'ANGLE': 'ANGLE',
  'PERPENDICULAR': 'PERPENDICULAIRE',
  'PARALLEL': 'PARALLÈLE',
  'DEGREE': 'DEGRÉ',
  'MICRO': 'MICRO',
  'PER': 'POUR',
  'MILLE': 'MILLE',
  'PRIME': 'PRIME',
  'THEREFORE': 'DONC',
  'BECAUSE': 'PARCE QUE',
  
  // Arrows
  'ARROW': 'FLÈCHE',
  'LEFTWARDS': 'VERS LA GAUCHE',
  'RIGHTWARDS': 'VERS LA DROITE',
  'UPWARDS': 'VERS LE HAUT',
  'DOWNWARDS': 'VERS LE BAS',
  'UP DOWN': 'HAUT BAS',
  'LEFT RIGHT': 'GAUCHE DROITE',
  
  // Misc
  'BULLET': 'PUCE',
  'MIDDLE': 'MÉDIAN',
  'SECTION': 'PARAGRAPHE',
  'PILCROW': 'PIED DE MOUCHE',
  'DAGGER': 'CROIX',
  'DOUBLE DAGGER': 'DOUBLE CROIX',
  'COPYRIGHT': 'DROIT D\'AUTEUR',
  'REGISTERED': 'MARQUE DÉPOSÉE',
  'TRADE MARK': 'MARQUE COMMERCIALE',
  'HORIZONTAL': 'HORIZONTAL',
  'VERTICAL': 'VERTICAL',
  'LINE': 'LIGNE',
  'BAR': 'BARRE',
  'BROKEN': 'BRISÉ',
  'SOLIDUS': 'BARRE OBLIQUE',
  'FRACTION': 'FRACTION',
  'VULGAR': 'ORDINAIRE',
  'FEMININE': 'FÉMININ',
  'MASCULINE': 'MASCULIN',
  'ORDINAL': 'ORDINAL',
  'INDICATOR': 'INDICATEUR',
  'LIGATURE': 'LIGATURE',
  'SMALL LETTER': 'MINUSCULE',
  'CAPITAL LETTER': 'MAJUSCULE',
  'WHITE': 'BLANC',
  'BLACK': 'NOIR',
  'STAR': 'ÉTOILE',
  'HEART': 'CŒUR',
  'CHECK': 'COCHE',
  'CROSS': 'CROIX',
  'SNOWFLAKE': 'FLOCON DE NEIGE',
  'SUN': 'SOLEIL',
  'CLOUD': 'NUAGE',
  'UMBRELLA': 'PARAPLUIE',
  'TELEPHONE': 'TÉLÉPHONE',
  'ENVELOPE': 'ENVELOPPE',
  'MALE': 'MÂLE',
  'FEMALE': 'FEMELLE',
  'MUSIC': 'MUSIQUE',
  'NOTE': 'NOTE',
  'EIGHTH': 'CROCHE',
  'BEAMED': 'CROCHE LIÉE',
  
  // Greek
  'GREEK': 'GRECQUE',
  'ALPHA': 'ALPHA',
  'BETA': 'BÊTA',
  'GAMMA': 'GAMMA',
  'DELTA': 'DELTA',
  'EPSILON': 'EPSILON',
  'ZETA': 'ZÊTA',
  'ETA': 'ÊTA',
  'THETA': 'THÊTA',
  'IOTA': 'IOTA',
  'KAPPA': 'KAPPA',
  'LAMBDA': 'LAMBDA',
  'MU': 'MU',
  'NU': 'NU',
  'XI': 'XI',
  'OMICRON': 'OMICRON',
  'PI': 'PI',
  'RHO': 'RHÔ',
  'SIGMA': 'SIGMA',
  'TAU': 'TAU',
  'UPSILON': 'UPSILON',
  'PHI': 'PHI',
  'CHI': 'KHI',
  'PSI': 'PSI',
  'OMEGA': 'OMÉGA',
  
  // Cyrillic
  'CYRILLIC': 'CYRILLIQUE',
  
  // Structural
  'ZERO': 'ZÉRO',
  'ONE': 'UN',
  'TWO': 'DEUX',
  'THREE': 'TROIS',
  'FOUR': 'QUATRE',
  'FIVE': 'CINQ',
  'SIX': 'SIX',
  'SEVEN': 'SEPT',
  'EIGHT': 'HUIT',
  'NINE': 'NEUF',
  'TEN': 'DIX',
  'HALF': 'DEMI',
  'THIRD': 'TIERS',
  'QUARTER': 'QUART',
  'FIFTH': 'CINQUIÈME',
  'SIXTH': 'SIXIÈME',
  'SEVENTH': 'SEPTIÈME',
  'EIGHTH': 'HUITIÈME',
  
  // Misc terms
  'FULL STOP': 'POINT',
  'COMMERCIAL AT': 'AROBASE',
  'PERCENT': 'POUR CENT',
  'AMPERSAND': 'ESPERLUETTE',
  'ASTERISK': 'ASTÉRISQUE',
  'CIRCUMFLEX ACCENT': 'ACCENT CIRCONFLEXE',
  'LOW LINE': 'TIRET BAS',
  'GRAVE ACCENT': 'ACCENT GRAVE',
  'TILDE': 'TILDE',
  'VERTICAL LINE': 'BARRE VERTICALE',
  'REVERSE SOLIDUS': 'BARRE OBLIQUE INVERSÉE',
  'BACKSLASH': 'BARRE OBLIQUE INVERSÉE',
  'NUMBER SIGN': 'CROISILLON',
  'SHARP': 'DIÈSE',
  'TYPOGRAPHIC': 'TYPOGRAPHIQUE',
  'ELLIPSIS': 'POINTS DE SUSPENSION',
  'EM DASH': 'TIRET CADRATIN',
  'EN DASH': 'TIRET DEMI-CADRATIN',
  'SOFT HYPHEN': 'TRAIT D\'UNION CONDITIONNEL',
  'FIGURE DASH': 'TIRET NUMÉRIQUE',
  'OGHAM': 'OGHAM',
  'SPACE MARK': 'MARQUE D\'ESPACE',
  'ZERO WIDTH': 'LARGEUR NULLE',
  'HAIR SPACE': 'ESPACE ULTRA-FINE',
  'THIN SPACE': 'ESPACE FINE',
  'PUNCTUATION SPACE': 'ESPACE PONCTUATION',
  'FOUR-PER-EM': 'QUART DE CADRATIN',
  'THREE-PER-EM': 'TIERS DE CADRATIN',
  'SIX-PER-EM': 'SIXIÈME DE CADRATIN',
  'EM SPACE': 'ESPACE CADRATIN',
  'EN SPACE': 'ESPACE DEMI-CADRATIN',
  'FIGURE SPACE': 'ESPACE NUMÉRIQUE',
  'MEDIUM MATHEMATICAL': 'MATHÉMATIQUE MOYENNE',
  'IDEOGRAPHIC': 'IDÉOGRAPHIQUE',
};

/**
 * Translate Unicode name from English to French
 */
function translateUnicodeName(englishName) {
  if (!englishName) return null;
  
  let translated = englishName;
  
  // Sort by length (longest first) to avoid partial replacements
  const terms = Object.keys(UNICODE_TRANSLATIONS).sort((a, b) => b.length - a.length);
  
  for (const term of terms) {
    const regex = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    translated = translated.replace(regex, UNICODE_TRANSLATIONS[term]);
  }
  
  return translated;
}

// French aliases for common characters
const FRENCH_ALIASES = {
  // Letters with diacritics
  'à': ['a accent grave'],
  'â': ['a accent circonflexe', 'a chapeau'],
  'ä': ['a trema'],
  'á': ['a accent aigu'],
  'ã': ['a tilde'],
  'å': ['a rond en chef'],
  'æ': ['e dans l\'a', 'ae ligature'],
  'ç': ['c cedille'],
  'è': ['e accent grave'],
  'é': ['e accent aigu'],
  'ê': ['e accent circonflexe', 'e chapeau'],
  'ë': ['e trema'],
  'ì': ['i accent grave'],
  'í': ['i accent aigu'],
  'î': ['i accent circonflexe', 'i chapeau'],
  'ï': ['i trema'],
  'ñ': ['n tilde', 'ene'],
  'ò': ['o accent grave'],
  'ó': ['o accent aigu'],
  'ô': ['o accent circonflexe', 'o chapeau'],
  'ö': ['o trema'],
  'õ': ['o tilde'],
  'ù': ['u accent grave'],
  'ú': ['u accent aigu'],
  'û': ['u accent circonflexe', 'u chapeau'],
  'ü': ['u trema'],
  'ý': ['y accent aigu'],
  'ÿ': ['y trema'],
  'œ': ['o e ligature', 'oe'],
  'Œ': ['O E ligature majuscule', 'OE majuscule'],
  'Æ': ['A E ligature majuscule', 'AE majuscule'],
  
  // Punctuation
  '«': ['guillemet ouvrant', 'guillemet francais gauche'],
  '»': ['guillemet fermant', 'guillemet francais droit'],
  '‹': ['guillemet simple ouvrant'],
  '›': ['guillemet simple fermant'],
  '\u201C': ['guillemet anglais ouvrant'],
  '\u201D': ['guillemet anglais fermant'],
  '\u2019': ['apostrophe typographique', 'apostrophe courbe'],
  '\u2018': ['guillemet simple anglais ouvrant'],
  '\u2026': ['points de suspension'],
  '\u2013': ['tiret demi-cadratin', 'tiret moyen'],
  '\u2014': ['tiret cadratin', 'tiret long'],
  '\u2010': ['trait d\'union'],
  '\u00A0': ['espace insecable'],
  '\u202F': ['espace fine insecable'],
  
  // Symbols
  '€': ['euro', 'signe euro'],
  '£': ['livre sterling'],
  '¥': ['yen'],
  '¢': ['cent'],
  '¤': ['symbole monetaire generique'],
  '©': ['copyright'],
  '®': ['marque deposee'],
  '™': ['marque commerciale', 'trademark'],
  '°': ['degre'],
  '§': ['paragraphe', 'section'],
  '¶': ['pied de mouche', 'paragraphe'],
  '†': ['croix', 'obele'],
  '‡': ['double croix', 'double obele'],
  '•': ['puce', 'point median'],
  '·': ['point median'],
  '×': ['multiplication', 'fois'],
  '÷': ['division', 'obelus'],
  '±': ['plus ou moins'],
  '≠': ['different de', 'non egal'],
  '≤': ['inferieur ou egal'],
  '≥': ['superieur ou egal'],
  '≈': ['environ egal', 'approximativement'],
  '∞': ['infini'],
  '√': ['racine carree'],
  '∑': ['somme'],
  '∏': ['produit'],
  '∫': ['integrale'],
  '∂': ['derivee partielle'],
  '∆': ['delta', 'increment'],
  '∇': ['nabla', 'gradient'],
  '∈': ['appartient a', 'element de'],
  '∉': ['n\'appartient pas a'],
  '⊂': ['inclus dans', 'sous-ensemble'],
  '∪': ['union'],
  '∩': ['intersection'],
  '∅': ['ensemble vide'],
  '¬': ['negation logique', 'non'],
  '∧': ['et logique', 'conjonction'],
  '∨': ['ou logique', 'disjonction'],
  '⇒': ['implique'],
  '⇔': ['equivalent', 'si et seulement si'],
  '←': ['fleche gauche'],
  '→': ['fleche droite'],
  '↑': ['fleche haut'],
  '↓': ['fleche bas'],
  '↔': ['fleche gauche droite'],
  '⁰': ['exposant zero'],
  '¹': ['exposant un'],
  '²': ['carre', 'exposant deux', 'au carre'],
  '³': ['cube', 'exposant trois', 'au cube'],
  '⁴': ['exposant quatre'],
  '⁵': ['exposant cinq'],
  '⁶': ['exposant six'],
  '⁷': ['exposant sept'],
  '⁸': ['exposant huit'],
  '⁹': ['exposant neuf'],
  '₀': ['indice zero'],
  '₁': ['indice un'],
  '₂': ['indice deux'],
  '₃': ['indice trois'],
  '₄': ['indice quatre'],
  '₅': ['indice cinq'],
  '₆': ['indice six'],
  '₇': ['indice sept'],
  '₈': ['indice huit'],
  '₉': ['indice neuf'],
  '½': ['un demi', 'moitie'],
  '¼': ['un quart'],
  '¾': ['trois quarts'],
  '⅓': ['un tiers'],
  '⅔': ['deux tiers'],
  'ß': ['s allemand', 'eszett', 'scharfes s'],
  'ẞ': ['S allemand majuscule', 'Eszett majuscule'],
  'µ': ['micro', 'mu'],
  'π': ['pi'],
  'Ω': ['omega majuscule', 'ohm'],
  'α': ['alpha'],
  'β': ['beta'],
  'γ': ['gamma'],
  'δ': ['delta minuscule'],
  'ε': ['epsilon'],
  'θ': ['theta'],
  'λ': ['lambda'],
  'σ': ['sigma'],
  'φ': ['phi'],
  'ψ': ['psi'],
  'ω': ['omega'],
};

// Character index: char -> { names, methods }
const charIndex = new Map();

/**
 * Add a character to the index
 */
function addChar(char, method) {
  if (!char || char.startsWith('dk_')) return; // Skip dead keys and null
  
  if (!charIndex.has(char)) {
    charIndex.set(char, {
      codePoint: char.codePointAt(0),
      char: char,
      unicodeName: null,
      frenchAliases: FRENCH_ALIASES[char] || [],
      methods: []
    });
  }
  
  const entry = charIndex.get(char);
  
  // Add method if not duplicate
  const methodStr = JSON.stringify(method);
  const exists = entry.methods.some(m => JSON.stringify(m) === methodStr);
  if (!exists) {
    entry.methods.push(method);
  }
}

/**
 * Get the most efficient layer for a character
 */
function getLayerPriority(layer) {
  // Lower is better
  const priorities = {
    'Base': 0,
    'Shift': 1,
    'AltGr': 2,
    'Shift+AltGr': 3,
    'Caps': 1,
    'Caps+Shift': 2,
    'Caps+AltGr': 3,
    'Caps+Shift+AltGr': 4
  };
  return priorities[layer] ?? 99;
}

// Process keymap (direct access characters)
console.log('Processing keymap...');
for (const [keyId, chars] of Object.entries(layout.keymap)) {
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char && !char.startsWith('dk_')) {
      // Determine effective layer
      let layer;
      switch (i) {
        case 0: layer = 'Base'; break;
        case 1: layer = 'Shift'; break;
        case 2: layer = 'Caps'; break;
        case 3: layer = 'Caps+Shift'; break;
        case 4: layer = 'AltGr'; break;
        case 5: layer = 'Shift+AltGr'; break;
        case 6: layer = 'Caps+AltGr'; break;
        case 7: layer = 'Caps+Shift+AltGr'; break;
      }
      addChar(char, {
        type: 'direct',
        key: keyId,
        layer: layer,
        priority: getLayerPriority(layer)
      });
    }
  }
}

// Process deadkeys (dead key + base = result)
console.log('Processing deadkeys...');
for (const [dkName, table] of Object.entries(layout.deadkeys)) {
  for (const [baseChar, resultChar] of Object.entries(table)) {
    if (resultChar && !resultChar.startsWith('dk_')) {
      // Find how to type the base character
      let baseMethod = null;
      for (const [keyId, chars] of Object.entries(layout.keymap)) {
        for (let i = 0; i < chars.length; i++) {
          if (chars[i] === baseChar) {
            let layer;
            switch (i) {
              case 0: layer = 'Base'; break;
              case 1: layer = 'Shift'; break;
              case 2: layer = 'Caps'; break;
              case 3: layer = 'Caps+Shift'; break;
              case 4: layer = 'AltGr'; break;
              case 5: layer = 'Shift+AltGr'; break;
              case 6: layer = 'Caps+AltGr'; break;
              case 7: layer = 'Caps+Shift+AltGr'; break;
            }
            if (!baseMethod || getLayerPriority(layer) < getLayerPriority(baseMethod.layer)) {
              baseMethod = { key: keyId, layer: layer };
            }
          }
        }
      }
      
      if (baseMethod) {
        addChar(resultChar, {
          type: 'deadkey',
          deadkey: dkName,
          key: baseMethod.key,
          layer: baseMethod.layer,
          priority: 10 + getLayerPriority(baseMethod.layer) // Dead keys are less efficient
        });
      }
    }
  }
}

// Get Unicode names for all characters
console.log('Getting Unicode names...');
for (const [char, entry] of charIndex) {
  entry.unicodeName = getUnicodeName(char);
}

// Sort methods by priority for each character
for (const [char, entry] of charIndex) {
  entry.methods.sort((a, b) => a.priority - b.priority);
}

// Convert to sorted array by code point
const sortedChars = [...charIndex.values()].sort((a, b) => a.codePoint - b.codePoint);

// Create output object
const output = {
  generated: new Date().toISOString(),
  totalCharacters: sortedChars.length,
  characters: {}
};

for (const entry of sortedChars) {
  const codePointHex = 'U+' + entry.codePoint.toString(16).toUpperCase().padStart(4, '0');
  output.characters[entry.char] = {
    codePoint: codePointHex,
    unicodeName: entry.unicodeName,
    unicodeNameFr: translateUnicodeName(entry.unicodeName),
    frenchAliases: entry.frenchAliases,
    methods: entry.methods.map((m, index) => {
      const { priority, ...rest } = m; // Remove priority from output
      // Mark the first method as recommended (simplest/most efficient)
      if (index === 0) {
        return { ...rest, recommended: true };
      }
      return rest;
    })
  };
}

// Write output with compact formatting
const outputPath = path.join(__dirname, 'character-index.json');

// Custom compact JSON formatting
let jsonLines = ['{'];
jsonLines.push(`  "generated": "${output.generated}",`);
jsonLines.push(`  "totalCharacters": ${output.totalCharacters},`);
jsonLines.push('  "characters": {');

const charEntries = Object.entries(output.characters);
charEntries.forEach(([char, data], idx) => {
  const escapedChar = JSON.stringify(char);
  const isLast = idx === charEntries.length - 1;
  
  // Character header
  jsonLines.push(`    ${escapedChar}: {`);
  jsonLines.push(`      "codePoint": "${data.codePoint}",`);
  jsonLines.push(`      "unicodeName": ${JSON.stringify(data.unicodeName)},`);
  jsonLines.push(`      "unicodeNameFr": ${JSON.stringify(data.unicodeNameFr)},`);
  jsonLines.push(`      "frenchAliases": ${JSON.stringify(data.frenchAliases)},`);
  
  // Methods - one per line
  const methodLines = data.methods.map(m => JSON.stringify(m));
  jsonLines.push(`      "methods": [${methodLines.join(', ')}]`);
  
  jsonLines.push(`    }${isLast ? '' : ','}`);
});

jsonLines.push('  }');
jsonLines.push('}');

fs.writeFileSync(outputPath, jsonLines.join('\n'), 'utf8');

console.log(`\nGenerated ${outputPath}`);
console.log(`Total unique characters: ${sortedChars.length}`);

