/* Empreinte de la feuille imprimable de /guide.

   Pourquoi : l'aide-mémoire PDF est imprimé par un navigateur, absent de
   l'image de build Cloudflare. Le PDF est donc versionné dans `assets/`, et
   cette empreinte est ce qui interdit qu'il devienne un vieux fichier oublié :
   elle décrit exactement ce dont le PDF est l'impression — la feuille rendue et
   la CSS d'impression qui la met en page. Si l'un des deux bouge sans que le
   PDF soit regravé, le build échoue au lieu de servir une feuille périmée.

   Ne rentrent dans l'empreinte que la feuille et les blocs `@media print` : le
   reste de /guide (texte à l'écran, jeton de cache des assets, en-tête) ne
   change rien au PDF, et l'y inclure ferait échouer le build à chaque retouche
   sans rapport. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..', '..');

/* Les trois feuilles de style qui portent un bloc d'impression au 2026-09-04.
   `verifier-pdf-aide-memoire.js` échoue si l'une disparaît ou si une quatrième
   apparaît : une CSS d'impression ajoutée sans être déclarée ici sortirait de
   l'empreinte, donc du garde-fou. */
const CSS_IMPRESSION = [
  'css/base.css',
  'css/typography-guide.css',
  'css/v2/composants.css'
];

const MARQUEUR_FEUILLE = 'class="feuille-impression"';

/* Extraction par équilibrage de balises, pas par expression régulière : la
   feuille contient des `div` imbriqués, et une regex gourmande ou paresseuse se
   tromperait de fermeture dans les deux cas. */
function extraireFeuille(html) {
  const marqueur = html.indexOf(MARQUEUR_FEUILLE);
  if (marqueur === -1) {
    throw new Error(
      'empreinte : ' + MARQUEUR_FEUILLE + ' introuvable dans /guide — la feuille imprimable a disparu du rendu.'
    );
  }
  const debut = html.lastIndexOf('<div', marqueur);
  if (debut === -1) {
    throw new Error('empreinte : ouverture du <div class="feuille-impression"> introuvable.');
  }

  const ouvrant = /<div\b/gi;
  const fermant = /<\/div\s*>/gi;
  let position = debut;
  let profondeur = 0;

  while (position < html.length) {
    ouvrant.lastIndex = position;
    fermant.lastIndex = position;
    const suivantOuvrant = ouvrant.exec(html);
    const suivantFermant = fermant.exec(html);

    if (!suivantFermant) {
      throw new Error('empreinte : la feuille imprimable n’est pas fermée dans /guide.');
    }
    if (suivantOuvrant && suivantOuvrant.index < suivantFermant.index) {
      profondeur += 1;
      position = suivantOuvrant.index + suivantOuvrant[0].length;
      continue;
    }
    profondeur -= 1;
    position = suivantFermant.index + suivantFermant[0].length;
    if (profondeur === 0) return html.slice(debut, position);
  }

  throw new Error('empreinte : la feuille imprimable n’est pas fermée dans /guide.');
}

/* Les blocs `@media print` se délimitent aussi par équilibrage — cette fois des
   accolades, parce qu'une règle imbriquée en contient. */
function extraireBlocsImpression(css) {
  const blocs = [];
  const marqueur = /@media[^{]*\bprint\b[^{]*\{/gi;
  let trouve;

  while ((trouve = marqueur.exec(css)) !== null) {
    let position = trouve.index + trouve[0].length;
    let profondeur = 1;
    while (position < css.length && profondeur > 0) {
      const caractere = css[position];
      if (caractere === '{') profondeur += 1;
      else if (caractere === '}') profondeur -= 1;
      position += 1;
    }
    if (profondeur !== 0) {
      throw new Error('empreinte : bloc @media print non fermé.');
    }
    blocs.push(css.slice(trouve.index, position));
    marqueur.lastIndex = position;
  }

  return blocs;
}

function sha256(contenu) {
  return crypto.createHash('sha256').update(contenu).digest('hex');
}

/* L'empreinte porte la liste des CSS lues et le nombre de blocs trouvés :
   supprimer un bloc d'impression change l'empreinte même si les blocs restants
   sont identiques. */
function calculerEmpreinteFeuille(cheminGuideHtml) {
  const html = fs.readFileSync(cheminGuideHtml, 'utf8');
  const feuille = extraireFeuille(html);

  const morceaux = ['feuille:' + sha256(feuille)];
  for (const relatif of CSS_IMPRESSION) {
    const absolu = path.join(RACINE, relatif);
    if (!fs.existsSync(absolu)) {
      throw new Error(
        'empreinte : ' + relatif + ' est déclarée comme CSS d’impression mais absente — ' +
          'mettre CSS_IMPRESSION à jour dans scripts/lib/empreinte-aide-memoire.js.'
      );
    }
    const blocs = extraireBlocsImpression(fs.readFileSync(absolu, 'utf8'));
    morceaux.push(relatif + ':' + blocs.length + ':' + sha256(blocs.join('\n')));
  }

  return {
    empreinte: sha256(morceaux.join('\n')),
    octetsFeuille: Buffer.byteLength(feuille, 'utf8')
  };
}

function sha256Fichier(chemin) {
  return sha256(fs.readFileSync(chemin));
}

module.exports = {
  CSS_IMPRESSION,
  RACINE,
  calculerEmpreinteFeuille,
  extraireBlocsImpression,
  extraireFeuille,
  sha256,
  sha256Fichier
};
