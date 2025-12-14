/**
 * AZERTY Global - Layout Data Utilities
 * Loads and queries the keyboard layout JSON
 */

let layoutData = null;

/**
 * Load the layout JSON file
 */
async function loadLayout() {
  if (layoutData) return layoutData;
  
  try {
    const response = await fetch('AZERTY Global 2026.json');
    layoutData = await response.json();
    return layoutData;
  } catch (error) {
    console.error('Failed to load layout data:', error);
    return null;
  }
}

/**
 * Get all keys from the layout as a flat array
 */
function getAllKeys(layout) {
  if (!layout || !layout.rows) return [];
  return layout.rows.flatMap(row => row.keys);
}

/**
 * Find how to type a specific character
 * Returns { method, description, key?, modifier?, deadKey?, secondKey? }
 */
function findCharacter(char, layout) {
  if (!layout) return null;
  
  const keys = getAllKeys(layout);
  
  // Check direct access (base, shift, altGr, shiftAltGr, caps variants)
  const modifiers = [
    { prop: 'base', name: 'Direct' },
    { prop: 'shift', name: 'Maj' },
    { prop: 'alt_gr', name: 'AltGr' },
    { prop: 'shift_alt_gr', name: 'Maj + AltGr' },
    { prop: 'caps', name: 'Verr. Maj' },
    { prop: 'caps_shift', name: 'Verr. Maj + Maj' },
    { prop: 'caps_alt_gr', name: 'Verr. Maj + AltGr' },
    { prop: 'caps_shift_alt_gr', name: 'Verr. Maj + Maj + AltGr' }
  ];
  
  for (const key of keys) {
    for (const mod of modifiers) {
      if (key[mod.prop] === char) {
        return {
          method: 'direct',
          description: mod.name === 'Direct' ? key.position : `${mod.name} + ${key.position}`,
          key: key,
          modifier: mod.name
        };
      }
    }
  }
  
  // Check dead keys
  if (layout.dead_keys) {
    for (const [dkName, dkData] of Object.entries(layout.dead_keys)) {
      if (dkData.table) {
        for (const [input, output] of Object.entries(dkData.table)) {
          if (output === char) {
            // Find where the dead key is triggered
            const dkTrigger = findDeadKeyTrigger(dkName, keys);
            return {
              method: 'dead_key',
              description: `${dkData.description} puis ${input}`,
              deadKey: dkName,
              deadKeyData: dkData,
              trigger: dkTrigger,
              secondKey: input
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Find which key triggers a dead key
 */
function findDeadKeyTrigger(dkName, keys) {
  const modifiers = ['base', 'shift', 'alt_gr', 'shift_alt_gr'];
  
  for (const key of keys) {
    for (const mod of modifiers) {
      if (key[mod] === dkName) {
        const modName = {
          'base': '',
          'shift': 'Maj + ',
          'alt_gr': 'AltGr + ',
          'shift_alt_gr': 'Maj + AltGr + '
        }[mod];
        return { key, modifier: mod, description: `${modName}${key.position}` };
      }
    }
  }
  return null;
}

/**
 * Get information about a specific key by position
 */
function getKeyInfo(position, layout) {
  if (!layout) return null;
  const keys = getAllKeys(layout);
  return keys.find(k => k.position === position);
}

/**
 * Get dead key table by name
 */
function getDeadKeyTable(name, layout) {
  if (!layout || !layout.dead_keys) return null;
  return layout.dead_keys[name];
}

/**
 * Get layout metadata
 */
function getLayoutMeta(layout) {
  if (!layout) return null;
  return {
    name: layout.layout_name,
    version: layout.version,
    releaseDate: layout.release_date,
    author: layout.author,
    website: layout.website,
    description: layout.description
  };
}

/**
 * Format a character for display (handle special chars)
 */
function formatChar(char) {
  if (!char) return '';
  
  const specialChars = {
    '\u0020': '␣',  // Space
    '\u00A0': 'NBSP', // Non-breaking space
    '\u202F': 'NNBSP', // Narrow non-breaking space
    '\u2013': '–',  // En dash
    '\u2014': '—',  // Em dash
    '\u2011': '‑',  // Non-breaking hyphen
    '\u00AD': 'SHY'  // Soft hyphen
  };
  
  return specialChars[char] || char;
}

// Export for use in other scripts
window.AzertyLayout = {
  loadLayout,
  getAllKeys,
  findCharacter,
  getKeyInfo,
  getDeadKeyTable,
  getLayoutMeta,
  formatChar
};
