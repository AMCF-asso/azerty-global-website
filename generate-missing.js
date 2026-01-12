// Script to generate missing dk_scientific entries for character-index.json
const fs = require('fs');

const main = JSON.parse(fs.readFileSync('AZERTY Global 2026.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('tester/character-index.json', 'utf8'));

// AZERTY key mapping to JavaScript KeyboardEvent.code
const keyToCode = {
  'a': { key: 'KeyQ', layer: 'Base' },
  'A': { key: 'KeyQ', layer: 'Shift' },
  'b': { key: 'KeyB', layer: 'Base' },
  'B': { key: 'KeyB', layer: 'Shift' },
  'c': { key: 'KeyC', layer: 'Base' },
  'C': { key: 'KeyC', layer: 'Shift' },
  'd': { key: 'KeyD', layer: 'Base' },
  'D': { key: 'KeyD', layer: 'Shift' },
  'e': { key: 'KeyE', layer: 'Base' },
  'E': { key: 'KeyE', layer: 'Shift' },
  'f': { key: 'KeyF', layer: 'Base' },
  'F': { key: 'KeyF', layer: 'Shift' },
  'g': { key: 'KeyG', layer: 'Base' },
  'G': { key: 'KeyG', layer: 'Shift' },
  'h': { key: 'KeyH', layer: 'Base' },
  'H': { key: 'KeyH', layer: 'Shift' },
  'i': { key: 'KeyI', layer: 'Base' },
  'I': { key: 'KeyI', layer: 'Shift' },
  'j': { key: 'KeyJ', layer: 'Base' },
  'J': { key: 'KeyJ', layer: 'Shift' },
  'k': { key: 'KeyK', layer: 'Base' },
  'K': { key: 'KeyK', layer: 'Shift' },
  'l': { key: 'KeyL', layer: 'Base' },
  'L': { key: 'KeyL', layer: 'Shift' },
  'm': { key: 'Semicolon', layer: 'Base' },
  'M': { key: 'Semicolon', layer: 'Shift' },
  'n': { key: 'KeyN', layer: 'Base' },
  'N': { key: 'KeyN', layer: 'Shift' },
  'o': { key: 'KeyO', layer: 'Base' },
  'O': { key: 'KeyO', layer: 'Shift' },
  'p': { key: 'KeyP', layer: 'Base' },
  'P': { key: 'KeyP', layer: 'Shift' },
  'q': { key: 'KeyA', layer: 'Base' },
  'Q': { key: 'KeyA', layer: 'Shift' },
  'r': { key: 'KeyR', layer: 'Base' },
  'R': { key: 'KeyR', layer: 'Shift' },
  's': { key: 'KeyS', layer: 'Base' },
  'S': { key: 'KeyS', layer: 'Shift' },
  't': { key: 'KeyT', layer: 'Base' },
  'T': { key: 'KeyT', layer: 'Shift' },
  'u': { key: 'KeyU', layer: 'Base' },
  'U': { key: 'KeyU', layer: 'Shift' },
  'v': { key: 'KeyV', layer: 'Base' },
  'V': { key: 'KeyV', layer: 'Shift' },
  'w': { key: 'KeyZ', layer: 'Base' },
  'W': { key: 'KeyZ', layer: 'Shift' },
  'x': { key: 'KeyX', layer: 'Base' },
  'X': { key: 'KeyX', layer: 'Shift' },
  'y': { key: 'KeyY', layer: 'Base' },
  'Y': { key: 'KeyY', layer: 'Shift' },
  'z': { key: 'KeyW', layer: 'Base' },
  'Z': { key: 'KeyW', layer: 'Shift' },
  '0': { key: 'Digit0', layer: 'Shift' },
  '1': { key: 'Digit1', layer: 'Shift' },
  '2': { key: 'Digit2', layer: 'Shift' },
  '3': { key: 'Digit3', layer: 'Shift' },
  '4': { key: 'Digit4', layer: 'Shift' },
  '5': { key: 'Digit5', layer: 'Shift' },
  '6': { key: 'Digit6', layer: 'Shift' },
  '7': { key: 'Digit7', layer: 'Shift' },
  '8': { key: 'Digit8', layer: 'Shift' },
  '9': { key: 'Digit9', layer: 'Shift' },
  '+': { key: 'Equal', layer: 'Shift' },
  '-': { key: 'Digit6', layer: 'Base' },
  '=': { key: 'Equal', layer: 'Base' },
  '/': { key: 'Slash', layer: 'Shift' },
  ':': { key: 'Slash', layer: 'Base' },
  '*': { key: 'Backslash', layer: 'Base' },
  '.': { key: 'Period', layer: 'Base' },
  ',': { key: 'KeyM', layer: 'Base' },
  '<': { key: 'IntlBackslash', layer: 'Base' },
  '>': { key: 'IntlBackslash', layer: 'Shift' },
  ' ': { key: 'Space', layer: 'Base' },
  '%': { key: 'Minus', layer: 'Shift' },
  '~': { key: 'KeyN', layer: 'AltGr' },
  '@': { key: 'Backquote', layer: 'Base' },
  '|': { key: 'KeyH', layer: 'AltGr' },
  '$': { key: 'BracketRight', layer: 'Base' },
  '£': { key: 'BracketRight', layer: 'Shift' },
  '^': { key: 'BracketLeft', layer: 'Base' },
  '¨': { key: 'BracketLeft', layer: 'Shift' },
  '_': { key: 'Digit8', layer: 'Base' },
  '°': { key: 'Minus', layer: 'AltGr' },
  'à': { key: 'Digit0', layer: 'Base' },
};

// Unicode names for symbols
const unicodeNames = {
  '¬': { name: 'NOT SIGN', nameFr: 'SIGNE NON LOGIQUE' },
  '×': { name: 'MULTIPLICATION SIGN', nameFr: 'SIGNE MULTIPLICATION' },
  '÷': { name: 'DIVISION SIGN', nameFr: 'SIGNE DIVISION' },
  '‰': { name: 'PER MILLE SIGN', nameFr: 'SIGNE POUR MILLE' },
  '−': { name: 'MINUS SIGN', nameFr: 'SIGNE MOINS' },
  '∂': { name: 'PARTIAL DIFFERENTIAL', nameFr: 'DÉRIVÉE PARTIELLE' },
  '∅': { name: 'EMPTY SET', nameFr: 'ENSEMBLE VIDE' },
  '∆': { name: 'INCREMENT', nameFr: 'DELTA MAJUSCULE' },
  '∇': { name: 'NABLA', nameFr: 'NABLA' },
  '∈': { name: 'ELEMENT OF', nameFr: 'ÉLÉMENT DE' },
  '∏': { name: 'N-ARY PRODUCT', nameFr: 'PRODUIT' },
  '∑': { name: 'N-ARY SUMMATION', nameFr: 'SOMME' },
  '∘': { name: 'RING OPERATOR', nameFr: 'OPÉRATEUR ANNEAU' },
  '∙': { name: 'BULLET OPERATOR', nameFr: 'OPÉRATEUR POINT' },
  '√': { name: 'SQUARE ROOT', nameFr: 'RACINE CARRÉE' },
  '∛': { name: 'CUBE ROOT', nameFr: 'RACINE CUBIQUE' },
  '∝': { name: 'PROPORTIONAL TO', nameFr: 'PROPORTIONNEL À' },
  '∞': { name: 'INFINITY', nameFr: 'INFINI' },
  '∠': { name: 'ANGLE', nameFr: 'ANGLE' },
  '∥': { name: 'PARALLEL TO', nameFr: 'PARALLÈLE À' },
  '∧': { name: 'LOGICAL AND', nameFr: 'ET LOGIQUE' },
  '∨': { name: 'LOGICAL OR', nameFr: 'OU LOGIQUE' },
  '∩': { name: 'INTERSECTION', nameFr: 'INTERSECTION' },
  '∪': { name: 'UNION', nameFr: 'UNION' },
  '∫': { name: 'INTEGRAL', nameFr: 'INTÉGRALE' },
  '∃': { name: 'THERE EXISTS', nameFr: 'IL EXISTE' },
  '∀': { name: 'FOR ALL', nameFr: 'POUR TOUT' },
  '≈': { name: 'ALMOST EQUAL TO', nameFr: 'PRESQUE ÉGAL À' },
  '≔': { name: 'COLON EQUALS', nameFr: 'DÉFINITION' },
  '≠': { name: 'NOT EQUAL TO', nameFr: 'DIFFÉRENT DE' },
  '≡': { name: 'IDENTICAL TO', nameFr: 'IDENTIQUE À' },
  '≤': { name: 'LESS-THAN OR EQUAL TO', nameFr: 'INFÉRIEUR OU ÉGAL' },
  '≥': { name: 'GREATER-THAN OR EQUAL TO', nameFr: 'SUPÉRIEUR OU ÉGAL' },
  '⊂': { name: 'SUBSET OF', nameFr: 'SOUS-ENSEMBLE DE' },
  '⊕': { name: 'CIRCLED PLUS', nameFr: 'PLUS CERCLÉ' },
  '⊗': { name: 'CIRCLED TIMES', nameFr: 'FOIS CERCLÉ' },
  '⊥': { name: 'UP TACK', nameFr: 'PERPENDICULAIRE' },
  '⇐': { name: 'LEFTWARDS DOUBLE ARROW', nameFr: 'DOUBLE FLÈCHE GAUCHE' },
  '⇑': { name: 'UPWARDS DOUBLE ARROW', nameFr: 'DOUBLE FLÈCHE HAUT' },
  '⇒': { name: 'RIGHTWARDS DOUBLE ARROW', nameFr: 'DOUBLE FLÈCHE DROITE' },
  '⇓': { name: 'DOWNWARDS DOUBLE ARROW', nameFr: 'DOUBLE FLÈCHE BAS' },
  '⇔': { name: 'LEFT RIGHT DOUBLE ARROW', nameFr: 'DOUBLE FLÈCHE GAUCHE-DROITE' },
  'ℂ': { name: 'DOUBLE-STRUCK CAPITAL C', nameFr: 'C COMPLEXES' },
  'ℏ': { name: 'PLANCK CONSTANT OVER TWO PI', nameFr: 'H BARRÉ (CONSTANTE DE PLANCK)' },
  'ℓ': { name: 'SCRIPT SMALL L', nameFr: 'L CURSIF' },
  'ℕ': { name: 'DOUBLE-STRUCK CAPITAL N', nameFr: 'N ENTIERS NATURELS' },
  'ℚ': { name: 'DOUBLE-STRUCK CAPITAL Q', nameFr: 'Q RATIONNELS' },
  'ℝ': { name: 'DOUBLE-STRUCK CAPITAL R', nameFr: 'R RÉELS' },
  'ℤ': { name: 'DOUBLE-STRUCK CAPITAL Z', nameFr: 'Z ENTIERS RELATIFS' },
};

// Get dk_scientific table
const dkScientific = main.dead_keys.dk_scientific.table;

// Generate missing entries
const newEntries = {};

for (const [trigger, char] of Object.entries(dkScientific)) {
  // Skip if already exists
  if (idx[char]) continue;
  
  const codePoint = 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  const keyInfo = keyToCode[trigger];
  const nameInfo = unicodeNames[char] || { name: 'UNKNOWN', nameFr: 'INCONNU' };
  
  if (!keyInfo) {
    console.log(`No key mapping for trigger: "${trigger}" -> ${char}`);
    continue;
  }
  
  newEntries[char] = {
    codePoint: codePoint,
    unicodeName: nameInfo.name,
    unicodeNameFr: nameInfo.nameFr,
    frenchAliases: [],
    methods: [{
      type: 'deadkey',
      deadkey: 'dk_scientific',
      key: keyInfo.key,
      layer: keyInfo.layer,
      recommended: true
    }]
  };
}

// Sort by code point
const sortedEntries = Object.entries(newEntries).sort((a, b) => {
  return a[0].codePointAt(0) - b[0].codePointAt(0);
});

console.log('=== New entries to add (sorted by Unicode) ===\n');

for (const [char, entry] of sortedEntries) {
  console.log(`    "${char}": ${JSON.stringify(entry, null, 0).replace(/"/g, '"')},`);
}

console.log(`\nTotal: ${sortedEntries.length} entries`);
