// Affiche le bouton « Guide de prise en main (PDF) » uniquement sur mobile / tablette ou Windows.
// Le guide imprimable cible l'application Microsoft Store (Windows) ; il est masqué sur macOS et Linux desktop.
(function () {
  'use strict';

  var row = document.getElementById('guide-pdf-row');
  if (!row) return;

  if (shouldShowGuide()) {
    row.hidden = false;
  }

  function shouldShowGuide() {
    var ua = navigator.userAgent || '';
    var uaData = navigator.userAgentData;
    var uaPlatform = (uaData && uaData.platform) ? uaData.platform : (navigator.platform || '');
    var platform = uaPlatform.toLowerCase();

    // Mobile / tablette explicite (UA-CH mobile flag ou User-Agent classique)
    var uaMobile = (uaData && typeof uaData.mobile === 'boolean') ? uaData.mobile : false;
    var isPhoneOrTablet = uaMobile || /android|iphone|ipad|ipod|mobile|tablet/i.test(ua);

    // iPad en mode « bureau » : se présente comme MacIntel mais avec écran tactile
    var isTabletDesktopMode = /mac/.test(platform) && navigator.maxTouchPoints > 1;

    if (isPhoneOrTablet || isTabletDesktopMode) return true;

    // Sinon (desktop) : on n'affiche que sous Windows, pas macOS ni Linux
    return /win/.test(platform) || /windows/i.test(ua);
  }
})();
