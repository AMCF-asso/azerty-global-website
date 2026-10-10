#!/usr/bin/env node
// Balayage d'accessibilité dans un vrai navigateur, sur toutes les pages bâties.
//
// Complément indispensable de audit-a11y-statique.mjs, et la raison d'être des
// deux : le contrôle statique est sorti VERT sur les 54 pages le 2026-09-20,
// alors que celui-ci relevait 1 349 erreurs. Un contrôle qui ne rend jamais la
// main mesure ce qu'il sait faire, pas le site.
//
// Deux moteurs, réglés sur WCAG 2.2 AA depuis le 2026-09-28 (LG-02, A016) :
// - axe-core par Playwright, avec les tags wcag2a, wcag2aa, wcag21a, wcag21aa
//   et wcag22aa, comme `recette-v2.mjs` ; pa11y ne sait pas passer ces tags et
//   s'arrête à WCAG 2.1 ;
// - HTML_CodeSniffer par pa11y 8 (standard WCAG2AA, le seul qu'il connaisse),
//   dans Edge, comme le script du skill a11y-audit.
//
//   node scripts/audit-a11y-navigateur.mjs [baseUrl] [dist]
//
// ⛔ Il ne tourne PAS dans `npm run build` : il prend plusieurs minutes et
// demande un serveur. Il se lance à la main, et son résultat est commité.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:8899').replace(/\/$/, '');
const racine = process.argv[3] ?? 'dist';
const EDGE = process.env.A11Y_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
// /accessibilite lit la version des règles ici : la page ne peut pas annoncer
// une version que la mesure n'applique pas.
const REFERENTIEL = '2.2';

// « Ce qui reste à corriger » se lit dans ces libellés : une liste écrite à la
// main décrirait encore des causes disparues après la prochaine mesure. Deux
// codes qui désignent le même défaut (un par moteur) partagent un libellé.
const CAUSES = {
  'target-size': 'Zones cliquables trop petites, sous 24 × 24 pixels',
  'link-in-text-block': 'Liens repérables à leur seule couleur dans un paragraphe',
  'WCAG2AA.Principle1.Guideline1_1.1_1_1.H30.2': 'Images servant de lien sans texte de remplacement',
  'image-alt': 'Images sans texte de remplacement',
  'link-name': 'Liens sans nom accessible',
  'color-contrast': 'Textes sous le seuil de contraste',
  'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': 'Textes sous le seuil de contraste',
  'WCAG2AA.Principle1.Guideline1_4.1_4_3.G145.Fail': 'Textes sous le seuil de contraste',
};
const cause = (code) => CAUSES[code] ?? `Autre règle (${code})`;

// La v1 se reconnaît à l'absence des feuilles v2.
const miseEnPage = (chemin) => (readFileSync(chemin, 'utf8').includes('/css/v2/') ? 'nouvelle' : 'ancienne');

async function lancerNavigateur() {
  for (const opts of [{ channel: 'msedge' }, {}, { channel: 'chrome' }]) {
    try { return await chromium.launch(opts); } catch { /* suivant */ }
  }
  throw new Error('aucun navigateur Chromium disponible (npx playwright install chromium)');
}

// Une erreur par nœud, au format de pa11y, pour que les deux moteurs se
// comptent de la même façon.
async function erreursAxe(navigateur, url) {
  // ⛔ AxeBuilder refuse une page ouverte par `browser.newPage()`.
  const contexte = await navigateur.newContext();
  try {
    const page = await contexte.newPage();
    await page.goto(url, { waitUntil: 'load' });
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS_AXE).analyze();
    return violations.flatMap((v) =>
      v.nodes.map((n) => ({ type: 'error', runner: 'axe', code: v.id, selector: n.target.join(' ') })),
    );
  } finally {
    await contexte.close();
  }
}

function erreursHtmlcs(url) {
  let brut = '';
  try {
    // ⛔ `--json`/`--reporter` avant l'URL, comme dans a11y-check.sh.
    brut = execFileSync('npx', ['-y', 'pa11y@8', '--standard', 'WCAG2AA', '--runner', 'htmlcs', '--reporter', 'json', url], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: true,
      env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: EDGE, PUPPETEER_SKIP_DOWNLOAD: '1' },
    });
  } catch (e) {
    // pa11y sort en 2 dès qu'il trouve quelque chose : ce n'est pas une panne.
    brut = e.stdout ?? '';
    if (!brut) throw new Error(String(e.message).slice(0, 200));
  }
  const json = JSON.parse(brut.slice(brut.indexOf('[')));
  return (Array.isArray(json) ? json : []).filter((i) => i.type === 'error');
}

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
const parCause = {};

const navigateur = await lancerNavigateur();
for (const chemin of pages) {
  const page = relative(racine, chemin).split(sep).join('/');
  let erreurs = [];
  try {
    erreurs = [...(await erreursAxe(navigateur, `${baseUrl}/${page}`)), ...erreursHtmlcs(`${baseUrl}/${page}`)];
  } catch (e) {
    parPage.push({ page, echecDuControle: true, message: String(e.message).slice(0, 200) });
    continue;
  }

  let clavier = 0;
  for (const i of erreurs) {
    const sel = i.selector ?? '';
    if (estClavier(sel)) clavier++;
    else {
      parCode[i.code] = (parCode[i.code] ?? 0) + 1;
      parSelecteur[sel] = (parSelecteur[sel] ?? 0) + 1;
      const c = (parCause[cause(i.code)] ??= { n: 0, pages: new Set() });
      c.n++;
      c.pages.add(page);
    }
  }
  erreursClavier += clavier;
  erreursReste += erreurs.length - clavier;
  parPage.push({ page, miseEnPage: miseEnPage(chemin), erreurs: erreurs.length, clavier, reste: erreurs.length - clavier });
  console.log(`${String(erreurs.length).padStart(5)} err (${clavier} clavier)  ${page}`);
}

await navigateur.close();

const echecs = parPage.filter((p) => p.echecDuControle);
if (echecs.length) {
  // Une page non mesurée compterait comme « sans erreur » : on n'écrit rien.
  console.error(`${echecs.length} page(s) non mesurée(s), rien n'est écrit :`, echecs.slice(0, 5));
  process.exit(1);
}

const pagesSansErreur = parPage.filter((p) => p.erreurs === 0).length;
const bilanMiseEnPage = (nom) => {
  const liste = parPage.filter((p) => p.miseEnPage === nom);
  const avecErreur = liste.filter((p) => p.reste > 0);
  return {
    pages: liste.length,
    pagesAvecErreur: avecErreur.length,
    erreursReste: liste.reduce((s, p) => s + p.reste, 0),
    // /clavier-americain reste en mise en page ancienne sans être en anglais
    // (/bienvenue est passée en v2) : la page ne parle que des pages qui
    // portent les erreurs.
    erreursSurPagesEnAnglais: avecErreur.length > 0 && avecErreur.every((p) => p.page.startsWith('en/')),
  };
};
const resultat = {
  mesureLe: new Date().toISOString().slice(0, 10),
  mesureLeTexte: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  referentiel: REFERENTIEL,
  outil: `axe-core (règles WCAG ${REFERENTIEL} AA) et HTML_CodeSniffer (WCAG 2 AA), dans Microsoft Edge`,
  pages: pages.length,
  pagesSansErreur,
  pagesAvecErreur: pages.length - pagesSansErreur,
  erreurs: erreursClavier + erreursReste,
  erreursClavier,
  erreursReste,
  ancienneMiseEnPage: bilanMiseEnPage('ancienne'),
  nouvelleMiseEnPage: bilanMiseEnPage('nouvelle'),
  causesHorsClavier: Object.entries(parCause)
    .sort((a, b) => b[1].n - a[1].n)
    .map(([libelle, { n, pages: p }]) => ({ libelle, n, pages: p.size })),
  topCodesHorsClavier:Object.entries(parCode)
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
