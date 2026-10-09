// Fiche contact d'Antoine Olivier, servie par /bienvenue (bouton « Enregistrer
// mon contact »), page d'arrivée du QR code des cartes de visite.
// Usage : node scripts/generer-vcard.mjs  →  assets/contact/antoine-olivier.vcf
//
// Décisions d'Antoine (QCM du 2026-10-02) : e-mail public contact@azerty.global,
// pas de téléphone (le fichier est public). Un profil s'ajoute en renseignant son
// URL ci-dessous, puis en relançant le script : une URL vide n'est pas écrite.
// vCard 3.0 (RFC 2426) : la version que lisent l'iPhone, Android et Outlook.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = path.join(ROOT, "assets", "contact", "antoine-olivier.vcf");
const PHOTO = path.join(ROOT, "images", "antoine-clavier-cadre-300.jpg");

const PROFILS = [
  { type: "linkedin", url: "" },
  { type: "facebook", url: "" },
];

function echapper(valeur) {
  return valeur.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// RFC 2426 § 2.6 : lignes de 75 octets au plus, suite précédée d'une espace.
// On coupe sur les octets UTF-8 sans jamais séparer un caractère.
function plier(ligne) {
  const morceaux = [];
  let courant = "";
  let octets = 0;
  for (const caractere of ligne) {
    const taille = Buffer.byteLength(caractere);
    const limite = morceaux.length === 0 ? 75 : 74;
    if (octets + taille > limite) {
      morceaux.push(courant);
      courant = "";
      octets = 0;
    }
    courant += caractere;
    octets += taille;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

const lignes = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "N:Olivier;Antoine;;;",
  "FN:Antoine Olivier",
  `ORG:${echapper("Association pour la Modernisation du Clavier Français (AMCF)")}`,
  `TITLE:${echapper("Créateur d’AZERTY Global, président de l’AMCF")}`,
  "EMAIL;TYPE=INTERNET,WORK:contact@azerty.global",
  "URL:https://azerty.global",
  ...PROFILS.filter((profil) => profil.url).map(
    (profil) => `X-SOCIALPROFILE;TYPE=${profil.type}:${profil.url}`
  ),
  `NOTE:${echapper("AZERTY Global, un AZERTY amélioré, gratuit et libre : https://azerty.global")}`,
  `PHOTO;ENCODING=b;TYPE=JPEG:${fs.readFileSync(PHOTO).toString("base64")}`,
  "END:VCARD",
];

fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
fs.writeFileSync(SORTIE, lignes.map(plier).join("\r\n") + "\r\n", "utf8");
console.log(`${path.relative(ROOT, SORTIE)} : ${fs.statSync(SORTIE).size} octets`);
