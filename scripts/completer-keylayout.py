#!/usr/bin/env python3
"""
Complete an existing macOS .keylayout from AZERTY Global.json.

There is no .keylayout generator: the file is a KbdEdit export. This script
adds what the JSON has and the export lacks, and nothing else:

- a dead key reached from a direct key (`<key code=… action="Entering …"/>`)
  on a layer where the key has no entry at all;
- a dead key state absent from the file (its `Entering …` action and its
  terminator, the JSON's space entry);
- dead key table entries absent from the file (`<when state=… output=…/>` in
  the action of the base key).

It never overwrites a value the file already has: a conflict stops the run.
Existing lines are kept byte for byte. The result is checked with
`audit-keylayout-vs-final.py`, which reads the file with the same parser.

Usage:
    python -I scripts/completer-keylayout.py --out "<dossier>/AZERTY Global.keylayout"
"""

from __future__ import annotations

import argparse
import html
import importlib.util
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SITE_ROOT = SCRIPT_DIR.parent
DEFAULT_FINAL = SITE_ROOT / "data" / "AZERTY Global.json"
DEFAULT_KEYLAYOUT = SITE_ROOT / "data" / "AZERTY Global.keylayout"

# Name of the macOS state for a dead key the export does not have yet. The
# audit and keylayout_to_json.py map these names back to the JSON id.
NEW_STATE_NAMES = {
    "dk_cyrillic_ext": "ALPHABET CYRILLIQUE ÉTENDU",
}

XML_SPECIAL = {"&", "<", ">", '"', "'"}


def load_audit_module():
    path = SCRIPT_DIR / "audit-keylayout-vs-final.py"
    spec = importlib.util.spec_from_file_location("audit_keylayout", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # @dataclass reads its module from sys.modules
    spec.loader.exec_module(module)
    return module


def encode_output(value: str) -> str:
    """Attribute value: XML specials, controls, spaces and format characters
    as references, everything else literal (as KbdEdit writes it)."""
    parts = []
    for char in value:
        category = unicodedata.category(char)
        if char in XML_SPECIAL or category in ("Cc", "Cf", "Zs", "Zl", "Zp"):
            parts.append(f"&#x{ord(char):04X};")
        else:
            parts.append(char)
    return "".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--keylayout", type=Path, default=DEFAULT_KEYLAYOUT)
    parser.add_argument("--final", type=Path, default=DEFAULT_FINAL)
    parser.add_argument("--out", type=Path, required=True,
                        help="Fichier écrit ; jamais le fichier d'entrée.")
    args = parser.parse_args()

    if args.out.resolve() == args.keylayout.resolve():
        print("--out doit différer de --keylayout.", file=sys.stderr)
        return 2

    audit = load_audit_module()
    final_data = json.loads(args.final.read_text(encoding="utf-8"))
    text = args.keylayout.read_text(encoding="utf-8")
    if "\r" in text:
        print("Fins de ligne CRLF non prises en charge.", file=sys.stderr)
        return 2
    parsed = audit.parse_keylayout(args.keylayout)

    # macOS state name -> JSON dead key id, and the reverse.
    state_to_dk = audit.state_to_dead_key(parsed)
    dk_to_state = {dk: state for state, dk in state_to_dk.items()}
    expected_dead_keys = final_data.get("dead_keys", {})

    new_states = []
    for dk in expected_dead_keys:
        if dk in dk_to_state:
            continue
        name = NEW_STATE_NAMES.get(dk)
        if name is None:
            print(f"Touche morte {dk} absente et sans nom d'état prévu.", file=sys.stderr)
            return 1
        if audit.canonical_dead_key_name(name) != dk:
            print(f"L'audit ne relie pas « {name} » à {dk} : ajouter l'alias.", file=sys.stderr)
            return 1
        dk_to_state[dk] = name
        new_states.append(dk)

    # keyMap index for each audited layer.
    layer_to_index = {}
    for match in re.finditer(r'<keyMapSelect mapIndex="(\d+)">\s*<modifier keys="([^"]*)"/>', text):
        keys = frozenset(match.group(2).split())
        layer = audit.MODIFIERS_TO_LAYER.get(keys)
        if layer:
            layer_to_index[layer] = int(match.group(1))

    # 1. Direct keys that should enter a dead key and have no entry.
    position_to_code = {position: code for code, position in audit.MAC_TO_ISO.items()}
    key_additions: dict[int, list[tuple[int, str]]] = {}
    for position, key in audit.final_keys_by_position(final_data).items():
        code = position_to_code.get(position)
        if code is None:
            continue
        for layer in audit.AUDITED_LAYERS:
            expected = audit.expected_layer_value(key, layer)
            if not (expected and expected.startswith("dk_")):
                continue
            actual = audit.key_value(parsed, code, layer)
            if actual == expected:
                continue
            if parsed["key_maps"].get(layer, {}).get(code):
                print(f"{position}/{layer} : {actual!r} présent, {expected} attendu. Arrêt.", file=sys.stderr)
                return 1
            line = f'\t\t\t<key code="{code}" action="Entering {dk_to_state[expected]}"/>'
            key_additions.setdefault(layer_to_index[layer], []).append((code, line))

    # 2. Dead key table entries, grouped by base key action.
    actual_tables, _ = audit.keylayout_dead_keys(parsed)
    base_to_action = {}
    for action_id, when_list in parsed["actions"].items():
        base = audit.action_base_output(action_id, when_list)
        if base is not None and len(base) <= 2:
            base_to_action.setdefault(base, action_id)

    when_additions: dict[str, list[str]] = {}
    terminators = []
    added_entries = 0
    for dk, dead_key in expected_dead_keys.items():
        state = dk_to_state[dk]
        have = actual_tables.get(dk, {})
        for base, output in dead_key.get("table", {}).items():
            if not output:
                continue
            if base == " ":
                if dk in new_states:
                    terminators.append(f'\t\t<when state="{state}" output="{encode_output(output)}"/>')
                elif have.get(" ") != output:
                    print(f"{dk} + espace : {have.get(' ')!r} présent, {output!r} attendu. Arrêt.", file=sys.stderr)
                    return 1
                continue
            if base in have:
                if have[base] != output:
                    print(f"{dk} + {base} : {have[base]!r} présent, {output!r} attendu. Arrêt.", file=sys.stderr)
                    return 1
                continue
            action_id = base_to_action.get(base)
            if action_id is None:
                print(f"{dk} + {base} : aucune action pour « {base} ». Arrêt.", file=sys.stderr)
                return 1
            if any(item["state"] == state for item in parsed["actions"][action_id]):
                print(f"Action {action_id!r} : état {state} déjà présent. Arrêt.", file=sys.stderr)
                return 1
            when_additions.setdefault(action_id, []).append(
                f'\t\t\t<when state="{state}" output="{encode_output(output)}"/>'
            )
            added_entries += 1

    # Apply, from the end of the file so offsets stay valid.
    edits: list[tuple[int, str]] = []

    for index, additions in key_additions.items():
        block = re.search(rf'<keyMap index="{index}">\n(.*?)\t\t</keyMap>', text, re.S)
        if block is None:
            print(f"keyMap {index} introuvable.", file=sys.stderr)
            return 1
        for code, line in additions:
            insert_at = block.end(1)
            for key_line in re.finditer(r'\t\t\t<key code="(\d+)"[^\n]*\n', block.group(1)):
                if int(key_line.group(1)) > code:
                    insert_at = block.start(1) + key_line.start()
                    break
            edits.append((insert_at, line + "\n"))

    # KbdEdit quotes an id holding « " » with apostrophes: <action id='"'>.
    for match in re.finditer(r'\t\t<action id=(?:"([^"]*)"|\'([^\']*)\')>\n(.*?)\t\t</action>\n', text, re.S):
        action_id = html.unescape(match.group(1) if match.group(1) is not None else match.group(2))
        if action_id in when_additions:
            edits.append((match.start(0) + match.group(0).rindex("\t\t</action>"),
                          "".join(line + "\n" for line in when_additions.pop(action_id))))
    if when_additions:
        print(f"Actions introuvables dans le texte : {sorted(when_additions)}", file=sys.stderr)
        return 1

    for dk in new_states:
        state = dk_to_state[dk]
        block = f'\t\t<action id="Entering {state}">\n\t\t\t<when state="none" next="{state}"/>\n\t\t</action>\n'
        position = None
        for match in re.finditer(r'\t\t<action id="Entering ([^"]*)">\n.*?\t\t</action>\n', text, re.S):
            if match.group(1) > state:
                position = match.start(0)
                break
            position = match.end(0)
        if position is None:
            print("Aucune action « Entering » dans le fichier.", file=sys.stderr)
            return 1
        edits.append((position, block))

    if terminators:
        position = text.index("\t</terminators>")
        edits.append((position, "".join(line + "\n" for line in terminators)))

    header = re.search(r"<!--Last edited by KbdEdit[^\n]*-->\n", text)
    total = sum(len(v) for v in key_additions.values()) + added_entries + len(new_states)
    note = (
        f"<!--Completed on {date.today().isoformat()} by scripts/completer-keylayout.py from "
        f"AZERTY Global.json {final_data.get('version')}: {total} additions to the KbdEdit export above-->\n"
    )
    if header is not None:
        edits.append((header.end(0), note))

    for position, insert in sorted(edits, key=lambda item: item[0], reverse=True):
        text = text[:position] + insert + text[position:]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)

    print(f"Écrit : {args.out}")
    print(f"Touches directes ajoutées : {sum(len(v) for v in key_additions.values())}")
    print(f"États de touche morte ajoutés : {len(new_states)} ({', '.join(new_states) or 'aucun'})")
    print(f"Entrées de table ajoutées : {added_entries}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
