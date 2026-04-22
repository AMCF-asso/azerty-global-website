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

  fetch('data/keyboard-hotspots.json')
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
        title += '<span class="keyboard-tooltip__feature-name">' + h.featureName + '</span>';
        if (h.desc) {
          title += '<span class="keyboard-tooltip__feature-desc">' + h.desc + '</span>';
        }
      } else if (h.deadName) {
        title += '<span class="keyboard-tooltip__dead-name">' + h.deadName + '</span>';
      } else if (h.desc) {
        title += h.desc;
      }

      var shortcutHtml = buildShortcut(h);
      html += '<div class="keyboard-hotspot keyboard-hotspot--' + h.id + '"'
        + ' data-row="' + h.row + '" data-level="' + h.level + '"'
        + ' aria-label="' + h.label + '">'
        + '<div class="' + tipCls + '">'
        + '<span class="keyboard-tooltip__title">' + title + '</span>'
        + (shortcutHtml ? '<div class="keyboard-tooltip__shortcut">' + shortcutHtml + '</div>' : '')
        + '</div></div>';
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
  }

  function buildShortcut(h) {
    if (h.capsChar) {
      return '<span class="keyboard-tooltip__char">' + h.capsChar + '</span> \u2192 '
        + kbd('Verr. Maj.') + ' + ' + kbd(h.capsKey);
    }
    if (!h.shortcut) return '';
    if (h.shortcut === 'direct') return 'Accès direct';
    var parts = [];
    for (var j = 0; j < h.shortcut.length; j++) {
      parts.push(kbd(h.shortcut[j]));
    }
    var result = parts.join(' + ');
    if (h.shortcutSuffix) result += ' ' + h.shortcutSuffix;
    return result;
  }

  function kbd(label) {
    return '<kbd class="keyboard-tooltip__key">' + label + '</kbd>';
  }
})();
