/* Refonte — comportements du shell : bascule de thème à trois états,
   menu mobile, groupes de navigation. Tout est utilisable sans ce script :
   les <details> s'ouvrent nativement, le contenu reste accessible. */

(function () {
  "use strict";

  /* ——— Thème : auto (système) → clair → sombre → auto ——— */

  var ORDRE = ["auto", "light", "dark"];
  var EN = (document.documentElement.lang || "fr").slice(0, 2) === "en";
  var LIBELLES = EN
    ? { auto: "auto", light: "light", dark: "dark" }
    : { auto: "auto", light: "clair", dark: "sombre" };

  function themeCourant() {
    try {
      var t = localStorage.getItem("ag-theme");
      return t === "light" || t === "dark" ? t : "auto";
    } catch (e) {
      return "auto";
    }
  }

  function appliquerTheme(theme) {
    var racine = document.documentElement;
    if (theme === "auto") {
      racine.removeAttribute("data-theme");
      try { localStorage.removeItem("ag-theme"); } catch (e) { /* sans stockage */ }
    } else {
      racine.setAttribute("data-theme", theme);
      try { localStorage.setItem("ag-theme", theme); } catch (e) { /* sans stockage */ }
    }
    boutonsTheme.forEach(function (bouton) {
      etatDe(bouton).textContent = LIBELLES[theme];
    });
  }

  function etatDe(bouton) {
    return bouton.querySelector("[data-bascule-theme-etat]") || bouton;
  }

  var boutonsTheme = Array.prototype.slice.call(document.querySelectorAll("[data-bascule-theme]"));
  boutonsTheme.forEach(function (bouton) {
    etatDe(bouton).textContent = LIBELLES[themeCourant()];
    bouton.addEventListener("click", function () {
      var suivant = ORDRE[(ORDRE.indexOf(themeCourant()) + 1) % ORDRE.length];
      appliquerTheme(suivant);
    });
  });

  /* ——— Menu mobile ——— */

  var boutonMenu = document.querySelector("[data-menu-bouton]");
  var entete = document.querySelector(".entete");
  if (boutonMenu && entete) {
    boutonMenu.addEventListener("click", function () {
      var ouvert = entete.classList.toggle("entete--menu-ouvert");
      boutonMenu.setAttribute("aria-expanded", ouvert ? "true" : "false");
      boutonMenu.textContent = ouvert ? "Fermer" : "Menu";
    });
  }

  /* ——— Groupes de navigation : un seul ouvert à la fois (ordinateur),
         fermeture par Échap et par clic à l'extérieur ——— */

  var groupes = Array.prototype.slice.call(document.querySelectorAll(".nav-groupe"));

  groupes.forEach(function (groupe) {
    groupe.addEventListener("toggle", function () {
      if (!groupe.open) return;
      groupes.forEach(function (autre) {
        if (autre !== groupe) autre.open = false;
      });
    });
  });

  document.addEventListener("keydown", function (evenement) {
    if (evenement.key !== "Escape") return;
    groupes.forEach(function (groupe) {
      if (!groupe.open) return;
      groupe.open = false;
      var resume = groupe.querySelector("summary");
      if (resume && groupe.contains(document.activeElement)) resume.focus();
    });
  });

  document.addEventListener("click", function (evenement) {
    groupes.forEach(function (groupe) {
      if (groupe.open && !groupe.contains(evenement.target)) groupe.open = false;
    });
  });
})();
