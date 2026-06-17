#!/usr/bin/env python3
"""Build an accent-color comparison ("accent lab") preview: keep a chosen brand's
canvas + ink (e.g. Binance's near-black + white), and swap the accent across several
candidate colors, so the user can pick an accent that differentiates their site from
the source brand. Each option is shown in context (eyebrow, headline, buttons, stats,
link) with its hex code labeled.

Usage:
    python execution/build_accent_lab.py --design-source binance
    python execution/build_accent_lab.py --design-source binance --accents "Indigo:#6366F1,Emerald:#10B981"
    python execution/build_accent_lab.py --design-source stripe --headline "Move money, faster."

Output: .tmp/accent_lab/<brand>/index.html
Parsing + color logic lives in execution/design_md_lib.py. Std-lib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import design_md_lib as dl

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / ".tmp" / "accent_lab"

# Five distinct accents that read premium on a near-black canvas and clearly differ
# from Binance yellow. (name, hex, note).
DEFAULT_ACCENTS = [
    ("Indigo", "#6366F1", "Modern, trustworthy tech. Reads SaaS/fintech, not crypto-yellow."),
    ("Emerald", "#10B981", "Money + growth. Classic finance-green, fresh and confident."),
    ("Cyan", "#22D3EE", "Bright crypto-tech energy without the yellow association."),
    ("Coral", "#FB6B4C", "Warm, energetic, human. Strongest departure from a cold exchange look."),
    ("Fuchsia", "#D946EF", "Bold and distinctive — maximum brand separation from Binance."),
]

# Illustrative display font (the actual font is chosen separately in the font lab).
DISPLAY_FONT = "Space Grotesk"


def gfonts_link(family: str) -> str:
    enc = family.replace(" ", "+")
    return (
        '<link rel="preconnect" href="https://fonts.googleapis.com">'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={enc}:wght@400;500;700&display=swap">'
    )


def specimen(i: int, name: str, hexc: str, note: str, headline: str, eyebrow: str) -> str:
    on_accent = dl.contrast_text(dl.hex_to_rgb(hexc))
    return f"""
    <article class="spec">
      <div class="cap">
        <span class="idx">{i:02d}</span>
        <span class="aname">{dl.esc(name)}</span>
        <span class="hex" style="color:{dl.esc(hexc)}">{dl.esc(hexc.upper())}</span>
        <span class="swatch" style="background:{dl.esc(hexc)}"></span>
        <span class="note">{dl.esc(note)}</span>
      </div>
      <div class="demo">
        <div class="eyebrow" style="color:{dl.esc(hexc)}">{dl.esc(eyebrow)}</div>
        <h2 class="head">{dl.esc(headline)}</h2>
        <p class="sub">A confident financial-platform interface on a deep near-black canvas, where
          <span style="color:{dl.esc(hexc)};font-weight:600">{dl.esc(name)} {dl.esc(hexc.upper())}</span>
          carries every primary CTA, accent, and value-claim moment.</p>
        <div class="btns">
          <span class="btn" style="background:{dl.esc(hexc)};color:{dl.esc(on_accent)}">Get started</span>
          <span class="btn ghost">Learn more</span>
          <a class="link" style="color:{dl.esc(hexc)}">View markets →</a>
        </div>
        <div class="stats">
          <div class="stat"><div class="num" style="color:{dl.esc(hexc)}">$2.4B</div><div class="lbl">24h volume</div></div>
          <div class="stat"><div class="num" style="color:{dl.esc(hexc)}">0.1%</div><div class="lbl">maker fee</div></div>
          <div class="stat"><div class="num" style="color:{dl.esc(hexc)}">120+</div><div class="lbl">markets</div></div>
        </div>
      </div>
    </article>"""


def render(brand: dict, accents: list[tuple[str, str, str]], headline: str, eyebrow: str) -> str:
    r = brand["roles"]
    canvas, ink = r["canvas"], r["ink"]
    surface, border, muted = r["surface"], r["border"], r["muted"]
    src_accent = r["accent"]
    specs = "\n".join(specimen(i + 1, n, h, note, headline, eyebrow) for i, (n, h, note) in enumerate(accents))

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Accent lab — {dl.esc(brand['brand'])} canvas</title>
{gfonts_link(DISPLAY_FONT)}
<style>
  :root {{ --canvas:{canvas}; --ink:{ink}; --surface:{surface}; --border:{border}; --muted:{muted}; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--canvas); color:var(--ink);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; }}
  .display {{ font-family:'{DISPLAY_FONT}', ui-sans-serif, system-ui, sans-serif; }}
  .wrap {{ max-width:1040px; margin:0 auto; padding:0 28px; }}
  header {{ border-bottom:1px solid var(--border); padding:40px 0 26px; }}
  h1 {{ margin:0 0 8px; font-size:clamp(1.5rem,3vw,2.2rem); letter-spacing:-.02em; font-family:'{DISPLAY_FONT}',sans-serif; }}
  .lede {{ color:var(--muted); max-width:72ch; line-height:1.55; margin:0; }}
  .lede b {{ color:var(--ink); }}
  .src {{ display:inline-flex; align-items:center; gap:7px; margin-top:12px; color:var(--muted); font-size:13px; }}
  .src .chip {{ width:15px; height:15px; border-radius:4px; background:{src_accent}; border:1px solid var(--border); }}

  .spec {{ border-bottom:1px solid var(--border); padding:38px 0; }}
  .cap {{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:20px; }}
  .idx {{ color:var(--muted); font-family:ui-monospace,Menlo,Consolas,monospace; font-size:13px; font-weight:700; }}
  .aname {{ font-size:1.25rem; font-weight:700; font-family:'{DISPLAY_FONT}',sans-serif; }}
  .hex {{ font-family:ui-monospace,Menlo,Consolas,monospace; font-size:1rem; font-weight:700; }}
  .swatch {{ width:22px; height:22px; border-radius:6px; border:1px solid var(--border); }}
  .note {{ color:var(--muted); font-size:13px; max-width:52ch; }}

  .demo {{ background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:34px 32px; }}
  .eyebrow {{ font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.2em; }}
  .head {{ font-family:'{DISPLAY_FONT}',sans-serif; margin:12px 0 0; font-size:clamp(2rem,4.4vw,3.1rem);
    font-weight:700; line-height:1.07; letter-spacing:-.02em; }}
  .sub {{ color:var(--muted); font-size:1.05rem; line-height:1.5; margin:16px 0 0; max-width:64ch; }}
  .btns {{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-top:24px; }}
  .btn {{ font-weight:700; font-size:14px; padding:11px 20px; border-radius:10px; }}
  .btn.ghost {{ background:transparent; color:var(--ink); border:1px solid var(--border); }}
  .link {{ font-weight:600; font-size:14px; text-decoration:none; }}
  .stats {{ display:flex; gap:46px; flex-wrap:wrap; margin-top:30px; padding-top:24px; border-top:1px solid var(--border); }}
  .num {{ font-family:'{DISPLAY_FONT}',sans-serif; font-size:1.9rem; font-weight:700; }}
  .lbl {{ color:var(--muted); font-size:13px; margin-top:2px; }}
  footer {{ color:var(--muted); font-size:12px; padding:28px 0 60px; line-height:1.6; }}
</style>
</head>
<body>
  <header><div class="wrap">
    <h1>Accent lab — {dl.esc(brand['brand'])} canvas</h1>
    <p class="lede">Same <b>{dl.esc(brand['brand'])}</b> canvas ({dl.esc(canvas)}) and ink ({dl.esc(ink)}) — {len(accents)} candidate accent colors to replace the source brand's signature. Each shows the accent on the eyebrow, headline accent word, primary CTA, link, and stat figures. Hex codes are labeled above each.</p>
    <div class="src"><span class="chip"></span> source accent being replaced: {dl.esc(src_accent.upper())}. Headlines shown in {DISPLAY_FONT} (font chosen separately).</div>
  </div></header>

  <main class="wrap">
{specs}
  </main>

  <footer><div class="wrap">Generated by <code>execution/build_accent_lab.py</code> over <code>awesome-design-md/{dl.esc(brand['brand'])}/DESIGN.md</code>. Accent text/contrast is auto-checked per option.</div></footer>
</body>
</html>"""


def parse_accents(raw: str) -> list[tuple[str, str, str]]:
    out = []
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        if ":" in item:
            name, hexc = item.split(":", 1)
            out.append((name.strip(), hexc.strip(), ""))
        else:
            out.append((item.strip(), item.strip(), ""))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--design-source", required=True)
    ap.add_argument("--accents", default="", help='comma list "Name:#hex,Name:#hex"; default = curated 5')
    ap.add_argument("--headline", default="Trade with total confidence.")
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

    accents = parse_accents(args.accents) if args.accents.strip() else DEFAULT_ACCENTS

    out = Path(args.out) / brand_name / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(brand, accents, args.headline, args.eyebrow), encoding="utf-8")

    print(f"wrote {out}")
    print(f"  design source: {brand_name}  ({len(accents)} accents)")
    for n, h, _ in accents:
        print(f"    {n:10} {h.upper()}")
    print(f"  open: {out.resolve().as_uri()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
