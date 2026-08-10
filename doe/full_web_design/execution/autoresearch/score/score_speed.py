#!/usr/bin/env python3
"""AutoResearch speed scorer for the XoXoCom site (the fixed "prepare.py").

Deterministic performance-budget audit — NOT Lighthouse. Lighthouse timing scores
wobble ±2–5 points between identical runs, which would randomly keep no-ops and
revert real wins in the optimizer's keep-or-revert gate. This scorer instead measures
exact bytes: it fetches every public route from a running PRODUCTION server, downloads
every referenced same-origin asset, gzip-compresses each locally (zlib level 9, so the
number is independent of server encoding quirks), and grades against byte budgets.
Same build → same score, every time. Lighthouse/PageSpeed Insights is still used —
but only as a before/after bookend against the live URL, never inside the loop.

The site has no images, videos, or third-party scripts (verified at design time), so
its entire speed story is JS + fonts + CSS + server-rendered HTML — exactly what byte
budgets measure directly.

Emits exactly one JSON line (same contract as score_seo.py):

    {"score": <0-100 float>, "passed": <bool>, "subscores": {...}, "routes": {...}}

Hard gates (passed=false → the optimizer reverts regardless of the numeric score):
  1. any public route not HTTP 200
  2. any referenced same-origin asset 404s
  3. dev server detected (dev bundles are unminified — scores would be incomparable)
  4. SEO gate: score_seo.py must still return 100/passed against the same server —
     experiment #2 must never silently undo experiment #1.

Byte checks use a continuous linear ramp (full credit at/below target, zero credit
at/above hard limit) so every KB shaved moves the score — no dead plateaus. KB values
are rounded to whole KB first, which absorbs Next.js buildId jitter between rebuilds.

MUST be pointed at a production build (`next build` + `next start`) — use
execution/autoresearch/serve_prod.py, which builds outside OneDrive:

    python execution/autoresearch/score/score_speed.py --base-url http://localhost:3100

Free + zero-install: Python standard library only.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

HERE = Path(__file__).resolve().parent
SEO_SCORER = HERE / "score_seo.py"

# Public routes — kept in lockstep with score_seo.py's PUBLIC_ROUTES.
# `/blog` is the index only; see the note there for why article slugs are excluded.
PUBLIC_ROUTES: list[str] = [
    "/",
    "/produkte",
    "/blog",
    "/leistungen/ai-transformation",
    "/leistungen/expert-consulting",
    "/leistungen/business-coaching",
    "/ueber-uns",
    "/kontakt",
    "/impressum",
    "/datenschutz",
    "/agb",
]

# ---------------------------------------------------------------------------
# BUDGETS — calibrated against the real baseline build, then FROZEN.
# Changing these mid-run corrupts prev_best comparability in results/speed.tsv.
# Each byte budget is (target_kb, limit_kb): full credit ≤ target, zero ≥ limit,
# linear in between. KB = round(gzip_bytes / 1024).
# ---------------------------------------------------------------------------
BUDGET_ROUTE_JS = (110, 260)      # per-route first-load JS, gzip KB
BUDGET_ROUTE_CSS = (12, 40)       # per-route stylesheet bytes, gzip KB
BUDGET_ROUTE_HTML = (25, 90)      # HTML document itself, gzip KB
BUDGET_SCRIPT_COUNT = (10, 25)    # number of <script> tags (external + inline)
BUDGET_SHARED_JS = (95, 220)      # chunks common to ALL routes, gzip KB
BUDGET_FONT_KB = (45, 130)        # critical font bytes (raw — already compressed), KB
FONT_COUNT_MAX = 3                # critical font files
PRELOAD_COUNT_MAX = 4             # <link rel=preload> per page
SSR_MIN_VISIBLE_CHARS = 300       # visible text required in raw HTML (no JS). This is a
                                  # REGRESSION GUARD (all baseline pages pass): if a refactor
                                  # stops server-rendering the copy, chars collapse toward 0
                                  # and the check fails. Deliberately below baseline so the
                                  # incentive is never "pad the copy to game the scorer".

# Per-route checks and weights (70% of the score, averaged across routes).
ROUTE_CHECKS: dict[str, float] = {
    "js_kb": 4.0,             # first-load JS weight — the dominant lever
    "ssr_content": 2.0,       # h1 + enough visible text WITHOUT JS (guards i18n refactor)
    "css_kb": 1.5,
    "html_kb": 1.0,
    "no_third_party": 1.0,    # zero cross-origin requests
    "script_count": 0.5,
    "preload_hygiene": 0.5,   # every preload has `as`; count within budget
    "no_blocking_scripts": 0.5,  # no sync external scripts in <head>
}

# Site-level checks (30% of the score).
SITE_CHECKS: dict[str, float] = {
    "shared_js_kb": 6.0,       # the baseline every visitor pays on every page
    "font_kb": 3.0,
    "font_count_ok": 3.0,
    "compression_served": 3.0,  # server sends Content-Encoding when offered gzip
    "immutable_cache": 3.0,     # /_next/static/* served with immutable caching
}

USER_AGENT = "autoresearch-speed-scorer/1.0"
FONT_EXTENSIONS = (".woff2", ".woff", ".ttf", ".otf")


def ramp(value: float, target: float, limit: float) -> float:
    """Linear credit: 1.0 at/below target, 0.0 at/above limit."""
    if value <= target:
        return 1.0
    if value >= limit:
        return 0.0
    return round((limit - value) / (limit - target), 4)


def gzip_kb(data: bytes) -> int:
    """Whole gzip-equivalent KB (local zlib level 9 → server-independent; whole-KB
    rounding absorbs buildId jitter between otherwise identical rebuilds)."""
    return round(len(zlib.compress(data, 9)) / 1024)


def raw_kb(data: bytes) -> int:
    return round(len(data) / 1024)


class PageParser(HTMLParser):
    """One pass over a page's HTML: scripts, stylesheets, preloads, h1s, visible text."""

    SKIP_TEXT_TAGS = {"script", "style", "noscript", "template"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.scripts: list[dict[str, str]] = []   # attrs of every <script>
        self.stylesheets: list[str] = []           # href of rel=stylesheet
        self.preloads: list[dict[str, str]] = []   # attrs of rel=preload links
        self.other_links: list[dict[str, str]] = []
        self.h1_count = 0
        self.visible_chars = 0
        self._skip_depth = 0
        self._in_head = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "head":
            self._in_head = True
        elif tag == "script":
            a["_in_head"] = "1" if self._in_head else ""
            self.scripts.append(a)
        elif tag == "link":
            rel = a.get("rel", "").lower()
            if rel == "stylesheet":
                self.stylesheets.append(a.get("href", ""))
            elif rel == "preload":
                self.preloads.append(a)
            else:
                self.other_links.append(a)
        elif tag == "h1":
            self.h1_count += 1
        if tag in self.SKIP_TEXT_TAGS:
            self._skip_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag == "head":
            self._in_head = False
        if tag in self.SKIP_TEXT_TAGS and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0:
            self.visible_chars += len(data.strip())


class AssetCache:
    """Downloads each asset exactly once; remembers status, bytes, and headers."""

    def __init__(self, base: str) -> None:
        self.base = base
        self._cache: dict[str, tuple[int, bytes, dict[str, str]]] = {}

    def fetch(self, url: str, retries: int = 3) -> tuple[int, bytes, dict[str, str]]:
        if url in self._cache:
            return self._cache[url]
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENT,
            # identity → we measure raw bytes and compress locally for determinism
            "Accept-Encoding": "identity",
        })
        result: tuple[int, bytes, dict[str, str]] = (0, b"", {})
        for attempt in range(retries):
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    headers = {k.lower(): v for k, v in resp.headers.items()}
                    result = (resp.status, resp.read(), headers)
                    break
            except urllib.error.HTTPError as e:
                result = (e.code, b"", {})
                break
            except (urllib.error.URLError, OSError, TimeoutError):
                if attempt < retries - 1:
                    time.sleep(2.0)
        self._cache[url] = result
        return result


def is_same_origin(url: str, base: str) -> bool:
    if url.startswith("//"):  # protocol-relative → external host, not a local path
        return url[2:].split("/")[0] == urllib.parse.urlparse(base).netloc
    if url.startswith("/"):
        return True
    return urllib.parse.urlparse(url).netloc == urllib.parse.urlparse(base).netloc


def absolutize(url: str, base: str, page_url: str) -> str:
    return urllib.parse.urljoin(page_url if not url.startswith("/") else base, url)


def detect_dev_server(parser: PageParser, html: str) -> bool:
    """Dev-mode markers: unhashed chunk URLs with ?v= timestamps, HMR client, or a
    'development' buildId. Prod chunks are content-hashed and never carry ?v=."""
    for s in parser.scripts:
        src = s.get("src", "")
        if re.search(r"\?v=\d+", src) or "/development/" in src:
            return True
    return "webpack-hmr" in html or "__nextDevClientId" in html


def extract_font_urls(css_text: str, css_url: str, base: str) -> set[str]:
    urls: set[str] = set()
    for m in re.finditer(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)", css_text):
        u = m.group(1)
        if u.lower().split("?")[0].endswith(FONT_EXTENSIONS):
            urls.add(absolutize(u, base, css_url))
    return urls


def critical_font_urls(css_fonts: set[str], preload_fonts: set[str]) -> set[str]:
    """The fonts a visitor actually downloads, not everything @font-face mentions.

    next/font slices a Google variable font into unicode-range subsets; a browser
    only fetches slices matching the page's characters (for this de/en site: the
    latin slice). Counting every slice would grade phantom bytes — calibration
    proved the font-weight list is a byte no-op for variable fonts. Critical =
    fonts forced via <link rel=preload as=font> plus next/font's priority-subset
    files (the `.p.` infix). Falls back to ALL css fonts if neither marker exists
    (conservative: a hand-rolled @font-face setup gets fully counted)."""
    critical = set(preload_fonts)
    critical |= {u for u in css_fonts if re.search(r"\.p(\.[a-z0-9]+)?\.woff2?$", u.lower())}
    return critical if critical else set(css_fonts)


def run_seo_gate(base_url: str) -> tuple[float, bool]:
    """Re-run the SEO scorer against the same server — the speed experiment must
    never undo experiment #1. Returns (seo_score, gate_ok)."""
    proc = subprocess.run([sys.executable, str(SEO_SCORER), "--base-url", base_url],
                          capture_output=True, text=True)
    if proc.returncode != 0:
        return 0.0, False
    lines = [ln for ln in proc.stdout.strip().splitlines() if ln.strip()]
    if not lines:
        return 0.0, False
    try:
        seo = json.loads(lines[-1])
    except ValueError:
        return 0.0, False
    seo_score = float(seo.get("score", 0.0))
    return seo_score, bool(seo.get("passed")) and seo_score >= 99.995


def main() -> int:
    parser = argparse.ArgumentParser(description="Score XoXoCom page-weight budgets against a running PROD server.")
    parser.add_argument("--base-url", default="http://localhost:3100",
                        help="Root URL of a running `next start` server (use serve_prod.py).")
    parser.add_argument("--verbose", action="store_true",
                        help="Print a human-readable per-route byte breakdown to stderr.")
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    cache = AssetCache(base)

    subscores: dict[str, float] = {}
    route_results: dict[str, dict] = {}
    hard_fail = False
    fail_reasons: list[str] = []

    all_css_urls: set[str] = set()
    preload_font_urls: set[str] = set()  # fonts forced via <link rel=preload as=font>
    js_url_sets: list[set[str]] = []   # per route, for the shared-JS intersection
    static_asset_headers: dict[str, str] = {}  # first /_next/static asset's cache-control
    compression_checked = False
    compression_ok = False

    per_route_weight = sum(ROUTE_CHECKS.values())
    earned = 0.0

    for path in PUBLIC_ROUTES:
        page_url = base + path
        status, body, _ = cache.fetch(page_url)
        if status != 200:
            hard_fail = True
            fail_reasons.append(f"route {path} returned {status}")
            route_results[path] = {"_http_200": False}
            continue
        html = body.decode("utf-8", errors="replace")
        p = PageParser()
        p.feed(html)

        if detect_dev_server(p, html):
            hard_fail = True
            reason = ("dev server detected (unminified bundles — score against "
                      "`next start` via serve_prod.py, not `next dev`)")
            if reason not in fail_reasons:
                fail_reasons.append(reason)

        # ---- collect + download referenced same-origin assets --------------
        js_urls: set[str] = set()
        third_party = 0
        broken_assets: list[str] = []

        for s in p.scripts:
            src = s.get("src", "")
            if not src:
                continue
            if not is_same_origin(src, base):
                third_party += 1
                continue
            js_urls.add(absolutize(src, base, page_url))
        css_urls: set[str] = set()
        for href in p.stylesheets:
            if not href:
                continue
            if not is_same_origin(href, base):
                third_party += 1
                continue
            css_urls.add(absolutize(href, base, page_url))
        for lk in p.preloads:
            href = lk.get("href", "")
            if not href:
                continue
            if not is_same_origin(href, base):
                third_party += 1
            elif lk.get("as", "").lower() == "font":
                preload_font_urls.add(absolutize(href, base, page_url))

        js_bytes = 0
        for u in sorted(js_urls):
            st, data, hdrs = cache.fetch(u)
            if st != 200:
                broken_assets.append(u)
                continue
            js_bytes += len(zlib.compress(data, 9))
            if "/_next/static/" in u and u not in static_asset_headers:
                static_asset_headers[u] = hdrs.get("cache-control", "")
        css_bytes = 0
        for u in sorted(css_urls):
            st, data, hdrs = cache.fetch(u)
            if st != 200:
                broken_assets.append(u)
                continue
            css_bytes += len(zlib.compress(data, 9))
            all_css_urls.add(u)
            if "/_next/static/" in u and u not in static_asset_headers:
                static_asset_headers[u] = hdrs.get("cache-control", "")

        if broken_assets:
            hard_fail = True
            fail_reasons.append(f"{path}: broken asset(s) {broken_assets[:3]}")

        js_url_sets.append(js_urls)

        # ---- per-route checks ----------------------------------------------
        js_kb = round(js_bytes / 1024)
        css_kb = round(css_bytes / 1024)
        html_kb = gzip_kb(body)
        script_total = len(p.scripts)
        blocking = [s for s in p.scripts
                    if s.get("src") and s.get("_in_head")
                    and "async" not in s and "defer" not in s
                    and "nomodule" not in s          # noModule scripts are inert in modern browsers
                    and s.get("type", "") != "module"]
        preloads_ok = (len(p.preloads) <= PRELOAD_COUNT_MAX
                       and all(lk.get("as") for lk in p.preloads))

        r: dict[str, float | bool | int] = {}
        r["js_kb"] = ramp(js_kb, *BUDGET_ROUTE_JS)
        r["ssr_content"] = float(p.h1_count >= 1 and p.visible_chars >= SSR_MIN_VISIBLE_CHARS)
        r["css_kb"] = ramp(css_kb, *BUDGET_ROUTE_CSS)
        r["html_kb"] = ramp(html_kb, *BUDGET_ROUTE_HTML)
        r["no_third_party"] = float(third_party == 0)
        r["script_count"] = ramp(script_total, *BUDGET_SCRIPT_COUNT)
        r["preload_hygiene"] = float(preloads_ok)
        r["no_blocking_scripts"] = float(not blocking)

        earned += sum(ROUTE_CHECKS[c] * float(r[c]) for c in ROUTE_CHECKS)
        # raw measurements ride along for --verbose and human debugging
        r["_http_200"] = True
        r["_js_kb"] = js_kb
        r["_css_kb"] = css_kb
        r["_html_kb"] = html_kb
        r["_scripts"] = script_total
        r["_visible_chars"] = p.visible_chars
        route_results[path] = r

        if path == "/":
            # compression gate measured once, against the homepage
            req = urllib.request.Request(page_url, headers={
                "User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    enc = (resp.headers.get("Content-Encoding") or "").lower()
                    compression_ok = enc in ("gzip", "br", "zstd")
                    compression_checked = True
            except (urllib.error.URLError, OSError, TimeoutError):
                compression_checked = True

    n_routes = len(PUBLIC_ROUTES)
    route_fraction = (earned / (per_route_weight * n_routes)) if n_routes else 0.0

    # ---- site-level checks ---------------------------------------------------
    site_earned = 0.0

    shared_js_urls = set.intersection(*js_url_sets) if js_url_sets else set()
    shared_bytes = 0
    for u in sorted(shared_js_urls):
        st, data, _ = cache.fetch(u)
        if st == 200:
            shared_bytes += len(zlib.compress(data, 9))
    shared_kb = round(shared_bytes / 1024)
    frac = ramp(shared_kb, *BUDGET_SHARED_JS)
    site_earned += SITE_CHECKS["shared_js_kb"] * frac
    subscores["shared_js_kb"] = frac

    css_font_urls: set[str] = set()
    for u in sorted(all_css_urls):
        st, data, _ = cache.fetch(u)
        if st == 200:
            css_font_urls |= extract_font_urls(data.decode("utf-8", errors="replace"), u, base)
    # the 404 hard-gate covers EVERY referenced font; the byte budget only the critical set
    font_broken: list[str] = []
    for u in sorted(css_font_urls | preload_font_urls):
        st, _, _ = cache.fetch(u)
        if st != 200:
            font_broken.append(u)
    if font_broken:
        hard_fail = True
        fail_reasons.append(f"broken font(s) {font_broken[:3]}")

    critical_fonts = critical_font_urls(css_font_urls, preload_font_urls)
    font_bytes = 0
    for u in sorted(critical_fonts):
        st, data, _ = cache.fetch(u)
        if st == 200:
            font_bytes += len(data)  # fonts are pre-compressed; raw bytes are the honest number
    font_kb = round(font_bytes / 1024)
    frac = ramp(font_kb, *BUDGET_FONT_KB)
    site_earned += SITE_CHECKS["font_kb"] * frac
    subscores["font_kb"] = frac

    font_count_ok = len(critical_fonts) <= FONT_COUNT_MAX
    if font_count_ok:
        site_earned += SITE_CHECKS["font_count_ok"]
    subscores["font_count_ok"] = float(font_count_ok)

    if compression_checked and compression_ok:
        site_earned += SITE_CHECKS["compression_served"]
    subscores["compression_served"] = float(compression_checked and compression_ok)

    cache_ctl = next(iter(static_asset_headers.values()), "")
    immutable_ok = "immutable" in cache_ctl or "max-age=31536000" in cache_ctl
    if immutable_ok:
        site_earned += SITE_CHECKS["immutable_cache"]
    subscores["immutable_cache"] = float(immutable_ok)

    site_weight = sum(SITE_CHECKS.values())
    site_fraction = site_earned / site_weight if site_weight else 0.0

    # ---- SEO hard gate (experiment #1 must survive experiment #2) ------------
    seo_score, seo_ok = run_seo_gate(base)
    subscores["gate_seo_score"] = seo_score
    if not seo_ok:
        hard_fail = True
        fail_reasons.append(f"SEO gate failed: score_seo.py returned {seo_score} (must stay 100)")

    # ---- combine: per-route 70%, site-level 30% -------------------------------
    score = round(route_fraction * 70.0 + site_fraction * 30.0, 2)
    passed = not hard_fail

    for check in ROUTE_CHECKS:
        vals = [float(rr.get(check, 0.0)) for rr in route_results.values() if rr.get("_http_200")]
        subscores[f"route::{check}"] = round(sum(vals) / len(vals), 3) if vals else 0.0

    out = {"score": score, "passed": passed, "subscores": subscores, "routes": route_results}
    print(json.dumps(out))

    if args.verbose:
        print(f"\nSpeed score: {score}/100   passed={passed}", file=sys.stderr)
        print(f"  route portion: {route_fraction*70:.1f}/70   site portion: {site_fraction*30:.1f}/30", file=sys.stderr)
        if fail_reasons:
            print("  HARD-GATE FAILURES:", file=sys.stderr)
            for reason in fail_reasons:
                print(f"    - {reason}", file=sys.stderr)
        print(f"  shared JS: {shared_kb} KB gz ({len(shared_js_urls)} chunks)   "
              f"fonts: {font_kb} KB in {len(critical_fonts)} critical file(s) "
              f"(of {len(css_font_urls)} referenced)   "
              f"compression: {'yes' if compression_ok else 'NO'}   "
              f"static cache-control: {cache_ctl or '<none>'}", file=sys.stderr)
        print(f"  SEO gate: {seo_score}", file=sys.stderr)
        print(f"  {'route':<38}{'js KB':>7}{'css KB':>8}{'html KB':>9}{'scripts':>9}{'chars':>8}", file=sys.stderr)
        for path, rr in route_results.items():
            if not rr.get("_http_200"):
                print(f"  {path:<38}  !! HTTP failure", file=sys.stderr)
                continue
            print(f"  {path:<38}{rr['_js_kb']:>7}{rr['_css_kb']:>8}{rr['_html_kb']:>9}"
                  f"{rr['_scripts']:>9}{rr['_visible_chars']:>8}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
