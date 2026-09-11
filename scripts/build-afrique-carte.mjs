/**
 * Génère la carte SVG de l'Afrique de la page /afrique (décisions du 2026-09-11,
 * operations/refonte-site/2026-09-11-decisions-afrique-carte.md, #4, #13, #16, #22).
 *
 * Entrées : world-atlas (Natural Earth 1:50m, domaine public) et data/afrique-pays.json.
 * Sortie  : src/_includes/v2/carte-afrique.njk — un SVG inline, 54 pays cliquables
 *           (`data-pays`), pastilles pour les États insulaires, zones de clic élargies
 *           pour les petits États continentaux, Sahara occidental hachuré non cliquable,
 *           Somaliland fusionné dans la Somalie (convention ONU).
 *
 * Le script tourne à la main (`node scripts/build-afrique-carte.mjs [--poids=0.01]`) ; le
 * fichier généré est commité. Rien ne se télécharge au build Cloudflare.
 * Les tracés sont simplifiés (Visvalingam, topojson-simplify) : le 1:50m brut pèse 239 ko,
 * la cible est ≤ 90 ko ; les centroïdes et aires sont mesurés AVANT simplification.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as topojson from 'topojson-client';
import { presimplify, simplify } from 'topojson-simplify';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';

const require = createRequire(import.meta.url);
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SORTIE = path.join(RACINE, 'src', '_includes', 'v2', 'carte-afrique.njk');
const argPoids = process.argv.find((a) => a.startsWith('--poids='));
const POIDS_MIN = argPoids ? Number(argPoids.split('=')[1]) : 0.008; // deg², aire de triangle sous laquelle un point disparaît (0.006 → 91 ko, 0.01 → efface les Seychelles)
const SEC = process.argv.includes('--sec'); // mesure seulement, n'écrit pas

// Unités du viewBox : la carte est ajustée dans 1000 × 1000 puis le viewBox est
// resserré sur son contenu. À ~1100 px de rendu, 1 unité ≈ 1,1 px.
const CADRE = 1000;
const MARGE = 12;
const RAYON_PASTILLE = 7.5; // ≈ 16 px de diamètre au rendu (décision 13 : ~14 px)
const RAYON_ZONE = 11; // zone de clic invisible des petits États continentaux
const AIRE_PETIT_ETAT = 360; // unités² : Gambie, Eswatini, Djibouti, Rwanda, Guinée éq., Burundi, Lesotho
const CHIFFRES = 1; // décimales des tracés

const brut = require('world-atlas/countries-50m.json');
const simplifie = simplify(presimplify(brut), POIDS_MIN);
const { pays } = JSON.parse(fs.readFileSync(path.join(RACINE, 'data', 'afrique-pays.json'), 'utf8'));

function geometrie(topologie, { num, nom }) {
  const g = topologie.objects.countries.geometries.find((x) => (num ? x.id === num : x.properties && x.properties.name === nom));
  if (!g) throw new Error(`Entité ${num || nom} absente de world-atlas`);
  return g;
}

// --- Entités (une version brute pour mesurer, une simplifiée pour dessiner) ----------
function entites(topologie) {
  return pays.map((p) => {
    const geom = p.code === 'SO'
      ? topojson.merge(topologie, [geometrie(topologie, { num: p.num }), geometrie(topologie, { nom: 'Somaliland' })]) // décision 16
      : topojson.feature(topologie, geometrie(topologie, { num: p.num })).geometry;
    return { ...p, feature: { type: 'Feature', properties: { code: p.code }, geometry: geom } };
  });
}
const entitesBrutes = entites(brut);
const entitesDessin = entites(simplifie);
const saharaBrut = topojson.feature(brut, geometrie(brut, { num: '732' }));
const saharaDessin = topojson.feature(simplifie, geometrie(simplifie, { num: '732' }));

// --- Projection, calée sur les données brutes ---------------------------------------
const collectionBrute = { type: 'FeatureCollection', features: [...entitesBrutes.map((e) => e.feature), saharaBrut] };
const projection = geoAzimuthalEqualArea()
  .rotate([-17, -2])
  .fitExtent([[MARGE, MARGE], [CADRE - MARGE, CADRE - MARGE]], collectionBrute);
const trace = geoPath(projection).digits(CHIFFRES);

// Frontières en un seul tracé (pas de bordure doublée, survol propre).
const frontieres = topojson.mesh(
  simplifie,
  { type: 'GeometryCollection', geometries: [...pays.map((p) => geometrie(simplifie, { num: p.num })), geometrie(simplifie, { nom: 'Somaliland' }), geometrie(simplifie, { num: '732' })] },
  (a, b) => {
    // La limite Somalie / Somaliland n'est pas une frontière (décision 16).
    const noms = [a.properties && a.properties.name, b.properties && b.properties.name];
    return !(noms.includes('Somaliland') && (a.id === '706' || b.id === '706'));
  },
);

// --- Mesures (brutes) ---------------------------------------------------------------
const arrondi = (v) => Math.round(v * 10) / 10;
const [[x0, y0], [x1, y1]] = trace.bounds(collectionBrute);
const viewBox = [arrondi(x0 - MARGE), arrondi(y0 - MARGE), arrondi(x1 - x0 + 2 * MARGE), arrondi(y1 - y0 + 2 * MARGE)];
const mesures = new Map(entitesBrutes.map((e) => [e.code, { aire: trace.area(e.feature), centre: trace.centroid(e.feature).map(arrondi) }]));

// --- SVG ----------------------------------------------------------------------------
const echap = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const L = [];
L.push('{# Généré par scripts/build-afrique-carte.mjs — ne pas éditer à la main. #}');
L.push(`{# Source : Natural Earth 1:50m via world-atlas (domaine public), simplifié (poids ${POIDS_MIN}), projection azimutale équivalente. #}`);
L.push(`<svg class="carte-afrique" viewBox="${viewBox.join(' ')}" aria-hidden="true" focusable="false" data-carte-afrique>`);
L.push('  <defs>');
L.push('    <pattern id="carte-afrique-hachures" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">');
L.push('      <line x1="0" y1="0" x2="0" y2="6" class="carte-afrique__hachure" />');
L.push('    </pattern>');
L.push('  </defs>');
L.push('  <g class="carte-afrique__pays-groupe">');
for (const e of entitesDessin) {
  const d = trace(e.feature);
  if (!d) {
    // Un État insulaire peut disparaître à la simplification : sa pastille le représente (décision 13).
    if (e.pastille) continue;
    throw new Error(`Tracé vide pour ${e.code} au poids ${POIDS_MIN}`);
  }
  const classes = `carte-afrique__pays${e.ecritureMajoritaire ? ' carte-afrique__pays--non-latin' : ''}${e.pastille ? ' carte-afrique__pays--insulaire' : ''}`;
  L.push(`    <path class="${classes}" data-pays="${e.code.toLowerCase()}" data-nom="${echap(e.nom)}" d="${d}" />`);
}
L.push('  </g>');
L.push(`  <path class="carte-afrique__territoire" data-nom="Sahara occidental" data-statut="territoire non autonome" d="${trace(saharaDessin)}" />`);
L.push(`  <path class="carte-afrique__frontieres" d="${trace(frontieres)}" />`);
L.push('  <g class="carte-afrique__zones">');
for (const e of entitesBrutes) {
  const m = mesures.get(e.code);
  if (e.pastille || m.aire >= AIRE_PETIT_ETAT) continue;
  L.push(`    <circle class="carte-afrique__zone" data-pays="${e.code.toLowerCase()}" data-nom="${echap(e.nom)}" cx="${m.centre[0]}" cy="${m.centre[1]}" r="${RAYON_ZONE}" />`);
}
L.push('  </g>');
L.push('  <g class="carte-afrique__pastilles">');
for (const e of entitesBrutes) {
  if (!e.pastille) continue;
  const [cx, cy] = mesures.get(e.code).centre;
  const aGauche = e.etiquette === 'gauche';
  const tx = arrondi(aGauche ? cx - RAYON_PASTILLE - 6 : cx + RAYON_PASTILLE + 6);
  L.push(`    <g class="carte-afrique__pastille-groupe" data-pays="${e.code.toLowerCase()}" data-nom="${echap(e.nom)}">`);
  L.push(`      <circle class="carte-afrique__pastille" cx="${cx}" cy="${cy}" r="${RAYON_PASTILLE}" />`);
  L.push(`      <text class="carte-afrique__etiquette" x="${tx}" y="${arrondi(cy + 4)}" text-anchor="${aGauche ? 'end' : 'start'}">${echap(e.nom)}</text>`);
  L.push('    </g>');
}
L.push('  </g>');
L.push('</svg>');

const svg = L.join('\n') + '\n';
if (!SEC) {
  fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
  fs.writeFileSync(SORTIE, svg, 'utf8');
}

// --- Rapport ------------------------------------------------------------------------
const zones = entitesBrutes.filter((e) => !e.pastille && mesures.get(e.code).aire < AIRE_PETIT_ETAT).map((e) => `${e.code} ${Math.round(mesures.get(e.code).aire)}`);
console.log(`poids ${POIDS_MIN} : ${entitesDessin.length} pays, viewBox ${viewBox.join(' ')}, ${(Buffer.byteLength(svg) / 1024).toFixed(1)} ko${SEC ? ' (mesure seule)' : ' → ' + path.relative(RACINE, SORTIE)}`);
console.log(`zones de clic élargies (${zones.length}) : ${zones.join(', ')}`);
