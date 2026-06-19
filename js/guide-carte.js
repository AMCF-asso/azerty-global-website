// Carte interactive plein écran de la page guide.
// Les boutons « Carte simplifiée / complète » ouvrent un overlay affichant la carte
// en grand format AVEC les hotspots (rendus par keyboard-hotspots.js dans
// #keyboard-hotspots-container) + un switch simple/complète et un bouton Imprimer.
// Périmètre : page guide uniquement (n'utilise pas lazy-tester.js).
(function () {
  'use strict';

  var overlay = document.getElementById('carte-fullscreen');
  if (!overlay) return;

  var keyboard = overlay.querySelector('.carte-fullscreen__keyboard');
  var img = overlay.querySelector('.carte-fullscreen__img');
  var modeButtons = overlay.querySelectorAll('[data-carte-mode]');
  var closeBtn = overlay.querySelector('.carte-fullscreen__close');
  var printBtn = overlay.querySelector('.carte-fullscreen__print');
  var lastTrigger = null;
  var currentMode = 'simple';
  var isMac = detectMac();

  // Variantes macOS gérées ici (pas besoin de platform-keyboard-map.js sur l'overlay).
  var MAPS = {
    simple: isMac ? 'images/carte-simplifiee-macos.svg?v=20260524' : 'images/carte-simplifiee.svg',
    complete: isMac ? 'images/carte-complete-macos.svg?v=20260524' : 'images/carte-complete.svg?v=20260524'
  };
  var ALT = {
    simple: 'Carte simplifiée du clavier AZERTY Global',
    complete: 'Carte complète du clavier AZERTY Global'
  };

  function setMode(mode) {
    if (mode !== 'complete') mode = 'simple';
    currentMode = mode;
    if (img) {
      img.src = MAPS[mode];
      img.alt = ALT[mode];
    }
    // Pilote l'affichage des hotspots : en mode simple, le CSS masque les couches AltGr.
    if (keyboard) keyboard.classList.toggle('is-full', mode === 'complete');
    for (var i = 0; i < modeButtons.length; i++) {
      var active = modeButtons[i].getAttribute('data-carte-mode') === mode;
      modeButtons[i].classList.toggle('is-active', active);
      modeButtons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function openOverlay(mode, trigger) {
    lastTrigger = trigger || null;
    setMode(mode);
    overlay.hidden = false;
    document.body.classList.add('carte-fullscreen-open');
    if (closeBtn) closeBtn.focus();
  }

  function closeOverlay() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('carte-fullscreen-open');
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  var openers = document.querySelectorAll('[data-carte-open]');
  for (var i = 0; i < openers.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        openOverlay(btn.getAttribute('data-carte-open'), btn);
      });
    })(openers[i]);
  }

  for (var j = 0; j < modeButtons.length; j++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-carte-mode'));
      });
    })(modeButtons[j]);
  }

  // Impression : ouvre la carte courante dans un nouvel onglet et lance automatiquement
  // la boite d'impression (beaucoup d'utilisateurs ne pensent pas a Ctrl+P). On ecrit une
  // page hote minimale (sans script/style inline -> CSP-safe) contenant l'image SVG, et on
  // appelle print() depuis l'onglet parent une fois l'image chargee. Repli si pop-up bloquee.
  if (printBtn) {
    printBtn.addEventListener('click', printCurrentMap);
  }

  function printCurrentMap() {
    var absUrl = new URL(MAPS[currentMode], window.location.href).href;
    var cssUrl = new URL('css/print-carte.css', window.location.href).href;
    var w = window.open('', '_blank');
    if (!w) {
      window.open(MAPS[currentMode], '_blank', 'noopener'); // pop-up bloquee : repli manuel
      return;
    }
    w.document.write('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
      + '<title>Carte AZERTY Global - impression</title></head><body></body></html>');
    w.document.close();
    // Feuille de style externe (CSP-safe) : @page paysage + image pleine largeur.
    var link = w.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    w.document.head.appendChild(link);
    var printed = false;
    var sheet = w.document.createElement('img');
    sheet.alt = ALT[currentMode];
    sheet.style.width = '100%';
    sheet.style.height = 'auto';
    sheet.style.display = 'block';
    sheet.addEventListener('load', function () {
      if (printed) return;
      printed = true;
      w.focus();
      w.print();
    });
    sheet.src = absUrl;
    w.document.body.appendChild(sheet);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeOverlay();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !overlay.hidden) closeOverlay();
  });

  function detectMac() {
    var uaPlatform = navigator.userAgentData && navigator.userAgentData.platform
      ? navigator.userAgentData.platform
      : '';
    var legacyPlatform = navigator.platform || '';
    var platform = uaPlatform || legacyPlatform;
    return /mac/i.test(platform)
      || (legacyPlatform === 'MacIntel' && navigator.maxTouchPoints > 1)
      || /iPad|iPhone|iPod/.test(navigator.userAgent);
  }
})();
