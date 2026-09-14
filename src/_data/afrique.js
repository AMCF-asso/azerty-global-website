/* Refonte — page /afrique : chiffres et listes lus au build depuis
   data/afrique/index.json, généré à la main par scripts/build-afrique-data.mjs
   et commité (décisions 20, 23 et 26 du 2026-09-11).

   ⛔ Aucun chiffre de la page n'est écrit à la main : pays, langues, caractères,
   marques et saisissabilité sortent d'ici. « Tous saisissables » ne s'écrit que
   si le générateur l'a mesuré (`meta.saisissables`) — sinon la phrase dit le
   compte exact et ce qui manque (les clics du nama, décision 33). */

const fs = require("node:fs");
const path = require("node:path");

module.exports = function () {
  const racine = path.join(__dirname, "..", "..", "data", "afrique");
  const index = JSON.parse(fs.readFileSync(path.join(racine, "index.json"), "utf8"));
  const meta = index.meta;
  const triFr = (a, b) => a.nom.localeCompare(b.nom, "fr");

  const pays = index.pays
    .map((p) => ({
      code: p.code.toLowerCase(),
      codeIso: p.code,
      nom: p.nom,
      pastille: Boolean(p.pastille),
      langues: p.langues,
      vedettes: p.vedettes,
      nbLangues: p.langues.length,
      officiellesEuro: p.officiellesEuro || [],
      horsPerimetre: (p.horsPerimetre || []).map((h) => h.nom),
      ecritures: (p.horsPerimetre || []).map((h) => h.ecriture),
      sansFiche: p.langues.length === 0,
      source: p.source,
    }))
    .sort(triFr);

  const langues = index.langues.slice().sort(triFr);
  const nonSaisissables = meta.nonSaisissables || [];

  return {
    meta,
    genere: meta.genere,
    pays,
    langues,
    nbPays: meta.nbPays,
    nbLangues: meta.nbLangues,
    nbCaracteres: meta.nbCaracteres,
    nbMarques: meta.nbMarques,
    nbSaisissables: meta.nbSaisissables,
    saisissables: Boolean(meta.saisissables),
    nonSaisissables,
    nbNonSaisissables: nonSaisissables.length,
    paysSansFiche: pays.filter((p) => p.sansFiche && p.horsPerimetre.length === 0),
    paysNonLatin: pays.filter((p) => p.horsPerimetre.length > 0),
    nbLanguesProvisoires: langues.filter((l) => l.provisoire).length,
    nbLanguesSansLettre: langues.filter((l) => l.nb === 0).length,
  };
};
