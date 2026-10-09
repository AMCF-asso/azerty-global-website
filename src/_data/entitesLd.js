/* Entités JSON-LD uniques du site (SEO-04, audit du 2026-10-09 ; décision
   d'Antoine du 2026-10-09) : une seule `SoftwareApplication` et une seule
   `Organization`, définies ici une fois, citées partout ailleurs par `@id`.

   Avant : le logiciel était recopié sur 9 pages et l'AMCF sur plus de 50, avec
   des auteurs, des licences, des URL et des logos qui se contredisaient.
   `normaliserJsonLd` (appelée par le transform de .eleventy.js) remplace
   chaque copie par une référence `{ "@id": … }`, et pose la définition
   complète sur la seule page qui la porte :
   - SoftwareApplication : /download (SEO.md § 3, type propre de la page) ;
   - Organization (NGO) : /association (la page de l'association).

   Arbitrages (SEO-04) : auteurs = Robert Hodge et Antoine Olivier (texte de
   /a-propos et /presse) ; licence = texte officiel de l'EUPL 1.2 en français ;
   `url` de l'AMCF = /association ; logo = celui du socle (SEO.md § 3,
   2026-09-28). `softwareVersion` lit le registre des kits : la version
   déclarée est la version servie (décision D32).

   ⛔ Texte du JSON-LD en apostrophe droite (C-02).
   ⛔ Les pages EN gardent leur propre `SoftwareApplication` en anglais
   jusqu'à leur migration ; seule leur `Organization` passe par référence. */

const telechargements = require("./telechargements.js");

const SITE = "https://azerty.global";
const PAGE_LOGICIEL = "download.html";
const PAGE_ORGANISATION = "association.html";
/* La page anglaise de l'association porte la même définition, même `@id`. */
const PAGES_ORGANISATION = [PAGE_ORGANISATION, "en/association.html"];
const ID_LOGICIEL = SITE + "/download#logiciel";
const ID_ORGANISATION = SITE + "/association#amcf";
const NOM_ORGANISATION = "Association pour la Modernisation du Clavier Français";

const organisation = {
  "@type": "NGO",
  "@id": ID_ORGANISATION,
  "name": NOM_ORGANISATION,
  "alternateName": "AMCF",
  "url": SITE + "/association",
  "logo": SITE + "/assets/logo-azerty-global.png",
  "description": "Association loi 1901 qui conçoit et diffuse gratuitement des dispositions de clavier libres, produit des ressources pédagogiques et sensibilise écoles, entreprises et institutions.",
  "foundingDate": "2026-03-17",
  "email": "amcf@azerty.global",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Clermont-Ferrand",
    "addressRegion": "Auvergne-Rhône-Alpes",
    "addressCountry": "FR"
  },
  "identifier": [
    { "@type": "PropertyValue", "name": "RNA", "value": "W632015664" },
    { "@type": "PropertyValue", "name": "SIREN", "value": "104121082" }
  ],
  "sameAs": [
    "https://www.journal-officiel.gouv.fr/pages/associations-detail-annonce/?q.id=id:202600141771",
    "https://github.com/AMCF-asso",
    "https://discord.gg/nYknqshJz3",
    "https://apps.microsoft.com/detail/9n4bts43sssz",
    "https://sourceforge.net/projects/azertyglobal/"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "contact@azerty.global",
    "contactType": "customer support"
  }
};

const logiciel = {
  "@type": "SoftwareApplication",
  "@id": ID_LOGICIEL,
  "name": "AZERTY Global",
  "alternateName": "AZERTY Global 2026",
  "url": SITE + "/download",
  "inLanguage": "fr",
  "applicationCategory": "UtilitiesApplication",
  "applicationSubCategory": "Keyboard Layout",
  "operatingSystem": "Windows 10, Windows 11, macOS, Linux",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
  "description": "Disposition de clavier française modernisée pour Windows, macOS et Linux. Facilite les majuscules accentuées, la programmation, la typographie française et les langues étrangères. Alternative à l'AZERTY AFNOR avec une transition douce.",
  "softwareVersion": telechargements.kit("msixbundle").version,
  "author": [
    { "@type": "Person", "name": "Robert Hodge" },
    { "@type": "Person", "name": "Antoine Olivier" }
  ],
  "publisher": { "@id": ID_ORGANISATION },
  "downloadUrl": SITE + "/download",
  "softwareHelp": SITE + "/guide",
  "releaseNotes": SITE + "/nouveautes",
  "license": "https://eupl.eu/1.2/fr/",
  "isAccessibleForFree": true,
  "featureList": [
    "Majuscules accentuées : Verr. Maj. + é = É, Verr. Maj. + è = È, Verr. Maj. + à = À, Verr. Maj. + ç = Ç",
    "Guillemets français : AltGr + W = «, AltGr + X = »",
    "E dans l'O (œ) : AltGr + O = œ",
    "E dans l'A (æ) : AltGr + A = æ",
    "Tiret cadratin : AltGr + Maj + T = —",
    "Espace fine insécable : AltGr + Espace",
    "Espace insécable : AltGr + Maj + Espace",
    "Arobase @ : touche à gauche du 1 (accès direct)",
    "Accolades : AltGr + D = {, AltGr + F = }",
    "Crochets : AltGr + J = [, AltGr + K = ]",
    "Barre verticale : AltGr + H = |",
    "Antislash : AltGr + G = \\",
    "Euro : AltGr + E = €",
    "Langues étrangères : touches mortes pour ñ, ß, ø, ü, á, etc.",
    "Compatible jeux vidéo : touches ZQSD inchangées",
    "Cinq changements seulement par rapport à l'AZERTY traditionnel de Windows"
  ],
  "keywords": "AZERTY, clavier français, disposition clavier, majuscules accentuées, É È À Ç, typographie française, programmation, guillemets français, œ, æ"
};

const TYPES_ORGANISATION = ["Organization", "NGO", "Corporation", "EducationalOrganization"];
const TYPES_PAGE_CONTENU = ["WebPage", "AboutPage", "ContactPage", "CollectionPage", "ItemPage",
  "ProfilePage", "QAPage", "SearchResultsPage", "Article", "TechArticle", "NewsArticle"];
const typesDe =(noeud) => [].concat((noeud && noeud["@type"]) || []);
const estAmcf = (noeud) =>
  typesDe(noeud).some((t) => TYPES_ORGANISATION.includes(t)) &&
  (noeud.name === NOM_ORGANISATION || noeud.alternateName === "AMCF");
const estLogiciel = (noeud) => typesDe(noeud).includes("SoftwareApplication");
const reference = (id) => ({ "@id": id });
const estReferenceSeule = (noeud) =>
  noeud && typeof noeud === "object" && !Array.isArray(noeud) &&
  Object.keys(noeud).every((k) => k === "@context" || k === "@id") && !!noeud["@id"];

/* Normalise les blocs JSON-LD d'une page (objets déjà lus). `page` est le
   chemin de sortie relatif (« download.html », « en/index.html »). Rend les
   blocs réécrits, dans le même ordre ; un bloc qui ne serait plus qu'une
   référence vaut `null` (l'appelant le retire).
   `enAnglais` garde les SoftwareApplication anglaises telles quelles. */
function normaliserJsonLd(blocs, page, enAnglais) {
  let orgPosee = false;
  let logicielPose = false;

  const parcourir = (noeud, racine) => {
    if (Array.isArray(noeud)) return noeud.map((n) => parcourir(n, racine)).filter((n) => n !== undefined);
    if (!noeud || typeof noeud !== "object") return noeud;

    if (estAmcf(noeud)) {
      if (racine && PAGES_ORGANISATION.includes(page) && !orgPosee) {
        orgPosee = true;
        return noeud["@context"] ? { "@context": noeud["@context"], ...organisation } : { ...organisation };
      }
      return racine ? undefined : reference(ID_ORGANISATION);
    }
    if (!enAnglais && estLogiciel(noeud)) {
      if (racine && page === PAGE_LOGICIEL && !logicielPose) {
        logicielPose = true;
        return noeud["@context"] ? { "@context": noeud["@context"], ...logiciel } : { ...logiciel };
      }
      return racine ? undefined : reference(ID_LOGICIEL);
    }

    const copie = {};
    for (const [cle, valeur] of Object.entries(noeud)) copie[cle] = parcourir(valeur, false);
    return copie;
  };

  const resultats = blocs.map((bloc) => {
    const resultat = parcourir(bloc, true);
    return resultat === undefined || estReferenceSeule(resultat) ? null : resultat;
  });

  /* Socle « Organization par référence » (SEO.md § 3) : une page dont le bloc
     Organization autonome a été retiré garde le lien vers l'AMCF, porté par
     l'éditeur de sa première page de contenu, si rien d'autre ne le porte. */
  const cite = (v) => JSON.stringify(v).includes('"@id":"' + ID_ORGANISATION + '"');
  if (!PAGES_ORGANISATION.includes(page) && !resultats.some((r) => r && cite(r))) {
    const cible = resultats.find((r) => r && !Array.isArray(r) && typesDe(r).some((t) => TYPES_PAGE_CONTENU.includes(t)) && !r.publisher);
    if (cible) cible.publisher = reference(ID_ORGANISATION);
  }
  return resultats;
}

module.exports = {
  SITE, ID_LOGICIEL, ID_ORGANISATION, PAGE_LOGICIEL, PAGE_ORGANISATION,
  organisation, logiciel, normaliserJsonLd, estAmcf, estLogiciel,
};
