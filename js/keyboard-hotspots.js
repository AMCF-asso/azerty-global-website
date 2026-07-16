// Keyboard hotspots — data-driven renderer
// Shared across index.html, entreprises.html, ecoles.html, dev.html, afrique.html
// Reads hotspot definitions from data/keyboard-hotspots.json and renders them
// into #keyboard-hotspots-container.

(function () {
  'use strict';

  var container = document.getElementById('keyboard-hotspots-container');
  if (!container) return;

  var DEFAULT_W = 2.5;
  var DEFAULT_H = 7.5;
  var isMacPlatform = detectMacPlatform();

  // Langue pilotée par la page (base-en.njk pose <html lang="en">), pattern t(fr, en).
  var isEnglish = /^en/i.test(document.documentElement.lang || 'fr');
  function t(fr, en) { return isEnglish ? en : fr; }
  function loc(h, field) {
    var en = h[field + 'En'];
    return isEnglish && en ? en : h[field];
  }

  fetch('/data/keyboard-hotspots.json?v=2')
    .then(function (r) { return r.json(); })
    .then(function (data) { render(container, data.hotspots); })
    .catch(function (err) { console.error('Hotspots load failed:', err); });

  function render(el, hotspots) {
    var rendered = [];
    var html = '';
    for (var i = 0; i < hotspots.length; i++) {
      var h = hotspots[i];
      if (h.enabled === false) continue;
      rendered.push(h);

      var tipCls = 'keyboard-tooltip';
      if (h.tooltipLeft) tipCls += ' keyboard-tooltip--left';

      var title = '';
      if (h.char) {
        title += '<span class="keyboard-tooltip__char">' + h.char + '</span> ';
      }
      if (h.featureName) {
        title += '<span class="keyboard-tooltip__feature-name">' + loc(h, 'featureName') + '</span>';
        if (h.desc) {
          title += '<span class="keyboard-tooltip__feature-desc">' + loc(h, 'desc') + '</span>';
        }
      } else if (h.deadName) {
        title += '<span class="keyboard-tooltip__dead-name">' + loc(h, 'deadName') + '</span>';
      } else if (h.desc) {
        title += loc(h, 'desc');
      }

      var shortcutHtml = buildShortcut(h);
      var tooltipId = 'keyboard-tooltip-' + safeId(h.id);
      html += '<button type="button" class="keyboard-hotspot keyboard-hotspot--' + attr(h.id) + '"'
        + ' data-row="' + attr(h.row) + '" data-level="' + attr(h.level) + '"'
        + ' aria-label="' + attr(loc(h, 'label')) + '"'
        + ' aria-describedby="' + tooltipId + '"'
        + ' aria-expanded="false">'
        + '<span class="' + tipCls + '" id="' + tooltipId + '" role="tooltip">'
        + '<span class="keyboard-tooltip__title">' + title + '</span>'
        + (shortcutHtml ? '<span class="keyboard-tooltip__shortcut">' + shortcutHtml + '</span>' : '')
        + '</span></button>';
    }
    el.innerHTML = html;

    // Apply dynamic positioning via .style.X (CSP-safe: no inline style attribute)
    var nodes = el.querySelectorAll('.keyboard-hotspot');
    for (var k = 0; k < nodes.length; k++) {
      var node = nodes[k];
      var hot = rendered[k];
      node.style.top = hot.top + '%';
      node.style.left = hot.left + '%';
      node.style.width = (hot.width || DEFAULT_W) + '%';
      node.style.height = (hot.height || DEFAULT_H) + '%';
      if (hot.minWidth) {
        var tip = node.querySelector('.keyboard-tooltip');
        if (tip) tip.style.minWidth = hot.minWidth + 'px';
      }
    }

    setupHotspotInteractions(el);
  }

  function setupHotspotInteractions(root) {
    var nodes = root.querySelectorAll('.keyboard-hotspot');
    var keyboard = root.closest ? root.closest('.hero__keyboard') : null;

    if (keyboard) {
      keyboard.setAttribute('role', 'group');
      keyboard.setAttribute('aria-label', t('Carte du clavier AZERTY Global', 'AZERTY Global keyboard map'));
      keyboard.removeAttribute('tabindex');
    }

    function updateKeyboardState() {
      if (!keyboard) return;
      keyboard.classList.toggle('has-active-hotspot', !!root.querySelector('.keyboard-hotspot.is-active'));
    }

    function setOpen(node, open) {
      node.classList.toggle('is-active', open);
      node.setAttribute('aria-expanded', open ? 'true' : 'false');
      updateKeyboardState();
    }

    function closeAll(except) {
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i] !== except) {
          setOpen(nodes[i], false);
        }
      }
    }

    for (var i = 0; i < nodes.length; i++) {
      (function (node) {
        function rememberPointerState(event) {
          node.setAttribute('data-open-before-pointer', node.classList.contains('is-active') ? 'true' : 'false');
          node.setAttribute('data-pointer-type', event.pointerType || (event.type === 'touchstart' ? 'touch' : 'mouse'));
        }

        node.addEventListener('pointerdown', rememberPointerState);
        node.addEventListener('mousedown', rememberPointerState);
        node.addEventListener('touchstart', rememberPointerState, { passive: true });

        node.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          var hadPointer = node.hasAttribute('data-open-before-pointer');
          var wasOpenBeforePointer = node.getAttribute('data-open-before-pointer') === 'true';
          var pointerType = node.getAttribute('data-pointer-type') || 'keyboard';
          var shouldOpen = hadPointer && pointerType === 'mouse'
            ? true
            : hadPointer
            ? !wasOpenBeforePointer
            : !node.classList.contains('is-active');
          node.removeAttribute('data-open-before-pointer');
          node.removeAttribute('data-pointer-type');
          closeAll(node);
          setOpen(node, shouldOpen);
          if (shouldOpen) node.focus({ preventScroll: true });
        });

        node.addEventListener('mouseenter', function () {
          closeAll(node);
          setOpen(node, true);
        });

        node.addEventListener('mouseleave', function () {
          if (document.activeElement !== node) setOpen(node, false);
        });

        node.addEventListener('focus', function () {
          closeAll(node);
          setOpen(node, true);
        });

        node.addEventListener('blur', function () {
          setOpen(node, false);
        });

        node.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(node, false);
            node.blur();
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            node.click();
          }
        });
      })(nodes[i]);
    }

    document.addEventListener('click', function (event) {
      if (!root.contains(event.target)) closeAll();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
  }

  function buildShortcut(h) {
    if (h.capsChar) {
      return '<span class="keyboard-tooltip__char">' + h.capsChar + '</span> \u2192 '
        + kbd(t('Verr. Maj.', 'Caps Lock')) + ' + ' + kbd(h.capsKey);
    }
    if (!h.shortcut) return '';
    if (h.shortcut === 'direct') return t('Accès direct', 'Direct access');
    var parts = [];
    for (var j = 0; j < h.shortcut.length; j++) {
      parts.push(kbd(h.shortcut[j]));
    }
    var result = parts.join(' + ');
    if (h.shortcutSuffix) result += ' ' + loc(h, 'shortcutSuffix');
    return result;
  }

  function kbd(label) {
    label = translateKeyLabel(label);
    label = platformKeyLabel(label);
    return '<kbd class="keyboard-tooltip__key">' + label + '</kbd>';
  }

  function translateKeyLabel(label) {
    if (!isEnglish) return label;
    if (label === 'Maj') return 'Shift';
    if (label === 'Espace') return 'Space';
    return label; // « Alt Gr » reste tel quel (platformKeyLabel le mappe déjà en Option sur Mac)
  }

  function attr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function safeId(value) {
    return String(value || 'hotspot').replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function platformKeyLabel(label) {
    if (!isMacPlatform) return label;
    if (label === 'Alt Gr' || label === 'AltGr') return 'Option';
    return label;
  }

  function detectMacPlatform() {
    var uaPlatform = navigator.userAgentData && navigator.userAgentData.platform
      ? navigator.userAgentData.platform
      : '';
    var legacyPlatform = navigator.platform || '';
    var platform = uaPlatform || legacyPlatform;
    var looksLikeMac = /mac/i.test(platform);
    var looksLikeIpadDesktop = legacyPlatform === 'MacIntel' && navigator.maxTouchPoints > 1;
    var looksLikeIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    return looksLikeMac || looksLikeIpadDesktop || looksLikeIos;
  }
})();
