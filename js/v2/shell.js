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

  /* Les couleurs changent d'un coup, sans transition (data-theme-bascule,
     css/v2/jetons.css) : l'attribut couvre l'image où le nouveau thème se
     calcule, et part à la suivante, quand plus rien ne change. */
  function sansTransition() {
    var racine = document.documentElement;
    racine.setAttribute("data-theme-bascule", "");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        racine.removeAttribute("data-theme-bascule");
      });
    });
  }

  /* En automatique, le thème suit le système, même page ouverte. */
  if (window.matchMedia) {
    var themeSysteme = window.matchMedia("(prefers-color-scheme: dark)");
    var suivreSysteme = function () {
      if (themeCourant() === "auto") sansTransition();
    };
    if (themeSysteme.addEventListener) themeSysteme.addEventListener("change", suivreSysteme);
    else if (themeSysteme.addListener) themeSysteme.addListener(suivreSysteme);
  }

  function appliquerTheme(theme) {
    var racine = document.documentElement;
    sansTransition();
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
  function menuOuvert() {
    return entete.classList.contains("entete--menu-ouvert");
  }

  function basculerMenu(ouvert) {
    entete.classList.toggle("entete--menu-ouvert", ouvert);
    boutonMenu.setAttribute("aria-expanded", ouvert ? "true" : "false");
    boutonMenu.textContent = ouvert ? (EN ? "Close" : "Fermer") : "Menu";
  }

  if (boutonMenu && entete) {
    boutonMenu.addEventListener("click", function () {
      basculerMenu(!menuOuvert());
    });

    // Audit v2 (WCAG 2.1.2, 2.4.3) : Échap ferme le menu et rend le focus au
    // bouton ; le menu se ferme aussi quand le focus quitte l'en-tête.
    document.addEventListener("keydown", function (evenement) {
      if (evenement.key !== "Escape" || !menuOuvert()) return;
      // Un groupe ouvert se ferme d'abord (gestionnaire plus bas).
      if (document.querySelector(".nav-groupe[open]")) return;
      basculerMenu(false);
      boutonMenu.focus();
    });

    entete.addEventListener("focusout", function (evenement) {
      if (menuOuvert() && evenement.relatedTarget && !entete.contains(evenement.relatedTarget)) {
        basculerMenu(false);
      }
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

  /* ——— Cadre défilant du clavier v2 ———

     Le cadre n'est une région focalisable que s'il défile et que rien dedans
     ne prend le focus (niveau « image ») : un clavier interactif se parcourt
     par ses touches, que le focus amène dans le cadre. Ailleurs, la région
     n'était qu'un arrêt de tabulation de plus, jusqu'à 1280 px où rien ne
     défile (DEV-09, critique du 2026-10-02). Sans script, le marquage du
     build la garde focalisable. Ici plutôt que dans clavier.js : les pages
     au clavier inerte (/a-propos, /francais-etranger, /pilote) ne chargent
     pas clavier.js et gardaient l'arrêt (mesuré le 2026-10-05). Au
     DOMContentLoaded, clavier.js a déjà marqué ses claviers data-interactif. */

  function reglerDefilement(cadre) {
    var clavier = cadre.querySelector(".clavier");
    var focalisable = cadre.scrollWidth > cadre.clientWidth &&
      !(clavier && clavier.hasAttribute("data-interactif"));
    if (focalisable) {
      cadre.setAttribute("tabindex", "0");
      cadre.setAttribute("role", "region");
      cadre.setAttribute("aria-label", "Clavier, défilement horizontal");
    } else {
      cadre.removeAttribute("tabindex");
      cadre.removeAttribute("role");
      cadre.removeAttribute("aria-label");
    }
  }

  function suivreCadres() {
    Array.prototype.forEach.call(document.querySelectorAll(".clavier-defilement"), function (cadre) {
      reglerDefilement(cadre);
      /* Rotation, plein écran ouvert, fenêtre redimensionnée. */
      if (typeof ResizeObserver === "function") {
        new ResizeObserver(function () { reglerDefilement(cadre); }).observe(cadre);
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", suivreCadres);
  else suivreCadres();
})();
