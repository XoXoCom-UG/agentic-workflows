#!/usr/bin/env python3
"""Build a standalone, full-page static HTML preview of one or more brand design
systems from the local awesome-design-md library.

Unlike preview_design_systems.py (a catalog of small cards), this renders a complete
one-page marketing mockup — header, hero, trust strip, feature grid, stats band, CTA,
footer — styled entirely with the brand's derived tokens (canvas / ink / accent /
surface / border / muted + display font). One preview per brand, generated on demand.

Usage:
    python execution/build_brand_preview.py --brands stripe
    python execution/build_brand_preview.py --brands stripe,linear,vercel
    python execution/build_brand_preview.py --all
    python execution/build_brand_preview.py --brands stripe --out ".tmp/brand_previews"

Output:
    <out>/<brand>/index.html      one self-contained page per brand
    <out>/index.html              contact-sheet linking them (only when >1 brand)

Brand names are resolved leniently: "linear" -> "linear.app", "mistral" -> "mistral.ai".
Parsing + color logic lives in execution/design_md_lib.py. Std-lib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import design_md_lib as dl

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / ".tmp" / "brand_previews"

FEATURES = [
    ("Built on real tokens", "Every color, type ramp, and radius on this page is reverse-engineered from the brand's live site — not invented."),
    ("Faithful by construction", "Canvas, ink, and accent are derived directly from the DESIGN.md so the feel matches the source brand."),
    ("Ready to extend", "Use this as the visual target, then build the real multi-page site with the design_website directive."),
]
STATS = [("74", "brand systems"), ("100%", "token-driven"), ("1", "file, zero assets")]
NAV = ("Product", "Solutions", "Pricing", "Docs")


def page(b: dict) -> str:
    r = b["roles"]
    canvas, ink, accent = r["canvas"], r["ink"], r["accent"]
    surface, border, muted = r["surface"], r["border"], r["muted"]
    on_accent = dl.contrast_text(dl.hex_to_rgb(accent))
    brand = b["brand"]
    font = b["font"]
    font_stack = f"'{dl.esc(font)}', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    tagline = dl.truncate(b["desc"], 240)

    feats = "".join(
        f"""<article class="feature">
              <div class="dot"></div>
              <h3>{dl.esc(t)}</h3>
              <p>{dl.esc(d)}</p>
            </article>""" for t, d in FEATURES
    )
    stats = "".join(
        f'<div class="stat"><div class="num">{dl.esc(n)}</div><div class="lbl">{dl.esc(l)}</div></div>'
        for n, l in STATS
    )
    navlinks = "".join(f'<a href="#">{dl.esc(x)}</a>' for x in NAV)
    swatches = "".join(
        f'<span class="sw" style="background:{dl.esc(c)}" title="{dl.esc(c)}"></span>'
        for c in b["palette"][:18]
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{dl.esc(brand)} — design preview</title>
<style>
  :root {{
    --canvas:{canvas}; --ink:{ink}; --accent:{accent}; --on-accent:{on_accent};
    --surface:{surface}; --border:{border}; --muted:{muted};
    --display:{font_stack};
  }}
  * {{ box-sizing:border-box; }}
  html {{ scroll-behavior:smooth; }}
  body {{ margin:0; background:var(--canvas); color:var(--ink);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; line-height:1.55; }}
  h1,h2,h3 {{ font-family:var(--display); letter-spacing:-.02em; line-height:1.08; margin:0; }}
  a {{ color:inherit; text-decoration:none; }}
  .wrap {{ max-width:1160px; margin:0 auto; padding:0 28px; }}

  header {{ position:sticky; top:0; z-index:10; background:color-mix(in srgb, var(--canvas) 82%, transparent);
    backdrop-filter:blur(10px); border-bottom:1px solid var(--border); }}
  .nav {{ display:flex; align-items:center; justify-content:space-between; height:64px; }}
  .logo {{ font-family:var(--display); font-weight:700; font-size:1.15rem; }}
  .nav .links {{ display:flex; gap:26px; }}
  .nav .links a {{ color:var(--muted); font-size:14px; font-weight:500; }}
  .nav .links a:hover {{ color:var(--ink); }}
  .btn {{ display:inline-flex; align-items:center; justify-content:center; font-weight:600; font-size:14px;
    padding:10px 18px; border-radius:10px; border:1px solid transparent; cursor:pointer; white-space:nowrap; }}
  .btn-primary {{ background:var(--accent); color:var(--on-accent); }}
  .btn-primary:hover {{ filter:brightness(1.06); }}
  .btn-ghost {{ background:transparent; color:var(--ink); border-color:var(--border); }}
  .btn-ghost:hover {{ background:var(--surface); }}

  .hero {{ position:relative; text-align:center; padding:96px 0 80px; overflow:hidden; }}
  .hero::before {{ content:""; position:absolute; inset:-30% 0 auto 0; height:420px; pointer-events:none;
    background:radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%); }}
  .eyebrow {{ position:relative; color:var(--accent); font-weight:600; font-size:13px;
    text-transform:uppercase; letter-spacing:.18em; margin-bottom:18px; }}
  .hero h1 {{ position:relative; font-size:clamp(2.6rem,6vw,4.6rem); font-weight:700; }}
  .hero p {{ position:relative; color:var(--muted); font-size:clamp(1.05rem,1.6vw,1.3rem);
    max-width:680px; margin:22px auto 0; line-height:1.55; }}
  .cta-row {{ position:relative; display:flex; gap:14px; justify-content:center; margin-top:36px; }}

  .trust {{ display:flex; gap:34px; justify-content:center; flex-wrap:wrap; align-items:center;
    padding:8px 0 60px; color:var(--muted); font-weight:600; opacity:.7; }}
  .trust span {{ font-family:var(--display); font-size:1.15rem; letter-spacing:.02em; }}

  section {{ padding:72px 0; }}
  .section-head {{ max-width:620px; margin:0 0 40px; }}
  .section-head h2 {{ font-size:clamp(1.8rem,3.4vw,2.6rem); font-weight:700; }}
  .section-head p {{ color:var(--muted); font-size:1.05rem; margin:14px 0 0; }}
  .grid {{ display:grid; gap:20px; grid-template-columns:repeat(3,1fr); }}
  .feature {{ background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:26px; }}
  .feature .dot {{ width:34px; height:34px; border-radius:9px; background:var(--accent); margin-bottom:16px; }}
  .feature h3 {{ font-size:1.2rem; font-weight:650; }}
  .feature p {{ color:var(--muted); font-size:.95rem; margin:10px 0 0; }}

  .band {{ background:var(--accent); color:var(--on-accent); border-radius:24px; padding:54px 40px; }}
  .stats {{ display:flex; gap:48px; flex-wrap:wrap; justify-content:space-around; }}
  .stat {{ text-align:center; }}
  .stat .num {{ font-family:var(--display); font-size:clamp(2.4rem,5vw,3.4rem); font-weight:700; }}
  .stat .lbl {{ opacity:.85; font-size:.95rem; margin-top:6px; }}

  .cta {{ text-align:center; }}
  .cta h2 {{ font-size:clamp(2rem,4vw,3rem); font-weight:700; }}
  .cta p {{ color:var(--muted); margin:16px auto 30px; max-width:540px; }}

  footer {{ border-top:1px solid var(--border); background:var(--surface); padding:40px 0 56px; }}
  .foot {{ display:flex; flex-wrap:wrap; gap:24px; justify-content:space-between; align-items:flex-start; }}
  .foot .legend {{ display:flex; flex-direction:column; gap:8px; }}
  .swrow {{ display:flex; flex-wrap:wrap; gap:5px; }}
  .sw {{ width:20px; height:20px; border-radius:5px; border:1px solid var(--border); }}
  .tok {{ display:flex; flex-wrap:wrap; gap:6px; }}
  .tok code {{ font-size:11px; color:var(--muted); border:1px solid var(--border); border-radius:6px;
    padding:2px 7px; font-family:ui-monospace,Menlo,Consolas,monospace; }}
  .note {{ color:var(--muted); font-size:12px; max-width:42ch; line-height:1.5; }}
  .sig {{ color:var(--muted); opacity:.7; font-family:ui-monospace,Menlo,Consolas,monospace; font-size:11px; margin-top:14px; }}
</style>
</head>
<body>
  <header><div class="wrap nav">
    <div class="logo">{dl.esc(brand)}</div>
    <nav class="links">{navlinks}</nav>
    <a class="btn btn-primary" href="#">Get started</a>
  </div></header>

  <main>
    <section class="hero"><div class="wrap">
      <div class="eyebrow">{dl.esc(brand)} design system</div>
      <h1>Build it like {dl.esc(brand)}.</h1>
      <p>{dl.esc(tagline)}</p>
      <div class="cta-row">
        <a class="btn btn-primary" href="#">Primary action</a>
        <a class="btn btn-ghost" href="#">Secondary</a>
      </div>
    </div></section>

    <div class="wrap"><div class="trust">
      <span>Acme</span><span>Globex</span><span>Initech</span><span>Umbrella</span><span>Soylent</span>
    </div></div>

    <section><div class="wrap">
      <div class="section-head">
        <h2>Everything in this brand's voice</h2>
        <p>Three feature cards rendered on the brand's surface, border, and ink tokens.</p>
      </div>
      <div class="grid">{feats}</div>
    </div></section>

    <section><div class="wrap"><div class="band"><div class="stats">{stats}</div></div></div></section>

    <section class="cta"><div class="wrap">
      <h2>Ready to design like {dl.esc(brand)}?</h2>
      <p>Use this preview as the visual target, then scaffold the real multi-page site with the design_website directive.</p>
      <a class="btn btn-primary" href="#">Start building</a>
    </div></section>
  </main>

  <footer><div class="wrap foot">
    <div class="legend">
      <div class="swrow">{swatches}</div>
      <div class="tok">
        <code title="canvas">canvas {dl.esc(canvas)}</code>
        <code title="ink">ink {dl.esc(ink)}</code>
        <code title="accent">accent {dl.esc(accent)}</code>
        <code title="surface">surface {dl.esc(surface)}</code>
        <code title="border">border {dl.esc(border)}</code>
      </div>
      <div class="sig">design_source: {dl.esc(brand)} · display font: {dl.esc(font)}</div>
    </div>
    <p class="note">Preview generated from <code>awesome-design-md/{dl.esc(brand)}/DESIGN.md</code>. Colors and layout are faithful; proprietary fonts fall back to system fonts, so type may differ from the real brand.</p>
  </div></footer>
</body>
</html>"""


def contact_sheet(items: list[tuple[str, dict]]) -> str:
    """index.html linking each generated brand preview (only when >1)."""
    cells = ""
    for brand, b in items:
        r = b["roles"]
        cells += f"""
        <a class="cell" href="./{dl.esc(brand)}/index.html">
          <div class="chip" style="background:{r['canvas']};border-color:{r['border']}">
            <span class="t" style="color:{r['ink']}">{dl.esc(brand)}</span>
            <span class="a" style="background:{r['accent']}"></span>
          </div>
        </a>"""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Brand previews</title>
<style>
  body {{ margin:0; background:#0b0b0d; color:#f4f4f5; font-family:ui-sans-serif,system-ui,sans-serif; }}
  .wrap {{ max-width:1100px; margin:0 auto; padding:48px 28px; }}
  h1 {{ letter-spacing:-.02em; }} p {{ color:#a1a1aa; }}
  .grid {{ display:grid; gap:16px; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); margin-top:24px; }}
  .cell {{ text-decoration:none; }}
  .chip {{ display:flex; align-items:center; justify-content:space-between; gap:10px;
    border:1px solid; border-radius:14px; padding:22px 18px; min-height:96px; }}
  .chip .t {{ font-weight:700; font-size:1.05rem; }}
  .chip .a {{ width:26px; height:26px; border-radius:7px; }}
</style></head><body><div class="wrap">
  <h1>Brand previews</h1>
  <p>{len(items)} standalone full-page previews. Click any to open. Generated by <code>execution/build_brand_preview.py</code>.</p>
  <div class="grid">{cells}</div>
</div></body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--brands", default="", help="comma-separated brand names (e.g. stripe,linear,vercel)")
    ap.add_argument("--all", action="store_true", help="build a preview for every brand")
    ap.add_argument("--library", default=str(dl.DEFAULT_LIBRARY))
    ap.add_argument("--skill", default=str(dl.DEFAULT_SKILL))
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output base directory")
    args = ap.parse_args()

    library = Path(args.library)
    if not library.is_dir():
        print(f"library not found: {library}", file=sys.stderr)
        return 2

    catalog = dl.parse_skill_catalog(Path(args.skill))

    if args.all:
        names = sorted(d.name for d in library.iterdir() if d.is_dir())
    else:
        requested = [x.strip() for x in args.brands.split(",") if x.strip()]
        if not requested:
            print("nothing to do: pass --brands <name[,name...]> or --all", file=sys.stderr)
            return 2
        names, unresolved = [], []
        for req in requested:
            resolved = dl.resolve_brand(req, library)
            (names.append(resolved) if resolved else unresolved.append(req))
        if unresolved:
            available = ", ".join(sorted(d.name for d in library.iterdir() if d.is_dir()))
            print(f"unknown brand(s): {unresolved}", file=sys.stderr)
            print(f"available: {available}", file=sys.stderr)
            return 2

    out_base = Path(args.out)
    built: list[tuple[str, dict]] = []
    for brand in names:
        parsed = dl.parse_brand(library / brand, catalog)
        if not parsed or not parsed["palette"]:
            print(f"  skipped {brand} (no DESIGN.md / no colors)", file=sys.stderr)
            continue
        dest = out_base / brand / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page(parsed), encoding="utf-8")
        built.append((brand, parsed))
        print(f"wrote {dest}")
        print(f"  open: {dest.resolve().as_uri()}")

    if not built:
        print("no previews built", file=sys.stderr)
        return 1

    if len(built) > 1:
        idx = out_base / "index.html"
        idx.write_text(contact_sheet(built), encoding="utf-8")
        print(f"\nindex: {idx}")
        print(f"  open: {idx.resolve().as_uri()}")

    print(f"\nbuilt {len(built)} preview(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
