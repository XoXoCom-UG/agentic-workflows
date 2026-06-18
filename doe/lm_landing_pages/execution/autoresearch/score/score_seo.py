#!/usr/bin/env python3
"""AutoResearch SEO-completeness scorer for the MatFIT fake-door site (the fixed "prepare.py").

This is the immutable evaluation half of the AutoResearch 3-file contract: the AI
agent edits the site's metadata/sitemap/robots/structured-data (the "train.py"); THIS
script scores the result and never changes. It emits exactly one JSON line:

    {"score": <0-100 float>, "passed": <bool>, "subscores": {...}, "routes": {...}}

`passed` is False when the site fails a hard gate (a public route did not return 200,
or /sitemap.xml or /robots.txt is missing) — the optimizer reverts on passed=False
regardless of the numeric score. The numeric score is a weighted percentage of SEO
completeness checks across every public route plus several site-level checks.

Determinism: given the same server HTML, the score is byte-identical (run twice on an
unchanged tree → same number). That reproducibility is the scorer's unit test.

Free + zero-install: uses only the Python standard library (urllib + html.parser). No
pip installs, no headless Chrome, no paid API. Point it at a running Next server
(`next dev` works fine in OneDrive; metadata renders into <head> identically to prod):

    python execution/autoresearch/score/score_seo.py --base-url http://localhost:3000

Architecture note — bilingual SEO: the MatFIT site switches language client-side via
localStorage (`matfit-lang`) and serves ONE URL per page (German by default), so there
are no distinct per-language URLs to anchor `rel=alternate hreflang` to. We therefore
score the achievable bilingual signal — `og:locale` (de_DE) + `og:locale:alternate`
(en_US) — and leave true locale-routed hreflang as a documented future enhancement.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
SITE_CONFIG = REPO_ROOT / "sites" / "matfit_fakedoor_12062026" / "site.config.json"

# Public, indexable routes (path -> expected <html lang>). Legal pages are included
# because they still need a title/description and belong in the sitemap, but they are
# weighted like any other route. The server default language is German. /thank-you is a
# post-conversion page (noindex, excluded from the sitemap) and /api/submit is not a page.
PUBLIC_ROUTES: dict[str, str] = {
    "/": "de",
    "/impressum": "de",
    "/datenschutz": "de",
}

# Legal pages are reachable and may live in the sitemap, but are NOT required for the
# hard "sitemap lists all routes" gate (they're low-priority boilerplate).
SITEMAP_OPTIONAL_ROUTES = ("/impressum", "/datenschutz")

# Per-route checks and their weights. Each contributes (weight) points when it passes,
# averaged across all routes, then scaled into the per-route portion of the score.
ROUTE_CHECKS: dict[str, float] = {
    "title_present": 2.0,
    "title_length_ok": 1.0,      # ~30-60 chars
    "title_unique": 1.5,
    "desc_present": 2.0,
    "desc_length_ok": 1.0,       # ~120-160 chars
    "desc_unique": 1.5,
    "single_h1": 1.5,
    "canonical_present": 2.0,
    "canonical_on_domain": 1.0,
    "html_lang_correct": 1.0,
    "og_title": 1.0,
    "og_description": 1.0,
    "og_image": 1.5,
    "og_url": 1.0,
    "og_type": 0.5,
    "og_locale": 0.5,
    "og_locale_alternate": 1.0,  # bilingual signal (see module docstring)
    "twitter_card": 1.0,
    "jsonld_present": 1.5,       # Organization site-wide; BreadcrumbList on inner pages
    "all_img_have_alt": 1.0,
}

# Site-level checks (weighted heavier — these are all-or-nothing foundations).
SITE_CHECKS: dict[str, float] = {
    "sitemap_exists": 6.0,
    "sitemap_lists_all_routes": 4.0,
    "robots_exists": 4.0,
    "robots_references_sitemap": 2.0,
    # Not just "is there an og:image meta tag" — does the image URL actually return an
    # image? A broken/crashing OG image route still emits a meta tag, so presence alone
    # is a false pass; this fetches the image and checks it renders.
    "og_image_renders": 4.0,
}

TITLE_MIN, TITLE_MAX = 30, 60
DESC_MIN, DESC_MAX = 120, 160


class HeadParser(HTMLParser):
    """Extracts the SEO-relevant facts from a page's HTML in a single pass."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title: str = ""
        self._in_title = False
        self.html_lang: Optional[str] = None
        self.metas: list[dict[str, str]] = []   # each: {name|property: ..., content: ...}
        self.links: list[dict[str, str]] = []    # each: {rel, href, hreflang?}
        self.h1_count = 0
        self.img_total = 0
        self.img_with_alt = 0
        self.jsonld_blocks: list[str] = []
        self._in_jsonld = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.html_lang = a.get("lang")
        elif tag == "title":
            self._in_title = True
        elif tag == "meta":
            self.metas.append(a)
        elif tag == "link":
            self.links.append(a)
        elif tag == "h1":
            self.h1_count += 1
        elif tag == "img":
            self.img_total += 1
            if a.get("alt", "").strip():
                self.img_with_alt += 1
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._in_jsonld = True
            self.jsonld_blocks.append("")

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "script" and self._in_jsonld:
            self._in_jsonld = False

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        elif self._in_jsonld and self.jsonld_blocks:
            self.jsonld_blocks[-1] += data

    # --- accessors -------------------------------------------------------
    def meta_content(self, *, name: Optional[str] = None, prop: Optional[str] = None) -> Optional[str]:
        for m in self.metas:
            if name is not None and m.get("name", "").lower() == name.lower():
                return m.get("content")
            if prop is not None and m.get("property", "").lower() == prop.lower():
                return m.get("content")
        return None

    def canonical_href(self) -> Optional[str]:
        for link in self.links:
            if link.get("rel", "").lower() == "canonical":
                return link.get("href")
        return None

    def jsonld_types(self) -> list[str]:
        types: list[str] = []
        for block in self.jsonld_blocks:
            try:
                data = json.loads(block)
            except (ValueError, TypeError):
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict):
                    t = item.get("@type")
                    if isinstance(t, list):
                        types.extend(str(x) for x in t)
                    elif t:
                        types.append(str(t))
        return types


def fetch(url: str, timeout: float = 30.0, retries: int = 3) -> tuple[int, str]:
    """Return (status_code, body). status 0 on connection failure. Transient connection
    failures (status 0) are retried — this absorbs the brief window where `next dev` is up
    but a route's first lazy compile resets the socket. A real HTTP status (incl. 4xx/5xx)
    is returned immediately, so a stable server always yields the same number."""
    req = urllib.request.Request(url, headers={"User-Agent": "autoresearch-seo-scorer/1.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.status, resp.read().decode(charset, errors="replace")
        except urllib.error.HTTPError as e:
            return e.code, ""
        except (urllib.error.URLError, OSError, TimeoutError):
            if attempt < retries - 1:
                time.sleep(2.0)
    return 0, ""


def fetch_headers(url: str, timeout: float = 20.0) -> tuple[int, str]:
    """Return (status_code, content_type) without decoding the body. status 0 on failure."""
    req = urllib.request.Request(url, headers={"User-Agent": "autoresearch-seo-scorer/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.headers.get_content_type()
    except urllib.error.HTTPError as e:
        return e.code, ""
    except (urllib.error.URLError, OSError, TimeoutError):
        return 0, ""


def canonical_domain() -> str:
    """The canonical host the site should advertise, from site.config.json (config-driven
    so switching from the placeholder to the real connected domain is a one-line change)."""
    try:
        cfg = json.loads(SITE_CONFIG.read_text(encoding="utf-8"))
        url = cfg.get("site_url") or ""
        # bare host, scheme-stripped, no trailing slash
        return url.replace("https://", "").replace("http://", "").rstrip("/")
    except (OSError, ValueError):
        return ""


def score_route(path: str, html: str, expected_lang: str, domain: str,
                seen_titles: set[str], seen_descs: set[str]) -> dict[str, bool]:
    p = HeadParser()
    p.feed(html)
    title = p.title.strip()
    desc = p.meta_content(name="description") or ""
    canonical = p.canonical_href() or ""
    jsonld = p.jsonld_types()

    r: dict[str, bool] = {}
    r["title_present"] = bool(title)
    r["title_length_ok"] = TITLE_MIN <= len(title) <= TITLE_MAX
    r["title_unique"] = bool(title) and title not in seen_titles
    r["desc_present"] = bool(desc)
    r["desc_length_ok"] = DESC_MIN <= len(desc) <= DESC_MAX
    r["desc_unique"] = bool(desc) and desc not in seen_descs
    r["single_h1"] = p.h1_count == 1
    r["canonical_present"] = bool(canonical)
    r["canonical_on_domain"] = bool(domain) and domain in canonical
    r["html_lang_correct"] = (p.html_lang or "").lower().startswith(expected_lang)
    r["og_title"] = bool(p.meta_content(prop="og:title"))
    r["og_description"] = bool(p.meta_content(prop="og:description"))
    r["og_image"] = bool(p.meta_content(prop="og:image"))
    r["og_url"] = bool(p.meta_content(prop="og:url"))
    r["og_type"] = bool(p.meta_content(prop="og:type"))
    r["og_locale"] = bool(p.meta_content(prop="og:locale"))
    r["og_locale_alternate"] = bool(p.meta_content(prop="og:locale:alternate"))
    r["twitter_card"] = bool(p.meta_content(name="twitter:card"))
    # Organization expected everywhere (it lives in the root layout); inner pages may
    # additionally carry BreadcrumbList. Either qualifying type counts.
    r["jsonld_present"] = any(t in ("Organization", "BreadcrumbList", "WebSite", "ProfessionalService") for t in jsonld)
    r["all_img_have_alt"] = p.img_total == 0 or p.img_with_alt == p.img_total

    if title:
        seen_titles.add(title)
    if desc:
        seen_descs.add(desc)
    return r


def main() -> int:
    parser = argparse.ArgumentParser(description="Score MatFIT SEO completeness against a running server.")
    parser.add_argument("--base-url", default="http://localhost:3000",
                        help="Root URL of a running Next server (next dev or next start).")
    parser.add_argument("--verbose", action="store_true", help="Print a human-readable per-check breakdown to stderr.")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    domain = canonical_domain()

    subscores: dict[str, float] = {}
    route_results: dict[str, dict[str, bool]] = {}
    hard_fail = False

    # --- per-route checks ---
    seen_titles: set[str] = set()
    seen_descs: set[str] = set()
    earned = 0.0
    home_html = ""  # cached for the og:image-render check (avoids a second fetch of "/")
    per_route_weight = sum(ROUTE_CHECKS.values())
    for path, lang in PUBLIC_ROUTES.items():
        status, html = fetch(base + path)
        if path == "/":
            home_html = html
        if status != 200:
            hard_fail = True
            route_results[path] = {"_http_200": False}
            continue
        res = score_route(path, html, lang, domain, seen_titles, seen_descs)
        res["_http_200"] = True
        route_results[path] = res
        earned += sum(ROUTE_CHECKS[c] for c, ok in res.items() if c in ROUTE_CHECKS and ok)
    n_routes = len(PUBLIC_ROUTES)
    # average earned per route, as a fraction of the available per-route weight
    route_fraction = (earned / (per_route_weight * n_routes)) if n_routes else 0.0

    # --- site-level checks ---
    sm_status, sitemap = fetch(base + "/sitemap.xml")
    rb_status, robots = fetch(base + "/robots.txt")
    site_earned = 0.0

    sitemap_ok = sm_status == 200 and "<urlset" in sitemap
    if sitemap_ok:
        site_earned += SITE_CHECKS["sitemap_exists"]
    else:
        hard_fail = True
    subscores["sitemap_exists"] = float(sitemap_ok)

    # NOTE: we deliberately match only <loc> values and never <lastmod>. The sitemap's
    # lastModified is a fresh timestamp per build (sitemap.ts uses new Date()); reading it
    # here would make the score non-deterministic. Keep this check lastmod-free.
    def _route_in_sitemap(path: str) -> bool:
        # Home maps to the bare SITE_URL root, e.g. <loc>https://matfit.ai</loc>.
        # Require the actual home <loc> (not merely any <loc>); other routes by path.
        if path == "/":
            return bool(domain) and f"{domain}</loc>" in sitemap
        return path.rstrip("/") in sitemap

    sitemap_lists_all = sitemap_ok and all(
        _route_in_sitemap(p) for p in PUBLIC_ROUTES if p not in SITEMAP_OPTIONAL_ROUTES
    )
    if sitemap_lists_all:
        site_earned += SITE_CHECKS["sitemap_lists_all_routes"]
    subscores["sitemap_lists_all_routes"] = float(sitemap_lists_all)

    robots_ok = rb_status == 200 and len(robots.strip()) > 0
    if robots_ok:
        site_earned += SITE_CHECKS["robots_exists"]
    else:
        hard_fail = True
    subscores["robots_exists"] = float(robots_ok)

    robots_refs_sitemap = robots_ok and "sitemap" in robots.lower()
    if robots_refs_sitemap:
        site_earned += SITE_CHECKS["robots_references_sitemap"]
    subscores["robots_references_sitemap"] = float(robots_refs_sitemap)

    # og:image renders — parse the home page's og:image, rewrite the canonical host to the
    # base-url host (the meta is absolute on the production domain; locally it serves on
    # base), then confirm it returns an actual image (not a crashing/empty route).
    if not home_html:
        _, home_html = fetch(base + "/")
    home_parser = HeadParser()
    home_parser.feed(home_html)
    og_image = home_parser.meta_content(prop="og:image") or ""
    image_url = og_image
    if domain and domain in og_image:
        image_url = base + og_image.split(domain, 1)[1]
    img_status, img_ctype = fetch_headers(image_url) if image_url else (0, "")
    og_image_renders = img_status == 200 and img_ctype.startswith("image/")
    if og_image_renders:
        site_earned += SITE_CHECKS["og_image_renders"]
    subscores["og_image_renders"] = float(og_image_renders)

    site_weight = sum(SITE_CHECKS.values())
    site_fraction = site_earned / site_weight if site_weight else 0.0

    # --- combine: per-route portion 70%, site-level portion 30% ---
    score = round((route_fraction * 70.0) + (site_fraction * 30.0), 2)
    passed = not hard_fail

    # aggregate per-check pass rates across routes (for the optimizer's hypothesis hints)
    for check in ROUTE_CHECKS:
        oks = [rr.get(check, False) for rr in route_results.values() if rr.get("_http_200")]
        subscores[f"route::{check}"] = round(sum(1 for x in oks if x) / len(oks), 3) if oks else 0.0

    out = {"score": score, "passed": passed, "subscores": subscores, "routes": route_results}
    print(json.dumps(out))

    if args.verbose:
        print(f"\nSEO score: {score}/100   passed={passed}   (canonical domain: {domain or '<unset>'})", file=sys.stderr)
        print(f"  route portion: {route_fraction*70:.1f}/70   site portion: {site_fraction*30:.1f}/30", file=sys.stderr)
        weakest = sorted((v, k) for k, v in subscores.items() if k.startswith("route::"))[:6]
        print("  weakest per-route checks:", file=sys.stderr)
        for v, k in weakest:
            print(f"    {k.replace('route::','')}: {v:.0%} of routes pass", file=sys.stderr)
        for sk in SITE_CHECKS:
            print(f"  site::{sk}: {'PASS' if subscores.get(sk) else 'FAIL'}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
