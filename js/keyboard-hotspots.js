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
    var html = '';
    for (var i = 0; i < hotspots.length; i++) {
      var h = hotspots[i];
      if (h.enabled === false) continue;

      var style = 'top:' + h.top + '%;left:' + h.left + '%;'
        + 'width:' + (h.width || DEFAULT_W) + '%;'
        + 'height:' + (h.height || DEFAULT_H) + '%;';

      var tipCls = 'keyboard-tooltip';
      if (h.tooltipLeft) tipCls += ' keyboard-tooltip--left';

      var tipStyle = h.minWidth ? ' style="min-width:' + h.minWidth + 'px"' : '';

      var title = '<span class="keyboard-tooltip__char">' + h.char + '</span> ';
      if (h.deadName) {
        title += '<span class="keyboard-tooltip__dead-name">' + h.deadName + '</span>';
      } else if (h.desc) {
        title += h.desc;
      }

      html += '<div class="keyboard-hotspot keyboard-hotspot--' + h.id + '"'
        + ' data-row="' + h.row + '" data-level="' + h.level + '"'
        + ' aria-label="' + h.label + '"'
        + ' style="' + style + '">'
        + '<div class="' + tipCls + '"' + tipStyle + '>'
        + '<span class="keyboard-tooltip__title">' + title + '</span>'
        + '<div class="keyboard-tooltip__shortcut" style="display:block;margin-top:var(--space-2);">'
        + buildShortcut(h)
        + '</div></div></div>';
    }
    el.innerHTML = html;
  }

  function buildShortcut(h) {
    if (h.capsChar) {
      return '<span class="keyboard-tooltip__char">' + h.capsChar + '</span> \u2192 '
        + kbd('Verr. Maj.') + ' + ' + kbd(h.capsKey);
    }
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
