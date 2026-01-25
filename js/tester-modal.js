/**
 * AZERTY Global Tester Modal
 * Shared module for keyboard tester functionality
 * Used by index.html and dev.html
 */

import { AZERTYKeyboard } from '../tester/keyboard.js';

// Mobile tap behavior for keyboard preview (only on index page)
export function initKeyboardPreview() {
  const keyboard = document.querySelector('.hero__keyboard');
  if (!keyboard) return;

  // On touch devices: tap to open, tap outside to close
  keyboard.addEventListener('click', function (e) {
    if (window.matchMedia('(hover: none)').matches) {
      e.stopPropagation();
      this.classList.add('is-full');
    }
  });

  // Close when tapping outside
  document.addEventListener('click', function (e) {
    if (window.matchMedia('(hover: none)').matches) {
      if (!keyboard.contains(e.target)) {
        keyboard.classList.remove('is-full');
      }
    }
  });
}

// Main tester modal initialization
export function initTesterModal() {
  // Disable tester on mobile (iOS/Android) - too complex to handle virtual keyboard
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const openBtn = document.getElementById('open-tester-btn');

  if (isMobile) {
    // Hide the tester button on mobile
    if (openBtn) {
      openBtn.style.display = 'none';
    }

    // Add a message explaining desktop-only
    const heroActions = document.querySelector('.hero__actions');
    if (heroActions && !document.getElementById('mobile-tester-notice')) {
      const notice = document.createElement('div');
      notice.id = 'mobile-tester-notice';
      notice.style.cssText = 'background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: var(--space-4);';
      notice.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 8px;">💻</div>
        <div style="font-size: 14px; color: var(--text-secondary);">
          Le testeur interactif est disponible uniquement sur ordinateur (Windows, macOS, Linux).
        </div>
      `;
      heroActions.insertBefore(notice, heroActions.firstChild);
    }

    // Don't initialize the modal on mobile
    return;
  }

  const modal = document.getElementById('tester-modal');
  if (!modal) return;
  
  const closeBtn = modal.querySelector('.tester-modal__close');
  const overlay = modal.querySelector('.tester-modal__overlay');
  const outputEl = document.getElementById('modal-output');
  let keyboard = null;

  // Lesson state (declared early for onKeyClick access)
  let currentMode = 'libre';
  let currentLessonIndex = -1;

  const DEAD_KEY_NAMES_FR = {
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

  function openModal() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (!keyboard) {
      keyboard = new AZERTYKeyboard('#modal-keyboard-container', {
        layoutUrl: 'tester/azerty-global.json',
        onKeyClick: (char, keyId) => {
          // Determine target element based on current mode
          const targetEl = (currentMode === 'lessons' && currentLessonIndex >= 0)
            ? document.getElementById('lesson-input')
            : outputEl;

          const selection = window.getSelection();
          if (selection.rangeCount > 0 && targetEl.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(char));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            targetEl.textContent += char;
          }
          targetEl.scrollTop = targetEl.scrollHeight;

          // Trigger input event for lesson mode feedback
          if (targetEl.id === 'lesson-input') {
            targetEl.dispatchEvent(new Event('input'));
          }
        },
        onStateChange: (state) => {
          document.getElementById('modal-status-shift').classList.toggle('on', state.shift);
          document.getElementById('modal-status-caps').classList.toggle('on', state.caps);
          document.getElementById('modal-status-altgr').classList.toggle('on', state.altgr);
          document.getElementById('modal-status-deadkey').classList.toggle('on', !!state.activeDeadKey);

          const dkName = state.activeDeadKey
            ? (DEAD_KEY_NAMES_FR[state.activeDeadKey] || state.activeDeadKey)
            : '-';
          document.getElementById('modal-deadkey-name').textContent = dkName;

          // Refresh tooltips after keyboard display updates
          setTimeout(() => createModalCharacterTooltips(), 50);
        }
      });

      // Add platform selector buttons to status bar
      setTimeout(() => {
        const statusBar = document.querySelector('.tester-modal .status-bar');
        if (statusBar && !document.querySelector('.platform-selector')) {
          const platformSelector = document.createElement('div');
          platformSelector.className = 'platform-selector';
          platformSelector.style.cssText = 'display: flex; gap: 6px; margin-left: auto;';

          const platforms = [
            { id: 'windows', label: '🪟 Windows', value: 'windows' },
            { id: 'mac', label: '🍎 macOS', value: 'mac' },
            { id: 'linux', label: '🐧 Linux', value: 'linux' }
          ];

          platforms.forEach(platform => {
            const btn = document.createElement('button');
            btn.className = 'platform-btn';
            btn.dataset.platform = platform.value;
            btn.textContent = platform.label;
            btn.style.cssText = 'padding: 4px 10px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-muted); border-radius: 6px; cursor: pointer; font-size: 12px; transition: all 0.2s; opacity: 0.5;';

            // Detect current platform and set active
            const detectedPlatform = typeof navigator !== 'undefined'
              ? (/Mac|iPhone|iPad|iPod/.test(navigator.platform) ? 'mac'
                : /Linux/.test(navigator.platform) ? 'linux'
                  : 'windows')
              : 'windows';

            if (platform.value === detectedPlatform) {
              btn.style.opacity = '1';
              btn.style.color = 'var(--color-primary)';
              btn.style.borderColor = 'var(--color-primary)';
            }

            btn.addEventListener('click', () => {
              // Update all buttons
              document.querySelectorAll('.platform-btn').forEach(b => {
                b.style.opacity = '0.5';
                b.style.color = 'var(--text-muted)';
                b.style.borderColor = 'var(--border-color)';
              });

              // Highlight selected
              btn.style.opacity = '1';
              btn.style.color = 'var(--color-primary)';
              btn.style.borderColor = 'var(--color-primary)';

              // Update keyboard
              keyboard.setPlatform(platform.value);

              // Update AltGr label based on platform
              const altgrLabel = document.getElementById('modal-status-altgr');
              if (altgrLabel) {
                altgrLabel.textContent = platform.value === 'mac' ? '● Option' : '● AltGr';
              }
            });

            platformSelector.appendChild(btn);
          });

          statusBar.appendChild(platformSelector);
        }
      }, 100);

      // Sync output and search widths with keyboard after layout loads
      setTimeout(() => {
        const keyboardEl = document.querySelector('#modal-keyboard-container .azerty-keyboard');
        const outputWrapper = document.querySelector('.tester-modal__output');
        const searchContainer = document.querySelector('.modal-search-container');
        if (keyboardEl && outputWrapper) {
          const kbWidth = keyboardEl.offsetWidth + 'px';
          outputWrapper.style.width = kbWidth;
          outputWrapper.style.maxWidth = kbWidth;
          if (searchContainer) {
            searchContainer.style.width = kbWidth;
            searchContainer.style.maxWidth = kbWidth;
          }
        }
      }, 100);
    }

    // Mobile detection and virtual keyboard prevention
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let hasPhysicalKeyboard = false;

    if (isMobileDevice) {
      // Get all input elements in the tester
      const searchInput = document.getElementById('modal-search-input');
      const lessonInput = document.getElementById('lesson-input');

      // Prevent virtual keyboard by using inputmode and preventing focus
      const preventVirtualKeyboard = (el) => {
        if (el) {
          el.setAttribute('inputmode', 'none');
          // Blur immediately if focused (prevents keyboard from opening)
          el.addEventListener('focus', (e) => {
            if (!hasPhysicalKeyboard) {
              e.target.blur();
            }
          });
        }
      };

      preventVirtualKeyboard(outputEl);
      preventVirtualKeyboard(searchInput);
      preventVirtualKeyboard(lessonInput);

      // Add warning message for mobile users
      const existingWarning = modal.querySelector('.mobile-keyboard-warning');
      if (!existingWarning) {
        const warning = document.createElement('div');
        warning.className = 'mobile-keyboard-warning';
        warning.style.cssText = 'background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; margin-bottom: 16px; text-align: center;';
        warning.innerHTML = `
          <div style="font-size: 1.5rem; margin-bottom: 8px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px; color: #f59e0b;">Clavier physique requis</div>
          <div style="font-size: 14px; color: var(--text-secondary);">
            Le testeur nécessite un clavier physique (USB ou Bluetooth).<br>
            Connectez un clavier pour utiliser le testeur.
          </div>
        `;

        const modalContent = modal.querySelector('.tester-modal__content');
        modalContent.insertBefore(warning, modalContent.firstChild);
      }

      // Detect physical keyboard on first keydown
      const detectPhysicalKeyboard = (e) => {
        if (e.code && !hasPhysicalKeyboard) {
          hasPhysicalKeyboard = true;

          // Remove inputmode from all inputs
          if (outputEl) outputEl.removeAttribute('inputmode');
          if (searchInput) searchInput.removeAttribute('inputmode');
          if (lessonInput) lessonInput.removeAttribute('inputmode');

          // Remove warning
          const warning = modal.querySelector('.mobile-keyboard-warning');
          if (warning) {
            warning.style.transition = 'opacity 0.3s';
            warning.style.opacity = '0';
            setTimeout(() => warning.remove(), 300);
          }

          // Focus the output element now that physical keyboard is detected
          outputEl.focus();

          // Remove this listener after detection
          document.removeEventListener('keydown', detectPhysicalKeyboard);
        }
      };

      document.addEventListener('keydown', detectPhysicalKeyboard);

      // Don't auto-focus on mobile without physical keyboard
      return;
    }

    outputEl.focus();
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /**
   * Remap Mac key codes to match Windows/Linux layout
   * On Mac, Backquote (E00) and IntlBackslash (B00) are physically swapped
   * Also remap AltLeft to AltRight so Option key works as AltGr
   */
  function remapMacKeyCode(code) {
    // Only remap when Mac platform is detected
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    if (!isMac) return code;

    // Swap E00 ↔ B00 to match Windows/Linux physical layout
    if (code === 'Backquote') return 'IntlBackslash';
    if (code === 'IntlBackslash') return 'Backquote';

    // Remap AltLeft to AltRight so Option key works as AltGr
    if (code === 'AltLeft') return 'AltRight';

    return code;
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.code === 'Escape') {
        closeModal();
        e.preventDefault();
        return;
      }

      // Handle keyboard input in modal
      if (keyboard) {
        // Remap Mac key codes to match Windows/Linux layout
        const keyCode = remapMacKeyCode(e.code);

        keyboard.pressKey(keyCode);

        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          keyboard.setShift(true);
          e.preventDefault();
          return;
        }
        if (e.code === 'CapsLock') {
          // Read actual Caps Lock state from browser (works correctly on all platforms)
          const capsLockActive = e.getModifierState('CapsLock');
          keyboard.setCaps(capsLockActive);
          e.preventDefault();
          return;
        }
        if (e.code === 'AltRight') {
          keyboard.setAltGr(true);
          e.preventDefault();
          return;
        }
        // Allow Ctrl shortcuts, but not when AltGr is pressed (Windows quirk)
        if ((e.ctrlKey && !e.altKey) || e.metaKey) {
          return;
        }
        if (e.code === 'AltLeft') {
          e.preventDefault();
          return;
        }
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          return;
        }
        if (e.code === 'Backspace') {
          if (keyboard.state?.activeDeadKey) {
            keyboard.clearDeadKey();
          } else {
            document.execCommand('delete', false);
          }
          e.preventDefault();
          return;
        }
        if (e.code === 'Delete') {
          if (keyboard.state?.activeDeadKey) {
            keyboard.clearDeadKey();
            e.preventDefault();
          }
          // If no dead key, let default browser behavior handle the deletion
          return;
        }
        if (e.code === 'Enter') {
          document.execCommand('insertLineBreak', false);
          outputEl.scrollTop = outputEl.scrollHeight;
          e.preventDefault();
          return;
        }

        keyboard.handleKeyClick(keyCode, true); // skipAutoRelease=true for physical keyboard
        e.preventDefault();
      }
    }
  });

  document.addEventListener('keyup', (e) => {
    if (modal.style.display === 'flex' && keyboard) {
      keyboard.releaseKey(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keyboard.setShift(false);
      }
      if (e.code === 'AltRight') {
        keyboard.setAltGr(false);
      }
    }
  });

  // Block native text input in modal - we handle all character input through the keyboard
  outputEl.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
      e.preventDefault();
    }
  });

  // Clean output element when empty so placeholder reappears
  outputEl.addEventListener('input', () => {
    // Remove any leftover <br> or whitespace to make :empty work
    if (outputEl.textContent.trim() === '') {
      outputEl.innerHTML = '';
    }
  });

  // ========================================
  // Character Search Functionality
  // ========================================

  let characterIndex = null;
  const searchInput = document.getElementById('modal-search-input');
  const searchResults = document.getElementById('modal-search-results');
  let searchDebounceTimer = null;
  let highlightTimeouts = [];

  // Load character index
  async function loadCharacterIndex() {
    try {
      const response = await fetch('tester/character-index.json');
      if (!response.ok) throw new Error('Failed to load character index');
      characterIndex = await response.json();
      console.log(`Character index loaded: ${characterIndex.totalCharacters} characters`);
    } catch (error) {
      console.error('Error loading character index:', error);
    }
  }

  // Load on first modal open
  openBtn.addEventListener('click', async () => {
    if (!characterIndex) {
      await loadCharacterIndex();
      setTimeout(() => createModalCharacterTooltips(), 100);
    }
  }, { once: true });

  // Create tooltips showing character names on hover
  function createModalCharacterTooltips() {
    if (!characterIndex) return;

    // Dead key symbols to French names mapping
    const deadKeySymbolNames = {
      '^': 'Touche morte circonflexe',
      '¨': 'Touche morte tréma',
      '´': 'Touche morte accent aigu',
      '`': 'Touche morte accent grave',
      '~': 'Touche morte tilde',
      'ˇ': 'Touche morte caron',
      '˛': 'Touche morte ogonek',
      '˙': 'Touche morte point en chef',
      '˝': 'Touche morte double accent aigu',
      '˘': 'Touche morte brève',
      '¯': 'Touche morte macron',
      '¸': 'Touche morte cédille',
      '˚': 'Touche morte rond en chef',
      '¤': 'Touche morte monnaies',
      '±': 'Touche morte scientifique',
      '→': 'Touche morte symboles divers',
      'μ': 'Touche morte grec',
      'я': 'Touche morte cyrillique',
      '§': 'Touche morte ponctuation',
      'ʁ': 'Touche morte phonétique',
      'ə': 'Touche morte latin étendu'
    };

    // Add title attribute to each character span
    document.querySelectorAll('#modal-keyboard-container .key .key-char').forEach(charSpan => {
      const char = charSpan.textContent.trim();
      if (!char || char.length === 0) return;

      // Check dead key symbols first
      if (deadKeySymbolNames[char]) {
        charSpan.title = deadKeySymbolNames[char];
        charSpan.style.cursor = 'help';
        return;
      }

      // Look up character in index
      const charData = characterIndex.characters[char];
      if (charData) {
        const name = charData.unicodeNameFr || charData.unicodeName || char;
        charSpan.title = name;
        charSpan.style.cursor = 'help';
      }
    });
  }

  // Normalize text for search (remove accents, lowercase)
  function normalizeForSearch(text) {
    if (!text) return '';
    return text.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  // Search characters
  function searchCharacters(query) {
    if (!characterIndex || !query || query.length < 1) return [];

    const normalizedQuery = normalizeForSearch(query);
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    const originalQueryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const results = [];

    for (const [char, data] of Object.entries(characterIndex.characters)) {
      let score = 0;

      // Exact character match (highest priority)
      if (char === query) {
        score = 100;
      }
      // Character match (case-insensitive)
      else if (char.toLowerCase() === query.toLowerCase()) {
        score = 90;
      }
      // French alias match
      else if (data.frenchAliases && data.frenchAliases.some(alias => {
        const aliasWords = normalizeForSearch(alias).split(/\s+/);
        return queryWords.every(qw => aliasWords.some(aw => aw === qw || aw.startsWith(qw)));
      })) {
        score = 80;
      }
      // French name contains all query words
      else if (data.unicodeNameFr) {
        const nameWords = normalizeForSearch(data.unicodeNameFr).split(/\s+/);
        if (queryWords.every(qw => nameWords.some(nw => nw === qw || nw.startsWith(qw)))) {
          score = 70;
        }
      }
      // Unicode name contains all query words
      if (score === 0 && data.unicodeName) {
        const nameWords = normalizeForSearch(data.unicodeName).split(/\s+/);
        if (queryWords.every(qw => nameWords.some(nw => nw === qw || nw.startsWith(qw)))) {
          score = 50;
        }
      }

      if (score > 0) {
        // Bonus for basic Latin
        const codePointNum = parseInt(data.codePoint.replace('U+', ''), 16);
        if (codePointNum >= 0x0020 && codePointNum <= 0x007F) {
          score += 15;
        }
        // Bonus if character matches query word
        if (queryWords.some(word => normalizeForSearch(char) === word)) {
          score += 10;
        }
        // Bonus for exact accent match (the typed character is the result)
        const lowerChar = char.toLowerCase();
        if (originalQueryWords.includes(lowerChar) || originalQueryWords.includes(char)) {
          score += 50;
        }
        // Massive bonus for exact single character search
        if (originalQueryWords.length === 1 && originalQueryWords[0].length === 1 &&
          (char === originalQueryWords[0] || char.toLowerCase() === originalQueryWords[0].toLowerCase())) {
          score += 100;
        }
        // Bonus for dead key activation characters (dk:name)
        if (char.startsWith('dk:')) {
          score += 30;
        }
        results.push({ char, data, score });
      }
    }

    // Sort by score
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Then alphabetically
      return a.char.localeCompare(b.char);
    });

    return results.slice(0, 20);
  }

  // Highlight method on keyboard
  function highlightSearchMethod(method) {
    // Clear any existing highlights
    highlightTimeouts.forEach(t => clearTimeout(t));
    highlightTimeouts = [];
    document.querySelectorAll('#modal-keyboard-container .key.search-highlight, #modal-keyboard-container .key.search-highlight-step1, #modal-keyboard-container .key.search-highlight-step2').forEach(k => {
      k.classList.remove('search-highlight', 'search-highlight-step1', 'search-highlight-step2');
    });

    if (!method || !keyboard) return;

    // Simple keypress (direct method)
    if (method.type === 'direct' || !method.type) {
      const keysToHighlight = [method.key];

      // Add layer modifier if needed
      if (method.layer === 'Shift' || method.layer === 'Caps') {
        keysToHighlight.push('ShiftLeft');
      } else if (method.layer === 'AltGr') {
        keysToHighlight.push('AltRight');
      } else if (method.layer === 'AltGr+Shift') {
        keysToHighlight.push('AltRight', 'ShiftLeft');
      }

      // Apply highlights
      keysToHighlight.forEach(keyId => {
        const keyEl = document.querySelector(`#modal-keyboard-container .key[data-key-id="${keyId}"]`);
        if (keyEl) {
          keyEl.classList.add('search-highlight');
        }
      });

      // Auto-clear after 3 seconds
      highlightTimeouts.push(setTimeout(() => {
        document.querySelectorAll('#modal-keyboard-container .key.search-highlight').forEach(k => {
          k.classList.remove('search-highlight');
        });
      }, 3000));
    }
    // Dead key sequence - two steps
    else if (method.type === 'deadkey') {
      const dkKey = method.deadKey || method.deadkey;
      let step1Keys = [];

      // STEP 1: Highlight the dead key
      if (dkKey) {
        // Convert dk_tilde to dk:tilde format
        const dkLookupKey = dkKey.replace('dk_', 'dk:');
        const dkData = characterIndex?.characters[dkLookupKey];
        if (dkData && dkData.methods && dkData.methods[0]) {
          step1Keys.push(dkData.methods[0].key);
          if (dkData.methods[0].layer === 'AltGr') {
            step1Keys.push('AltRight');
          } else if (dkData.methods[0].layer === 'AltGr+Shift') {
            step1Keys.push('AltRight', 'ShiftLeft');
          }
        }
      }

      // Apply step 1 highlights (with badge "1")
      step1Keys.forEach(keyId => {
        const keyEl = document.querySelector(`#modal-keyboard-container .key[data-key-id="${keyId}"]`);
        if (keyEl) {
          keyEl.classList.add('search-highlight-step1');
        }
      });

      // STEP 2: After delay, highlight the base key
      if (method.key) {
        highlightTimeouts.push(setTimeout(() => {
          // Clear step 1
          document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step1').forEach(k => {
            k.classList.remove('search-highlight-step1');
          });

          // Apply step 2 (with badge "2")
          const baseKey = document.querySelector(`#modal-keyboard-container .key[data-key-id="${method.key}"]`);
          if (baseKey) {
            baseKey.classList.add('search-highlight-step2');
          }

          // Also show modifiers for step 2 if needed
          if (method.layer === 'Shift') {
            const shiftKey = document.querySelector(`#modal-keyboard-container .key[data-key-id="ShiftLeft"]`);
            if (shiftKey) shiftKey.classList.add('search-highlight-step2');
          }
        }, 1200));

        // Auto-clear step 2 after additional time
        highlightTimeouts.push(setTimeout(() => {
          document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step2').forEach(k => {
            k.classList.remove('search-highlight-step2');
          });
        }, 4000));
      } else {
        // If no base key (just dead key itself), auto-clear step 1
        highlightTimeouts.push(setTimeout(() => {
          document.querySelectorAll('#modal-keyboard-container .key.search-highlight-step1').forEach(k => {
            k.classList.remove('search-highlight-step1');
          });
        }, 3000));
      }
    }
  }

  // Display search results
  function displaySearchResults(results) {
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.hidden = true;
      return;
    }

    searchResults.innerHTML = '';
    searchResults.hidden = false;

    results.forEach(result => {
      const item = document.createElement('div');
      item.style.cssText = 'padding: 10px 14px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-color); transition: background 0.15s;';

      const charSpan = document.createElement('span');
      
      // Dead key display mapping
      const deadKeySymbols = {
        'dk:circumflex': '^',
        'dk:diaeresis': '¨',
        'dk:acute': '´',
        'dk:grave': '`',
        'dk:tilde': '~',
        'dk:caron': 'ˇ',
        'dk:ogonek': '˛',
        'dk:dot_above': '˙',
        'dk:double_acute': '˝',
        'dk:breve': '˘',
        'dk:macron': '¯',
        'dk:cedilla': '¸',
        'dk:ring_above': '˚',
        'dk:currency': '¤',
        'dk:science': '±',
        'dk:symbols': '→',
        'dk:greek': 'μ',
        'dk:cyrillic': 'я',
        'dk:punctuation': '§',
        'dk:phonetic': 'ʁ',
        'dk:extended_latin': 'ə',
        'dk:dot_below': '.',
        'dk:horn': '̛',
        'dk:hook': '̉',
        'dk:stroke': '/',
        'dk:horizontal_stroke': '−',
        'dk:inverted_breve': '̑',
        'dk:comma_below': ',',
        'dk:double_grave': '̏'
      };
      
      // Check if it's a dead key result
      if (result.char.startsWith('dk:')) {
        const symbol = deadKeySymbols[result.char] || '◌';
        charSpan.textContent = symbol;
        charSpan.style.cssText = 'font-size: 20px; width: 32px; text-align: center; font-family: monospace; color: var(--text-dead-key, #ff6b6b);';
      } else {
        charSpan.textContent = result.char;
        charSpan.style.cssText = 'font-size: 20px; width: 32px; text-align: center; font-family: monospace;';
      }

      const infoDiv = document.createElement('div');
      infoDiv.style.cssText = 'flex: 1; min-width: 0;';

      const nameSpan = document.createElement('div');
      nameSpan.textContent = result.data.unicodeNameFr || result.data.unicodeName;
      nameSpan.style.cssText = 'font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

      const methodSpan = document.createElement('div');
      if (result.data.methods && result.data.methods.length > 0) {
        const m = result.data.methods.find(x => x.recommended) || result.data.methods[0];
        let methodText = m.key || '';
        if (m.layer && m.layer !== 'Base') {
          methodText = m.layer + ' + ' + methodText;
        }
        if (m.type === 'deadkey') {
          methodText = `Touche morte + ${m.key}`;
        }
        methodSpan.textContent = methodText;
      }
      methodSpan.style.cssText = 'font-size: 11px; color: var(--text-muted);';

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(methodSpan);
      item.appendChild(charSpan);
      item.appendChild(infoDiv);

      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--bg-secondary)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });

      item.addEventListener('click', () => {
        // Insert character
        outputEl.textContent += result.char;
        outputEl.scrollTop = outputEl.scrollHeight;

        // Highlight method
        if (result.data.methods && result.data.methods.length > 0) {
          highlightSearchMethod(result.data.methods.find(x => x.recommended) || result.data.methods[0]);
        }

        // Clear search
        searchInput.value = '';
        searchResults.hidden = true;
      });

      searchResults.appendChild(item);
    });
  }

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length > 0) {
          const results = searchCharacters(query);
          displaySearchResults(results);
        } else {
          searchResults.hidden = true;
        }
      }, 150);
    });

    // Close results on blur (with delay to allow click)
    searchInput.addEventListener('blur', () => {
      setTimeout(() => {
        searchResults.hidden = true;
      }, 200);
    });

    // Stop propagation to prevent closing modal
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchResults.hidden = true;
        searchInput.blur();
      }
    });
  }

  // ========================================
  // Lesson Mode Functionality
  // ========================================

  const tabLibre = document.getElementById('tab-libre');
  const tabLessons = document.getElementById('tab-lessons');
  const modeLibre = document.getElementById('mode-libre');
  const modeLessons = document.getElementById('mode-lessons');
  const moduleSelect = document.getElementById('lesson-module-select');
  const lessonList = document.getElementById('lesson-list');
  const lessonExercise = document.getElementById('lesson-exercise');
  const lessonWelcome = document.getElementById('lesson-welcome');
  const lessonTitle = document.getElementById('lesson-title');
  const lessonProgress = document.getElementById('lesson-progress');
  const lessonInstruction = document.getElementById('lesson-instruction');
  const lessonTarget = document.getElementById('lesson-target');
  const lessonInput = document.getElementById('lesson-input');
  const btnPrev = document.getElementById('lesson-prev');
  const btnNext = document.getElementById('lesson-next');
  const btnRestart = document.getElementById('lesson-restart');
  const btnHint = document.getElementById('lesson-hint');

  let lessonsData = null;
  let currentModuleIndex = -1;
  let currentExerciseIndex = 0;

  // Load lessons JSON
  async function loadLessons() {
    try {
      const response = await fetch('tester/lessons.json');
      if (!response.ok) throw new Error('Failed to load lessons');
      lessonsData = await response.json();
      populateModuleSelect();
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  }

  // Switch between modes
  function switchToMode(mode) {
    currentMode = mode;
    if (mode === 'libre') {
      tabLibre.style.background = 'var(--color-accent)';
      tabLibre.style.color = 'var(--color-primary-dark)';
      tabLibre.style.border = 'none';
      tabLessons.style.background = 'var(--bg-secondary)';
      tabLessons.style.color = 'var(--text-primary)';
      tabLessons.style.border = '1px solid var(--border-color)';
      modeLibre.style.display = 'block';
      modeLessons.style.display = 'none';
      outputEl.focus();
    } else {
      tabLessons.style.background = 'var(--color-accent)';
      tabLessons.style.color = 'var(--color-primary-dark)';
      tabLessons.style.border = 'none';
      tabLibre.style.background = 'var(--bg-secondary)';
      tabLibre.style.color = 'var(--text-primary)';
      tabLibre.style.border = '1px solid var(--border-color)';
      modeLessons.style.display = 'block';
      modeLibre.style.display = 'none';

      // Load lessons if not loaded
      if (!lessonsData) {
        loadLessons();
      }
      // Load character index for hint functionality
      if (!characterIndex) {
        loadCharacterIndex();
      }
    }
  }

  if (tabLibre) tabLibre.addEventListener('click', () => switchToMode('libre'));
  if (tabLessons) tabLessons.addEventListener('click', () => switchToMode('lessons'));

  // Populate module select dropdown
  function populateModuleSelect() {
    if (!moduleSelect || !lessonsData) return;
    moduleSelect.innerHTML = '<option value="">Choisir un module...</option>';
    lessonsData.modules.forEach((module, idx) => {
      const option = document.createElement('option');
      option.value = idx;
      option.textContent = `${module.icon} ${module.title}`;
      moduleSelect.appendChild(option);
    });
  }

  // Module selection handler
  if (moduleSelect) {
    moduleSelect.addEventListener('change', (e) => {
      const idx = parseInt(e.target.value);
      if (isNaN(idx)) {
        currentModuleIndex = -1;
        if (lessonList) lessonList.innerHTML = '';
        if (lessonExercise) lessonExercise.style.display = 'none';
        if (lessonWelcome) lessonWelcome.style.display = 'block';
        return;
      }
      currentModuleIndex = idx;
      currentLessonIndex = -1;
      displayLessonList();
    });
  }

  // Display lesson list for selected module
  function displayLessonList() {
    if (!lessonsData || !lessonList) return;
    const module = lessonsData.modules[currentModuleIndex];
    lessonList.innerHTML = '';

    module.lessons.forEach((lesson, idx) => {
      const btn = document.createElement('button');
      btn.textContent = lesson.title;
      btn.style.cssText = 'padding: 6px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-card); color: var(--text-primary); font-size: 12px; cursor: pointer; transition: all 0.2s;';
      btn.addEventListener('click', () => startLesson(idx));
      btn.addEventListener('mouseenter', () => {
        // Don't change color for active button (would make text invisible on accent background)
        if (currentLessonIndex !== idx) {
          btn.style.borderColor = 'var(--color-accent)';
          btn.style.color = 'var(--color-accent)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (currentLessonIndex !== idx) {
          btn.style.borderColor = 'var(--border-color)';
          btn.style.color = 'var(--text-primary)';
        }
      });
      lessonList.appendChild(btn);
    });

    if (lessonExercise) lessonExercise.style.display = 'none';
    if (lessonWelcome) lessonWelcome.style.display = 'block';
  }

  // Start a lesson
  function startLesson(lessonIdx) {
    currentLessonIndex = lessonIdx;
    currentExerciseIndex = 0;

    // Highlight active lesson button
    if (lessonList) {
      [...lessonList.children].forEach((btn, idx) => {
        if (idx === lessonIdx) {
          btn.style.background = 'var(--color-accent)';
          btn.style.color = 'var(--color-primary-dark)';
          btn.style.borderColor = 'var(--color-accent)';
        } else {
          btn.style.background = 'var(--bg-card)';
          btn.style.color = 'var(--text-primary)';
          btn.style.borderColor = 'var(--border-color)';
        }
      });
    }

    if (lessonWelcome) lessonWelcome.style.display = 'none';
    if (lessonExercise) lessonExercise.style.display = 'block';
    displayExercise();
  }

  // Track current line in multi-line exercises  
  let currentLineIndex = 0;

  // Display current exercise
  function displayExercise() {
    if (!lessonsData) return;
    const module = lessonsData.modules[currentModuleIndex];
    const lesson = module.lessons[currentLessonIndex];
    const exercise = lesson.exercises[currentExerciseIndex];

    // Reset line index for multi-line exercises
    currentLineIndex = 0;

    if (lessonTitle) lessonTitle.textContent = `${module.icon} ${lesson.title}`;
    if (lessonProgress) lessonProgress.textContent = `Exercice ${currentExerciseIndex + 1}/${lesson.exercises.length}`;
    if (lessonInstruction) lessonInstruction.textContent = exercise.instruction;

    // Format target text with styling - newlines shown as visible break indicators
    if (lessonTarget) {
      lessonTarget.innerHTML = exercise.content.split('').map(char => {
        if (char === '\n') return '<span class="target-char target-newline">↵</span><br>';
        return `<span class="target-char">${char === ' ' ? '&nbsp;' : char}</span>`;
      }).join('');
    }

    if (lessonInput) {
      lessonInput.innerHTML = '';
      lessonInput.focus();
    }

    // Update prev/next buttons
    if (btnPrev) {
      btnPrev.disabled = currentExerciseIndex === 0 && currentLessonIndex === 0;
      btnPrev.style.opacity = btnPrev.disabled ? '0.5' : '1';
    }
  }

  // Handle input in lesson mode
  if (lessonInput) {
    lessonInput.addEventListener('input', () => {
      if (!lessonsData) return;
      const fullContent = lessonsData.modules[currentModuleIndex].lessons[currentLessonIndex].exercises[currentExerciseIndex].content;
      const lines = fullContent.split('\n');
      const currentTargetLine = lines[currentLineIndex] || '';
      const inputText = lessonInput.textContent;

      // Get only the target chars for the current line
      const allTargetChars = [...lessonTarget.querySelectorAll('.target-char')];

      // Calculate offset for current line
      let charOffset = 0;
      for (let i = 0; i < currentLineIndex; i++) {
        charOffset += lines[i].length + 1; // +1 for \n
      }

      // Get chars for current line only
      const currentLineChars = allTargetChars.slice(charOffset, charOffset + currentTargetLine.length);

      // Compare each character of current line
      [...inputText].forEach((char, idx) => {
        if (idx < currentLineChars.length) {
          if (char === currentTargetLine[idx]) {
            currentLineChars[idx].style.color = '#22c55e'; // Green for correct
            currentLineChars[idx].style.textDecoration = 'none';
          } else {
            currentLineChars[idx].style.color = '#ef4444'; // Red for incorrect
            currentLineChars[idx].style.textDecoration = 'underline';
          }
        }
      });

      // Reset styles for untyped characters in current line
      for (let i = inputText.length; i < currentLineChars.length; i++) {
        currentLineChars[i].style.color = 'var(--text-primary)';
        currentLineChars[i].style.textDecoration = 'none';
      }

      // Check if current line is complete
      if (inputText === currentTargetLine) {
        // Show success feedback briefly
        lessonInput.style.borderColor = '#22c55e';

        setTimeout(() => {
          lessonInput.style.borderColor = 'var(--color-accent)';
          lessonInput.textContent = ''; // Clear input

          if (currentLineIndex < lines.length - 1) {
            // Move to next line
            currentLineIndex++;
            // Mark newline char as done
            const newlineIdx = charOffset + currentTargetLine.length;
            if (allTargetChars[newlineIdx]) {
              allTargetChars[newlineIdx].style.color = '#22c55e';
            }
          } else {
            // All lines complete - auto-advance
            currentLineIndex = 0; // Reset for next exercise
            const lessonData = lessonsData.modules[currentModuleIndex].lessons[currentLessonIndex];

            if (currentExerciseIndex < lessonData.exercises.length - 1) {
              // Move to next exercise in current lesson
              currentExerciseIndex++;
              displayExercise();
            } else {
              // All exercises complete - move to next lesson
              const currentModule = lessonsData.modules[currentModuleIndex];
              if (currentLessonIndex < currentModule.lessons.length - 1) {
                // Next lesson in same module
                currentLessonIndex++;
                currentExerciseIndex = 0;
                setTimeout(() => {
                  startLesson(currentLessonIndex);
                }, 500);
              } else {
                // Lesson complete - show celebration
                lessonInput.textContent = '🎉 Leçon terminée !';
                lessonInput.style.textAlign = 'center';
                lessonInput.style.color = '#22c55e';
              }
            }
          }
        }, 300);
      }
    });

    // Block native input in lesson input
    lessonInput.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'insertText' || e.inputType === 'insertCompositionText') {
        e.preventDefault();
      }
    });

    // Handle physical keyboard in lesson mode
    lessonInput.addEventListener('keydown', (e) => {
      // Stop propagation to prevent document keydown handler from also processing this
      e.stopPropagation();

      // Block native shortcuts except backspace
      if (e.code === 'Escape') {
        e.preventDefault();
        return;
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        return;
      }
      // Handle Enter - insert newline for multiline exercises
      if (e.code === 'Enter') {
        e.preventDefault();
        // Insert newline character
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode('\n'));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          lessonInput.textContent += '\n';
        }
        lessonInput.dispatchEvent(new Event('input'));
        return;
      }

      // Remap Mac key codes to match Windows/Linux layout
      const keyCode = remapMacKeyCode(e.code);

      // Handle modifiers
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keyboard?.setShift(true);
        e.preventDefault();
        return;
      }
      if (e.code === 'CapsLock') {
        // Read actual Caps Lock state from browser (works correctly on all platforms)
        const capsLockActive = e.getModifierState('CapsLock');
        keyboard?.setCaps(capsLockActive);
        e.preventDefault();
        return;
      }
      if (e.code === 'AltRight') {
        keyboard?.setAltGr(true);
        e.preventDefault();
        return;
      }

      // Allow Ctrl shortcuts
      if ((e.ctrlKey && !e.altKey) || e.metaKey) {
        return;
      }

      // Handle backspace
      if (e.code === 'Backspace') {
        if (keyboard?.state?.activeDeadKey) {
          keyboard.clearDeadKey();
          e.preventDefault();
        }
        // Otherwise let default backspace work
        return;
      }

      // Arrow keys - let them work normally
      if (e.code.startsWith('Arrow')) {
        return;
      }

      // Process through AZERTY keyboard
      if (keyboard) {
        keyboard.handleKeyClick(keyCode, true);
        e.preventDefault();
      }
    });

    // Handle keyup for lesson input
    lessonInput.addEventListener('keyup', (e) => {
      if (keyboard) {
        // Remap Mac key codes to match Windows/Linux layout
        const keyCode = remapMacKeyCode(e.code);
        keyboard.releaseKey(keyCode);
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          keyboard.setShift(false);
        }
        if (e.code === 'AltRight') {
          keyboard.setAltGr(false);
        }
      }
    });
  }

  // Navigation buttons
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (!lessonsData) return;
      const lesson = lessonsData.modules[currentModuleIndex].lessons[currentLessonIndex];
      if (currentExerciseIndex < lesson.exercises.length - 1) {
        currentExerciseIndex++;
        displayExercise();
      } else if (currentLessonIndex < lessonsData.modules[currentModuleIndex].lessons.length - 1) {
        // Next lesson in module
        startLesson(currentLessonIndex + 1);
      } else if (currentModuleIndex < lessonsData.modules.length - 1) {
        // Next module
        moduleSelect.value = currentModuleIndex + 1;
        moduleSelect.dispatchEvent(new Event('change'));
        startLesson(0);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (!lessonsData) return;
      if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        displayExercise();
      } else if (currentLessonIndex > 0) {
        currentLessonIndex--;
        const prevLesson = lessonsData.modules[currentModuleIndex].lessons[currentLessonIndex];
        currentExerciseIndex = prevLesson.exercises.length - 1;
        startLesson(currentLessonIndex);
      }
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener('click', () => {
      currentExerciseIndex = 0;
      displayExercise();
    });
  }

  // Hint button - highlight keys for current exercise characters
  if (btnHint) {
    btnHint.addEventListener('click', () => {
      if (!lessonsData || !characterIndex) return;
      const lesson = lessonsData.modules[currentModuleIndex].lessons[currentLessonIndex];
      const exercise = lesson.exercises[currentExerciseIndex];

      // Check if exercise has a specific hintMethod (for Method 2 exercises)
      if (exercise.hintMethod) {
        const { deadKey, baseChar } = exercise.hintMethod;

        // Find key code for base char
        const baseCharData = characterIndex?.characters[baseChar];
        if (baseCharData && baseCharData.methods && baseCharData.methods.length > 0) {
          const baseMethod = baseCharData.methods[0];

          // Create method object with correct property names for highlightSearchMethod
          const customMethod = {
            type: 'deadkey',
            deadkey: deadKey,  // lowercase 'deadkey' to match highlightSearchMethod
            key: baseMethod.key,  // the physical key code
            layer: baseMethod.layer || 'Base'  // layer for the base char
          };

          highlightSearchMethod(customMethod);
        }
        return;
      }

      // Standard hint: use character-index.json data
      const currentChars = lesson.characters || [];
      if (currentChars.length === 0) return;

      // Find the first character that hasn't been typed yet
      // Use currentLineIndex which tracks the actual line being typed
      const inputText = lessonInput.textContent;
      const targetLines = exercise.content.split('\n');

      // Use the global currentLineIndex variable (set by the input handler)
      const currentTargetLine = targetLines[currentLineIndex] || targetLines[0] || '';

      // Find next char in current line
      const nextCharInLineIdx = inputText.length;

      if (nextCharInLineIdx < currentTargetLine.length) {
        const nextChar = currentTargetLine[nextCharInLineIdx];
        const charData = characterIndex.characters[nextChar];

        if (charData && charData.methods && charData.methods.length > 0) {
          const method = charData.methods.find(m => m.recommended) || charData.methods[0];
          highlightSearchMethod(method);
        }
      }
    });
  }
}
