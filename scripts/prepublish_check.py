#!/usr/bin/env python3
"""Contrôles en lecture seule du site construit, sans dépendance externe.

Usage : python scripts/prepublish_check.py [--site-root chemin/du/site]
Par défaut, contrôle le dossier dist voisin du dossier scripts.
Sortie 0 uniquement si un inventaire non vide passe les cinq contrôles.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse, urlsplit


SITE_ROOT = Path(__file__).resolve().parent.parent / "dist"
SITE_ORIGIN = "https://azerty.global"
SUSPECT_PATTERNS = [r"aigu-aigu", r"grave-grave", r"cedille-cedille"]
ASSET_EXTS = {".css", ".js", ".json", ".pdf", ".svg", ".png", ".jpg", ".jpeg",
              ".webp", ".ico", ".txt", ".xml", ".zip", ".woff", ".woff2", ".ttf"}
JSON_FILES = [
    "data/AZERTY Global Beta.json",
    "data/AZERTY Global.json",
    "tester/lessons.json",
    "tester/azerty-global.json",
    "tester/character-index.json",
    "data/keyboard-hotspots.json",
]


class PageTags(HTMLParser):
    """Les tags nécessaires aux contrôles, sans réécrire le document HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.canonicals: list[str] = []
        self.og_urls: list[str] = []
        self.base_href: str | None = None
        self.noindex = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "a" and "href" in attributes:
            self.links.append(attributes["href"] or "")
        elif tag == "base" and self.base_href is None and "href" in attributes:
            self.base_href = attributes["href"] or ""
        elif tag == "link" and "canonical" in (attributes.get("rel") or "").lower().split():
            self.canonicals.append(attributes.get("href") or "")
        elif tag == "meta":
            if (attributes.get("property") or "").lower() == "og:url":
                self.og_urls.append(attributes.get("content") or "")
            if (attributes.get("name") or "").lower() in {"robots", "googlebot"}:
                self.noindex |= bool(re.search(r"\bnoindex\b", attributes.get("content") or "", re.I))


@dataclass
class Page:
    path: Path
    relative: str
    text: str
    tags: PageTags

    @property
    def public_path(self) -> str:
        if self.path.name.lower() == "index.html":
            return "/" + self.relative[:-len("index.html")]
        return "/" + self.relative[:-len(".html")]

    @property
    def public_url(self) -> str:
        return SITE_ORIGIN + self.public_path


def has_site_origin(url: str) -> bool:
    parsed = urlparse(url)
    return (parsed.scheme.lower() == "https" and parsed.hostname == "azerty.global"
            and parsed.port in (None, 443) and parsed.username is None and parsed.password is None)


class Checker:
    def __init__(self, site_root: Path) -> None:
        self.root = site_root.resolve()
        self.pages: list[Page] = []
        self.errors: list[str] = []

    def fail(self, message: str) -> None:
        self.errors.append(message)
        print(f"  [FAIL] {message}")

    def ok(self, message: str) -> None:
        print(f"  [OK] {message}")

    def within_root(self, path: Path) -> Path:
        resolved = path.resolve()
        if not resolved.is_relative_to(self.root):
            raise ValueError("chemin hors de la racine du site")
        return resolved

    def inventory(self) -> bool:
        if not self.root.is_dir():
            self.fail(f"Racine construite absente ou non répertoire : {self.root}")
            return False
        try:
            paths = sorted(path for path in self.root.rglob("*")
                           if path.is_file() and path.suffix.lower() == ".html")
        except OSError as exc:
            self.fail(f"Inventaire HTML impossible : {exc}")
            return False
        for path in paths:
            relative = path.relative_to(self.root).as_posix()
            try:
                self.within_root(path)
                text = path.read_text(encoding="utf-8-sig")
                tags = PageTags()
                tags.feed(text)
                tags.close()
                self.pages.append(Page(path, relative, text, tags))
            except (OSError, UnicodeError, ValueError) as exc:
                self.fail(f"Lecture HTML {relative} : {exc}")
        english = sum(page.relative.startswith("en/") for page in self.pages)
        print(f"Inventaire : {len(self.pages)} pages HTML ({english} EN)")
        if not self.pages:
            self.fail("Aucune page HTML lisible dans la racine construite")
            return False
        return True

    def resolve_html(self, href: str, current_url: str,
                     base_href: str | None = None) -> tuple[str, Path | None]:
        """Résout une URL de navigateur, puis sa cible HTML dans le build.

        None désigne une autre origine, un autre protocole ou un asset non HTML.
        Les fragments et paramètres de requête ne participent pas au chemin sur disque.
        """
        base_url = urljoin(current_url, base_href) if base_href is not None else current_url
        absolute = urljoin(base_url, href.strip())
        if not has_site_origin(absolute):
            return absolute, None
        # Unlike urlparse.path, urlsplit.path retains semicolon parameters,
        # including an empty trailing ';', as part of the server pathname.
        pathname = unquote(urlsplit(absolute).path or "/")
        # Windows must not interpret a URL segment as a backslash or drive root.
        # Check decoded dot segments and symlinks against the resolved build root.
        if "\\" in pathname or "\x00" in pathname or ":" in pathname:
            raise ValueError("chemin URL non valide pour le site")
        local = self.within_root(self.root / pathname.lstrip("/"))
        if pathname.endswith("/"):
            candidates = [local / "index.html"]
        elif local.suffix.lower() == ".html":
            candidates = [local]
        elif local.suffix.lower() in ASSET_EXTS:
            return absolute, None
        else:
            candidates = [local.with_name(local.name + ".html"), local / "index.html"]
        candidates = [self.within_root(candidate) for candidate in candidates]
        return absolute, next((candidate for candidate in candidates if candidate.is_file()), candidates[0])

    def check_internal_links(self) -> None:
        print("\n[1/5] Liens HTML internes")
        before = len(self.errors)
        for page in self.pages:
            for href in page.tags.links:
                try:
                    _, target = self.resolve_html(href, page.public_url, page.tags.base_href)
                    if target is not None and not target.is_file():
                        self.fail(f"{page.relative} → {href} : cible HTML introuvable")
                except (OSError, ValueError) as exc:
                    self.fail(f"{page.relative} → {href} : {exc}")
        if len(self.errors) == before:
            self.ok(f"Tous les liens HTML internes sont valides ({len(self.pages)} pages)")

    def check_suspect_patterns(self) -> None:
        print("\n[2/5] Patterns suspects (garde-fou)")
        before = len(self.errors)
        regex = re.compile("|".join(SUSPECT_PATTERNS))
        for page in self.pages:
            for match in regex.finditer(page.text):
                self.fail(f"{page.relative} : pattern suspect « {match.group(0)} »")
        if len(self.errors) == before:
            self.ok("Aucun pattern suspect trouvé")

    def check_canonical_and_og_url(self) -> None:
        print("\n[3/5] Cohérence canonical / og:url")
        before = len(self.errors)
        for page in self.pages:
            for name, values in (("canonical", page.tags.canonicals), ("og:url", page.tags.og_urls)):
                if len(values) != 1 or not values[0].strip():
                    self.fail(f"{page.relative} : {name} absent, vide ou multiple")
                    continue
                value = values[0].strip()
                try:
                    parsed = urlsplit(value)
                    valid = (has_site_origin(value) and parsed.path == page.public_path
                             and not parsed.query and not parsed.fragment)
                except ValueError:
                    valid = False
                if not valid:
                    self.fail(f"{page.relative} : {name} « {value} » (attendu « {page.public_url} »)")
        if len(self.errors) == before:
            self.ok(f"canonical et og:url cohérents sur les {len(self.pages)} pages")

    def check_sitemap(self) -> None:
        print("\n[4/5] Sitemap")
        before = len(self.errors)
        try:
            sitemap = self.within_root(self.root / "sitemap.xml")
            root = ET.parse(sitemap).getroot()
        except (OSError, ValueError, ET.ParseError) as exc:
            self.fail(f"sitemap.xml absent ou invalide : {exc}")
            return
        if root.tag.rsplit("}", 1)[-1] != "urlset":
            self.fail("sitemap.xml : élément urlset attendu")
            return
        entries = root.findall("{*}url")
        if not entries:
            self.fail("sitemap.xml ne contient aucune URL")
        pages_by_path = {page.path.resolve(): page for page in self.pages}
        seen_urls: set[str] = set()
        seen_targets: set[Path] = set()
        for entry in entries:
            locations = entry.findall("{*}loc")
            if len(locations) != 1 or not (locations[0].text or "").strip():
                self.fail("sitemap.xml : entrée avec loc absent, vide ou multiple")
                continue
            location = locations[0].text.strip()
            if location in seen_urls:
                self.fail(f"sitemap.xml : URL en doublon « {location} »")
                continue
            seen_urls.add(location)
            try:
                parsed = urlparse(location)
                if (not has_site_origin(location) or parsed.params or parsed.query or parsed.fragment):
                    raise ValueError("URL absolue de https://azerty.global attendue, sans paramètres ni fragment")
                _, target = self.resolve_html(location, SITE_ORIGIN + "/")
                if target is None or target not in pages_by_path:
                    self.fail(f"{location} : cible HTML absente du site construit")
                    continue
                if target in seen_targets:
                    self.fail(f"{location} : cible HTML en doublon dans le sitemap")
                seen_targets.add(target)
                if pages_by_path[target].tags.noindex:
                    self.fail(f"{location} : cible noindex ({pages_by_path[target].relative})")
            except (OSError, ValueError) as exc:
                self.fail(f"sitemap.xml : {location} : {exc}")
        for page in self.pages:
            if not page.tags.noindex and page.path.resolve() not in seen_targets:
                self.fail(f"{page.relative} absent du sitemap")
        if len(self.errors) == before:
            self.ok(f"sitemap.xml valide ({len(seen_urls)} URLs, toutes les pages indexables présentes)")

    def check_json_files(self) -> None:
        print("\n[5/5] Validation JSON")
        for relative in JSON_FILES:
            try:
                path = self.within_root(self.root / relative)
                json.loads(path.read_text(encoding="utf-8-sig"))
                self.ok(relative)
            except (OSError, UnicodeError, ValueError) as exc:
                self.fail(f"{relative} : JSON absent ou invalide → {exc}")

    def run(self) -> int:
        print("Pré-publication — site AZERTY Global")
        print(f"Racine : {self.root}")
        if self.inventory():
            self.check_internal_links()
            self.check_suspect_patterns()
            self.check_canonical_and_og_url()
            self.check_sitemap()
            self.check_json_files()
        print("\n" + "=" * 60)
        if self.errors:
            print(f"ÉCHEC : {len(self.errors)} erreur(s)")
            return 1
        print("OK — toutes les vérifications passent")
        return 0


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-root", type=Path, default=SITE_ROOT,
                        help="Racine du site construit (défaut : %(default)s)")
    args = parser.parse_args(argv)
    return Checker(args.site_root).run()


if __name__ == "__main__":
    sys.exit(main())
