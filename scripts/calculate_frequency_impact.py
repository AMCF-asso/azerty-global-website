#!/usr/bin/env python3
"""
Layout Frequency Impact Calculator
Calculates the percentage of keystrokes that are typed differently
between AZERTY Traditionnel and another layout, using character frequency data.

Usage:
    python calculate_frequency_impact.py target_layout.json [--context formel|informel|prog]

Example:
    python calculate_frequency_impact.py "data/AZERTY Global Final.json" --context formel
"""

import json
import csv
import sys
from pathlib import Path
from collections import defaultdict

# Path to frequency data
FREQ_FILE = Path(__file__).parent.parent / "data" / "Frequences-caracteres.csv"
REF_FILE = Path(__file__).parent.parent / "data" / "AZERTY Traditionnel.json"

MODIFIER_LEVELS = ["base", "shift", "alt_gr", "shift_alt_gr"]


def load_frequencies(filepath, context="formel"):
    """Load character frequencies from CSV file."""
    context_map = {"formel": 2, "informel": 3, "prog": 4}
    col_idx = context_map.get(context.lower(), 2)
    
    frequencies = {}
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i < 2 or len(row) < 5:  # Skip header rows
                continue
            
            char = row[1].strip()
            if not char:
                continue
            
            try:
                # French decimal format: "0,123" -> 0.123
                freq_str = row[col_idx].strip().replace(",", ".")
                freq = float(freq_str)
                frequencies[char] = freq
            except (ValueError, IndexError):
                continue
    
    return frequencies


def load_layout(filepath):
    """Load a keyboard layout JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def build_character_map(layout):
    """Build a mapping of character -> list of (position, modifier) tuples."""
    char_map = defaultdict(list)
    
    for row in layout.get("rows", []):
        for key in row.get("keys", []):
            position = key.get("position")
            
            for modifier in MODIFIER_LEVELS:
                char = key.get(modifier)
                if char and char not in (None, ""):
                    char_map[char].append((position, modifier))
    
    return char_map


def calculate_impact(ref_path, target_path, frequencies):
    """
    Calculate the percentage of keystrokes that are typed differently.
    
    Returns:
        - total_freq: sum of all character frequencies
        - affected_freq: sum of frequencies for characters that changed position
        - percentage: affected_freq / total_freq * 100
        - details: list of affected characters with their frequencies
    """
    ref_layout = load_layout(ref_path)
    target_layout = load_layout(target_path)
    
    ref_map = build_character_map(ref_layout)
    target_map = build_character_map(target_layout)
    
    total_freq = 0.0
    affected_freq = 0.0
    unchanged_freq = 0.0
    
    affected_chars = []
    unchanged_chars = []
    not_in_freq = []
    
    for char, ref_positions in ref_map.items():
        # Skip dead keys for frequency calculation
        if char.startswith("dk_"):
            continue
        
        char_freq = frequencies.get(char, 0.0)
        
        if char_freq == 0:
            not_in_freq.append(char)
            continue
        
        total_freq += char_freq
        
        if char not in target_map:
            # Character was removed - counts as affected
            affected_freq += char_freq
            affected_chars.append({
                "char": char,
                "frequency": char_freq,
                "change_type": "removed"
            })
        else:
            target_positions = target_map[char]
            
            # Check if any position+modifier combination is the same
            is_unchanged = False
            for ref_pos, ref_mod in ref_positions:
                if any(t_pos == ref_pos and t_mod == ref_mod 
                       for t_pos, t_mod in target_positions):
                    is_unchanged = True
                    break
            
            if is_unchanged:
                unchanged_freq += char_freq
                unchanged_chars.append({
                    "char": char,
                    "frequency": char_freq
                })
            else:
                # Check if same key but different modifier
                same_key = any(
                    t_pos == ref_pos 
                    for ref_pos, _ in ref_positions
                    for t_pos, _ in target_positions
                )
                
                affected_freq += char_freq
                affected_chars.append({
                    "char": char,
                    "frequency": char_freq,
                    "change_type": "same_key_diff_mod" if same_key else "different_key"
                })
    
    percentage = (affected_freq / total_freq * 100) if total_freq > 0 else 0
    
    return {
        "total_frequency": total_freq,
        "affected_frequency": affected_freq,
        "unchanged_frequency": unchanged_freq,
        "percentage_affected": percentage,
        "affected_chars": sorted(affected_chars, key=lambda x: -x["frequency"]),
        "unchanged_chars": sorted(unchanged_chars, key=lambda x: -x["frequency"]),
        "not_in_frequencies": not_in_freq
    }


def print_report(results, ref_name, target_name, context):
    """Print a formatted impact report."""
    print("=" * 70)
    print(f"IMPACT SUR LES FRÉQUENCES DE FRAPPE")
    print("=" * 70)
    print(f"\nRéférence : {ref_name}")
    print(f"Cible     : {target_name}")
    print(f"Contexte  : {context.capitalize()}")
    print()
    
    print("-" * 70)
    print("RÉSULTAT")
    print("-" * 70)
    
    # Absolute impact: percentage of ALL keystrokes
    absolute_pct = results["affected_frequency"] * 100  # frequencies are already 0-1 where 1=100%
    
    # Relative impact: percentage of symbol keystrokes
    relative_pct = results["percentage_affected"]
    
    print(f"\n  📊 Impact sur TOUTES les frappes   : {absolute_pct:.2f}%")
    print(f"     (soit {results['affected_frequency']:.6f} en fréquence absolue)")
    print()
    print(f"  📊 Impact sur les frappes SYMBOLES : {relative_pct:.2f}%")
    print(f"     (symboles = {results['total_frequency']*100:.2f}% du total des frappes)")
    print()
    
    # Top affected characters
    affected = results["affected_chars"]
    if affected:
        print("-" * 70)
        print(f"TOP 15 CARACTÈRES AFFECTÉS (par fréquence)")
        print("-" * 70)
        
        for item in affected[:15]:
            char = item["char"]
            char_display = repr(char) if char in (' ', '\t', '\n') or len(char) > 1 else char
            change = item["change_type"]
            change_icon = "🔀" if change == "different_key" else "🔄" if change == "same_key_diff_mod" else "❌"
            pct_contrib = item["frequency"] / results["total_frequency"] * 100
            print(f"  {change_icon} {char_display:4} : {pct_contrib:.3f}% des frappes ({change})")
        print()
    
    # Summary by change type
    by_type = defaultdict(float)
    for item in affected:
        by_type[item["change_type"]] += item["frequency"]
    
    if by_type:
        print("-" * 70)
        print("RÉPARTITION PAR TYPE DE CHANGEMENT")
        print("-" * 70)
        for change_type, freq in sorted(by_type.items(), key=lambda x: -x[1]):
            pct = freq / results["total_frequency"] * 100
            label = {
                "different_key": "Déplacé sur autre touche",
                "same_key_diff_mod": "Même touche, modif. diff.",
                "removed": "Supprimé"
            }.get(change_type, change_type)
            print(f"  {label:35} : {pct:.2f}%")
        print()
    
    print("=" * 70)


def main():
    if len(sys.argv) < 2:
        print("Usage: python calculate_frequency_impact.py target_layout.json [--context formel|informel|prog]")
        print("\nExample:")
        print('  python calculate_frequency_impact.py "data/AZERTY Global Final.json" --context formel')
        sys.exit(1)
    
    target_path = Path(sys.argv[1])
    
    # Parse context argument
    context = "formel"
    for i, arg in enumerate(sys.argv):
        if arg == "--context" and i + 1 < len(sys.argv):
            context = sys.argv[i + 1]
    
    if not target_path.exists():
        print(f"Erreur: fichier cible non trouvé: {target_path}")
        sys.exit(1)
    
    if not FREQ_FILE.exists():
        print(f"Erreur: fichier de fréquences non trouvé: {FREQ_FILE}")
        sys.exit(1)
    
    # Load data
    frequencies = load_frequencies(FREQ_FILE, context)
    ref_layout = load_layout(REF_FILE)
    target_layout = load_layout(target_path)
    
    ref_name = ref_layout.get("layout_name", "AZERTY Traditionnel")
    target_name = target_layout.get("layout_name", "Target")
    
    # Calculate impact
    results = calculate_impact(REF_FILE, target_path, frequencies)
    
    # Print report
    print_report(results, ref_name, target_name, context)


if __name__ == "__main__":
    main()
