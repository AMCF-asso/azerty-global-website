/**
 * Verify public African-language character claims against AZERTY Global.
 */
const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const master = JSON.parse(fs.readFileSync(path.join(siteRoot, 'data', 'AZERTY Global.json'), 'utf8'));
const faq = fs.readFileSync(path.join(siteRoot, 'faq.html'), 'utf8');
const lessons = fs.readFileSync(path.join(siteRoot, 'tester', 'lessons.json'), 'utf8');
const hotspots = JSON.parse(fs.readFileSync(path.join(siteRoot, 'data', 'keyboard-hotspots.json'), 'utf8')).hotspots;

function findKeyByValue(value) {
  for (const row of master.rows) {
    for (const key of row.keys) {
      for (const layer of ['base', 'shift', 'alt_gr', 'shift_alt_gr']) {
        if (key[layer] === value) return { key, layer };
      }
    }
  }
  return null;
}

const failures = [];

function expectEqual(desc, actual, expected) {
  if (actual !== expected) {
    failures.push(`${desc}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectIncludes(desc, content, needle) {
  if (!content.includes(needle)) {
    failures.push(`${desc}: missing ${JSON.stringify(needle)}`);
  }
}

function expectNotIncludes(desc, content, needle) {
  if (content.includes(needle)) {
    failures.push(`${desc}: obsolete ${JSON.stringify(needle)}`);
  }
}

const extendedLatin = master.dead_keys.dk_extended_latin;
const hook = master.dead_keys.dk_hook;
const dotBelow = master.dead_keys.dk_dot_below;

const extendedTrigger = findKeyByValue('dk_extended_latin');
expectEqual('dk_extended_latin trigger key', extendedTrigger && extendedTrigger.key.position, 'E06');
expectEqual('dk_extended_latin trigger layer', extendedTrigger && extendedTrigger.layer, 'alt_gr');
expectEqual('Latin extended e', extendedLatin.table.e, 'ɛ');
expectEqual('Latin extended E', extendedLatin.table.E, 'Ɛ');
expectEqual('Latin extended j', extendedLatin.table.j, 'ɲ');
expectEqual('Latin extended J', extendedLatin.table.J, 'Ɲ');
expectEqual('Latin extended n', extendedLatin.table.n, 'ŋ');
expectEqual('Latin extended N', extendedLatin.table.N, 'Ŋ');
expectEqual('Latin extended y', extendedLatin.table.y, 'ƴ');
expectEqual('Latin extended r', extendedLatin.table.r, 'ɖ');
expectEqual('Hook k', hook.table.k, 'ƙ');
expectEqual('Hook d', hook.table.d, 'ɗ');
expectEqual('Dot below s', dotBelow.table.s, 'ṣ');

expectIncludes('FAQ open e method', faq, 'Touche morte Latin étendu + <kbd>e</kbd> / <kbd>E</kbd>');
expectIncludes('FAQ palatal n method', faq, 'Touche morte Latin étendu + <kbd>j</kbd> / <kbd>J</kbd>');
expectIncludes('FAQ JSON-LD palatal n method', faq, 'ɲ/Ɲ via Latin étendu + J');
expectNotIncludes('FAQ old open e method', faq, 'Touche morte Latin étendu + <kbd>"</kbd> / <kbd>3</kbd>');
expectNotIncludes('FAQ old palatal n method', faq, 'Touche morte Phonétique + <kbd>n</kbd>');
expectNotIncludes('FAQ old JSON-LD palatal n method', faq, 'ɲ (n palatal) via Phonétique + N');

expectIncludes('Lessons Latin extended trigger', lessons, 'Touche morte Latin étendu : {ALTGR} + - (touche 6), puis la lettre');
expectIncludes('Lessons open e example', lessons, 'e → ɛ\\nn → ŋ\\nz → ʒ');
expectNotIncludes('Lessons old Latin extended trigger', lessons, '{ALTGR} + 6');
expectNotIncludes('Lessons old schwa example', lessons, 'e → ə');

const latinHotspot = hotspots.find((hotspot) => hotspot.id === 'latin-extended');
expectEqual('Latin extended hotspot shortcut', latinHotspot && latinHotspot.shortcut && latinHotspot.shortcut.join('+'), 'Alt Gr+-');
expectEqual('Latin extended hotspot examples', latinHotspot && latinHotspot.char, 'ɛ ŋ ɲ');

const fineSpaceHotspot = hotspots.find((hotspot) => hotspot.id === 'nbsp-fine');
const nbspHotspot = hotspots.find((hotspot) => hotspot.id === 'nbsp');
expectEqual('Fine non-breaking space hotspot shortcut', fineSpaceHotspot && fineSpaceHotspot.shortcut && fineSpaceHotspot.shortcut.join('+'), 'Alt Gr+Espace');
expectEqual('Fine non-breaking space hotspot char', fineSpaceHotspot && fineSpaceHotspot.char, '\u202f');
expectEqual('Regular non-breaking space hotspot shortcut', nbspHotspot && nbspHotspot.shortcut && nbspHotspot.shortcut.join('+'), 'Alt Gr+Maj+Espace');
expectEqual('Regular non-breaking space hotspot char', nbspHotspot && nbspHotspot.char, '\u00a0');

if (failures.length) {
  console.error('African-language claim verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('African-language claims match AZERTY Global.');
