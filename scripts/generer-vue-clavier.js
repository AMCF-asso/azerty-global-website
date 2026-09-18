'use strict';

/**
 * Genere les vues JSON du clavier lues par le composant v2, depuis le
 * manifeste OKLM qui en est desormais la source.
 *
 *   node scripts/generer-vue-clavier.js            # ecrit les vues
 *   node scripts/generer-vue-clavier.js --check    # ne rien ecrire, comparer
 *
 * En mode --check, sortie 1 des qu'une vue generee differe d'un octet du
 * fichier commite : le build casse plutot que de servir une vue qui a cesse
 * de suivre son manifeste. C'est la porte de sortie du chantier C3.
 */

const fs = require('fs');
const path = require('path');
const { remplir } = require('./vue-clavier/gabarit');
const { analyser } = require('./vue-clavier/json-ordonne');
const { construireVue, aplatir } = require('./vue-clavier/construire-vue');

const RACINE = path.join(__dirname, '..');

/** Vues pilotees par un manifeste. Une entree = un manifeste, un gabarit, une vue. */
const VUES = [
  {
    nom: 'AZERTY Global',
    manifeste: 'data/azerty-global.oklm.json',
    gabarit: 'scripts/vue-clavier/azerty-global.gabarit.json',
    vue: 'data/AZERTY Global.json',
  },
  {
    nom: 'AZERTY Traditionnel',
    manifeste: 'data/azerty-traditionnel.oklm.json',
    gabarit: 'scripts/vue-clavier/azerty-traditionnel.gabarit.json',
    vue: 'data/AZERTY Traditionnel.json',
  },
  {
    nom: 'AZERTY Global Beta',
    manifeste: 'data/azerty-global-beta.oklm.json',
    gabarit: 'scripts/vue-clavier/azerty-global-beta.gabarit.json',
    vue: 'data/AZERTY Global Beta.json',
  },
];

function rendre(entree) {
  const abs = (p) => path.join(RACINE, p);
  const manifeste = analyser(fs.readFileSync(abs(entree.manifeste), 'utf8'));
  const paquet = JSON.parse(fs.readFileSync(abs(entree.gabarit), 'utf8'));
  const valeurs = aplatir(construireVue(manifeste));
  if (valeurs.length !== paquet.fentes.length) {
    throw new Error(
      `${entree.nom} : la vue composee a ${valeurs.length} valeurs, le gabarit ${paquet.fentes.length} fentes`
    );
  }
  return Buffer.from(remplir(paquet.gabarit, paquet.fentes, valeurs), 'utf8');
}

/** Premiere position ou deux tampons different, avec son contexte lisible. */
function premierEcart(a, b) {
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i += 1;
  const fenetre = (buf) => JSON.stringify(buf.slice(Math.max(0, i - 50), i + 50).toString('utf8'));
  return { octet: i, attendu: fenetre(a), obtenu: fenetre(b) };
}

function principal(argv) {
  const verifier = argv.includes('--check');
  let echecs = 0;
  for (const entree of VUES) {
    const cheminVue = path.join(RACINE, entree.vue);
    if (!fs.existsSync(path.join(RACINE, entree.manifeste)) || !fs.existsSync(path.join(RACINE, entree.gabarit))) {
      console.log(`[vue] ${entree.nom} : hors pivot (manifeste ou gabarit absent), ignoree.`);
      continue;
    }
    let genere;
    try {
      genere = rendre(entree);
    } catch (e) {
      console.error(`[vue] ${entree.nom} : ECHEC de composition — ${e.message}`);
      echecs += 1;
      continue;
    }
    const actuel = fs.existsSync(cheminVue) ? fs.readFileSync(cheminVue) : null;
    if (verifier) {
      if (actuel && genere.equals(actuel)) {
        console.log(`[vue] ${entree.nom} : identique octet (${genere.length} o).`);
      } else {
        echecs += 1;
        console.error(`[vue] ${entree.nom} : la vue commitee ne suit plus son manifeste.`);
        if (!actuel) {
          console.error('  la vue est absente du disque');
        } else {
          const e = premierEcart(actuel, genere);
          console.error(`  ${actuel.length} o sur disque, ${genere.length} o generes ; premier ecart a l'octet ${e.octet}`);
          console.error(`  disque : ${e.attendu}`);
          console.error(`  genere : ${e.obtenu}`);
        }
        console.error('  corriger le manifeste, ou regenerer : node scripts/generer-vue-clavier.js');
      }
    } else if (actuel && genere.equals(actuel)) {
      console.log(`[vue] ${entree.nom} : deja a jour (${genere.length} o).`);
    } else {
      fs.writeFileSync(cheminVue + '.tmp', genere);
      fs.renameSync(cheminVue + '.tmp', cheminVue);
      console.log(`[vue] ${entree.nom} : ecrite (${genere.length} o).`);
    }
  }
  return echecs === 0 ? 0 : 1;
}

if (require.main === module) process.exit(principal(process.argv.slice(2)));
module.exports = { rendre, VUES };
