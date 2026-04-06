#!/usr/bin/env python3
"""
Compare two JSON keyboard layouts.
Produces a text report with key-by-key comparison, dead key analysis,
character coverage, and frequency-based impact analysis.

Usage:
    python compare_layouts.py layout_a.json layout_b.json [-f freq.csv] [--context mixte]
"""

import json
import sys
import csv
import argparse
from pathlib import Path
from collections import defaultdict


# =============================================================================
# BUILT-IN FREQUENCY DATA
# =============================================================================

# French letter frequencies (mixed formal/informal corpus)
LETTER_FREQ = {
    'e': 0.1210, 'a': 0.0764, 's': 0.0651, 'i': 0.0639, 't': 0.0631,
    'n': 0.0623, 'r': 0.0607, 'u': 0.0505, 'l': 0.0496, 'o': 0.0466,
    'd': 0.0367, 'c': 0.0318, 'p': 0.0292, 'm': 0.0262, 'v': 0.0115,
    'q': 0.0099, 'f': 0.0095, 'b': 0.0080, 'g': 0.0077, 'h': 0.0061,
    'j': 0.0034, 'x': 0.0030, 'y': 0.0021, 'z': 0.0015, 'w': 0.0011,
    'k': 0.0005,
}

# Digit frequencies (dates, phone numbers, addresses, general prose)
DIGIT_FREQ = {
    '0': 0.0028, '1': 0.0032, '2': 0.0027, '3': 0.0018, '4': 0.0014,
    '5': 0.0015, '6': 0.0011, '7': 0.0011, '8': 0.0012, '9': 0.0013,
}

LAYERS = ["base", "shift", "caps", "caps_shift", "alt_gr", "shift_alt_gr", "caps_alt_gr", "caps_shift_alt_gr"]

ROW_NAMES = {1: "Number Row", 2: "Top Letter Row", 3: "Home Row", 4: "Bottom Row", 5: "Space Row"}


# =============================================================================
# DATA LOADING
# =============================================================================

def load_layout(path):
    """Load a JSON layout file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_frequencies(csv_path, context="mixte"):
    """Load character frequencies from CSV, merged with built-in letter/digit freqs."""
    freq = {}

    # Start with built-in letter frequencies (lowercase + uppercase share frequency)
    for letter, f in LETTER_FREQ.items():
        freq[letter] = f
        freq[letter.upper()] = f * 0.02  # ~2% of letters are uppercase

    for digit, f in DIGIT_FREQ.items():
        freq[digit] = f

    # Load CSV if provided
    if csv_path and Path(csv_path).exists():
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            rows = list(reader)

        # Find column indices from header (row index 1)
        header = rows[1] if len(rows) > 1 else []
        col_map = {}
        for i, h in enumerate(header):
            h_lower = h.strip().lower()
            if h_lower == "formel":
                col_map["formel"] = i
            elif h_lower == "informel":
                col_map["informel"] = i
            elif h_lower == "prog":
                col_map["prog"] = i
            elif h_lower == "symboles":
                col_map["symboles"] = i

        sym_col = col_map.get("symboles", 1)

        for row in rows[2:]:  # Skip headers
            if len(row) <= sym_col:
                continue
            char = row[sym_col].strip()
            if not char:
                continue

            values = []
            if context == "formel" and "formel" in col_map:
                try:
                    values = [float(row[col_map["formel"]].replace(",", "."))]
                except (ValueError, IndexError):
                    pass
            elif context == "informel" and "informel" in col_map:
                try:
                    values = [float(row[col_map["informel"]].replace(",", "."))]
                except (ValueError, IndexError):
                    pass
            elif context == "prog" and "prog" in col_map:
                try:
                    values = [float(row[col_map["prog"]].replace(",", "."))]
                except (ValueError, IndexError):
                    pass
            elif context == "texte":  # average of formel + informel only
                for col_name in ["formel", "informel"]:
                    if col_name in col_map:
                        try:
                            values.append(float(row[col_map[col_name]].replace(",", ".")))
                        except (ValueError, IndexError):
                            pass
            else:  # mixte: average of all available
                for col_name in ["formel", "informel", "prog"]:
                    if col_name in col_map:
                        try:
                            values.append(float(row[col_map[col_name]].replace(",", ".")))
                        except (ValueError, IndexError):
                            pass

            if values:
                freq[char] = sum(values) / len(values)

    return freq


# =============================================================================
# LAYOUT ANALYSIS
# =============================================================================

def build_key_map(data):
    """Build a dict: position -> {layer: value} from layout data."""
    key_map = {}
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            pos = key.get("position")
            if pos:
                layers = {}
                for layer in LAYERS:
                    if layer in key:
                        layers[layer] = key[layer]
                key_map[pos] = layers
    return key_map


def build_char_to_pos(data):
    """Build a dict: character -> [(position, layer)] from layout data."""
    char_map = defaultdict(list)
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            pos = key.get("position")
            for layer in LAYERS:
                if layer in key:
                    val = key[layer]
                    if val and not val.startswith("dk_"):
                        char_map[val].append((pos, layer))
    return char_map


def collect_all_chars(data):
    """Collect all unique characters accessible in a layout (direct + dead keys)."""
    chars = set()

    # Direct characters
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            for layer in LAYERS:
                if layer in key:
                    val = key[layer]
                    if val and not val.startswith("dk_"):
                        chars.add(val)

    # Dead key outputs
    for dk_name, dk_data in data.get("dead_keys", {}).items():
        table = dk_data.get("table", {})
        for output in table.values():
            chars.add(output)

    return chars


def count_chars_by_access(data):
    """Count characters by access method."""
    base_shift = set()
    altgr = set()
    dead_key_chars = set()

    for row in data.get("rows", []):
        for key in row.get("keys", []):
            for layer in ["base", "shift", "caps", "caps_shift"]:
                if layer in key and key[layer] and not key[layer].startswith("dk_"):
                    base_shift.add(key[layer])
            for layer in ["alt_gr", "shift_alt_gr", "caps_alt_gr", "caps_shift_alt_gr"]:
                if layer in key and key[layer] and not key[layer].startswith("dk_"):
                    altgr.add(key[layer])

    for dk_data in data.get("dead_keys", {}).values():
        for output in dk_data.get("table", {}).values():
            dead_key_chars.add(output)

    # Remove overlap
    altgr -= base_shift
    dead_key_chars -= base_shift | altgr

    return base_shift, altgr, dead_key_chars


def count_smart_caps(data):
    """Count keys using Smart Caps Lock (caps_alt_gr != alt_gr)."""
    count = 0
    for row in data.get("rows", []):
        for key in row.get("keys", []):
            if "caps_alt_gr" in key and "alt_gr" in key:
                if key["caps_alt_gr"] != key["alt_gr"]:
                    count += 1
    return count


def count_transformations(data):
    """Count total dead key transformation entries."""
    total = 0
    for dk_data in data.get("dead_keys", {}).values():
        total += len(dk_data.get("table", {}))
    return total


# =============================================================================
# COMPARISON
# =============================================================================

def compare_keys(map_a, map_b):
    """Compare two key maps, return list of differences per position."""
    all_positions = sorted(set(map_a.keys()) | set(map_b.keys()))
    results = []

    for pos in all_positions:
        layers_a = map_a.get(pos, {})
        layers_b = map_b.get(pos, {})
        all_layers = sorted(set(layers_a.keys()) | set(layers_b.keys()),
                            key=lambda l: LAYERS.index(l) if l in LAYERS else 99)

        for layer in all_layers:
            val_a = layers_a.get(layer)
            val_b = layers_b.get(layer)
            results.append({
                "position": pos,
                "layer": layer,
                "val_a": val_a,
                "val_b": val_b,
                "status": "=" if val_a == val_b else "CHANGED"
            })

    return results


def find_moved_chars(data_a, data_b):
    """Find characters present in both layouts but at different positions."""
    char_a = build_char_to_pos(data_a)
    char_b = build_char_to_pos(data_b)

    common_chars = set(char_a.keys()) & set(char_b.keys())
    moved = []

    for char in sorted(common_chars):
        pos_a = char_a[char]
        pos_b = char_b[char]
        # Compare primary position (first occurrence)
        if pos_a[0] != pos_b[0]:
            moved.append({
                "char": char,
                "pos_a": f"{pos_a[0][0]}/{pos_a[0][1]}",
                "pos_b": f"{pos_b[0][0]}/{pos_b[0][1]}",
            })

    return moved


def compare_dead_keys(data_a, data_b):
    """Compare dead keys between two layouts."""
    dks_a = set(data_a.get("dead_keys", {}).keys())
    dks_b = set(data_b.get("dead_keys", {}).keys())

    return {
        "common": sorted(dks_a & dks_b),
        "only_a": sorted(dks_a - dks_b),
        "only_b": sorted(dks_b - dks_a),
    }


# =============================================================================
# IMPACT ANALYSIS
# =============================================================================

def analyze_impact(data_a, data_b, freq):
    """Analyze impact of position changes weighted by frequency.
    Returns (key_changed, layer_changed) — two lists of impacts.
    key_changed: character moves to a different physical key.
    layer_changed: character stays on same key but changes layer (e.g. base↔shift).
    """
    char_a = build_char_to_pos(data_a)
    char_b = build_char_to_pos(data_b)

    common_chars = set(char_a.keys()) & set(char_b.keys())
    key_changed = []
    layer_changed = []

    for char in common_chars:
        pos_a = char_a[char][0]  # primary position (position, layer)
        pos_b = char_b[char][0]
        char_freq = freq.get(char, 0)

        if pos_a != pos_b and char_freq > 0:
            entry = {
                "char": char,
                "freq": char_freq,
                "pos_a": f"{pos_a[0]}/{pos_a[1]}",
                "pos_b": f"{pos_b[0]}/{pos_b[1]}",
            }
            if pos_a[0] != pos_b[0]:
                # Different physical key
                key_changed.append(entry)
            else:
                # Same key, different layer
                layer_changed.append(entry)

    key_changed.sort(key=lambda x: x["freq"], reverse=True)
    layer_changed.sort(key=lambda x: x["freq"], reverse=True)
    return key_changed, layer_changed


# =============================================================================
# REPORT FORMATTING
# =============================================================================

def display_char(val):
    """Display a character value, handling special cases."""
    if val is None:
        return "(vide)"
    if val == " ":
        return "⎵"
    if val == "\u00a0":
        return "NBSP"
    if val == "\u202f":
        return "NNBSP"
    return val


def print_header(title):
    """Print a section header."""
    print()
    print(f"{'═' * 60}")
    print(f"  {title}")
    print(f"{'═' * 60}")


def print_subheader(title):
    """Print a subsection header."""
    print()
    print(f"── {title} {'─' * max(0, 55 - len(title))}")


def print_table(headers, rows, col_widths=None):
    """Print a formatted table."""
    if not col_widths:
        col_widths = []
        for i, h in enumerate(headers):
            max_w = len(h)
            for row in rows:
                if i < len(row):
                    max_w = max(max_w, len(str(row[i])))
            col_widths.append(min(max_w, 20))

    # Header
    line = "  ".join(h.ljust(w) for h, w in zip(headers, col_widths))
    print(line)
    print("  ".join("─" * w for w in col_widths))

    # Rows
    for row in rows:
        cells = []
        for i, w in enumerate(col_widths):
            val = str(row[i]) if i < len(row) else ""
            cells.append(val.ljust(w))
        print("  ".join(cells))


# =============================================================================
# MAIN REPORT
# =============================================================================

def generate_report(data_a, data_b, freq):
    """Generate the full comparison report."""
    name_a = data_a.get("layout_name", "Layout A")
    name_b = data_b.get("layout_name", "Layout B")

    map_a = build_key_map(data_a)
    map_b = build_key_map(data_b)

    # ── Section 1: Summary ──
    print_header(f"Comparaison : {name_a} vs {name_b}")

    bs_a, ag_a, dk_a = count_chars_by_access(data_a)
    bs_b, ag_b, dk_b = count_chars_by_access(data_b)
    all_a = collect_all_chars(data_a)
    all_b = collect_all_chars(data_b)

    print()
    print_table(
        ["", name_a, name_b],
        [
            ["Touches totales", len(map_a), len(map_b)],
            ["Dead keys", len(data_a.get("dead_keys", {})), len(data_b.get("dead_keys", {}))],
            ["Transformations", count_transformations(data_a), count_transformations(data_b)],
            ["Smart Caps Lock", count_smart_caps(data_a), count_smart_caps(data_b)],
            ["Caractères uniques", len(all_a), len(all_b)],
        ],
        [22, max(len(name_a), 8), max(len(name_b), 8)]
    )

    # ── Section 2: Key-by-key comparison ──
    print_header("Comparaison touche par touche")

    diffs = compare_keys(map_a, map_b)
    # Group by row
    row_for_pos = {}
    for row in data_a.get("rows", []) + data_b.get("rows", []):
        rid = row.get("row_id", 0)
        for key in row.get("keys", []):
            row_for_pos[key["position"]] = rid

    # Count identical vs different keys
    pos_status = {}
    for d in diffs:
        pos = d["position"]
        if pos not in pos_status:
            pos_status[pos] = True
        if d["status"] != "=":
            pos_status[pos] = False

    identical = sum(1 for v in pos_status.values() if v)
    different = sum(1 for v in pos_status.values() if not v)
    total_keys = len(pos_status)

    # Show only differences
    changed_diffs = [d for d in diffs if d["status"] != "="]

    # Group by row for display
    current_row = None
    for d in changed_diffs:
        pos = d["position"]
        rid = row_for_pos.get(pos, 0)
        if rid != current_row:
            current_row = rid
            print_subheader(ROW_NAMES.get(rid, f"Row {rid}"))
            print_table(
                ["Pos", "Layer", name_a, name_b],
                [],  # just header
                [5, 16, 18, 18]
            )

        val_a = display_char(d["val_a"])
        val_b = display_char(d["val_b"])
        cells = [d["position"], d["layer"], val_a, val_b]
        line = "  ".join(str(c).ljust(w) for c, w in zip(cells, [5, 16, 18, 18]))
        print(line)

    print_subheader("Résumé")
    print(f"  Touches identiques : {identical:3d} / {total_keys} ({100*identical/total_keys:.1f}%)")
    print(f"  Touches différentes: {different:3d} / {total_keys} ({100*different/total_keys:.1f}%)")

    # ── Section 3: Moved characters ──
    print_header("Touches déplacées")

    moved = find_moved_chars(data_a, data_b)
    if moved:
        print_table(
            ["Char", f"{name_a} (Pos/Layer)", f"{name_b} (Pos/Layer)"],
            [[display_char(m["char"]), m["pos_a"], m["pos_b"]] for m in moved[:40]],
            [8, 22, 22]
        )
        if len(moved) > 40:
            print(f"  ... et {len(moved) - 40} autres")
        print(f"\n  Total : {len(moved)} caractères déplacés")
    else:
        print("  Aucun caractère déplacé")

    # ── Section 4: Dead keys ──
    print_header("Dead keys : communes vs exclusives")

    dk_cmp = compare_dead_keys(data_a, data_b)

    print(f"\n  Communes ({len(dk_cmp['common'])}) :")
    for i in range(0, len(dk_cmp['common']), 4):
        chunk = dk_cmp['common'][i:i+4]
        print(f"    {', '.join(chunk)}")

    if dk_cmp["only_a"]:
        print(f"\n  Exclusives à {name_a} ({len(dk_cmp['only_a'])}) :")
        for i in range(0, len(dk_cmp['only_a']), 4):
            chunk = dk_cmp['only_a'][i:i+4]
            print(f"    {', '.join(chunk)}")

    if dk_cmp["only_b"]:
        print(f"\n  Exclusives à {name_b} ({len(dk_cmp['only_b'])}) :")
        for i in range(0, len(dk_cmp['only_b']), 4):
            chunk = dk_cmp['only_b'][i:i+4]
            print(f"    {', '.join(chunk)}")

    # ── Section 5: Character coverage ──
    print_header("Couverture de caractères")

    print()
    print_table(
        ["", name_a, name_b],
        [
            ["Base + Shift", len(bs_a), len(bs_b)],
            ["Via AltGr", len(ag_a), len(ag_b)],
            ["Via dead keys", len(dk_a), len(dk_b)],
            ["─" * 20, "─" * 8, "─" * 8],
            ["Total unique", len(all_a), len(all_b)],
        ],
        [22, max(len(name_a), 8), max(len(name_b), 8)]
    )

    only_a = all_a - all_b
    only_b = all_b - all_a
    common = all_a & all_b

    print(f"\n  Caractères exclusifs à {name_a} : {len(only_a)}")
    print(f"  Caractères exclusifs à {name_b} : {len(only_b)}")
    print(f"  Caractères communs : {len(common)}")

    # ── Section 6: Impact analysis ──
    print_header("Analyse d'impact par fréquence")

    key_changed, layer_changed = analyze_impact(data_a, data_b, freq)
    all_impacts = key_changed + layer_changed
    all_impacts.sort(key=lambda x: x["freq"], reverse=True)

    if all_impacts:
        rows_data = []
        for imp in all_impacts[:25]:
            char_display = display_char(imp["char"])
            freq_pct = f"{imp['freq']*100:.4f}%"
            # Mark layer-only changes
            tag = "" if imp in key_changed else " (même touche)"
            rows_data.append([char_display, freq_pct, imp["pos_a"], imp["pos_b"] + tag])

        print()
        print_table(
            ["Char", "Fréquence", f"{name_a}", f"{name_b}"],
            rows_data,
            [8, 12, 18, 28]
        )

        if len(all_impacts) > 25:
            print(f"  ... et {len(all_impacts) - 25} autres")

        total_impact = sum(imp["freq"] for imp in all_impacts)
        key_impact = sum(imp["freq"] for imp in key_changed)
        layer_impact = sum(imp["freq"] for imp in layer_changed)

        print(f"\n  Impact total :              {total_impact*100:.2f}% des frappes")
        print(f"    ↳ Changement de touche :  {key_impact*100:.2f}% ({len(key_changed)} caractères)")
        print(f"    ↳ Même touche, autre layer : {layer_impact*100:.2f}% ({len(layer_changed)} caractères)")
    else:
        print("  Aucun caractère déplacé avec fréquence connue")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Compare two JSON keyboard layouts")
    parser.add_argument("layout_a", help="First JSON layout file")
    parser.add_argument("layout_b", help="Second JSON layout file")
    parser.add_argument("-f", "--freq", help="Frequency CSV file", default=None)
    parser.add_argument("--context", help="Frequency context (formel/informel/texte/prog/mixte)",
                        default="mixte", choices=["formel", "informel", "texte", "prog", "mixte"])

    args = parser.parse_args()

    data_a = load_layout(args.layout_a)
    data_b = load_layout(args.layout_b)
    freq = load_frequencies(args.freq, args.context)

    generate_report(data_a, data_b, freq)


if __name__ == "__main__":
    main()
