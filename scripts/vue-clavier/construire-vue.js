'use strict';

/**
 * Compose la vue du site a partir du seul manifeste OKLM.
 *
 * Le coeur du manifeste donne les valeurs de clavier (niveaux, compositions,
 * doigts, nom, version, licence SPDX) ; `metadata.OKLM_siteView` donne ce que
 * le coeur 0.1 ne modelise pas (prose, rangees, scancode/vk, exemples).
 *
 * Tout est rendu en `Map` : l'ordre des cles est significatif, et un objet JS
 * ordinaire remonterait les cles entieres des tables de compositions.
 */

const { obtenir } = require('./json-ordonne');

/** Nom de touche morte cote site : `dead` -> `dk_dot_above`. */
const nomSite = (id) => 'dk_' + id.replace(/-/g, '_');

/** Champ de niveau de la vue -> rang du niveau ISO correspondant. */
const RANG_NIVEAU = {
  base: 1, shift: 2, alt_gr: 3, shift_alt_gr: 4,
  caps: 5, caps_shift: 6, caps_alt_gr: 7, caps_shift_alt_gr: 8,
};

/** Niveau du manifeste -> valeur de la vue (caractere, nom de touche morte, ou null). */
function valeurNiveau(niveaux, n) {
  const v = niveaux.has(String(n)) ? niveaux.get(String(n)) : undefined;
  if (v === undefined) return null;
  if (v instanceof Map) {
    if (!v.has('deadKey')) throw new Error(`niveau ${n} : objet sans deadKey`);
    return nomSite(v.get('deadKey'));
  }
  return v;
}

function construireVue(manifeste) {
  const sv = obtenir(manifeste, 'metadata', 'OKLM_siteView');
  const tete = obtenir(sv, 'tete');
  const rangees = obtenir(sv, 'rangees');
  const materiel = obtenir(sv, 'materiel');
  const touchesMortes = obtenir(sv, 'touchesMortes');
  const doigts = obtenir(manifeste, 'metadata', 'training', 'fingers');

  // Coherence : quand la vue detaille une licence, son SPDX est celui du coeur.
  if (tete.has('license') && tete.get('license') instanceof Map) {
    const spdx = tete.get('license').get('spdx_id');
    if (spdx !== manifeste.get('license')) {
      throw new Error(`licence incoherente : coeur ${manifeste.get('license')}, vue ${spdx}`);
    }
  }

  const parId = new Map();
  for (const k of obtenir(manifeste, 'keys')) parId.set(k.get('id'), k);

  const vue = new Map();
  vue.set('layout_name', manifeste.get('name'));
  vue.set('version', manifeste.get('version'));
  for (const [champ, valeur] of tete) vue.set(champ, valeur);

  vue.set('rows', rangees.map((r) => {
    const touches = r.get('touches').map((pos) => {
      const k = parId.get(pos);
      if (!k) throw new Error(`touche ${pos} absente du manifeste`);
      const niveaux = k.get('levels');
      const mat = materiel.get(pos);
      if (!mat) throw new Error(`touche ${pos} sans scancode/vk dans OKLM_siteView.materiel`);
      const o = new Map();
      o.set('position', pos);
      for (const [champ, valeur] of mat.get('champs')) o.set(champ, valeur);
      for (const champ of mat.get('niveaux')) {
        const rang = RANG_NIVEAU[champ];
        if (!rang) throw new Error(`touche ${pos} : champ de niveau inconnu ${champ}`);
        o.set(champ, valeurNiveau(niveaux, rang));
      }
      if (!doigts.has(pos)) throw new Error(`touche ${pos} sans doigt dans metadata.training.fingers`);
      o.set('finger', doigts.get(pos));
      return o;
    });
    const rangee = new Map();
    rangee.set('row_id', r.get('row_id'));
    rangee.set('row_name', r.get('row_name'));
    rangee.set('keys', touches);
    return rangee;
  }));

  const mortes = new Map();
  for (const d of obtenir(manifeste, 'deadKeys')) {
    const id = d.get('id');
    const extra = touchesMortes.get(id);
    if (!extra) throw new Error(`touche morte ${id} sans exemple dans OKLM_siteView.touchesMortes`);
    const bloc = new Map();
    bloc.set('description', d.get('name'));
    bloc.set('example', extra.get('example'));
    if (extra.has('design_notes')) bloc.set('design_notes', extra.get('design_notes'));
    bloc.set('table', d.get('compositions'));
    mortes.set(nomSite(id), bloc);
  }
  vue.set('dead_keys', mortes);

  return vue;
}

/**
 * Aplatit la vue dans l'ordre exact ou `extraire()` a pose ses fentes :
 * pour un objet, la cle puis sa valeur ; pour un tableau, ses elements.
 */
function aplatir(valeur, sortie = []) {
  if (valeur instanceof Map) {
    for (const [cle, v] of valeur) { sortie.push(cle); aplatir(v, sortie); }
  } else if (Array.isArray(valeur)) {
    for (const v of valeur) aplatir(v, sortie);
  } else {
    sortie.push(valeur);
  }
  return sortie;
}

module.exports = { construireVue, aplatir, nomSite };
