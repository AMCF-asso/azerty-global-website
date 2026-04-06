#!/usr/bin/env python3
"""
JSON to XKB Converter
Converts JSON keyboard layout files to Linux XKB symbols and .XCompose files.

Usage:
    python json_to_xkb.py input.json [-o output_symbols] [--compose output_compose]
"""

import json
import sys
import argparse
from pathlib import Path


# =============================================================================
# MAPPING TABLES
# =============================================================================

# Position ISO → Nom XKB
ISO_TO_XKB = {
    "E00": "TLDE", "E01": "AE01", "E02": "AE02", "E03": "AE03", "E04": "AE04", "E05": "AE05",
    "E06": "AE06", "E07": "AE07", "E08": "AE08", "E09": "AE09", "E10": "AE10", "E11": "AE11", "E12": "AE12",
    "D01": "AD01", "D02": "AD02", "D03": "AD03", "D04": "AD04", "D05": "AD05",
    "D06": "AD06", "D07": "AD07", "D08": "AD08", "D09": "AD09", "D10": "AD10", "D11": "AD11", "D12": "AD12",
    "C01": "AC01", "C02": "AC02", "C03": "AC03", "C04": "AC04", "C05": "AC05",
    "C06": "AC06", "C07": "AC07", "C08": "AC08", "C09": "AC09", "C10": "AC10", "C11": "AC11", "C12": "BKSL",
    "B00": "LSGT", "B01": "AB01", "B02": "AB02", "B03": "AB03", "B04": "AB04", "B05": "AB05",
    "B06": "AB06", "B07": "AB07", "B08": "AB08", "B09": "AB09", "B10": "AB10",
    "A03": "SPCE"
}

# Dead Key JSON → XKB
DK_TO_XKB = {
    # Accents diacritiques standards
    "dk_circumflex": "dead_circumflex",
    "dk_diaeresis": "dead_diaeresis",
    "dk_acute": "dead_acute",
    "dk_grave": "dead_grave",
    "dk_tilde": "dead_tilde",
    "dk_caron": "dead_caron",
    "dk_breve": "dead_breve",
    "dk_inverted_breve": "dead_invertedbreve",
    "dk_ogonek": "dead_ogonek",
    "dk_macron": "dead_macron",
    "dk_cedilla": "dead_cedilla",
    "dk_stroke": "dead_stroke",
    "dk_horizontal_stroke": "dead_longsolidusoverlay",
    "dk_dot_above": "dead_abovedot",
    "dk_dot_below": "dead_belowdot",
    "dk_double_acute": "dead_doubleacute",
    "dk_double_grave": "dead_doublegrave",
    "dk_horn": "dead_horn",
    "dk_hook": "dead_hook",
    "dk_ring_above": "dead_abovering",
    "dk_comma": "dead_belowcomma",
    
    # Dead keys spéciales (Bépo, AZERTY Global)
    "dk_greek": "dead_greek",
    "dk_cyrillic": "dead_semivoiced_sound",
    "dk_currencies": "dead_currency",
    "dk_superscript": "dead_abovering",
    "dk_subscript": "dead_belowring",
    "dk_scientific": "dead_iota",
    "dk_punctuation": "dead_belowtilde",
    "dk_extended_latin": "dead_voiced_sound",
    "dk_misc_symbols": "dead_belowmacron",
    "dk_phonetic": "dead_belowbreve",
}

# Caractères spéciaux → keysym XKB
SPECIAL_KEYSYMS = {
    " ": "space", "(": "parenleft", ")": "parenright",
    "[": "bracketleft", "]": "bracketright",
    "{": "braceleft", "}": "braceright",
    "<": "less", ">": "greater",
    "+": "plus", "-": "minus", "=": "equal",
    "/": "slash", "\\": "backslash", "|": "bar",
    "*": "asterisk", "&": "ampersand", "%": "percent",
    "$": "dollar", "£": "sterling", "€": "EuroSign",
    "@": "at", "#": "numbersign", "!": "exclam",
    "?": "question", ";": "semicolon", ":": "colon",
    ",": "comma", ".": "period", "'": "apostrophe",
    '"': "quotedbl", "`": "grave", "~": "asciitilde",
    "^": "asciicircum", "_": "underscore",
}


# =============================================================================
# CONVERSION FUNCTIONS
# =============================================================================

def char_to_keysym(char):
    """Convert a character to XKB keysym."""
    if not char:
        return "NoSymbol"
    
    # Dead key reference
    if char.startswith("dk_"):
        return DK_TO_XKB.get(char, "NoSymbol")
    
    cp = ord(char)
    
    # ASCII alphanumeric → direct letter
    if char.isalnum() and cp < 128:
        return char
    
    # Special characters
    if char in SPECIAL_KEYSYMS:
        return SPECIAL_KEYSYMS[char]
    
    # Unicode keysym
    return f"U{cp:04X}"


def char_to_xcompose_keysym(char):
    """Convert a character to keysym for .XCompose file."""
    if not char:
        return None
    
    cp = ord(char)
    
    # Letters and digits → direct
    if char.isalpha() or char.isdigit():
        return char
    
    # Space
    if char == " ":
        return "space"
    
    # Special characters
    if char in SPECIAL_KEYSYMS:
        return SPECIAL_KEYSYMS[char]
    
    # Unicode keysym
    return f"U{cp:04X}"


def needs_eight_level(key):
    """Check if a key needs 8-level type (Smart Caps Lock)."""
    alt_gr = key.get("alt_gr")
    caps_alt_gr = key.get("caps_alt_gr")
    shift_alt_gr = key.get("shift_alt_gr")
    caps_shift_alt_gr = key.get("caps_shift_alt_gr")
    
    # Need 8-level if caps_alt_gr differs from alt_gr
    if caps_alt_gr and alt_gr and caps_alt_gr != alt_gr:
        return True
    if caps_shift_alt_gr and shift_alt_gr and caps_shift_alt_gr != shift_alt_gr:
        return True
    
    return False


def generate_key_line(key):
    """Generate XKB key definition line."""
    position = key.get("position")
    if position not in ISO_TO_XKB:
        return None
    
    xkb_name = ISO_TO_XKB[position]
    
    # Get all layers
    base = char_to_keysym(key.get("base"))
    shift = char_to_keysym(key.get("shift"))
    caps = char_to_keysym(key.get("caps", key.get("base")))
    caps_shift = char_to_keysym(key.get("caps_shift", key.get("shift")))
    alt_gr = char_to_keysym(key.get("alt_gr"))
    shift_alt_gr = char_to_keysym(key.get("shift_alt_gr", key.get("alt_gr")))
    caps_alt_gr = char_to_keysym(key.get("caps_alt_gr", key.get("alt_gr")))
    caps_shift_alt_gr = char_to_keysym(key.get("caps_shift_alt_gr", key.get("shift_alt_gr", key.get("alt_gr"))))
    
    # Check if we need 8-level or 4-level
    if needs_eight_level(key):
        key_type = 'type[Group1]= "EIGHT_LEVEL_ALPHABETIC_LEVEL_FIVE_LOCK",'
        symbols = f"[ {base}, {shift}, {caps}, {caps_shift}, {alt_gr}, {shift_alt_gr}, {caps_alt_gr}, {caps_shift_alt_gr} ]"
    else:
        # Standard 4-level
        key_type = ""
        if alt_gr and alt_gr != "NoSymbol":
            symbols = f"[ {base}, {shift}, {alt_gr}, {shift_alt_gr} ]"
        else:
            symbols = f"[ {base}, {shift} ]"
    
    if key_type:
        return f"    key <{xkb_name}> {{ {key_type} {symbols} }};"
    else:
        return f"    key <{xkb_name}> {{ {symbols} }};"


def generate_xkb_symbols(data, layout_name="global"):
    """Generate complete XKB symbols file content."""
    display_name = data.get("layout_name", "Custom Layout")
    
    lines = [
        f"// {display_name} for Linux (XKB)",
        "// Generated automatically from JSON",
        "",
        "default partial alphanumeric_keys",
        f'xkb_symbols "{layout_name}" {{',
        f'    name[Group1]="{display_name}";',
        '    include "latin(type4)"',
        "",
    ]
    
    # Generate key definitions
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            line = generate_key_line(key)
            if line:
                lines.append(line)
    
    lines.append("};")
    
    return "\n".join(lines)


def generate_xcompose(data):
    """Generate .XCompose file content."""
    lines = [
        f"# {data.get('layout_name', 'Custom Layout')}",
        "# Generated automatically from JSON",
        "",
        'include "%L"',
        "",
    ]
    
    dead_keys = data.get("dead_keys", {})
    
    for dk_name, dk_data in sorted(dead_keys.items()):
        xkb_dk = DK_TO_XKB.get(dk_name)
        if not xkb_dk:
            continue
        
        table = dk_data.get("table", {})
        if not table:
            continue
        
        lines.append(f"# Dead Key: {dk_name}")
        
        for trigger, output in sorted(table.items(), key=lambda x: (len(x[0]), x[0])):
            keysym = char_to_xcompose_keysym(trigger)
            if keysym:
                # Escape double quotes in output
                escaped_output = output.replace('"', '\\"')
                lines.append(f'<{xkb_dk}> <{keysym}> : "{escaped_output}"')
        
        lines.append("")
    
    return "\n".join(lines)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Convert JSON keyboard layout to XKB symbols and .XCompose")
    parser.add_argument("input", help="Input JSON file")
    parser.add_argument("-o", "--output", help="Output XKB symbols file", default=None)
    parser.add_argument("--compose", help="Output .XCompose file", default=None)
    parser.add_argument("-n", "--name", help="Layout name/variant", default="global")
    
    args = parser.parse_args()
    
    # Read JSON
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: File not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Converting: {data.get('layout_name', input_path.stem)}")
    
    # Generate XKB symbols
    if args.output:
        xkb_content = generate_xkb_symbols(data, args.name)
        output_path = Path(args.output)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(xkb_content)
        print(f"XKB symbols: {output_path}")
    else:
        # Print to stdout
        print("\n--- XKB Symbols ---")
        print(generate_xkb_symbols(data, args.name))
    
    # Generate .XCompose
    if args.compose:
        compose_content = generate_xcompose(data)
        compose_path = Path(args.compose)
        with open(compose_path, "w", encoding="utf-8") as f:
            f.write(compose_content)
        print(f".XCompose: {compose_path}")
    elif not args.output:
        print("\n--- .XCompose ---")
        print(generate_xcompose(data))


if __name__ == "__main__":
    main()
