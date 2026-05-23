#!/usr/bin/env python3
"""
Audit a KbdEdit/macOS .keylayout export against AZERTY Global Final.json.

The audit parses the XML keylayout directly and compares its functional output
with the JSON source of truth. It does not generate or modify layout files.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SITE_ROOT = SCRIPT_DIR.parent
DEFAULT_FINAL = SITE_ROOT / "data" / "AZERTY Global Final.json"
DEFAULT_KEYLAYOUT = SITE_ROOT / "data" / "AZERTY Global.keylayout"
DEFAULT_REPORT = SITE_ROOT / ".internal" / f"AUDIT-keylayout-KbdEdit-{date.today().isoformat()}.md"

# macOS key code -> ISO position. Copied from scripts/keylayout_to_json.py.
MAC_TO_ISO = {
    50: "E00", 18: "E01", 19: "E02", 20: "E03", 21: "E04", 23: "E05",
    22: "E06", 26: "E07", 28: "E08", 25: "E09", 29: "E10", 27: "E11",
    24: "E12", 12: "D01", 13: "D02", 14: "D03", 15: "D04", 17: "D05",
    16: "D06", 32: "D07", 34: "D08", 31: "D09", 35: "D10", 33: "D11",
    30: "D12", 0: "C01", 1: "C02", 2: "C03", 3: "C04", 5: "C05",
    4: "C06", 38: "C07", 40: "C08", 37: "C09", 41: "C10", 39: "C11",
    42: "C12", 10: "B00", 6: "B01", 7: "B02", 8: "B03", 9: "B04",
    11: "B05", 45: "B06", 46: "B07", 43: "B08", 47: "B09", 44: "B10",
    49: "A03",
}

LAYER_TO_MODIFIERS = {
    "base": frozenset(),
    "caps": frozenset({"caps"}),
    "shift": frozenset({"anyShift"}),
    "caps_shift": frozenset({"caps", "anyShift"}),
    "alt_gr": frozenset({"anyOption"}),
    "caps_alt_gr": frozenset({"caps", "anyOption"}),
    "shift_alt_gr": frozenset({"anyShift", "anyOption"}),
    "caps_shift_alt_gr": frozenset({"caps", "anyShift", "anyOption"}),
}
MODIFIERS_TO_LAYER = {value: key for key, value in LAYER_TO_MODIFIERS.items()}
AUDITED_LAYERS = tuple(LAYER_TO_MODIFIERS.keys())

DEAD_KEY_NAME_MAP = {
    "ACCENT AIGU": "dk_acute",
    "ACCENT AIGU DOUBLE": "dk_double_acute",
    "ACCENT DOUBLE AIGU": "dk_double_acute",
    "ACCENT GRAVE": "dk_grave",
    "ACCENT GRAVE DOUBLE": "dk_double_grave",
    "ACCENT DOUBLE GRAVE": "dk_double_grave",
    "ALPHABET CYRILLIQUE": "dk_cyrillic",
    "ALPHABET GREC": "dk_greek",
    "ALPHABET PHONETIQUE INTERNATIONAL": "dk_phonetic",
    "ALPHABET PHONÉTIQUE INTERNATIONAL": "dk_phonetic",
    "BARRE DIAGONALE": "dk_stroke",
    "BARRE HORIZONTALE": "dk_horizontal_stroke",
    "BARRE OBLIQUE COUVRANTE": "dk_stroke",
    "BREVE": "dk_breve",
    "BRÈVE": "dk_breve",
    "BREVE RENVERSEE": "dk_inverted_breve",
    "BRÈVE RENVERSÉE": "dk_inverted_breve",
    "CARON": "dk_caron",
    "CEDILLE": "dk_cedilla",
    "CÉDILLE": "dk_cedilla",
    "CIRCONFLEXE": "dk_circumflex",
    "CORNU": "dk_horn",
    "CROCHET": "dk_hook",
    "LATIN ETENDU": "dk_extended_latin",
    "LATIN ÉTENDU": "dk_extended_latin",
    "MACRON": "dk_macron",
    "OGONEK": "dk_ogonek",
    "POINT EN CHEF": "dk_dot_above",
    "POINT SOUSCRIT": "dk_dot_below",
    "PONCTUATION": "dk_punctuation",
    "ROND EN CHEF": "dk_ring_above",
    "SYMBOLES DIVERS": "dk_misc_symbols",
    "SYMBOLES MONETAIRES": "dk_currencies",
    "SYMBOLES MONÉTAIRES": "dk_currencies",
    "SYMBOLES SCIENTIFIQUES": "dk_scientific",
    "TILDE": "dk_tilde",
    "TREMA": "dk_diaeresis",
    "TRÉMA": "dk_diaeresis",
    "VIRGULE SOUSCRITE": "dk_comma",
}

CRITICAL_OUTPUTS = {
    "ɓ", "Ɓ", "ƙ", "Ƙ", "ɲ", "Ɲ", "ɩ", "Ɩ", "ƈ", "Ƈ", "ƥ", "Ƥ",
    "ʼ", "№", "Ǝ", "ǝ", "∉", "⊆", "⊇",
}


@dataclass
class Finding:
    severity: str
    area: str
    item: str
    expected: object
    actual: object
    recommendation: str


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFC", value).strip().upper()
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized


def canonical_dead_key_name(value: str) -> str:
    raw = value[9:] if value.startswith("Entering ") else value
    name = normalize_name(raw)
    if name in DEAD_KEY_NAME_MAP:
        return DEAD_KEY_NAME_MAP[name]
    no_marks = "".join(
        c for c in unicodedata.normalize("NFD", name)
        if unicodedata.category(c) != "Mn"
    )
    if no_marks in DEAD_KEY_NAME_MAP:
        return DEAD_KEY_NAME_MAP[no_marks]
    slug = re.sub(r"[^a-z0-9]+", "_", no_marks.lower()).strip("_")
    return f"dk_{slug}" if slug else "dk_unknown"


def clean_xml_text(text: str) -> str:
    def clean_char_ref(match: re.Match[str]) -> str:
        code = int(match.group(1), 16)
        if code in (0x09, 0x0A, 0x0D) or code >= 0x20:
            return match.group(0)
        return ""

    return re.sub(r"&#x([0-9A-Fa-f]+);", clean_char_ref, text)


def decode_value(value: str | None) -> str | None:
    if value is None:
        return None
    decoded = html.unescape(value)
    if len(decoded) == 1:
        code = ord(decoded)
        if code < 32 and code not in (9, 10, 13):
            return None
        if code == 127:
            return None
    return decoded


def display_value(value: object) -> str:
    if value is None:
        return "`null`"
    if isinstance(value, (set, list, tuple)):
        return ", ".join(display_value(v) for v in value)
    text = str(value)
    escaped = text.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
    codepoints = " ".join(f"U+{ord(ch):04X}" for ch in text)
    if codepoints:
        return f"`{escaped}` ({codepoints})"
    return "``"


def load_final(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_keylayout(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    root = ET.fromstring(clean_xml_text(text))

    layout = root.find("./layouts/layout")
    map_set_id = layout.get("mapSet") if layout is not None else None
    modifier_map_id = layout.get("modifiers") if layout is not None else None

    key_map_set = root.find(f"./keyMapSet[@id='{map_set_id}']") if map_set_id else None
    if key_map_set is None:
        candidates = root.findall("./keyMapSet")
        if not candidates:
            raise ValueError("No keyMapSet found in keylayout")
        key_map_set = max(candidates, key=lambda item: sum(len(m.findall("key")) for m in item.findall("keyMap")))

    index_to_layer = {}
    modifier_map = root.find(f"./modifierMap[@id='{modifier_map_id}']") if modifier_map_id else None
    if modifier_map is None:
        raise ValueError("No modifierMap matching layout modifiers was found")
    for selector in modifier_map.findall("keyMapSelect"):
        index = int(selector.get("mapIndex"))
        modifiers = selector.find("modifier")
        keys = frozenset((modifiers.get("keys") or "").split()) if modifiers is not None else frozenset()
        layer = MODIFIERS_TO_LAYER.get(keys)
        if layer:
            index_to_layer[index] = layer

    actions = {}
    actions_elem = root.find("actions")
    if actions_elem is not None:
        for action in actions_elem.findall("action"):
            actions[action.get("id")] = [
                {"state": item.get("state"), "next": item.get("next"), "output": item.get("output")}
                for item in action.findall("when")
            ]

    terminators = {}
    terminators_elem = root.find("terminators")
    if terminators_elem is not None:
        for item in terminators_elem.findall("when"):
            terminators[item.get("state")] = decode_value(item.get("output"))

    key_maps = {}
    for key_map in key_map_set.findall("keyMap"):
        index = int(key_map.get("index", 0))
        layer = index_to_layer.get(index)
        if not layer:
            continue
        values = {}
        for key in key_map.findall("key"):
            code = int(key.get("code"))
            values[code] = {"output": key.get("output"), "action": key.get("action")}
        key_maps[layer] = values

    return {
        "text": text,
        "key_maps": key_maps,
        "actions": actions,
        "terminators": terminators,
    }


def action_value(action_name: str, actions: dict) -> str | None:
    if action_name.startswith("Entering "):
        return canonical_dead_key_name(action_name)
    if action_name.startswith("dead_"):
        return canonical_dead_key_name(action_name[5:])

    when_list = actions.get(action_name)
    if when_list:
        for item in when_list:
            if item["state"] == "none":
                if item.get("next") and not item.get("output"):
                    return canonical_dead_key_name(action_name)
                if item.get("output"):
                    return decode_value(item["output"])

    if len(action_name) <= 2:
        return action_name
    return None


def key_value(parsed: dict, code: int, layer: str) -> str | None:
    data = parsed["key_maps"].get(layer, {}).get(code)
    if not data:
        return None
    if data.get("output") is not None:
        return decode_value(data["output"])
    if data.get("action") is not None:
        return action_value(data["action"], parsed["actions"])
    return None


def final_keys_by_position(final_data: dict) -> dict:
    keys = {}
    for row in final_data.get("rows", []):
        for key in row.get("keys", []):
            keys[key["position"]] = key
    return keys


def expected_layer_value(key: dict, layer: str) -> str | None:
    if layer in key:
        return key[layer]
    if layer == "caps":
        return key.get("base")
    if layer == "caps_shift":
        return key.get("shift")
    if layer == "caps_alt_gr":
        return key.get("alt_gr")
    if layer == "caps_shift_alt_gr":
        return key.get("shift_alt_gr")
    return None


def state_to_dead_key(parsed: dict) -> dict:
    mapping = {}
    for action_id, when_list in parsed["actions"].items():
        for item in when_list:
            if item["state"] == "none" and item.get("next") and not item.get("output"):
                mapping[item["next"]] = canonical_dead_key_name(action_id)
    return mapping


def action_base_output(action_id: str, when_list: list[dict]) -> str | None:
    if len(action_id) <= 2:
        return action_id
    for item in when_list:
        if item["state"] == "none" and item.get("output"):
            return decode_value(item["output"])
    return None


def keylayout_dead_keys(parsed: dict) -> tuple[dict, list[Finding]]:
    state_names = state_to_dead_key(parsed)
    tables = {name: {} for name in state_names.values()}
    findings = []

    for action_id, when_list in parsed["actions"].items():
        base = action_base_output(action_id, when_list)
        if base is None or len(base) > 2:
            continue
        for item in when_list:
            state = item.get("state")
            if state == "none" or state not in state_names:
                continue
            if item.get("next") and not item.get("output"):
                findings.append(Finding(
                    "Bloquant",
                    "Touche morte",
                    f"{state_names[state]} + {base}",
                    "sortie caractère",
                    f"enchaîne vers {item['next']}",
                    "Remplacer le chaînage par une sortie Unicode directe dans KbdEdit.",
                ))
            if item.get("output"):
                tables[state_names[state]][base] = decode_value(item["output"])

    for state, output in parsed["terminators"].items():
        if state in state_names and output is not None:
            tables[state_names[state]][" "] = output

    return tables, findings


def unique_outputs_from_keylayout(parsed: dict, tables: dict) -> set[str]:
    outputs = set()
    for code in MAC_TO_ISO:
        for layer in AUDITED_LAYERS:
            value = key_value(parsed, code, layer)
            if value and not value.startswith("dk_"):
                outputs.add(value)
    for table in tables.values():
        for value in table.values():
            if value:
                outputs.add(value)
    return outputs


def expected_unique_outputs(final_data: dict) -> set[str]:
    outputs = set()
    for key in final_keys_by_position(final_data).values():
        for layer in AUDITED_LAYERS:
            value = expected_layer_value(key, layer)
            if value and not value.startswith("dk_"):
                outputs.add(value)
    for dead_key in final_data.get("dead_keys", {}).values():
        outputs.update(value for value in dead_key.get("table", {}).values() if value)
    return outputs


def audit(final_data: dict, parsed: dict) -> tuple[list[Finding], dict]:
    findings: list[Finding] = []
    final_keys = final_keys_by_position(final_data)
    position_to_code = {position: code for code, position in MAC_TO_ISO.items()}

    for position, expected_key in final_keys.items():
        code = position_to_code.get(position)
        if code is None:
            findings.append(Finding(
                "À vérifier", "Touche directe", position, "code macOS connu", None,
                "Ajouter le mapping macOS correspondant si cette touche doit être auditée.",
            ))
            continue
        for layer in AUDITED_LAYERS:
            expected = expected_layer_value(expected_key, layer)
            actual = key_value(parsed, code, layer)
            if expected != actual:
                findings.append(Finding(
                    "Bloquant",
                    "Touche directe",
                    f"{position} / {layer}",
                    expected,
                    actual,
                    "Corriger la sortie de cette couche dans KbdEdit.",
                ))

    actual_tables, chained_findings = keylayout_dead_keys(parsed)
    findings.extend(chained_findings)
    expected_dead_keys = final_data.get("dead_keys", {})

    expected_names = set(expected_dead_keys)
    actual_names = set(actual_tables)
    for name in sorted(expected_names - actual_names):
        findings.append(Finding(
            "Bloquant", "Touche morte", name, "présente", "absente",
            "Créer ou renommer l’état de touche morte correspondant dans KbdEdit.",
        ))
    for name in sorted(actual_names - expected_names):
        findings.append(Finding(
            "À vérifier", "Touche morte", name, "non déclarée dans le JSON Final", "présente",
            "Vérifier si cet état est un doublon ou une touche morte obsolète.",
        ))

    for name in sorted(expected_names & actual_names):
        expected_table = expected_dead_keys[name].get("table", {})
        actual_table = actual_tables[name]
        for key in sorted(set(expected_table) | set(actual_table), key=lambda item: [ord(c) for c in item]):
            expected = expected_table.get(key)
            actual = actual_table.get(key)
            if expected != actual:
                findings.append(Finding(
                    "Bloquant",
                    "Table touche morte",
                    f"{name} + {key}",
                    expected,
                    actual,
                    "Corriger cette correspondance dans la table de touche morte KbdEdit.",
                ))

    actual_outputs = unique_outputs_from_keylayout(parsed, actual_tables)
    expected_outputs = expected_unique_outputs(final_data)
    if "\ufffd" in parsed["text"] or "\ufffd" in actual_outputs:
        findings.append(Finding(
            "Bloquant", "Encodage", "U+FFFD", "absent", "présent",
            "Réexporter le keylayout ou corriger l’encodage avant publication.",
        ))

    missing_outputs = expected_outputs - actual_outputs
    extra_outputs = actual_outputs - expected_outputs
    if missing_outputs:
        findings.append(Finding(
            "Bloquant", "Couverture", "caractères attendus absents",
            sorted(missing_outputs), None,
            "Corriger les touches directes ou touches mortes qui ne produisent pas ces caractères.",
        ))
    if extra_outputs:
        findings.append(Finding(
            "À vérifier", "Couverture", "caractères non attendus produits",
            None, sorted(extra_outputs),
            "Vérifier que ces sorties ne viennent pas de touches système ou d’états obsolètes.",
        ))
    missing_critical = CRITICAL_OUTPUTS - actual_outputs
    if missing_critical:
        findings.append(Finding(
            "Bloquant", "Raccourcis critiques", "ajouts récents",
            sorted(CRITICAL_OUTPUTS), sorted(CRITICAL_OUTPUTS - missing_critical),
            "Corriger les ajouts récents manquants dans KbdEdit.",
        ))

    stats = {
        "audited_keys": len(final_keys),
        "expected_dead_keys": len(expected_dead_keys),
        "actual_dead_keys": len(actual_tables),
        "expected_unique_outputs": len(expected_outputs),
        "actual_unique_outputs": len(actual_outputs),
        "blocking": sum(1 for item in findings if item.severity == "Bloquant"),
        "review": sum(1 for item in findings if item.severity == "À vérifier"),
        "info": sum(1 for item in findings if item.severity == "Info"),
    }
    return findings, stats


def render_report(final_path: Path, keylayout_path: Path, findings: list[Finding], stats: dict) -> str:
    lines = [
        "# Audit KbdEdit `.keylayout` vs AZERTY Global Final",
        "",
        f"*Dernière mise à jour : {date.today().isoformat()}*",
        "",
        "## Résumé",
        "",
        f"- Source JSON : `{final_path.as_posix()}`",
        f"- Export KbdEdit : `{keylayout_path.as_posix()}`",
        f"- Touches physiques utiles auditées : {stats['audited_keys']}",
        f"- Touches mortes attendues / reconnues : {stats['expected_dead_keys']} / {stats['actual_dead_keys']}",
        f"- Caractères Unicode uniques attendus / produits : {stats['expected_unique_outputs']} / {stats['actual_unique_outputs']}",
        f"- Bloquants : {stats['blocking']}",
        f"- À vérifier : {stats['review']}",
        "",
        "## Verdict",
        "",
    ]
    if stats["blocking"]:
        lines.append("Non conforme : des écarts bloquants doivent être corrigés dans KbdEdit puis réexportés.")
    else:
        lines.append("Conforme : aucun écart bloquant détecté.")
    lines.extend(["", "## Findings", ""])
    if not findings:
        lines.append("Aucun finding.")
    else:
        lines.append("| Sévérité | Zone | Élément | Attendu | Obtenu | Correction |")
        lines.append("|---|---|---|---|---|---|")
        for item in findings:
            lines.append(
                "| "
                + " | ".join([
                    item.severity,
                    item.area,
                    str(item.item).replace("|", "\\|"),
                    display_value(item.expected).replace("|", "\\|"),
                    display_value(item.actual).replace("|", "\\|"),
                    item.recommendation.replace("|", "\\|"),
                ])
                + " |"
            )
    lines.extend([
        "",
        "## Éléments Ignorés Volontairement",
        "",
        "- Nom, id et group KbdEdit.",
        "- Commentaires d’export et ordre XML.",
        "- Touches système, numpad, Tab, Entrée, Escape et flèches.",
    ])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit AZERTY Global.keylayout against AZERTY Global Final.json")
    parser.add_argument("--final", type=Path, default=DEFAULT_FINAL, help="Path to AZERTY Global Final.json")
    parser.add_argument("--keylayout", type=Path, default=DEFAULT_KEYLAYOUT, help="Path to AZERTY Global.keylayout")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="Path to write the Markdown audit report")
    args = parser.parse_args()

    final_data = load_final(args.final)
    parsed = parse_keylayout(args.keylayout)
    findings, stats = audit(final_data, parsed)

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(render_report(args.final, args.keylayout, findings, stats), encoding="utf-8")

    print(f"Rapport: {args.report}")
    print(
        f"Touches: {stats['audited_keys']} | "
        f"Touches mortes: {stats['actual_dead_keys']}/{stats['expected_dead_keys']} | "
        f"Caractères: {stats['actual_unique_outputs']}/{stats['expected_unique_outputs']} | "
        f"Bloquants: {stats['blocking']} | À vérifier: {stats['review']}"
    )
    return 1 if stats["blocking"] else 0


if __name__ == "__main__":
    sys.exit(main())
