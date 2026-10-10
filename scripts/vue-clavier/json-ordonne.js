'use strict';

/**
 * Lecture JSON qui conserve l'ordre des cles.
 *
 * `JSON.parse` remonte les cles entieres ("0".."9") en tete d'objet : les
 * tables de compositions du clavier en sortiraient reordonnees, et la vue
 * generee ne serait plus identique octet. On rend donc des `Map`.
 */

const { lireChaine } = require('./gabarit');

const BLANC = new Set([' ', '\t', '\n', '\r']);

function analyser(texte) {
  let i = 0;
  const sauter = () => { while (i < texte.length && BLANC.has(texte[i])) i += 1; };

  function valeur() {
    sauter();
    const c = texte[i];
    if (c === '{') return objet();
    if (c === '[') return tableau();
    if (c === '"') { const r = lireChaine(texte, i); i = r.fin; return r.valeur; }
    const debut = i;
    while (i < texte.length && !BLANC.has(texte[i]) && texte[i] !== ',' && texte[i] !== '}' && texte[i] !== ']') i += 1;
    return JSON.parse(texte.slice(debut, i));
  }

  function objet() {
    const m = new Map();
    i += 1; sauter();
    if (texte[i] === '}') { i += 1; return m; }
    for (;;) {
      sauter();
      const r = lireChaine(texte, i); i = r.fin;
      sauter(); i += 1; // :
      m.set(r.valeur, valeur());
      sauter();
      if (texte[i] === ',') { i += 1; continue; }
      i += 1; return m;
    }
  }

  function tableau() {
    const a = [];
    i += 1; sauter();
    if (texte[i] === ']') { i += 1; return a; }
    for (;;) {
      a.push(valeur()); sauter();
      if (texte[i] === ',') { i += 1; continue; }
      i += 1; return a;
    }
  }

  const v = valeur();
  sauter();
  if (i !== texte.length) throw new Error(`texte residuel a l'octet ${i}`);
  return v;
}

/** Acces chemine tolerant : obtenir(map, 'metadata', 'OKLM_siteView'). */
function obtenir(racine, ...chemin) {
  let v = racine;
  for (const c of chemin) {
    if (!(v instanceof Map) || !v.has(c)) {
      throw new Error(`chemin absent du manifeste : ${chemin.join('.')}`);
    }
    v = v.get(c);
  }
  return v;
}

module.exports = { analyser, obtenir };
