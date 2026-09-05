(function () {
  'use strict';

  // Reserve the mobile relay before first paint instead of shifting the OS tabs
  // when the deferred interaction script loads.
  document.documentElement.dataset.downloadRelayMobile = String(
    /Android|iPhone|iPod|iPad/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  document.documentElement.dataset.downloadRelayShare = String(typeof navigator.share === 'function');

  var stateKey = 'agEntryMode';
  var validModes = ['discover', 'continue', 'task'];
  var mode = 'discover';

  try {
    var params = new URLSearchParams(window.location.search);
    var existingState = window.history.state;
    var preservedMode = existingState && existingState[stateKey];

    if (params.get('utm_source') === 'mobile-relay') {
      mode = 'task';
    } else if (validModes.indexOf(preservedMode) !== -1) {
      mode = preservedMode;
    } else if (document.referrer) {
      var referrer = new URL(document.referrer);
      mode = referrer.origin === window.location.origin ? 'continue' : 'discover';
    }
  } catch (e) { /* discover is the safe default */ }

  document.documentElement.dataset.entryMode = mode;

  try {
    var nextState = Object.assign({}, window.history.state || {});
    nextState[stateKey] = mode;
    window.history.replaceState(nextState, document.title);
  } catch (e) {
    /* The DOM mode remains usable when History API access is unavailable. */
  }
})();
