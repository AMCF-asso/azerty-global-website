/**
 * AZERTY Global 2026 Compliance Verification Script
 * Compares website files with the master AZERTY Global 2026.json specification
 */

const fs = require('fs');

// Load files
const masterJSON = JSON.parse(fs.readFileSync('AZERTY Global 2026.json', 'utf8'));
const testerJSON = JSON.parse(fs.readFileSync('tester/azerty-global.json', 'utf8'));
const charIndex = JSON.parse(fs.readFileSync('tester/character-index.json', 'utf8'));

const issues = [];

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           AZERTY Global 2026 - Compliance Verification Report               ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

// ============================================
// 1. BUILD MASTER KEYMAP FROM ROWS
// ============================================

// Position to KeyboardEvent.code mapping
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

// Build master keymap
const masterKeymap = {};
for (const row of masterJSON.rows) {
  for (const key of row.keys) {
    const code = posToCode[key.position];
    if (!code) continue;
    
    // Build 8-element array: [base, shift, caps, caps_shift, alt_gr, shift_alt_gr, caps_alt_gr, caps_shift_alt_gr]
    const base = key.base || null;
    const shift = key.shift || null;
    const caps = key.caps !== undefined ? key.caps : base;  // Default to base if not specified
    const capsShift = key.caps_shift !== undefined ? key.caps_shift : shift;
    const altGr = key.alt_gr || null;
    const shiftAltGr = key.shift_alt_gr || null;
    const capsAltGr = key.caps_alt_gr !== undefined ? key.caps_alt_gr : altGr;
    const capsShiftAltGr = key.caps_shift_alt_gr !== undefined ? key.caps_shift_alt_gr : shiftAltGr;
    
    masterKeymap[code] = [base, shift, caps, capsShift, altGr, shiftAltGr, capsAltGr, capsShiftAltGr];
  }
}

// Add Space manually
masterKeymap['Space'] = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('1. KEYMAP COMPARISON (AZERTY Global 2026.json vs tester/azerty-global.json)');
console.log('───────────────────────────────────────────────────────────────────────────────\n');

const testerKeymap = testerJSON.keymap;
const layerNames = ['Base', 'Shift', 'Caps', 'Caps+Shift', 'AltGr', 'Shift+AltGr', 'Caps+AltGr', 'Caps+Shift+AltGr'];

let keymapIssues = 0;

for (const [keyId, masterValues] of Object.entries(masterKeymap)) {
  const testerValues = testerKeymap[keyId];
  
  if (!testerValues) {
    issues.push({ type: 'KEYMAP', severity: 'HIGH', message: `Key ${keyId} missing from tester keymap` });
    keymapIssues++;
    continue;
  }
  
  // Compare each layer
  for (let i = 0; i < 8; i++) {
    const masterVal = masterValues[i];
    const testerVal = testerValues[i];
    
    // Normalize nulls
    const m = masterVal === null || masterVal === undefined ? null : masterVal;
    const t = testerVal === null || testerVal === undefined ? null : testerVal;
    
    if (m !== t) {
      issues.push({
        type: 'KEYMAP',
        severity: 'HIGH',
        message: `${keyId} [${layerNames[i]}]: master="${m}" vs tester="${t}"`
      });
      keymapIssues++;
    }
  }
}

// Check for extra keys in tester
for (const keyId of Object.keys(testerKeymap)) {
  if (!masterKeymap[keyId]) {
    issues.push({
      type: 'KEYMAP',
      severity: 'LOW',
      message: `Key ${keyId} in tester but not in master (extra key)`
    });
  }
}

console.log(`Keymap issues found: ${keymapIssues}`);
if (keymapIssues === 0) {
  console.log('✅ All keymap values match!\n');
} else {
  console.log('');
}

// ============================================
// 2. DEAD KEY COMPARISON
// ============================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('2. DEAD KEY COMPARISON');
console.log('───────────────────────────────────────────────────────────────────────────────\n');

const masterDeadKeys = masterJSON.dead_keys;
const testerDeadKeys = testerJSON.deadkeys;

let deadKeyIssues = 0;

for (const [dkName, dkData] of Object.entries(masterDeadKeys)) {
  const masterTable = dkData.table;
  const testerTable = testerDeadKeys[dkName];
  
  if (!testerTable) {
    issues.push({
      type: 'DEADKEY',
      severity: 'HIGH',
      message: `Dead key ${dkName} missing from tester`
    });
    deadKeyIssues++;
    continue;
  }
  
  // Compare each mapping
  for (const [trigger, result] of Object.entries(masterTable)) {
    if (testerTable[trigger] !== result) {
      issues.push({
        type: 'DEADKEY',
        severity: 'MEDIUM',
        message: `${dkName}: "${trigger}" → master="${result}" vs tester="${testerTable[trigger] || 'MISSING'}"`
      });
      deadKeyIssues++;
    }
  }
  
  // Check for extra mappings in tester
  for (const trigger of Object.keys(testerTable)) {
    if (masterTable[trigger] === undefined) {
      issues.push({
        type: 'DEADKEY',
        severity: 'LOW',
        message: `${dkName}: "${trigger}" in tester but not in master (extra)`
      });
    }
  }
}

// Check for extra dead keys in tester
for (const dkName of Object.keys(testerDeadKeys)) {
  if (!masterDeadKeys[dkName]) {
    issues.push({
      type: 'DEADKEY',
      severity: 'LOW',
      message: `Dead key ${dkName} in tester but not in master`
    });
  }
}

console.log(`Dead key issues found: ${deadKeyIssues}`);
if (deadKeyIssues === 0) {
  console.log('✅ All dead key mappings match!\n');
} else {
  console.log('');
}

// ============================================
// 3. CHARACTER INDEX COMPLETENESS
// ============================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('3. CHARACTER INDEX COMPLETENESS (character-index.json)');
console.log('───────────────────────────────────────────────────────────────────────────────\n');

const characters = charIndex.characters || charIndex;
let charIndexIssues = 0;

// Collect all characters that should be in the index
const allChars = new Set();

// From master keymap
for (const values of Object.values(masterKeymap)) {
  for (const val of values) {
    if (val && !String(val).startsWith('dk_') && val.length === 1) {
      allChars.add(val);
    }
  }
}

// From dead keys
for (const dkData of Object.values(masterDeadKeys)) {
  for (const result of Object.values(dkData.table)) {
    if (result && result.length === 1) {
      allChars.add(result);
    }
  }
}

// Check missing
const missingChars = [];
for (const char of allChars) {
  if (!characters[char]) {
    missingChars.push(char);
  }
}

if (missingChars.length > 0) {
  console.log(`Missing characters in character-index.json: ${missingChars.length}`);
  
  // Group by Unicode block
  const byBlock = {};
  for (const char of missingChars) {
    const cp = char.codePointAt(0);
    let block = 'Other';
    if (cp >= 0x0000 && cp <= 0x007F) block = 'Basic Latin';
    else if (cp >= 0x0080 && cp <= 0x00FF) block = 'Latin-1 Supplement';
    else if (cp >= 0x0100 && cp <= 0x017F) block = 'Latin Extended-A';
    else if (cp >= 0x0180 && cp <= 0x024F) block = 'Latin Extended-B';
    else if (cp >= 0x0250 && cp <= 0x02AF) block = 'IPA Extensions';
    else if (cp >= 0x0300 && cp <= 0x036F) block = 'Combining Diacriticals';
    else if (cp >= 0x0370 && cp <= 0x03FF) block = 'Greek';
    else if (cp >= 0x0400 && cp <= 0x04FF) block = 'Cyrillic';
    else if (cp >= 0x2000 && cp <= 0x206F) block = 'General Punctuation';
    else if (cp >= 0x2070 && cp <= 0x209F) block = 'Superscripts/Subscripts';
    else if (cp >= 0x20A0 && cp <= 0x20CF) block = 'Currency Symbols';
    else if (cp >= 0x2100 && cp <= 0x214F) block = 'Letterlike Symbols';
    else if (cp >= 0x2190 && cp <= 0x21FF) block = 'Arrows';
    else if (cp >= 0x2200 && cp <= 0x22FF) block = 'Mathematical Operators';
    else if (cp >= 0x2300 && cp <= 0x23FF) block = 'Miscellaneous Technical';
    else if (cp >= 0x2600 && cp <= 0x26FF) block = 'Miscellaneous Symbols';
    else if (cp >= 0x2700 && cp <= 0x27BF) block = 'Dingbats';
    
    byBlock[block] = byBlock[block] || [];
    byBlock[block].push(char);
  }
  
  for (const [block, chars] of Object.entries(byBlock)) {
    console.log(`  ${block}: ${chars.slice(0, 15).join(' ')} ${chars.length > 15 ? '...' : ''} (${chars.length})`);
    chars.forEach(c => {
      issues.push({
        type: 'CHAR_INDEX',
        severity: 'MEDIUM',
        message: `Missing: "${c}" (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) [${block}]`
      });
    });
    charIndexIssues += chars.length;
  }
} else {
  console.log('✅ All characters present in character-index.json!\n');
}

console.log('');

// ============================================
// 4. SUMMARY
// ============================================

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY');
console.log('───────────────────────────────────────────────────────────────────────────────\n');

const highIssues = issues.filter(i => i.severity === 'HIGH');
const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
const lowIssues = issues.filter(i => i.severity === 'LOW');

console.log(`🔴 HIGH severity issues:   ${highIssues.length}`);
console.log(`🟡 MEDIUM severity issues: ${mediumIssues.length}`);
console.log(`🟢 LOW severity issues:    ${lowIssues.length}`);
console.log(`   TOTAL issues:           ${issues.length}\n`);

if (highIssues.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('HIGH SEVERITY ISSUES (must fix):');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  highIssues.forEach((issue, i) => console.log(`${i+1}. [${issue.type}] ${issue.message}`));
  console.log('');
}

if (mediumIssues.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('MEDIUM SEVERITY ISSUES (should fix):');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  mediumIssues.slice(0, 50).forEach((issue, i) => console.log(`${i+1}. [${issue.type}] ${issue.message}`));
  if (mediumIssues.length > 50) console.log(`... and ${mediumIssues.length - 50} more`);
  console.log('');
}

if (lowIssues.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('LOW SEVERITY ISSUES (informational):');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  lowIssues.slice(0, 20).forEach((issue, i) => console.log(`${i+1}. [${issue.type}] ${issue.message}`));
  if (lowIssues.length > 20) console.log(`... and ${lowIssues.length - 20} more`);
  console.log('');
}

if (issues.length === 0) {
  console.log('\n✅✅✅ PERFECT! NO ISSUES FOUND! ✅✅✅\n');
}

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('END OF REPORT');
console.log('═══════════════════════════════════════════════════════════════════════════════');
