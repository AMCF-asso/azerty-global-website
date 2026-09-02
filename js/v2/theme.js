/* Thème : ivoire par défaut, préférence système respectée, choix explicite
   stocké sous ag-theme (décisions du 2026-08-27). L'ancienne clé "theme",
   écrite d'office par le site précédent, est purgée : elle ne représentait
   pas un choix.

   Chargé dans <head> par src/_includes/v2/base.njk, sans defer ni async, pour
   poser data-theme avant le premier rendu (aucun flash). Ce fichier remplace
   le script inline de base.njk : `_headers` sert `script-src 'self'` sans
   'unsafe-inline', donc en production l'inline était bloqué et data-theme
   restait nul au rechargement (audit A1 du 2026-09-02, session T1).
   La bascule au clic vit dans shell.js ; ici on ne fait que relire le choix. */
(function () {
  try {
    localStorage.removeItem("theme");
    var t = localStorage.getItem("ag-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) { /* stockage indisponible : thème système */ }
})();
