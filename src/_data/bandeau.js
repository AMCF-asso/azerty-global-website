/* Bandeau d'annonce sous l'en-tête (src/_includes/v2/bandeau.njk).
   Décidé par Antoine le 2026-11-12 (QCM) : annonce du Capitole du Libre, sur
   toutes les pages FR et EN, texte « stand + conférence », lien vers le site de
   l'événement, fermable (choix mémorisé) et retiré tout seul après l'événement.

   Faits (Keyboard Layouts/projects/amcf/operations/capitole-du-libre-2026/index.md,
   site des organisateurs lu le 2026-08-24, programme pretalx relu le 2026-10-23) :
   samedi 14 et dimanche 15 novembre 2026, ENSEEIHT à Toulouse ; stand de l'AMCF
   les deux jours ; conférence AZERTY Global le dimanche 15 à 14 h, salle A303.

   Retrait : à la construction, `actif` passe à faux dès `fin` (le bandeau n'est
   plus écrit dans les pages) ; en attendant la prochaine construction, js/v2/bandeau.js
   le masque dès `fin` côté navigateur. Pour une prochaine annonce, changer `cle`
   (sinon les visiteurs qui l'ont fermée ne la reverraient pas), `fin` et les textes.

   Typographie A541 : U+00A0 entre le quantième et le mois, avant « : » et dans
   « 14 h » ; apostrophe ’. */

const fin = "2026-11-16T00:00:00+01:00"; // minuit à Paris, le lendemain du dernier jour

module.exports = {
  fin,
  actif: Date.now() < Date.parse(fin),
  cle: "ag-bandeau-capitole-2026",
  url: "https://2026.capitoledulibre.org/",
  fr: {
    avant: "Retrouvez-nous au ",
    lien: "Capitole du Libre",
    apres:
      " à Toulouse, 14 et 15 novembre : stand de l’AMCF et conférence AZERTY Global dimanche à 14 h.",
    fermer: "Fermer l’annonce"
  },
  en: {
    avant: "Find us at ",
    lien: "Capitole du Libre",
    apres:
      " in Toulouse, 14 and 15 November: AMCF booth and an AZERTY Global talk on Sunday at 2 pm.",
    fermer: "Dismiss announcement"
  }
};
