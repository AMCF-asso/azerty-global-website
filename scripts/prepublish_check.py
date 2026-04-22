#!/usr/bin/env python3
"""Vérifications de pré-publication du site AZERTY Global.

Script en lecture seule : ne modifie JAMAIS de fichier (règle anti-corruption).

Utilisation :
    cd "AZERTY Global/2026/Site AZERTY Global"
    python scripts/prepublish_check.py

Sortie : code 0 si tout passe, non-zéro si au moins une vérification échoue.
"""

from __future__ import annotations

import io
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from bs4 import BeautifulSoup

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

SITE_ROOT = Path(__file__).resolve().parent.parent

ASSET_EXTS = {".css", ".js", ".json", ".pdf", ".svg", ".png", ".jpg", ".jpeg",
              ".webp", ".ico", ".txt", ".xml", ".zip", ".woff", ".woff2", ".ttf"}

SUSPECT_PATTERNS = [r"aigu-aigu", r"grave-grave", r"cedille-cedille"]

JSON_FILES = [
    "data/AZERTY Global Beta.json",
    "tester/lessons.json",
    "tester/azerty-global.json",
    "tester/character-index.json",
    "data/keyboard-hotspots.json",
]

SITEMAP_EXCLUDE = {"404.html", "roadmap.html", "index.html"}

errors: list[str] = []
warnings: list[str] = []


def fail(msg: str) -> None:
    errors.append(msg)
    print(f"  [FAIL]{msg}")


def warn(msg: str) -> None:
    warnings.append(msg)
    print(f"  [WARN]{msg}")


def ok(msg: str) -> None:
    print(f"  [OK]{msg}")


def html_files() -> list[Path]:
    return sorted(p for p in SITE_ROOT.glob("*.html") if p.is_file())


def parse(path: Path) -> BeautifulSoup | None:
    try:
        return BeautifulSoup(path.read_text(encoding="utf-8-sig"), "html.parser")
    except Exception as exc:
        fail(f"Parse HTML {path.name} : {exc}")
        return None


def check_internal_links() -> None:
    print("\n[1/5] Liens internes")
    files_on_disk = {p.name for p in html_files()}
    broken: list[tuple[str, str]] = []

    for path in html_files():
        soup = parse(path)
        if soup is None:
            continue
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not href or href.startswith("#"):
                continue
            if href.startswith(("http://", "https://", "mailto:", "tel:", "javascript:", "data:")):
                continue
            target = href.split("#", 1)[0].split("?", 1)[0]
            if not target:
                continue
            if target.startswith("/"):
                target = target[1:]
            if target in ("", "/"):
                continue  # racine = index.html
            ext = Path(target).suffix.lower()
            if ext in ASSET_EXTS:
                continue
            if target.endswith("/"):
                target = target[:-1]
            if not target.endswith(".html"):
                target = target + ".html"
            target_name = Path(target).name
            if target_name not in files_on_disk:
                broken.append((path.name, href))

    if broken:
        for src, href in broken:
            fail(f"{src} → {href} : cible introuvable")
    else:
        ok(f"Tous les liens internes sont valides ({len(files_on_disk)} pages)")


def check_suspect_patterns() -> None:
    print("\n[2/5] Patterns suspects (garde-fou)")
    found = False
    regex = re.compile("|".join(SUSPECT_PATTERNS))
    for path in html_files():
        try:
            text = path.read_text(encoding="utf-8-sig")
        except Exception as exc:
            fail(f"Lecture {path.name} : {exc}")
            continue
        for match in regex.finditer(text):
            fail(f"{path.name} : pattern suspect « {match.group(0)} »")
            found = True
    if not found:
        ok("Aucun pattern suspect trouvé")


def check_canonical_and_og_url() -> None:
    print("\n[3/5] Cohérence canonical / og:url")
    issues = 0
    for path in html_files():
        soup = parse(path)
        if soup is None:
            continue
        expected_slug = "" if path.name == "index.html" else path.stem

        canonical_tag = soup.find("link", rel="canonical")
        if canonical_tag and canonical_tag.get("href"):
            href = canonical_tag["href"].rstrip("/")
            slug = href.rsplit("/", 1)[-1] if "/" in href else ""
            if href.endswith("azerty.global"):
                slug = ""
            if slug != expected_slug:
                fail(f"{path.name} : canonical slug « {slug} » (attendu « {expected_slug} »)")
                issues += 1

        og_tag = soup.find("meta", property="og:url")
        if og_tag and og_tag.get("content"):
            content = og_tag["content"].rstrip("/")
            slug = content.rsplit("/", 1)[-1] if "/" in content else ""
            if content.endswith("azerty.global"):
                slug = ""
            if slug != expected_slug:
                fail(f"{path.name} : og:url slug « {slug} » (attendu « {expected_slug} »)")
                issues += 1

    if issues == 0:
        ok("canonical et og:url cohérents sur toutes les pages")


def check_sitemap() -> None:
    print("\n[4/5] Sitemap")
    sitemap_path = SITE_ROOT / "sitemap.xml"
    if not sitemap_path.exists():
        fail("sitemap.xml absent")
        return

    try:
        tree = ET.parse(sitemap_path)
    except ET.ParseError as exc:
        fail(f"sitemap.xml invalide : {exc}")
        return

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = tree.getroot()
    locs = {loc.text.rstrip("/").rsplit("/", 1)[-1] for loc in root.findall(".//sm:loc", ns) if loc.text}

    files_on_disk = {p.name for p in html_files() if p.name not in SITEMAP_EXCLUDE}
    missing: list[str] = []
    for fname in sorted(files_on_disk):
        slug = Path(fname).stem
        if slug not in locs and fname not in locs:
            missing.append(fname)

    if missing:
        for m in missing:
            fail(f"{m} absent du sitemap")
    else:
        ok(f"sitemap.xml valide ({len(locs)} URLs, toutes les pages publiques présentes)")


def check_json_files() -> None:
    print("\n[5/5] Validation JSON")
    for rel in JSON_FILES:
        path = SITE_ROOT / rel
        if not path.exists():
            fail(f"{rel} introuvable")
            continue
        try:
            with open(path, encoding="utf-8-sig") as fh:
                json.load(fh)
            ok(f"{rel}")
        except json.JSONDecodeError as exc:
            fail(f"{rel} : JSON invalide → {exc}")
        except Exception as exc:
            fail(f"{rel} : {exc}")


def main() -> int:
    print(f"Pré-publication — site AZERTY Global")
    print(f"Racine : {SITE_ROOT}")

    check_internal_links()
    check_suspect_patterns()
    check_canonical_and_og_url()
    check_sitemap()
    check_json_files()

    print("\n" + "=" * 60)
    if errors:
        print(f"ÉCHEC : {len(errors)} erreur(s)")
        return 1
    if warnings:
        print(f"OK avec {len(warnings)} avertissement(s)")
    else:
        print("OK — toutes les vérifications passent")
    return 0


if __name__ == "__main__":
    sys.exit(main())
