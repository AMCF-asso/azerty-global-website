'use strict';

/**
 * Non-regression du pivot OKLM (chantier C3).
 *
 * Les vues JSON lues par le composant clavier v2 sont generees depuis les
 * manifestes OKLM. Ce test echoue des qu'une vue commitee differe d'un octet
 * de ce que son manifeste produit — c'est la porte de sortie du chantier.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { rendre, VUES } = require('../../scripts/generer-vue-clavier');
const { remplir, MARQUE } = require('../../scripts/vue-clavier/gabarit');
const { analyser } = require('../../scripts/vue-clavier/json-ordonne');
const { construireVue, aplatir } = require('../../scripts/vue-clavier/construire-vue');

const RACINE = path.join(__dirname, '..', '..');
const abs = (p) => path.join(RACINE, p);
const actives = VUES.filter((v) => fs.existsSync(abs(v.manifeste)) && fs.existsSync(abs(v.gabarit)));

test('le pivot couvre au moins la vue AZERTY Global', () => {
  assert.ok(actives.some((v) => v.nom === 'AZERTY Global'),
    'AZERTY Global doit avoir son manifeste et son gabarit');
});

for (const entree of actives) {
  test(`${entree.nom} : la vue commitee est identique octet a celle generee`, () => {
    const attendu = fs.readFileSync(abs(entree.vue));
    const genere = rendre(entree);
    assert.strictEqual(genere.length, attendu.length, 'taille en octets');
    assert.ok(genere.equals(attendu),
      `${entree.vue} ne suit plus ${entree.manifeste} — regenerer avec node scripts/generer-vue-clavier.js`);
  });

  test(`${entree.nom} : le gabarit ne porte aucune donnee`, () => {
    const paquet = JSON.parse(fs.readFileSync(abs(entree.gabarit), 'utf8'));
    const reste = paquet.gabarit
      .replace(new RegExp(MARQUE + '\\d+' + MARQUE, 'g'), '')
      .replace(/[{}[\]:,\s]/g, '');
    assert.strictEqual(reste, '',
      `le gabarit devrait ne contenir que de la ponctuation JSON, il reste : ${reste.slice(0, 120)}`);
  });

  test(`${entree.nom} : une valeur changee au manifeste change les octets`, () => {
    const manifeste = analyser(fs.readFileSync(abs(entree.manifeste), 'utf8'));
    const paquet = JSON.parse(fs.readFileSync(abs(entree.gabarit), 'utf8'));
    const valeurs = aplatir(construireVue(manifeste));
    const temoin = [...valeurs];
    const rang = temoin.findIndex((v) => typeof v === 'string' && v.length === 1);
    assert.notStrictEqual(rang, -1, 'aucune valeur d un caractere a muter');
    temoin[rang] = temoin[rang] === 'Z' ? 'Y' : 'Z';
    const avant = Buffer.from(remplir(paquet.gabarit, paquet.fentes, valeurs), 'utf8');
    const apres = Buffer.from(remplir(paquet.gabarit, paquet.fentes, temoin), 'utf8');
    assert.ok(!avant.equals(apres), 'le rendu doit suivre la valeur du manifeste');
  });
}

test('une fente sans valeur est refusee, le gabarit ne complete rien', () => {
  const entree = actives[0];
  const paquet = JSON.parse(fs.readFileSync(abs(entree.gabarit), 'utf8'));
  const manifeste = analyser(fs.readFileSync(abs(entree.manifeste), 'utf8'));
  const valeurs = aplatir(construireVue(manifeste));
  valeurs[0] = undefined;
  assert.throws(() => remplir(paquet.gabarit, paquet.fentes, valeurs), /sans valeur/);
});
