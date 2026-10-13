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
   ⛔ Linux reste sur SourceForge tant qu'on n'a pas tranché quel zip est à jour
   (R2 et SourceForge diffèrent). Ne pas le basculer avant.
   ⚠️ SourceForge répond 403 aux clients automatisés (curl et fetch, mesuré le
   2026-09-02) : l'entrée Linux porte `verification: "manuelle"`, le script la
   saute, et sa taille/empreinte se recopient depuis un téléchargement
   navigateur + `Get-FileHash`.

   Mise en ligne d'un kit (session T4) : téléverser, mesurer, remplacer les
   champs de l'entrée, relancer `--verifier`, rebuild. La page suit. */

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
  },
  {
    id: "macos",
    libelle: "Installateur macOS",
    version: null,
    url: "https://download.azerty.global/AZERTY_Global_macOS.zip",
    fichier: "AZERTY_Global_macOS.zip",
    octets: 1564877,
    sha256: "E67058BB3016C0457D415EE75DF6880F36D74A301C27CABF4777D688D6C9A0F6",
    mesure: "2026-10-13",
  },
  {
    id: "linux",
    libelle: "Installateur Linux",
    version: null,
    url: "https://sourceforge.net/projects/azertyglobal/files/AZERTY_Global_Linux.zip/download",
    fichier: "AZERTY_Global_Linux.zip",
    octets: null,
    sha256: null,
    mesure: null,
    verification: "manuelle",
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

module.exports = { kits: KITS, kit, tailleLisible, versionAuMoins };
