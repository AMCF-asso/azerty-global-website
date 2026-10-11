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
   2026-08-30 sur data/AZERTY Traditionnel.json et data/AZERTY Global.json ;
   `ajoutes` relevé de nouveau le 2026-10-01 après la disposition 2026.1
   (66cbf5a) : 52. Ce nombre n'est publié sur aucune page. */
const POPULATIONS_DU_SCRIPT = {
  caracteresDeReference: 109,
  changeDeTouche: 12,
  memeTouche: 3,
  deplacesTotal: 15,
  touchesDeDestination: 12,
  ajoutes: 52,
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

/* ——— 2026-10-01 : touches mortes, minuscule seule, infobulle ——— */

const touchesCar = clavier.touches.filter((t) => t.type === 'caractere');
const MARQUE = /^\p{M}$/u;

test('aucune gravure n’est faite que de marques combinantes', () => {
  /* Le défaut relevé par Antoine : le crochet et le cornu de la touche 1,
     gravés seuls, ne prenaient aucune largeur et ne recevaient pas le survol. */
  for (const t of touchesCar) {
    for (const [couche, g] of Object.entries(t.glyphes)) {
      if (!g || g.invisible) continue;
      const seulementMarques = Array.from(g.texte).every((c) => MARQUE.test(c));
      assert.ok(!seulementMarques, `${t.position} (${couche}) : « ${g.texte} » n’a pas de support`);
    }
  }
});

test('la vue synthèse ne grave que la minuscule quand AltGr + Maj en est la capitale', () => {
  const marquees = touchesCar.filter((t) => t.majAltgrRedondante);
  const minuscules = marquees.map((t) => t.glyphes.altgr.texte).sort();
  assert.deepStrictEqual(minuscules, ['ß', 'æ', 'ù', 'œ'].sort());
  for (const t of marquees) {
    assert.strictEqual(t.glyphes.majaltgr.texte.toLocaleLowerCase('fr'), t.glyphes.altgr.texte);
  }
});

test('chaque touche morte a des exemples tirés de sa table', () => {
  const definition = require('../../data/AZERTY Global.json');
  assert.deepStrictEqual(Object.keys(clavier.mortes).sort(), Object.keys(definition.dead_keys).sort());
  for (const [cle, morte] of Object.entries(clavier.mortes)) {
    assert.ok(morte.exemples.length > 0, `${cle} sans exemple`);
    for (const e of morte.exemples) {
      assert.strictEqual(definition.dead_keys[cle].table[e.lettre], e.resultat, `${cle} : ${e.lettre} ne donne pas ${e.resultat}`);
    }
  }
});

test('tout ce qui n’est ni lettre ni chiffre porte un nom dans l’infobulle', () => {
  for (const t of touchesCar) {
    for (const [couche, g] of Object.entries(t.glyphes)) {
      if (!g || /^[A-Za-z0-9]$/.test(g.texte)) continue;
      assert.ok(g.libelle, `${t.position} (${couche}) : « ${g.texte} » sans nom`);
    }
  }
});

test('une touche de la rangée des chiffres se nomme par son chiffre (décision du 2026-09-29)', () => {
  for (const t of touchesCar.filter((x) => /^E(0[1-9]|10)$/.test(x.position))) {
    const chiffre = t.glyphes.maj && t.glyphes.maj.texte;
    if (!/^[0-9]$/.test(chiffre || '')) continue;
    for (const couche of ['altgr', 'majaltgr']) {
      const g = t.glyphes[couche];
      if (g) assert.ok(g.frappe.endsWith('|' + chiffre), `${t.position} (${couche}) : « ${g.frappe} »`);
    }
    const capitale = t.glyphes.verrmaj;
    if (capitale && capitale.niveau === 'caps') {
      assert.ok(!capitale.frappe.endsWith('|' + chiffre), `${t.position} : Verr. Maj. doit garder la lettre`);
    }
  }
});

test('ce que le composant écrit en mono est dessiné par une police du site', () => {
  const couverture = new Set(require('../../data/derives/couverture-polices.json').mono);
  const manque = new Set();
  const verifier = (texte) => {
    for (const c of texte) if (!couverture.has(c.codePointAt(0))) manque.add(c);
  };
  for (const t of touchesCar) {
    for (const g of Object.values(t.glyphes)) if (g && !g.invisible) verifier(g.texte);
  }
  for (const morte of Object.values(clavier.mortes)) {
    for (const e of morte.exemples) verifier(e.affichage + e.lettre);
  }
  assert.deepStrictEqual(Array.from(manque), [], 'glyphes sans police : ' + Array.from(manque).join(' '));
});

/* ——— 2026-10-10 : vue anglaise (src/_data/clavierEn.js, /en/guide) ——— */

const clavierEn = require('../../src/_data/clavierEn.js');
const touchesCarEn = clavierEn.touches.filter((t) => t.type === 'caractere');
const FRANCAIS = /\b(Maj|Verr|Touche|touche|avec|puis|Espace|majuscule|Tout|Retour|Entrée|Emplacement|Caractère|Guillemets|Tirets|Lettres|Mathématiques)\b/;

test('la vue anglaise garde la géométrie, les positions et les marques de la vue française', () => {
  assert.strictEqual(clavierEn.langue, 'en');
  assert.strictEqual(clavier.langue, undefined, 'la vue française ne porte pas de marqueur de langue');
  assert.strictEqual(clavierEn.colonnes, clavier.colonnes);
  const forme = (t) => [t.type, t.id || t.position, t.ligne, t.colonne, t.largeur, t.marque || ''].join(':');
  assert.deepStrictEqual(clavierEn.touches.map(forme), clavier.touches.map(forme));
  assert.deepStrictEqual(clavierEn.parcours.map((e) => e.positions), clavier.parcours.map((e) => e.positions));
  assert.deepStrictEqual(clavierEn.populations, clavier.populations);
  assert.deepStrictEqual(clavierEn.reglages, clavier.reglages);
});

test('la vue anglaise nomme les modificateurs et les frappes en anglais', () => {
  const mods = Object.fromEntries(clavierEn.touches.filter((t) => t.type === 'modificateur').map((t) => [t.id, t.libelle]));
  assert.deepStrictEqual(mods, {
    retour: 'Backspace', tab: 'Tab', entree: 'Enter', verrmaj: 'Caps Lock', 'maj-g': 'Shift', 'maj-d': 'Shift', altgr: 'AltGr'
  });
  assert.deepStrictEqual(clavierEn.couches.map((c) => c.libelle), ['Base', 'Shift', 'Caps Lock', 'AltGr', 'AltGr + Shift', 'All']);
  const e02 = touchesCarEn.find((t) => t.position === 'E02');
  assert.strictEqual(e02.glyphes.verrmaj.frappe, 'Caps Lock|é');
  assert.strictEqual(e02.glyphes.verrmaj.libelle, 'Capital E with acute accent');
  assert.match(e02.aria, /^Key 2: e with acute accent; /);
  const espace = touchesCarEn.find((t) => t.position === 'A03');
  assert.strictEqual(espace.nom, 'Space');
  assert.strictEqual(espace.glyphes.altgr.nom, 'Narrow non-breaking space');
  const memo = clavierEn.memoire[0].entrees.map((e) => e.apres[0]);
  assert.deepStrictEqual(memo, ['Caps Lock + é', 'Caps Lock + è', 'Caps Lock + à', 'Caps Lock + ç']);
});

test('les touches mortes anglaises gardent la capitale des noms de langue', () => {
  assert.strictEqual(clavierEn.mortes.dk_greek.nom, 'Greek alphabet');
  assert.strictEqual(clavierEn.mortes.dk_extended_latin.nom, 'Extended Latin');
  assert.strictEqual(clavierEn.mortes.dk_circumflex.nom, 'Circumflex');
  const grec = clavierEn.memo.touchesMortes.find((e) => e.valeur === 'dk_greek');
  assert.strictEqual(grec.glyphe.nom, 'Greek alphabet');
  assert.match(touchesCarEn.find((t) => t.glyphes.maj && t.glyphes.maj.cle === 'dk_greek').aria, /Greek alphabet with Shift, dead key/);
});

test('le parcours anglais renvoie aux pages françaises en le disant', () => {
  assert.strictEqual(clavierEn.parcours.length, 6);
  for (const [i, etape] of clavierEn.parcours.entries()) {
    assert.notStrictEqual(etape.titre, clavier.parcours[i].titre, `étape ${i + 1} sans titre anglais`);
    assert.notStrictEqual(etape.texte, clavier.parcours[i].texte, `étape ${i + 1} sans texte anglais`);
    if (etape.lien) {
      assert.strictEqual(etape.lien.href, clavier.parcours[i].lien.href);
      assert.strictEqual(etape.lien.hreflang, 'fr');
    }
  }
  assert.ok(clavier.parcours.every((e) => !e.lien || !e.lien.hreflang), 'la vue française ne marque pas ses liens');
});

test('aucun mot français dans les textes de la vue anglaise', () => {
  const textes = [];
  for (const t of clavierEn.touches) {
    if (t.type === 'modificateur') { textes.push(t.libelle); continue; }
    textes.push(t.aria, t.nom);
    for (const jeu of [t.glyphes, t.glyphesAvant]) {
      for (const g of Object.values(jeu)) if (g) textes.push(g.libelle || '', g.frappe || '', g.nom || '');
    }
  }
  for (const e of clavierEn.parcours) textes.push(e.titre, e.texte, e.lien ? e.lien.libelle : '');
  for (const f of clavierEn.memoFamilles) textes.push(f.titre);
  for (const e of clavierEn.memo.caracteres.concat(clavierEn.memo.touchesMortes)) textes.push(e.frappe, e.glyphe.nom || '');
  for (const l of clavierEn.legende) textes.push(l.libelle);
  const fautifs = textes.filter((x) => FRANCAIS.test(x));
  assert.deepStrictEqual(fautifs, []);
});

test('tout ce qui n’est ni lettre ni chiffre porte un nom anglais dans l’infobulle', () => {
  for (const t of touchesCarEn) {
    for (const [couche, g] of Object.entries(t.glyphes)) {
      if (!g || /^[A-Za-z0-9]$/.test(g.texte)) continue;
      assert.ok(g.libelle, `${t.position} (${couche}) : « ${g.texte} » sans nom`);
    }
  }
});

/* La recherche de /en/guide (js/v2/clavier.js, chercher) n'est pas testable en
   Node : elle vit dans le navigateur. Ce test épingle les données dont ses
   alias dépendent (critique du 2026-10-10) : « dead key » liste les entrées
   « dk: » de l'index, « caps lock » les capitales que Caps Lock donne d'un
   geste, « math » les caractères de la famille « Math and currency » du mémo.
   Le comportement lui-même est vérifié sous Playwright. */
test('les données des alias de recherche anglaise existent', () => {
  const index = require('../../tester/character-index.json').characters;
  const recommandee = (e) => (e.methods || []).find((m) => m.recommended) || (e.methods || [])[0] || null;
  const mortes = Object.keys(index).filter((c) => c.startsWith('dk:'));
  assert.ok(mortes.length >= 29, 'touches mortes de l’index');
  for (const c of mortes) {
    assert.ok(index[c].displayChar, `${c} sans symbole`);
    assert.match(index[c].unicodeName, /\(dead key\)$/, `${c} sans nom anglais`);
  }
  const capitales = Object.keys(index).filter((c) => !c.startsWith('dk:') && recommandee(index[c]) && recommandee(index[c]).layer === 'Caps');
  assert.deepStrictEqual(capitales.sort(), ['À', 'Ç', 'È', 'É']);
  const maths = clavierEn.memoFamilles.find((f) => /^math\b/i.test(f.titre));
  assert.ok(maths && maths.entrees.length > 0, 'famille « Math and currency »');
  for (const e of maths.entrees) assert.ok(index[e.valeur], `${e.valeur} absent de l’index`);
});

test('chaque réglage de page se résout dans la disposition', () => {
  for (const [id, reglage] of Object.entries(clavier.reglages)) {
    assert.ok(['image', 'bulles', 'onglets', 'essai'].includes(reglage.interaction), id);
    if (reglage.bulle) {
      const t = touchesCar.find((x) => x.position === reglage.bulle.position);
      assert.ok(t && t.glyphes[reglage.bulle.couche], `${id} : bulle sans glyphe`);
    }
  }
});
