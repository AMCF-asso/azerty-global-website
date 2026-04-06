const fs = require('fs');
const path = require('path');
const { MASTER_FILENAME } = require('./master-config');

const SITE_ROOT = path.resolve(__dirname, '..');
const MAIN_FILE = path.join(SITE_ROOT, 'data', MASTER_FILENAME);

// Load both files
const main = JSON.parse(fs.readFileSync(MAIN_FILE, 'utf8'));
const idx = JSON.parse(fs.readFileSync(path.join(SITE_ROOT, 'tester', 'character-index.json'), 'utf8'));
const characters = idx.characters || {};

// Key name mapping from AZERTY to JavaScript KeyboardEvent.code
const keyMap = {
  '+': { key: 'Equal', layer: 'Shift' },
  '-': { key: 'Digit6', layer: 'Base' },
  '=': { key: 'Equal', layer: 'Base' },
  '/': { key: 'Slash', layer: 'Shift' },
  ':': { key: 'Period', layer: 'Base' },
  '*': { key: 'Backslash', layer: 'Base' },
  '.': { key: 'Comma', layer: 'Base' },
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
console.log(`=== Checking dk_scientific mappings against ${MASTER_FILENAME} ===\n`);

let errors = [];
let missing = 0;

for (const [trigger, result] of Object.entries(dk)) {
  const idxEntry = characters[result];
  
  if (!idxEntry) {
    console.log(`MISSING: ${result} (trigger: ${trigger}) not in character-index.json`);
    missing++;
    continue;
  }
  
  const methods = idxEntry.methods?.filter(m => m.type === 'deadkey' && m.deadkey === 'dk_scientific');
  
  if (!methods || methods.length === 0) {
    console.log(`NO DK METHOD: ${result} has no dk_scientific method`);
    missing++;
    continue;
  }
  
  // Check if the key mapping matches
  const expected = keyMap[trigger];
  const hasExpectedMatch = expected && methods.some(
    method => method.key === expected.key && method.layer === expected.layer
  );
  const actual = methods[0];
  
  if (expected && !hasExpectedMatch) {
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

console.log(`\nMissing entries: ${missing}`);
console.log(`Total mismatches: ${errors.length}`);
