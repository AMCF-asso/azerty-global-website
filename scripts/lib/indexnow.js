/* IndexNow (lot B1 du plan GEO v2) : dire à Bing, Yandex, Seznam et Naver
   quelles pages ont changé, au lieu d'attendre leur prochain passage.

   Quelles pages : celles dont le couple loc/lastmod du sitemap a bougé entre
   le commit d'avant la poussée sur main et le commit poussé (ajout, date
   changée, retrait). Le lastmod est la date du dernier commit du fichier
   source (A6), pas celle du merge : comparer à la date du jour raterait une
   PR dont les commits sont plus anciens que sa fusion.

   La clé est publique par conception : le fichier `<clé>.txt` à la racine du
   dépôt est servi à la racine du site, et c'est lui qui la porte. */
'use strict';

const fs = require('fs');

const MOTIF_FICHIER_CLE = /^[0-9a-f]{32}\.txt$/;

/* Nom du fichier de clé à la racine, ou null s'il n'y en a pas. Deux fichiers
   seraient une erreur : on ne saurait pas lequel le site sert pour preuve. */
function fichierCleIndexNow(racine) {
  const trouves = fs.readdirSync(racine).filter((nom) => MOTIF_FICHIER_CLE.test(nom));
  if (trouves.length > 1) {
    throw new Error(`IndexNow : ${trouves.length} fichiers de clé à la racine (${trouves.join(', ')}), un seul attendu`);
  }
  return trouves[0] || null;
}

/* La clé, vérifiée : le contenu du fichier doit être son propre nom. */
function cleIndexNow(racine) {
  const fichier = fichierCleIndexNow(racine);
  if (!fichier) throw new Error('IndexNow : aucun fichier <clé>.txt à la racine');
  const cle = fichier.slice(0, -4);
  const contenu = fs.readFileSync(`${racine}/${fichier}`, 'utf8').trim();
  if (contenu !== cle) throw new Error(`IndexNow : ${fichier} ne contient pas sa clé`);
  return cle;
}

/* Sitemap → Map loc → lastmod ('' quand la page n'a pas de lastmod). */
function lireSitemap(xml) {
  const entrees = new Map();
  for (const [, bloc] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(bloc);
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(bloc);
    entrees.set(loc[1], lastmod ? lastmod[1] : '');
  }
  return entrees;
}

/* Ce qui a changé entre deux sitemaps : pages ajoutées ou redatées (attendu =
   leur nouveau lastmod) et pages retirées (attendu = null, absentes). */
function changements(avant, apres) {
  const liste = [];
  for (const [loc, lastmod] of apres) {
    if (!avant.has(loc) || avant.get(loc) !== lastmod) liste.push({ loc, attendu: lastmod });
  }
  for (const loc of avant.keys()) {
    if (!apres.has(loc)) liste.push({ loc, attendu: null });
  }
  return liste.sort((a, b) => a.loc.localeCompare(b.loc));
}

/* Le site en ligne porte-t-il ce changement ? Une page redatée l'est quand son
   lastmod en ligne est au moins l'attendu : une poussée suivante, déjà en
   ligne, peut l'avoir redatée encore (dates AAAA-MM-JJ, ordre lexical). */
function estEnLigne(changement, enLigne) {
  if (changement.attendu === null) return !enLigne.has(changement.loc);
  if (!enLigne.has(changement.loc)) return false;
  return enLigne.get(changement.loc) >= changement.attendu;
}

function corpsRequete(site, cle, urls) {
  const hote = new URL(site).host;
  return { host: hote, key: cle, keyLocation: `${site}/${cle}.txt`, urlList: urls };
}

module.exports = {
  fichierCleIndexNow,
  cleIndexNow,
  lireSitemap,
  changements,
  estEnLigne,
  corpsRequete
};
