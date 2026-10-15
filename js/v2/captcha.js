/* Vérification anti-spam des formulaires Web3Forms (S-02, audit sécurité du
   2026-10-05). Partagé par js/v2/formulaire.js (contact, questionnaire,
   pilote, bilan de pilote) et /bienvenue (lien d’installation) :
   toutes ces pages envoient avec la MÊME clé d'accès Web3Forms, donc une fois
   hCaptcha rendu obligatoire dans le tableau de bord Web3Forms, un formulaire
   sans vérification serait refusé.

   Web3Forms (offre gratuite) n'accepte que hCaptcha, avec SA clé de site
   publique, la même pour tous ses clients :
   https://docs.web3forms.com/getting-started/customizations/spam-protection/hcaptcha
   Aucune clé à créer. CLE vide = vérification désactivée sur tout le site.

   Le script hCaptcha (js.hcaptcha.com) n'est chargé qu'à la première
   interaction avec un formulaire : une page consultée sans écrire ne contacte
   pas hCaptcha. Domaines autorisés dans la CSP de `_headers` (script-src,
   frame-src, style-src, connect-src), selon la documentation hCaptcha.

   La zone est créée par ce script, pas par le gabarit : sans JavaScript, il
   n'y a pas de vérification possible, et une case vide dans la page serait un
   leurre. Une fois l'obligation activée, l'envoi sans JavaScript est refusé
   par Web3Forms ; l'adresse e-mail affichée sous chaque formulaire reste le
   repli. */

(function () {
  "use strict";

  var CLE = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";
  var RAPPEL = "agCaptchaPret";
  var etat = "attente"; /* attente | chargement | pret | indisponible */
  var enAttente = [];

  function langue() {
    return /^en/i.test(document.documentElement.lang || "fr") ? "en" : "fr";
  }

  function sombre() {
    var choix = document.documentElement.getAttribute("data-theme");
    if (choix) return choix === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  /* Retire le texte d'attente posé par formulaire.js dans la zone (UX-04,
     QCM d'Antoine du 2026-10-10) : le widget prend sa place. */
  function vider(zone) {
    while (zone.firstChild) zone.removeChild(zone.firstChild);
  }

  /* Chargement en cours ou impossible : formulaire.js réécrit le texte
     d'attente, qui sinon promettrait un widget qui ne vient pas. */
  function signaler(nouvel) {
    enAttente.forEach(function (controle) {
      if (controle.widget !== null) return;
      if (controle.surEtat) controle.surEtat(nouvel);
      else if (nouvel === "indisponible") vider(controle.zone);
    });
  }

  function rendre(controle) {
    if (controle.widget !== null || etat !== "pret") return;
    vider(controle.zone);
    try {
      controle.widget = window.hcaptcha.render(controle.zone, {
        sitekey: CLE,
        theme: sombre() ? "dark" : "light",
        size: controle.compact ? "compact" : "normal",
        callback: function () { if (controle.surValide) controle.surValide(); },
        "expired-callback": function () { /* la case se décoche d'elle-même */ }
      });
    } catch (e) {
      controle.panne = true;
      return;
    }
    if (controle.surPret) controle.surPret();
  }

  function charger() {
    if (etat !== "attente") return;
    etat = "chargement";
    signaler("chargement");
    window[RAPPEL] = function () {
      etat = "pret";
      enAttente.forEach(rendre);
    };
    var script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off&onload=" +
      RAPPEL + "&hl=" + langue();
    script.async = true;
    script.onerror = function () {
      etat = "indisponible";
      signaler("indisponible");
    };
    document.head.appendChild(script);
  }

  /* Branche la vérification sur `formulaire`. `zone` est l'élément où le
     widget se rend. Rend un contrôleur, ou null si la vérification est
     désactivée (CLE vide). */
  function brancher(formulaire, zone) {
    if (!CLE) return null;
    var controle = {
      zone: zone,
      widget: null,
      panne: false,
      surValide: null,
      surPret: null,
      surEtat: null,
      /* pret | chargement | indisponible */
      etat: function () {
        if (etat === "indisponible" || controle.panne) return "indisponible";
        if (etat === "pret" && controle.widget !== null) return "pret";
        return "chargement";
      },
      reponse: function () {
        if (controle.etat() !== "pret") return "";
        try { return window.hcaptcha.getResponse(controle.widget) || ""; } catch (e) { return ""; }
      },
      reinitialiser: function () {
        if (controle.etat() !== "pret") return;
        try { window.hcaptcha.reset(controle.widget); } catch (e) { /* rien à remettre à zéro */ }
      }
    };
    /* 303 x 78 px en taille normale, trop large pour une colonne étroite :
       taille compacte (164 x 144 px). Décidé ici, et la classe posée tout de
       suite, pour que la feuille réserve la bonne hauteur avant le chargement. */
    controle.compact = zone.clientWidth > 0 && zone.clientWidth < 303;
    if (controle.compact) zone.classList.add("captcha--compact");
    enAttente.push(controle);
    rendre(controle);
    ["focusin", "pointerdown"].forEach(function (type) {
      formulaire.addEventListener(type, charger, { once: true });
    });
    return controle;
  }

  window.AGCaptcha = { brancher: brancher };
})();
