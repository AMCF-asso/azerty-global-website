/* Mesure d'audience du site v2 — seul script de mesure du gabarit v2/base.njk.

   Plan de marquage du 2026-10-05 (operations/2026-10-05-mesure-audience/
   plan-de-marquage.md) ; cadre de confidentialité : §12 du plan de refonte de
   /download (jamais de texte saisi, d'e-mail, d'identifiant ni d'empreinte).
   Ce que ce script charge est déclaré dans src/_data/mesure.js : les deux se
   modifient ensemble.

   - Actif sur l'hôte `azerty.global` seulement, sauf en mode test ; jamais si
     le visiteur s'y est opposé (`ag-mesure-refusee`, posé par
     js/v2/opposition-mesure.js sur /confidentialite).
   - Mode test, hors `azerty.global` : `?mesure=test` l'allume pour l'onglet
     (sessionStorage `ag-mesure-test`), `?mesure=off` l'éteint. GA4 passe alors
     en debug_mode (DebugView, exclu des rapports), Umami écrit dans le site de
     test, et chaque événement s'affiche aussi en console.
   - GA4 : `gtag('event', nom, paramètres)`, envoyé par la balise Google du
     conteneur GTM. Consent Mode v2 « denied » permanent, comme le chargeur v1.
   - Umami : pages vues, plus trois conversions (téléchargement, testeur
     terminé, formulaire envoyé).
   - API : `window.AGMesure.evenement(nom, paramètres)`, attributs
     `data-mesure` + `data-mesure-<paramètre>`, et détection par la destination
     d'un lien. Noms, paramètres et valeurs passent par une liste blanche :
     le reste est ignoré.
   - `window.AGMesure.journal` garde les événements de la page, même quand la
     mesure est inactive (tests, mode test). Il ne quitte jamais la page.

   ⛔ La mesure ne doit jamais casser la page : tout passe par try/catch. */

(function () {
  "use strict";

  if (window.AGMesure) return;

  var HOTE_PRODUCTION = "azerty.global";
  var UMAMI_PRODUCTION = "54fa0bee-e290-4779-b00a-2683e625bf36";
  var UMAMI_TEST = "2d778727-f371-4c10-8376-49c5a907385b";
  var UMAMI_SCRIPT = "https://cloud.umami.is/script.js";

  /* Événements autorisés et leurs paramètres (plan de marquage, § Événements). */
  var EVENEMENTS = {
    telechargement: ["os", "canal", "emplacement"],
    vers_telechargement: ["emplacement"],
    vers_testeur: ["emplacement"],
    vers_guide: ["emplacement"],
    vers_pilote: ["emplacement"],
    relais_mobile: ["moyen"],
    testeur_debut: [],
    testeur_etape: ["etape"],
    testeur_fin: [],
    testeur_cta: ["cible"],
    essai_debut: ["caractere"],
    essai_fin: ["caractere"],
    formulaire_envoye: ["formulaire"],
    copie_caractere: ["caractere"],
    aide_memoire: ["action"],
    kit_presse: [],
    don: ["type"]
  };

  /* Valeurs fermées : une valeur absente de la liste fait tomber le paramètre. */
  var VALEURS = {
    os: ["windows", "macos", "linux"],
    canal: ["store", "msix", "sourceforge", "entreprise"],
    moyen: ["partage", "copie", "envoi"],
    etape: ["majuscules", "typographie", "adresse"],
    cible: ["telechargement", "guide", "partage", "refaire"],
    formulaire: ["questionnaire", "pilote", "pilote_bilan", "contact"],
    action: ["apercu", "telechargement"],
    type: ["don", "adhesion"]
  };

  /* Umami ne reçoit que ces conversions, avec ces seuls paramètres. */
  var UMAMI_EVENEMENTS = {
    telechargement: ["os", "canal"],
    testeur_fin: [],
    formulaire_envoye: ["formulaire"]
  };

  var JOURNAL_MAX = 200;
  var UMAMI_FILE_MAX = 10;
  var UMAMI_ENVOIS_MAX = 20;
  var DOUBLON_MS = 1000;

  var journal = [];
  var derniers = Object.create(null);

  function lireStockage(stockage, cle) {
    try { return window[stockage].getItem(cle); } catch (e) { return null; }
  }

  function ecrireStockage(stockage, cle, valeur) {
    try {
      if (valeur === null) window[stockage].removeItem(cle);
      else window[stockage].setItem(cle, valeur);
    } catch (e) { /* stockage indisponible : le mode test ne tient que pour cette page */ }
  }

  /* ——— État : production, test, opposition ——— */

  var hote = String(window.location.hostname || "").toLowerCase().replace(/\.$/, "");
  var production = hote === HOTE_PRODUCTION;
  var test = false;

  if (!production) {
    var demande = null;
    try { demande = new URLSearchParams(window.location.search).get("mesure"); } catch (e) { demande = null; }
    if (demande === "test") ecrireStockage("sessionStorage", "ag-mesure-test", "1");
    if (demande === "off") ecrireStockage("sessionStorage", "ag-mesure-test", null);
    test = demande === "test" || (demande !== "off" && lireStockage("sessionStorage", "ag-mesure-test") === "1");
  }

  var refusee = lireStockage("localStorage", "ag-mesure-refusee") === "1";
  var actif = !refusee && (production || test);

  /* ——— Nettoyage des paramètres ——— */

  function nettoyerValeur(cle, valeur) {
    if (valeur === undefined || valeur === null) return null;
    var texte = String(valeur);
    if (VALEURS[cle]) return VALEURS[cle].indexOf(texte) !== -1 ? texte : null;
    if (cle === "emplacement") {
      texte = texte.toLowerCase();
      return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(texte) ? texte : null;
    }
    if (cle === "caractere") {
      /* Un caractère ou un court groupe écrit par le site (data-copier, slug
         de page), jamais un texte saisi : au plus 24 points de code, sans
         caractère de contrôle. */
      var points = Array.from(texte);
      if (!points.length || points.length > 24 || /[\u0000-\u001f\u007f]/.test(texte)) return null;
      return texte;
    }
    return null;
  }

  function nettoyer(nom, params) {
    var propres = {};
    var source = params && typeof params === "object" ? params : {};
    EVENEMENTS[nom].forEach(function (cle) {
      if (!Object.prototype.hasOwnProperty.call(source, cle)) return;
      var valeur = nettoyerValeur(cle, source[cle]);
      if (valeur !== null) propres[cle] = valeur;
    });
    return propres;
  }

  /* ——— Google Tag Manager (GA4), Consent Mode v2 « denied » ——— */

  function gtag() { window.dataLayer.push(arguments); }

  function chargerGtm() {
    var meta = document.querySelector('meta[name="gtm-id"]');
    var identifiant = meta ? meta.getAttribute("content") : "";
    if (!identifiant || !/^GTM-[A-Z0-9]+$/i.test(identifiant)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || gtag;

    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500
    });
    gtag("set", "ads_data_redaction", true);
    /* DebugView GA4 : le filtre « trafic de développement » exclut ces hits. */
    if (test) gtag("set", "debug_mode", true);

    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(identifiant);
    document.head.appendChild(script);
  }

  /* ——— Umami : pages vues, et file bornée jusqu'au chargement ——— */

  var umamiPret = false;
  var umamiCoupe = false;
  var umamiFile = [];
  var umamiEnvois = 0;

  function umamiEnvoyer(nom, donnees) {
    if (umamiCoupe || umamiEnvois >= UMAMI_ENVOIS_MAX) return;
    umamiEnvois++;
    try {
      var resultat = Object.keys(donnees).length
        ? window.umami.track(nom, donnees)
        : window.umami.track(nom);
      if (resultat && typeof resultat.catch === "function") resultat.catch(function () {});
    } catch (e) { /* la mesure ne bloque jamais la navigation */ }
  }

  function umamiSuivre(nom, params) {
    if (umamiCoupe) return;
    var donnees = {};
    UMAMI_EVENEMENTS[nom].forEach(function (cle) {
      if (params[cle] !== undefined) donnees[cle] = params[cle];
    });
    if (umamiPret) umamiEnvoyer(nom, donnees);
    else if (umamiFile.length < UMAMI_FILE_MAX) umamiFile.push([nom, donnees]);
  }

  function chargerUmami() {
    var script = document.createElement("script");
    script.defer = true;
    script.src = UMAMI_SCRIPT;
    script.setAttribute("data-website-id", test ? UMAMI_TEST : UMAMI_PRODUCTION);
    if (!test) script.setAttribute("data-domains", HOTE_PRODUCTION);
    script.onload = function () {
      if (!window.umami || typeof window.umami.track !== "function") {
        umamiCoupe = true;
        umamiFile.length = 0;
        return;
      }
      umamiPret = true;
      umamiFile.splice(0).forEach(function (entree) { umamiEnvoyer(entree[0], entree[1]); });
    };
    script.onerror = function () {
      umamiCoupe = true;
      umamiFile.length = 0;
    };
    document.head.appendChild(script);
  }

  /* ——— API ——— */

  function emettre(nom, params, depuisClic) {
    try {
      if (typeof nom !== "string" || !Object.prototype.hasOwnProperty.call(EVENEMENTS, nom)) return false;
      var propres = nettoyer(nom, params);

      /* Un double clic ne compte qu'une fois. Les appels des scripts de page
         (étapes, envois) ne sont pas filtrés : chacun est un fait distinct. */
      if (depuisClic) {
        var cle = nom + JSON.stringify(propres);
        var maintenant = Date.now();
        if (derniers[cle] && maintenant - derniers[cle] < DOUBLON_MS) return false;
        derniers[cle] = maintenant;
      }

      if (journal.length < JOURNAL_MAX) journal.push({ nom: nom, params: propres, envoye: actif });
      if (test && window.console && window.console.info) window.console.info("[mesure]", nom, propres);
      if (!actif) return true;

      if (typeof window.gtag === "function") {
        /* debug_mode aussi sur l'événement : c'est la forme documentée par GA4,
           le `set` de chargerGtm() ne couvre peut-être pas les balises GTM. */
        var envoi = test ? Object.assign({ debug_mode: true }, propres) : propres;
        window.gtag("event", nom, envoi);
      }
      if (Object.prototype.hasOwnProperty.call(UMAMI_EVENEMENTS, nom)) umamiSuivre(nom, propres);
      return true;
    } catch (e) {
      return false;
    }
  }

  function evenement(nom, params) {
    return emettre(nom, params, false);
  }

  /* ——— Emplacement d'un clic ——— */

  function emplacementDe(element) {
    var porteur = element.closest("[data-mesure-emplacement]");
    if (porteur) return porteur.getAttribute("data-mesure-emplacement");
    if (element.closest("header.entete")) return "entete";
    if (element.closest("footer.pied")) return "pied";
    var section = element.closest("section[id]");
    if (section) return section.id;
    return "page";
  }

  /* ——— Détection par la destination d'un lien ——— */

  var PAGES_INTERNES = {
    download: "vers_telechargement",
    testeur: "vers_testeur",
    tester: "vers_testeur",
    guide: "vers_guide",
    pilote: "vers_pilote",
    pilot: "vers_pilote"
  };

  function cheminNormalise(chemin) {
    return String(chemin || "/").replace(/\.html$/, "").replace(/\/index$/, "/").replace(/\/+$/, "") || "/";
  }

  function classerLien(lien) {
    var href = lien.getAttribute("href");
    if (!href || href.charAt(0) === "#") return null;
    var url;
    try { url = new URL(href, window.location.href); } catch (e) { return null; }
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    var domaine = url.hostname.toLowerCase();
    var chemin = url.pathname;
    var correspondance;

    /* Téléchargements finaux : mêmes destinations que js/umami-tracking.js (v1). */
    if (domaine === "apps.microsoft.com" && /^\/detail\/9n4bts43sssz\/?$/i.test(chemin)) {
      return { nom: "telechargement", params: { os: "windows", canal: "store" } };
    }
    if (domaine === "download.azerty.global") {
      if (/^\/AZERTY_Global_Entreprise\.zip$/.test(chemin)) {
        return { nom: "telechargement", params: { os: "windows", canal: "entreprise" } };
      }
      if (/^\/AZERTY_Global_[\w.-]+\.msixbundle$/.test(chemin)) {
        return { nom: "telechargement", params: { os: "windows", canal: "msix" } };
      }
      return null;
    }
    if (domaine === "sourceforge.net") {
      correspondance = chemin.match(/^\/projects\/azertyglobal\/files\/AZERTY_Global_(Windows|macOS|Linux)\.zip\/download$/);
      if (correspondance) {
        return { nom: "telechargement", params: { os: correspondance[1].toLowerCase(), canal: "sourceforge" } };
      }
      return null;
    }

    /* Dons et adhésions (HelloAsso). */
    if (domaine === "helloasso.com" || /\.helloasso\.com$/.test(domaine)) {
      return { nom: "don", params: { type: /\/adhesions\//.test(chemin) ? "adhesion" : "don" } };
    }

    /* Liens du site lui-même (ou vers azerty.global depuis un aperçu). */
    var interne = url.origin === window.location.origin || domaine === HOTE_PRODUCTION;
    if (!interne) return null;

    if (/\/aide-memoire[^/]*\.pdf$/i.test(chemin)) {
      return { nom: "aide_memoire", params: { action: lien.hasAttribute("download") ? "telechargement" : "apercu" } };
    }
    if (/\/Kit_Presse[^/]*\.zip$/i.test(chemin)) {
      return { nom: "kit_presse", params: {} };
    }

    var page = cheminNormalise(chemin);
    correspondance = page.match(/^\/(?:en\/)?([a-z]+)$/);
    if (!correspondance || !PAGES_INTERNES[correspondance[1]]) return null;
    /* Une ancre ou un lien vers la page où l'on est déjà ne compte pas. */
    if (page === cheminNormalise(window.location.pathname)) return null;
    return { nom: PAGES_INTERNES[correspondance[1]], params: {} };
  }

  /* Paramètres déclarés : data-mesure-os="windows" → { os: "windows" }. */
  function paramsDeclares(element) {
    var params = {};
    Array.prototype.forEach.call(element.attributes, function (attribut) {
      var nom = attribut.name;
      if (nom.indexOf("data-mesure-") === 0) params[nom.slice(12)] = attribut.value;
    });
    return params;
  }

  function surClic(evenementDom) {
    try {
      if (evenementDom.type === "click" && evenementDom.button !== 0) return;
      if (evenementDom.type === "auxclick" && evenementDom.button !== 1) return;
      var cible = evenementDom.target;
      if (!cible || typeof cible.closest !== "function") return;

      var declare = cible.closest("[data-mesure]");
      var nomDeclare = declare ? declare.getAttribute("data-mesure") : "";
      if (declare) {
        var params = paramsDeclares(declare);
        if (!params.emplacement && EVENEMENTS[nomDeclare] && EVENEMENTS[nomDeclare].indexOf("emplacement") !== -1) {
          params.emplacement = emplacementDe(declare);
        }
        emettre(nomDeclare, params, true);
      }

      var lien = cible.closest("a[href]");
      if (!lien) return;
      var detecte = classerLien(lien);
      if (!detecte || detecte.nom === nomDeclare) return;
      if (EVENEMENTS[detecte.nom].indexOf("emplacement") !== -1) {
        detecte.params.emplacement = emplacementDe(lien);
      }
      emettre(detecte.nom, detecte.params, true);
    } catch (e) { /* la mesure ne bloque jamais la navigation */ }
  }

  window.AGMesure = {
    evenement: evenement,
    journal: journal,
    actif: actif,
    test: test
  };

  try {
    document.addEventListener("click", surClic, true);
    document.addEventListener("auxclick", surClic, true);
    if (actif) {
      chargerGtm();
      chargerUmami();
    }
  } catch (e) { /* la mesure ne bloque jamais la page */ }
})();
