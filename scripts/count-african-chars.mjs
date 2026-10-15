// Base du chiffre public « plus de 120 caractères des langues africaines à
// alphabet latin, majuscules comprises, que l'AZERTY de Windows ne donne pas »
// (REDACTION.md § 6, QCM d'Antoine du 2026-10-10, CONT-09).
//
// Règle : lettres non ASCII utilisées par au moins une langue de data/afrique,
// absentes de l'AZERTY Windows (frappe directe et touches mortes de
// data/AZERTY Traditionnel.json), saisissables avec AZERTY Global (hors
// meta.nonSaisissables, avec une méthode dans la fiche). Minuscules et
// majuscules comptées séparément ; marques combinantes exclues.
// Usage : node scripts/count-african-chars.mjs   (128 le 2026-10-10)

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = fileURLToPath(new URL('..', import.meta.url));
const lire = (...p) => JSON.parse(readFileSync(join(racine, ...p), 'utf8'));
const nfc = (s) => s.normalize('NFC');
const combinante = (s) => [...s].every((c) => /\p{M}/u.test(c));

function windows() {
  const d = lire('data', 'AZERTY Traditionnel.json');
  const s = new Set();
  for (const rangee of d.rows) {
    for (const t of rangee.keys) {
      for (const c of ['base', 'shift', 'alt_gr', 'shift_alt_gr']) if (t[c]) s.add(nfc(t[c]));
    }
  }
  for (const m of Object.values(d.dead_keys)) for (const v of Object.values(m.table)) if (v) s.add(nfc(v));
  return s;
}

const win = windows();
const nonSaisissables = new Set(lire('data', 'afrique', 'index.json').meta.nonSaisissables);
const minuscules = new Map();
for (const f of readdirSync(join(racine, 'data', 'afrique'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  for (const l of lire('data', 'afrique', f).langues) {
    for (const c of l.caracteres) {
      const ch = nfc(c.char);
      if (!minuscules.has(ch)) minuscules.set(ch, c);
    }
  }
}

const retenues = [...minuscules.entries()].filter(([ch, c]) =>
  !combinante(ch) && ch.codePointAt(0) > 127 && !win.has(ch) && !nonSaisissables.has(ch) && c.methode?.type);
const majuscules = new Set();
for (const [, c] of retenues) {
  const m = c.majuscule;
  if (m?.methode?.type) {
    const M = nfc(m.char);
    if (!win.has(M) && !nonSaisissables.has(M)) majuscules.add(M);
  }
}

console.log(`minuscules : ${retenues.length}`);
console.log(`majuscules : ${majuscules.size}`);
console.log(`total : ${retenues.length + majuscules.size}`);
