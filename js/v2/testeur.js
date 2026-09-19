/* Chargeur v2 du testeur — P14a (2026-09-12), refait en P14b (2026-09-19).

   Sur la page /testeur, le testeur est rendu DANS la page (spec du 19/09 §2) :
   plus de bouton, plus de modale par-dessus. Ce chargeur trouve l'hôte
   `[data-testeur-hote]`, tire la feuille et les modules du testeur, puis laisse
   `init-tester.js?inline=1` monter le composant dans l'hôte.

   Tactile (§7.4) : sur `(hover: none) and (pointer: coarse)` rien ne se charge,
   l'hôte reçoit la notice validée le 19/09. Le testeur tactile en paysage est
   une session ultérieure.

   ⛔ Ne pas y remettre la modale : elle vit sur la home v1 via lazy-tester.js.

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

  var hote = document.querySelector('[data-testeur-hote]');
  if (!hote) return;

  var langue = document.documentElement.lang || 'fr';
  var anglais = /^en/i.test(langue);

  function t(fr, en) { return anglais ? en : fr; }

  function vider() {
    while (hote.firstChild) hote.removeChild(hote.firstChild);
  }

  /* Notice tactile (§7.4), texte validé par Antoine le 19/09. */
  function noticeTactile() {
    vider();
    var bloc = document.createElement('div');
    bloc.className = 'testeur-inline__notice';
    bloc.setAttribute('data-testeur-notice', 'tactile');
    var texte = document.createElement('p');
    texte.textContent = t(
      'Le testeur s’utilise sur un ordinateur avec un clavier physique. Une version pour téléphone, à tenir en paysage, est en préparation.',
      'The tester works on a computer with a physical keyboard. A phone version, to hold in landscape, is in preparation.'
    );
    bloc.appendChild(texte);
    hote.appendChild(bloc);
    hote.classList.add('testeur-inline--tactile');
  }

  var tactile = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (tactile) {
    noticeTactile();
    return;
  }

  /* Les feuilles du testeur vivent hors de css/v2/ : sa feuille propre, et
     les classes utilitaires v1 (`.bg-secondary`, `.p-3`, `.rounded-8`…) que
     son gabarit emploie et que le socle v2 ne déclare pas. Les jetons qu'elles
     consomment sont redirigés vers les jetons v2 dans css/v2/testeur.css. */
  var FEUILLES = [
    { href: '/tester/keyboard.css?v=' + VERSION_TESTEUR, marque: 'testeurCss' },
    { href: '/css/utilities.css?v=' + VERSION_TESTEUR, marque: 'testeurUtilitaires' }
  ];

  function feuille(spec) {
    var existante = document.querySelector('link[data-' + spec.marque.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ']');
    if (existante) {
      return existante.dataset.loaded === 'true'
        ? Promise.resolve()
        : attendre(existante);
    }
    var lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = spec.href;
    lien.dataset[spec.marque] = '';
    document.head.appendChild(lien);
    return attendre(lien);
  }

  function feuilleTesteur() {
    return Promise.all(FEUILLES.map(feuille));
  }

  function attendre(lien) {
    return new Promise(function (resoudre, rejeter) {
      lien.addEventListener('load', function () {
        lien.dataset.loaded = 'true';
        resoudre();
      }, { once: true });
      lien.addEventListener('error', function () {
        rejeter(new Error('feuille du testeur introuvable : ' + lien.href));
      }, { once: true });
    });
  }

  /* P14d : arrivée depuis une page caractère. Le CTA porte `?de=<slug>` et
     l'hôte porte la carte `slug:module:leçon` rendue depuis `landings.js` —
     une seule source, jamais recopiée dans ce fichier. Le testeur ouvre alors
     la leçon du caractère ; s'il reste du parcours à faire, `tester-modal.js`
     donne la priorité au parcours, prélude compris (comportement v1). */
  function caractereDOrigine() {
    var slug = new URLSearchParams(window.location.search).get('de');
    if (!slug) return;

    var carte = (hote.dataset.testeurLecons || '').trim().split(/\s+/);
    for (var i = 0; i < carte.length; i += 1) {
      var parts = carte[i].split(':');
      if (parts[0] !== slug) continue;
      hote.dataset.testeurMode = 'lessons';
      hote.dataset.testeurModule = parts[1];
      hote.dataset.testeurLecon = parts[2];
      return;
    }
  }

  /* Les paramètres du testeur se déclarent sur l'hôte, pas sur la balise
     script : en v2 le layout écrit lui-même les `<script defer>`. */
  function urlAmorce() {
    caractereDOrigine();
    var url = new URL('/js/init-tester.js', window.location.origin);
    url.searchParams.set('v', VERSION_TESTEUR);
    url.searchParams.set('inline', '1');
    var correspondances = {
      mode: 'testeurMode',
      module: 'testeurModule',
      lesson: 'testeurLecon',
      tutorial: 'testeurTutoriel',
      guidedHints: 'testeurIndices'
    };
    Object.keys(correspondances).forEach(function (cle) {
      var valeur = hote.dataset[correspondances[cle]];
      if (valeur) url.searchParams.set(cle, valeur);
    });
    if (anglais) url.searchParams.set('lang', 'en');
    return url.href;
  }

  function messageEchec() {
    vider();
    var bloc = document.createElement('div');
    bloc.className = 'message message--erreur';
    bloc.id = 'testeur-echec';
    var titre = document.createElement('p');
    titre.className = 'message__titre';
    titre.textContent = t('Le testeur n’a pas pu être chargé.',
      'The tester could not be loaded.');
    var corps = document.createElement('p');
    corps.textContent = t(
      'Vérifiez votre connexion, puis rechargez la page. Le clavier fonctionne aussi hors du testeur : la page /guide décrit les cinq changements.',
      'Check your connection and reload the page. The layout also works outside the tester: the /guide page describes the five changes.');
    bloc.appendChild(titre);
    bloc.appendChild(corps);
    hote.appendChild(bloc);
  }

  hote.classList.add('est-en-chargement');
  feuilleTesteur()
    .then(function () {
      /* L'hôte doit être vide quand init-tester y écrit le composant. */
      vider();
      return import(urlAmorce());
    })
    .then(function () {
      hote.classList.add('est-charge');
    })
    .catch(function (erreur) {
      console.error('Chargement du testeur :', erreur);
      messageEchec();
    })
    .finally(function () {
      hote.classList.remove('est-en-chargement');
    });
})();
