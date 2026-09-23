/* Ce que le site mesure, et rien d'autre.
 *
 * ⛔ Source unique. /confidentialite lit ce fichier au build ; aucune page
 * n'écrit un nom d'outil à la main. Motif : la v1 décrivait sa mesure dans un
 * texte figé, et le jour où un outil a changé, la page a continué de décrire
 * l'ancien sans que rien ne le signale.
 *
 * ⛔ Contrat pour la session T3, qui posera les balises sur le site v2
 * (décision D40 du 2026-09-14, GTM + GA4 + Umami) : ce fichier et les balises
 * réellement servies se modifient dans le même commit. Un outil ici que le
 * site ne charge pas est une déclaration fausse ; un outil chargé qui n'est
 * pas ici l'est tout autant.
 *
 * ✅ T3 installée le 2026-09-18 : src/_includes/v2/base.njk charge GTM
 * (js/v2/gtm-loader.js, copie versionnée du loader v1), GA4 via ce conteneur,
 * et Umami en script externe.
 *
 * ✅ Le beacon Cloudflare Web Analytics — servi par la coquille v1, absent de
 * D40 — est abandonné sur la v2 (arbitrage d'Antoine du 2026-09-18) : GA4 et
 * Umami suffisent à la mesure d'audience, un outil de moins à divulguer.
 * Retiré aussi des coquilles v1 (base.njk, base-en.njk) le 2026-09-23 : les
 * pages anglaises le chargeaient encore sans qu'il soit déclaré (audit A017).
 */

module.exports = {
  /* Outils de mesure d'audience servis par le site. */
  outils: [
    {
      nom: "Google Analytics 4",
      role: "Mesurer l’audience et les téléchargements, de façon agrégée.",
      operateur: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande",
      cookie: false,
      /* Consent Mode v2 en « denied » permanent : pas de cookie, pas
         d'identifiant, donc pas de bannière à afficher. */
      detail:
        "La balise fonctionne en permanence en mode Consent Mode v2 « denied » : aucun cookie n’est déposé sur votre appareil et aucun identifiant personnel n’est créé. Seuls des signaux anonymisés et agrégés sont transmis à Google, qui ne permettent ni de vous identifier, ni de vous recibler par publicité.",
      hebergement: "Google peut traiter ces données hors de l’Union européenne, notamment aux États-Unis (Google LLC, certifiée Data Privacy Framework)",
      baseLegale: "Intérêt légitime de l’éditeur à évaluer l’audience de son site",
      charge: "Par le conteneur Google Tag Manager ci-dessous"
    },
    {
      nom: "Google Tag Manager",
      role: "Charger la balise de mesure ci-dessus, et elle seule.",
      operateur: "Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlande",
      cookie: false,
      detail:
        "Le conteneur ne porte aucune balise publicitaire. Il sert uniquement à poser la mesure statistique sans modifier le code du site à chaque changement.",
      chargeur: true,
      hebergement: "Google peut traiter ces données hors de l’Union européenne, notamment aux États-Unis (Google LLC, certifiée Data Privacy Framework)",
      baseLegale: "Intérêt légitime de l’éditeur à évaluer l’audience de son site"
    },
    {
      nom: "Umami",
      role: "Compter les pages consultées, le pays d’origine et le type d’appareil.",
      operateur: "Umami Software, Inc.",
      cookie: false,
      detail:
        "Aucun cookie, aucune donnée personnelle, uniquement des totaux. Les statistiques sont conservées sur des serveurs situés dans l’Union européenne.",
      hebergement: "Union européenne",
      baseLegale: "Intérêt légitime de l’éditeur à évaluer l’audience de son site"
    }
  ],

  /* Ce que le site garde dans le navigateur du visiteur, et qui n'en sort
     jamais. Une entrée par usage réel, jamais une catégorie. */
  stockageLocal: [
    {
      quoi: "Votre choix de thème clair ou sombre",
      cle: "ag-theme",
      duree: "Jusqu’à ce que vous effaciez les données de ce site dans votre navigateur"
    },
    {
      quoi: "Votre refus de la mesure d’audience, si vous l’avez exprimé",
      cle: "ag-mesure-refusee et umami.disabled",
      duree: "Jusqu’à ce que vous réautorisiez la mesure ou effaciez les données de ce site"
    },
    {
      quoi: "Le brouillon du questionnaire détaillé, pour ne pas perdre vos réponses",
      cle: "brouillon du formulaire",
      duree: "Effacé à l’envoi du formulaire, ou par vos soins"
    }
  ],

  /* Acheminement des formulaires. Le transfert hors UE est une limite réelle :
     elle se lit à côté du formulaire concerné, jamais en bas de page. */
  formulaires: {
    prestataire: "Web3Forms",
    operateur: "Web3Creative, Inde",
    serveurs: "États-Unis",
    conservation:
      "Selon sa documentation, le prestataire ne conserve pas les soumissions et purge périodiquement ses journaux techniques.",
    replis: "Écrire directement à contact@azerty.global"
  },

  /* Copie des réponses du questionnaire détaillé (js/beta.js, GOOGLE_SHEET_URL) :
     décision d'Antoine du 2026-09-23, envoi gardé et déclaré. Durée proposée
     le même jour, à confirmer par lui. */
  questionnaireSheets: {
    prestataire: "Google Sheets (via Google Apps Script)",
    operateur: "Google LLC, États-Unis, certifiée Data Privacy Framework",
    ajouts: "l’identification technique de votre navigateur (user-agent) et l’heure d’envoi",
    conservation: "3 ans"
  },

  /* Dons et adhésions, sur /soutien et depuis l'application. */
  helloasso: {
    nom: "HelloAsso",
    operateur: "HelloAsso, France",
    role: "Encaissement des dons et des adhésions à l’AMCF. HelloAsso transmet à l’AMCF votre identité, votre e-mail, le montant et, pour le reçu fiscal, votre adresse."
  },

  /* Hébergement du site lui-même. */
  hebergeur: {
    nom: "Cloudflare Pages",
    operateur: "Cloudflare, Inc.",
    role: "Servir les pages du site et ses fichiers."
  },

  /* Adresse dédiée aux demandes RGPD. */
  contactDonnees: "privacy@azerty.global",

  /* Date de dernière relecture du contenu de cette déclaration. Elle se met à
     jour à la main, à chaque changement réel : c'est une information utile au
     lecteur, contrairement à un horodatage de build. */
  relu: "2026-09-23"
};
