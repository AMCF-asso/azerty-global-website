/* Relève le décompte de téléchargements de SourceForge et l'écrit dans le
   registre `src/_data/adoption.js`, que la home lit au build.

   Usage :
     node scripts/mesurer-adoption.js             # relève et affiche
     node scripts/mesurer-adoption.js --ecrire    # relève et met le registre à jour
     node scripts/mesurer-adoption.js --verifier  # compare au registre, code 1 si écart
     node scripts/mesurer-adoption.js --json      # sortie JSON brute

   Pourquoi un script et pas un `_data` qui interroge l'API : décision D32 de la
   roadmap refonte, un build ne fait pas de réseau. Le registre est versionné,
   donc le chiffre publié est celui qu'on a relu, et un incident chez SourceForge
   ne peut pas faire tomber un déploiement.

   ⚠️ L'API de statistiques (`files/stats/json`) répond 200 aux clients
   automatisés, contrairement aux URL de téléchargement qui renvoient 403
   (mesuré le 2026-09-02, cf. `telechargements.js`). Ne pas confondre les deux.

   ⛔ Le Microsoft Store n'a pas d'équivalent public : sa fiche ne sert que le
   nombre d'avis. Ce script ne le relève donc pas, et `adoption.store.total`
   reste `null` tant qu'Antoine ne lit pas le Partner Center à la main. */
"use strict";

const fs = require("fs");
const path = require("path");

const PROJET = "azertyglobal";
const DEBUT = "2000-01-01"; // avant tout : l'API rogne d'elle-même à la date d'enregistrement
const REGISTRE = path.join(__dirname, "..", "src", "_data", "adoption.js");

const MOIS_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

async function relever() {
  const fin = aujourdHui();
  const url = `https://sourceforge.net/projects/${PROJET}/files/stats/json`
    + `?start_date=${DEBUT}&end_date=${fin}`;
  const reponse = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (mesure-adoption azerty.global)" },
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} pour ${url}`);

  const donnees = await reponse.json();
  const total = donnees.total;
  if (!Number.isInteger(total)) {
    throw new Error("reponse sans champ `total` entier : format change ?");
  }

  /* La date de départ réelle n'est pas celle demandée : l'API la rogne à
     l'enregistrement du projet et le dit dans `messages`. On lit plutôt le
     premier mois effectivement compté, qui est ce que la page devra afficher. */
  const premier = (donnees.downloads || []).find((ligne) => ligne[1] > 0);
  const depuis = premier ? String(premier[0]).match(MOIS_ISO)[0] : null;

  return { total, depuis, releve: fin, messages: donnees.messages || [] };
}

function lireRegistre() {
  delete require.cache[require.resolve(REGISTRE)];
  return require(REGISTRE);
}

function ecrireRegistre(mesure) {
  const source = fs.readFileSync(REGISTRE, "utf8");
  const mois = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  const [annee, m] = mesure.depuis.split("-").map(Number);
  const depuisLisible = `${mois[m - 1]} ${annee}`;

  const motifDe = (champ) => {
    const motif = new RegExp(`(\\n    ${champ}: )[^,]*(,)`);
    if (!motif.test(source)) throw new Error(`champ « ${champ} » introuvable dans le registre`);
    return motif;
  };

  let sortie = source;
  for (const [champ, valeur] of [
    ["total", String(mesure.total)],
    ["depuis", JSON.stringify(mesure.depuis)],
    ["depuisLisible", JSON.stringify(depuisLisible)],
    ["releve", JSON.stringify(mesure.releve)],
  ]) {
    sortie = sortie.replace(motifDe(champ), `$1${valeur}$2`);
  }

  if (sortie === source) return false;
  fs.writeFileSync(REGISTRE, sortie);
  return true;
}

async function principal() {
  const args = new Set(process.argv.slice(2));
  const mesure = await relever();

  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify(mesure, null, 2)}\n`);
    return;
  }

  for (const message of mesure.messages) console.log(`SourceForge : ${message}`);
  console.log(`total      : ${mesure.total} téléchargements`);
  console.log(`depuis     : ${mesure.depuis}`);
  console.log(`relevé le  : ${mesure.releve}`);

  if (args.has("--verifier")) {
    const registre = lireRegistre();
    const ecarts = [];
    if (registre.sourceforge.total !== mesure.total) {
      ecarts.push(`total : registre ${registre.sourceforge.total}, mesure ${mesure.total}`);
    }
    if (registre.sourceforge.depuis !== mesure.depuis) {
      ecarts.push(`depuis : registre ${registre.sourceforge.depuis}, mesure ${mesure.depuis}`);
    }
    if (ecarts.length) {
      console.error("\nÉcart avec src/_data/adoption.js :");
      for (const ecart of ecarts) console.error(`  - ${ecart}`);
      console.error("Relancer avec --ecrire, puis rebuild.");
      process.exitCode = 1;
      return;
    }
    console.log("\nRegistre à jour.");
    return;
  }

  if (args.has("--ecrire")) {
    const change = ecrireRegistre(mesure);
    console.log(change ? "\nsrc/_data/adoption.js mis à jour." : "\nRegistre déjà à jour.");
  }
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
