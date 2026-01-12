const fs = require('fs');

// Load both files
const main = JSON.parse(fs.readFileSync('AZERTY Global 2026.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('tester/character-index.json', 'utf8'));

// Key name mapping from AZERTY to JavaScript KeyboardEvent.code
const keyMap = {
  '+': { key: 'Equal', layer: 'Shift' },
  '-': { key: 'Digit6', layer: 'Base' },
  '=': { key: 'Equal', layer: 'Base' },
  '/': { key: 'Slash', layer: 'Shift' },
  ':': { key: 'Slash', layer: 'Base' },
  '*': { key: 'Backslash', layer: 'Base' },
  '.': { key: 'Period', layer: 'Base' },
  '<': { key: 'IntlBackslash', layer: 'Base' },
  '>': { key: 'IntlBackslash', layer: 'Shift' },
  ' ': { key: 'Space', layer: 'Base' },
  '0': { key: 'Digit0', layer: 'Shift' },
  '8': { key: 'Digit8', layer: 'Shift' },
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

// Check dk_scientific mappings
const dk = main.dead_keys.dk_scientific.table;
console.log('=== Checking dk_scientific mappings ===\n');

let errors = [];

for (const [trigger, result] of Object.entries(dk)) {
  const idxEntry = idx[result];
  
  if (!idxEntry) {
    console.log(`MISSING: ${result} (trigger: ${trigger}) not in character-index.json`);
    continue;
  }
  
  const methods = idxEntry.methods?.filter(m => m.deadkey === 'dk_scientific');
  
  if (!methods || methods.length === 0) {
    console.log(`NO DK METHOD: ${result} has no dk_scientific method`);
    continue;
  }
  
  // Check if the key mapping matches
  const expected = keyMap[trigger];
  const actual = methods[0];
  
  if (expected && (actual.key !== expected.key || actual.layer !== expected.layer)) {
    errors.push({
      char: result,
      trigger: trigger,
      expected: expected,
      actual: { key: actual.key, layer: actual.layer }
    });
    console.log(`MISMATCH: ${result} (trigger: "${trigger}")`);
    console.log(`  Expected: key="${expected.key}", layer="${expected.layer}"`);
    console.log(`  Actual:   key="${actual.key}", layer="${actual.layer}"\n`);
  }
}

console.log(`\nTotal errors: ${errors.length}`);
