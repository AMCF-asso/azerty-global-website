/* Bandeau d'annonce sous l'en-tête (src/_includes/v2/bandeau.njk).
   Demandé par Antoine le 2026-11-15 : le bandeau du Capitole du Libre est retiré
   et remplacé par une annonce d'Open Source Experience (OSXP), sur toutes les
   pages FR et EN, lien vers l'inscription visiteur, fermable (choix mémorisé) et
   retiré tout seul après le salon.

   Faits (Keyboard Layouts/projects/amcf/operations/osxp-2026/candidature.md:7 et
   annonce-osxp-au-capitole.md, contrat d'échange art. 1.1) : salon mercredi 9 et
   jeudi 10 décembre 2026, Paris Porte de Versailles, Hall 5.2 ; stand AZERTY
   Global au village associatif le mercredi 9 seulement (une journée, choix du
   2026-09-01) ; lien « badge visiteur » = lien d'invitation fourni par
   l'organisateur. Durée : jusqu'au 10 décembre (plan-communication.md:43).
   ⚠️ Ni la gratuité du badge ni l'accord d'Infopro Digital au bandeau ne sont
   établis dans les sources : le texte n'affirme pas la gratuité.

   Retrait : à la construction, `actif` passe à faux dès `fin` (le bandeau n'est
   plus écrit dans les pages) ; en attendant la prochaine construction, js/v2/bandeau.js
   le masque dès `fin` côté navigateur. Pour une prochaine annonce, changer `cle`
   (sinon les visiteurs qui l'ont fermée ne la reverraient pas, et la déclarer dans
   src/_data/mesure.js), `fin` et les textes.

   Texte décidé par Antoine le 2026-11-15 (QCM) : « salon les 9 et 10, stand le 9 »,
   trois lignes en mobile au plus (le premier jet de 140 caractères en faisait 4 à
   390 px et 6 à 320 px) ; le Hall 5.2 et le village associatif restent sur la page
   d'inscription du salon.

   Typographie A541 : U+00A0 (écrit   ci-dessous) entre le quantième et le mois
   et avant « : » ; apostrophe ’. */

const fin = "2026-12-11T00:00:00+01:00"; // minuit à Paris, le lendemain du dernier jour du salon

const utm = "utm_source=VillageAssociatif&utm_medium=email_display&utm_campaign=campagne_invitation_2026";
const urlFr = "https://www.opensource-experience.com/fr/inscription?" + utm; // lien du contrat d'échange, art. 1.1
const urlEn = "https://www.opensource-experience.com/en/registration?" + utm;

module.exports = {
  fin,
  actif: Date.now() < Date.parse(fin),
  cle: "ag-bandeau-osxp-2026",
  fr: {
    avant:
      "Open Source Experience, Paris, les 9 et 10 décembre : retrouvez-nous au stand AZERTY Global le mercredi 9. ",
    lien: "Obtenir un badge visiteur",
    url: urlFr,
    apres: "",
    fermer: "Fermer l’annonce"
  },
  en: {
    avant:
      "Open Source Experience, Paris, 9 and 10 December: find us at the AZERTY Global booth on Wednesday 9. ",
    lien: "Get a visitor badge",
    /* Page d'inscription anglaise de l'organisateur (lue le 2026-11-15 par la relecture) ;
       mêmes paramètres utm que le lien du contrat, attribution sur ce chemin non vérifiée. */
    url: urlEn,
    apres: "",
    fermer: "Dismiss announcement"
  }
};
