/**
 * Verify public African-language character claims against AZERTY Global.
 */
const fs = require('fs');
const path = require('path');

const siteRoot = path.resolve(__dirname, '..');
const master = JSON.parse(fs.readFileSync(path.join(siteRoot, 'data', 'AZERTY Global.json'), 'utf8'));
// Le livrable est dist/, pas la racine : les .html de la racine etaient
// des copies d'avant la migration 11ty, supprimees le 2026-08-22.
const faq = fs.readFileSync(path.join(siteRoot, 'dist', 'faq.html'), 'utf8');
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

// Notation mise a jour le 2026-08-22 : la FAQ ecrit la capitale en
// <kbd>Maj</kbd> + <kbd>E</kbd>, plus en <kbd>E</kbd> seul. L'ecart etait
// invisible tant que ce script lisait faq.html a la racine, page morte.
expectIncludes('FAQ open e method', faq, 'Touche morte Latin étendu + <kbd>E</kbd> / <kbd>Maj</kbd> + <kbd>E</kbd>');
expectIncludes('FAQ palatal n method', faq, 'Touche morte Latin étendu + <kbd>J</kbd> / <kbd>Maj</kbd> + <kbd>J</kbd>');
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


// /afrique v2 (nuit du 2026-09-13) : les chiffres du héros sont ceux du
// générateur, jamais des littéraux, et « tous saisissables » ne s'écrit que si
// data/afrique/index.json le mesure (décision 26 du 2026-09-11).
const afriqueIndex = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'afrique', 'index.json'), 'utf8'));
const afriqueHtml = fs.readFileSync(path.join(__dirname, '..', 'dist', 'afrique.html'), 'utf8').replace(/&nbsp;/g, ' ');
expectIncludes('/afrique hero countries', afriqueHtml, `${afriqueIndex.meta.nbPays} pays`);
expectIncludes('/afrique hero languages', afriqueHtml, `${afriqueIndex.meta.nbLangues} langues`);
expectIncludes('/afrique hero characters', afriqueHtml, `${afriqueIndex.meta.nbCaracteres} caractères`);
if (afriqueIndex.meta.saisissables) {
  expectIncludes('/afrique hero all typable', afriqueHtml, 'tous saisissables');
} else {
  expectNotIncludes('/afrique hero must not claim all typable', afriqueHtml, 'tous saisissables');
  expectIncludes('/afrique hero typable count', afriqueHtml, `${afriqueIndex.meta.nbSaisissables} saisissables`);
}
expectIncludes('/afrique title kept for GSC', afriqueHtml, 'Afrique francophone avec votre clavier AZERTY | AZERTY Global</title>');
expectEqual('/afrique h1 without francophone', /<h1>[^<]*francophone/.test(afriqueHtml), false);
expectEqual('/afrique select lists every country', (afriqueHtml.match(/<option value="[a-z]{2}"/g) || []).length, afriqueIndex.meta.nbPays);
expectEqual('/afrique map paths', (afriqueHtml.match(/class="carte-afrique__pays[^"]*" data-pays=/g) || []).length >= afriqueIndex.meta.nbPays - 5, true);
expectNotIncludes('/afrique no FAQPage JSON-LD', afriqueHtml, '"@type": "FAQPage"');

if (failures.length) {
  console.error('African-language claim verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('African-language claims match AZERTY Global.');
