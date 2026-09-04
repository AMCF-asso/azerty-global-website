/* Garde-fou du PDF aide-mémoire, branché sur `postbuild`.

   Contrat : `operations/refonte-site/2026-08-29-decisions-composant-clavier-et-guide.md` §1.7
   pour la feuille, `operations/refonte-site/runbook-bascule.md` §« Aide-mémoire PDF »
   pour la chaîne.

   Le PDF est l'impression de la feuille `.feuille-impression` de /guide par un
   navigateur. L'image de build Cloudflare n'en a pas : le PDF est donc gravé
   dans `assets/` en local (`npm run build:pdf`) et copié dans `dist` par le
   passthrough de 11ty. Ce script est ce qui empêche cette gravure de devenir un
   vieux fichier : il recalcule l'empreinte de la feuille rendue et de la CSS
   d'impression, et refuse le build si elle ne correspond plus au PDF gravé.

   Trois issues possibles, et une seule silencieuse :
   - empreinte identique, PDF présent et intact → rien à dire, code 0 ;
   - empreinte différente → échec, avec la commande de regravure ;
   - PDF absent ou altéré → échec.

   Si un Chromium est disponible, ce script ne régénère rien quand même : la
   régénération est un geste daté, pas un effet de bord de build. */
'use strict';

const fs = require('fs');
const path = require('path');

const { calculerEmpreinteFeuille, sha256Fichier } = require('./lib/empreinte-aide-memoire');

const RACINE = path.resolve(__dirname, '..');
const DIST = path.join(RACINE, 'dist');
const GUIDE = path.join(DIST, 'guide.html');
const GRAVE = path.join(RACINE, 'assets', 'aide-memoire-azerty-global.pdf');
const EMPREINTE = path.join(RACINE, 'assets', 'aide-memoire-azerty-global.empreinte.json');
const SERVI = path.join(DIST, 'assets', 'aide-memoire-azerty-global.pdf');

const REGRAVER = 'npm run build && npm run build:pdf';

function echouer(message) {
  console.error('[pdf] ' + message);
  process.exit(1);
}

if (!fs.existsSync(GUIDE)) {
  echouer('dist/guide.html absent — lancer le build d’abord.');
}
if (!fs.existsSync(GRAVE) || !fs.existsSync(EMPREINTE)) {
  echouer(
    'aucun PDF gravé dans assets/ (ou empreinte manquante).\n' +
      '  Correctif : ' + REGRAVER
  );
}

const grave = JSON.parse(fs.readFileSync(EMPREINTE, 'utf8'));
const { empreinte, octetsFeuille } = calculerEmpreinteFeuille(GUIDE);

if (empreinte !== grave.feuille_sha256) {
  echouer(
    'la feuille imprimable de /guide a changé depuis la gravure du PDF.\n' +
      '  gravée le ' + grave.grave_le + ' : ' + String(grave.feuille_sha256).slice(0, 12) +
      ' (' + grave.feuille_octets + ' o)\n' +
      '  rendue maintenant : ' + empreinte.slice(0, 12) + ' (' + octetsFeuille + ' o)\n' +
      '  Le PDF servi ne serait plus l’impression de la feuille affichée.\n' +
      '  Correctif : ' + REGRAVER
  );
}

const sommeGravee = sha256Fichier(GRAVE);
if (sommeGravee !== grave.pdf_sha256) {
  echouer(
    'le PDF gravé ne correspond plus à son empreinte (fichier modifié hors chaîne).\n' +
      '  attendu ' + String(grave.pdf_sha256).slice(0, 12) + ', lu ' + sommeGravee.slice(0, 12) + '\n' +
      '  Correctif : ' + REGRAVER
  );
}

/* Le passthrough de 11ty copie `assets/` dans `dist/assets/`. On le vérifie
   plutôt que de le supposer : une exclusion ajoutée dans `.eleventy.js`
   priverait la page de son téléchargement sans autre signe. */
if (!fs.existsSync(SERVI)) {
  echouer(
    'dist/assets/aide-memoire-azerty-global.pdf absent : le passthrough de assets/ ne l’a pas copié.\n' +
      '  Vérifier PUBLIC_DIRECTORIES et PUBLIC_EXCLUDED_FILES dans .eleventy.js.'
  );
}
const sommeServie = sha256Fichier(SERVI);
if (sommeServie !== grave.pdf_sha256) {
  echouer(
    'le PDF servi dans dist diffère du PDF gravé (' + sommeServie.slice(0, 12) + ' ≠ ' +
      String(grave.pdf_sha256).slice(0, 12) + ').'
  );
}

console.log(
  '[pdf] feuille ' + empreinte.slice(0, 12) + ' conforme au PDF gravé le ' + grave.grave_le +
    ' — ' + Math.round(grave.pdf_octets / 1024) + ' Ko servis sans navigateur.'
);
