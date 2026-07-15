/**
 * Relais mobile de la page /download : « Envoyer le lien sur mon ordinateur ».
 *
 * 45 % du trafic Google arrive sur mobile alors qu'AZERTY Global s'installe
 * depuis un ordinateur (Statistiques/2026-07-10/Analyse statistiques.md § 5).
 * Le bloc [data-download-relay] reste hidden par défaut et n'est affiché que
 * sur les appareils où l'installation est impossible (Android / iOS).
 *
 * Les liens relayés portent utm_source=mobile-relay + utm_medium (copy, share) :
 * à l'arrivée sur PC, store-cid.js transforme le cid Store en
 * website_download_relay_desktop, ce qui rend la boucle mobile → PC → Store
 * visible dans Partner Center.
 */
(function () {
  'use strict';

  var block = document.querySelector('[data-download-relay]');
  if (!block) return;

  var isMobile = /Android|iPhone|iPod/.test(navigator.userAgent) ||
    /iPad/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isMobile) return;

  block.hidden = false;

  function relayUrl(medium) {
    return 'https://azerty.global/download?utm_source=mobile-relay&utm_medium=' + medium;
  }

  function track(medium) {
    if (window.AzertyTrack && typeof window.AzertyTrack.conversion === 'function') {
      window.AzertyTrack.conversion('mobile_relay', { medium: medium });
    }
  }

  var copyBtn = block.querySelector('[data-relay-copy]');
  if (copyBtn) {
    var copyLabel = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var url = relayUrl('copy');
      var done = function () {
        copyBtn.textContent = 'Lien copié !';
        window.setTimeout(function () { copyBtn.textContent = copyLabel; }, 2500);
        track('copy');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () {
          window.prompt('Copiez ce lien :', url);
        });
      } else {
        window.prompt('Copiez ce lien :', url);
      }
    });
  }

  var shareBtn = block.querySelector('[data-relay-share]');
  if (shareBtn) {
    if (navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', function () {
        navigator.share({
          title: 'Télécharger AZERTY Global',
          text: 'À ouvrir depuis un PC Windows pour installer AZERTY Global :',
          url: relayUrl('share')
        }).then(function () { track('share'); }, function () { /* partage annulé */ });
      });
    } else {
      shareBtn.hidden = true;
    }
  }

})();
