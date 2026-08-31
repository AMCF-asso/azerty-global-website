/* Jeton de version des ressources v2, pose sur chaque feuille et chaque script
   par `src/_includes/v2/base.njk`.

   Pourquoi il existe. `_headers` sert `/css/*` et `/js/*` en
   `Cache-Control: public, max-age=604800` — sept jours. Sans jeton, un visiteur
   revenu dans la semaine garde l'ancien fichier, et une correction ne l'atteint
   pas. Ce n'est pas theorique : le 2026-08-31, Antoine a vu les deroulants du
   menu rester inertes sur son telephone parce que son navigateur servait un
   `js/app.js` perime — seul le premier deroulant repondait, signature d'une
   version anterieure du script. Vider le cache l'a corrige, et ce n'est pas une
   manoeuvre qu'on peut demander aux visiteurs.

   ⚠️ Mesure du meme jour : la v1 versionne 3 de ses 10 scripts, la v2 n'en
   versionnait aucun — ni ses six feuilles, ni ses trois scripts.

   Pourquoi le CONTENU et pas l'heure. Un jeton horodate change a chaque build,
   donc vide le cache de tout le monde meme quand rien n'a bouge. Ici le jeton
   est une empreinte du contenu reel des ressources v2 : un build sans
   changement rend le meme jeton et le cache tient ; le moindre octet modifie
   dans une feuille ou un script le fait changer, et tout est refetche.

   ⛔ Un seul jeton pour toutes les ressources, a dessein : une empreinte par
   fichier serait plus fine, mais elle demanderait de resoudre chaque chemin a
   la generation, et le gain ne vaut pas la machinerie pour neuf fichiers. */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RACINE = path.join(__dirname, "..", "..");
const DOSSIERS = [
  path.join(RACINE, "css", "v2"),
  path.join(RACINE, "js", "v2"),
];

function fichiersRessources() {
  const trouves = [];
  for (const dossier of DOSSIERS) {
    if (!fs.existsSync(dossier)) continue;
    for (const nom of fs.readdirSync(dossier).sort()) {
      if (/\.(css|js)$/.test(nom)) trouves.push(path.join(dossier, nom));
    }
  }
  return trouves;
}

module.exports = function () {
  const fichiers = fichiersRessources();

  /* Aucune ressource trouvee : plutot que de rendre un jeton vide — qui
     desactiverait silencieusement le versionnage — on echoue au build. */
  if (!fichiers.length) {
    throw new Error(
      "versionAssets : aucune ressource v2 trouvee dans css/v2 ni js/v2. " +
      "Un jeton vide desactiverait le cache-busting sans que rien ne le signale."
    );
  }

  const empreinte = crypto.createHash("sha256");
  for (const fichier of fichiers) {
    /* Le nom entre dans l'empreinte : ajouter ou retirer un fichier doit
       changer le jeton, meme si le contenu des autres est identique. */
    empreinte.update(path.basename(fichier));
    empreinte.update(fs.readFileSync(fichier));
  }

  /* ⚠️ `css/v2/clavier-cadre.css` n'est PAS sur le disque : il est genere au
     build par `src/clavier-cadre.njk` directement dans `dist/`. Lire `css/v2/`
     ne le voit donc pas, et le jeton serait aveugle a ses changements — sur la
     feuille dont la DA dit que, sans elle, le clavier s'effondre et une touche
     fait 1088 px.

     On empreinte donc ses deux sources : le gabarit qui la rend, et la sortie
     de `src/_data/clavier.js`. Passer par la SORTIE et non par le fichier
     `clavier.js` est deliberé : ce module derive la geometrie des definitions
     canoniques du depot, et une modification de l'une d'elles changerait la
     geometrie sans changer une ligne de code. */
  const gabaritCadre = path.join(__dirname, "..", "clavier-cadre.njk");
  if (fs.existsSync(gabaritCadre)) {
    empreinte.update(fs.readFileSync(gabaritCadre));
  }
  empreinte.update(JSON.stringify(require("./clavier")));

  return empreinte.digest("hex").slice(0, 10);
};
