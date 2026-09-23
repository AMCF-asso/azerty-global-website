/**
 * Opposition à la mesure d'audience (/confidentialite).
 *
 * Le refus est gardé dans ce navigateur : `ag-mesure-refusee` empêche
 * js/v2/gtm-loader.js (et sa copie v1) de charger GA4, `umami.disabled` est la
 * clé que le script Umami lit lui-même pour ne rien envoyer.
 */
(function () {
  'use strict';

  var bouton = document.querySelector('[data-opposition-mesure]');
  var etat = document.querySelector('[data-opposition-etat]');
  if (!bouton || !etat) return;

  function lire() {
    try { return window.localStorage.getItem('ag-mesure-refusee') === '1'; }
    catch (e) { return null; }
  }

  function afficher() {
    var refuse = lire();
    if (refuse === null) {
      etat.textContent = 'Votre navigateur bloque le stockage local : le refus ne peut pas être enregistré.';
      bouton.hidden = true;
      return;
    }
    bouton.hidden = false;
    bouton.textContent = refuse ? 'Réautoriser la mesure d’audience' : 'Refuser la mesure d’audience';
    bouton.setAttribute('aria-pressed', refuse ? 'true' : 'false');
    etat.textContent = refuse
      ? 'Mesure refusée sur ce navigateur : Google Analytics n’est plus chargé et Umami n’envoie plus rien.'
      : 'Mesure active sur ce navigateur.';
  }

  bouton.addEventListener('click', function () {
    try {
      if (lire()) {
        window.localStorage.removeItem('ag-mesure-refusee');
        window.localStorage.removeItem('umami.disabled');
      } else {
        window.localStorage.setItem('ag-mesure-refusee', '1');
        window.localStorage.setItem('umami.disabled', '1');
      }
    } catch (e) { /* affiché par afficher() */ }
    afficher();
  });

  afficher();
})();
