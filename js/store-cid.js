/**
 * Attribution Microsoft Store — identifiants de campagne (cid).
 *
 * Chaque lien sortant vers apps.microsoft.com porte un cid statique dans son
 * href (fallback sans JS, ex. cid=website_download). Ce script affine le cid
 * au chargement avec le contexte appareil :
 *   website_download            → website_download_desktop | website_download_mobile
 *
 * Si la page a été ouverte via le relais mobile (« Envoyer le lien sur mon
 * ordinateur », utm_source=mobile-relay), le cid intègre le segment _relay :
 *   website_download_relay_desktop
 *
 * Les cid sont ensuite visibles dans Partner Center (Acquisitions → Campagnes).
 * Taxonomie complète : Statistiques/2026-07-10/Analyse statistiques.md § 7.
 */
(function () {
  'use strict';

  var isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var suffix = isMobile ? '_mobile' : '_desktop';
  var relay = /[?&]utm_source=mobile-relay/.test(window.location.search) ? '_relay' : '';

  function apply(root) {
    var links = (root || document).querySelectorAll('a[href*="apps.microsoft.com"]');
    Array.prototype.forEach.call(links, function (link) {
      try {
        var url = new URL(link.href);
        var base = link.dataset.storeCid || url.searchParams.get('cid');
        if (!base || /_(mobile|desktop)$/.test(base)) return;
        url.searchParams.set('cid', base + relay + suffix);
        link.href = url.toString();
      } catch (e) {
        /* URL invalide : conserver le href statique avec son cid de base */
      }
    });
  }

  apply(document);

  window.AzertyStoreCid = { apply: apply, suffix: suffix };
})();
