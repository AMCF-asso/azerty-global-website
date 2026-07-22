/**
 * AZERTY Global Tester — Character search
 * Load character index, search algorithm, result display, keyboard highlighting
 */

import { closeSearchResults, openSearchResults, announceToScreenReaders } from './tester-accessibility.js?v=final-20260717-3';
import { getLayerDisplayName, getTesterPlatform } from './tester-platform.js?v=final-20260717-3';
import {
  DEAD_KEY_NAMES_FR,
  DEAD_KEY_NAMES_EN,
  DEAD_KEY_SYMBOLS,
  DEAD_KEY_SYMBOL_NAMES,
  DEAD_KEY_SYMBOL_NAMES_EN,
  toDeadKeyUnderscore
} from '../tester/deadkeys.js?v=final-20260717-3';
import { T, isEnglish } from './tester-i18n.js?v=final-20260717-3';

// Sélection FR/EN faite une fois au chargement (la langue est fixée avant, cf. init-tester.js).
export const DEAD_KEY_NAMES = isEnglish() ? DEAD_KEY_NAMES_EN : DEAD_KEY_NAMES_FR;
const DEAD_KEY_SYMBOL_LABELS = isEnglish() ? DEAD_KEY_SYMBOL_NAMES_EN : DEAD_KEY_SYMBOL_NAMES;

const KEY_LABELS = {
  'Digit1': '&', 'Digit2': 'é', 'Digit3': '"', 'Digit4': "'", 'Digit5': '(',
  'Digit6': '-', 'Digit7': 'è', 'Digit8': '_', 'Digit9': 'ç', 'Digit0': 'à',
  'Minus': ')', 'Equal': '=',
  'KeyQ': 'A', 'KeyW': 'Z', 'KeyE': 'E', 'KeyR': 'R', 'KeyT': 'T',
  'KeyY': 'Y', 'KeyU': 'U', 'KeyI': 'I', 'KeyO': 'O', 'KeyP': 'P',
  'KeyA': 'Q', 'KeyS': 'S', 'KeyD': 'D', 'KeyF': 'F', 'KeyG': 'G',
  'KeyH': 'H', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
  'KeyZ': 'W', 'KeyX': 'X', 'KeyC': 'C', 'KeyV': 'V', 'KeyB': 'B',
  'KeyN': 'N', 'KeyM': ',',
  'Comma': ';', 'Period': ':', 'Slash': '!',
  'Backquote': '²', 'IntlBackslash': '<', 'BracketLeft': '^', 'BracketRight': '$',
  'Space': T('Espace', 'Space')
};

function getCharacterDisplayName(data) {
  return isEnglish()
    ? (data.unicodeName || data.unicodeNameFr)
    : (data.unicodeNameFr || data.unicodeName);
}

// ── Character index state ──

let characterIndex = null;
let characterIndexPromise = null;
let characterIndexError = null;
let activeResultIndex = -1;
const CHARACTER_INDEX_URL = '/tester/character-index.json?v=final-20260717-3';

export function getCharacterIndex() { return characterIndex; }

export async function loadCharacterIndex({ onLoaded = null, onError = null, force = false } = {}) {
  if (characterIndex && !force) {
    if (onLoaded) onLoaded(characterIndex);
    return characterIndex;
  }
  if (characterIndexPromise && !force) {
    return characterIndexPromise.then((data) => {
      if (data && onLoaded) onLoaded(data);
      if (!data && onError && characterIndexError) onError(characterIndexError);
      return data;
    });
  }

  characterIndexPromise = fetch(CHARACTER_INDEX_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error('Failed to load character index');
      return response.json();
    })
    .then((data) => {
      characterIndex = data;
      characterIndexError = null;
      if (onLoaded) onLoaded(characterIndex);
      return characterIndex;
    })
    .catch((error) => {
      console.error('Error loading character index:', error);
      characterIndexError = error;
      characterIndexPromise = null;
      if (onError) onError(error);
      return null;
    });

  return characterIndexPromise;
}

// ── Tooltips on keyboard keys ──

const MODAL_KEY_TOOLTIP_OVERRIDES = {
  'KeyI:bottom-right:^': T('CIRCONFLEXE', 'CIRCUMFLEX'),
  'KeyL:bottom-right:`': 'BACKTICK',
  'KeyM:bottom-right:<': T('CHEVRON OUVRANT', 'LESS-THAN SIGN'),
  'Comma:bottom-right:>': T('CHEVRON FERMANT', 'GREATER-THAN SIGN')
};

const QUERY_METHOD_OVERRIDES = [
  { query: 'circonflexe', char: '^', method: { type: 'direct', key: 'KeyI', layer: 'AltGr' } },
  { query: 'circumflex', char: '^', method: { type: 'direct', key: 'KeyI', layer: 'AltGr' } },
  { query: 'accent circonflexe', char: '^', method: { type: 'deadkey', deadkey: 'dk_circumflex', key: 'Space', layer: 'Base' } },
  { query: 'circumflex accent', char: '^', method: { type: 'deadkey', deadkey: 'dk_circumflex', key: 'Space', layer: 'Base' } },
  { query: 'backtick', char: '`', method: { type: 'direct', key: 'KeyL', layer: 'AltGr' } },
  { query: 'accent grave', char: '`', method: { type: 'deadkey', deadkey: 'dk_grave', key: 'Space', layer: 'Base' } },
  { query: 'grave accent', char: '`', method: { type: 'deadkey', deadkey: 'dk_grave', key: 'Space', layer: 'Base' } }
];

const CONTEXTUAL_CAPITAL_ACCENTS = new Set(['É', 'È', 'Ç', 'À']);

function methodMatches(method, expected) {
  if (!method || !expected) return false;
  return Object.entries(expected).every(([key, value]) => method[key] === value);
}

function getQueryPreferredMethod(char, data, normalizedQuery) {
  const override = QUERY_METHOD_OVERRIDES.find(item => item.char === char && item.query === normalizedQuery);
  if (!override || !Array.isArray(data?.methods)) return null;
  return data.methods.find(method => methodMatches(method, override.method)) || null;
}

function isLowercaseLetter(char) {
  if (!char) return false;
  return char.toLocaleLowerCase('fr') === char && char.toLocaleUpperCase('fr') !== char;
}

export function getPreferredCharacterMethod(char, methods = [], { nextChar = null, forceCaps = false } = {}) {
  if (!Array.isArray(methods) || methods.length === 0) return null;

  if (!forceCaps && CONTEXTUAL_CAPITAL_ACCENTS.has(char) && isLowercaseLetter(nextChar)) {
    const circumflexMethod = methods.find((method) =>
      method.type === 'deadkey' &&
      (method.deadkey || method.deadKey) === 'dk_circumflex'
    );
    if (circumflexMethod) return circumflexMethod;
  }

  if (forceCaps) {
    const capsMethod = methods.find((method) =>
      typeof method.layer === 'string' && method.layer.startsWith('Caps')
    );
    if (capsMethod) return capsMethod;
  }

  return methods.find(x => x.recommended) || methods[0] || null;
}

function getResultMethod(result) {
  if (result?.preferredMethod) return result.preferredMethod;
  const methods = result?.data?.methods || [];
  return getPreferredCharacterMethod(result?.char, methods);
}

export function createModalCharacterTooltips() {
  if (!characterIndex) return;

  document.querySelectorAll('#modal-keyboard-container .key .key-char').forEach(charSpan => {
    const char = charSpan.textContent.trim();
    if (!char || char.length === 0) return;

    const keyEl = charSpan.closest('.key');
    const keyId = keyEl?.dataset?.keyId;
    const position = [...charSpan.classList].find(className => className !== 'key-char');
    const override = MODAL_KEY_TOOLTIP_OVERRIDES[`${keyId}:${position}:${char}`];
    if (override) {
      charSpan.title = override;
      charSpan.style.cursor = 'help';
      return;
    }

    // Ne traiter comme dead key que si la classe CSS 'dead-key' est presente.
    // Sans ce garde, ~ et ` (caracteres directs sur la touche N en AltGr / Shift+AltGr)
    // afficheraient « Touche morte tilde » et « Touche morte accent grave ».
    const isDeadKey = charSpan.classList.contains('dead-key');
    if (isDeadKey && DEAD_KEY_SYMBOL_LABELS[char]) {
      charSpan.title = DEAD_KEY_SYMBOL_LABELS[char].toUpperCase();
      charSpan.style.cursor = 'help';
      return;
    }

    const charData = characterIndex.characters[char];
    if (charData) {
      charSpan.title = (getCharacterDisplayName(charData) || char).toUpperCase();
      charSpan.style.cursor = 'help';
    }
  });
}

// ── Search algorithm ──

function normalizeForSearch(text) {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function wordMatches(queryWord, targetWord) {
  if (queryWord.length === 1) return targetWord === queryWord;
  return targetWord === queryWord || targetWord.startsWith(queryWord);
}

// Synonymes de requête : les noms Unicode disent « capital »/« small », jamais
// « uppercase »/« lowercase ». Le synonyme est une ALTERNATIVE (pas un remplacement)
// et s'applique dès les préfixes (« up », « upper »…) pour que la recherche
// incrémentale fonctionne, sans casser les requêtes littérales comme « low line »
// (U+005F). Aligné sur CharacterSearch.cs (app Microsoft Store).
function querySynonym(queryWord) {
  if (queryWord.length < 2) return null;
  if ('uppercase'.startsWith(queryWord)) return 'capital';
  if ('lowercase'.startsWith(queryWord)) return 'small';
  return null;
}

function wordMatchesWithSynonym(queryWord, targetWord) {
  if (wordMatches(queryWord, targetWord)) return true;
  const syn = querySynonym(queryWord);
  return syn !== null && wordMatches(syn, targetWord);
}

export function searchCharacters(query) {
  if (!characterIndex || !query || query.length < 1) return [];

  const normalizedQuery = normalizeForSearch(query);
  const queryWords = normalizedQuery.split(/[\s\-'\u2019()]+/).filter(w => w.length > 0);
  const originalQueryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const results = [];

  for (const [char, data] of Object.entries(characterIndex.characters)) {
    let score = 0;
    const primaryName = isEnglish() ? data.unicodeName : data.unicodeNameFr;
    const secondaryName = isEnglish() ? data.unicodeNameFr : data.unicodeName;

    if (char === query) {
      score = 100;
    } else if (char.toLowerCase() === query.toLowerCase()) {
      score = 90;
    } else if (data.frenchAliases && data.frenchAliases.some(alias => {
      const aliasWords = normalizeForSearch(alias).split(/[\s\-'\u2019()]+/);
      return queryWords.every(qw => aliasWords.some(aw => wordMatchesWithSynonym(qw, aw)));
    })) {
      score = 80;
    } else if (data.englishAliases && data.englishAliases.some(alias => {
      const aliasWords = normalizeForSearch(alias).split(/[\s\-'\u2019()]+/);
      return queryWords.every(qw => aliasWords.some(aw => wordMatchesWithSynonym(qw, aw)));
    })) {
      // Alias anglais : m\u00eame score que l'alias fran\u00e7ais \u2014 recherche bilingue permanente,
      // quelle que soit la langue de l'UI (testeur bilingue depuis 2026-07-15).
      score = 80;
    } else if (primaryName) {
      const nameWords = normalizeForSearch(primaryName).split(/[\s\-'\u2019()]+/);
      if (queryWords.every(qw => nameWords.some(nw => wordMatchesWithSynonym(qw, nw)))) {
        score = 70;
      }
    }
    if (score === 0 && secondaryName) {
      const nameWords = normalizeForSearch(secondaryName).split(/[\s\-'\u2019()]+/);
      if (queryWords.every(qw => nameWords.some(nw => wordMatchesWithSynonym(qw, nw)))) {
        score = 50;
      }
    }

    if (score > 0) {
      const preferredMethod = getQueryPreferredMethod(char, data, normalizedQuery);
      const codePointNum = data.codePoint.startsWith('U+')
        ? parseInt(data.codePoint.slice(2), 16)
        : -1;
      const lowerChar = char.toLowerCase();

      if (originalQueryWords.includes(char) || originalQueryWords.includes(lowerChar)) {
        score += 50;
      } else if (queryWords.includes(normalizeForSearch(char))) {
        score += 10;
      }

      if (originalQueryWords.length === 1 && originalQueryWords[0].length === 1 &&
        (char === originalQueryWords[0] || lowerChar === originalQueryWords[0].toLowerCase())) {
        score += 100;
      }

      if (codePointNum >= 0x0020 && codePointNum <= 0x007F) score += 15;
      if (char.length === 1 && char === lowerChar && char !== char.toUpperCase()) score += 5;
      if (data.methods && data.methods.some(m => m.recommended && m.type === 'direct')) score += 10;
      if (char.startsWith('dk:')) score += 30;
      if (primaryName && normalizeForSearch(primaryName).startsWith(normalizedQuery)) score += 15;
      if (preferredMethod) score += 50;

      results.push({ char, data, score, preferredMethod });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.char.localeCompare(b.char);
  });

  return results.slice(0, 20);
}

// ── Keyboard highlighting ──

let highlightTimeouts = [];

export function clearHighlightTimeouts() {
  highlightTimeouts.forEach(t => clearTimeout(t));
  highlightTimeouts = [];
}

function isSingleLetter(value) {
  return typeof value === 'string' && [...value].length === 1 && /\p{L}/u.test(value);
}

function isShiftCoveredByCaps(layer, targetKey, keyboard) {
  if (!keyboard?.state?.caps || !targetKey || !keyboard.layout?.[targetKey]) return false;

  const chars = keyboard.layout[targetKey];
  if (layer === 'Shift') {
    return chars[1] === chars[2] && isSingleLetter(chars[1]);
  }
  if (layer === 'Shift+AltGr' || layer === 'AltGr+Shift') {
    return chars[5] === chars[6] && isSingleLetter(chars[5]);
  }
  return false;
}

export function getLayerKeys(layer, { keyboard = null, onlyMissingModifiers = false, targetKey = null } = {}) {
  const keys = [];
  if (!layer || layer === 'Base') return keys;
  const state = keyboard?.state || {};
  const shiftCoveredByCaps = onlyMissingModifiers && isShiftCoveredByCaps(layer, targetKey, keyboard);
  const addModifierKey = (keyId, active) => {
    if (!onlyMissingModifiers || !active) keys.push(keyId);
  };
  const addAltGrKeys = () => {
    if (onlyMissingModifiers && state.altgr) return;
    if (getTesterPlatform() === 'mac') {
      keys.push('AltLeft', 'AltRight');
    } else {
      keys.push('AltRight');
    }
  };
  if (layer === 'Shift') addModifierKey('ShiftLeft', state.shift || shiftCoveredByCaps);
  else if (layer === 'Caps') addModifierKey('CapsLock', state.caps);
  else if (layer === 'Caps+Shift') {
    addModifierKey('CapsLock', state.caps);
    addModifierKey('ShiftLeft', state.shift);
  }
  else if (layer === 'AltGr') addAltGrKeys();
  else if (layer === 'Shift+AltGr' || layer === 'AltGr+Shift') {
    addModifierKey('ShiftLeft', state.shift || shiftCoveredByCaps);
    addAltGrKeys();
  } else if (layer === 'Caps+AltGr') {
    addModifierKey('CapsLock', state.caps);
    addAltGrKeys();
  } else if (layer === 'Caps+Shift+AltGr') {
    addModifierKey('CapsLock', state.caps);
    addModifierKey('ShiftLeft', state.shift);
    addAltGrKeys();
  }
  return [...new Set(keys)];
}

export function queryKey(keyId) {
  return document.querySelector(`#modal-keyboard-container .key[data-key-id="${keyId}"]`);
}

export function clearAllHighlights() {
  document.querySelectorAll('#modal-keyboard-container .key.search-highlight, #modal-keyboard-container .key.search-highlight-dk, #modal-keyboard-container .key.search-highlight-step1, #modal-keyboard-container .key.search-highlight-step2').forEach(k => {
    k.classList.remove('search-highlight', 'search-highlight-dk', 'search-highlight-step1', 'search-highlight-step2');
  });
}

export function clearTutorialHighlights() {
  document.querySelectorAll('#modal-keyboard-container .key.tutorial-key-highlight, #modal-keyboard-container .key.tutorial-key-highlight-dk, #modal-keyboard-container .key.tutorial-key-highlight-step1, #modal-keyboard-container .key.tutorial-key-highlight-step2').forEach(k => {
    k.classList.remove('tutorial-key-highlight', 'tutorial-key-highlight-dk', 'tutorial-key-highlight-step1', 'tutorial-key-highlight-step2');
  });
}

function addTutorialHighlight(keyId, className) {
  const keyEl = queryKey(keyId);
  if (keyEl) keyEl.classList.add(className);
}

function getDeadKeyActivationKeys(deadKeyName) {
  if (!deadKeyName) return [];
  const dkLookupKey = deadKeyName.replace('dk_', 'dk:');
  const dkData = characterIndex?.characters[dkLookupKey];
  const activationMethod = dkData?.methods?.find((candidate) => candidate.recommended) || dkData?.methods?.[0];
  if (!activationMethod) return [];
  return [activationMethod.key, ...getLayerKeys(activationMethod.layer)];
}

export function highlightTutorialMethod(method, keyboard, { keepCaps = false, activeDeadKey = null } = {}) {
  clearTutorialHighlights();
  if (!method || !keyboard) return;

  if (keepCaps) {
    addTutorialHighlight('CapsLock', 'tutorial-key-highlight');
  }

  if (method.type === 'deadkey') {
    const dkKey = method.deadKey || method.deadkey;
    const step2Keys = [method.key, ...getLayerKeys(method.layer)];

    if (activeDeadKey === dkKey) {
      step2Keys.forEach((keyId) => addTutorialHighlight(keyId, 'tutorial-key-highlight-step2'));
      return;
    }

    getDeadKeyActivationKeys(dkKey).forEach((keyId) => {
      addTutorialHighlight(keyId, 'tutorial-key-highlight-step1');
    });
    return;
  }

  const isDkActivation = method.type === 'deadkey_activation';
  const highlightClass = isDkActivation ? 'tutorial-key-highlight-dk' : 'tutorial-key-highlight';
  [method.key, ...getLayerKeys(method.layer)].forEach((keyId) => {
    addTutorialHighlight(keyId, highlightClass);
  });
}

export function highlightSearchMethod(method, keyboard) {
  clearHighlightTimeouts();
  clearAllHighlights();

  if (!method || !keyboard) return;

  if (method.type === 'direct' || method.type === 'deadkey_activation' || !method.type) {
    const isDkActivation = method.type === 'deadkey_activation';
    const highlightClass = isDkActivation ? 'search-highlight-dk' : 'search-highlight';
    const keysToHighlight = [
      method.key,
      ...getLayerKeys(method.layer, { keyboard, onlyMissingModifiers: true, targetKey: method.key })
    ];

    keysToHighlight.forEach(keyId => {
      const keyEl = queryKey(keyId);
      if (keyEl) keyEl.classList.add(highlightClass);
    });

    highlightTimeouts.push(setTimeout(() => {
      document.querySelectorAll(`#modal-keyboard-container .key.${highlightClass}`).forEach(k => {
        k.classList.remove(highlightClass);
      });
    }, 3000));
  } else if (method.type === 'deadkey') {
    const dkKey = method.deadKey || method.deadkey;
    let step1Keys = [];
    const step2Keys = method.key
      ? [
        method.key,
        ...getLayerKeys(method.layer, { keyboard, onlyMissingModifiers: true, targetKey: method.key })
      ]
      : [];

    if (dkKey) {
      const dkLookupKey = dkKey.replace('dk_', 'dk:');
      const dkData = characterIndex?.characters[dkLookupKey];
      if (dkData?.methods?.[0]) {
        const activationMethod = dkData.methods.find((candidate) => candidate.recommended) || dkData.methods[0];
        step1Keys.push(
          activationMethod.key,
          ...getLayerKeys(activationMethod.layer, {
            keyboard,
            onlyMissingModifiers: true,
            targetKey: activationMethod.key
          })
        );
      }
    }

    if (dkKey && keyboard.state?.activeDeadKey === dkKey) {
      step2Keys.forEach((keyId) => {
        const keyEl = queryKey(keyId);
        if (keyEl) keyEl.classList.add('search-highlight-step2');
      });

      highlightTimeouts.push(setTimeout(() => {
        document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step2').forEach(k => {
          k.classList.remove('search-highlight-step2');
        });
      }, 3000));
      return;
    }

    step1Keys.forEach(keyId => {
      const keyEl = queryKey(keyId);
      if (keyEl) keyEl.classList.add('search-highlight-step1');
    });

    if (method.key) {
      highlightTimeouts.push(setTimeout(() => {
        document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step1').forEach(k => {
          k.classList.remove('search-highlight-step1');
        });

        step2Keys.forEach((keyId) => {
          const keyEl = queryKey(keyId);
          if (keyEl) keyEl.classList.add('search-highlight-step2');
        });
      }, 2000));

      highlightTimeouts.push(setTimeout(() => {
        document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step2').forEach(k => {
          k.classList.remove('search-highlight-step2');
        });
      }, 4500));
    } else {
      highlightTimeouts.push(setTimeout(() => {
        document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step1').forEach(k => {
          k.classList.remove('search-highlight-step1');
        });
      }, 3000));
    }
  }
}

// ── Format method text ──

function formatMethod(m) {
  let keyLabel = KEY_LABELS[m.key] || m.key;
  const layerLabel = getLayerDisplayName(m.layer);

  if (m.type === 'deadkey') {
    const dkKey = m.deadkey || m.deadKey;
    const dkName = keyLabel === KEY_LABELS.Space
      ? DEAD_KEY_SYMBOLS[dkKey] || DEAD_KEY_NAMES[dkKey] || T('Touche morte', 'Dead key')
      : DEAD_KEY_NAMES[dkKey] || T('Touche morte', 'Dead key');
    let text = `${dkName} + ${keyLabel}`;
    if (layerLabel) {
      text += ` (${layerLabel})`;
    }
    return text;
  }
  if (layerLabel) {
    return `${layerLabel} + ${keyLabel}`;
  }
  return keyLabel;
}

function clearActiveSearchResult(searchInput, searchResults) {
  activeResultIndex = -1;
  if (searchInput) {
    searchInput.removeAttribute('aria-activedescendant');
  }
  if (!searchResults) return;
  searchResults.querySelectorAll('.search-result-item').forEach((item) => {
    item.classList.remove('search-result-item--active');
    item.setAttribute('aria-selected', 'false');
  });
}

function setActiveSearchResult(index, refs) {
  const { searchInput, searchResults } = refs;
  if (!searchResults) return;

  const items = [...searchResults.querySelectorAll('.search-result-item')];
  if (items.length === 0) {
    clearActiveSearchResult(searchInput, searchResults);
    return;
  }

  const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
  activeResultIndex = clampedIndex;

  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === clampedIndex;
    item.classList.toggle('search-result-item--active', isActive);
    item.setAttribute('aria-selected', String(isActive));
    if (isActive) {
      searchInput?.setAttribute('aria-activedescendant', item.id);
      item.scrollIntoView({ block: 'nearest' });
    }
  });
}

function activateSearchResult(result, refs, keyboard) {
  const { searchResults, searchInput, outputEl } = refs;

  highlightSearchMethod(getResultMethod(result), keyboard);

  searchInput.value = '';
  searchResults.innerHTML = '';
  clearActiveSearchResult(searchInput, searchResults);
  closeSearchResults(searchResults, searchInput);
  outputEl.focus();
}

// ── Display search results ──

export function displaySearchResults(results, refs, keyboard) {
  const { searchResults, searchInput, outputEl } = refs;
  if (!searchResults) return;

  if (results.length === 0) {
    searchResults.innerHTML = '';
    clearActiveSearchResult(searchInput, searchResults);
    closeSearchResults(searchResults, searchInput);
    announceToScreenReaders(T('Aucun résultat de recherche', 'No search results'));
    return;
  }

  searchResults.innerHTML = '';
  clearActiveSearchResult(searchInput, searchResults);
  openSearchResults(searchResults, searchInput, results.length);

  results.forEach((result, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'search-result-item';
    item.id = `modal-search-result-${index}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', 'false');
    item.tabIndex = -1;

    const charSpan = document.createElement('span');
    if (result.char.startsWith('dk:')) {
      charSpan.textContent = DEAD_KEY_SYMBOLS[toDeadKeyUnderscore(result.char)] || '◌';
      charSpan.className = 'search-result-char search-result-char--deadkey';
    } else {
      charSpan.textContent = result.char;
      charSpan.className = 'search-result-char';
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'search-result-info';

    const nameSpan = document.createElement('div');
    nameSpan.textContent = getCharacterDisplayName(result.data);
    nameSpan.className = 'search-result-name';

    const methodSpan = document.createElement('div');
    methodSpan.className = 'search-result-method';
    const m = getResultMethod(result);
    if (m) {
      methodSpan.textContent = formatMethod(m);
    }

    const resultName = getCharacterDisplayName(result.data) || result.char;
    const resultMethod = methodSpan.textContent
      ? T(`, méthode ${methodSpan.textContent}`, `, method ${methodSpan.textContent}`)
      : '';
    item.setAttribute('aria-label', `${result.char}, ${resultName}${resultMethod}`);

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(methodSpan);
    item.appendChild(charSpan);
    item.appendChild(infoDiv);

    item.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    item.addEventListener('click', () => {
      activateSearchResult(result, refs, keyboard);
    });

    searchResults.appendChild(item);
  });
}

// ── Wire up search input events ──

export function setupSearchHandlers(refs, getKeyboard) {
  const { searchInput, searchResults } = refs;
  let debounceTimer = null;

  function runSearch(query) {
    if (query.length > 0) {
      const results = searchCharacters(query);
      displaySearchResults(results, refs, getKeyboard());
    } else {
      if (searchResults) {
        searchResults.innerHTML = '';
      }
      clearActiveSearchResult(searchInput, searchResults);
      closeSearchResults(searchResults, searchInput);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        runSearch(e.target.value.trim());
      }, 150);
    });

    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement !== searchInput && !searchResults?.contains(activeElement)) {
          clearActiveSearchResult(searchInput, searchResults);
          closeSearchResults(searchResults, searchInput);
        }
      }, 200);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') return;
      e.stopPropagation();
      const items = searchResults ? [...searchResults.querySelectorAll('.search-result-item')] : [];
      const hasResults = items.length > 0 && !searchResults.hidden;

      if (e.key === 'Escape') {
        clearActiveSearchResult(searchInput, searchResults);
        closeSearchResults(searchResults, searchInput);
        e.preventDefault();
        return;
      }

      if (!hasResults) {
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && searchInput.value.trim().length > 0) {
          runSearch(searchInput.value.trim());
          const refreshedItems = searchResults ? [...searchResults.querySelectorAll('.search-result-item')] : [];
          if (refreshedItems.length > 0) {
            e.preventDefault();
            setActiveSearchResult(e.key === 'ArrowUp' ? refreshedItems.length - 1 : 0, refs);
          }
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSearchResult(activeResultIndex < 0 ? 0 : activeResultIndex + 1, refs);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSearchResult(activeResultIndex < 0 ? items.length - 1 : activeResultIndex - 1, refs);
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        setActiveSearchResult(0, refs);
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        setActiveSearchResult(items.length - 1, refs);
        return;
      }

      if (e.key === 'Enter' && activeResultIndex >= 0 && items[activeResultIndex]) {
        e.preventDefault();
        items[activeResultIndex].click();
      }
    });
  }

  if (searchResults) {
    searchResults.addEventListener('focusout', () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement !== searchInput && !searchResults.contains(activeElement)) {
          clearActiveSearchResult(searchInput, searchResults);
          closeSearchResults(searchResults, searchInput);
        }
      }, 0);
    });
  }
}
