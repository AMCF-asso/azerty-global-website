/**
 * Vue anglaise du clavier, pour /en/guide (décision d'Antoine, QCM du
 * 2026-10-10 : « Lancer le clavier bilingue »).
 *
 * Même construction que src/_data/clavier.js, sur les mêmes définitions :
 * la géométrie, les positions et les marques sont calculées de la même façon,
 * seuls les mots changent (noms des caractères et des touches mortes,
 * modificateurs, textes du parcours, titres du mémo, légende). Les macros de
 * src/_includes/v2/clavier.njk lisent `langue: 'en'` sur cet objet pour écrire
 * leurs propres textes en anglais.
 */
'use strict';

module.exports = require('./clavier.js').construire('en');
