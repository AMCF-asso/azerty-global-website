#!/usr/bin/env node
// Recette des pages v2 : liste les écarts aux règles de DESIGN.md, REDACTION.md
// et SEO.md, page par page. Il ne corrige RIEN : Antoine tranche chaque écart
// (décision du 2026-09-28). La procédure et la part manuelle sont dans RECETTE.md.
//
//   npm run build
//   node scripts/recette-v2.mjs [--pages a-propos,faq] [--port 4190] [--sortie dossier]
//
// Deux niveaux :
//   écart       une règle opposable n'est pas respectée ;
//   à vérifier  une heuristique a levé un doute (chiffre, nombre, marge…).
// Code de sortie 1 s'il reste au moins un écart.
//
// Les listes LEXIQUE et TOURNURES recopient REDACTION.md § 3 et § 4, et
// JSONLD_PROPRE recopie SEO.md § 3 : une règle ajoutée là s'ajoute ici dans le
// même commit.
//
// ⛔ Il ne tourne pas dans `npm run build` : il demande un navigateur et
// plusieurs minutes. Toute requête hors du serveur local est bloquée (ni GTM,
// ni Umami pendant la recette).

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { get } from 'node:http';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const args = process.argv.slice(2);
const option = (nom, defaut) => {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const PORT = Number(option('port', 4190));
const BASE = `http://127.0.0.1:${PORT}`;
const SORTIE = option('sortie', 'test-results/recette-v2');
const FILTRE = option('pages', '').split(',').map((s) => s.trim()).filter(Boolean);
const LARGEURS = [320, 390, 768, 1024, 1440];
const DIST = 'dist';

// ---------------------------------------------------------------- règles

const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre';

// REDACTION.md § 3 (tournures) — { motif, remplaçant, source, sauf? }
const TOURNURES = [
  [/Aucune lettre n['’]est déplacée/i, '« Les lettres A à Z ne bougent pas »', 'ACC-02'],
  [/\b5 (améliorations|changements)\b/i, '« les cinq changements » / « les cinq améliorations »', 'A330'],
  [/99[   ]?% des habitudes|plus de 99[   ]?%/i, '« 99 % des frappes »', 'M&P § 6'],
  [/200[   ]?\+[   ]?langues|près de 300 langues/i, '« plus de 300 langues »', '2026-09-28'],
  [/C['’]est quoi AZERTY Global/, '« Qu’est-ce qu’AZERTY Global ? » (title exempté)', 'A431, C-03', { sansTitle: true }],
  [/Oui, et c['’]est prévu pour/i, '« Oui, c’est prévu : … »', 'A431'],
  [/mêmes lettres/i, 'la phrase d’identité de REDACTION.md § 1', 'M&P § 1'],
  [/la ligature œ|ligatures œ et æ/i, '« le e dans l’o (œ) », « le e dans l’a (æ) »', 'A550, ACC-04'],
  [/AZERTY classique|l['’]AZERTY Windows/, '« l’AZERTY traditionnel (de Windows) »', 'A569, A571'],
  [/\bLe hic\b/i, '« Le problème »', 'A549'],
  [/caret direct/i, '« l’accent circonflexe seul (caret) »', 'A549'],
  [/pour les mails\b/i, '« pour les adresses e-mail »', 'A549'],
  [/\bstickers?\b/i, '« autocollants »', 'A549'],
  [/(^|[\s(])ex\s?:/i, '« par exemple »', 'A333'],
  [/,[^,()\n]{1,40}…\s*\)/, '« …, etc. »', 'A449'],
  [/utilisateurs actifs/i, '« installations » (REDACTION.md § 6)', 'M&P § 6'],
  [/moins de 1[   ]?% des frappes/i, '« 1,01 % des frappes touchées » (REDACTION.md § 6)', '2026-09-28'],
];

// REDACTION.md § 6, « Chiffres de page » : valables sur leur page seulement.
const CHIFFRES_PAGE = {
  'comparatif.html': { pourcent: ['13,8', '30,3', '4,50'] },
  'afrique.html': { pourcent: ['5'], langues: ['153'], pays: ['54'] },
  'azerty-ameliore.html': { langues: ['26'] },
  'histoire-azerty.html': { pourcent: ['8,1', '0,9'] },
  'nouveautes.html': { pourcent: ['65', '84'] },
};

// REDACTION.md § 4 (lexique)
const LEXIQUE = [
  [/(?<![\w@.\-])emails?(?![\w@.\-])|\bcourriels?\b/i, 'e-mail', 'A542, CF-08'],
  [/backslash/i, 'antislash', 'A569, A289'],
  [/\bdevs\b/i, 'développeurs', 'A549'],
  [/\bBépo\b|BÉPO/, 'bépo', 'A545'],
  [/\binstalleurs?\b/i, 'installateur', 'A582'],
  [/Verrouillage Majuscule intelligent/, 'Verrouillage majuscule intelligent', 'A545'],
  [/zone de notification/i, 'barre des tâches, près de l’horloge', 'A360, A582, C-05', { toleree: 'nouveautes' }],
  [/recherche de caractère(?!s)/i, 'recherche de caractères', 'A582'],
  [/Barre oblique/, 'Barre diagonale (touche morte)', 'A395, GU-02'],
  [/\bMémo\b/, 'Nouveaux caractères', 'A394'],
  [/[a-zà-ÿ,;]\s+Pilote\b/, 'pilote', 'A430, A326'],
  [/\bAzerty Global\b|AZERTY-Global|AZERTY global\b|AzertyGlobal/, 'AZERTY Global', 'A311, A312'],
  [/hashtag/i, 'dièse', 'A330'],
  [/Dossier presse|Contact Presse/, 'Dossier de presse, Contact presse', 'A585'],
];

// SEO.md § 3 : type propre attendu par page (nom du fichier dans dist/)
const JSONLD_PROPRE = {
  'download.html': ['SoftwareApplication'],
  'a-propos.html': ['AboutPage'],
  'contact.html': ['ContactPage'],
  'histoire-azerty.html': ['Article'],
  'guide.html': ['TechArticle'],
  'dev.html': ['TechArticle'],
};
const TYPES_WEBPAGE = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage',
  'ProfilePage', 'QAPage', 'SearchResultsPage', 'CheckoutPage', 'FAQPage']);
const TYPES_ORG = new Set(['Organization', 'NGO', 'Corporation', 'EducationalOrganization']);

// ---------------------------------------------------------------- préparation

function fichiersHtml(dossier) {
  const out = [];
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) out.push(...fichiersHtml(p));
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

function plusRecent(dossier) {
  let max = 0;
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    const s = statSync(p);
    max = Math.max(max, s.isDirectory() ? plusRecent(p) : s.mtimeMs);
  }
  return max;
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ absent : lancer `npm run build` avant la recette.');
  process.exit(2);
}
const avertissements = [];
if (plusRecent('src') > statSync(join(DIST, 'index.html')).mtimeMs) {
  avertissements.push('dist/ est plus ancien que src/ : la recette porte peut-être sur un build périmé (`npm run build`).');
}

// Une page est v2 si elle charge la feuille de base v2.
const pages = fichiersHtml(DIST)
  .map((p) => relative(DIST, p).split(sep).join('/'))
  .filter((p) => readFileSync(join(DIST, p), 'utf8').includes('/css/v2/base.css'))
  .filter((p) => !FILTRE.length || FILTRE.some((f) => p === f || p === `${f}.html`))
  .sort();

const CSP = (() => {
  const lignes = readFileSync('_headers', 'utf8').split(/\r?\n/);
  const i = lignes.findIndex((l) => l.trim() === '/*');
  const l = lignes.slice(i + 1).find((x) => /^\s+Content-Security-Policy:/.test(x));
  return l ? l.split('Content-Security-Policy:')[1].trim() : null;
})();

const suivis = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/));
// CSS produites par un gabarit (permalink) : elles n'ont pas à être suivies.
const generees = new Set();
(function gabarits(dossier) {
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) gabarits(p);
    else if (e.endsWith('.njk')) {
      const m = readFileSync(p, 'utf8').match(/permalink:\s*["']?([^"'\s]+\.css)/);
      if (m) generees.add(m[1].replace(/^\//, ''));
    }
  }
})('src');

// ---------------------------------------------------------------- relevés

const releves = Object.fromEntries(pages.map((p) => [p, []]));
const note = (page, niveau, categorie, regle, detail, source = '') =>
  releves[page].push({ niveau, categorie, regle, detail, source });

const visible = (s) => s.replace(/ /g, '⎵').replace(/ /g, '˽');
const extrait = (texte, index, long = 34) =>
  visible(`${index > long ? '…' : ''}${texte.slice(Math.max(0, index - long), index + long)}${index + long < texte.length ? '…' : ''}`.replace(/[ \t\r\n]+/g, ' '));

function chercher(texte, motif) {
  const g = new RegExp(motif.source, motif.flags.includes('g') ? motif.flags : `${motif.flags}g`);
  return [...texte.matchAll(g)];
}

function sourceDe(page) {
  if (existsSync(`src/pages/${page.replace(/\.html$/, '.njk')}`)) return `src/pages/${page.replace(/\.html$/, '.njk')}`;
  if (existsSync(`src/${page.replace(/\.html$/, '.njk')}`)) return `src/${page.replace(/\.html$/, '.njk')}`;
  return 'src/landings.njk (src/_data)';
}

// Relevé statique sur le HTML livré (avant JS).
function releveStatique(page) {
  const html = readFileSync(join(DIST, page), 'utf8');
  const sansLd = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');

  const styles = chercher(sansLd, /<([a-z0-9-]+)[^>]*\sstyle\s*=\s*"([^"]*)"/i);
  for (const m of styles) note(page, 'écart', 'technique', 'attribut style= (bloqué par la CSP)', `<${m[1]} style="${m[2].slice(0, 60)}">`, 'DESIGN.md, Don’t');
  for (const m of chercher(sansLd, /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/i)) {
    if (/type="(application\/json|importmap)"/.test(m[1])) continue;
    note(page, 'écart', 'technique', 'script en ligne (bloqué par la CSP)', m[2].trim().slice(0, 70), '_headers');
  }
  for (const m of chercher(sansLd, /<style[^>]*>([\s\S]*?)<\/style>/i)) note(page, 'écart', 'technique', 'balise <style> en ligne (bloquée par la CSP)', m[1].trim().slice(0, 70), '_headers');
  for (const m of chercher(sansLd, /<[a-z0-9-]+[^>]*\s(on[a-z]+)\s*=/i)) note(page, 'écart', 'technique', `gestionnaire ${m[1]}= en ligne (bloqué par la CSP)`, m[0].slice(0, 70), '_headers');

  if (/<script[^>]+src="[^"]*temoignages\.js/.test(html)) note(page, 'écart', 'technique', 'témoignages rendus par JS (js/temoignages.js) : HTML statique attendu', '', 'DESIGN.md, Témoignages (A145)');

  for (const m of chercher(html, /<link rel="stylesheet" href="([^"]+)"/)) {
    const href = m[1].split('?')[0];
    if (/^https?:/.test(href)) continue;
    const chemin = href.replace(/^\//, '');
    if (!suivis.has(chemin) && !generees.has(chemin)) note(page, 'écart', 'technique', 'CSS non suivie par git', chemin, 'lot 7 (git ls-files)');
  }
}

// Relevé dans le navigateur (DOM après JS).
function extraireDom() {
  const SAUTE = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg']);
  const CODE = new Set(['CODE', 'KBD', 'PRE', 'SAMP', 'VAR']);
  const BLOC = 'p,li,td,th,h1,h2,h3,h4,h5,h6,dt,dd,figcaption,summary,blockquote,label,button,legend,caption,div,section,article,header,footer,nav,main,aside,form,figure,details,option';
  const decrire = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}`;
  const segments = [];
  let bloc = null; let seg = null; let dernierCode = null;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    let el = n.parentElement; let saute = false; let code = null;
    for (let a = el; a; a = a.parentElement) {
      // Le clavier affiché est une image (role="img") : ses touches ne sont pas du texte courant.
      if (SAUTE.has(a.tagName) || a.getAttribute('role') === 'img') { saute = true; break; }
      if (!code && CODE.has(a.tagName)) code = a;
    }
    if (saute) continue;
    const b = el.closest(BLOC) || document.body;
    if (b !== bloc) {
      bloc = b;
      const langue = (b.closest('[lang]')?.getAttribute('lang') || 'fr').slice(0, 2);
      // Témoignages : texte de data/temoignages.json, figé mot pour mot (D54).
      const temoignage = !!b.closest('blockquote, .temoignage, .temoignages, [id^="temoignages"]');
      // Exemples « à éviter » du guide typographique : fautifs à dessein.
      const mauvais = !!b.closest('.exemple-typo--eviter');
      seg = { texte: '', ou: decrire(b), cellule: !!b.closest('td,th'), langue: temoignage ? 'temoignage' : mauvais ? 'exemple' : langue };
      segments.push(seg);
      dernierCode = null;
    }
    if (code) { if (code !== dernierCode) seg.texte += '⟦k⟧'; dernierCode = code; continue; }
    dernierCode = null;
    seg.texte += n.data;
  }
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const main = document.querySelector('main') || document.body;
  const h2 = [...main.querySelectorAll('h2')].filter((h) => h.offsetParent && !h.closest('[class*="carte"],[class*="card"]'))
    .map((h) => {
      const s = h.nextElementSibling;
      if (!s || !s.offsetParent) return null;
      return { titre: h.textContent.trim().slice(0, 50), ecart: Math.round(s.getBoundingClientRect().top - h.getBoundingClientRect().bottom) };
    }).filter(Boolean);
  return {
    langue: document.documentElement.lang || 'fr',
    segments: segments.filter((s) => s.texte.trim()),
    title: document.title,
    description: meta('meta[name="description"]'),
    ogDescription: meta('meta[property="og:description"]'),
    twitterDescription: meta('meta[name="twitter:description"]'),
    ogImageAlt: meta('meta[property="og:image:alt"]'),
    attributs: [...document.querySelectorAll('[alt],[aria-label]')].flatMap((el) => ['alt', 'aria-label']
      .filter((a) => el.getAttribute(a)).map((a) => ({ ou: `${decrire(el)}[${a}]`, texte: el.getAttribute(a) }))),
    jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    blank: [...main.querySelectorAll('a[target="_blank"]')].map((a) => `${a.textContent.trim().slice(0, 40)} → ${a.getAttribute('href')}`),
    carrousel: [...document.querySelectorAll('[class*="carrousel"],[class*="carousel"],[class*="swiper"],[class*="slick"]')].map(decrire).slice(0, 3),
    // A398 vise « Feedback & Discord » comme intitulé ; un lien « Discord » vers le canal reste.
    actions: [...document.querySelectorAll('a,button,h2,h3')].map((e) => e.textContent.trim()).filter((t) => /^Feedback\b/i.test(t)),
    h2,
  };
}

function debordement(vw) {
  const doc = document.documentElement;
  if (doc.scrollWidth <= vw + 1) return [];
  const fautifs = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.display === 'none') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= vw + 1) continue;
    const p = el.parentElement?.getBoundingClientRect();
    if (p && p.right > vw + 1) continue;
    fautifs.push(`<${el.tagName.toLowerCase()}${el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : ''}> right=${Math.round(r.right)} « ${(el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)} »`);
    if (fautifs.length >= 4) break;
  }
  return [`scrollWidth ${doc.scrollWidth} > ${vw}`, ...fautifs];
}

// ---------------------------------------------------------------- contrôles texte

function controlerTexte(page, dom) {
  const fr = dom.langue.startsWith('fr');
  const ici = page.replace(/\.html$/, '');

  // Chaînes auxquelles le lexique s'applique (SEO.md : title, meta, JSON-LD).
  const chainesLd = [];
  for (const brut of dom.jsonld) {
    try {
      (function parcourir(v) {
        if (typeof v === 'string') chainesLd.push(v);
        else if (v && typeof v === 'object') Object.values(v).forEach(parcourir);
      })(JSON.parse(brut));
    } catch { /* signalé par controlerJsonLd */ }
  }
  const champs = [
    ...dom.segments.filter((s) => s.langue === 'fr').map((s) => ({ ...s, type: 'texte' })),
    { texte: dom.title, ou: '<title>', type: 'title' },
    // ogImageAlt égal au title en est une copie (base.njk) : il n'est vérifié qu'une fois.
    ...['description', 'ogDescription', 'twitterDescription', 'ogImageAlt'].filter((k) => dom[k] && !(k === 'ogImageAlt' && dom[k] === dom.title)).map((k) => ({ texte: dom[k], ou: k, type: 'meta' })),
    ...dom.attributs.map((a) => ({ ...a, type: 'attribut' })),
    ...chainesLd.map((t) => ({ texte: t, ou: 'JSON-LD', type: 'meta' })),
  ];

  if (fr) {
    for (const c of champs) {
      for (const [motif, remplacant, source, opts = {}] of TOURNURES) {
        if (opts.sansTitle && c.type === 'title') continue;
        for (const m of chercher(c.texte, motif)) note(page, 'écart', 'tournure', `« ${m[0].trim()} » → ${remplacant}`, `${c.ou} : ${extrait(c.texte, m.index)}`, `REDACTION.md § 3, ${source}`);
      }
      for (const [motif, impose, source, opts = {}] of LEXIQUE) {
        for (const m of chercher(c.texte, motif)) {
          const niveau = opts.toleree === ici ? 'à vérifier' : 'écart';
          note(page, niveau, 'lexique', `« ${m[0].trim()} » → ${impose}${niveau === 'à vérifier' ? ' (toléré dans le journal historique)' : ''}`, `${c.ou} : ${extrait(c.texte, m.index)}`, `REDACTION.md § 4, ${source}`);
        }
      }
    }
    const plein = dom.segments.map((s) => s.texte).join('\n');
    const joafe = plein.indexOf('JOAFE');
    const jo = plein.indexOf('Journal officiel des associations');
    if (joafe >= 0 && (jo < 0 || jo > joafe)) note(page, 'écart', 'lexique', 'JOAFE sans « Journal officiel des associations » à la première mention', extrait(plein, joafe), 'REDACTION.md § 4, A585');
    for (const t of dom.actions) note(page, 'écart', 'tournure', `intitulé d'action « ${t} » → « Nous écrire »`, '', 'REDACTION.md § 3, A398');
  }

  // Typographie (REDACTION.md § 5), texte français seulement.
  if (fr) {
    const regles = [
      [/'/, 'apostrophe droite dans le texte visible → ’', 'A112, A295'],
      [/[^\s  (](?=[;!?](?:[\s  »)]|$))/, 'espace fine insécable (U+202F) manquante avant ; ! ?', 'A541, LG-01'],
      // Sauf signe cité comme glyphe : « Maj + ; », « (§, !, * », « …, ; en Maj ».
      [/[^\s+,(] (?=[;!?](?:[\s  »)]|$))/, 'espace ordinaire (sécable) avant ; ! ? : U+202F attendue', 'A541, LG-01'],
      [/\S (?=[;!?])/, 'insécable U+00A0 avant ; ! ? : fine U+202F attendue', 'A541, LG-01'],
      // Sauf « : » cité comme signe (« et : ? », « sur :/! »).
      [/[  ]:(?!\d)(?![\/!?;]|[   ][?!;])/, 'espace avant « : » : U+00A0 attendue', 'A541, LG-01'],
      [/[^\s  \d/]:(?=[\s ]|$)/, 'espace insécable (U+00A0) manquante avant « : »', 'A541, LG-01'],
      [/\d[  ]?%/, 'insécable (U+00A0) attendue entre le nombre et %', 'A541, A557'],
      // « » cités comme glyphes (« les guillemets « » ») ne sont pas des guillemets ouvrants.
      // Ni « et » cités seuls comme glyphes (cellule, puce suivie de ⟦k⟧).
      [/«(?![   ]?(»|⟦k⟧|,|$))(?! )/, 'insécable (U+00A0) attendue après «', 'A541'],
      [/(?<!«[   ]?)(?<!^\s*)(?<! )»/, 'insécable (U+00A0) attendue avant »', 'A541'],
      [new RegExp(`\\b(1er|\\d{1,2})[ \\u202F](${MOIS})\\b`), 'insécable (U+00A0) attendue entre le quantième et le mois', 'A541, A495'],
      [/Inc\.\./, 'double point après « Inc. »', 'A454'],
      // Une entité dans une chaîne échappée s'affiche telle quelle (landings, 2026-09-28).
      [/&(?:nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-f]+);/i, 'entité HTML affichée en clair', 'build'],
    ];
    for (const s of dom.segments.filter((x) => x.langue === 'fr')) {
      for (const [motif, regle, source] of regles) {
        for (const m of chercher(s.texte, motif)) note(page, 'écart', 'typographie', regle, `${s.ou} : ${extrait(s.texte, m.index + 1)}`, `REDACTION.md § 5, ${source}`);
      }
      for (const m of chercher(s.texte, /\b\d{1,3}(?: \d{3})+\b/)) note(page, 'à vérifier', 'typographie', 'nombre groupé par une espace ordinaire (sécable)', `${s.ou} : ${extrait(s.texte, m.index)}`, 'REDACTION.md § 5, A557');
      // Identifiants sans séparateur : codes Alt (0…), années, SIREN et autres
      // numéros de 9 chiffres ou plus, normes, numéros d'annonce.
      for (const m of chercher(s.texte, /(?<![\w.,-])(?<!version |ISO\/IEC |SIREN |RNA |n°[  ]?|Alt \+ |Alt )\d{4,}(?![\w.,-])/)) {
        const v = Number(m[0]);
        if (m[0].startsWith('0') || m[0].length >= 9 || (v >= 1500 && v <= 2099)) continue;
        note(page, 'à vérifier', 'typographie', `nombre « ${m[0]} » sans séparateur de milliers`, `${s.ou} : ${extrait(s.texte, m.index)}`, 'REDACTION.md § 5, A557');
      }
      if (s.cellule) {
        for (const m of chercher(s.texte, /[✓-✘❌❎✅]|(?![©®™])\p{Extended_Pictographic}/u)) note(page, 'écart', 'typographie', 'coche, croix ou emoji dans un tableau → « Oui », « Non »…', `${s.ou} : ${extrait(s.texte, m.index)}`, 'REDACTION.md § 3, A063, A429');
      }
      // Chiffres hors du tableau REDACTION.md § 6 : doute seulement. Les exemples
      // du guide typographique (« 25 % · 19,90 € ») ne sont pas des affirmations.
      if (/exemple-typo/.test(s.ou)) continue;
      const local = CHIFFRES_PAGE[page] || {};
      for (const m of chercher(s.texte, /(\d+(?:,\d+)?)[   ]?%/)) {
        if (!['99', '1,01', '100', ...(local.pourcent || [])].includes(m[1])) note(page, 'à vérifier', 'chiffre', `« ${m[0]} » absent de REDACTION.md § 6`, `${s.ou} : ${extrait(s.texte, m.index)}`, 'REDACTION.md § 6');
      }
      for (const [motif, ok] of [[/(\d[\d   ]*\d|\d)\s*langues/, ['300', ...(local.langues || [])]], [/(\d[\d   ]*\d|\d)\s*installations/, ['1000']], [/(\d+)\s*pays\b/, ['80', ...(local.pays || [])]], [/(\d+)\s*gravures/, ['31', '12']]]) {
        for (const m of chercher(s.texte, motif)) {
          if (!ok.includes(m[1].replace(/[   ]/g, ''))) note(page, 'à vérifier', 'chiffre', `« ${m[0].trim()} » absent de REDACTION.md § 6`, `${s.ou} : ${extrait(s.texte, m.index)}`, 'REDACTION.md § 6');
        }
      }
    }
    if (dom.title.includes("'")) note(page, 'écart', 'typographie', 'apostrophe droite dans le title → ’', dom.title, 'SEO.md § 1, C-02');
    for (const k of ['description', 'ogDescription', 'twitterDescription', 'ogImageAlt']) {
      if (k === 'ogImageAlt' && dom[k] === dom.title) {
        if (dom[k].includes('’')) note(page, 'à vérifier', 'typographie', "ogImageAlt hérite du title (base.njk) : ’ du title contre ' des attributs", dom[k], 'SEO.md § 1-2, C-02');
        continue;
      }
      if (dom[k]?.includes('’')) note(page, 'écart', 'typographie', `apostrophe ’ dans ${k} → '`, extrait(dom[k], dom[k].indexOf('’')), 'SEO.md § 2, C-02');
    }
    for (const a of dom.attributs) if (a.texte.includes('’')) note(page, 'écart', 'typographie', "apostrophe ’ dans un attribut → '", `${a.ou} : ${extrait(a.texte, a.texte.indexOf('’'))}`, 'REDACTION.md § 5, C-02');
    if (chainesLd.some((t) => t.includes('’'))) {
      const t = chainesLd.find((x) => x.includes('’'));
      note(page, 'écart', 'typographie', "apostrophe ’ dans le JSON-LD → '", extrait(t, t.indexOf('’')), 'SEO.md § 3, C-02');
    }
  }
}

// ---------------------------------------------------------------- métadonnées

function controlerMeta(page, dom) {
  const n = (s) => [...(s || '')].length;
  const t = dom.title || '';
  if (n(t) > 60) note(page, 'écart', 'métadonnées', `title de ${n(t)} caractères (60 au plus)`, t, 'SEO.md § 1');
  if (/[|—&]/.test(t)) note(page, 'écart', 'métadonnées', 'title : ni « | », ni « — », ni esperluette', t, 'SEO.md § 1');
  if (/\b20\d\d\b/.test(t)) note(page, 'écart', 'métadonnées', 'title : pas d’année', t, 'SEO.md § 1');
  // Sans suffixe seulement si le sujet contient déjà la marque.
  if (!t.endsWith(' – AZERTY Global') && !t.includes('AZERTY Global')) note(page, 'écart', 'métadonnées', 'title au format « Sujet – AZERTY Global »', t, 'SEO.md § 1');
  for (const k of ['description', 'ogDescription']) {
    const d = dom[k];
    if (!d) { if (k === 'description') note(page, 'écart', 'métadonnées', 'meta description absente', '', 'SEO.md § 2'); continue; }
    if (k === 'ogDescription' && d === dom.description) continue;
    if (n(d) < 120 || n(d) > 155) note(page, 'écart', 'métadonnées', `${k} de ${n(d)} caractères (120 à 155)`, d, 'SEO.md § 2');
  }

  const types = new Set(); let orgRef = false;
  for (const brut of dom.jsonld) {
    let v;
    try { v = JSON.parse(brut); } catch (e) { note(page, 'écart', 'métadonnées', 'JSON-LD illisible', e.message, 'SEO.md § 3'); continue; }
    (function parcourir(x) {
      if (Array.isArray(x)) return x.forEach(parcourir);
      if (!x || typeof x !== 'object') return;
      for (const ty of [].concat(x['@type'] || [])) types.add(ty);
      if (typeof x['@id'] === 'string' && /organi[sz]ation|amcf/i.test(x['@id'])) orgRef = true;
      Object.values(x).forEach(parcourir);
    })(v);
  }
  if (types.has('FAQPage')) note(page, 'écart', 'métadonnées', 'JSON-LD FAQPage interdit', '', 'SEO.md § 3');
  if (![...types].some((x) => TYPES_WEBPAGE.has(x) && x !== 'FAQPage')) note(page, 'écart', 'métadonnées', 'socle JSON-LD : WebPage (ou sous-type) absent', [...types].join(', ') || 'aucun JSON-LD', 'SEO.md § 3');
  if (!types.has('BreadcrumbList') && page !== 'index.html' && page !== 'en/index.html') note(page, 'écart', 'métadonnées', 'socle JSON-LD : BreadcrumbList absent', [...types].join(', ') || 'aucun JSON-LD', 'SEO.md § 3');
  if (![...types].some((x) => TYPES_ORG.has(x)) && !orgRef) note(page, 'écart', 'métadonnées', 'socle JSON-LD : Organization absente', [...types].join(', ') || 'aucun JSON-LD', 'SEO.md § 3');
  for (const attendu of JSONLD_PROPRE[page] || []) {
    if (!types.has(attendu)) note(page, 'écart', 'métadonnées', `type propre JSON-LD attendu : ${attendu}`, [...types].join(', ') || 'aucun JSON-LD', 'SEO.md § 3');
  }
}

// ---------------------------------------------------------------- navigateur

async function lancerNavigateur() {
  for (const opts of [{}, { channel: 'msedge' }, { channel: 'chrome' }]) {
    try { return await chromium.launch(opts); } catch { /* suivant */ }
  }
  throw new Error('aucun navigateur Chromium disponible (npx playwright install chromium)');
}

async function attendreServeur() {
  let derniere = '';
  for (let i = 0; i < 50; i++) {
    // http.get plutôt que fetch : fetch suit les variables de proxy de l'environnement.
    const statut = await new Promise((ok) => {
      get(`${BASE}/index.html`, (r) => { r.resume(); ok(r.statusCode); }).on('error', (e) => ok(e.code || e.message));
    });
    if (statut === 200) return;
    derniere = String(statut);
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`serveur local injoignable sur ${BASE} (${derniere} ; serveur : ${erreurServeur.trim() || 'muet'})`);
}

async function nouveauContexte(navigateur, largeur) {
  const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 900 } });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ← ${e.blockedURI || 'inline'} (${(e.sourceFile || '').split('/').pop()}:${e.lineNumber})`));
  });
  await ctx.route('**/*', async (route) => {
    const req = route.request();
    if (!req.url().startsWith(BASE)) return route.abort();
    if (req.resourceType() !== 'document' || !CSP) return route.continue();
    const rep = await route.fetch();
    return route.fulfill({ response: rep, headers: { ...rep.headers(), 'content-security-policy': CSP } });
  });
  return ctx;
}

const estClavier = (sel) => /accents-ligatures|clavier|touche|-r\d/.test(sel);

async function releveNavigateur(navigateur, page) {
  const url = `${BASE}/${page}`;
  const csp = new Set();
  let dom = null;
  for (const largeur of [...LARGEURS].reverse()) {
    const ctx = await nouveauContexte(navigateur, largeur);
    const pg = await ctx.newPage();
    try {
      await pg.goto(url, { waitUntil: 'load', timeout: 30000 });
      await pg.waitForTimeout(300);
    } catch (e) {
      note(page, 'écart', 'technique', `chargement impossible à ${largeur} px`, e.message.split('\n')[0], '');
      await ctx.close();
      continue;
    }
    for (const v of await pg.evaluate(() => window.__csp)) csp.add(v);
    const deb = await pg.evaluate(debordement, largeur);
    if (deb.length) note(page, 'écart', 'technique', `débordement horizontal à ${largeur} px`, deb.join(' ; '), 'DESIGN.md, Layout');

    if (largeur === 1440) {
      dom = await pg.evaluate(extraireDom);
      const axe = await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      for (const v of axe.violations) {
        const cibles = v.nodes.map((nd) => nd.target.join(' '));
        const clavier = cibles.filter(estClavier).length;
        const reste = cibles.length - clavier;
        if (reste) note(page, 'écart', 'accessibilité', `axe ${v.id} (${v.impact}) : ${reste} nœud(s)`, `${v.help} ; ${cibles.filter((c) => !estClavier(c)).slice(0, 3).join(' | ')}`, 'WCAG 2.2 AA');
        if (clavier) note(page, 'à vérifier', 'accessibilité', `axe ${v.id} sur le clavier (role="img") : ${clavier} nœud(s)`, 'glyphes d’une image porteuse d’autre contenu (WCAG 1.4.3)', 'audit-a11y-navigateur.mjs');
      }
      // Permis seulement là où une saisie serait perdue : chaque cas se juge.
      for (const b of dom.blank) note(page, 'à vérifier', 'technique', 'lien target="_blank" dans le contenu', b, 'DESIGN.md, Navigation (LG-04)');
      for (const c of dom.carrousel) note(page, 'écart', 'technique', 'composant de carrousel', c, 'DESIGN.md, Témoignages (A145)');
      for (const h of dom.h2) {
        if (Math.abs(h.ecart - 24) > 1) note(page, 'à vérifier', 'visuel', `${h.ecart} px sous le h2 (24 px attendus)`, h.titre, 'DESIGN.md, Layout (A152, C-04)');
      }
    }
    await ctx.close();
  }
  for (const v of csp) note(page, 'écart', 'technique', 'violation de la CSP', v, '_headers');
  return dom;
}

// ---------------------------------------------------------------- rapport

function rapport(verify) {
  const tous = Object.entries(releves);
  const compte = (l, niv) => l.filter((r) => r.niveau === niv).length;
  const total = tous.reduce((s, [, l]) => s + compte(l, 'écart'), 0);
  const doutes = tous.reduce((s, [, l]) => s + compte(l, 'à vérifier'), 0);
  const md = [
    '# Recette des pages v2',
    '',
    `Généré le ${new Date().toISOString().slice(0, 16).replace('T', ' ')} par \`scripts/recette-v2.mjs\` sur \`dist/\`. Aucune correction n'a été faite.`,
    '',
    `- Pages v2 : ${pages.length} ; écarts : ${total} ; à vérifier : ${doutes}.`,
    `- \`npm run verify:11ty\` : ${verify}.`,
    ...avertissements.map((a) => `- ⚠️ ${a}`),
    '- Dans les extraits, ⎵ = espace insécable (U+00A0), ˽ = espace fine insécable (U+202F), ⟦k⟧ = contenu de `<kbd>`/`<code>`.',
    '',
    '| Page | Source | Écarts | À vérifier |',
    '|---|---|---|---|',
    ...tous.map(([p, l]) => `| ${p} | \`${sourceDe(p)}\` | ${compte(l, 'écart')} | ${compte(l, 'à vérifier')} |`),
    '',
  ];
  for (const [p, l] of tous) {
    if (!l.length) continue;
    md.push(`## ${p}`, '');
    for (const niveau of ['écart', 'à vérifier']) {
      const sel = l.filter((r) => r.niveau === niveau);
      if (!sel.length) continue;
      md.push(`### ${niveau === 'écart' ? 'Écarts' : 'À vérifier'} (${sel.length})`, '');
      for (const cat of [...new Set(sel.map((r) => r.categorie))]) {
        md.push(`**${cat}**`, '');
        for (const r of sel.filter((x) => x.categorie === cat)) md.push(`- ${r.regle}${r.detail ? ` — ${r.detail.replace(/\|/g, '\\|')}` : ''}${r.source ? ` *(${r.source})*` : ''}`);
        md.push('');
      }
    }
  }
  return { md: md.join('\n'), total, doutes };
}

// ---------------------------------------------------------------- exécution

let verify;
try {
  execFileSync(process.execPath, ['scripts/verify-11ty-passthrough.js'], { encoding: 'utf8', stdio: 'pipe' });
  verify = 'réussi';
} catch (e) {
  verify = `ÉCHEC — ${(e.stdout || e.message).trim().split(/\r?\n/).slice(-3).join(' / ')}`;
}

const serveur = spawn(process.execPath, ['scripts/serve-static.js', DIST, String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let erreurServeur = '';
serveur.stdout.on('data', (d) => { erreurServeur += d; });
serveur.stderr.on('data', (d) => { erreurServeur += d; });
serveur.on('exit', (code) => { if (code) console.error(`serveur local arrêté (${code}) : ${erreurServeur.trim().split('\n').slice(-2).join(' / ')}`); });
let navigateur;
try {
  await attendreServeur();
  navigateur = await lancerNavigateur();
  for (const [i, page] of pages.entries()) {
    process.stdout.write(`[${i + 1}/${pages.length}] ${page}\n`);
    releveStatique(page);
    const dom = await releveNavigateur(navigateur, page);
    if (dom) { controlerTexte(page, dom); controlerMeta(page, dom); }
  }
} finally {
  await navigateur?.close();
  serveur.kill();
}

const { md, total, doutes } = rapport(verify);
mkdirSync(SORTIE, { recursive: true });
writeFileSync(join(SORTIE, 'rapport.md'), md);
writeFileSync(join(SORTIE, 'rapport.json'), JSON.stringify({ verify, avertissements, releves }, null, 2));
console.log(`\n${pages.length} pages v2 ; ${total} écart(s), ${doutes} à vérifier ; verify:11ty ${verify}.`);
console.log(`Rapport : ${join(SORTIE, 'rapport.md')}`);
process.exit(total ? 1 : 0);
