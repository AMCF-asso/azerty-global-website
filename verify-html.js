/**
 * Verify HTML claims against AZERTY Global 2026.json
 */
const fs = require('fs');
const master = JSON.parse(fs.readFileSync('AZERTY Global 2026.json', 'utf8'));

// Build lookup tables
const posToCode = {
  'E00': 'Backquote', 'E01': 'Digit1', 'E02': 'Digit2', 'E03': 'Digit3', 'E04': 'Digit4',
  'E05': 'Digit5', 'E06': 'Digit6', 'E07': 'Digit7', 'E08': 'Digit8', 'E09': 'Digit9',
  'E10': 'Digit0', 'E11': 'Minus', 'E12': 'Equal',
  'D01': 'KeyQ', 'D02': 'KeyW', 'D03': 'KeyE', 'D04': 'KeyR', 'D05': 'KeyT',
  'D06': 'KeyY', 'D07': 'KeyU', 'D08': 'KeyI', 'D09': 'KeyO', 'D10': 'KeyP',
  'D11': 'BracketLeft', 'D12': 'BracketRight',
  'C01': 'KeyA', 'C02': 'KeyS', 'C03': 'KeyD', 'C04': 'KeyF', 'C05': 'KeyG',
  'C06': 'KeyH', 'C07': 'KeyJ', 'C08': 'KeyK', 'C09': 'KeyL', 'C10': 'Semicolon',
  'C11': 'Quote', 'C12': 'Backslash',
  'B00': 'IntlBackslash', 'B01': 'KeyZ', 'B02': 'KeyX', 'B03': 'KeyC', 'B04': 'KeyV',
  'B05': 'KeyB', 'B06': 'KeyN', 'B07': 'KeyM', 'B08': 'Comma', 'B09': 'Period', 'B10': 'Slash',
  'A03': 'Space'
};

// AZERTY letter to physical key
const letterToKey = {
  'a': 'KeyQ', 'z': 'KeyW', 'e': 'KeyE', 'r': 'KeyR', 't': 'KeyT', 'y': 'KeyY',
  'u': 'KeyU', 'i': 'KeyI', 'o': 'KeyO', 'p': 'KeyP',
  'q': 'KeyA', 's': 'KeyS', 'd': 'KeyD', 'f': 'KeyF', 'g': 'KeyG', 'h': 'KeyH',
  'j': 'KeyJ', 'k': 'KeyK', 'l': 'KeyL', 'm': 'Semicolon',
  'w': 'KeyZ', 'x': 'KeyX', 'c': 'KeyC', 'v': 'KeyV', 'b': 'KeyB', 'n': 'KeyN',
  ',': 'KeyM', ';': 'Comma', '.': 'Comma', ':': 'Period', '!': 'Slash',
  '@': 'Backquote', '#': 'Backquote',
  '&': 'Digit1', 'é': 'Digit2', '"': 'Digit3', "'": 'Digit4', '(': 'Digit5',
  '-': 'Digit6', 'è': 'Digit7', '_': 'Digit8', 'ç': 'Digit9', 'à': 'Digit0',
  ')': 'Minus', '=': 'Equal', '+': 'Equal',
  '^': 'BracketLeft', '$': 'BracketRight', '£': 'BracketRight',
  'ù': 'Quote', '*': 'Backslash',
  '<': 'IntlBackslash', '>': 'IntlBackslash'
};

// Build keymap from master
const keymap = {};
for (const row of master.rows) {
  for (const key of row.keys) {
    const code = posToCode[key.position];
    if (!code) continue;
    keymap[code] = key;
  }
}

// Verify specific claims
const claims = [
  // Guillemets
  { desc: 'AltGr + W = «', layer: 'alt_gr', key: 'KeyZ', expected: '«' },
  { desc: 'AltGr + X = »', layer: 'alt_gr', key: 'KeyX', expected: '»' },
  // Ligatures
  { desc: 'AltGr + O = œ', layer: 'alt_gr', key: 'KeyO', expected: 'œ' },
  { desc: 'AltGr+Maj + O = Œ', layer: 'shift_alt_gr', key: 'KeyO', expected: 'Œ' },
  { desc: 'AltGr + A = æ', layer: 'alt_gr', key: 'KeyQ', expected: 'æ' },
  { desc: 'AltGr+Maj + A = Æ', layer: 'shift_alt_gr', key: 'KeyQ', expected: 'Æ' },
  // Tirets
  { desc: 'AltGr + T = – (demi-cadratin)', layer: 'alt_gr', key: 'KeyT', expected: '–' },
  { desc: 'AltGr+Maj + T = — (cadratin)', layer: 'shift_alt_gr', key: 'KeyT', expected: '—' },
  // Programming symbols
  { desc: 'AltGr + D = {', layer: 'alt_gr', key: 'KeyD', expected: '{' },
  { desc: 'AltGr + F = }', layer: 'alt_gr', key: 'KeyF', expected: '}' },
  { desc: 'AltGr + J = [', layer: 'alt_gr', key: 'KeyJ', expected: '[' },
  { desc: 'AltGr + K = ]', layer: 'alt_gr', key: 'KeyK', expected: ']' },
  { desc: 'AltGr + G = \\', layer: 'alt_gr', key: 'KeyG', expected: '\\' },
  { desc: 'AltGr + H = |', layer: 'alt_gr', key: 'KeyH', expected: '|' },
  // Tilde & backtick
  { desc: 'AltGr + N = ~', layer: 'alt_gr', key: 'KeyN', expected: '~' },
  { desc: 'AltGr+Maj + N = `', layer: 'shift_alt_gr', key: 'KeyN', expected: '`' },
  // Euro
  { desc: 'AltGr + E = €', layer: 'alt_gr', key: 'KeyE', expected: '€' },
  // Degree
  { desc: 'AltGr + ) = °', layer: 'alt_gr', key: 'Minus', expected: '°' },
  // Ù
  { desc: 'AltGr + U = ù', layer: 'alt_gr', key: 'KeyU', expected: 'ù' },
  { desc: 'AltGr+Maj + U = Ù', layer: 'shift_alt_gr', key: 'KeyU', expected: 'Ù' },
  // ß
  { desc: 'AltGr + B = ß', layer: 'alt_gr', key: 'KeyB', expected: 'ß' },
  { desc: 'AltGr+Maj + B = ẞ', layer: 'shift_alt_gr', key: 'KeyB', expected: 'ẞ' },
  // Apostrophe typographique
  { desc: "AltGr + 4 = ' (apostrophe typo)", layer: 'alt_gr', key: 'Digit4', expected: '\u2019' },
  // < >
  { desc: 'AltGr + , = <', layer: 'alt_gr', key: 'KeyM', expected: '<' },
  { desc: 'AltGr + ; = >', layer: 'alt_gr', key: 'Comma', expected: '>' },
  // ¿ ¡
  { desc: 'AltGr+Maj + , = ¿', layer: 'shift_alt_gr', key: 'KeyM', expected: '¿' },
  { desc: 'AltGr + ! = ¡', layer: 'alt_gr', key: 'Slash', expected: '¡' },
  // @ on E00
  { desc: '@ sur E00 (base)', layer: 'base', key: 'Backquote', expected: '@' },
  { desc: '# sur E00 (shift)', layer: 'shift', key: 'Backquote', expected: '#' },
  // Tiret insécable
  { desc: 'AltGr + - = ‑ (tiret insécable)', layer: 'alt_gr', key: 'Digit6', expected: '‑' },
  // Point médian
  { desc: 'AltGr+Maj + ; = · (point médian)', layer: 'shift_alt_gr', key: 'Comma', expected: '·' },
];

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║               HTML CLAIMS VERIFICATION AGAINST MASTER JSON                  ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

for (const claim of claims) {
  const key = keymap[claim.key];
  if (!key) {
    console.log(`❌ ${claim.desc} — Key ${claim.key} not found in master`);
    failed++;
    continue;
  }
  
  const actual = key[claim.layer];
  if (actual === claim.expected) {
    console.log(`✅ ${claim.desc}`);
    passed++;
  } else {
    console.log(`❌ ${claim.desc} — Expected "${claim.expected}" but found "${actual}"`);
    failed++;
  }
}

console.log('\n───────────────────────────────────────────────────────────────────────────────');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('───────────────────────────────────────────────────────────────────────────────');

if (failed === 0) {
  console.log('\n✅ All HTML claims are CORRECT and match AZERTY Global 2026.json!');
} else {
  console.log('\n⚠️  Some claims need to be fixed in the HTML files.');
}
