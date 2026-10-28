/* Plan du site (/plan-du-site). Les rubriques reprennent les colonnes du pied
   de page ; les libellés sont ceux d'un lien, pas les <title> SEO.
   ⛔ Toute page indexable doit figurer ici : tests/unit/plan-du-site.test.js
   compare cette liste aux pages de src/ (hors noindex) et aux landings. */
module.exports = [
  {
    id: "produit",
    titre: "Le clavier",
    pages: [
      { chemin: "/", libelle: "Accueil" },
      { chemin: "/download", libelle: "Télécharger AZERTY Global" },
      { chemin: "/testeur", libelle: "Essayer le clavier en ligne" },
      { chemin: "/guide", libelle: "Prise en main rapide" },
      { chemin: "/faq", libelle: "Questions fréquentes" },
      { chemin: "/nouveautes", libelle: "Nouveautés" },
      { chemin: "/compatibilite", libelle: "Compatibilité logicielle" },
      { chemin: "/comparatif", libelle: "Comparatif AZERTY Global, AFNOR et Windows" },
      { chemin: "/azerty-ameliore", libelle: "AZERTY amélioré : les dispositions comparées" },
      { chemin: "/autocollants-claviers", libelle: "Autocollants et claviers : être prévenu" },
    ],
  },
  {
    id: "caracteres",
    titre: "Taper un caractère",
    pages: [
      { chemin: "/e-aigu-majuscule", libelle: "É majuscule" },
      { chemin: "/e-grave-majuscule", libelle: "È majuscule" },
      { chemin: "/c-cedille-majuscule", libelle: "Ç majuscule" },
      { chemin: "/a-grave-majuscule", libelle: "À majuscule" },
      { chemin: "/e-dans-l-o", libelle: "œ et Œ (e dans l’o)" },
      { chemin: "/e-dans-l-a", libelle: "æ et Æ (e dans l’a)" },
      { chemin: "/guillemets", libelle: "Guillemets français « »" },
      { chemin: "/tiret-cadratin", libelle: "Tiret long — et tiret –" },
      { chemin: "/arobase", libelle: "Arobase @" },
      { chemin: "/crochets", libelle: "Crochets [ ]" },
      { chemin: "/accolades", libelle: "Accolades { }" },
    ],
  },
  {
    id: "ressources",
    titre: "Langues et usages",
    pages: [
      { chemin: "/afrique", libelle: "Langues d’Afrique au clavier" },
      { chemin: "/francais-etranger", libelle: "Écrire en français à l’étranger" },
      { chemin: "/francais-correct", libelle: "Guide typographique du français" },
      { chemin: "/histoire-azerty", libelle: "Histoire du clavier AZERTY" },
      { chemin: "/dev", libelle: "AZERTY Global pour les développeurs" },
      { chemin: "/automatisation-clavier", libelle: "Automatisation clavier pour agents IA" },
    ],
  },
  {
    id: "organisations",
    titre: "Organisations",
    pages: [
      { chemin: "/entreprises", libelle: "Entreprises" },
      { chemin: "/ecoles", libelle: "Écoles" },
      { chemin: "/administrations", libelle: "Administrations" },
      { chemin: "/afrique-francophone", libelle: "Afrique francophone" },
      { chemin: "/pilote", libelle: "Pilote gratuit" },
    ],
  },
  {
    id: "association",
    titre: "Association",
    pages: [
      { chemin: "/association", libelle: "L’AMCF, l’association qui porte AZERTY Global" },
      { chemin: "/a-propos", libelle: "À propos du projet" },
      { chemin: "/soutien", libelle: "Soutenir le projet" },
      { chemin: "/presse", libelle: "Presse" },
      { chemin: "/contact", libelle: "Contact" },
    ],
  },
  {
    id: "legal",
    titre: "Informations légales",
    pages: [
      { chemin: "/mentions-legales", libelle: "Mentions légales" },
      { chemin: "/confidentialite", libelle: "Confidentialité" },
      { chemin: "/accessibilite", libelle: "Accessibilité" },
      { chemin: "/licence", libelle: "Licence" },
    ],
  },
];
