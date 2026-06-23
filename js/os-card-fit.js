(function () {
  'use strict';

  const SELECTOR = '[data-os-card-fit]';
  const RESIZE_DEBOUNCE_MS = 80;

  let resizeTimer = 0;

  function toPx(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function getGapWidth(grid, cardCount) {
    const styles = window.getComputedStyle(grid);
    return toPx(styles.columnGap || styles.gap) * Math.max(0, cardCount - 1);
  }

  function getBaseSizes(grid) {
    const heading = grid.querySelector('.os-card h2');
    const shortcut = grid.querySelector('.os-card .shortcut');
    const note = grid.querySelector('.os-card .note');
    const kbd = grid.querySelector('.os-card .shortcut kbd');

    return {
      heading: heading ? toPx(window.getComputedStyle(heading).fontSize) : 22,
      shortcut: shortcut ? toPx(window.getComputedStyle(shortcut).fontSize) : 16,
      note: note ? toPx(window.getComputedStyle(note).fontSize) : 14,
      kbdPaddingInline: kbd ? toPx(window.getComputedStyle(kbd).paddingLeft) : 8
    };
  }

  function getMinCardWidth(grid) {
    const styles = window.getComputedStyle(grid);
    const configured = toPx(styles.getPropertyValue('--os-card-min-width'));
    return configured > 0 ? configured : 230;
  }

  function resetGrid(grid) {
    grid.style.removeProperty('--os-card-columns');
    grid.style.removeProperty('--os-heading-font-size');
    grid.style.removeProperty('--os-shortcut-font-size');
    grid.style.removeProperty('--os-note-font-size');
    grid.style.removeProperty('--os-kbd-padding-inline');
  }

  function measureCardNeed(card) {
    const cardStyles = window.getComputedStyle(card);
    const chromeWidth =
      toPx(cardStyles.paddingLeft) +
      toPx(cardStyles.paddingRight) +
      toPx(cardStyles.borderLeftWidth) +
      toPx(cardStyles.borderRightWidth);

    const sandbox = document.createElement('div');
    sandbox.setAttribute('aria-hidden', 'true');
    sandbox.style.position = 'absolute';
    sandbox.style.visibility = 'hidden';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.left = '-10000px';
    sandbox.style.top = '0';
    sandbox.style.width = 'max-content';
    sandbox.style.maxWidth = 'none';

    const clone = card.cloneNode(true);
    clone.style.width = 'max-content';
    clone.style.maxWidth = 'none';
    clone.style.minWidth = '0';

    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    const shortcuts = Array.from(clone.querySelectorAll('.shortcut'));
    const shortcutWidths = shortcuts.map((shortcut) => {
      shortcut.style.display = 'inline-block';
      shortcut.style.width = 'max-content';
      shortcut.style.maxWidth = 'none';
      return shortcut.getBoundingClientRect().width;
    });

    const shortcutWidth = Math.max(...shortcutWidths, 0);

    sandbox.remove();

    return {
      chromeWidth: Math.ceil(chromeWidth + 2),
      shortcutWidth: Math.ceil(shortcutWidth)
    };
  }

  function getShortcutFontScale(cardNeeds, baseWidths, widthScale) {
    return cardNeeds.reduce((scale, card, index) => {
      const finalWidth = baseWidths[index] * widthScale;
      const availableShortcutWidth = finalWidth - card.chromeWidth;

      if (availableShortcutWidth <= 0 || card.shortcutWidth <= 0) {
        return scale;
      }

      return Math.min(scale, availableShortcutWidth / card.shortcutWidth);
    }, 1);
  }

  function fitGrid(grid) {
    const cards = Array.from(grid.querySelectorAll(':scope > .os-card'));
    if (cards.length === 0 || grid.offsetParent === null) {
      return;
    }

    resetGrid(grid);

    const baseSizes = getBaseSizes(grid);
    const availableWidth = Math.max(0, grid.getBoundingClientRect().width - getGapWidth(grid, cards.length));
    const cardNeeds = cards.map(measureCardNeed);
    const minCardWidth = getMinCardWidth(grid);
    const baseWidths = cardNeeds.map((card) => Math.max(minCardWidth, card.chromeWidth + card.shortcutWidth));
    const totalBaseWidth = baseWidths.reduce((sum, width) => sum + width, 0);

    if (availableWidth <= 0 || totalBaseWidth <= 0) {
      return;
    }

    const widthScale = availableWidth / totalBaseWidth;
    const fontScale = Math.min(1, getShortcutFontScale(cardNeeds, baseWidths, widthScale));
    const columns = baseWidths.map((width) => `${Math.max(0, width * widthScale).toFixed(2)}px`);

    grid.style.setProperty('--os-card-columns', columns.join(' '));
    grid.style.setProperty('--os-heading-font-size', `${(baseSizes.heading * fontScale).toFixed(2)}px`);
    grid.style.setProperty('--os-shortcut-font-size', `${(baseSizes.shortcut * fontScale).toFixed(2)}px`);
    grid.style.setProperty('--os-note-font-size', `${(baseSizes.note * fontScale).toFixed(2)}px`);
    grid.style.setProperty('--os-kbd-padding-inline', `${Math.max(5, baseSizes.kbdPaddingInline * fontScale).toFixed(2)}px`);
  }

  function fitAllGrids() {
    document.querySelectorAll(SELECTOR).forEach(fitGrid);
  }

  function scheduleFit() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitAllGrids, RESIZE_DEBOUNCE_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitAllGrids, { once: true });
  } else {
    fitAllGrids();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAllGrids).catch(function () {});
  }

  window.addEventListener('resize', scheduleFit);
})();
