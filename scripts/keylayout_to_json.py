#!/usr/bin/env python3
"""
Keylayout to JSON Converter

Converts macOS .keylayout files to JSON format compatible with the AZERTY Global JSON layout format.
Features:
- Compact formatting (1 line per key)
- Intelligent dead key name matching
- Ordered dead key tables (6 items per line, letters first)
- Support for 8 layers with null omission

Usage:
    python keylayout_to_json.py input.keylayout [-o output.json] [-v version]
"""

import xml.etree.ElementTree as ET
import json
import re
import html
import argparse
import sys
from pathlib import Path

# =============================================================================
# MAPPING TABLES
# =============================================================================

# macOS Key Code → (ISO Position, Scancode, Row ID, Finger)
MAC_TO_ISO = {
    # Row E (Number row)
    50: ("E00", "SC029", 1, "left_pinky"),
    18: ("E01", "SC002", 1, "left_pinky"),
    19: ("E02", "SC003", 1, "left_ring"),
    20: ("E03", "SC004", 1, "left_middle"),
    21: ("E04", "SC005", 1, "left_index"),
    23: ("E05", "SC006", 1, "left_index"),
    22: ("E06", "SC007", 1, "right_index"),
    26: ("E07", "SC008", 1, "right_index"),
    28: ("E08", "SC009", 1, "right_middle"),
    25: ("E09", "SC00A", 1, "right_ring"),
    29: ("E10", "SC00B", 1, "right_pinky"),
    27: ("E11", "SC00C", 1, "right_pinky"),
    24: ("E12", "SC00D", 1, "right_pinky"),
    # Row D (Top letter row)
    12: ("D01", "SC010", 2, "left_pinky"),
    13: ("D02", "SC011", 2, "left_ring"),
    14: ("D03", "SC012", 2, "left_middle"),
    15: ("D04", "SC013", 2, "left_index"),
    17: ("D05", "SC014", 2, "left_index"),
    16: ("D06", "SC015", 2, "right_index"),
    32: ("D07", "SC016", 2, "right_index"),
    34: ("D08", "SC017", 2, "right_middle"),
    31: ("D09", "SC018", 2, "right_ring"),
    35: ("D10", "SC019", 2, "right_pinky"),
    33: ("D11", "SC01A", 2, "right_pinky"),
    30: ("D12", "SC01B", 2, "right_pinky"),
    # Row C (Home row)
    0:  ("C01", "SC01E", 3, "left_pinky"),
    1:  ("C02", "SC01F", 3, "left_ring"),
    2:  ("C03", "SC020", 3, "left_middle"),
    3:  ("C04", "SC021", 3, "left_index"),
    5:  ("C05", "SC022", 3, "left_index"),
    4:  ("C06", "SC023", 3, "right_index"),
    38: ("C07", "SC024", 3, "right_index"),
    40: ("C08", "SC025", 3, "right_middle"),
    37: ("C09", "SC026", 3, "right_ring"),
    41: ("C10", "SC027", 3, "right_pinky"),
    39: ("C11", "SC028", 3, "right_pinky"),
    42: ("C12", "SC02B", 3, "right_pinky"),
    # Row B (Bottom row)
    10: ("B00", "SC056", 4, "left_pinky"),
    6:  ("B01", "SC02C", 4, "left_pinky"),
    7:  ("B02", "SC02D", 4, "left_ring"),
    8:  ("B03", "SC02E", 4, "left_middle"),
    9:  ("B04", "SC02F", 4, "left_index"),
    11: ("B05", "SC030", 4, "left_index"),
    45: ("B06", "SC031", 4, "right_index"),
    46: ("B07", "SC032", 4, "right_index"),
    43: ("B08", "SC033", 4, "right_middle"),
    47: ("B09", "SC034", 4, "right_ring"),
    44: ("B10", "SC035", 4, "right_pinky"),
    # Space row
    49: ("A03", "SC039", 5, "thumb"),
}

# Row names
ROW_NAMES = {1: "Number Row", 2: "Top Letter Row", 3: "Home Row", 4: "Bottom Row", 5: "Space Row"}

# Dead key name mapping (keylayout → JSON) - supports multiple languages/synonyms/mojibake
DK_NAME_MAP = {
    # Circumflex
    "CIRCONFLEXE": "dk_circumflex", "CIRCUMFLEX": "dk_circumflex", "ACCENT CIRCONFLEXE": "dk_circumflex",
    # Diaeresis/Umlaut
    "TRÉMA": "dk_diaeresis", "TREMA": "dk_diaeresis", "UMLAUT": "dk_diaeresis", "DIAERESIS": "dk_diaeresis",
    "TRÉMA": "dk_diaeresis",  # UTF-8 mojibake
    # Acute
    "ACCENT AIGU": "dk_acute", "ACUTE": "dk_acute", "AIGU": "dk_acute",
    # Grave
    "ACCENT GRAVE": "dk_grave", "GRAVE": "dk_grave",
    # Tilde
    "TILDE": "dk_tilde",
    # Caron
    "CARON": "dk_caron", "HACEK": "dk_caron", "HÁČEK": "dk_caron",
    # Breve
    "BRÈVE": "dk_breve", "BREVE": "dk_breve",
    "BRÈVE": "dk_breve",  # UTF-8 mojibake
    "BRÈVE RENVERSÉE": "dk_inverted_breve", "INVERTED BREVE": "dk_inverted_breve",
    "BRÈVE RENVERSÉE": "dk_inverted_breve",  # UTF-8 mojibake
    # Ogonek
    "OGONEK": "dk_ogonek",
    # Macron
    "MACRON": "dk_macron",
    # Cedilla
    "CÉDILLE": "dk_cedilla", "CEDILLE": "dk_cedilla", "CEDILLA": "dk_cedilla",
    "CÉDILLE": "dk_cedilla",  # UTF-8 mojibake
    # Stroke
    "BARRE DIAGONALE": "dk_stroke", "STROKE": "dk_stroke", "SLASH": "dk_stroke",
    "BARRE OBLIQUE COUVRANTE": "dk_stroke",
    "BARRE HORIZONTALE": "dk_horizontal_stroke", "HORIZONTAL STROKE": "dk_horizontal_stroke",
    "BARRE COUVRANTE": "dk_horizontal_stroke",
    # Dots
    "POINT EN CHEF": "dk_dot_above", "DOT ABOVE": "dk_dot_above",
    "POINT SOUSCRIT": "dk_dot_below", "DOT BELOW": "dk_dot_below",
    # Double accents
    "ACCENT AIGU DOUBLE": "dk_double_acute", "DOUBLE ACUTE": "dk_double_acute",
    "ACCENT DOUBLE AIGU": "dk_double_acute",
    "ACCENT GRAVE DOUBLE": "dk_double_grave", "DOUBLE GRAVE": "dk_double_grave",
    "ACCENT DOUBLE GRAVE": "dk_double_grave",
    # Horn
    "CORNU": "dk_horn", "HORN": "dk_horn",
    # Hook
    "CROCHET": "dk_hook", "HOOK": "dk_hook", "HOOK ABOVE": "dk_hook",
    # Ring
    "ROND EN CHEF": "dk_ring_above", "RING ABOVE": "dk_ring_above", "RING": "dk_ring_above",
    # Comma
    "VIRGULE SOUSCRITE": "dk_comma", "COMMA BELOW": "dk_comma", "COMMA": "dk_comma",
    # Greek
    "ALPHABET GREC": "dk_greek", "GREEK": "dk_greek", "GREC": "dk_greek",
    "LETTRES GRECQUES": "dk_greek",
    # Cyrillic
    "ALPHABET CYRILLIQUE": "dk_cyrillic", "CYRILLIC": "dk_cyrillic", "CYRILLIQUE": "dk_cyrillic",
    # Scientific
    "SYMBOLES SCIENTIFIQUES": "dk_scientific", "SCIENTIFIC": "dk_scientific", "MATH": "dk_scientific",
    # Misc symbols
    "SYMBOLES DIVERS": "dk_misc_symbols", "MISC SYMBOLS": "dk_misc_symbols", "MISC": "dk_misc_symbols",
    # Currencies
    "SYMBOLES MONÉTAIRES": "dk_currencies", "CURRENCIES": "dk_currencies", "CURRENCY": "dk_currencies",
    "SYMBOLES MONETAIRES": "dk_currencies",
    "SYMBOLES MONÉTAIRES": "dk_currencies",  # UTF-8 mojibake
    # Punctuation
    "PONCTUATION": "dk_punctuation", "PUNCTUATION": "dk_punctuation",
    "LATIN ET PONCTUATION": "dk_punctuation",  # Bépo variant
    # Extended Latin
    "LATIN ÉTENDU": "dk_extended_latin", "EXTENDED LATIN": "dk_extended_latin",
    "CARACTÈRES EUROPÉENS ADDITIONNELS": "dk_extended_latin",
    # Phonetic
    "ALPHABET PHONÉTIQUE INTERNATIONAL": "dk_phonetic", "PHONETIC": "dk_phonetic", "IPA": "dk_phonetic",
    # Superscript (exposants)
    "EXPOSANTS": "dk_superscript", "SUPERSCRIPT": "dk_superscript", "SUPERSCRIPTS": "dk_superscript",
    # Subscript (indices)
    "INDICES": "dk_subscript", "SUBSCRIPT": "dk_subscript", "SUBSCRIPTS": "dk_subscript",
}


# Dead key descriptions and examples
DK_DESCRIPTIONS = {
    "dk_circumflex": ("Circumflex accent", "e → ê"),
    "dk_diaeresis": ("Diaeresis/Umlaut", "e → ë"),
    "dk_acute": ("Acute accent", "e → é"),
    "dk_grave": ("Grave accent", "e → è"),
    "dk_tilde": ("Tilde", "n → ñ"),
    "dk_caron": ("Caron/Háček", "c → č"),
    "dk_breve": ("Breve", "a → ă"),
    "dk_inverted_breve": ("Inverted breve", "a → ȃ"),
    "dk_ogonek": ("Ogonek", "e → ę"),
    "dk_macron": ("Macron", "a → ā"),
    "dk_cedilla": ("Cedilla", "c → ç"),
    "dk_stroke": ("Stroke (diagonal)", "o → ø"),
    "dk_horizontal_stroke": ("Horizontal stroke", "d → đ"),
    "dk_dot_above": ("Dot above", "z → ż"),
    "dk_dot_below": ("Dot below", "a → ạ"),
    "dk_double_acute": ("Double acute", "o → ő"),
    "dk_double_grave": ("Double grave", "o → ȍ"),
    "dk_horn": ("Horn", "o → ơ"),
    "dk_hook": ("Hook above", "u → ủ"),
    "dk_ring_above": ("Ring above", "a → å"),
    "dk_comma": ("Comma below", "s → ș"),
    "dk_greek": ("Greek letters", "p → π"),
    "dk_cyrillic": ("Cyrillic letters", "q → я"),
    "dk_scientific": ("Scientific symbols", "8 → ∞"),
    "dk_misc_symbols": ("Miscellaneous symbols", "v → ✅"),
    "dk_currencies": ("Currency symbols", "e → €"),
    "dk_punctuation": ("Punctuation variants", "q → ¶"),
    "dk_extended_latin": ("Extended Latin letters", "z → ʒ"),
    "dk_phonetic": ("Phonetic symbols (IPA)", "a → ɐ"),
    "dk_superscript": ("Superscript digits", "2 → ²"),
    "dk_subscript": ("Subscript digits", "2 → ₂"),
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def decode_output(output_str):
    """Decode XML/HTML entities and filter control characters."""
    if output_str is None:
        return None
    
    # Decode HTML entities
    output_str = html.unescape(output_str)
    
    # Handle hex entities
    output_str = re.sub(r'&#x([0-9A-Fa-f]+);', lambda m: chr(int(m.group(1), 16)), output_str)
    
    # Filter control characters
    if len(output_str) == 1:
        code = ord(output_str)
        if code < 32 and code not in (9, 10, 13):
            return None
        if code == 127:
            return None
    
    return output_str


def match_dead_key_name(keylayout_name):
    """Match keylayout dead key name to JSON dead key name."""
    import unicodedata
    
    # Normalize: uppercase and strip
    normalized = keylayout_name.upper().strip()
    
    # Direct match
    if normalized in DK_NAME_MAP:
        return DK_NAME_MAP[normalized]
    
    # Normalize unicode (NFKC) to handle mojibake
    try:
        normalized_nfkc = unicodedata.normalize('NFKC', normalized)
        if normalized_nfkc in DK_NAME_MAP:
            return DK_NAME_MAP[normalized_nfkc]
    except:
        pass
    
    # Partial match - try to find a key that contains or is contained by normalized
    for key, value in DK_NAME_MAP.items():
        if key in normalized or normalized in key:
            return value
    
    # Pattern-based matching for common dead keys (handles mojibake)
    patterns = {
        r'TR[EÉ\xc3]?MA': 'dk_diaeresis',
        r'C[EÉ\xc3]?DILLE?': 'dk_cedilla',
        r'BR[EÈ\xc3]?VE': 'dk_breve',
        r'CIRC[O]?NFLEXE?': 'dk_circumflex',
        r'AIGU': 'dk_acute',
        r'GRAVE': 'dk_grave',
        r'TILDE': 'dk_tilde',
        r'CARON': 'dk_caron',
        r'MACRON': 'dk_macron',
        r'OGONEK': 'dk_ogonek',
        r'MON[EÉ\xc3]?TAIRES?': 'dk_currencies',
        r'GREC': 'dk_greek',
        r'POINT.*CHEF': 'dk_dot_above',
        r'POINT.*SOUSCRIT': 'dk_dot_below',
        r'ROND.*CHEF': 'dk_ring_above',
        r'VIRGULE.*SOUSCRIT': 'dk_comma',
        r'BARRE.*OBLIQUE': 'dk_stroke',
        r'BARRE.*COUVRANTE': 'dk_horizontal_stroke',
        r'EXPOSANTS?': 'dk_superscript',
        r'INDICES?': 'dk_subscript',
        r'LATIN.*PONCTUATION': 'dk_punctuation',
        r'SCIENTIFIQUE': 'dk_scientific',
    }
    
    for pattern, dk_name in patterns.items():
        if re.search(pattern, normalized, re.IGNORECASE):
            return dk_name
    
    # Create new name from slug (fallback)
    slug = normalized.lower()
    # Remove all non-ASCII characters
    slug = ''.join(c if c.isascii() else '' for c in slug)
    slug = slug.replace(' ', '_')
    slug = re.sub(r'[^a-z0-9_]', '', slug)
    slug = re.sub(r'_+', '_', slug).strip('_')
    return f"dk_{slug}" if slug else "dk_unknown"


def is_combining(char):
    """Check if character is a combining diacritical mark."""
    if not char or len(char) == 0:
        return False
    cp = ord(char[0])
    return (0x0300 <= cp <= 0x036F) or (0x1AB0 <= cp <= 0x1AFF) or (0x1DC0 <= cp <= 0x1DFF)


def format_dead_key_table(table):
    """Format dead key table with proper ordering."""
    if not table:
        return {}
    
    # Categorize entries
    letters = {}
    fr_vowels = {}
    ligatures = {}
    digits = {}
    symbols = {}
    combining = {}
    space_entry = None
    
    for key, value in table.items():
        if not key:
            continue
        if key == ' ' or (len(key) == 1 and ord(key) == 0x0020):
            space_entry = (key, value)
        elif len(key) == 1 and key.lower() in 'abcdefghijklmnopqrstuvwxyz':
            letters[key] = value
        elif key in 'éèçàùÉÈÇÀÙ':
            fr_vowels[key] = value
        elif key in 'æÆœŒ':
            ligatures[key] = value
        elif key in '0123456789':
            digits[key] = value
        elif is_combining(key):
            combining[key] = value
        else:
            symbols[key] = value
    
    # Order letters: a, A, b, B, ...
    ordered = []
    for char in 'abcdefghijklmnopqrstuvwxyz':
        if char in letters:
            ordered.append((char, letters[char]))
        if char.upper() in letters:
            ordered.append((char.upper(), letters[char.upper()]))
    
    # Add French vowels in order
    for key in ['é', 'É', 'è', 'È', 'ç', 'Ç', 'à', 'À', 'ù', 'Ù']:
        if key in fr_vowels:
            ordered.append((key, fr_vowels[key]))
    
    # Add ligatures
    for key in ['æ', 'Æ', 'œ', 'Œ']:
        if key in ligatures:
            ordered.append((key, ligatures[key]))
    
    # Add digits
    for key in '0123456789':
        if key in digits:
            ordered.append((key, digits[key]))
    
    # Add other symbols (sorted by code point)
    for key in sorted(symbols.keys(), key=lambda x: ord(x[0]) if x else 0):
        ordered.append((key, symbols[key]))
    
    # Add combining marks
    for key in sorted(combining.keys(), key=lambda x: ord(x[0]) if x else 0):
        ordered.append((key, combining[key]))
    
    # Add space at the very end
    if space_entry:
        ordered.append(space_entry)
    
    return dict(ordered)


# =============================================================================
# PARSER
# =============================================================================

def parse_keylayout(filepath):
    """Parse a .keylayout XML file."""
    # Read and clean content
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove invalid XML character references
    def clean_char_ref(match):
        code = int(match.group(1), 16)
        if code == 0x09 or code == 0x0A or code == 0x0D or code >= 0x20:
            return match.group(0)
        return ""
    
    content = re.sub(r'&#x([0-9A-Fa-f]+);', clean_char_ref, content)
    
    root = ET.fromstring(content)
    layout_name = root.get("name", "Unknown Layout")
    
    # Parse keyMaps — prefer ISO keyMapSet, fallback to first available
    key_maps = {}
    all_key_map_sets = root.findall(".//keyMapSet")
    key_map_set = None
    if all_key_map_sets:
        # Prefer ISO keyMapSet (most keys), fallback to first without baseMapSet overrides
        for kms in all_key_map_sets:
            if kms.get("id", "").upper() == "ISO":
                key_map_set = kms
                break
        if key_map_set is None:
            # Pick the keyMapSet with the most keys (skip override-only sets)
            key_map_set = max(all_key_map_sets,
                key=lambda kms: sum(len(m.findall("key")) for m in kms.findall("keyMap")))
    if key_map_set is not None:
        for key_map in key_map_set.findall("keyMap"):
            if key_map.get("baseMapSet"):
                continue  # Skip override-only keymaps (reference another set)
            index = int(key_map.get("index", 0))
            keys = {}
            for key in key_map.findall("key"):
                code = int(key.get("code"))
                keys[code] = {"output": key.get("output"), "action": key.get("action")}
            key_maps[index] = keys
    
    # Parse actions
    actions = {}
    actions_elem = root.find("actions")
    if actions_elem is not None:
        for action in actions_elem.findall("action"):
            action_id = action.get("id")
            when_list = []
            for when in action.findall("when"):
                when_list.append({
                    "state": when.get("state"),
                    "next": when.get("next"),
                    "output": when.get("output")
                })
            actions[action_id] = when_list
    
    # Parse terminators
    terminators = {}
    terminators_elem = root.find("terminators")
    if terminators_elem is not None:
        for when in terminators_elem.findall("when"):
            terminators[when.get("state")] = when.get("output")
    
    return {"layout_name": layout_name, "key_maps": key_maps, "actions": actions, "terminators": terminators}


def get_key_value(key_maps, code, index, actions):
    """Get output value for a key at a specific modifier index."""
    if index not in key_maps or code not in key_maps[index]:
        return None
    
    key_data = key_maps[index][code]
    
    if key_data["output"]:
        return decode_output(key_data["output"])
    
    if key_data["action"]:
        action_name = key_data["action"]
        
        # Check for dead key (Apple format: "Entering ...", Kalamine format: "dead_...")
        if action_name.startswith("Entering "):
            return match_dead_key_name(action_name[9:])
        if action_name.startswith("dead_"):
            return match_dead_key_name(action_name[5:])

        # Look up action output or detect generic dead key (Optimot format: action name = "aigu", "caron", etc.)
        if action_name in actions:
            for when in actions[action_name]:
                if when["state"] == "none":
                    if when.get("next") and not when.get("output"):
                        # Generic dead key: state="none" + next=... without output
                        return match_dead_key_name(action_name)
                    if when["output"]:
                        return decode_output(when["output"])
        
        # Return short action names as-is
        if len(action_name) <= 2:
            return action_name
    
    return None


# Dead key signatures: mapping of (base_char, output_char) pairs to dead key names
# If a dead key table contains these transformations, it's identified as that type
DK_SIGNATURES = {
    # Diacritical marks - identified by characteristic transformations
    "dk_circumflex": [("a", "â"), ("e", "ê"), ("o", "ô"), ("i", "î"), ("u", "û")],
    "dk_diaeresis": [("a", "ä"), ("e", "ë"), ("o", "ö"), ("i", "ï"), ("u", "ü")],
    "dk_acute": [("a", "á"), ("e", "é"), ("o", "ó"), ("i", "í"), ("u", "ú")],
    "dk_grave": [("a", "à"), ("e", "è"), ("o", "ò"), ("i", "ì"), ("u", "ù")],
    "dk_tilde": [("a", "ã"), ("n", "ñ"), ("o", "õ")],
    "dk_caron": [("c", "č"), ("s", "š"), ("z", "ž"), ("r", "ř")],
    "dk_breve": [("a", "ă"), ("g", "ğ"), ("u", "ŭ")],
    "dk_macron": [("a", "ā"), ("e", "ē"), ("o", "ō"), ("i", "ī"), ("u", "ū")],
    "dk_cedilla": [("c", "ç"), ("s", "ş"), ("t", "ţ")],
    "dk_ogonek": [("a", "ą"), ("e", "ę"), ("i", "į"), ("o", "ǫ"), ("u", "ų")],
    "dk_ring_above": [("a", "å"), ("u", "ů")],
    "dk_dot_above": [("z", "ż"), ("e", "ė"), ("g", "ġ")],
    "dk_dot_below": [("a", "ạ"), ("e", "ẹ"), ("o", "ọ")],
    "dk_stroke": [("o", "ø"), ("l", "ł")],
    "dk_horizontal_stroke": [("d", "đ"), ("h", "ħ"), ("t", "ŧ")],
    "dk_horn": [("o", "ơ"), ("u", "ư")],
    "dk_hook": [("a", "ả"), ("e", "ẻ"), ("o", "ỏ")],
    "dk_double_acute": [("o", "ő"), ("u", "ű")],
    "dk_double_grave": [("a", "ȁ"), ("e", "ȅ"), ("o", "ȍ")],
    "dk_inverted_breve": [("a", "ȃ"), ("e", "ȇ"), ("o", "ȏ")],
    "dk_comma": [("s", "ș"), ("t", "ț")],
    # Alphabet dead keys - identified by Greek/Cyrillic letter outputs
    "dk_greek": [("a", "α"), ("b", "β"), ("g", "γ"), ("d", "δ"), ("p", "π")],
    "dk_cyrillic": [("a", "а"), ("b", "б"), ("c", "ц"), ("d", "д")],
    # Superscript/subscript - identified by digit transformations
    "dk_superscript": [("1", "¹"), ("2", "²"), ("3", "³"), ("0", "⁰")],
    "dk_subscript": [("1", "₁"), ("2", "₂"), ("3", "₃"), ("0", "₀")],
    # Currency symbols - identified by currency outputs
    "dk_currencies": [("c", "¢"), ("y", "¥"), ("e", "₠"), ("f", "ƒ"), ("L", "₤"), ("p", "₱")],
    # Punctuation / Extended Latin
    "dk_punctuation": [("s", "ß"), ("d", "ð"), ("t", "þ"), ("n", "ŋ")],
    "dk_extended_latin": [("s", "ß"), ("d", "ð"), ("t", "þ"), ("n", "ŋ"), ("e", "ə")],
}


def identify_dead_key_by_content(table, fallback_name):
    """Identify dead key type by analyzing transformation table content."""
    if not table:
        return fallback_name
    
    # Score each known dead key type
    best_match = None
    best_score = 0
    
    for dk_name, signatures in DK_SIGNATURES.items():
        score = 0
        for base_char, expected_output in signatures:
            if table.get(base_char) == expected_output:
                score += 1
        
        if score > best_score:
            best_score = score
            best_match = dk_name
    
    # Require at least 2 matches for confidence
    if best_score >= 2:
        return best_match
    
    # Fallback to name-based matching
    return fallback_name


def build_dead_keys(parsed_data):
    """Build dead key tables from parsed keylayout data.
    
    Returns:
        tuple: (dead_keys dict, rename_map dict mapping old dk names to new ones)
    """
    dead_keys = {}
    rename_map = {}  # old_name -> new_name
    actions = parsed_data["actions"]
    terminators = parsed_data["terminators"]
    
    # Pre-build a map: for each action, find its base output (state="none", output=X)
    action_base_output = {}
    for aid, wl in actions.items():
        for when in wl:
            if when["state"] == "none" and when.get("output"):
                action_base_output[aid] = decode_output(when["output"])
                break

    # Collect all dead key candidates first
    dk_candidates = []  # list of (dk_name_from_keylayout, entering_state, table)

    for action_id, when_list in actions.items():
        # Find entering state
        entering_state = None
        for when in when_list:
            if when["state"] == "none" and when.get("next"):
                entering_state = when["next"]
                break

        if not entering_state:
            continue

        # Support Apple ("Entering ..."), Kalamine ("dead_..."), and generic (Optimot) formats
        if action_id.startswith("Entering "):
            dk_name_from_keylayout = match_dead_key_name(action_id[9:])
        elif action_id.startswith("dead_"):
            dk_name_from_keylayout = match_dead_key_name(action_id[5:])
        else:
            # Generic format (e.g. Optimot): action name is directly the dead key name
            dk_name_from_keylayout = match_dead_key_name(action_id)

        table = {}

        # Find all actions that respond to this state
        for other_action_id, other_when_list in actions.items():
            for when in other_when_list:
                if when["state"] == entering_state and when.get("output"):
                    # Determine base character: use action ID if short (Apple format),
                    # otherwise use the action's base output (Kalamine format)
                    if len(other_action_id) <= 2:
                        base_char = other_action_id
                    else:
                        base_char = action_base_output.get(other_action_id)
                    if base_char and len(base_char) <= 2:
                        output = decode_output(when["output"])
                        if output:
                            table[base_char] = output

        # Add terminator (space → standalone accent)
        if entering_state in terminators:
            term_output = decode_output(terminators[entering_state])
            if term_output:
                table[" "] = term_output

        if table:
            dk_candidates.append((dk_name_from_keylayout, table))

    # Two-pass assignment: standard dead keys first (whose name matches a known
    # DK_SIGNATURES key), then the rest. This prevents non-standard dead keys
    # (like dk_1dk) from stealing standard names via content identification.
    known_dk_names = set(DK_SIGNATURES.keys())

    def sort_key(candidate):
        name = candidate[0]
        return (0 if name in known_dk_names else 1, name)

    dk_candidates.sort(key=sort_key)

    for dk_name_from_keylayout, table in dk_candidates:
        final_dk_name = identify_dead_key_by_content(table, dk_name_from_keylayout)
        # Avoid collisions: if this name is already taken, use the fallback name
        if final_dk_name in dead_keys and dk_name_from_keylayout != final_dk_name:
            final_dk_name = dk_name_from_keylayout
        dead_keys[final_dk_name] = format_dead_key_table(table)

        # Track renaming for key references
        if dk_name_from_keylayout != final_dk_name:
            rename_map[dk_name_from_keylayout] = final_dk_name
    
    return dead_keys, rename_map


def convert_to_json(parsed_data, version="2026"):
    """Convert parsed keylayout to JSON format."""
    key_maps = parsed_data["key_maps"]
    actions = parsed_data["actions"]
    
    # Detect which AltGr index pattern is used
    # Pattern A: 4=altgr, 5=caps+altgr, 6=shift+altgr, 7=caps+shift+altgr (most keylayouts)
    # Pattern B: 6=altgr, 7=caps+altgr, 8=shift+altgr, 9=caps+shift+altgr (some keylayouts like BÉPO)
    # We detect by checking if index 6 has more content than index 4
    altgr_idx = 6 if 6 in key_maps and len(key_maps.get(6, {})) > len(key_maps.get(4, {})) else 4
    
    # Group keys by row
    rows_data = {1: [], 2: [], 3: [], 4: [], 5: []}
    
    for code, (position, scancode, row_id, finger) in MAC_TO_ISO.items():
        base = get_key_value(key_maps, code, 0, actions)
        if not base:
            continue
        
        caps = get_key_value(key_maps, code, 1, actions)
        shift = get_key_value(key_maps, code, 2, actions)
        caps_shift = get_key_value(key_maps, code, 3, actions)
        
        # Use detected AltGr index pattern
        alt_gr = get_key_value(key_maps, code, altgr_idx, actions)
        caps_alt_gr = get_key_value(key_maps, code, altgr_idx + 1, actions)
        shift_alt_gr = get_key_value(key_maps, code, altgr_idx + 2, actions)
        caps_shift_alt_gr = get_key_value(key_maps, code, altgr_idx + 3, actions)
        
        # Build key object with ordered fields
        key_obj = {"position": position, "scancode": scancode}
        key_obj["base"] = base
        if shift:
            key_obj["shift"] = shift
        
        # Add caps only if different from base (Smart Caps Lock)
        if caps and caps != base:
            key_obj["caps"] = caps
        if caps_shift and caps_shift != shift:
            key_obj["caps_shift"] = caps_shift
        
        # Add AltGr layers (only if non-null)
        if alt_gr:
            key_obj["alt_gr"] = alt_gr
        if shift_alt_gr and shift_alt_gr != alt_gr:
            key_obj["shift_alt_gr"] = shift_alt_gr
        if caps_alt_gr and caps_alt_gr != alt_gr:
            key_obj["caps_alt_gr"] = caps_alt_gr
        if caps_shift_alt_gr and caps_shift_alt_gr != shift_alt_gr:
            key_obj["caps_shift_alt_gr"] = caps_shift_alt_gr
        
        key_obj["finger"] = finger
        rows_data[row_id].append(key_obj)
    
    # Sort keys by position
    for row_id in rows_data:
        rows_data[row_id].sort(key=lambda k: k["position"])
    
    # Build dead keys (returns tuple with rename_map)
    dead_keys_raw, dk_rename_map = build_dead_keys(parsed_data)
    dead_keys = {}
    for dk_name in sorted(dead_keys_raw.keys()):
        desc, example = DK_DESCRIPTIONS.get(dk_name, (dk_name.replace("dk_", "").replace("_", " ").title(), ""))
        dead_keys[dk_name] = {
            "description": desc,
            "example": example,
            "table": dead_keys_raw[dk_name]
        }
    
    # Apply dead key renaming to key references
    dk_layers = ["alt_gr", "shift_alt_gr", "caps_alt_gr", "caps_shift_alt_gr", "base", "shift", "caps", "caps_shift"]
    for row_id in rows_data:
        for key in rows_data[row_id]:
            for layer in dk_layers:
                if layer in key and key[layer] in dk_rename_map:
                    key[layer] = dk_rename_map[key[layer]]
    
    # Build rows
    rows = []
    for row_id in sorted(rows_data.keys()):
        if rows_data[row_id]:
            rows.append({
                "row_id": row_id,
                "row_name": ROW_NAMES[row_id],
                "keys": rows_data[row_id]
            })
    
    # Clean layout name
    layout_name = parsed_data["layout_name"]
    layout_name = re.sub(r'\s*\([Bb]eta\)', '', layout_name).strip()
    
    return {
        "layout_name": layout_name,
        "version": version,
        "standard": "ISO",
        "rows": rows,
        "dead_keys": dead_keys
    }


# =============================================================================
# COMPACT JSON FORMATTER
# =============================================================================

def format_compact_json(data):
    """Format JSON with compact key objects (1 line per key)."""
    lines = ['{']
    
    # Metadata
    for key in ['layout_name', 'version', 'standard']:
        if key in data:
            lines.append(f'  "{key}": {json.dumps(data[key], ensure_ascii=False)},')
    
    # Rows
    lines.append('  "rows": [')
    for i, row in enumerate(data['rows']):
        lines.append('    {')
        lines.append(f'      "row_id": {row["row_id"]},')
        lines.append(f'      "row_name": {json.dumps(row["row_name"])},')
        lines.append('      "keys": [')
        
        for j, key in enumerate(row['keys']):
            key_json = json.dumps(key, ensure_ascii=False, separators=(', ', ': '))
            comma = ',' if j < len(row['keys']) - 1 else ''
            lines.append(f'        {key_json}{comma}')
        
        lines.append('      ]')
        comma = ',' if i < len(data['rows']) - 1 else ''
        lines.append('    }' + comma)
    
    lines.append('  ],')
    
    # Dead keys
    lines.append('  "dead_keys": {')
    dk_names = list(data['dead_keys'].keys())
    for i, dk_name in enumerate(dk_names):
        dk = data['dead_keys'][dk_name]
        lines.append(f'    "{dk_name}": {{')
        lines.append(f'      "description": {json.dumps(dk["description"], ensure_ascii=False)},')
        lines.append(f'      "example": {json.dumps(dk["example"], ensure_ascii=False)},')
        lines.append('      "table": {')
        
        # Format table with 6 items per line
        items = list(dk['table'].items())
        for k in range(0, len(items), 6):
            chunk = items[k:k+6]
            line_items = ', '.join(f'{json.dumps(key, ensure_ascii=False)}: {json.dumps(val, ensure_ascii=False)}' for key, val in chunk)
            comma = ',' if k + 6 < len(items) else ''
            lines.append(f'        {line_items}{comma}')
        
        lines.append('      }')
        comma = ',' if i < len(dk_names) - 1 else ''
        lines.append('    }' + comma)
    
    lines.append('  }')
    lines.append('}')
    
    return '\n'.join(lines)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='Convert .keylayout to JSON')
    parser.add_argument('input', help='Input .keylayout file')
    parser.add_argument('-o', '--output', help='Output JSON file (default: same name with .json)')
    parser.add_argument('-v', '--version', default='2026', help='Layout version (default: 2026)')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: File not found: {args.input}")
        return 1
    
    output_path = Path(args.output) if args.output else input_path.with_suffix('.json')
    
    print(f"Converting {input_path} -> {output_path}")
    
    # Parse
    parsed = parse_keylayout(input_path)
    print(f"Layout: {parsed['layout_name']}")
    print(f"Found {len(parsed['key_maps'])} key maps, {len(parsed['actions'])} actions")
    
    # Convert
    result = convert_to_json(parsed, version=args.version)
    
    # Format and write
    formatted = format_compact_json(result)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(formatted)
    
    total_keys = sum(len(r['keys']) for r in result['rows'])
    print(f"Generated {len(result['rows'])} rows, {total_keys} keys, {len(result['dead_keys'])} dead keys")
    print(f"Output: {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
