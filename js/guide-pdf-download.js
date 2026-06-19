// Bouton « Guide de prise en main » (section Aide-mémoire de la page guide).
// Visible uniquement sur mobile / tablette ou Windows (le guide cible l'app Microsoft Store ;
// masqué sur macOS et Linux desktop).
// Au clic : ouvre un aperçu plein écran du PDF (iframe) avec un bouton Télécharger
// (pas de téléchargement forcé d'emblée).
(function () {
  'use strict';

  var btn = document.getElementById('guide-pdf-download');
  if (!btn) return;

  if (shouldShowGuide()) {
    btn.hidden = false;
  }

  var overlay = document.getElementById('guide-fullscreen');
  if (overlay) {
    var frame = overlay.querySelector('.guide-fullscreen__frame');
    var closeBtn = overlay.querySelector('.guide-fullscreen__close');
    var pdfUrl = '/assets/Prise_en_main_AZERTY_Global.pdf';

    btn.addEventListener('click', function () {
      // Chargement paresseux du PDF : 75% sur desktop, ajuste a la largeur (FitH) sur mobile.
      if (frame && !frame.getAttribute('src')) {
        var narrow = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
        frame.setAttribute('src', pdfUrl + (narrow ? '#view=FitH' : '#zoom=75'));
      }
      overlay.hidden = false;
      document.body.classList.add('guide-fullscreen-open');
      if (closeBtn) closeBtn.focus();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeOverlay();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) closeOverlay();
    });
  }

  function closeOverlay() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('guide-fullscreen-open');
    if (btn && typeof btn.focus === 'function') btn.focus();
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
