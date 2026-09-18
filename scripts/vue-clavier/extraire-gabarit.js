'use strict';

/**
 * Operation unique et rejouable : fabrique le gabarit de presentation d'une
 * vue JSON du clavier, et prouve sur-le-champ que gabarit + valeurs rendent
 * les octets d'origine.
 *
 *   node scripts/vue-clavier/extraire-gabarit.js "data/AZERTY Global.json" \
 *        scripts/vue-clavier/azerty-global.gabarit.json
 *
 * Le gabarit ne contient aucune donnee : chaque scalaire et chaque cle
 * d'objet du fichier source y est une fente. Les valeurs vivent dans le
 * manifeste OKLM.
 */

const fs = require('fs');
const path = require('path');
const { extraire, remplir } = require('./gabarit');

function principal(argv) {
  const [source, sortie] = argv;
  if (!source || !sortie) {
    console.error('usage : extraire-gabarit.js <vue.json> <gabarit.json>');
    return 2;
  }
  const brut = fs.readFileSync(source);
  const texte = brut.toString('utf8');
  const { gabarit, fentes } = extraire(texte);

  // Les valeurs relues du source, uniquement pour la preuve d'aller-retour.
  const valeurs = relireValeurs(texte, fentes);
  const refait = Buffer.from(remplir(gabarit, fentes, valeurs), 'utf8');
  if (!refait.equals(brut)) {
    console.error(`[gabarit] ECHEC : l'aller-retour ne rend pas les octets de ${source}`);
    console.error(`  source ${brut.length} o, refait ${refait.length} o`);
    return 1;
  }

  const paquet = {
    _lisezmoi: 'Genere par scripts/vue-clavier/extraire-gabarit.js. Presentation seule : aucune donnee. Les valeurs viennent du manifeste OKLM.',
    source: path.basename(source),
    fentes,
    gabarit,
  };
  const texteSortie = JSON.stringify(paquet, null, 2) + '\n';
  fs.writeFileSync(sortie + '.tmp', texteSortie, 'utf8');
  fs.renameSync(sortie + '.tmp', sortie);
  console.log(`[gabarit] ${source} -> ${sortie} : ${fentes.length} fentes, aller-retour identique octet (${brut.length} o)`);
  return 0;
}

/** Rejoue l'extraction en collectant la valeur de chaque fente. */
function relireValeurs(texte, fentes) {
  const { lireChaine } = require('./gabarit');
  const valeurs = [];
  const BLANC = new Set([' ', '\t', '\n', '\r']);
  let i = 0;
  const sauter = () => { while (i < texte.length && BLANC.has(texte[i])) i += 1; };
  function valeur() {
    sauter();
    const c = texte[i];
    if (c === '{') return objet();
    if (c === '[') return tableau();
    if (c === '"') { const r = lireChaine(texte, i); i = r.fin; valeurs.push(r.valeur); return; }
    const debut = i;
    while (i < texte.length && !BLANC.has(texte[i]) && texte[i] !== ',' && texte[i] !== '}' && texte[i] !== ']') i += 1;
    valeurs.push(JSON.parse(texte.slice(debut, i)));
  }
  function objet() {
    i += 1; sauter();
    if (texte[i] === '}') { i += 1; return; }
    for (;;) {
      sauter();
      const r = lireChaine(texte, i); i = r.fin; valeurs.push(r.valeur);
      sauter(); i += 1;
      valeur();
      sauter();
      if (texte[i] === ',') { i += 1; continue; }
      i += 1; return;
    }
  }
  function tableau() {
    i += 1; sauter();
    if (texte[i] === ']') { i += 1; return; }
    for (;;) {
      valeur(); sauter();
      if (texte[i] === ',') { i += 1; continue; }
      i += 1; return;
    }
  }
  valeur();
  if (valeurs.length !== fentes.length) {
    throw new Error(`relecture : ${valeurs.length} valeurs pour ${fentes.length} fentes`);
  }
  return valeurs;
}

if (require.main === module) process.exit(principal(process.argv.slice(2)));
module.exports = { relireValeurs };
