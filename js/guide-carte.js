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

  // Impression : ouvre le SVG de la carte courante dans un nouvel onglet (la CSP frame-src
  // interdit l'iframe ; l'impression in-overlay donnait une page blanche). L'utilisateur
  // imprime la carte depuis cet onglet.
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      window.open(MAPS[currentMode], '_blank', 'noopener');
    });
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
