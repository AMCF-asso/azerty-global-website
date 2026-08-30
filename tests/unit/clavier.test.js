/* Vue dérivée du clavier — garde-fous.
 *
 * Le premier test est le seul qui compte vraiment : il épingle les populations
 * que produit `scripts/count-displaced-chars.py`, le script d'où sortent les
 * chiffres publiés sur /comparatif. Le composant les recalcule en Node pour ne
 * dépendre d'aucune étape manuelle ; ce test interdit que les deux
 * implémentations divergent en silence.
 *
 * Le jour où la disposition bouge, ce test rougit. La marche à suivre est
 * alors : rejouer `python scripts/count-displaced-chars.py --json`, reporter
 * les nombres ici ET sur /comparatif, dans le même commit.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');

const clavier = require('../../src/_data/clavier.js');

/* Sortie de `python scripts/count-displaced-chars.py --json`, relevée le
   2026-08-30 sur data/AZERTY Traditionnel.json et data/AZERTY Global.json. */
const POPULATIONS_DU_SCRIPT = {
  caracteresDeReference: 109,
  changeDeTouche: 12,
  memeTouche: 3,
  deplacesTotal: 15,
  touchesDeDestination: 12,
  ajoutes: 51,
  disparus: 4
};

test('les populations recalculées en Node égalent celles du script Python', () => {
  for (const [cle, attendu] of Object.entries(POPULATIONS_DU_SCRIPT)) {
    assert.strictEqual(
      clavier.populations[cle],
      attendu,
      `${cle} : ${clavier.populations[cle]} au lieu de ${attendu} — le dessin du clavier et ` +
      'les chiffres de /comparatif ne racontent plus la même chose.'
    );
  }
});

test('le cadre pose 49 touches à caractères et les sept modificateurs', () => {
  const caracteres = clavier.touches.filter((t) => t.type === 'caractere');
  const modificateurs = clavier.touches.filter((t) => t.type === 'modificateur');
  assert.strictEqual(caracteres.length, 49, 'les 48 touches gravées plus la barre d’espace');
  assert.deepStrictEqual(
    modificateurs.map((t) => t.id).sort(),
    ['altgr', 'entree', 'maj-d', 'maj-g', 'retour', 'tab', 'verrmaj']
  );
});

test('aucune rangée ne déborde des 15 u du cadre ISO', () => {
  const parLigne = new Map();
  for (const touche of clavier.touches) {
    if (touche.entreeIso) continue;
    const fin = touche.colonne + touche.largeur - 1;
    parLigne.set(touche.ligne, Math.max(parLigne.get(touche.ligne) || 0, fin));
  }
  for (const [ligne, fin] of parLigne) {
    assert.ok(fin <= clavier.colonnes, `rangée ${ligne} : ${fin} quarts sur ${clavier.colonnes}`);
  }
});

test('chaque étape du parcours surligne des touches qui existent', () => {
  const positions = new Set(
    clavier.touches.filter((t) => t.position).map((t) => t.position)
  );
  assert.strictEqual(clavier.parcours.length, 6, 'les cinq changements plus les ajouts');
  for (const etape of clavier.parcours) {
    assert.ok(etape.positions.length > 0, `étape « ${etape.titre} » : aucune touche`);
    for (const position of etape.positions) {
      assert.ok(positions.has(position), `étape « ${etape.titre} » : ${position} n’est pas au cadre`);
    }
  }
});

test('le point et le point-virgule marquent un emplacement modifié, pas un ajout', () => {
  /* B08 est le changement phare : les deux caractères restent sur la touche et
     échangent de niveau, donc la gravure devient fausse. Le classer « ajouté »
     dirait le contraire de la page. */
  const b08 = clavier.touches.find((t) => t.position === 'B08');
  assert.ok(b08, 'la touche du point est absente du cadre');
  assert.strictEqual(b08.marque, 'changee');
});

test('aucune frappe du mémo ne laisse fuir un code de position', () => {
  const entrees = clavier.memo.caracteres.concat(clavier.memo.touchesMortes);
  assert.ok(entrees.length > 0);
  for (const entree of entrees) {
    assert.ok(
      !/\b[EDCBA]\d{2}\b/.test(entree.frappe),
      `« ${entree.frappe} » montre une position au lieu d’une touche gravée`
    );
  }
});

test('la barre d’espace porte bien ses deux espaces insécables', () => {
  const espace = clavier.touches.find((t) => t.position === 'A03');
  assert.ok(espace, 'la barre d’espace est absente du cadre');
  assert.strictEqual(espace.type, 'caractere');
  assert.ok(espace.glyphes.altgr && espace.glyphes.altgr.invisible);
  assert.ok(espace.glyphes.majaltgr && espace.glyphes.majaltgr.invisible);
  assert.match(espace.glyphes.altgr.nom, /INSÉCABLE/);
});
