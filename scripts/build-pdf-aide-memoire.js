/* L'aide-mémoire A4 en PDF, produit au build.
   Contrat : operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md §1.7.

   Le PDF ne redessine rien : il imprime la feuille `.feuille-impression` que
   /guide porte déjà, via la même CSS `@media print`. Une seule source, donc
   aucune dérive possible entre la feuille imprimée depuis le navigateur et le
   fichier téléchargé. C'est ce qui remplace le PDF v1, pré-fait et
   non regénérable.

   Le format vient de la CSS (`@page { size: A4 landscape; margin: 8mm }`) et
   non d'options passées ici : `preferCSSPageSize` fait foi. ⚠️ Mémoire
   `edge-headless-print-to-pdf` : les en-têtes et pieds d'Edge headless sont
   pilotés par des drapeaux ignorés en silence — on passe donc par l'API PDF de
   Playwright, jamais par la ligne de commande d'un navigateur.

   ⚠️ Ce script n'est plus branché sur `postbuild` (2026-09-04, session T2) :
   l'image de build Cloudflare n'a pas de navigateur, donc chaque push cassait
   la preview. C'est désormais un outil de gravure, à lancer en local après un
   build (`npm run build:pdf`) ; il écrit le PDF dans les sources avec
   l'empreinte de la feuille dont il est l'impression. Le build, lui, appelle
   `verifier-pdf-aide-memoire.js`, qui échoue si la feuille a bougé sans que le
   PDF soit regravé — un PDF périmé servi en silence serait pire que rien. */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const { calculerEmpreinteFeuille, sha256Fichier } = require('./lib/empreinte-aide-memoire');

const RACINE = path.resolve(__dirname, '..');
const DIST = path.join(RACINE, 'dist');
const ROUTE = '/guide';
/* Le PDF gravé vit dans les sources : `assets/` est copié tel quel dans `dist`
   par 11ty, donc un build sans navigateur sert quand même la feuille. La copie
   de `dist` est écrite ici en plus, parce que le passthrough a déjà eu lieu
   quand ce script tourne. */
const GRAVE = path.join(RACINE, 'assets', 'aide-memoire-azerty-global.pdf');
const EMPREINTE = path.join(RACINE, 'assets', 'aide-memoire-azerty-global.empreinte.json');
const SORTIE = path.join(DIST, 'assets', 'aide-memoire-azerty-global.pdf');

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function resoudre(url) {
  const chemin = decodeURIComponent((url || '/').split('?')[0]);
  const normalise = chemin === '/' ? '/index.html' : chemin;
  for (const candidat of [
    path.join(DIST, normalise),
    path.join(DIST, normalise + '.html'),
    path.join(DIST, normalise, 'index.html')
  ]) {
    const absolu = path.resolve(candidat);
    if (!absolu.startsWith(DIST)) continue;
    if (fs.existsSync(absolu) && fs.statSync(absolu).isFile()) return absolu;
  }
  return null;
}

function servir() {
  const serveur = http.createServer((requete, reponse) => {
    const fichier = resoudre(requete.url);
    if (!fichier) {
      reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      reponse.end('Not found');
      return;
    }
    reponse.writeHead(200, {
      'Content-Type': TYPES[path.extname(fichier).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(fichier).pipe(reponse);
  });

  return new Promise((resoudreP) => {
    /* Port 0 : le système en choisit un libre. Les ports 3000, 3100 et 3200
       sont pris par les autres sessions assez souvent pour que le build ne
       puisse pas en dépendre. */
    serveur.listen(0, '127.0.0.1', () => resoudreP(serveur));
  });
}

/* Le chromium fourni par Playwright d'abord ; l'Edge du poste ensuite, parce
   que c'est ce que l'outillage de captures utilise et qu'il est présent ici
   quand les navigateurs Playwright ne le sont pas. */
async function ouvrirNavigateur(chromium) {
  try {
    return await chromium.launch();
  } catch (erreurPaquet) {
    try {
      return await chromium.launch({ channel: 'msedge' });
    } catch (erreurEdge) {
      const detail = erreurPaquet.message.split('\n')[0];
      throw new Error(
        'aide-mémoire PDF : aucun Chromium lançable (' + detail + ').\n' +
          '  Correctif : npx playwright install chromium\n' +
          '  Sur l’image de build Cloudflare, cette commande doit précéder npm run build.'
      );
    }
  }
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'guide.html'))) {
    throw new Error('aide-mémoire PDF : dist/guide.html absent — lancer le build d’abord.');
  }

  const { chromium } = require('playwright');
  const serveur = await servir();
  const base = 'http://127.0.0.1:' + serveur.address().port;
  const navigateur = await ouvrirNavigateur(chromium);

  try {
    const page = await navigateur.newPage();
    await page.goto(base + ROUTE, { waitUntil: 'networkidle' });

    /* La feuille est masquée à l'écran : sa présence se vérifie dans le DOM,
       pas à l'œil. Sans elle le PDF sortirait vide et personne ne le verrait
       avant un lecteur. */
    const feuille = await page.$('.feuille-impression');
    if (!feuille) {
      throw new Error('aide-mémoire PDF : .feuille-impression absente de ' + ROUTE + '.');
    }

    await page.emulateMedia({ media: 'print' });
    fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
    await page.pdf({ path: SORTIE, preferCSSPageSize: true, printBackground: true });
  } finally {
    await navigateur.close();
    serveur.close();
  }

  const octets = fs.statSync(SORTIE).size;
  if (octets < 4096) {
    throw new Error('aide-mémoire PDF : sortie de ' + octets + ' octets, trop petite pour être la feuille.');
  }

  /* Gravure : le PDF entre dans les sources avec l'empreinte de la feuille dont
     il est l'impression. C'est ce couple que `verifier-pdf-aide-memoire.js`
     recontrôle à chaque build, navigateur ou pas. */
  const { empreinte, octetsFeuille } = calculerEmpreinteFeuille(path.join(DIST, 'guide.html'));
  fs.mkdirSync(path.dirname(GRAVE), { recursive: true });
  fs.copyFileSync(SORTIE, GRAVE);
  fs.writeFileSync(
    EMPREINTE,
    JSON.stringify(
      {
        commentaire:
          'Empreinte de la feuille imprimable de /guide et de la CSS @media print dont ce PDF est l’impression. Régénérer par npm run build:pdf après un build.',
        feuille_sha256: empreinte,
        feuille_octets: octetsFeuille,
        pdf_sha256: sha256Fichier(GRAVE),
        pdf_octets: octets,
        grave_le: new Date().toISOString().slice(0, 10)
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log('[pdf] ' + path.relative(RACINE, SORTIE) + ' — ' + Math.round(octets / 1024) + ' Ko');
  console.log('[pdf] gravé : ' + path.relative(RACINE, GRAVE) + ' — feuille ' + empreinte.slice(0, 12));
})().catch((erreur) => {
  console.error(erreur.message);
  process.exit(1);
});
