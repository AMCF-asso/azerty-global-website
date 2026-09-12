/* Chargeur v2 du testeur — session P14a (2026-09-12).

   Remplace `js/lazy-tester.js` sur les pages v2. Le v1 fait trois choses :
   charger le testeur à la demande, piloter le plein écran des deux SVG de carte
   du héros de la home v1, et charger `keyboard-hotspots.js` / `layout-data.js`
   qui s'y accrochent. La v2 n'a plus ni ces SVG ni ces classes — le clavier y
   est le composant `.clavier` généré au build — donc il ne reste ici que le
   chargement à la demande. 460 lignes deviennent une soixantaine.

   ⛔ Ne pas y remettre la logique de repli tactile : elle vit dans
   `initTesterModal` (masquage du bouton sur mobile) et son vrai traitement est
   la session P14b, qui refait le parcours mobile.

   CSP : `_headers` sert `script-src 'self'` et `style-src 'self'` sans
   'unsafe-inline'. Ce fichier est externe, ne pose aucun attribut `style=` et
   n'injecte aucune balise `<style>`. */

(function () {
  'use strict';

  /* Version des ressources du testeur (dossier /tester/ et js/ à la racine).
     ⚠️ Elle est distincte du jeton de `src/_data/versionAssets.js`, qui ne
     couvre que `css/v2/` et `js/v2/`. Elle reprend la valeur du chargeur v1 :
     les deux doivent servir le même fichier tant que les pages v1 vivent. */
  var VERSION_TESTEUR = 'final-20260801-1';

  var bouton = document.getElementById('open-tester-btn');
  if (!bouton) return;

  var langue = document.documentElement.lang || 'fr';
  var anglais = /^en/i.test(langue);

  function t(fr, en) { return anglais ? en : fr; }

  var chargement = null;
  var charge = false;

  /* La feuille du testeur vit hors de css/v2/ et n'est tirée que si le
     visiteur ouvre l'outil : 32 Ko qu'une page fermée n'a pas à payer. */
  function feuilleTesteur() {
    var existante = document.querySelector('link[data-testeur-css]');
    if (existante) {
      return existante.dataset.loaded === 'true'
        ? Promise.resolve()
        : attendre(existante);
    }
    var lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = '/tester/keyboard.css?v=' + VERSION_TESTEUR;
    lien.dataset.testeurCss = '';
    document.head.appendChild(lien);
    return attendre(lien);
  }

  function attendre(lien) {
    return new Promise(function (resoudre, rejeter) {
      lien.addEventListener('load', function () {
        lien.dataset.loaded = 'true';
        resoudre();
      }, { once: true });
      lien.addEventListener('error', function () {
        rejeter(new Error('tester/keyboard.css introuvable'));
      }, { once: true });
    });
  }

  /* Les paramètres du testeur se déclarent sur le bouton, pas sur la balise
     script : en v2 le layout écrit lui-même les `<script defer>`, donc une
     page n'a aucun moyen d'ajouter un `data-` à la sienne. */
  function urlAmorce() {
    var url = new URL('/js/init-tester.js', window.location.origin);
    url.searchParams.set('v', VERSION_TESTEUR);
    var correspondances = {
      mode: 'testeurMode',
      module: 'testeurModule',
      lesson: 'testeurLecon',
      tutorial: 'testeurTutoriel',
      guidedHints: 'testeurIndices'
    };
    Object.keys(correspondances).forEach(function (cle) {
      var valeur = bouton.dataset[correspondances[cle]];
      if (valeur) url.searchParams.set(cle, valeur);
    });
    if (anglais) url.searchParams.set('lang', 'en');
    return url.href;
  }

  function messageEchec() {
    if (document.getElementById('testeur-echec')) return;
    var bloc = document.createElement('div');
    bloc.className = 'message message--erreur';
    bloc.id = 'testeur-echec';
    var titre = document.createElement('p');
    titre.className = 'message__titre';
    titre.textContent = t('Le testeur n’a pas pu être chargé.',
      'The tester could not be loaded.');
    var corps = document.createElement('p');
    corps.textContent = t(
      'Vérifiez votre connexion, puis réessayez. Le clavier fonctionne aussi hors du testeur : la page /guide décrit les cinq changements.',
      'Check your connection and try again. The layout also works outside the tester: the /guide page describes the five changes.');
    bloc.appendChild(titre);
    bloc.appendChild(corps);
    bouton.parentNode.insertBefore(bloc, bouton.nextSibling);
  }

  function charger() {
    if (charge) return Promise.resolve();
    if (chargement) return chargement;
    bouton.classList.add('est-en-chargement');
    chargement = feuilleTesteur()
      .then(function () { return import(urlAmorce()); })
      .then(function () {
        charge = true;
        var echec = document.getElementById('testeur-echec');
        if (echec) echec.remove();
      })
      .catch(function (erreur) {
        console.error('Chargement du testeur :', erreur);
        messageEchec();
        throw erreur;
      })
      .finally(function () {
        chargement = null;
        bouton.classList.remove('est-en-chargement');
      });
    return chargement;
  }

  /* Premier clic : on charge, puis on rejoue le clic — c'est
     `initTesterModal` qui pose alors son propre écouteur et ouvre la modale.
     Même enchaînement qu'en v1, pour ne pas toucher aux 15 fichiers du
     testeur. */
  bouton.addEventListener('click', function () {
    if (charge || chargement) return;
    charger().then(function () { bouton.click(); }).catch(function () { });
  });

  /* Tout autre déclencheur de la page (carte, lien de section) renvoie sur le
     bouton principal, qui reste le seul point d'entrée du testeur. */
  Array.prototype.forEach.call(
    document.querySelectorAll('[data-testeur-ouvrir]'),
    function (element) {
      if (element === bouton) return;
      element.addEventListener('click', function (evenement) {
        evenement.preventDefault();
        bouton.click();
      });
    }
  );
})();
