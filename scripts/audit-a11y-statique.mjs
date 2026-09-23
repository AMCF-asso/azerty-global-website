#!/usr/bin/env node
// Passe accessibilité statique sur les pages bâties.
//
// Elle mesure exactement ce que /accessibilite affirme, et rien de plus : des
// critères décidables sur le HTML servi, sans navigateur et sans jugement
// humain. Tout ce qui demande un lecteur d'écran ou un avis reste hors de ce
// script — et la page le dit.
//
// La passe d'août 2026 était ad hoc : ses chiffres ont été publiés sans que
// personne puisse les rejouer. Celui-ci est versionné pour que la déclaration
// soit vérifiable par quiconque clone le dépôt.
//
//   node scripts/audit-a11y-statique.js [dist]
//
// Sortie : un résumé lisible, puis le JSON complet dans
// dist/../.a11y-statique.json. Code de retour 1 s'il reste un écart.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const racine = process.argv[2] ?? 'dist';

function pagesHtml(dossier) {
  const sorties = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sorties.push(...pagesHtml(chemin));
    else if (entree.endsWith('.html')) sorties.push(chemin);
  }
  return sorties;
}

// Balises auto-fermantes et attributs : assez de HTML pour ces sept critères,
// pas un parseur. Toute question plus fine appelle un vrai DOM, donc le
// navigateur, donc la suite e2e — pas ce script.
const attribut = (balise, nom) => {
  const m = balise.match(new RegExp(`\\s${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};
const aAttribut = (balise, nom) => new RegExp(`\\s${nom}(\\s|=|>|/)`, 'i').test(balise);

const ecarts = [];
const ajouter = (page, critere, detail) => ecarts.push({ page, critere, detail });

const titres = new Map();
const descriptions = new Map();
const pages = pagesHtml(racine).sort();

for (const chemin of pages) {
  const page = relative(racine, chemin).split(sep).join('/');
  const html = readFileSync(chemin, 'utf8');

  // 1. Attribut de langue sur <html>
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? '';
  const lang = attribut(htmlTag, 'lang');
  if (!lang) ajouter(page, 'lang', 'aucun attribut lang sur <html>');
  else if (!/^[a-z]{2}(-[A-Za-z]{2,})?$/.test(lang)) ajouter(page, 'lang', `valeur douteuse : ${lang}`);

  // 2. Texte de remplacement des images
  for (const img of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!aAttribut(img, 'alt')) ajouter(page, 'img-alt', img.slice(0, 110));
  }

  // 3. Nom accessible des champs de formulaire
  const idsLabellises = new Set(
    (html.match(/<label\b[^>]*>/gi) ?? []).map((l) => attribut(l, 'for')).filter(Boolean),
  );
  for (const champ of html.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []) {
    const type = (attribut(champ, 'type') ?? '').toLowerCase();
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
    // Un champ retiré de l'arbre d'accessibilité n'a pas à porter de nom : le
    // pot de miel anti-robot des formulaires et le <select> de secours de la
    // carte d'Afrique sont dans ce cas. Les compter serait s'accuser d'écarts
    // qui n'existent pas — une déclaration doit surtout ne pas mentir contre
    // elle-même.
    if ((attribut(champ, 'aria-hidden') ?? '') === 'true') continue;
    if (aAttribut(champ, 'hidden') || aAttribut(champ, 'disabled')) continue;
    const id = attribut(champ, 'id');
    const nomme =
      (id && idsLabellises.has(id)) ||
      attribut(champ, 'aria-label') ||
      attribut(champ, 'aria-labelledby') ||
      attribut(champ, 'title');
    if (!nomme) ajouter(page, 'champ-sans-nom', champ.slice(0, 110));
  }

  // 4. Liens externes en nouvelle fenêtre
  for (const a of html.match(/<a\b[^>]*>/gi) ?? []) {
    if ((attribut(a, 'target') ?? '') !== '_blank') continue;
    const rel = (attribut(a, 'rel') ?? '').toLowerCase();
    if (!rel.includes('noopener')) ajouter(page, 'target-blank-sans-noopener', a.slice(0, 110));
  }

  // 5. Un seul h1, et 6. aucun saut de niveau
  const niveaux = (html.match(/<h([1-6])\b[^>]*>/gi) ?? []).map((h) => Number(h.match(/h([1-6])/i)[1]));
  const nbH1 = niveaux.filter((n) => n === 1).length;
  if (nbH1 !== 1) ajouter(page, 'h1-unique', `${nbH1} titre(s) de niveau 1`);
  let precedent = 0;
  for (const n of niveaux) {
    if (precedent && n > precedent + 1) ajouter(page, 'saut-de-niveau', `h${precedent} suivi de h${n}`);
    precedent = n;
  }

  // 7. Unicité des titres et descriptions
  const titre = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!titre) ajouter(page, 'title-absent', '');
  else titres.set(titre, [...(titres.get(titre) ?? []), page]);
  const desc = attribut(html.match(/<meta\b[^>]*name=["']description["'][^>]*>/i)?.[0] ?? '', 'content');
  if (desc) descriptions.set(desc, [...(descriptions.get(desc) ?? []), page]);
}

for (const [titre, liste] of titres) {
  if (liste.length > 1) ajouter(liste.join(', '), 'title-duplique', titre);
}
for (const [desc, liste] of descriptions) {
  if (liste.length > 1) ajouter(liste.join(', '), 'description-dupliquee', desc.slice(0, 80));
}

const parCritere = {};
for (const e of ecarts) parCritere[e.critere] = (parCritere[e.critere] ?? 0) + 1;

// --- Contrastes, calculés depuis les jetons plutôt que recopiés ---------------
//
// La version précédente de /accessibilite publiait quatre ratios tapés à la
// main. Ils décrivaient la palette v1 et sont restés affichés bien après sa
// disparition : une déclaration d'accessibilité fausse sur ses propres chiffres.
// On les dérive donc de la feuille de jetons, comme /confidentialite dérive ses
// outils de mesure de son fichier de données.

const jetonsCss = readFileSync('css/v2/jetons.css', 'utf8');

// Chaque thème est un bloc de déclarations ; on lit celui du sélecteur donné.
function jetonsDuTheme(selecteur) {
  const debut = jetonsCss.indexOf(selecteur);
  if (debut === -1) throw new Error(`bloc de jetons introuvable : ${selecteur}`);
  const bloc = jetonsCss.slice(jetonsCss.indexOf('{', debut) + 1, jetonsCss.indexOf('}', debut));
  const table = {};
  for (const [, nom, valeur] of bloc.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) table[nom] = valeur.trim();
  // Un jeton peut renvoyer à un autre (`--bouton-primaire-fond: var(--action)`).
  const resoudre = (v, profondeur = 0) => {
    const m = v.match(/^var\(--([\w-]+)\)$/);
    if (!m || profondeur > 4) return v;
    return resoudre(table[m[1]] ?? v, profondeur + 1);
  };
  for (const nom of Object.keys(table)) table[nom] = resoudre(table[nom]);
  return table;
}

const canal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const h = hex.replace('#', '');
  const plein = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, v, b] = [0, 2, 4].map((i) => parseInt(plein.slice(i, i + 2), 16) / 255);
  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
}
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

// Les paires réellement servies. ⛔ `--bordure` n'y figure pas : elle ne dessine
// que des cartes, donc elle est décorative. Le critère WCAG 1.4.11, qui vise les
// contrôles de saisie, est tenu ailleurs par `--texte-2` — c'est écrit en toutes
// lettres dans composants.css, ne pas « harmoniser » l'un sur l'autre.
const pairesAMesurer = [
  { quoi: 'Texte courant', avant: 'encre', fond: 'papier' },
  { quoi: 'Texte secondaire', avant: 'texte-2', fond: 'papier' },
  { quoi: 'Lien dans le texte', avant: 'action', fond: 'papier' },
  { quoi: 'Libellé des boutons principaux', avant: 'bouton-primaire-texte', fond: 'bouton-primaire-fond' },
];

const SEUIL_AA = 4.5;
const themes = {};
for (const [nom, selecteur] of [['clair', ':root,'], ['sombre', '[data-theme="dark"]']]) {
  const table = jetonsDuTheme(selecteur);
  themes[nom] = pairesAMesurer.map(({ quoi, avant, fond }) => {
    const couleurAvant = table[avant];
    const couleurFond = table[fond];
    const valeur = ratio(couleurAvant, couleurFond);
    return { quoi, avant: couleurAvant, fond: couleurFond, ratio: valeur, conforme: valeur >= SEUIL_AA };
  });
}

const contrastesNonConformes = Object.values(themes)
  .flat()
  .filter((p) => !p.conforme);
for (const p of contrastesNonConformes) ajouter('jetons', 'contraste-sous-AA', `${p.quoi} : ${p.ratio}:1`);

console.log(`${pages.length} pages mesurées dans ${racine}/`);
if (!ecarts.length) {
  console.log('aucun écart sur les sept critères automatisables.');
} else {
  console.log(`${ecarts.length} écart(s) :`);
  for (const [critere, n] of Object.entries(parCritere).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${critere.padEnd(28)} ${n}`);
  }
  for (const e of ecarts.slice(0, 25)) console.log(`  · ${e.page} — ${e.critere} — ${e.detail}`);
  if (ecarts.length > 25) console.log(`  … et ${ecarts.length - 25} de plus (voir le JSON).`);
}

for (const [theme, paires] of Object.entries(themes)) {
  console.log(`contrastes, thème ${theme} :`);
  for (const p of paires) {
    console.log(`  ${p.conforme ? 'ok  ' : 'SOUS'} ${String(p.ratio).padStart(6)}:1  ${p.quoi}`);
  }
}

// La page /accessibilite lit ce fichier. C'est le contrat de /confidentialite,
// appliqué ici : ce qui est publié et ce qui est mesuré bougent ensemble, et
// personne ne retape un ratio à la main.
const aujourdhui = new Date();
const mesure = {
  mesureLe: aujourdhui.toISOString().slice(0, 10),
  mesureLeTexte: aujourdhui.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  pages: pages.length,
  criteresAutomatises: [
    'attribut de langue du document',
    'texte de remplacement des images',
    'nom accessible des champs de formulaire',
    'liens en nouvelle fenêtre avec rel="noopener"',
    'un seul titre de niveau 1 par page',
    'aucun saut de niveau de titre',
    'titres et descriptions non dupliqués',
  ],
  seuilAA: SEUIL_AA,
  themes,
  ecarts,
  parCritere,
  conforme: ecarts.length === 0,
};

writeFileSync(join(racine, '..', '.a11y-statique.json'), JSON.stringify(mesure, null, 2), 'utf8');
writeFileSync('src/_data/accessibiliteMesure.json', JSON.stringify(mesure, null, 2), 'utf8');

process.exit(ecarts.length ? 1 : 0);
