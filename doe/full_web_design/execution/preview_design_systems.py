#!/usr/bin/env python3
"""Generate a single self-contained static HTML gallery previewing every brand
DESIGN.md in the local awesome-design-md library.

Each card is rendered in that brand's own canvas / ink / accent + palette, so the
gallery shows ~74 mini design systems at a glance — the "browse the catalog" companion
to directives/design_website.md step 1. For a full-page mockup of a single brand,
use execution/build_brand_preview.py instead.

Usage:
    python execution/preview_design_systems.py
    python execution/preview_design_systems.py --out ".tmp/gallery/index.html"

Parsing + color-role logic lives in execution/design_md_lib.py. Std-lib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import design_md_lib as dl

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / ".tmp" / "awesome_design_gallery" / "index.html"


def render_card(b: dict) -> str:
    r = b["roles"]
    canvas, ink, accent = r["canvas"], r["ink"], r["accent"]
    on_accent = dl.contrast_text(dl.hex_to_rgb(accent))
    font_stack = f"'{dl.esc(b['font'])}', ui-sans-serif, system-ui, sans-serif"
    badge = "dark" if r["dark"] else "light"

    swatches = "".join(
        f'<span class="sw" style="background:{dl.esc(c)}" title="{dl.esc(c)}"></span>'
        for c in b["palette"][:16]
    )
    more = f'<span class="more">+{b["n_colors"] - 16}</span>' if b["n_colors"] > 16 else ""

    return f"""
    <article class="card" data-brand="{dl.esc(b['brand'])}" data-search="{dl.esc((b['brand'] + ' ' + b['desc']).lower())}">
      <div class="meta">
        <div class="row">
          <h2 class="brand">{dl.esc(b['brand'])}</h2>
          <span class="badge badge-{badge}">{badge}</span>
        </div>
        <p class="desc">{dl.esc(dl.truncate(b['desc'], 175))}</p>
      </div>

      <div class="preview" style="background:{dl.esc(canvas)};color:{dl.esc(ink)};font-family:{font_stack}">
        <div class="p-eyebrow" style="color:{dl.esc(accent)}">{dl.esc(b['brand'])}</div>
        <div class="p-head">The quick brown fox</div>
        <div class="p-body" style="color:{dl.esc(ink)};opacity:.72">Aa — design tokens reverse-engineered from a real brand. Headline, body, and CTA in this system's own palette.</div>
        <div class="p-actions">
          <span class="p-btn" style="background:{dl.esc(accent)};color:{dl.esc(on_accent)}">Primary action</span>
          <span class="p-btn p-ghost" style="border-color:{dl.esc(ink)};color:{dl.esc(ink)}">Secondary</span>
        </div>
      </div>

      <div class="palette">{swatches}{more}</div>
      <div class="tokens">
        <code title="canvas">{dl.esc(canvas)}</code>
        <code title="ink">{dl.esc(ink)}</code>
        <code title="accent">{dl.esc(accent)}</code>
        <span class="font">{dl.esc(b['font'])}</span>
      </div>
    </article>"""


def render_page(cards: list[dict]) -> str:
    cards_html = "\n".join(render_card(c) for c in cards)
    n = len(cards)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Awesome Design — {n} Brand Systems</title>
<style>
  :root {{ --bg:#0b0b0d; --panel:#141417; --line:#26262b; --fg:#f4f4f5; --muted:#a1a1aa; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; background:var(--bg); color:var(--fg);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; -webkit-font-smoothing:antialiased; }}
  header {{ padding:48px 28px 24px; max-width:1400px; margin:0 auto; }}
  h1 {{ font-size:clamp(1.6rem,3vw,2.4rem); margin:0 0 8px; letter-spacing:-.02em; }}
  .sub {{ color:var(--muted); margin:0 0 20px; max-width:60ch; line-height:1.5; }}
  .controls {{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }}
  #q {{ flex:1; min-width:240px; max-width:420px; padding:11px 14px; border-radius:10px;
    border:1px solid var(--line); background:var(--panel); color:var(--fg); font-size:14px; }}
  #q::placeholder {{ color:#71717a; }}
  #count {{ color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums; }}
  main {{ max-width:1400px; margin:0 auto; padding:20px 28px 80px;
    display:grid; gap:18px; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); }}
  .card {{ background:var(--panel); border:1px solid var(--line); border-radius:16px; overflow:hidden; display:flex; flex-direction:column; }}
  .meta {{ padding:16px 16px 4px; }}
  .row {{ display:flex; align-items:center; justify-content:space-between; gap:8px; }}
  .brand {{ font-size:1.05rem; margin:0; letter-spacing:-.01em; }}
  .badge {{ font-size:10px; text-transform:uppercase; letter-spacing:.12em; padding:3px 7px; border-radius:999px; border:1px solid var(--line); color:var(--muted); }}
  .badge-dark {{ background:#000; color:#bbb; }}
  .badge-light {{ background:#fff; color:#333; border-color:#fff; }}
  .desc {{ color:var(--muted); font-size:12.5px; line-height:1.5; margin:8px 0 0; min-height:3.2em; }}
  .preview {{ margin:14px 16px 0; border-radius:12px; padding:20px 18px; min-height:150px;
    display:flex; flex-direction:column; gap:9px; justify-content:center; border:1px solid rgba(128,128,128,.18); }}
  .p-eyebrow {{ font-size:11px; text-transform:uppercase; letter-spacing:.16em; font-weight:600; }}
  .p-head {{ font-size:1.55rem; font-weight:700; line-height:1.1; letter-spacing:-.02em; }}
  .p-body {{ font-size:12.5px; line-height:1.5; }}
  .p-actions {{ display:flex; gap:8px; margin-top:6px; flex-wrap:wrap; }}
  .p-btn {{ font-size:12px; font-weight:600; padding:8px 14px; border-radius:999px; white-space:nowrap; }}
  .p-ghost {{ background:transparent !important; border:1px solid; }}
  .palette {{ display:flex; flex-wrap:wrap; gap:4px; padding:14px 16px 4px; align-items:center; }}
  .sw {{ width:18px; height:18px; border-radius:5px; border:1px solid rgba(255,255,255,.12); }}
  .more {{ font-size:11px; color:var(--muted); margin-left:2px; }}
  .tokens {{ display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:8px 16px 16px; }}
  .tokens code {{ font-size:10.5px; color:var(--muted); background:var(--bg); border:1px solid var(--line); padding:2px 6px; border-radius:6px; font-family:ui-monospace,Menlo,Consolas,monospace; }}
  .tokens .font {{ font-size:11px; color:#d4d4d8; margin-left:auto; max-width:55%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
  .empty {{ color:var(--muted); padding:40px 28px; max-width:1400px; margin:0 auto; }}
  footer {{ color:#52525b; font-size:12px; text-align:center; padding:0 28px 48px; }}
  footer a {{ color:#71717a; }}
</style>
</head>
<body>
  <header>
    <h1>Awesome Design — {n} Brand Systems</h1>
    <p class="sub">Live previews generated from the local <code>awesome-design-md</code> library. Each card is rendered in its own brand's canvas / ink / accent and palette. Pick the closest one, then read its full <code>DESIGN.md</code> (step 1 of <code>design_website.md</code>). The card title is the exact <code>--design-source</code> value. For a full-page mockup of one brand, run <code>build_brand_preview.py</code>.</p>
    <div class="controls">
      <input id="q" type="search" placeholder="Filter by brand or vibe — e.g. dark, fintech, editorial, green…" autocomplete="off">
      <span id="count">{n} / {n}</span>
    </div>
  </header>
  <main id="grid">
{cards_html}
  </main>
  <p class="empty" id="empty" hidden>No brands match that filter.</p>
  <footer>Generated by <code>execution/preview_design_systems.py</code> · source: <a href="https://github.com/VoltAgent/awesome-design-md">VoltAgent/awesome-design-md</a> (MIT). Fonts are best-effort labels; proprietary families fall back to system fonts, so colors/layout are faithful but type may differ.</footer>
<script>
  const q = document.getElementById('q');
  const cards = Array.from(document.querySelectorAll('.card'));
  const count = document.getElementById('count');
  const empty = document.getElementById('empty');
  const total = cards.length;
  q.addEventListener('input', () => {{
    const t = q.value.trim().toLowerCase();
    let shown = 0;
    for (const c of cards) {{
      const hit = !t || c.dataset.search.includes(t);
      c.hidden = !hit; if (hit) shown++;
    }}
    count.textContent = shown + ' / ' + total;
    empty.hidden = shown !== 0;
  }});
</script>
</body>
</html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=str(dl.DEFAULT_LIBRARY))
    ap.add_argument("--skill", default=str(dl.DEFAULT_SKILL))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    args = ap.parse_args()

    library = Path(args.library)
    if not library.is_dir():
        print(f"library not found: {library}", file=sys.stderr)
        return 2

    catalog = dl.parse_skill_catalog(Path(args.skill))
    brand_dirs = sorted([d for d in library.iterdir() if d.is_dir()], key=lambda p: p.name.lower())

    cards, skipped = [], []
    for d in brand_dirs:
        parsed = dl.parse_brand(d, catalog)
        (cards if parsed and parsed["palette"] else skipped).append(parsed if parsed else d.name)
    cards = [c for c in cards if isinstance(c, dict)]

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_page(cards), encoding="utf-8")

    print(f"wrote {out}")
    print(f"  brands rendered: {len(cards)}")
    if skipped:
        print(f"  skipped: {[s for s in skipped if isinstance(s, str)]}")
    print(f"  open: {out.resolve().as_uri()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
