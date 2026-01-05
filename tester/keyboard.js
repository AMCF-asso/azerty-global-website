/**
 * AZERTY Global Keyboard Component
 * Custom keyboard visualizer with dynamic layer display and Smart Caps support
 */

// Keyboard geometry constants
const KEY_WIDTH = 60;
const KEY_HEIGHT = 60;
const KEY_GAP = 4;
const KEY_RADIUS = 6;

// Platform detection for modifier key labels
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

// Platform-specific modifier labels
const MODIFIER_LABELS = IS_MAC ? {
  ControlLeft: '⌃',
  ControlRight: '⌃',
  MetaLeft: '⌘',
  MetaRight: '⌘',
  AltLeft: '⌥',
  AltRight: '⌥',  // Mac doesn't have AltGr, uses Option
} : {
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  MetaLeft: 'Win',
  MetaRight: 'Win',
  AltLeft: 'Alt',
  AltRight: 'AltGr',
};

// Layer indices in the 8-value array
const LAYER = {
  BASE: 0,
  SHIFT: 1,
  CAPS: 2,
  CAPS_SHIFT: 3,
  ALTGR: 4,
  SHIFT_ALTGR: 5,
  CAPS_ALTGR: 6,
  CAPS_SHIFT_ALTGR: 7
};

// ISO keyboard layout - physical key positions and sizes
const KEYBOARD_ROWS = [
  // Row E (number row)
  {
    y: 0,
    keys: [
      { id: 'Backquote', w: 1 },
      { id: 'Digit1', w: 1 },
      { id: 'Digit2', w: 1 },
      { id: 'Digit3', w: 1 },
      { id: 'Digit4', w: 1 },
      { id: 'Digit5', w: 1 },
      { id: 'Digit6', w: 1 },
      { id: 'Digit7', w: 1 },
      { id: 'Digit8', w: 1 },
      { id: 'Digit9', w: 1 },
      { id: 'Digit0', w: 1 },
      { id: 'Minus', w: 1 },
      { id: 'Equal', w: 1 },
      { id: 'Backspace', w: 2, special: true, label: '⌫' }
    ]
  },
  // Row D (top letter row)
  {
    y: 1,
    keys: [
      { id: 'Tab', w: 1.5, special: true, label: '↹' },
      { id: 'KeyQ', w: 1 },
      { id: 'KeyW', w: 1 },
      { id: 'KeyE', w: 1 },
      { id: 'KeyR', w: 1 },
      { id: 'KeyT', w: 1 },
      { id: 'KeyY', w: 1 },
      { id: 'KeyU', w: 1 },
      { id: 'KeyI', w: 1 },
      { id: 'KeyO', w: 1 },
      { id: 'KeyP', w: 1 },
      { id: 'BracketLeft', w: 1 },
      { id: 'BracketRight', w: 1 },
      { id: 'Enter', w: 1.5, special: true, label: '⏎', isoEnterTop: true }
    ]
  },
  // Row C (home row)
  {
    y: 2,
    keys: [
      { id: 'CapsLock', w: 1.75, special: true, label: '⇪ Verr. Maj.' },
      { id: 'KeyA', w: 1 },
      { id: 'KeyS', w: 1 },
      { id: 'KeyD', w: 1 },
      { id: 'KeyF', w: 1 },
      { id: 'KeyG', w: 1 },
      { id: 'KeyH', w: 1 },
      { id: 'KeyJ', w: 1 },
      { id: 'KeyK', w: 1 },
      { id: 'KeyL', w: 1 },
      { id: 'Semicolon', w: 1 },
      { id: 'Quote', w: 1 },
      { id: 'Backslash', w: 1 },
      { id: 'Enter', w: 1.25, special: true, label: '⏎', isoEnterBottom: true }
    ]
  },
  // Row B (bottom letter row)
  {
    y: 3,
    keys: [
      { id: 'ShiftLeft', w: 1.25, special: true, label: '⇧ Maj' },
      { id: 'IntlBackslash', w: 1 },
      { id: 'KeyZ', w: 1 },
      { id: 'KeyX', w: 1 },
      { id: 'KeyC', w: 1 },
      { id: 'KeyV', w: 1 },
      { id: 'KeyB', w: 1 },
      { id: 'KeyN', w: 1 },
      { id: 'KeyM', w: 1 },
      { id: 'Comma', w: 1 },
      { id: 'Period', w: 1 },
      { id: 'Slash', w: 1 },
      { id: 'ShiftRight', w: 2.85, special: true, label: '⇧ Maj' }
    ]
  },
  // Row A (space row)
  {
    y: 4,
    keys: [
      { id: 'ControlLeft', w: 1.5, special: true, dynamicLabel: true },
      { id: 'MetaLeft', w: 1.25, special: true, dynamicLabel: true },
      { id: 'AltLeft', w: 1.25, special: true, dynamicLabel: true },
      { id: 'Space', w: 6, },
      { id: 'AltRight', w: 1.25, special: true, dynamicLabel: true },
      { id: 'MetaRight', w: 1.25, special: true, dynamicLabel: true },
      { id: 'ContextMenu', w: 1.25, special: true, label: '☰' },
      { id: 'ControlRight', w: 1.65, special: true, dynamicLabel: true }
    ]
  }
];

// Letter keys that get Smart Caps behavior
const LETTER_KEYS = new Set([
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'
]);

// Keys with accented letters that also behave like letters for Caps
const ACCENTED_LETTER_KEYS = new Set(['Digit2', 'Digit7', 'Digit9', 'Digit0']); // é è ç à

/**
 * Check if a character is a letter (affected by Smart Caps)
 */
function isLetter(char) {
  if (!char || typeof char !== 'string' || char.length === 0) return false;
  // Check if it's a Unicode letter
  return /\p{L}/u.test(char);
}

/**
 * Check if a value is a dead key reference
 */
function isDeadKey(value) {
  return typeof value === 'string' && value.startsWith('dk_');
}

/**
 * Get display symbol for a dead key
 */
const DEAD_KEY_SYMBOLS = {
  'dk_circumflex': '^',
  'dk_diaeresis': '¨',
  'dk_acute': '´',
  'dk_grave': '`',
  'dk_tilde': '~',
  'dk_cedilla': '¸',
  'dk_macron': '¯',
  'dk_breve': '˘',
  'dk_dot_above': '˙',
  'dk_ring_above': '˚',
  'dk_caron': 'ˇ',
  'dk_ogonek': '˛',
  'dk_double_acute': '˝',
  'dk_stroke': '/',
  'dk_horizontal_stroke': '−',
  'dk_hook': '̉',
  'dk_horn': '̛',
  'dk_comma': ',',
  'dk_dot_below': '.',
  'dk_double_grave': '̏',
  'dk_inverted_breve': '̑',
  'dk_greek': 'µ',
  'dk_cyrillic': 'я',
  'dk_punctuation': '§',
  'dk_currencies': '¤',
  'dk_scientific': '±',
  'dk_misc_symbols': '→',
  'dk_phonetic': 'ʁ',
  'dk_extended_latin': 'ə'
};

function getDeadKeySymbol(dkName, deadkeys) {
  // First check our symbol table
  if (DEAD_KEY_SYMBOLS[dkName]) {
    return DEAD_KEY_SYMBOLS[dkName];
  }
  // Fallback: try to get the space result from the dead key table
  if (deadkeys && deadkeys[dkName]) {
    return deadkeys[dkName]['\u0020'] || deadkeys[dkName][' '] || '◌';
  }
  return '◌';
}

/**
 * Main Keyboard class
 */
class AZERTYKeyboard {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.layout = null;
    this.deadkeys = null;
    
    // Modifier states
    this.state = {
      shift: false,
      caps: false,
      altgr: false,
      activeDeadKey: null
    };
    
    // Event callbacks
    this.onKeyClick = options.onKeyClick || null;
    this.onStateChange = options.onStateChange || null;
    
    // Key elements map
    this.keyElements = new Map();
    
    // Build the keyboard
    this.render();
    
    // Auto-load layout if URL provided
    if (options.layoutUrl) {
      this.loadLayout(options.layoutUrl);
    }
  }
  
  /**
   * Load layout from JSON
   */
  async loadLayout(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      this.layout = data.keymap;
      this.deadkeys = data.deadkeys;
      this.updateAllKeys();
    } catch (error) {
      console.error('Failed to load layout:', error);
    }
  }
  
  /**
   * Set layout directly from object
   */
  setLayout(keymap, deadkeys) {
    this.layout = keymap;
    this.deadkeys = deadkeys;
    this.updateAllKeys();
  }
  
  /**
   * Get the current active layer index based on modifiers
   */
  getActiveLayer() {
    const { shift, caps, altgr } = this.state;
    
    if (altgr) {
      if (caps && shift) return LAYER.CAPS_SHIFT_ALTGR;
      if (caps) return LAYER.CAPS_ALTGR;
      if (shift) return LAYER.SHIFT_ALTGR;
      return LAYER.ALTGR;
    } else {
      if (caps && shift) return LAYER.CAPS_SHIFT;
      if (caps) return LAYER.CAPS;
      if (shift) return LAYER.SHIFT;
      return LAYER.BASE;
    }
  }
  
  /**
   * Get the character for a key at the current state
   */
  getKeyChar(keyId) {
    if (!this.layout || !this.layout[keyId]) return null;
    const layer = this.getActiveLayer();
    return this.layout[keyId][layer];
  }
  
  /**
   * Render the keyboard
   */
  render() {
    this.container.innerHTML = '';
    this.container.classList.add('azerty-keyboard');
    
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard-container';
    
    KEYBOARD_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';
      rowEl.style.setProperty('--row-y', row.y);
      
      let xOffset = 0;
      
      row.keys.forEach(keyDef => {
        const keyEl = this.createKeyElement(keyDef, xOffset);
        rowEl.appendChild(keyEl);
        xOffset += keyDef.w;
      });
      
      keyboard.appendChild(rowEl);
    });
    
    this.container.appendChild(keyboard);
  }
  
  /**
   * Create a single key element
   */
  createKeyElement(keyDef, xOffset) {
    const key = document.createElement('div');
    key.className = 'key';
    key.dataset.keyId = keyDef.id;
    key.style.setProperty('--key-w', keyDef.w);
    key.style.setProperty('--key-x', xOffset);
    
    if (keyDef.special) {
      key.classList.add('special-key');
    }
    if (keyDef.home) {
      key.classList.add('home-key');
    }
    if (keyDef.iso) {
      key.classList.add('iso-enter');
    }
    if (keyDef.isoEnterTop) {
      key.classList.add('iso-enter', 'iso-enter-top');
    }
    if (keyDef.isoEnterBottom) {
      key.classList.add('iso-enter', 'iso-enter-bottom');
    }
    
    // Key content container
    const content = document.createElement('div');
    content.className = 'key-content';
    
    if (keyDef.special) {
      // Special keys just show their label
      const label = document.createElement('span');
      label.className = 'key-label';
      // Use dynamic label from MODIFIER_LABELS if dynamicLabel is set
      if (keyDef.dynamicLabel && MODIFIER_LABELS[keyDef.id]) {
        label.textContent = MODIFIER_LABELS[keyDef.id];
      } else {
        label.textContent = keyDef.label || '';
      }
      content.appendChild(label);
    } else {
      // Regular keys have 4 positions for layer characters
      // Top-left: Shift, Top-right: Shift+AltGr
      // Bottom-left: Base, Bottom-right: AltGr
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      positions.forEach(pos => {
        const span = document.createElement('span');
        span.className = `key-char ${pos}`;
        content.appendChild(span);
      });
    }
    
    key.appendChild(content);
    
    // Store reference
    this.keyElements.set(keyDef.id, key);
    
    // Click handler
    key.addEventListener('click', () => this.handleKeyClick(keyDef.id));
    
    return key;
  }
  
  /**
   * Update display for all keys
   */
  updateAllKeys() {
    if (!this.layout) return;
    
    this.keyElements.forEach((keyEl, keyId) => {
      this.updateKeyDisplay(keyId, keyEl);
    });
  }
  
  /**
   * Update display for a single key
   */
  updateKeyDisplay(keyId, keyEl) {
    if (!this.layout || !this.layout[keyId]) return;
    if (keyEl.classList.contains('special-key')) return;
    
    const chars = this.layout[keyId];
    const { shift, caps, altgr } = this.state;
    const activeDeadKey = this.state.activeDeadKey;
    const isLetterKey = LETTER_KEYS.has(keyId) || ACCENTED_LETTER_KEYS.has(keyId);
    
    // Get the 4 character positions
    const topLeft = keyEl.querySelector('.top-left');
    const topRight = keyEl.querySelector('.top-right');
    const bottomLeft = keyEl.querySelector('.bottom-left');
    const bottomRight = keyEl.querySelector('.bottom-right');
    
    if (!topLeft || !bottomLeft) return;
    
    // Clear all
    [topLeft, topRight, bottomLeft, bottomRight].forEach(el => {
      el.textContent = '';
      el.classList.remove('active', 'dimmed', 'dead-key', 'dead-key-result');
    });
    
    // If dead key is active, show special dead key display
    // When AltGr is also active, we still show dead key mode but nothing will be active
    // (since dead keys don't combine with AltGr characters)
    if (activeDeadKey && this.deadkeys && this.deadkeys[activeDeadKey]) {
      this.updateKeyWithDeadKey(keyId, keyEl, chars, activeDeadKey, altgr);
      return;
    }
    
    // Determine what to show based on key type
    if (ACCENTED_LETTER_KEYS.has(keyId)) {
      // Accented letter on number row (é è ç à): letter bottom-left, number top-left
      this.updateAccentedLetterKeyDisplay(keyEl, chars, shift, caps, altgr);
    } else if (LETTER_KEYS.has(keyId) && isLetter(chars[LAYER.BASE])) {
      // Regular letter key: simplified display - only show one character
      this.updateLetterKeyDisplay(keyEl, chars, shift, caps);
    } else {
      // Non-letter key: show all 4 layers with active one highlighted
      this.updateSymbolKeyDisplay(keyEl, chars, shift, altgr);
    }
  }
  
  /**
   * Update letter key display (simplified: one character only in top-left)
   * AltGr chars: letters stay bottom-right, symbols have Shift+AltGr in top-right
   */
  updateLetterKeyDisplay(keyEl, chars, shift, caps) {
    const topLeft = keyEl.querySelector('.top-left');
    const topRight = keyEl.querySelector('.top-right');
    const bottomRight = keyEl.querySelector('.bottom-right');
    
    // Determine which character to show for the letter
    let charToShow;
    if (caps && shift) {
      charToShow = chars[LAYER.CAPS_SHIFT] || chars[LAYER.BASE];
    } else if (caps) {
      charToShow = chars[LAYER.CAPS] || chars[LAYER.SHIFT] || chars[LAYER.BASE].toUpperCase();
    } else if (shift) {
      charToShow = chars[LAYER.SHIFT] || chars[LAYER.BASE].toUpperCase();
    } else {
      charToShow = chars[LAYER.BASE];
    }
    
    topLeft.textContent = charToShow || '';
    
    // Get AltGr characters
    const altgrChar = chars[LAYER.ALTGR];
    const shiftAltgrChar = chars[LAYER.SHIFT_ALTGR];
    const hasAltgrChar = altgrChar && altgrChar !== chars[LAYER.BASE];
    const hasShiftAltgrChar = shiftAltgrChar && shiftAltgrChar !== chars[LAYER.SHIFT];
    
    // Check if AltGr chars are letters (like Æ Ù Œ ẞ) - they go in bottom-right only
    const altgrIsLetter = hasAltgrChar && isLetter(altgrChar);
    const shiftAltgrIsLetter = hasShiftAltgrChar && isLetter(shiftAltgrChar);
    
    // Display AltGr character in bottom-right
    if (hasAltgrChar) {
      if (isDeadKey(altgrChar)) {
        bottomRight.textContent = getDeadKeySymbol(altgrChar, this.deadkeys);
        bottomRight.classList.add('dead-key');
      } else {
        bottomRight.textContent = altgrChar;
      }
    }
    
    // Display Shift+AltGr character
    // If it's a letter OR same as AltGr, keep in bottom-right (toggled with shift)
    // If it's a non-letter symbol, show in top-right always
    if (hasShiftAltgrChar && !shiftAltgrIsLetter && shiftAltgrChar !== altgrChar) {
      if (isDeadKey(shiftAltgrChar)) {
        topRight.textContent = getDeadKeySymbol(shiftAltgrChar, this.deadkeys);
        topRight.classList.add('dead-key');
      } else {
        topRight.textContent = shiftAltgrChar;
      }
    }
    
    // Determine active states based on current modifiers
    const { altgr } = this.state;
    const shiftActive = this.state.shift;
    
    if (altgr) {
      // AltGr is pressed
      if (shiftActive && hasShiftAltgrChar) {
        // Shift+AltGr active
        if (shiftAltgrIsLetter || shiftAltgrChar === altgrChar) {
          // Letter or same char - show in bottom-right
          bottomRight.textContent = isDeadKey(shiftAltgrChar) 
            ? getDeadKeySymbol(shiftAltgrChar, this.deadkeys) 
            : shiftAltgrChar;
          bottomRight.classList.add('active');
        } else {
          // Non-letter in top-right
          topRight.classList.add('active');
          if (hasAltgrChar) bottomRight.classList.add('dimmed');
        }
        topLeft.classList.add('dimmed');
      } else if (hasAltgrChar) {
        // Just AltGr, has char
        bottomRight.classList.add('active');
        topLeft.classList.add('dimmed');
        if (topRight.textContent) topRight.classList.add('dimmed');
      } else {
        // AltGr but no AltGr char - everything stays dimmed
        topLeft.classList.add('dimmed');
        if (bottomRight.textContent) bottomRight.classList.add('dimmed');
        if (topRight.textContent) topRight.classList.add('dimmed');
      }
    } else {
      // No AltGr
      topLeft.classList.add('active');
      if (bottomRight.textContent) bottomRight.classList.add('dimmed');
      if (topRight.textContent) topRight.classList.add('dimmed');
    }
  }
  
  /**
   * Update accented letter key display (é è ç à on number row)
   * Shows: letter bottom-left, number top-left, AltGr bottom-right
   */
  updateAccentedLetterKeyDisplay(keyEl, chars, shift, caps, altgr) {
    const topLeft = keyEl.querySelector('.top-left');
    const bottomLeft = keyEl.querySelector('.bottom-left');
    const bottomRight = keyEl.querySelector('.bottom-right');
    const topRight = keyEl.querySelector('.top-right');
    
    // Bottom-left: base letter (affected by caps)
    // Top-left: shift character (number)
    const baseChar = chars[LAYER.BASE];
    const shiftChar = chars[LAYER.SHIFT];
    const capsChar = chars[LAYER.CAPS] || baseChar.toUpperCase();
    
    // Show letter (bottom-left)
    if (caps) {
      bottomLeft.textContent = capsChar;
    } else {
      bottomLeft.textContent = baseChar;
    }
    
    // Show number (top-left)
    topLeft.textContent = shiftChar;
    
    // Show AltGr character (bottom-right)
    const altgrChar = chars[LAYER.ALTGR];
    if (altgrChar) {
      if (isDeadKey(altgrChar)) {
        bottomRight.textContent = getDeadKeySymbol(altgrChar, this.deadkeys);
        bottomRight.classList.add('dead-key');
      } else {
        bottomRight.textContent = altgrChar;
      }
    }
    
    // Show Shift+AltGr character (top-right)
    const shiftAltgrChar = chars[LAYER.SHIFT_ALTGR];
    if (shiftAltgrChar) {
      if (isDeadKey(shiftAltgrChar)) {
        topRight.textContent = getDeadKeySymbol(shiftAltgrChar, this.deadkeys);
        topRight.classList.add('dead-key');
      } else {
        topRight.textContent = shiftAltgrChar;
      }
    }
    
    // Determine which is active
    if (altgr && shift) {
      topRight.classList.add('active');
      [topLeft, bottomLeft, bottomRight].forEach(el => el.classList.add('dimmed'));
    } else if (altgr) {
      bottomRight.classList.add('active');
      [topLeft, bottomLeft, topRight].forEach(el => el.classList.add('dimmed'));
    } else if (shift) {
      topLeft.classList.add('active');
      [bottomLeft, bottomRight, topRight].forEach(el => el.classList.add('dimmed'));
    } else {
      bottomLeft.classList.add('active');
      [topLeft, bottomRight, topRight].forEach(el => el.classList.add('dimmed'));
    }
  }
  
  /**
   * Update symbol key display (4 positions with active highlighted)
   */
  updateSymbolKeyDisplay(keyEl, chars, shift, altgr) {
    const topLeft = keyEl.querySelector('.top-left');
    const topRight = keyEl.querySelector('.top-right');
    const bottomLeft = keyEl.querySelector('.bottom-left');
    const bottomRight = keyEl.querySelector('.bottom-right');
    
    // Set characters for each position
    const setChar = (el, value, layer) => {
      if (isDeadKey(value)) {
        el.textContent = getDeadKeySymbol(value, this.deadkeys);
        el.classList.add('dead-key');
      } else {
        el.textContent = value || '';
      }
    };
    
    setChar(bottomLeft, chars[LAYER.BASE], LAYER.BASE);
    setChar(topLeft, chars[LAYER.SHIFT], LAYER.SHIFT);
    setChar(bottomRight, chars[LAYER.ALTGR], LAYER.ALTGR);
    setChar(topRight, chars[LAYER.SHIFT_ALTGR], LAYER.SHIFT_ALTGR);
    
    // Determine active layer and highlight
    let activeEl;
    if (altgr && shift) {
      activeEl = topRight.textContent ? topRight : null;
    } else if (altgr) {
      activeEl = bottomRight.textContent ? bottomRight : null;
    } else if (shift) {
      activeEl = topLeft.textContent ? topLeft : null;
    } else {
      activeEl = bottomLeft.textContent ? bottomLeft : null;
    }
    
    // Apply active/dimmed states
    [topLeft, topRight, bottomLeft, bottomRight].forEach(el => {
      if (el === activeEl && activeEl !== null) {
        el.classList.add('active');
      } else if (el.textContent) {
        el.classList.add('dimmed');
      }
    });
  }
  
  /**
   * Update key display when a dead key is active
   */
  updateKeyWithDeadKey(keyId, keyEl, chars, deadKeyName, altgrActive = false) {
    const deadKey = this.deadkeys[deadKeyName];
    const topLeft = keyEl.querySelector('.top-left');
    const topRight = keyEl.querySelector('.top-right');
    const bottomLeft = keyEl.querySelector('.bottom-left');
    const bottomRight = keyEl.querySelector('.bottom-right');
    
    const { shift, caps } = this.state;
    const isLetterKey = LETTER_KEYS.has(keyId);
    
    // Helper to format character (convert dk_* to symbol)
    const formatChar = (value) => isDeadKey(value) ? getDeadKeySymbol(value, this.deadkeys) : (value || '');
    
    // If AltGr is active, check if the AltGr character has a combination in the dead key table
    if (altgrActive) {
      const altgrChar = shift ? chars[LAYER.SHIFT_ALTGR] : chars[LAYER.ALTGR];
      const resultChar = altgrChar ? deadKey[altgrChar] : null;
      
      // Show base character dimmed
      if (isLetterKey) {
        topLeft.textContent = formatChar(chars[LAYER.SHIFT]) || chars[LAYER.BASE].toUpperCase();
        topLeft.classList.add('dimmed');
      } else {
        bottomLeft.textContent = formatChar(chars[LAYER.BASE]);
        bottomLeft.classList.add('dimmed');
        topLeft.textContent = formatChar(chars[LAYER.SHIFT]);
        topLeft.classList.add('dimmed');
      }
      
      // If there's a result for the AltGr character, show it
      if (resultChar) {
        bottomRight.textContent = resultChar;
        bottomRight.classList.add('active', 'dead-key-result');
      }
      // Otherwise, key stays fully dimmed (no result shown)
      return;
    }
    
    // Show base character(s) dimmed
    if (isLetterKey) {
      // For letters, show uppercase in top-left (always the reference)
      topLeft.textContent = formatChar(chars[LAYER.SHIFT]) || chars[LAYER.BASE].toUpperCase();
      topLeft.classList.add('dimmed');
    } else {
      // For symbols, show base and shift (but NOT AltGr layers when dead key active)
      const baseDisplay = formatChar(chars[LAYER.BASE]);
      const shiftDisplay = formatChar(chars[LAYER.SHIFT]);
      bottomLeft.textContent = baseDisplay;
      bottomLeft.classList.add('dimmed');
      if (isDeadKey(chars[LAYER.BASE])) bottomLeft.classList.add('dead-key');
      topLeft.textContent = shiftDisplay;
      topLeft.classList.add('dimmed');
      if (isDeadKey(chars[LAYER.SHIFT])) topLeft.classList.add('dead-key');
      // AltGr characters are NOT shown when dead key is active - only dead key result
    }
    
    // Find dead key result for this key
    let baseChar = chars[LAYER.BASE];
    let shiftChar = chars[LAYER.SHIFT];
    
    // Skip if base char is itself a dead key (no combination possible)
    if (isDeadKey(baseChar) && !shift && !caps) {
      return;
    }
    if (isDeadKey(shiftChar) && (shift || caps)) {
      return;
    }
    
    // Get the resulting character from dead key table
    let resultChar = null;
    if (shift || caps) {
      resultChar = deadKey[shiftChar] || deadKey[shiftChar?.toLowerCase()]?.toUpperCase();
      if (!resultChar && isLetterKey) {
        // Try with base char uppercase
        resultChar = deadKey[baseChar.toUpperCase()];
      }
    } else {
      resultChar = deadKey[baseChar];
    }
    
    // Show result in bottom-right (or overwrite if needed)
    if (resultChar) {
      bottomRight.textContent = resultChar;
      bottomRight.classList.remove('dimmed', 'dead-key');
      bottomRight.classList.add('active', 'dead-key-result');
    }
  }
  
  /**
 * Handle key click
 * @param {string} keyId - The key identifier
 * @param {boolean} skipAutoRelease - If true, don't auto-release Shift (used for physical keyboard)
 */
handleKeyClick(keyId, skipAutoRelease = false) {
    // Handle modifier keys
    if (keyId === 'ShiftLeft' || keyId === 'ShiftRight') {
      this.toggleShift();
      return;
    }
    if (keyId === 'CapsLock') {
      this.toggleCaps();
      return;
    }
    if (keyId === 'AltRight') {
      this.toggleAltGr();
      return;
    }
    if (keyId === 'AltLeft' || keyId === 'ControlLeft' || keyId === 'ControlRight' ||
        keyId === 'MetaLeft' || keyId === 'MetaRight' || keyId === 'ContextMenu' ||
        keyId === 'Tab') {
      // Don't process these keys
      return;
    }
    
    // Handle Backspace - clear dead key if active
    if (keyId === 'Backspace') {
      if (this.state.activeDeadKey) {
        this.clearDeadKey();
      }
      // Don't output any character for backspace on virtual keyboard
      return;
    }
    
    // Get character and notify
    const char = this.getKeyChar(keyId);
    
    // If dead key is active, check for combination FIRST (even if pressed key is another dead key)
    if (this.state.activeDeadKey) {
      const deadKey = this.deadkeys[this.state.activeDeadKey];
      
      // If pressing a dead key while one is active, look up the dead key's symbol
      if (isDeadKey(char)) {
        // Get the symbol for the pressed dead key and look it up in the active dead key table
        const pressedSymbol = getDeadKeySymbol(char, this.deadkeys);
        const result = deadKey[pressedSymbol];
        if (result) {
          // Found a combination (e.g., ^ + ^ → combining circumflex)
          if (this.onKeyClick) {
            this.onKeyClick(result, keyId);
          }
          this.clearDeadKey();
        } else {
          // No combination - output the first dead key symbol, then activate the new dead key
          const firstSymbol = getDeadKeySymbol(this.state.activeDeadKey, this.deadkeys);
          if (this.onKeyClick && firstSymbol) {
            this.onKeyClick(firstSymbol, 'deadkey');
          }
          this.clearDeadKey();
          this.activateDeadKey(char);
        }
        return;
      }
      
      const result = this.resolveDeadKey(keyId);
      if (result !== null) {
        // Found a combination
        if (this.onKeyClick) {
          this.onKeyClick(result, keyId);
        }
        this.clearDeadKey();
      } else {
        // No combination found
        // If AltGr is active, don't output anything (dead keys only combine with base/shift characters)
        if (this.state.altgr) {
          // Do nothing - keep the dead key active
          return;
        }
        // Otherwise output the dead key symbol then the character
        const deadKeySymbol = getDeadKeySymbol(this.state.activeDeadKey, this.deadkeys);
        if (this.onKeyClick && deadKeySymbol) {
          this.onKeyClick(deadKeySymbol, 'deadkey');
        }
        this.clearDeadKey();
        if (this.onKeyClick && char) {
          this.onKeyClick(char, keyId);
        }
      }
      // Auto-release shift/altgr after typing (for virtual keyboard clicks only)
      if (!skipAutoRelease) {
        if (this.state.shift && !this.state.caps) {
          this.setShift(false);
        }
        if (this.state.altgr) {
          this.setAltGr(false);
        }
      }
      return;
    }
    
    // Check if it's a dead key (no dead key currently active)
    if (isDeadKey(char)) {
      this.activateDeadKey(char);
      return;
    }
    
    if (this.onKeyClick && char) {
      this.onKeyClick(char, keyId);
    }
    
    // Auto-release shift/altgr after typing (for virtual keyboard clicks only)
    if (!skipAutoRelease) {
      if (this.state.shift && !this.state.caps) {
        this.setShift(false);
      }
      if (this.state.altgr) {
        this.setAltGr(false);
      }
    }
  }
  
  /**
   * Modifier controls
   */
  toggleShift() {
    this.setShift(!this.state.shift);
  }
  
  setShift(value) {
    this.state.shift = value;
    this.updateModifierHighlight('ShiftLeft', value);
    this.updateModifierHighlight('ShiftRight', value);
    this.updateAllKeys();
    this.notifyStateChange();
  }
  
  toggleCaps() {
    this.setCaps(!this.state.caps);
  }
  
  setCaps(value) {
    this.state.caps = value;
    this.updateModifierHighlight('CapsLock', value);
    this.updateAllKeys();
    this.notifyStateChange();
  }
  
  toggleAltGr() {
    this.setAltGr(!this.state.altgr);
  }
  
  setAltGr(value) {
    this.state.altgr = value;
    this.updateModifierHighlight('AltRight', value);
    this.updateAllKeys();
    this.notifyStateChange();
  }
  
  updateModifierHighlight(keyId, active) {
    const keyEl = this.keyElements.get(keyId);
    if (keyEl) {
      keyEl.classList.toggle('modifier-active', active);
    }
  }
  
  /**
   * Dead key handling
   */
  activateDeadKey(deadKeyName) {
    this.state.activeDeadKey = deadKeyName;
    this.container.classList.add('dead-key-active');
    this.updateAllKeys();
    this.notifyStateChange();
  }
  
  clearDeadKey() {
    this.state.activeDeadKey = null;
    this.container.classList.remove('dead-key-active');
    this.updateAllKeys();
    this.notifyStateChange();
  }
  
  resolveDeadKey(keyId) {
    if (!this.state.activeDeadKey || !this.deadkeys) return null;
    
    const deadKey = this.deadkeys[this.state.activeDeadKey];
    if (!deadKey) return null;
    
    // Get the base character for this key (without considering current modifiers for dead key lookup)
    const chars = this.layout[keyId];
    if (!chars) return null;
    
    // Try different characters based on state
    const { shift, caps } = this.state;
    let lookupChar;
    
    if (LETTER_KEYS.has(keyId)) {
      // For letters, use base or uppercase depending on shift/caps
      const baseChar = chars[LAYER.BASE];
      if (caps || shift) {
        lookupChar = baseChar.toUpperCase();
      } else {
        lookupChar = baseChar;
      }
    } else {
      // For other keys, try base character first
      lookupChar = chars[LAYER.BASE];
    }
    
    // Look up in dead key table
    let result = deadKey[lookupChar];
    
    // If no result and it's a letter, try the other case
    if (!result && LETTER_KEYS.has(keyId)) {
      const altChar = (caps || shift) ? chars[LAYER.BASE] : chars[LAYER.BASE].toUpperCase();
      const altResult = deadKey[altChar];
      if (altResult) {
        // Apply case transformation
        result = (caps || shift) ? altResult.toUpperCase() : altResult.toLowerCase();
      }
    }
    
    return result || null;
  }
  
  /**
   * Visual feedback
   */
  pressKey(keyId) {
    const keyEl = this.keyElements.get(keyId);
    if (keyEl) {
      keyEl.classList.add('pressed');
    }
  }
  
  releaseKey(keyId) {
    const keyEl = this.keyElements.get(keyId);
    if (keyEl) {
      keyEl.classList.remove('pressed');
    }
  }
  
  highlightKey(keyId) {
    const keyEl = this.keyElements.get(keyId);
    if (keyEl) {
      keyEl.classList.add('highlighted');
    }
  }
  
  clearHighlights() {
    this.keyElements.forEach(keyEl => {
      keyEl.classList.remove('highlighted', 'pressed');
    });
  }
  
  /**
   * State change notification
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }
  
  /**
   * Reset keyboard state
   */
  reset() {
    this.state.shift = false;
    this.state.caps = false;
    this.state.altgr = false;
    this.state.activeDeadKey = null;
    this.container.classList.remove('dead-key-active');
    this.keyElements.forEach(keyEl => {
      keyEl.classList.remove('modifier-active', 'pressed', 'highlighted');
    });
    this.updateAllKeys();
    this.notifyStateChange();
  }
}

// Expose to global scope for non-module usage (script tag)
if (typeof window !== 'undefined') {
  window.AZERTYKeyboard = AZERTYKeyboard;
  window.LAYER = LAYER;
  window.isDeadKey = isDeadKey;
  window.isLetter = isLetter;
}

// Export for ES module usage
export { AZERTYKeyboard, LAYER, isDeadKey, isLetter };
