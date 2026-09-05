/**
 * Load Cloudflare and Umami analytics outside manual local previews only.
 * Public configuration is supplied by this script's data attributes.
 */
(function () {
  'use strict';

  var hostname = window.location.hostname.toLowerCase().replace(/\.$/, '');
  var isLocalPreview = window.location.protocol === 'file:' ||
    hostname === 'localhost' || hostname.endsWith('.localhost') ||
    /^127(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(hostname) ||
    hostname === '::1' || hostname === '[::1]';
  if (isLocalPreview) return;

  var loader = document.currentScript;
  if (!loader) return;

  var cloudflareConfig = loader.getAttribute('data-cf-beacon');
  if (cloudflareConfig) {
    var cloudflare = document.createElement('script');
    cloudflare.defer = true;
    cloudflare.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cloudflare.setAttribute('data-cf-beacon', cloudflareConfig);
    document.head.appendChild(cloudflare);
  }

  var umamiWebsiteId = loader.getAttribute('data-website-id');
  if (umamiWebsiteId) {
    var umami = document.createElement('script');
    umami.defer = true;
    umami.src = 'https://cloud.umami.is/script.js';
    umami.setAttribute('data-website-id', umamiWebsiteId);
    document.head.appendChild(umami);
  }
})();
