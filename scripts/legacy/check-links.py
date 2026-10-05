#!/usr/bin/env python
"""Verifie tous les liens du site, internes et externes.

Ecrit le 2026-08-20 pendant l'audit de conformite Google Ad Grants, dont une
exigence est litteralement "All links should work"
(support.google.com/grants/answer/1657899). Le depot n'avait aucun verificateur
de liens.

    python scripts/check-links.py                      # le site en production
    python scripts/check-links.py --root dist          # le build local
    python scripts/check-links.py --root dist --internes-seulement

En mode `--root`, les liens internes sont resolus **sur le disque**, avec les
memes regles que Cloudflare Pages : `/association` accepte
`association.html`, et `/en/` accepte `en/index.html`. Un premier jet servait
`dist/` par `SimpleHTTPRequestHandler`, qui ne fait pas cette reecriture : il
declarait mortes les 46 URL propres du sitemap. Ne pas y revenir.

Ce que le script NE prouve pas, et qu'il faut lire dans sa sortie :

- un `403` sur un lien externe est presque toujours un anti-robot, pas un lien
  mort. Mesure du 2026-08-20 : HelloAsso, SourceForge, ISO, SSRN et
  data.inpi.fr repondent 403 a tout client script, meme avec un agent
  utilisateur de navigateur. Ils sont comptes a part et demandent un clic
  humain ;
- les liens presents uniquement dans un commentaire HTML sont ignores, parce
  qu'un visiteur ne peut pas les suivre. Sans ce filtre, les trois liens
  commentes vers `/aide-memoire` remontaient comme des liens morts ;
- `<link rel="preconnect">` pointe un hote et non une page : ces hotes nus sont
  ignores ;
- une URL de protocole (`ms-windows-store://`) n'est pas resolue.
"""

from __future__ import annotations

import argparse
import collections
import html as html_module
import re
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SITE = "https://azerty.global"
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126 Safari/537.36"
    )
}
IGNORED_SCHEMES = ("mailto:", "tel:", "javascript:", "data:", "ms-windows-store:")
BARE_HOSTS = {"https://fonts.googleapis.com", "https://fonts.gstatic.com"}
CTX = ssl.create_default_context()


def encode(url: str) -> str:
    """Percent-encode ce qui n'est pas ASCII, sinon urllib leve UnicodeEncodeError."""
    parts = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(
        (
            parts.scheme,
            parts.netloc.encode("idna").decode("ascii") if parts.netloc else "",
            urllib.parse.quote(parts.path, safe="/%:@&=+$,~"),
            urllib.parse.quote(parts.query, safe="/%:@&=+$,~?"),
            "",
        )
    )


def fetch(url: str, method: str = "GET", timeout: int = 25):
    request = urllib.request.Request(encode(url), headers=UA, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=CTX) as response:
            return response.status, response.read() if method == "GET" else b""
    except urllib.error.HTTPError as error:
        return error.code, b""
    except Exception as error:  # noqa: BLE001 - on rapporte, on ne releve pas
        return f"ERR:{type(error).__name__}", b""


def check_remote(url: str):
    """HEAD puis GET : beaucoup d'hotes refusent HEAD sans etre casses."""
    status, _ = fetch(url, method="HEAD")
    if isinstance(status, int) and status < 400:
        return url, status
    return url, fetch(url, method="GET")[0]


def extract(html: str, page_url: str, base: str) -> list[str]:
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    found = []
    for match in re.finditer(r'(?:href|src)="([^"#][^"]*)"', html):
        raw = html_module.unescape(match.group(1))
        if raw.startswith(IGNORED_SCHEMES):
            continue
        if raw.startswith("//"):
            target = "https:" + raw
        elif raw.startswith("/"):
            target = base + raw
        elif raw.startswith("http"):
            target = raw
        else:
            target = page_url.rsplit("/", 1)[0] + "/" + raw
        target = target.split("#")[0]
        if target.rstrip("/") in BARE_HOSTS:
            continue
        found.append(target)
    return found


def resolve_on_disk(url: str, root: Path) -> bool:
    """Les regles de Cloudflare Pages : extension implicite, index de dossier."""
    path = urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip("/")
    if path in ("", "/"):
        return (root / "index.html").is_file()
    candidates = [root / path, root / (path + ".html"), root / path / "index.html"]
    return any(candidate.is_file() for candidate in candidates)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", help="dossier du build, par exemple dist")
    parser.add_argument("--internes-seulement", action="store_true")
    args = parser.parse_args()

    links: dict[str, set[str]] = collections.defaultdict(set)
    unreadable: dict[str, object] = {}

    if args.root:
        root = Path(args.root)
        if not root.is_dir():
            sys.exit(f"{root} n'existe pas : lancer npm run build d'abord")
        pages = sorted(root.rglob("*.html"))
        print(f"{root} : {len(pages)} pages sur le disque")
        for page in pages:
            page_url = SITE + "/" + page.relative_to(root).as_posix()
            for target in extract(page.read_text(encoding="utf-8", errors="replace"), page_url, SITE):
                links[target].add(page.relative_to(root).as_posix())
    else:
        status, body = fetch(f"{SITE}/sitemap.xml")
        if not isinstance(status, int) or status >= 400:
            sys.exit(f"sitemap.xml illisible ({status})")
        pages = [loc.decode() for loc in re.findall(rb"<loc>([^<]+)</loc>", body)]
        print(f"{SITE} : {len(pages)} pages au sitemap")

        def load(url: str):
            code, content = fetch(url)
            return url, code, content

        with ThreadPoolExecutor(max_workers=8) as pool:
            for url, code, content in pool.map(load, pages):
                if not isinstance(code, int) or code >= 400:
                    unreadable[url] = code
                    continue
                for target in extract(content.decode("utf-8", "replace"), url, SITE):
                    links[target].add(url)

    internal = {url for url in links if url.startswith(SITE)}
    external = set(links) - internal
    print(f"{len(links)} liens uniques : {len(internal)} internes, {len(external)} externes")

    internal_failures: dict[str, object] = {}
    if args.root:
        for url in internal:
            if not resolve_on_disk(url, Path(args.root)):
                internal_failures[url] = "absent du build"
    else:
        with ThreadPoolExecutor(max_workers=12) as pool:
            for url, status in pool.map(check_remote, sorted(internal)):
                if not isinstance(status, int) or status >= 400:
                    internal_failures[url] = status

    external_failures: dict[str, object] = {}
    if not args.internes_seulement:
        with ThreadPoolExecutor(max_workers=12) as pool:
            for url, status in pool.map(check_remote, sorted(external)):
                if not isinstance(status, int) or status >= 400:
                    external_failures[url] = status

    for url, status in unreadable.items():
        print(f"PAGE ILLISIBLE [{status}] {url}")

    print(f"\n--- liens internes en echec : {len(internal_failures)}")
    for url, status in sorted(internal_failures.items(), key=lambda item: str(item[1])):
        print(f"  [{status}] {url}")
        for source in sorted(links[url])[:3]:
            print(f"        <- {source}")

    if args.internes_seulement:
        print("\n--- liens externes : non verifies (--internes-seulement)")
    else:
        print(f"\n--- liens externes en echec : {len(external_failures)}")
        print("    un 403 est presque toujours un anti-robot : a confirmer a la main")
        for url, status in sorted(external_failures.items(), key=lambda item: str(item[1])):
            print(f"  [{status}] {url}")

    return 1 if internal_failures or unreadable else 0


if __name__ == "__main__":
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            try:
                reconfigure(encoding="utf-8", errors="backslashreplace")
            except (OSError, ValueError):
                pass
    raise SystemExit(main())
