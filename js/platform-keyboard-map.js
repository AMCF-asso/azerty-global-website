// Platform-specific keyboard map assets for the hero preview.
(function () {
  'use strict';

  if (!detectMacPlatform()) return;

  var images = document.querySelectorAll('.hero__keyboard-img[data-macos-src]');
  for (var i = 0; i < images.length; i++) {
    images[i].src = images[i].getAttribute('data-macos-src');
  }

  function detectMacPlatform() {
    var uaPlatform = navigator.userAgentData && navigator.userAgentData.platform
      ? navigator.userAgentData.platform
      : '';
    var legacyPlatform = navigator.platform || '';
    var platform = uaPlatform || legacyPlatform;
    var looksLikeMac = /mac/i.test(platform);
    var looksLikeIpadDesktop = legacyPlatform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return looksLikeMac && !looksLikeIpadDesktop;
  }
})();
