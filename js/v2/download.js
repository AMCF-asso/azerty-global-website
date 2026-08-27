/* Refonte — page /download : sélecteur de système, recommandation par détection,
   relais mobile. Règles du plan §5 : la détection recommande, ne redirige jamais,
   ne déclenche jamais de téléchargement ; le contenu complet reste dans le HTML. */

(function () {
  "use strict";

  /* ——— Sélecteur de système (onglets accessibles) ——— */

  var onglets = Array.prototype.slice.call(document.querySelectorAll(".selecteur-os__onglet"));
  if (!onglets.length) return;

  function activerOnglet(os, focus) {
    onglets.forEach(function (onglet) {
      var actif = onglet.dataset.os === os;
      onglet.setAttribute("aria-selected", actif ? "true" : "false");
      onglet.tabIndex = actif ? 0 : -1;
      var panneau = document.getElementById("os-" + onglet.dataset.os);
      if (panneau) panneau.hidden = !actif;
      if (actif && focus) onglet.focus();
    });
  }

  onglets.forEach(function (onglet, index) {
    onglet.addEventListener("click", function () {
      activerOnglet(onglet.dataset.os, false);
    });
    onglet.addEventListener("keydown", function (evenement) {
      var delta = evenement.key === "ArrowRight" ? 1 : evenement.key === "ArrowLeft" ? -1 : 0;
      if (!delta) return;
      evenement.preventDefault();
      var suivant = onglets[(index + delta + onglets.length) % onglets.length];
      activerOnglet(suivant.dataset.os, true);
    });
  });

  /* Liens internes « data-os-target » : choisir l'onglet avant de descendre */
  document.querySelectorAll("[data-os-target]").forEach(function (lien) {
    lien.addEventListener("click", function () {
      activerOnglet(lien.dataset.osTarget, false);
    });
  });

  /* Anciennes ancres conservées (plan §13) : #os-macos, #os-linux, #smartscreen-details… */
  function appliquerFragment() {
    var fragment = window.location.hash.replace("#", "");
    if (!fragment) return;
    var correspondance = fragment.match(/^os-(windows|macos|linux)$/);
    if (correspondance) activerOnglet(correspondance[1], false);
    if (fragment === "smartscreen-details" || fragment === "exe-classique") {
      activerOnglet("windows", false);
      var details = document.getElementById(fragment);
      if (details) details.open = true;
    }
  }
  window.addEventListener("hashchange", appliquerFragment);
  appliquerFragment();

  /* ——— Détection : une recommandation, jamais une redirection (plan §5) ——— */

  var ligneReco = document.querySelector("[data-os-reco]");
  var ctaPrincipal = document.querySelector("[data-cta-principal]");

  function systemeDetecte() {
    var donnees = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    var agent = navigator.userAgent || "";
    var texte = (donnees + " " + agent).toLowerCase();
    if (texte.indexOf("android") !== -1 || /iphone|ipad|ipod/.test(texte)) return "mobile";
    if (texte.indexOf("win") !== -1) return "windows";
    if (texte.indexOf("mac") !== -1) return "macos";
    if (texte.indexOf("linux") !== -1 || texte.indexOf("x11") !== -1) return "linux";
    return "inconnu";
  }

  var systeme = systemeDetecte();

  if (ligneReco) {
    if (systeme === "windows") {
      ligneReco.textContent = "Windows détecté — l’application Microsoft Store est recommandée.";
    } else if (systeme === "macos") {
      ligneReco.textContent = "macOS détecté — l’installation passe par un fichier .keylayout, expliquée plus bas.";
    } else if (systeme === "linux") {
      ligneReco.textContent = "Linux détecté — un script d’installation est fourni, expliqué plus bas.";
    } else if (systeme === "mobile") {
      ligneReco.textContent = "AZERTY Global s’installe depuis un ordinateur — envoyez-vous le lien plus bas.";
    }
  }

  if (systeme === "macos" || systeme === "linux") {
    activerOnglet(systeme, false);
    if (ctaPrincipal) {
      ctaPrincipal.textContent = systeme === "macos" ? "Voir l’installation macOS" : "Voir l’installation Linux";
      ctaPrincipal.href = "#installation";
      ctaPrincipal.removeAttribute("target");
      ctaPrincipal.removeAttribute("rel");
    }
  }

  /* ——— Relais mobile : partager ou copier le lien de la page ——— */

  var relais = document.querySelector("[data-relais-mobile]");
  if (relais && (systeme === "mobile" || window.matchMedia("(pointer: coarse) and (max-width: 767px)").matches)) {
    relais.hidden = false;
    var confirmation = relais.querySelector("[data-relais-confirmation]");
    var boutonCopie = relais.querySelector("[data-relais-copie]");
    var boutonPartage = relais.querySelector("[data-relais-partage]");
    var url = "https://azerty.global/download";

    if (boutonCopie) {
      boutonCopie.addEventListener("click", function () {
        var confirmer = function () {
          if (confirmation) confirmation.textContent = "Lien copié.";
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(confirmer, function () {
            if (confirmation) confirmation.textContent = url;
          });
        } else if (confirmation) {
          confirmation.textContent = url;
        }
      });
    }

    if (boutonPartage && navigator.share) {
      boutonPartage.hidden = false;
      boutonPartage.addEventListener("click", function () {
        navigator.share({ title: "Télécharger AZERTY Global", url: url }).catch(function () {
          /* partage annulé : rien à faire */
        });
      });
    }
  }
})();
