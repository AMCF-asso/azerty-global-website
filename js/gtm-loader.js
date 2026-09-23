/**
 * Google Tag Manager loader (CSP-compliant).
 *
 * The official GTM snippet injects an inline <script>, which our CSP
 * (`script-src 'self'`) blocks. This external loader reproduces the snippet
 * behavior without inline code.
 *
 * Usage: add a meta tag in <head>, then load this script:
 *   <meta name="gtm-id" content="GTM-XXXXXXX">
 *   <script defer src="js/gtm-loader.js"></script>
 *
 * Consent Mode v2 is pre-initialised in default "denied" state and runs in
 * "Advanced" mode: Google tags still fire cookieless pings (gcs=G100) so
 * conversions can be modeled without any cookie or personal identifier.
 * This matches the "Option B" strategy (no CMP, no banner, no remarketing).
 *
 * If the site later adds a CMP, it can call gtag('consent', 'update', {...})
 * to elevate signals to granted state.
 *
 * If no GTM ID is set, the script no-ops (safe to deploy before accounts are
 * created).
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  gtag('set', 'ads_data_redaction', true);

  // Opposition à la mesure d'audience, posée depuis /confidentialite
  // (js/v2/opposition-mesure.js) : GA4 n'est alors jamais chargé.
  try {
    if (window.localStorage.getItem('ag-mesure-refusee') === '1') return;
  } catch (e) { /* stockage indisponible : pas de refus enregistré */ }

  // Hors production (localhost, 127.0.0.1, aperçus) : aucun hit (audit v2).
  if (window.location.hostname !== 'azerty.global') return;

  var meta = document.querySelector('meta[name="gtm-id"]');
  var gtmId = meta ? meta.getAttribute('content') : '';
  if (!gtmId || !/^GTM-[A-Z0-9]+$/i.test(gtmId)) return;

  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(gtmId);
  document.head.appendChild(script);
})();
