/**
 * AZERTY Global Tester — Character search
 * Load character index, search algorithm, result display, keyboard highlighting
 */

import { closeSearchResults, openSearchResults, announceToScreenReaders } from './tester-accessibility.js';
import { getLayerDisplayName, getTesterPlatform } from './tester-platform.js';

// ── Shared constants ──

export const DEAD_KEY_NAMES_FR = {
  'dk_circumflex': 'Circonflexe',
  'dk_diaeresis': 'Tréma',
  'dk_acute': 'Accent aigu',
  'dk_grave': 'Accent grave',
  'dk_tilde': 'Tilde',
  'dk_dot_above': 'Point en chef',
  'dk_dot_below': 'Point souscrit',
  'dk_double_acute': 'Double accent aigu',
  'dk_double_grave': 'Double accent grave',
  'dk_horn': 'Corne',
  'dk_hook': 'Crochet',
  'dk_caron': 'Caron',
  'dk_ogonek': 'Ogonek',
  'dk_breve': 'Brève',
  'dk_inverted_breve': 'Brève inversée',
  'dk_stroke': 'Barre oblique',
  'dk_horizontal_stroke': 'Barre horizontale',
  'dk_macron': 'Macron',
  'dk_extended_latin': 'Latin étendu',
  'dk_cedilla': 'Cédille',
  'dk_comma': 'Virgule souscrite',
  'dk_phonetic': 'Alphabet phonétique',
  'dk_ring_above': 'Rond en chef',
  'dk_greek': 'Alphabet grec',
  'dk_cyrillic': 'Alphabet cyrillique',
  'dk_misc_symbols': 'Symboles divers',
  'dk_scientific': 'Symboles scientifiques',
  'dk_currencies': 'Symboles monétaires',
  'dk_punctuation': 'Symboles de ponctuation'
};

const DEAD_KEY_SYMBOLS = {
  'dk:circumflex': '^', 'dk:diaeresis': '¨', 'dk:acute': '´', 'dk:grave': '`',
  'dk:tilde': '~', 'dk:caron': 'ˇ', 'dk:ogonek': '˛', 'dk:dot_above': '˙',
  'dk:double_acute': '˝', 'dk:breve': '˘', 'dk:macron': '¯', 'dk:cedilla': '¸',
  'dk:ring_above': '˚', 'dk:currencies': '¤', 'dk:scientific': '±', 'dk:misc_symbols': '→',
  'dk:greek': 'μ', 'dk:cyrillic': 'я', 'dk:punctuation': '§', 'dk:phonetic': 'ʁ',
  'dk:extended_latin': 'ə', 'dk:dot_below': '.', 'dk:horn': '̛', 'dk:hook': '̉',
  'dk:stroke': '/', 'dk:horizontal_stroke': '−', 'dk:inverted_breve': '̑',
  'dk:comma': ',', 'dk:double_grave': '̏'
};

const DEAD_KEY_SYMBOL_NAMES = {
  '^': 'Touche morte circonflexe', '¨': 'Touche morte tréma',
  '´': 'Touche morte accent aigu', '`': 'Touche morte accent grave',
  '~': 'Touche morte tilde', 'ˇ': 'Touche morte caron',
  '˛': 'Touche morte ogonek', '˙': 'Touche morte point en chef',
  '˝': 'Touche morte double accent aigu', '˘': 'Touche morte brève',
  '¯': 'Touche morte macron', '¸': 'Touche morte cédille',
  '˚': 'Touche morte rond en chef', '¤': 'Touche morte monnaies',
  '±': 'Touche morte scientifique', '→': 'Touche morte symboles divers',
  'μ': 'Touche morte grec', 'я': 'Touche morte cyrillique',
  '§': 'Touche morte ponctuation', 'ʁ': 'Touche morte phonétique',
  'ə': 'Touche morte latin étendu'
};

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
  'Space': 'Espace'
};

// ── Character index state ──

let characterIndex = null;
let characterIndexPromise = null;
let characterIndexError = null;
let activeResultIndex = -1;

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

  characterIndexPromise = fetch('tester/character-index.json')
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

export function createModalCharacterTooltips() {
  if (!characterIndex) return;

  document.querySelectorAll('#modal-keyboard-container .key .key-char').forEach(charSpan => {
    const char = charSpan.textContent.trim();
    if (!char || char.length === 0) return;

    if (DEAD_KEY_SYMBOL_NAMES[char]) {
      charSpan.title = DEAD_KEY_SYMBOL_NAMES[char];
      charSpan.style.cursor = 'help';
      return;
    }

    const charData = characterIndex.characters[char];
    if (charData) {
      charSpan.title = charData.unicodeNameFr || charData.unicodeName || char;
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

export function searchCharacters(query) {
  if (!characterIndex || !query || query.length < 1) return [];

  const normalizedQuery = normalizeForSearch(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
  const originalQueryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const results = [];

  for (const [char, data] of Object.entries(characterIndex.characters)) {
    let score = 0;

    if (char === query) {
      score = 100;
    } else if (char.toLowerCase() === query.toLowerCase()) {
      score = 90;
    } else if (data.frenchAliases && data.frenchAliases.some(alias => {
      const aliasWords = normalizeForSearch(alias).split(/\s+/);
      return queryWords.every(qw => aliasWords.some(aw => wordMatches(qw, aw)));
    })) {
      score = 80;
    } else if (data.unicodeNameFr) {
      const nameWords = normalizeForSearch(data.unicodeNameFr).split(/\s+/);
      if (queryWords.every(qw => nameWords.some(nw => wordMatches(qw, nw)))) {
        score = 70;
      }
    }
    if (score === 0 && data.unicodeName) {
      const nameWords = normalizeForSearch(data.unicodeName).split(/\s+/);
      if (queryWords.every(qw => nameWords.some(nw => wordMatches(qw, nw)))) {
        score = 50;
      }
    }

    if (score > 0) {
      const codePointNum = parseInt(data.codePoint.replace('U+', ''), 16);
      if (codePointNum >= 0x0020 && codePointNum <= 0x007F) score += 15;
      if (queryWords.some(word => normalizeForSearch(char) === word)) score += 10;
      const lowerChar = char.toLowerCase();
      if (originalQueryWords.includes(lowerChar) || originalQueryWords.includes(char)) score += 50;
      if (originalQueryWords.length === 1 && originalQueryWords[0].length === 1 &&
        (char === originalQueryWords[0] || char.toLowerCase() === originalQueryWords[0].toLowerCase())) {
        score += 100;
      }
      if (char.startsWith('dk:')) score += 30;
      if (char.length === 1 && char === char.toLowerCase() && char !== char.toUpperCase()) score += 5;
      if (data.methods && data.methods.some(m => m.recommended && m.type === 'direct')) score += 10;
      if (data.unicodeNameFr && normalizeForSearch(data.unicodeNameFr).startsWith(normalizedQuery)) score += 15;
      results.push({ char, data, score });
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

function getLayerKeys(layer) {
  const keys = [];
  if (!layer || layer === 'Base') return keys;
  const addAltGrKeys = () => {
    if (getTesterPlatform() === 'mac') {
      keys.push('AltLeft', 'AltRight');
    } else {
      keys.push('AltRight');
    }
  };
  if (layer === 'Shift') keys.push('ShiftLeft');
  else if (layer === 'Caps') keys.push('CapsLock');
  else if (layer === 'Caps+Shift') keys.push('CapsLock', 'ShiftLeft');
  else if (layer === 'AltGr') addAltGrKeys();
  else if (layer === 'Shift+AltGr' || layer === 'AltGr+Shift') {
    keys.push('ShiftLeft');
    addAltGrKeys();
  } else if (layer === 'Caps+AltGr') {
    keys.push('CapsLock');
    addAltGrKeys();
  } else if (layer === 'Caps+Shift+AltGr') {
    keys.push('CapsLock', 'ShiftLeft');
    addAltGrKeys();
  }
  return [...new Set(keys)];
}

function queryKey(keyId) {
  return document.querySelector(`#modal-keyboard-container .key[data-key-id="${keyId}"]`);
}

function clearAllHighlights() {
  document.querySelectorAll('#modal-keyboard-container .key.search-highlight, #modal-keyboard-container .key.search-highlight-dk, #modal-keyboard-container .key.search-highlight-step1, #modal-keyboard-container .key.search-highlight-step2').forEach(k => {
    k.classList.remove('search-highlight', 'search-highlight-dk', 'search-highlight-step1', 'search-highlight-step2');
  });
}

export function highlightSearchMethod(method, keyboard) {
  clearHighlightTimeouts();
  clearAllHighlights();

  if (!method || !keyboard) return;

  if (method.type === 'direct' || method.type === 'deadkey_activation' || !method.type) {
    const isDkActivation = method.type === 'deadkey_activation';
    const highlightClass = isDkActivation ? 'search-highlight-dk' : 'search-highlight';
    const keysToHighlight = [method.key, ...getLayerKeys(method.layer)];

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

    if (dkKey) {
      const dkLookupKey = dkKey.replace('dk_', 'dk:');
      const dkData = characterIndex?.characters[dkLookupKey];
      if (dkData?.methods?.[0]) {
        const activationMethod = dkData.methods.find((candidate) => candidate.recommended) || dkData.methods[0];
        step1Keys.push(activationMethod.key, ...getLayerKeys(activationMethod.layer));
      }
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

        const step2Keys = [method.key, ...getLayerKeys(method.layer)];
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
    const dkName = DEAD_KEY_NAMES_FR[m.deadkey] || DEAD_KEY_NAMES_FR[m.deadKey] || 'Touche morte';
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

  if (result.data.methods && result.data.methods.length > 0) {
    highlightSearchMethod(result.data.methods.find(x => x.recommended) || result.data.methods[0], keyboard);
  }

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
    announceToScreenReaders('Aucun résultat de recherche');
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
      charSpan.textContent = DEAD_KEY_SYMBOLS[result.char] || '◌';
      charSpan.className = 'search-result-char search-result-char--deadkey';
    } else {
      charSpan.textContent = result.char;
      charSpan.className = 'search-result-char';
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'search-result-info';

    const nameSpan = document.createElement('div');
    nameSpan.textContent = result.data.unicodeNameFr || result.data.unicodeName;
    nameSpan.className = 'search-result-name';

    const methodSpan = document.createElement('div');
    methodSpan.className = 'search-result-method';
    if (result.data.methods && result.data.methods.length > 0) {
      const m = result.data.methods.find(x => x.recommended) || result.data.methods[0];
      methodSpan.textContent = formatMethod(m);
    }

    const resultName = result.data.unicodeNameFr || result.data.unicodeName || result.char;
    const resultMethod = methodSpan.textContent ? `, méthode ${methodSpan.textContent}` : '';
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
