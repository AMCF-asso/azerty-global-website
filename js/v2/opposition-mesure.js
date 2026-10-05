/**
 * Opposition à la mesure d'audience (/confidentialite).
 *
 * Le refus est gardé dans ce navigateur : `ag-mesure-refusee` empêche
 * js/v2/mesure.js de charger Umami ; `umami.disabled` est la clé que
 * le script Umami lit lui-même pour ne rien envoyer.
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

  // État réel lu dans js/v2/mesure.js (chargé avant, même ordre defer) :
  // hors azerty.global la mesure est coupée, et une réautorisation ne
  // reprend qu'au chargement suivant.
  var actifAuChargement = !!(window.AGMesure && window.AGMesure.actif);
  var reautorise = false;

  function afficher() {
    var refuse = lire();
    if (refuse === null) {
      etat.textContent = 'Votre navigateur bloque le stockage local : le refus ne peut pas être enregistré.';
      bouton.hidden = true;
      return;
    }
    bouton.hidden = false;
    bouton.textContent = refuse ? 'Réautoriser la mesure d’audience' : 'Refuser la mesure d’audience';
    if (refuse) {
      etat.textContent = 'Mesure refusée sur ce navigateur : vos visites ne sont plus comptées.';
    } else if (reautorise) {
      etat.textContent = 'Mesure réautorisée : elle reprendra à la page suivante.';
    } else if (actifAuChargement) {
      etat.textContent = 'Mesure active sur ce navigateur.';
    } else {
      etat.textContent = 'La mesure n’est pas active sur cette adresse.';
    }
  }

  bouton.addEventListener('click', function () {
    try {
      if (lire()) {
        window.localStorage.removeItem('ag-mesure-refusee');
        window.localStorage.removeItem('umami.disabled');
        reautorise = !actifAuChargement;
      } else {
        window.localStorage.setItem('ag-mesure-refusee', '1');
        window.localStorage.setItem('umami.disabled', '1');
      }
    } catch (e) { /* affiché par afficher() */ }
    afficher();
  });

  afficher();
})();
