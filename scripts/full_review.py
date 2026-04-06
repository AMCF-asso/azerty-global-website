from pathlib import Path
import re

SITE_DIR = Path(__file__).resolve().parent.parent
HTML_FILES = sorted(SITE_DIR.glob("*.html"))
CSS_FILES = sorted((SITE_DIR / "css").glob("*.css"))
JS_FILES = sorted((SITE_DIR / "js").glob("*.js"))
TESTER_JS_FILES = sorted((SITE_DIR / "tester").glob("*.js"))
SOURCE_FILES = HTML_FILES + CSS_FILES + JS_FILES + TESTER_JS_FILES

COMMENT_RE = re.compile(r"<!--[\s\S]*?-->")
IMG_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
HREF_RE = re.compile(r'href="([^"]+)"', re.IGNORECASE)
SRC_RE = re.compile(r'src="([^"]+)"', re.IGNORECASE)
SCHEME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")
PLACEHOLDER_PATTERNS = [
    ("Lorem Ipsum", "lorem ipsum"),
    ("texte provisoire", "texte provisoire"),
    ("Nom du media", "nom du media"),
    ("Nom du sponsor", "nom du sponsor"),
]
ALLOWED_ORPHANS = {"index.html", "404.html", "merci.html"}


def read_text(path):
    return path.read_text(encoding="utf-8")


def visible_html(content):
    return COMMENT_RE.sub("", content)


def local_ref_candidates(page_path, ref):
    ref = ref.split("#", 1)[0].split("?", 1)[0].strip()
    if not ref or ref in {"/", "."}:
        return []
    if ref.startswith(("//", "#")) or SCHEME_RE.match(ref):
        return []

    if ref.startswith("/"):
        trimmed = ref.lstrip("/")
        candidates = [SITE_DIR / trimmed]
        if "." not in Path(trimmed).name:
            candidates.insert(0, SITE_DIR / f"{trimmed}.html")
        return candidates

    return [page_path.parent / ref]


def page_slug_from_ref(ref):
    ref = ref.split("#", 1)[0].split("?", 1)[0].strip()
    if not ref or ref in {"/", "."}:
        return "index"
    if ref.startswith(("//", "#")) or SCHEME_RE.match(ref):
        return None

    if ref.startswith("/"):
        ref = ref.lstrip("/")

    ref_path = Path(ref)
    if ref_path.suffix and ref_path.suffix != ".html":
        return None

    return ref_path.stem or "index"


print("=== DEBUT DE L'ANALYSE DU SITE AZERTY GLOBAL ===\n")

print("1. RECHERCHE DE TODOs ET FIXMEs :")
for path in SOURCE_FILES:
    content = read_text(path)
    for i, line in enumerate(content.splitlines(), start=1):
        upper = line.upper()
        if "TODO" in upper or "FIXME" in upper:
            print(f"  - {path.name} (Ligne {i}): {line.strip()}")

print("\n2. RECHERCHE DE CONSOLE.LOG (Oublis de debug) :")
for path in JS_FILES + TESTER_JS_FILES:
    content = read_text(path)
    for i, line in enumerate(content.splitlines(), start=1):
        stripped = line.strip()
        if "console.log" in line and not stripped.startswith("//"):
            print(f"  - {path.name} (Ligne {i}): {stripped}")

print("\n3. ACCESSIBILITE : IMAGES SANS ATTRIBUT ALT :")
for path in HTML_FILES:
    content = visible_html(read_text(path))
    for img in IMG_RE.findall(content):
        lower = img.lower()
        if 'alt="' not in lower and "alt='" not in lower:
            print(f"  - {path.name} : {img}")
        elif 'alt=""' in lower or "alt=''" in lower:
            print(f"  - {path.name} (alt vide) : {img}")

print("\n4. ANALYSE DES LIENS (Vides, HTTP obsoletes, Liens de dev) :")
all_local_refs = []
linked_page_slugs = set()

for path in HTML_FILES:
    content = visible_html(read_text(path))
    hrefs = HREF_RE.findall(content)
    srcs = SRC_RE.findall(content)

    for href in hrefs:
        if href in {"#", ""}:
            print(f'  - {path.name} a un lien vide: href="{href}"')
        elif href.startswith("http://") and "localhost" not in href:
            print(f"  - {path.name} a un lien HTTP non securise: {href}")
        elif "localhost" in href or "127.0.0.1" in href:
            print(f"  - {path.name} a un lien de developpement (localhost): {href}")

        all_local_refs.append((path, href, "href"))
        slug = page_slug_from_ref(href)
        if slug:
            linked_page_slugs.add(slug)

    for src in srcs:
        all_local_refs.append((path, src, "src"))

print("\n5. LIENS INTERNES MORTS :")
reported_missing = set()
for page_path, ref, attr_name in all_local_refs:
    candidates = local_ref_candidates(page_path, ref)
    if not candidates:
        continue
    if any(candidate.exists() for candidate in candidates):
        continue

    key = (page_path.name, ref, attr_name)
    if key in reported_missing:
        continue
    reported_missing.add(key)
    print(f"  - {page_path.name} reference introuvable via {attr_name}: {ref}")

print("\n6. FICHIERS ORPHELINS (Potentiellement a supprimer) :")
for path in HTML_FILES:
    if path.name in ALLOWED_ORPHANS:
        continue
    if path.stem not in linked_page_slugs:
        print(f"  - {path.name} n'est maille nulle part (orphelin)")

print("\n7. RECHERCHE DE TEXTE PLACEHOLDER (visible uniquement) :")
for path in HTML_FILES:
    content = visible_html(read_text(path)).lower()
    for label, needle in PLACEHOLDER_PATTERNS:
        if needle in content:
            print(f'  - {path.name} contient "{label}"')

print("\n=== FIN DE L'ANALYSE ===")
