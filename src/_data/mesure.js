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
 * ✅ T3 installée le 2026-09-18, remplacée le 2026-10-05 par js/v2/mesure.js
 * (plan de marquage operations/2026-10-05-mesure-audience) : src/_includes/v2/
 * base.njk et les coquilles v1 encore servies (base.njk, base-en.njk : pages EN,
 * /bienvenue, /clavier-americain) ne chargent que ce script, qui pose Umami
 * sur azerty.global seulement, hors opposition. Les événements envoyés sont
 * ceux de sa liste blanche ; le rôle ci-dessous les résume.
 *
 * ✅ Google Tag Manager puis GA4 retirés de la v2 le 2026-10-05 (QCM
 * d'Antoine) : sans bannière, le consentement reste refusé et la propriété
 * G-TC56EMYBKY n'enregistrait rien (0 événement depuis avril 2024). GA4 ne
 * reviendrait qu'avec une bannière, pour les conversions Ad Grants. Le
 * conteneur GTM-PWWRV6JT ne sert plus que la v1 jusqu'à la bascule.
 *
 * ✅ Le beacon Cloudflare Web Analytics — servi par la coquille v1, absent de
 * D40 — est abandonné sur la v2 (arbitrage d'Antoine du 2026-09-18) : Umami
 * suffit à la mesure d'audience, un outil de moins à divulguer.
 * Retiré aussi des coquilles v1 (base.njk, base-en.njk) le 2026-09-23 : les
 * pages anglaises le chargeaient encore sans qu'il soit déclaré (audit A017).
 */

module.exports = {
  /* Outils de mesure d'audience servis par le site. */
  outils: [
    {
      nom: "Umami",
      role: "Compter les pages consultées, le pays d’origine et le type d’appareil, ainsi que les actions sur le site, comme les téléchargements, le parcours du testeur, les essais du clavier, les copies de caractères et les formulaires envoyés.",
      operateur: "Umami Software, Inc.",
      cookie: false,
      detail:
        "Aucun cookie ni identifiant déposé sur votre appareil. Votre adresse IP sert à déduire le pays et à regrouper les pages d’une même visite. Les statistiques sont conservées dans l’Union européenne.",
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
      quoi: "Le brouillon du questionnaire détaillé, pour ne pas perdre vos réponses : vos choix seulement, sans vos textes ni votre e-mail",
      cle: "brouillon du formulaire",
      duree: "Effacé à l’envoi du formulaire, par vos soins, ou à votre retour sur le questionnaire après 24 heures"
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

  /* Vérification anti-spam des formulaires (js/v2/captcha.js, S-02 du
     2026-10-05) : seule option de l'offre gratuite de Web3Forms, chargée à la
     première interaction avec un formulaire. */
  antispam: {
    prestataire: "hCaptcha",
    operateur: "Intuition Machines, Inc., États-Unis",
    role: "Vérification anti-spam des formulaires, chargée seulement quand vous commencez à en remplir un."
  },

  /* Copie des réponses du questionnaire détaillé, arrêtée le 2026-09-05 (6695ff2) :
     la feuille garde les réponses reçues avant, conservées 1 an (décision
     d'Antoine du 2026-09-23). */
  questionnaireSheets: {
    prestataire: "Google Sheets",
    operateur: "Google LLC, États-Unis, certifiée Data Privacy Framework",
    conservation: "1 an"
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
  relu: "2026-10-05"
};
