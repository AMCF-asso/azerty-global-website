#!/usr/bin/env node
/* Ping IndexNow après une poussée sur main (.github/workflows/indexnow.yml).

   node scripts/indexnow.js --avant <sitemap.xml> --apres <sitemap.xml>
        [--site https://azerty.global] [--attente 1200] [--dry-run]

   1. Compare les deux sitemaps construits (commit d'avant, commit poussé).
   2. Attend que le site en ligne porte ces changements et serve la clé :
      Cloudflare Pages construit main de son côté, sans signal vers GitHub.
   3. Envoie la liste à api.indexnow.org, qui la partage entre moteurs.

   Rien à pinguer ou déploiement pas vu à temps : avertissement, code 0 (le
   prochain passage des robots rattrape). Clé refusée ou requête invalide :
   code 1, c'est une configuration à corriger. --dry-run s'arrête avant l'envoi. */
'use strict';

const fs = require('fs');
const path = require('path');
const ix = require('./lib/indexnow.js');

const RACINE = path.resolve(__dirname, '..');
const API = 'https://api.indexnow.org/indexnow';
const PAUSE_MS = 30 * 1000;

function options(argv) {
  const o = { site: 'https://azerty.global', attente: 1200, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--avant') o.avant = argv[++i];
    else if (a === '--apres') o.apres = argv[++i];
    else if (a === '--site') o.site = argv[++i].replace(/\/+$/, '');
    else if (a === '--attente') o.attente = Number(argv[++i]);
    else if (a === '--dry-run') o.dryRun = true;
    else throw new Error(`option inconnue : ${a}`);
  }
  if (!o.avant || !o.apres) throw new Error('--avant et --apres sont requis');
  return o;
}

/* Annotation visible dans le résumé du run GitHub Actions, texte simple ailleurs. */
function avertir(message) {
  console.log(process.env.GITHUB_ACTIONS ? `::warning title=IndexNow::${message}` : `AVERTISSEMENT : ${message}`);
}

async function lire(url) {
  const reponse = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!reponse.ok) throw new Error(`${url} : HTTP ${reponse.status}`);
  return reponse.text();
}

/* Vrai quand le site en ligne sert la clé et porte tous les changements. */
async function deploye(site, cle, liste) {
  try {
    if ((await lire(`${site}/${cle}.txt`)).trim() !== cle) return false;
    const enLigne = ix.lireSitemap(await lire(`${site}/sitemap.xml?indexnow=${Date.now()}`));
    return liste.every((c) => ix.estEnLigne(c, enLigne));
  } catch {
    return false;
  }
}

async function main() {
  const o = options(process.argv.slice(2));
  const cle = ix.cleIndexNow(RACINE);
  const liste = ix.changements(
    ix.lireSitemap(fs.readFileSync(o.avant, 'utf8')),
    ix.lireSitemap(fs.readFileSync(o.apres, 'utf8'))
  );
  if (liste.length === 0) {
    console.log('IndexNow : aucune page changée dans le sitemap, rien à envoyer.');
    return 0;
  }
  for (const c of liste) console.log(`  ${c.attendu === null ? 'retirée' : c.attendu || 'sans date'}  ${c.loc}`);
  console.log(`IndexNow : ${liste.length} page(s) changée(s).`);

  const limite = Date.now() + o.attente * 1000;
  while (!(await deploye(o.site, cle, liste))) {
    if (Date.now() >= limite) {
      avertir(`déploiement non vu sur ${o.site} après ${o.attente} s : ${liste.length} page(s) non envoyée(s).`);
      return 0;
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  console.log(`IndexNow : ${o.site} porte les changements et sert la clé.`);

  const corps = ix.corpsRequete(o.site, cle, liste.map((c) => c.loc));
  if (o.dryRun) {
    console.log(`--dry-run : envoi non fait (${corps.urlList.length} URL vers ${API}).`);
    return 0;
  }
  const reponse = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(corps)
  });
  // 200 reçu ; 202 reçu, clé en cours de validation par les moteurs.
  if (reponse.status === 200 || reponse.status === 202) {
    console.log(`IndexNow : ${corps.urlList.length} URL envoyée(s), HTTP ${reponse.status}.`);
    return 0;
  }
  const detail = `HTTP ${reponse.status} ${(await reponse.text()).slice(0, 300)}`;
  if (reponse.status === 429 || reponse.status >= 500) {
    avertir(`api.indexnow.org indisponible (${detail}).`);
    return 0;
  }
  console.error(`IndexNow refusé : ${detail}`);
  return 1;
}

main().then((code) => { process.exitCode = code; }, (e) => {
  console.error(`IndexNow : ${e.message}`);
  process.exitCode = 1;
});
