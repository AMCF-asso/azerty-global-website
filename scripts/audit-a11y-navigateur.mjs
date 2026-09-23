#!/usr/bin/env node
// Balayage d'accessibilité dans un vrai navigateur, sur toutes les pages bâties.
//
// Complément indispensable de audit-a11y-statique.mjs, et la raison d'être des
// deux : le contrôle statique est sorti VERT sur les 54 pages le 2026-09-20,
// alors que celui-ci relevait 1 349 erreurs. Un contrôle qui ne rend jamais la
// main mesure ce qu'il sait faire, pas le site.
//
// Il pilote pa11y 8 (axe-core + HTML_CodeSniffer, WCAG2AA) par le script du
// skill a11y-audit, qui sait où est Edge sur ce poste.
//
//   node scripts/audit-a11y-navigateur.mjs [baseUrl] [dist]
//
// ⛔ Il ne tourne PAS dans `npm run build` : il prend plusieurs minutes et
// demande un serveur. Il se lance à la main, et son résultat est commité.

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8899').replace(/\/$/, '');
const racine = process.argv[3] ?? 'dist';
const VERIFICATEUR = 'D:/My files/IA/skills/a11y-audit/scripts/a11y-check.sh';

function pagesHtml(dossier) {
  const sorties = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sorties.push(...pagesHtml(chemin));
    else if (entree.endsWith('.html')) sorties.push(chemin);
  }
  return sorties;
}

// Le clavier virtuel est un `role="img"` : ses glyphes ne sont pas exposés un à
// un à un lecteur d'écran, et WCAG 1.4.3 ne pose pas d'exigence de contraste sur
// du texte faisant partie d'une image porteuse d'autre contenu visuel. pa11y les
// compte quand même, parce qu'il mesure des nœuds de texte. On les sépare donc
// plutôt que de les noyer dans le total : 66 % des erreurs venaient de là le
// 2026-09-20, et les confondre rend le reste illisible.
const estClavier = (sel) => /accents-ligatures|clavier|touche|-r\d/.test(sel);

const pages = pagesHtml(racine).sort();
const parPage = [];
let erreursClavier = 0;
let erreursReste = 0;
const parCode = {};
const parSelecteur = {};

for (const chemin of pages) {
  const page = relative(racine, chemin).split(sep).join('/');
  let brut = '';
  try {
    // ⛔ `--json` se place AVANT l'URL : le script le lit en premier argument et
    // l'ignore silencieusement ailleurs, en rendant son format humain.
    brut = execFileSync('bash', [VERIFICATEUR, '--json', `${baseUrl}/${page}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    // pa11y sort en 2 dès qu'il trouve quelque chose : ce n'est pas une panne.
    brut = e.stdout ?? '';
    if (!brut) {
      parPage.push({ page, echecDuControle: true, message: String(e.message).slice(0, 200) });
      continue;
    }
  }

  let issues = [];
  try {
    const json = JSON.parse(brut.slice(brut.indexOf('[')));
    issues = Array.isArray(json) ? json : [];
  } catch {
    parPage.push({ page, echecDuControle: true, message: 'sortie JSON illisible' });
    continue;
  }

  const erreurs = issues.filter((i) => i.type === 'error');
  let clavier = 0;
  for (const i of erreurs) {
    const sel = i.selector ?? '';
    if (estClavier(sel)) clavier++;
    else {
      parCode[i.code] = (parCode[i.code] ?? 0) + 1;
      parSelecteur[sel] = (parSelecteur[sel] ?? 0) + 1;
    }
  }
  erreursClavier += clavier;
  erreursReste += erreurs.length - clavier;
  parPage.push({ page, erreurs: erreurs.length, clavier, reste: erreurs.length - clavier });
  console.log(`${String(erreurs.length).padStart(5)} err (${clavier} clavier)  ${page}`);
}

const pagesSansErreur = parPage.filter((p) => p.erreurs === 0).length;
const resultat = {
  mesureLe: new Date().toISOString().slice(0, 10),
  mesureLeTexte: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  outil: 'pa11y 8 (axe-core + HTML_CodeSniffer), WCAG2AA, Microsoft Edge',
  pages: pages.length,
  pagesSansErreur,
  pagesAvecErreur: pages.length - pagesSansErreur,
  erreurs: erreursClavier + erreursReste,
  erreursClavier,
  erreursReste,
  topCodesHorsClavier: Object.entries(parCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code, n]) => ({ code, n })),
  topSelecteursHorsClavier: Object.entries(parSelecteur)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([selecteur, n]) => ({ selecteur, n })),
  parPage,
};

writeFileSync('src/_data/accessibiliteNavigateur.json', JSON.stringify(resultat, null, 2), 'utf8');
console.log(
  `\n${pages.length} pages · ${pagesSansErreur} sans erreur · ${resultat.erreurs} erreurs ` +
    `(${erreursClavier} clavier, ${erreursReste} hors clavier)`,
);
