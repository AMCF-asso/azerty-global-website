/* Mesure les kits reellement servis par /download : taille en octets et
   empreinte SHA-256 de chaque fichier telecharge de bout en bout, a comparer au
   registre `src/_data/telechargements.js` (decision D32 de la roadmap refonte :
   la version affichee est la version servie).

   Usage :
     node scripts/mesurer-telechargements.js             # mesure et affiche
     node scripts/mesurer-telechargements.js --verifier  # compare au registre, code 1 si ecart
     node scripts/mesurer-telechargements.js --json      # sortie JSON brute

   Le registre s'ecrit a la main a partir de cette sortie : un build ne
   telecharge jamais rien, la page ne depend pas du reseau. `--verifier` sert
   avant une bascule (B1) et apres une mise en ligne de kit (T4) : il prouve que
   ce que la page annonce est ce que le visiteur recoit.

   Les liens SourceForge passent par une page interstitielle puis un miroir :
   fetch suit les redirections, et un `content-type: text/html` a l'arrivee est
   traite comme un echec (on aurait mesure la page, pas le kit). */
"use strict";

const crypto = require("crypto");
const path = require("path");

const registre = require(path.join(__dirname, "..", "src", "_data", "telechargements.js"));

const ENTETES = { "User-Agent": "Mozilla/5.0 (mesure-telechargements azerty.global)" };

async function mesurer(url) {
  const reponse = await fetch(url, { redirect: "follow", headers: ENTETES });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status} pour ${url}`);
  const type = reponse.headers.get("content-type") || "";
  if (type.includes("text/html")) {
    throw new Error(`reponse HTML (${reponse.url}) : le kit n'a pas ete servi`);
  }
  const hash = crypto.createHash("sha256");
  let octets = 0;
  for await (const morceau of reponse.body) {
    hash.update(morceau);
    octets += morceau.length;
  }
  return { octets, sha256: hash.digest("hex").toUpperCase(), type, urlFinale: reponse.url };
}

async function principal() {
  const args = new Set(process.argv.slice(2));
  const verifier = args.has("--verifier");
  const json = args.has("--json");
  const kits = registre.kits.filter((kit) => kit.url && kit.fichier);

  const resultats = [];
  let ecarts = 0;
  for (const kit of kits) {
    if (kit.verification === "manuelle") {
      if (!json) console.log(`- ${kit.id.padEnd(11)} ${kit.fichier} — verification manuelle (l'hebergeur refuse les clients automatises), non mesure`);
      continue;
    }
    let mesure;
    try {
      mesure = await mesurer(kit.url);
    } catch (erreur) {
      resultats.push({ id: kit.id, fichier: kit.fichier, erreur: erreur.message });
      ecarts += 1;
      continue;
    }
    const ligne = {
      id: kit.id,
      fichier: kit.fichier,
      octets: mesure.octets,
      taille: registre.tailleLisible(mesure.octets),
      sha256: mesure.sha256,
      urlFinale: mesure.urlFinale,
    };
    if (verifier) {
      ligne.octetsRegistre = kit.octets;
      ligne.sha256Registre = kit.sha256;
      ligne.conforme = kit.octets === mesure.octets && kit.sha256 === mesure.sha256;
      if (!ligne.conforme) ecarts += 1;
    }
    resultats.push(ligne);
  }

  if (json) {
    process.stdout.write(JSON.stringify(resultats, null, 2) + "\n");
  } else {
    for (const r of resultats) {
      if (r.erreur) {
        console.log(`✗ ${r.id.padEnd(11)} ${r.fichier} — ${r.erreur}`);
        continue;
      }
      const etat = verifier ? (r.conforme ? "✓" : "✗") : "·";
      console.log(`${etat} ${r.id.padEnd(11)} ${r.fichier}`);
      console.log(`    ${r.octets} octets (${r.taille})  SHA-256 ${r.sha256}`);
      if (verifier && !r.conforme) {
        console.log(`    registre : ${r.octetsRegistre} octets  SHA-256 ${r.sha256Registre}`);
      }
    }
    if (verifier) {
      console.log(ecarts === 0 ? "Registre conforme aux kits servis." : `${ecarts} ecart(s) entre le registre et les kits servis.`);
    }
  }
  process.exitCode = verifier && ecarts > 0 ? 1 : 0;
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 2;
});
