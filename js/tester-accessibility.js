/**
 * AZERTY Global Tester — Accessibility helpers
 * Focus trap, ARIA attributes, screen reader announcements
 */

// ── Screen reader helpers ──

export function ensureScreenReaderElement(modal, modalContent, id, tagName, text, attributes = {}) {
  const insertionTarget = modalContent || modal;
  let el = modal.querySelector(`#${id}`);
  if (!el) {
    el = document.createElement(tagName);
    el.id = id;
    el.className = 'sr-only';
    el.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => {
      el.setAttribute(name, value);
    });
    insertionTarget.insertBefore(el, insertionTarget.firstChild);
  }
  return el;
}

let _liveRegion = null;
export function setLiveRegion(el) { _liveRegion = el; }

export function announceToScreenReaders(message) {
  if (!_liveRegion) return;
  _liveRegion.textContent = '';
  window.setTimeout(() => { _liveRegion.textContent = message; }, 0);
}

// ── Visibility helpers ──

export function isModalOpen(modal) {
  return modal.style.display === 'flex';
}

export function isVisible(element) {
  if (!element || element.hidden) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

// ── Focus trap ──

export function invalidateFocusableCache() {}

function getFocusableElements(modal) {
  const selectors = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[contenteditable="true"]:not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])'
  ];

  return [...modal.querySelectorAll(selectors.join(','))]
    .filter((element) => isVisible(element) && !element.closest('[hidden]'));
}

export function handleFocusTrap(event, modal, modalContent) {
  const focusableElements = getFocusableElements(modal);
  if (focusableElements.length === 0) {
    event.preventDefault();
    modalContent.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (!modal.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
    return;
  }

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

// ── Search results ARIA ──

export function closeSearchResults(searchResults, searchInput, { announce = false } = {}) {
  if (!searchResults) return;
  searchResults.hidden = true;
  searchResults.setAttribute('aria-hidden', 'true');
  if (searchInput) {
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
  }
  if (announce) {
    announceToScreenReaders('Résultats de recherche masqués');
  }
  invalidateFocusableCache();
}

export function openSearchResults(searchResults, searchInput, count) {
  if (!searchResults) return;
  searchResults.hidden = false;
  searchResults.setAttribute('aria-hidden', 'false');
  if (searchInput) {
    searchInput.setAttribute('aria-expanded', 'true');
  }
  announceToScreenReaders(`${count} résultat${count > 1 ? 's' : ''} de recherche disponible${count > 1 ? 's' : ''}`);
  invalidateFocusableCache();
}

// ── Mode accessibility ──

export function updateModeAccessibility(refs, currentMode, { announce = true } = {}) {
  const isLibre = currentMode === 'libre';

  if (refs.tabsContainer) {
    refs.tabsContainer.setAttribute('role', 'tablist');
    refs.tabsContainer.setAttribute('aria-label', 'Modes du testeur');
  }

  if (refs.tabLibre) {
    refs.tabLibre.setAttribute('role', 'tab');
    refs.tabLibre.setAttribute('aria-controls', 'mode-libre');
    refs.tabLibre.setAttribute('aria-selected', String(isLibre));
    refs.tabLibre.tabIndex = isLibre ? 0 : -1;
  }

  if (refs.tabLessons) {
    refs.tabLessons.setAttribute('role', 'tab');
    refs.tabLessons.setAttribute('aria-controls', 'mode-lessons');
    refs.tabLessons.setAttribute('aria-selected', String(!isLibre));
    refs.tabLessons.tabIndex = isLibre ? -1 : 0;
  }

  if (refs.modeLibre) {
    refs.modeLibre.setAttribute('role', 'tabpanel');
    refs.modeLibre.setAttribute('aria-labelledby', 'tab-libre');
    refs.modeLibre.hidden = !isLibre;
    refs.modeLibre.style.display = isLibre ? 'block' : 'none';
  }

  if (refs.modeLessons) {
    refs.modeLessons.setAttribute('role', 'tabpanel');
    refs.modeLessons.setAttribute('aria-labelledby', 'tab-lessons');
    refs.modeLessons.hidden = isLibre;
    refs.modeLessons.style.display = isLibre ? 'none' : 'block';
  }

  if (announce) {
    announceToScreenReaders(isLibre ? 'Mode libre activé' : 'Mode leçons activé');
  }

  invalidateFocusableCache();
}

// ── Initial ARIA attributes ──

export function applyModalAccessibilityAttributes(refs, modalTitle, modalDescription) {
  refs.modal.setAttribute('role', 'dialog');
  refs.modal.setAttribute('aria-modal', 'true');
  refs.modal.setAttribute('aria-labelledby', modalTitle.id);
  refs.modal.setAttribute('aria-describedby', modalDescription.id);
  refs.modal.setAttribute('aria-hidden', 'true');

  refs.modalContent?.setAttribute('tabindex', '-1');
  refs.overlay?.setAttribute('aria-hidden', 'true');

  if (refs.openBtn) {
    refs.openBtn.setAttribute('aria-haspopup', 'dialog');
    refs.openBtn.setAttribute('aria-controls', 'tester-modal');
    refs.openBtn.setAttribute('aria-expanded', 'false');
  }

  if (refs.closeBtn) {
    refs.closeBtn.setAttribute('aria-label', 'Fermer le testeur');
  }

  if (refs.searchInput) {
    refs.searchInput.setAttribute('role', 'combobox');
    refs.searchInput.setAttribute('aria-label', 'Rechercher un caractère');
    refs.searchInput.setAttribute('aria-controls', 'modal-search-results');
    refs.searchInput.setAttribute('aria-expanded', 'false');
    refs.searchInput.setAttribute('aria-autocomplete', 'list');
    refs.searchInput.setAttribute('aria-haspopup', 'listbox');
    refs.searchInput.setAttribute('autocomplete', 'off');
    refs.searchInput.setAttribute('spellcheck', 'false');
  }

  if (refs.searchResults) {
    refs.searchResults.setAttribute('role', 'listbox');
    refs.searchResults.setAttribute('aria-label', 'Résultats de recherche');
    refs.searchResults.setAttribute('aria-hidden', 'true');
    refs.searchResults.hidden = true;
  }

  if (refs.outputEl) {
    refs.outputEl.setAttribute('role', 'textbox');
    refs.outputEl.setAttribute('aria-label', 'Zone de test libre');
    refs.outputEl.setAttribute('aria-multiline', 'true');
    refs.outputEl.setAttribute('aria-describedby', modalDescription.id);
    refs.outputEl.setAttribute('spellcheck', 'false');
    refs.outputEl.tabIndex = 0;
  }

  if (refs.moduleSelect) {
    refs.moduleSelect.setAttribute('aria-label', 'Choisir un module de leçon');
  }

  if (refs.lessonList) {
    refs.lessonList.setAttribute('aria-label', 'Liste des leçons du module');
  }

  if (refs.lessonTarget) {
    refs.lessonTarget.setAttribute('role', 'region');
    refs.lessonTarget.setAttribute('aria-label', 'Texte à reproduire');
  }

  if (refs.lessonProgress) {
    refs.lessonProgress.setAttribute('role', 'status');
    refs.lessonProgress.setAttribute('aria-live', 'polite');
  }

  if (refs.lessonInput) {
    refs.lessonInput.setAttribute('role', 'textbox');
    refs.lessonInput.setAttribute('aria-label', 'Zone de saisie de la leçon');
    refs.lessonInput.setAttribute('aria-multiline', 'true');
    refs.lessonInput.setAttribute('aria-describedby', 'lesson-instruction');
    refs.lessonInput.setAttribute('spellcheck', 'false');
    refs.lessonInput.tabIndex = 0;
  }

  if (refs.lessonExercise) {
    refs.lessonExercise.hidden = refs.lessonExercise.style.display === 'none';
  }

  if (refs.lessonWelcome) {
    refs.lessonWelcome.hidden = refs.lessonWelcome.style.display === 'none';
  }
}
