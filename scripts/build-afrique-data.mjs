/**
 * Génère data/afrique.json — les langues d'Afrique à alphabet latin par pays, leurs caractères
 * hors ASCII et la frappe qui les écrit sur AZERTY Global.
 * Décisions du 2026-09-11 (operations/refonte-site/2026-09-11-decisions-afrique-carte.md) :
 * #5 CLDR + complément Wikipedia, #6 officielles + nationales ≤ 8 vedettes, #7 pays non latins
 * honnêtes, #20 paquets npm CLDR, #23 provenance par langue, #26 « tous saisissables » vérifié,
 * #29 langues européennes en une ligne, #30 seuil ≥ 5 % ou ≥ 1 M, #31 note provisoire.
 *
 * Entrées : data/afrique-pays.json, data/afrique-selector.json (24 pays curés en juin 2026,
 * gardés tels quels), data/afrique-complement.json (manuel, relu), data/AZERTY Global.json
 * (référence des frappes), tester/character-index.json (touche morte recommandée),
 * cldr-core / cldr-misc-full / cldr-localenames-full 48.2.0.
 * Le script tourne à la main ; le JSON produit est commité. Rien ne se télécharge au build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lire = (p) => JSON.parse(fs.readFileSync(path.join(RACINE, p), 'utf8'));
const DOSSIER_SORTIE = path.join(RACINE, 'data', 'afrique'); // index.json + un fichier par pays (décision 36)
const SEC = process.argv.includes('--sec');

const { pays: PAYS } = lire('data/afrique-pays.json');
const V1 = lire('data/afrique-selector.json');
const COMPLEMENT = lire('data/afrique-complement.json');
const DISPOSITION = lire('data/AZERTY Global.json');
const INDEX = lire('tester/character-index.json').characters;
const { DEAD_KEY_NAMES_FR } = require('./lib/touches-mortes.js');
const TERRITOIRES = require('cldr-core/supplemental/territoryInfo.json').supplemental.territoryInfo;
const LANGUES_CLDR = require('cldr-core/supplemental/languageData.json').supplemental.languageData;
const NOMS_FR = require('cldr-localenames-full/main/fr/languages.json').main.fr.localeDisplayNames.languages;
const VERSION_CLDR = require('cldr-core/package.json').version;
const DOSSIER_EXEMPLAIRES = path.join(RACINE, 'node_modules', 'cldr-misc-full', 'main');

// Noms français absents de cldr-localenames 48.2 (repli provisoire, relu avec le complément Wikipedia).
const NOMS_FR_LOCAL = { luo: 'Luo (dholuo)', abr: 'Abron', bsq: 'Bassa du Liberia', kro: 'Krou', dnj: 'Dan', ndc: 'Ndau', ngl: 'Lomwe', rng: 'Ronga', fuv: 'Peul du Nigeria', kck: 'Kalanga', mxc: 'Manyika', fvr: 'Four', laj: 'Lango', myx: 'Masaaba', toi: 'Tonga de Zambie', lir: 'Anglais libérien', mev: 'Mano', apd: 'Arabe soudanais', bci: 'Baoulé', sef: 'Sénoufo cebaara', bvb: 'Bube', puu: 'Pounou', ffm: 'Peul du Macina', mwk: 'Kita-maninka', fuq: 'Peul du Niger' };
const ECRITURES_FR = { Arab: 'arabe', Ethi: 'guèze', Nkoo: 'n’ko', Tfng: 'tifinagh', Deva: 'devanagari', Copt: 'copte' };
const SEUIL_PCT = 5;
const SEUIL_LOCUTEURS = 1e6;
const MAX_VEDETTES = 8;
// Langues européennes et arabe : jamais de fiche, une ligne « officielles aussi » (décision 29) ;
// l'arabe rejoint la phrase « hors périmètre » quand il est officiel (décision 7).
const EURO = new Set(['en', 'fr', 'pt', 'es', 'it', 'de']);
// Identifiants v1 (ISO 639-3) des langues que CLDR nomme autrement : une fiche v1 curée
// reste la référence, le nouveau pays s'y ajoute.
const ALIAS_V1 = { ha: 'hau', yo: 'yor', sw: 'swh', ee: 'ewe', ln: 'lin', rw: 'kin', rn: 'run', so: 'som', aa: 'aar', bm: 'bam', wo: 'wol', sg: 'sag', mg: 'mlg', ff: 'fuc', kg: 'kon', lua: 'lua', kab: 'kab', shi: 'shi', tzm: 'tzm', rif: 'rif', dje: 'dje', ny: 'nya' };

// --- Référence des frappes -------------------------------------------------------------
const LEGENDES = { E00: '@', E01: '1', E02: '2', E03: '3', E04: '4', E05: '5', E06: '6', E07: '7', E08: '8', E09: '9', E10: '0', E11: ')', E12: '=', D11: 'touche circonflexe', D12: '$', C11: 'touche accent aigu', C12: '*', B00: '<', B07: ',', B08: '.', B09: ':', B10: '!' };
const MODIFICATEURS = { base: '', shift: 'Maj + ', alt_gr: 'AltGr + ', shift_alt_gr: 'AltGr + Maj + ' };
const COUCHES = ['base', 'shift', 'alt_gr', 'shift_alt_gr'];
const touches = new Map();
const direct = new Map(); // caractère → { position, couche }
const emplacementMorte = new Map(); // dk_* → { position, couche }
for (const rangee of DISPOSITION.rows) {
  for (const t of rangee.keys) {
    touches.set(t.position, t);
    for (const couche of COUCHES) {
      const v = t[couche];
      if (!v) continue;
      if (v.startsWith('dk_')) { if (!emplacementMorte.has(v)) emplacementMorte.set(v, { position: t.position, couche }); }
      else if (!direct.has(v)) direct.set(v, { position: t.position, couche });
    }
  }
}
const parMorte = new Map(); // caractère → [{ dk, base }]
for (const [dk, def] of Object.entries(DISPOSITION.dead_keys)) {
  for (const [base, resultat] of Object.entries(def.table)) {
    if (!parMorte.has(resultat)) parMorte.set(resultat, []);
    parMorte.get(resultat).push({ dk, base });
  }
}
const legende = (position) => LEGENDES[position] || (/^[a-z]$/.test(touches.get(position).base) ? touches.get(position).base.toUpperCase() : touches.get(position).base);
const accord = ({ position, couche }) => MODIFICATEURS[couche] + legende(position);
const titre = (s) => s.charAt(0) + s.slice(1).toLocaleLowerCase('fr');

function methode(c, profondeur = 0) {
  if (direct.has(c)) {
    const e = direct.get(c);
    const a = accord(e);
    return { type: 'direct', accord: a, texte: e.couche === 'base' ? 'Accès direct' : `Accès direct (${a})` };
  }
  const options = parMorte.get(c) || [];
  if (options.length) {
    let choix = options[0];
    const idx = INDEX[c];
    if (idx && idx.methods) {
      const rec = idx.methods.find((m) => m.recommended && m.type === 'deadkey') || idx.methods.find((m) => m.type === 'deadkey');
      const o = rec && options.find((x) => x.dk === rec.deadkey);
      if (o) choix = o;
    }
    const emplacement = emplacementMorte.get(choix.dk);
    if (!emplacement) throw new Error(`Touche morte ${choix.dk} sans emplacement`);
    const nomMorte = titre(DEAD_KEY_NAMES_FR[choix.dk] || choix.dk);
    const a = accord(emplacement);
    const touche = choix.base === ' ' ? 'espace' : choix.base;
    return { type: 'morte', morte: choix.dk, nomMorte, accord: a, touche, texte: `Touche morte ${nomMorte} (${a}), puis ${touche}` };
  }
  const nfd = c.normalize('NFD');
  if (nfd.length > 1 && profondeur < 2) {
    const etapes = [...nfd].map((p) => methode(p, profondeur + 1));
    if (etapes.every(Boolean)) return { type: 'composition', etapes, texte: 'Composition : ' + etapes.map((m) => m.texte).join(', puis ') };
  }
  return null;
}

// --- Exemplaires CLDR -------------------------------------------------------------------
function analyserUnicodeSet(s) {
  s = s.trim().replace(/^\[/, '').replace(/\]$/, '');
  const items = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (c === '\\') { items.push(s[i + 1]); i += 2; continue; }
    if (c === '{') { const fin = s.indexOf('}', i); items.push(s.slice(i + 1, fin).replace(/\s/g, '')); i = fin + 1; continue; }
    if (s[i + 1] === '-' && s[i + 2] && !/\s/.test(s[i + 2])) {
      for (let cp = s.codePointAt(i); cp <= s.codePointAt(i + 2); cp += 1) items.push(String.fromCodePoint(cp));
      i += 3; continue;
    }
    const cp = s.codePointAt(i);
    items.push(String.fromCodePoint(cp));
    i += cp > 0xffff ? 2 : 1;
  }
  return items;
}
const estCombinant = (c) => /[̀-ͯ᷀-᷿⃐-⃿︠-︯]/.test(c);
/** Lettres hors ASCII en minuscules, marques combinantes séparées (comme le référentiel v1). */
function caracteresDepuisItems(items) {
  const vus = new Set();
  const sortie = [];
  const ajouter = (c) => { if (!vus.has(c)) { vus.add(c); sortie.push(c); } };
  for (const brut of items) {
    const item = brut.normalize('NFC').toLocaleLowerCase();
    if ([...item].every((c) => c.charCodeAt(0) < 128)) continue;
    if ([...item].length === 1) { ajouter(item); continue; }
    for (const c of item) { if (c.charCodeAt(0) >= 128 || estCombinant(c)) ajouter(c); }
  }
  return sortie;
}
function exemplairesCldr(code) {
  const dossier = [code.replace('_', '-'), code.split('_')[0]].find((d) => fs.existsSync(path.join(DOSSIER_EXEMPLAIRES, d, 'characters.json')));
  if (!dossier) return null;
  const json = JSON.parse(fs.readFileSync(path.join(DOSSIER_EXEMPLAIRES, dossier, 'characters.json'), 'utf8'));
  const chars = json.main[dossier].characters;
  const caracteres = caracteresDepuisItems(analyserUnicodeSet(chars.exemplarCharacters));
  const horsLatin = caracteres.filter((c) => !/[\u0000-\u02AF\u0300-\u036F\u1E00-\u1EFF]/.test(c)).length;
  if (horsLatin > caracteres.length / 2) { rapport.exemplairesNonLatins.push(`${code} (${horsLatin}/${caracteres.length})`); return null; }
  return { dossier, caracteres };
}
const nomFrCldr = (code) => { const n = NOMS_FR[code.replace('_', '-')] || NOMS_FR[code.split('_')[0]] || NOMS_FR_LOCAL[code.split('_')[0]]; return n ? n.charAt(0).toLocaleUpperCase('fr') + n.slice(1) : null; };
const estLatin = (code) => {
  const [base, script] = code.split('_');
  if (script) return script === 'Latn';
  const scripts = (LANGUES_CLDR[base] || {})._scripts;
  const secondaires = (LANGUES_CLDR[base + '-alt-secondary'] || {})._scripts;
  if (scripts) return scripts.includes('Latn');
  if (secondaires) return secondaires.includes('Latn');
  return true; // aucune donnée d'écriture : créoles et langues mineures, latines dans les faits
};

// --- Langues ----------------------------------------------------------------------------
const langues = new Map(); // id → fiche
const rapport = { ajoutsV1: [], exemplairesNonLatins: [], sansFiche: [], majusculesNonSaisissables: [], alias: [] };
const fiche = (id, nom, source, caracteres, provisoire) => {
  if (langues.has(id)) return langues.get(id);
  const f = { id, nom, pays: [], source, provisoire: Boolean(provisoire), caracteres: caracteres.map((c) => ({ char: c })) };
  langues.set(id, f);
  return f;
};
for (const l of V1.languages) {
  const f = fiche(l.id, l.name, { type: 'curation-2026-06', ref: 'data/afrique-selector.json (référentiel Afrique francophone, juin 2026)' }, l.characters.map((c) => c.char), false);
  for (const p of l.countries) if (!f.pays.includes(p)) f.pays.push(p);
}
const complements = new Map(COMPLEMENT.langues.map((l) => [l.id, l]));

const codesV1 = new Set(V1.countries.map((c) => c.code));
const paysSortie = [];
for (const p of PAYS) {
  const info = TERRITOIRES[p.code];
  if (!info) throw new Error(`Pas de territoryInfo pour ${p.code}`);
  const population = Number(info._population);
  const retenues = Object.entries(info.languagePopulation).map(([code, l]) => {
    const pct = Number(l._populationPercent);
    return { code, pct, locuteurs: Math.round(population * pct / 100), officiel: l._officialStatus || null };
  }).filter((l) => l.officiel || l.pct >= SEUIL_PCT || l.locuteurs >= SEUIL_LOCUTEURS);

  const officiellesEuro = [];
  const horsPerimetre = [];
  const fichesPays = []; // { id, pct }
  const basesLatines = new Set(retenues.filter((l) => estLatin(l.code)).map((l) => l.code.split('_')[0]));
  for (const l of retenues) {
    const base = l.code.split('_')[0];
    if (!estLatin(l.code)) {
      if ((l.officiel || l.pct >= 20) && !basesLatines.has(base)) {
        const script = l.code.split('_')[1] || ((LANGUES_CLDR[base] || {})._scripts || [])[0];
        let nom = (nomFrCldr(l.code) || l.code).toLocaleLowerCase('fr');
        if (nom.startsWith('arabe')) nom = 'arabe';
        if (!horsPerimetre.some((h) => h.nom === nom)) horsPerimetre.push({ nom, ecriture: ECRITURES_FR[script] || script || 'non latine' });
      }
      continue;
    }
    if (EURO.has(base)) { if (l.officiel) officiellesEuro.push(nomFrCldr(base).toLocaleLowerCase('fr')); continue; }
    if (codesV1.has(p.code)) {
      // Pays curé en juin : la fiche v1 fait foi pour ses langues ; une langue CLDR au-dessus
      // du seuil qu'elle n'a pas s'ajoute avec sa propre source (décision 35 du 2026-09-11).
      const v1 = V1.languages.find((x) => x.countries.includes(p.code) && (x.id === (ALIAS_V1[base] || base) || x.id === base));
      if (v1) continue;
      rapport.ajoutsV1.push(`${p.code}:${l.code} ${l.pct} %`);
    }
    const idV1 = ALIAS_V1[base];
    if (idV1 && langues.has(idV1)) { fichesPays.push({ id: idV1, pct: l.pct }); rapport.alias.push(`${p.code}:${l.code}→${idV1}`); continue; }
    const id = l.code.replace('_', '-');
    if (langues.has(id)) { fichesPays.push({ id, pct: l.pct }); continue; }
    const ex = exemplairesCldr(l.code);
    const comp = complements.get(id) || complements.get(base);
    if (ex) {
      fiche(id, nomFrCldr(l.code) || (comp && comp.nomFr) || id, { type: 'cldr', ref: `cldr-misc-full ${VERSION_CLDR}, main/${ex.dossier}/characters.json (exemplarCharacters)` }, ex.caracteres, false);
      fichesPays.push({ id, pct: l.pct });
    } else if (comp) {
      fiche(id, comp.nomFr, { type: 'complement', ref: comp.source, citation: comp.citation || null }, comp.caracteres.split(/\s+/).filter(Boolean), comp.provisoire !== false);
      fichesPays.push({ id, pct: l.pct });
    } else {
      rapport.sansFiche.push(`${p.code}:${l.code} ${l.pct} % ${nomFrCldr(l.code) || ''}`.trim());
    }
  }
  for (const f of fichesPays) { const fl = langues.get(f.id); if (!fl.pays.includes(p.code)) fl.pays.push(p.code); }

  let ids;
  let vedettes;
  if (codesV1.has(p.code)) {
    const c = V1.countries.find((x) => x.code === p.code);
    ids = [...new Set([...V1.languages.filter((x) => x.countries.includes(p.code)).map((x) => x.id), ...fichesPays.map((f) => f.id)])].sort((a, b) => langues.get(a).nom.localeCompare(langues.get(b).nom, 'fr'));
    vedettes = c.featuredLanguages.slice(0, MAX_VEDETTES);
  } else {
    fichesPays.sort((a, b) => b.pct - a.pct);
    ids = fichesPays.map((f) => f.id).sort((a, b) => langues.get(a).nom.localeCompare(langues.get(b).nom, 'fr'));
    vedettes = fichesPays.slice(0, MAX_VEDETTES).map((f) => f.id);
  }
  paysSortie.push({
    code: p.code, nom: p.nom, ...(p.pastille ? { pastille: true } : {}), ...(p.ecritureMajoritaire ? { ecritureMajoritaire: p.ecritureMajoritaire } : {}),
    langues: ids, vedettes, officiellesEuro: [...new Set(officiellesEuro)].sort(), horsPerimetre,
    source: codesV1.has(p.code) ? 'curation-2026-06' : `cldr-core ${VERSION_CLDR} territoryInfo`,
  });
}

// --- Frappes et vérification « tous saisissables » (décision 26) ------------------------
const manquants = [];
for (const f of langues.values()) {
  if (!f.pays.length) continue;
  for (const c of f.caracteres) {
    const m = methode(c.char);
    if (!m) {
      // Lettre hors répertoire (ex. clics du nama ǀ ǁ ǂ ǃ) : dite telle quelle, jamais tue.
      manquants.push(`${f.id} ${c.char} U+${c.char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
      c.methode = null;
      c.nonSaisissable = true;
      f.nonSaisissables = [...(f.nonSaisissables || []), c.char];
      continue;
    }
    c.methode = m;
    const maj = c.char.toLocaleUpperCase('fr');
    if (maj !== c.char && [...maj].length === 1) {
      const mm = methode(maj);
      if (mm) c.majuscule = { char: maj, texte: mm.texte };
      else rapport.majusculesNonSaisissables.push(`${f.id} ${maj}`);
    }
    if (INDEX[c.char] && INDEX[c.char].unicodeNameFr) c.nomUnicode = INDEX[c.char].unicodeNameFr;
  }
}
if (manquants.length) {
  // Décision 26 : le claim « tous saisissables » ne s'écrit jamais à la main. Le JSON porte
  // `meta.saisissables` et la liste ; la page adapte sa phrase. `--strict` refuse la génération.
  console.error(`⚠️ ${manquants.length} caractère(s) non saisissable(s) :\n  ` + manquants.join('\n  '));
  if (process.argv.includes('--strict')) process.exit(1);
}

// --- Sortie -----------------------------------------------------------------------------
const languesSortie = [...langues.values()].filter((f) => f.pays.length).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
const tousCaracteres = new Set(languesSortie.flatMap((f) => f.caracteres.map((c) => c.char)));
const marques = [...tousCaracteres].filter(estCombinant);
const sortie = {
  meta: {
    genere: new Date().toISOString().slice(0, 10),
    perimetre: "Langues d'Afrique à alphabet latin, 54 États membres de l'ONU",
    nbPays: paysSortie.length,
    nbLangues: languesSortie.length,
    nbCaracteres: tousCaracteres.size,
    nbMarques: marques.length,
    saisissables: manquants.length === 0,
    nonSaisissables: [...new Set(manquants.map((m) => m.split(' ')[1]))],
    nbSaisissables: tousCaracteres.size - new Set(manquants.map((m) => m.split(' ')[1])).size,
    seuil: `officielle, ou ≥ ${SEUIL_PCT} % de la population, ou ≥ ${SEUIL_LOCUTEURS / 1e6} M de locuteurs (cldr-core ${VERSION_CLDR} territoryInfo)`,
    sources: { curation: 'data/afrique-selector.json (juin 2026, 24 pays)', cldr: `cldr-core, cldr-misc-full, cldr-localenames-full ${VERSION_CLDR}`, complement: 'data/afrique-complement.json (Wikipedia, relu)', frappes: 'data/AZERTY Global.json + tester/character-index.json' },
    scriptsExclus: "ajami, N'Ko, tifinagh, guèze, arabe : hors périmètre, dits en clair par pays (horsPerimetre)",
  },
  pays: paysSortie,
  langues: languesSortie,
};
const index = {
  meta: sortie.meta,
  pays: paysSortie,
  langues: languesSortie.map((l) => ({ id: l.id, nom: l.nom, pays: l.pays, nb: l.caracteres.length, ...(l.provisoire ? { provisoire: true } : {}), ...(l.nonSaisissables ? { nonSaisissables: l.nonSaisissables } : {}) })),
};
let octets = 0;
if (!SEC) {
  fs.rmSync(DOSSIER_SORTIE, { recursive: true, force: true });
  fs.mkdirSync(DOSSIER_SORTIE, { recursive: true });
  const ecrire = (nom, objet) => { const s = JSON.stringify(objet) + '\n'; octets += Buffer.byteLength(s); fs.writeFileSync(path.join(DOSSIER_SORTIE, nom), s, 'utf8'); };
  ecrire('index.json', index);
  for (const p of paysSortie) ecrire(`${p.code.toLowerCase()}.json`, { code: p.code, genere: sortie.meta.genere, langues: p.langues.map((id) => langues.get(id)) });
}

// --- Rapport ----------------------------------------------------------------------------
const nouveaux = paysSortie.filter((p) => !codesV1.has(p.code));
console.log(`${sortie.meta.nbPays} pays, ${sortie.meta.nbLangues} langues, ${sortie.meta.nbCaracteres} caractères dont ${sortie.meta.nbMarques} marques — ${(octets / 1024).toFixed(0)} ko en ${paysSortie.length + 1} fichiers (index ${(Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0)} ko)${SEC ? ' (mesure seule)' : ''}`);
console.log(`sources : ${languesSortie.filter((l) => l.source.type === 'curation-2026-06').length} curation, ${languesSortie.filter((l) => l.source.type === 'cldr').length} cldr, ${languesSortie.filter((l) => l.source.type === 'complement').length} complément`);
for (const p of nouveaux) console.log(`  ${p.code} ${p.nom} : ${p.langues.length ? p.langues.map((id) => `${id}(${langues.get(id).caracteres.length})`).join(' ') : '—'} | euro: ${p.officiellesEuro.join(', ') || '—'} | hors: ${p.horsPerimetre.map((h) => h.nom).join(', ') || '—'}`);
console.log(`\nalias v1 utilisés : ${rapport.alias.join(' ') || '—'}`);
console.log(`sans fiche (à compléter, décision 32) [${rapport.sansFiche.length}] : ${rapport.sansFiche.join(' · ')}`);
console.log(`ajouts CLDR aux 24 pays de juin (décision 35) [${rapport.ajoutsV1.length}] : ${rapport.ajoutsV1.join(' · ')}`);
console.log(`exemplaires CLDR majoritairement non latins, écartés [${rapport.exemplairesNonLatins.length}] : ${rapport.exemplairesNonLatins.join(' · ') || '—'}`);
console.log(`majuscules non saisissables [${rapport.majusculesNonSaisissables.length}] : ${rapport.majusculesNonSaisissables.join(' ') || '—'}`);
