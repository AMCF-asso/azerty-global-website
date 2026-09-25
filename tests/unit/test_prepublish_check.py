"""Black-box regression checks using disposable, non-Git site builds only.

Run with the standard library:
    python -B -m unittest discover -s tests/unit -p test_prepublish_check.py -v
"""

from __future__ import annotations

import html
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "prepublish_check.py"
ORIGIN = "https://azerty.global"
JSON_FILES = (
    "data/AZERTY Global Beta.json",
    "data/AZERTY Global.json",
    "tester/lessons.json",
    "tester/azerty-global.json",
    "tester/character-index.json",
    "data/keyboard-hotspots.json",
)
PAGES = {
    "index.html": "/",
    "telecharger.html": "/telecharger",
    "en/index.html": "/en/",
    "en/download.html": "/en/download",
    "bienvenue.html": "/bienvenue",
}
INDEXABLE_URLS = [ORIGIN + url for name, url in PAGES.items() if name != "bienvenue.html"]
DEFAULT = object()


class SiteFixture:
    """Small bilingual build; literal URLs are expectations, not checker imports."""

    def __init__(self, root: Path):
        self.root = root
        root.mkdir(parents=True)
        for name in PAGES:
            self.page(name)
        for name in JSON_FILES:
            self.write(name, '{}\n')
        self.sitemap()

    def write(self, name: str, content: str) -> None:
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def page(self, name: str, *, canonical=DEFAULT, og_url=DEFAULT, body="",
             head="", public_path=None, noindex=None) -> None:
        url = ORIGIN + (public_path if public_path is not None else PAGES[name])
        canonical = url if canonical is DEFAULT else canonical
        og_url = url if og_url is DEFAULT else og_url
        tags = ['<meta charset="utf-8">', '<title>Fixture page</title>']
        if canonical is not None:
            tags.append(f'<link rel="canonical" href="{html.escape(canonical, quote=True)}">')
        if og_url is not None:
            tags.append(f'<meta property="og:url" content="{html.escape(og_url, quote=True)}">')
        if noindex is True or (noindex is None and name == "bienvenue.html"):
            tags.append('<meta name="robots" content="noindex, follow">')
        self.write(name, '<!doctype html><html><head>' + ''.join(tags) + head +
                   '</head><body><h1 id="top">Fixture</h1>' + body + '</body></html>')

    def sitemap(self, urls=None) -> None:
        urls = INDEXABLE_URLS if urls is None else urls
        entries = ''.join(f'<url><loc>{html.escape(url)}</loc></url>' for url in urls)
        self.write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>'
                   '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
                   entries + '</urlset>')


class PrepublishCliTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="azerty-prepublish-tests-")
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)
        self.site = SiteFixture(self.work / "site")
        # No .git, installed Python packages, PATH tools or real web access are
        # needed. The subprocess only reads this disposable fixture tree.
        self.env = {**os.environ, "PATH": "", "PYTHONDONTWRITEBYTECODE": "1"}

    def run_checker(self, root=DEFAULT, *, script=SCRIPT):
        command = [sys.executable, "-S", str(script)]
        if root is DEFAULT:
            root = self.site.root
        if root is not None:
            command.extend(["--site-root", str(root)])
        return subprocess.run(command, cwd=self.work, env=self.env, capture_output=True,
                              text=True, encoding="utf-8", errors="replace", timeout=20)

    def assert_valid(self, **kwargs) -> None:
        result = self.run_checker(**kwargs)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def assert_invalid(self, **kwargs) -> None:
        result = self.run_checker(**kwargs)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        # A startup/import crash is not evidence that this invalid fixture was
        # inspected. The CLI must produce a validation failure without crashing.
        self.assertNotIn("Traceback (most recent call last):", result.stdout + result.stderr)

    def test_bilingual_build_with_noindex_page_omitted_from_sitemap_is_valid_and_read_only(self):
        before = {str(path.relative_to(self.site.root)): path.read_bytes()
                  for path in self.site.root.rglob('*') if path.is_file()}
        self.assert_valid()
        after = {str(path.relative_to(self.site.root)): path.read_bytes()
                 for path in self.site.root.rglob('*') if path.is_file()}
        self.assertEqual(after, before)

    def test_default_root_is_dist_beside_scripts_not_the_working_directory(self):
        repository = self.work / "repository"
        SiteFixture(repository / "dist")
        copied_script = repository / "scripts" / SCRIPT.name
        copied_script.parent.mkdir()
        shutil.copyfile(SCRIPT, copied_script)
        self.assert_valid(root=None, script=copied_script)

    def test_missing_root_fails(self):
        self.assert_invalid(root=self.work / "not-built")

    def test_empty_root_fails(self):
        empty = self.work / "empty-build"
        empty.mkdir()
        self.assert_invalid(root=empty)

    def test_root_containing_only_json_and_sitemap_has_no_html_and_fails(self):
        for name in PAGES:
            (self.site.root / name).unlink()
        self.site.sitemap([])
        self.assert_invalid()

    def test_clean_relative_directory_html_query_and_fragment_links_are_valid(self):
        self.site.page("index.html", body='''
            <a href="/en/">English home</a>
            <a href="/telecharger">French download</a>
            <a href="telecharger.html?source=home#top">Explicit HTML</a>
            <a href="?source=home#top">Current page</a><a href="#top">Top</a>
            <a href="https://azerty.global/en/download?source=fr#top">Absolute</a>
            <a href="//azerty.global/en/">Same-origin directory</a>
        ''')
        self.site.page("en/index.html", body='''
            <a href="download?source=en#top">English download</a>
            <a href="./download.html">Explicit English HTML</a>
            <a href="../telecharger">French download</a>
            <a href="/">French home</a><a href="/en/">English home</a>
        ''')
        self.assert_valid()

    def test_base_href_controls_relative_links_using_the_first_base(self):
        self.site.page("index.html", head='<base href="/en/"><base href="/missing/">',
                       body='<a href="download?from=base#top">Download</a>')
        self.assert_valid()

    def test_absolute_same_origin_base_href_is_valid(self):
        self.site.page("index.html", head='<base href="https://azerty.global/en/">',
                       body='<a href="download">Download</a>')
        self.assert_valid()

    def test_external_links_and_external_base_are_not_local_targets(self):
        self.site.page("index.html", body='''
            <a href="https://does-not-exist.invalid/missing">External</a>
            <a href="mailto:test@example.invalid">Mail</a><a href="tel:+33123456789">Phone</a>
        ''')
        self.site.page("en/index.html", head='<base href="https://does-not-exist.invalid/">',
                       body='<a href="missing">External relative link</a>')
        self.assert_valid()

    def test_missing_english_link_is_not_satisfied_by_french_file_with_same_name(self):
        self.site.page("en/index.html", body='<a href="telecharger">Missing translation</a>')
        self.assert_invalid()

    def test_same_origin_absolute_missing_link_fails(self):
        self.site.page("index.html", body='<a href="https://azerty.global/en/missing?x=1#top">Missing</a>')
        self.assert_invalid()

    def test_semicolon_is_part_of_the_html_path_not_a_query(self):
        self.site.page("index.html", body='<a href="/en/download;stale">Missing path</a>')
        self.assert_invalid()

    def test_unknown_extensions_do_not_hide_missing_html_targets(self):
        for href in ("/en/download.htm", "/version-1.5"):
            with self.subTest(href=href):
                self.site.page("index.html", body=f'<a href="{href}">Missing path</a>')
                self.assert_invalid()

    def test_existing_html_slug_with_a_dot_keeps_its_complete_name(self):
        self.site.page("version-1.5.html", public_path="/version-1.5")
        self.site.sitemap(INDEXABLE_URLS + [ORIGIN + "/version-1.5"])
        self.site.page("index.html", body='<a href="/version-1.5">Version</a>')
        self.assert_valid()

    def test_base_href_does_not_mask_missing_english_target(self):
        self.site.page("index.html", head='<base href="/en/">',
                       body='<a href="telecharger">Missing translation</a>')
        self.assert_invalid()

    def test_noindex_bienvenue_is_still_checked_for_broken_links(self):
        self.site.page("bienvenue.html", body='<a href="/en/missing">Missing</a>')
        self.assert_invalid()

    def test_noindex_bienvenue_is_still_checked_for_suspect_patterns(self):
        self.site.page("bienvenue.html", body='<p>aigu-aigu</p>')
        self.assert_invalid()

    def test_nested_html_is_checked_even_outside_top_level_and_english_folder(self):
        self.site.page("nested/deeper/private.html", public_path="/nested/deeper/private",
                       noindex=True, body='<a href="/nested/missing">Missing</a>')
        self.assert_invalid()

    def test_each_suspect_pattern_fails_on_english_page(self):
        for pattern in ("aigu-aigu", "grave-grave", "cedille-cedille"):
            with self.subTest(pattern=pattern):
                self.site.page("en/download.html", body=f'<p>{pattern}</p>')
                self.assert_invalid()

    def test_missing_sitemap_fails(self):
        (self.site.root / "sitemap.xml").unlink()
        self.assert_invalid()

    def test_malformed_sitemap_fails(self):
        self.site.write("sitemap.xml", '<urlset><url><loc>')
        self.assert_invalid()

    def test_sitemap_target_must_exist_at_its_full_english_path(self):
        self.site.sitemap(INDEXABLE_URLS + [ORIGIN + "/en/telecharger"])
        self.assert_invalid()

    def test_noindex_page_must_not_appear_in_sitemap(self):
        self.site.sitemap(INDEXABLE_URLS + [ORIGIN + "/bienvenue"])
        self.assert_invalid()

    def test_each_indexable_page_including_both_homes_must_appear_in_sitemap(self):
        for omitted_url in INDEXABLE_URLS:
            with self.subTest(omitted_url=omitted_url):
                self.site.sitemap([url for url in INDEXABLE_URLS if url != omitted_url])
                self.assert_invalid()

    def test_duplicate_sitemap_url_fails(self):
        self.site.sitemap(INDEXABLE_URLS + [ORIGIN + "/en/"])
        self.assert_invalid()

    def test_missing_canonical_and_og_url_fail_independently(self):
        for field in ("canonical", "og_url"):
            with self.subTest(field=field):
                self.site.page("en/download.html", **{field: None})
                self.assert_invalid()

    def test_metadata_is_required_even_on_noindex_page(self):
        for field in ("canonical", "og_url"):
            with self.subTest(field=field):
                self.site.page("bienvenue.html", **{field: None})
                self.assert_invalid()

    def test_canonical_and_og_url_require_https_production_origin(self):
        for field in ("canonical", "og_url"):
            for url in ("https://example.invalid/en/download", "http://azerty.global/en/download",
                        "https://azerty.global:444/en/download", "/en/download"):
                with self.subTest(field=field, url=url):
                    self.site.page("en/download.html", **{field: url})
                    self.assert_invalid()

    def test_canonical_and_og_url_require_full_english_path_not_basename(self):
        for field in ("canonical", "og_url"):
            with self.subTest(field=field):
                self.site.page("en/download.html", **{field: ORIGIN + "/download"})
                self.assert_invalid()

    def test_english_home_metadata_must_not_point_to_french_home(self):
        for field in ("canonical", "og_url"):
            with self.subTest(field=field):
                self.site.page("en/index.html", **{field: ORIGIN + "/"})
                self.assert_invalid()

    def test_metadata_extra_url_parts_are_not_canonical_urls(self):
        for field in ("canonical", "og_url"):
            for suffix in ("?source=fixture", "#top", ";"):
                with self.subTest(field=field, suffix=suffix):
                    self.site.page("en/download.html", **{field: ORIGIN + "/en/download" + suffix})
                    self.assert_invalid()

    def test_each_required_json_must_exist(self):
        for name in JSON_FILES:
            with self.subTest(name=name):
                (self.site.root / name).unlink()
                self.assert_invalid()
            self.site.write(name, '{}\n')

    def test_each_required_json_must_parse(self):
        for name in JSON_FILES:
            with self.subTest(name=name):
                self.site.write(name, '{"unclosed":')
                self.assert_invalid()
            self.site.write(name, '{}\n')


if __name__ == "__main__":
    unittest.main()
