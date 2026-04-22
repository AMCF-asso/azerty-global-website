/**
 * Conversion tracking wrapper.
 *
 * Exposes window.AzertyTrack.conversion(eventName, details) to record
 * conversion events from any landing page / CTA.
 *
 * Transport priority:
 *   1. window.dataLayer.push({...})  — picked up by GTM once installed
 *   2. window.gtag('event', ...)     — picked up by GA4 once installed
 *   3. console.debug                 — development fallback
 *
 * Until GA4/GTM is wired (see .internal/google-ads-prerequis.md), events
 * accumulate in dataLayer and are emitted to gtag if present. Nothing breaks
 * when neither is loaded.
 *
 * Declarative usage (recommended for HTML authors):
 *   <a href="/download" data-track-conversion="download_click"
 *      data-track-detail-source="e-aigu-majuscule">…</a>
 *   A global delegated click listener fires conversion() automatically.
 *
 * Programmatic usage (for JS that already handles the interaction):
 *   window.AzertyTrack.conversion('copy_character', { char: 'É' });
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  function currentPageContext() {
    return {
      page_path: window.location.pathname,
      page_title: document.title
    };
  }

  function conversion(eventName, details) {
    if (!eventName) return;

    var payload = Object.assign(
      { event: 'conversion', conversion_name: eventName },
      currentPageContext(),
      details || {}
    );

    try {
      window.dataLayer.push(payload);
    } catch (e) { /* dataLayer always defined above, no-op */ }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, Object.assign({}, currentPageContext(), details || {}));
    }

    if (window.AZERTY_TRACK_DEBUG) {
      console.debug('[AzertyTrack]', eventName, payload);
    }
  }

  window.AzertyTrack = window.AzertyTrack || {};
  window.AzertyTrack.conversion = conversion;

  function collectDetails(el) {
    var details = {};
    var prefix = 'trackDetail';
    Object.keys(el.dataset).forEach(function (key) {
      if (key.indexOf(prefix) === 0 && key.length > prefix.length) {
        var name = key.charAt(prefix.length).toLowerCase() + key.slice(prefix.length + 1);
        details[name] = el.dataset[key];
      }
    });
    return details;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track-conversion]');
    if (!el) return;
    conversion(el.dataset.trackConversion, collectDetails(el));
  }, true);
})();
