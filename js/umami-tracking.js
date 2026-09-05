/**
 * Explicit, bounded Umami tracking. No timers, polling hooks or user identity.
 * Activation remains off until the shared billing protection is operational.
 * This document-level limiter is NOT an account-wide financial cap.
 */
(function () {
  'use strict';
  var config = document.currentScript;
  if (!config || config.getAttribute('data-umami-enabled') !== 'true') return;
  var host = window.location.hostname.toLowerCase().replace(/\.$/, '');
  if (window.location.protocol !== 'https:') return;
  var site = config.getAttribute('data-umami-site');
  var hosts = site === 'azerty' ? ['azerty.global', 'www.azerty.global'] :
    site === 'vingtmillions' ? ['vingtmillions.fr', 'www.vingtmillions.fr'] : [];
  if (hosts.indexOf(host) === -1 || window.UmamiControl) return;
  var website = config.getAttribute('data-website-id');
  var expected = site === 'azerty' ? '54fa0bee-e290-4779-b00a-2683e625bf36' : '55e6f219-b38a-4311-b103-99226e2144e8';
  if (website !== expected) return;

  var pathname = window.location.pathname;
  if (/^\/(?:admin|auth|api|__)[/\w-]*/.test(pathname)) return;
  // Public profile pages contain Twitch logins; store only the page category.
  var safePath = pathname.replace(/^\/(p|s)\/[^/]+/, '/$1/:profile');
  var pageUrl = safePath;
  // Preserve the known campaign attribution, never arbitrary query values.
  var query = new URLSearchParams(window.location.search);
  if (query.get('utm_source') === 'vingtmillions' && query.get('utm_medium') === 'referral' && query.get('utm_campaign') === 'zevent2026') {
    pageUrl += '?utm_source=vingtmillions&utm_medium=referral&utm_campaign=zevent2026';
  }
  var referrer = '';
  try { referrer = new URL(document.referrer).origin; } catch (_) { /* absent referrer */ }
  var title = site === 'azerty' ? 'AZERTY Global' : 'VingtMillions';
  var queue = [], ready = false, paused = false, sent = Object.create(null), attempts = 0;
  var allowed = /^(?:download_(?:windows_(?:microsoft_store|cloudflare_r2_msix_signed|sourceforge)|macos_sourceforge|linux_sourceforge|other)|azerty_click|share_click_(?:moment|capture|prono|x|streamer)|share_image_download)$/;

  window.UmamiControl = {
    pause: function () { paused = true; queue.length = 0; },
    // Monitoring only. This count is per document, not the Umami billing count.
    status: function () { return { paused: paused, ready: ready, attempts: attempts, pending: queue.length }; }
  };
  window.umamiBeforeSend = function (type, payload) {
    if (paused || type !== 'event' || !payload || payload.website !== website) return false;
    if (payload.name && !allowed.test(payload.name)) return false;
    // Build an allowlisted payload: no event/session properties or distinct ID.
    var clean = { website: website, hostname: host, url: pageUrl, title: title,
      referrer: referrer, language: navigator.language, screen: window.screen.width + 'x' + window.screen.height };
    if (payload.name) clean.name = payload.name;
    return clean;
  };

  function send(name) {
    if (paused || !ready || attempts >= 10) return;
    attempts++;
    try {
      var result = name ? window.umami.track(name) : window.umami.track();
      if (result && typeof result.catch === 'function') result.catch(function () {});
    } catch (_) { /* Analytics must never prevent navigation or sharing. */ }
  }
  function track(name) {
    if (paused || !allowed.test(name) || sent[name]) return;
    sent[name] = true;
    if (ready) send(name);
    else if (queue.length < 9) queue.push(name);
  }
  function eventName(target) {
    if (!target || typeof target.closest !== 'function') return '';
    if (site === 'azerty') {
      var download = target.closest('[data-track-conversion="download_final"]');
      if (download) {
        var name = 'download_' + download.dataset.trackDetailOs + '_' + download.dataset.trackDetailChannel;
        return allowed.test(name) ? name : 'download_other';
      }
      // Secondary text links lack the CTA attributes; cover the same destinations.
      var link = target.closest('a');
      try {
        var destination = new URL(link.getAttribute('href'), window.location.href);
        if (destination.protocol !== 'https:') return '';
        if (destination.hostname === 'apps.microsoft.com' && /^\/detail\/9n4bts43sssz\/?$/i.test(destination.pathname)) return 'download_windows_microsoft_store';
        if (destination.hostname === 'download.azerty.global' && /^\/AZERTY_Global_(?:Entreprise\.zip|[\d.]+\.msixbundle)$/.test(destination.pathname)) return 'download_windows_cloudflare_r2_msix_signed';
        if (destination.hostname === 'sourceforge.net') {
          var match = destination.pathname.match(/^\/projects\/azertyglobal\/files\/AZERTY_Global_(Windows|macOS|Linux)\.zip\/download$/);
          if (match) return 'download_' + match[1].toLowerCase() + '_sourceforge';
        }
      } catch (_) { /* no download destination */ }
      return '';
    }
    var element = target.closest('a, button');
    if (!element) return '';
    if (element.dataset.umamiAction === 'share-moment') return 'share_click_moment';
    var ids = { 'screen-capture': 'share_click_capture', 'prono-native': 'share_click_prono',
      'share-native': 'share_click_prono', 'prono-x': 'share_click_x', 'share-x': 'share_click_x',
      'streamer-recap-share': 'share_click_streamer', 'prono-download': 'share_image_download',
      'streamer-recap-download': 'share_image_download' };
    if (ids[element.id]) return ids[element.id];
    try {
      var url = new URL(element.getAttribute('href'), window.location.href);
      if (url.protocol === 'https:' && ['azerty.global', 'www.azerty.global'].indexOf(url.hostname) !== -1) return 'azerty_click';
      if (url.protocol === 'https:' && ['x.com', 'twitter.com'].indexOf(url.hostname) !== -1 && url.pathname === '/intent/tweet') return 'share_click_x';
    } catch (_) { /* button or invalid link */ }
    return '';
  }
  function onClick(event) {
    if (event.button !== undefined && event.button !== 0 && event.button !== 1) return;
    var name = eventName(event.target);
    if (name) track(name);
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);
  var script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cloud.umami.is/script.js';
  script.setAttribute('data-website-id', website);
  script.setAttribute('data-auto-track', 'false');
  script.setAttribute('data-before-send', 'umamiBeforeSend');
  script.onload = function () {
    if (paused || !window.umami || typeof window.umami.track !== 'function') return;
    ready = true;
    send(); // Exactly one initial page view; hash changes and polling do nothing.
    queue.splice(0).forEach(send);
  };
  script.onerror = window.UmamiControl.pause;
  document.head.appendChild(script);
})();
