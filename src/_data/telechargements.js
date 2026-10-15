/* Registre des kits servis par /download (décision D32 de la roadmap refonte :
   la version affichée est la version servie).

   Une entrée par fichier téléchargeable : nom de fichier, version, taille et
   empreinte SHA-256 **du fichier réellement servi**, mesurés par
   `node scripts/mesurer-telechargements.js` (et `--verifier` pour prouver que
   le registre est encore juste). Les pages FR et EN de /download et leur
   JSON-LD lisent ce registre au build : changer de kit, c'est changer ce
   fichier, jamais une page.

   ⛔ Rien ici n'est calculé au build : un build ne télécharge pas, la page ne
   dépend pas du réseau. Les valeurs sont recopiées depuis la sortie du script.
   Windows et macOS sont servis par `download.azerty.global` depuis la décision
   d'Antoine du 2026-10-13 (action `bascule-boutons-download-r2`), qui lève
   l'arbitrage SourceForge du 2026-09-01 : l'alerte navigateur n'a pas été
   reproduite et les zips R2 sont octet pour octet ceux de SourceForge
   (operations/2026-10-13-diagnostic-alerte-download.md).
   Linux aussi depuis le 2026-10-15 : R2 est la référence (tranché le
   2026-10-14, SourceForge = R2 moins les captures Fedora), et le zip 2026.1 y
   est servi sous un nom versionné (Worker 65a12da7, empreinte relue par GET).
   ⚠️ SourceForge répond 403 aux clients automatisés (curl et fetch, mesuré le
   2026-09-02) : une entrée qui y retournerait porterait
   `verification: "manuelle"`, que le script saute.

   Mise en ligne d'un kit (session T4) : téléverser, mesurer, remplacer les
   champs de l'entrée, relancer `--verifier`, rebuild. La page suit.

   `disposition` (zips) : version de la disposition que le zip servi installe.
   Tant qu'elle n'est pas DISPOSITION_ACTUELLE, /download affiche sous le
   bouton « Ce fichier installe encore la disposition 2026… » (plan B des
   zips, texte validé par Antoine, QCM du 2026-10-14). */

const DISPOSITION_ACTUELLE = "2026.1";

const KITS = [
  {
    id: "store",
    libelle: "Microsoft Store",
    // Même paquet que le MSIX signé AMCF, publié par le Store sous sa propre signature.
    version: "1.1.0",
    url: "https://apps.microsoft.com/detail/9n4bts43sssz",
    fichier: null,
    octets: null,
    sha256: null,
    mesure: null,
  },
  {
    id: "msixbundle",
    libelle: "MSIX signé AMCF",
    version: "1.1.0",
    url: "https://download.azerty.global/AZERTY_Global_1.1.0.msixbundle",
    fichier: "AZERTY_Global_1.1.0.msixbundle",
    octets: 12923344,
    sha256: "79A9C9C80CE9441272961DA20CEC3206307D26CD9BBF23AB57F9D7BE8BF6530E",
    mesure: "2026-09-02",
  },
  {
    id: "entreprise",
    libelle: "Kit entreprise",
    // Contient le msixbundle ci-dessus, sa .sha256, la fiche DSI et les supports.
    version: "1.1.0",
    url: "https://download.azerty.global/AZERTY_Global_Entreprise.zip",
    fichier: "AZERTY_Global_Entreprise.zip",
    octets: 14538829,
    sha256: "1B040DE6AE43A43E6AD0C8EABD962E18083FF084DDCB3ED19EAE8CC4F9C7BFFC",
    mesure: "2026-09-02",
  },
  {
    id: "windows",
    libelle: "Installateur EXE Windows",
    version: null,
    url: "https://download.azerty.global/AZERTY_Global_Windows.zip",
    fichier: "AZERTY_Global_Windows.zip",
    octets: 2777269,
    sha256: "B8334FEA205B0FDBDAEFD916413E493254C20D8CAE4E12D7C70C670E8EB6B87E",
    mesure: "2026-10-13",
    disposition: "2026",
  },
  {
    id: "macos",
    libelle: "Installateur macOS",
    // Zip 2026.1 sous un nom versionné, envoyé sans essai sur Mac (QCM du
    // 15/10) ; l'ancienne clé AZERTY_Global_macOS.zip (2026) reste servie.
    version: null,
    url: "https://download.azerty.global/AZERTY_Global_macOS_2026.1.zip",
    fichier: "AZERTY_Global_macOS_2026.1.zip",
    octets: 1564558,
    sha256: "7DFF0B84326BB187CD0F96EFAC1F50BD5227F126ECF95E0BECAB5BB95C701655",
    mesure: "2026-10-15",
    disposition: "2026.1",
  },
  {
    id: "linux",
    libelle: "Installateur Linux",
    // Zip 2026.1 sous un nom versionné (plan de sortie du 14/10) ; l'ancienne clé
    // AZERTY_Global_Linux.zip (2026) reste servie par le Worker.
    version: null,
    url: "https://download.azerty.global/AZERTY_Global_Linux_2026.1.zip",
    fichier: "AZERTY_Global_Linux_2026.1.zip",
    octets: 2332098,
    sha256: "4034DE16433C04968783EB430680EA06613AE87C1E77C237021DEB8409EC20DD",
    mesure: "2026-10-15",
    disposition: "2026.1",
  },
];

const PAR_ID = new Map(KITS.map((kit) => [kit.id, kit]));

function kit(id) {
  const trouve = PAR_ID.get(id);
  if (!trouve) throw new Error(`telechargements.js : kit inconnu « ${id} »`);
  return trouve;
}

/* 12923344 → « 12,9 Mo » (décimal, comme les navigateurs et Windows 11 l'affichent
   au téléchargement ; virgule française, espace insécable avant l'unité). */
function tailleLisible(octets) {
  if (octets === null || octets === undefined) return "";
  const mo = octets / 1e6;
  const texte = mo >= 10 ? mo.toFixed(1) : mo.toFixed(2);
  return `${texte.replace(".", ",")} Mo`;
}

/* « La version du kit est-elle au moins X ? » Compare numero par numero
   (« 1.10.0 » > « 1.3.0 »), jamais comme du texte. /nouveautes s'en sert pour
   savoir si la 2026.1 et l'application 1.3.0 sont publiees : le registre dit ce
   qui est servi, la page suit (CONT-03). */
function versionAuMoins(id, minimum) {
  const lire = (v) => String(v).split(".").map((n) => parseInt(n, 10) || 0);
  const a = lire(kit(id).version);
  const b = lire(minimum);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d > 0;
  }
  return true;
}

/* Le zip servi installe-t-il encore une disposition antérieure ? (plan B) */
function dispositionAncienne(id) {
  return kit(id).disposition !== DISPOSITION_ACTUELLE;
}

/* Les zips encore en disposition antérieure, nommés pour une phrase de /guide :
   « le zip Windows », « les zips Windows et Linux » (fr) ; « the Windows zip »,
   « the Windows and Linux zips » (en). Chaîne vide s'il n'y en a aucun. */
function zipsAnciens(langue) {
  const noms = [["windows", "Windows"], ["macos", "macOS"], ["linux", "Linux"]]
    .filter(([id]) => dispositionAncienne(id))
    .map(([, nom]) => nom);
  if (noms.length === 0) return "";
  const et = langue === "en" ? "and" : "et";
  const liste = noms.length === 1 ? noms[0] : `${noms.slice(0, -1).join(", ")} ${et} ${noms[noms.length - 1]}`;
  if (langue === "en") return `the ${liste} ${noms.length === 1 ? "zip" : "zips"}`;
  return noms.length === 1 ? `le zip ${liste}` : `les zips ${liste}`;
}

module.exports = { kits: KITS, kit, tailleLisible, versionAuMoins, dispositionAncienne, zipsAnciens };
