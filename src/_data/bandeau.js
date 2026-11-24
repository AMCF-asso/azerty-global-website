/* Bandeau d'annonce sous l'en-tête (src/_includes/v2/bandeau.njk).
   Mis à jour le 2026-11-24 soir (QCM Antoine, prépa Salon des Maires) :
   annonce du stand Village associatif AMCF à Open Source Experience 2026
   (mercredi 9 décembre 2026, Paris Expo Porte de Versailles, Hall 5.2),
   sur toutes les pages FR et EN, fermable et retiré tout seul après l'événement.

   Retrait : à la construction, `actif` passe à faux dès `fin` (le bandeau n'est
   plus écrit dans les pages) ; en attendant la prochaine construction, js/v2/bandeau.js
   le masque dès `fin` côté navigateur. Pour une prochaine annonce, changer `cle`
   (sinon les visiteurs qui l'ont fermée ne la reverraient pas), `fin` et les textes.

   Typographie A541 : U+00A0 entre le quantième et le mois, avant « : » et dans
   « Hall 5.2 » ; apostrophe ’. */

const fin = "2026-12-10T00:00:00+01:00"; // minuit à Paris, le lendemain d'OSXP

module.exports = {
  fin,
  actif: Date.now() < Date.parse(fin),
  cle: "ag-bandeau-osxp-2026",
  url: "https://www.opensource-experience.com/fr/inscription?utm_source=VillageAssociatif&utm_medium=email_display&utm_campaign=campagne_invitation_2026",
  fr: {
    avant: "Essayez AZERTY Global en vrai à ",
    lien: "Open\u00A0Source\u00A0Experience",
    apres:
      " (Paris Porte de Versailles, Hall\u00A05.2) le 9\u00A0décembre\u00A0: stand gratuit de l’AMCF.",
    fermer: "Fermer l’annonce"
  },
  en: {
    avant: "Try AZERTY Global live at ",
    lien: "Open\u00A0Source\u00A0Experience",
    apres:
      " (Paris Porte de Versailles, Hall\u00A05.2) on 9\u00A0December: free AMCF booth.",
    fermer: "Dismiss announcement"
  }
};
