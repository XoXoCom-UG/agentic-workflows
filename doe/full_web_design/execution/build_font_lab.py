#!/usr/bin/env python3
"""Build a font-comparison ("font lab") preview: render a chosen brand's design
tokens (canvas / ink / accent) with several candidate display fonts side by side, so
the user can pick a typeface that differentiates their site from the source brand
while keeping its color/feel.

Each candidate gets a contextual specimen — eyebrow, big headline, subhead, body
paragraph, and buttons — all in that font, on the brand's canvas, so you see exactly
where the font is used. Fonts load from Google Fonts (open-source, production-safe
via next/font), so the preview needs internet to display them.

Usage:
    python execution/build_font_lab.py --design-source binance
    python execution/build_font_lab.py --design-source binance --fonts "Sora,Manrope,Inter"
    python execution/build_font_lab.py --design-source stripe --headline "Move money, faster."

Output: .tmp/font_lab/<brand>/index.html  (self-contained except the Google Fonts <link>)
Parsing + color logic lives in execution/design_md_lib.py. Std-lib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import design_md_lib as dl

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / ".tmp" / "font_lab"

# Curated default candidates: confident sans faces that keep a Binance-like
# fintech/tech feel while reading clearly different from BinanceNova. (name, blurb).
DEFAULT_FONTS = [
    ("Space Grotesk", "Geometric with quirky cut details — reads crypto-native and technical."),
    ("Sora", "Drawn for a Web3 brand; confident, even, modern. The closest in spirit, still distinct."),
    ("Manrope", "Premium semi-geometric; works equally well for big display and small UI."),
    ("Plus Jakarta Sans", "Geometric with a touch of warmth — friendly-premium, less cold than Binance."),
    ("Outfit", "Even, neutral geometric; clean and unfussy at display sizes."),
    ("Lexend", "Engineered for readability; approachable-tech, very legible body."),
    ("Geist", "Vercel's sans — crisp, modern, dev-tool clarity. Quietly confident."),
    ("IBM Plex Sans", "Engineered and institutional; strong trust/fintech credibility."),
    ("Bricolage Grotesque", "Distinctive contemporary grotesque — the most differentiated from Binance."),
    ("Hanken Grotesk", "Neutral grotesque; premium and understated, lets the yellow do the talking."),
]


def gfonts_link(families: list[str]) -> str:
    parts = []
    for fam in families:
        enc = fam.replace(" ", "+")
        parts.append(f"family={enc}:wght@400;500;700")
    href = "https://fonts.googleapis.com/css2?" + "&".join(parts) + "&display=swap"
    return (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        f'<link rel="stylesheet" href="{dl.esc(href)}">'
    )


def specimen(i: int, font: str, blurb: str, headline: str, eyebrow: str) -> str:
    stack = f"'{dl.esc(font)}', ui-sans-serif, system-ui, sans-serif"
    return f"""
    <article class="spec" id="{dl.esc(font.replace(' ', '-').lower())}">
      <div class="cap">
        <span class="idx">{i:02d}</span>
        <span class="fname" style="font-family:{stack}">{dl.esc(font)}</span>
        <span class="blurb">{dl.esc(blurb)}</span>
      </div>
      <div class="demo" style="font-family:{stack}">
        <div class="eyebrow">{dl.esc(eyebrow)}</div>
        <h2 class="head">{dl.esc(headline)}</h2>
        <p class="sub">Set your value proposition here. This subhead and the body below are also in {dl.esc(font)} so you can judge it at small sizes, where most of the page actually lives.</p>
        <p class="body">The quick brown fox jumps over the lazy dog — 0123456789 — Trade, stake, and settle in seconds. AaBbCcDdEe.</p>
        <div class="btns">
          <span class="btn primary">Get started</span>
          <span class="btn ghost">Learn more</span>
          <span class="nav">Product · Markets · Pricing · Docs</span>
        </div>
      </div>
    </article>"""


def render(brand: dict, fonts: list[tuple[str, str]], headline: str, eyebrow: str) -> str:
    r = brand["roles"]
    canvas, ink, accent = r["canvas"], r["ink"], r["accent"]
    surface, border, muted = r["surface"], r["border"], r["muted"]
    on_accent = dl.contrast_text(dl.hex_to_rgb(accent))
    families = [f for f, _ in fonts]
    specs = "\n".join(specimen(i + 1, f, b, headline, eyebrow) for i, (f, b) in enumerate(fonts))

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Font lab — {dl.esc(brand['brand'])} colors</title>
{gfonts_link(families)}
<style>
  :root {{
    --canvas:{canvas}; --ink:{ink}; --accent:{accent}; --on-accent:{on_accent};
    --surface:{surface}; --border:{border}; --muted:{muted};
  }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--canvas); color:var(--ink);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; }}
  .wrap {{ max-width:1040px; margin:0 auto; padding:0 28px; }}
  header {{ border-bottom:1px solid var(--border); padding:40px 0 26px; }}
  h1 {{ margin:0 0 8px; font-size:clamp(1.5rem,3vw,2.2rem); letter-spacing:-.02em; }}
  .lede {{ color:var(--muted); max-width:70ch; line-height:1.55; margin:0; }}
  .lede b {{ color:var(--ink); }}

  .spec {{ border-bottom:1px solid var(--border); padding:40px 0; }}
  .cap {{ display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:22px; }}
  .idx {{ color:var(--accent); font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; font-weight:700; }}
  .fname {{ font-size:1.35rem; font-weight:700; letter-spacing:-.01em; }}
  .blurb {{ color:var(--muted); font-size:13.5px; max-width:60ch; }}

  .demo {{ background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:38px 34px; }}
  .eyebrow {{ color:var(--accent); font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.2em; }}
  .head {{ margin:14px 0 0; font-size:clamp(2.2rem,5vw,3.6rem); font-weight:700; line-height:1.06; letter-spacing:-.02em; }}
  .sub {{ color:var(--muted); font-size:1.05rem; line-height:1.5; margin:18px 0 0; max-width:62ch; }}
  .body {{ color:var(--ink); opacity:.86; font-size:.95rem; line-height:1.6; margin:14px 0 0; max-width:70ch; }}
  .btns {{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:26px; }}
  .btn {{ font-weight:700; font-size:14px; padding:11px 20px; border-radius:10px; }}
  .btn.primary {{ background:var(--accent); color:var(--on-accent); }}
  .btn.ghost {{ background:transparent; color:var(--ink); border:1px solid var(--border); }}
  .nav {{ color:var(--muted); font-size:14px; font-weight:500; margin-left:6px; }}
  footer {{ color:var(--muted); font-size:12px; padding:30px 0 60px; line-height:1.6; }}
</style>
</head>
<body>
  <header><div class="wrap">
    <h1>Font lab — <span style="color:var(--accent)">{dl.esc(brand['brand'])}</span> color system</h1>
    <p class="lede">Same <b>{dl.esc(brand['brand'])}</b> tokens (canvas {dl.esc(canvas)}, ink {dl.esc(ink)}, accent {dl.esc(accent)}) — {len(fonts)} candidate display fonts. Each specimen shows where the font is used: eyebrow, headline, subhead, body, and buttons. Pick one to replace the source brand's proprietary typeface. The chosen font becomes the site's <b>--display</b> family in <code>design_website.md</code>.</p>
  </div></header>

  <main class="wrap">
{specs}
  </main>

  <footer><div class="wrap">Fonts served from Google Fonts (open-source; production-safe via next/font). Generated by <code>execution/build_font_lab.py</code> over <code>awesome-design-md/{dl.esc(brand['brand'])}/DESIGN.md</code>.</div></footer>
</body>
</html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--design-source", required=True, help="brand whose colors to use (e.g. binance)")
    ap.add_argument("--fonts", default="", help="comma-separated Google Font names; default = curated 10")
    ap.add_argument("--headline", default="Build with total confidence.")
    ap.add_argument("--eyebrow", default="Your company")
    ap.add_argument("--library", default=str(dl.DEFAULT_LIBRARY))
    ap.add_argument("--skill", default=str(dl.DEFAULT_SKILL))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    args = ap.parse_args()

    library = Path(args.library)
    if not library.is_dir():
        print(f"library not found: {library}", file=sys.stderr)
        return 2

    brand_name = dl.resolve_brand(args.design_source, library)
    if not brand_name:
        print(f"unknown brand: {args.design_source}", file=sys.stderr)
        return 2

    catalog = dl.parse_skill_catalog(Path(args.skill))
    brand = dl.parse_brand(library / brand_name, catalog)
    if not brand or not brand["palette"]:
        print(f"could not parse {brand_name}", file=sys.stderr)
        return 2

    if args.fonts.strip():
        fonts = [(f.strip(), "") for f in args.fonts.split(",") if f.strip()]
    else:
        fonts = DEFAULT_FONTS

    out = Path(args.out) / brand_name / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(brand, fonts, args.headline, args.eyebrow), encoding="utf-8")

    print(f"wrote {out}")
    print(f"  design source: {brand_name}  ({len(fonts)} fonts)")
    print(f"  open: {out.resolve().as_uri()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
