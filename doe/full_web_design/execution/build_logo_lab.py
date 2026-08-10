#!/usr/bin/env python3
"""Generate provisional XoXoCom tab/favicon marks (SVG) and a logo lab review page,
so a mark can be judged *before* it is wired into the site as the favicon.

Two candidates, both drawn from the same X primitive so they read as one family:

  twin       The current wordmark reduced to its two accent-bearing X glyphs, set
             side by side. The conservative option — literally the existing logo,
             minimized.
  interlock  The two X's overlapped. The overlap is a true interlace: the pair
             crosses at exactly TWO points, and each X passes over the other at
             one of them. The figure is therefore symmetric under a 180 degree
             rotation about the overlap centre, which is what makes "neither one
             overshadows the other" a measurable property rather than a matter of
             taste. See `interlace_report()`.

Every mark is painted in `currentColor`, so one monogram file serves every tint:
set `color: #fb6b4c` for coral, `color: #eaecef` for ink. The icon files carry
explicit fills instead, because a favicon renders with no CSS context to inherit.

Usage:
    python execution/build_logo_lab.py
    python execution/build_logo_lab.py --stroke 0.24 --overlap 0.30
    python execution/build_logo_lab.py --assets-dir assets/logo

A third treatment, `fused`, keeps the same overlap but paints it instead of weaving
it: both X's translucent, so the shared region reads brighter. Nothing is cut and
nothing stacks, so the even-overlap brief holds trivially and there is no hairline
gap to lose at favicon size.

A fourth, `wordmark`, is the full "XoXoCom" logo as the site header sets it today —
both X's in coral, the rest in ink. Unlike the other three it is type, not geometry,
so its glyphs are outlined from Manrope with fontTools (optional dependency; see
`build_wordmark`). Outlining rather than emitting <text> means the asset carries no
font dependency and works as a favicon or an <img>. It is very wide, so it is a
header/signature/share-image mark rather than a realistic tab icon — the lab page
says so and shows why.

Outputs:
    assets/logo/xoxocom-mark-twin.svg          monogram, tintable (currentColor)
    assets/logo/xoxocom-mark-interlock.svg     monogram, tintable
    assets/logo/xoxocom-mark-fused.svg         monogram, tintable
    assets/logo/xoxocom-mark-wordmark.svg      monogram, X's accented + rest tintable
    assets/logo/xoxocom-icon-twin.svg          app/tab icon, explicit fills
    assets/logo/xoxocom-icon-interlock.svg     app/tab icon, explicit fills
    assets/logo/xoxocom-icon-fused.svg         app/tab icon, explicit fills
    assets/logo/xoxocom-icon-wordmark.svg      app/tab icon, explicit fills
    assets/logo/xoxocom-interlace-proof.svg    annotated crossing diagram
    .tmp/logo_lab/index.html                   standalone review page (open locally)
    .tmp/logo_lab/artifact.html                same page, body-only (for publishing)

Nothing here is wired into `sites/xoxocom/` — picking a winner is a separate,
deliberate step (drop the chosen icon in as `app/icon.svg`).

Deterministic and std-lib only: same flags in, byte-identical files out.
"""

from __future__ import annotations

import argparse
import base64
import html
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS = REPO_ROOT / "assets" / "logo"
DEFAULT_OUT = REPO_ROOT / ".tmp" / "logo_lab"

# The Manrope latin subset next/font already downloaded for the site. It is a
# variable face covering 400-800 in one file, so inlining it as a data URI gives
# the lab page the real brand typeface under the Artifact CSP (which blocks font
# CDNs). Optional: if it is missing (e.g. a cleaned .next), the page falls back to
# a system stack and says so rather than silently rendering in Arial.
DEFAULT_FONT = REPO_ROOT / "sites" / "xoxocom" / ".next" / "static" / "media" / "4c9affa5bc8f420e-s.p.woff2"

# --- brand tokens (mirrors sites/xoxocom/app/globals.css) -----------------
BG = "#0b0e11"
FG = "#eaecef"
MUTED = "#8c8f92"
SURFACE = "#1e2329"
BORDER = "#2b3139"
ACCENT = "#fb6b4c"

S = 100.0  # every mark is built on a 100-unit cap square per X


# =========================================================================
# tiny helpers
# =========================================================================

def _n(v: float) -> str:
    """Compact number formatting so the SVGs stay readable/diffable.

    2dp is plenty for coordinates, which live in a 100-unit (or 2000-upem) space.
    It is NOT enough for a transform's scale factor — see `_p`.
    """
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def _p(v: float) -> str:
    """Precise formatting for transform factors.

    A scale factor is a multiplier, so absolute rounding error is amplified by
    whatever it multiplies. Fitting the wordmark (~9394 font units wide) into an
    icon needs a scale of ~0.00809, which `_n`'s 2dp would round to 0.01 — a 24%
    inflation that pushes the mark straight out of the icon's viewBox.
    """
    s = f"{v:.6f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


Pt = tuple[float, float]
Seg = tuple[Pt, Pt]


def _rel_lum(hex_color: str) -> float:
    """WCAG relative luminance, so the contrast figures on the lab page are
    measured rather than asserted."""
    h = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = out
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _rel(p: Path) -> str:
    """Repo-relative path for logging, falling back to the full path when the
    target sits outside the repo (a relative or absolute --out-dir/--assets-dir
    anywhere else is legitimate, and must not crash the run)."""
    try:
        return str(p.relative_to(REPO_ROOT))
    except ValueError:
        return str(p)


def contrast(a: str, b: str) -> float:
    """WCAG contrast ratio between two hex colors (>= 1.0)."""
    la, lb = _rel_lum(a), _rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# =========================================================================
# geometry
# =========================================================================

def x_glyph(ox: float, oy: float, inset: float) -> tuple[Seg, Seg]:
    """The two diagonal strokes of one X in the cap square at (ox, oy).

    Endpoints are pulled in by `inset` so that a round/square line cap lands ON
    the cap square instead of spilling past it — that is what keeps the stated
    viewBox honest and the mark optically centred.

    Returns (down, up): down runs top-left -> bottom-right, up runs top-right ->
    bottom-left.
    """
    down = ((ox + inset, oy + inset), (ox + S - inset, oy + S - inset))
    up = ((ox + S - inset, oy + inset), (ox + inset, oy + S - inset))
    return down, up


def cap_inset(w: float, linecap: str) -> float:
    """How far a cap on a 45-degree stroke overshoots its endpoint, per axis."""
    return (w / 2.0) / math.sqrt(2.0) if linecap in ("round", "square") else 0.0


MIN_STUB = 6.0  # units; below this a cut piece reads as a nick, not a woven end


def cut(seg: Seg, c: Pt, half: float) -> tuple[Seg, Seg]:
    """Split `seg` into two pieces, leaving a 2*half gap centred on point c.

    Raises if the gap would overrun either end of the segment. That is a real
    failure mode: on an X the crossings sit close to the arm tips, so a wide
    stroke plus a generous clearance can push the resume point clean past the
    endpoint and emit a reversed, tiny stub instead of a woven strand. Better a
    loud error naming the fix than a silently malformed mark.
    """
    (x0, y0), (x1, y1) = seg
    length = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / length, (y1 - y0) / length
    at = (c[0] - x0) * ux + (c[1] - y0) * uy   # distance along the strand to c
    head, tail = at - half, length - (at + half)
    if min(head, tail) < MIN_STUB:
        raise ValueError(
            f"interlace gap does not fit: the crossing leaves a {min(head, tail):.1f}-unit "
            f"piece (need >= {MIN_STUB:.0f}). Raise --overlap, or lower --stroke / "
            f"--clearance."
        )
    return (
        ((x0, y0), (c[0] - ux * half, c[1] - uy * half)),
        ((c[0] + ux * half, c[1] + uy * half), (x1, y1)),
    )


def interlace_report(overlap: float, w: float, clearance: float) -> dict[str, object]:
    """Everything the interlace needs, computed once.

    Two X's whose cap squares overlap by `overlap` units cross at exactly two
    points, both on the vertical centre line of the overlap:

        A.up   (y = S - x)  x B.down (y = x - dx)       -> A passes over here
        A.down (y = x)      x B.up   (y = dx + S - x)   -> B passes over here

    A.down x B.down and A.up x B.up are parallel, so they never meet. Assigning
    one crossing to each X is therefore the only balanced assignment available,
    and it makes the figure invariant under a 180 degree rotation about the
    overlap centre (that rotation maps A onto B).

    Keys are named by *which X is over*, not by y value: SVG y grows downward, so
    the smaller-y crossing is the visually upper one and "low/high" invites
    exactly the mix-up this naming avoids.
    """
    if not 0.0 < overlap < S:
        raise ValueError(
            f"overlap must be between 0 and {_n(S)} units (0 < --overlap < 1.0); got "
            f"{_n(overlap)}. At or above one cap square the two X's coincide or invert."
        )
    dx = S - overlap                      # x offset of the second cap square
    xc = (dx + S) / 2.0                   # both crossings share this x
    over_a = (xc, S - xc)                 # A.up   x B.down -> B is cut, A reads over
    over_b = (xc, xc)                     # A.down x B.up   -> A is cut, B reads over
    return {
        "dx": dx,
        "width": S + dx,
        "over_a": over_a,
        "over_b": over_b,
        "centre": (xc, S / 2.0),
        # Perpendicular crossing: the over-strand covers exactly `w` of length
        # along the under-strand, so the gap is w plus clearance on both sides.
        "half_gap": w / 2.0 + clearance * w,
    }


# =========================================================================
# mark builders -> list of stroke segments
# =========================================================================

def build_twin(w: float, linecap: str, gap: float) -> tuple[list[Seg], float]:
    """Two separate X's side by side. Returns (segments, mark_width)."""
    ins = cap_inset(w, linecap)
    a_down, a_up = x_glyph(0.0, 0.0, ins)
    b_down, b_up = x_glyph(S + gap, 0.0, ins)
    return [a_down, a_up, b_down, b_up], 2 * S + gap


def build_interlock(w: float, linecap: str, overlap: float, clearance: float) -> tuple[list[Seg], float]:
    """Two X's overlapped and woven. Returns (segments, mark_width).

    Each X keeps one whole strand (the one that passes over) and one cut strand
    (the one that passes under) — one crossing each, so neither dominates.
    """
    r = interlace_report(overlap, w, clearance)
    ins = cap_inset(w, linecap)
    half = float(r["half_gap"])  # type: ignore[arg-type]

    a_down, a_up = x_glyph(0.0, 0.0, ins)
    b_down, b_up = x_glyph(float(r["dx"]), 0.0, ins)  # type: ignore[arg-type]

    segs: list[Seg] = [a_up, b_up]                    # the two over-strands, whole
    segs.extend(cut(a_down, r["over_b"], half))       # type: ignore[arg-type]  A dips under B
    segs.extend(cut(b_down, r["over_a"], half))       # type: ignore[arg-type]  B dips under A
    return segs, float(r["width"])                    # type: ignore[arg-type]


def build_fused(w: float, linecap: str, overlap: float) -> tuple[list[Seg], float]:
    """Both X's whole, no weave. Returns (segments, mark_width).

    Drawn translucent, so the region the two X's share simply reads brighter —
    the overlap emerges from the paint rather than from a stacking decision. No
    strand is cut, nothing passes over anything, and there are no hairline gaps
    to lose at favicon size, which is where the woven version gets into trouble.
    """
    r = interlace_report(overlap, w, 0.0)
    ins = cap_inset(w, linecap)
    a_down, a_up = x_glyph(0.0, 0.0, ins)
    b_down, b_up = x_glyph(float(r["dx"]), 0.0, ins)  # type: ignore[arg-type]
    return [a_down, a_up, b_down, b_up], float(r["width"])  # type: ignore[arg-type]


# =========================================================================
# SVG emission
# =========================================================================

def _strokes(segs: list[Seg], w: float, linecap: str, color: str, indent: str = "  ",
             opacity: float = 1.0) -> str:
    op = "" if opacity >= 1.0 else f' stroke-opacity="{opacity:.2f}"'
    head = (f'{indent}<g fill="none" stroke="{color}" stroke-width="{_n(w)}"'
            f'{op} stroke-linecap="{linecap}">')
    body = "\n".join(
        f'{indent}  <line x1="{_n(a[0])}" y1="{_n(a[1])}" x2="{_n(b[0])}" y2="{_n(b[1])}"/>'
        for a, b in segs
    )
    return f"{head}\n{body}\n{indent}</g>"


def mono_wrap(content: str, cw: float, ch: float, label: str) -> str:
    """Tintable monogram: no background. Whatever `content` paints in
    currentColor inherits the surrounding text color."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_n(cw)} {_n(ch)}"'
        f' role="img" aria-label="{label}">\n'
        f"  <title>{label}</title>\n"
        f"{content}\n"
        f"</svg>\n"
    )


def icon_wrap(content: str, cw: float, ch: float, label: str,
              pad: float, radius: float, icon_bg: str) -> str:
    """Square app/tab icon: `content` must carry explicit fills, because a favicon
    renders with no CSS context to inherit currentColor from.

    Fits both axes, so a mark that is taller than it is wide would still be
    contained. Every mark here is wider than tall, so in practice this is the
    width constraint.
    """
    avail = S * (1.0 - 2.0 * pad)
    scale = min(avail / cw, avail / ch)
    tx = (S - cw * scale) / 2.0
    ty = (S - ch * scale) / 2.0
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_n(S)} {_n(S)}"'
        f' role="img" aria-label="{label}">\n'
        f"  <title>{label}</title>\n"
        f'  <rect width="{_n(S)}" height="{_n(S)}" rx="{_n(S * radius)}" fill="{icon_bg}"/>\n'
        f'  <g transform="translate({_p(tx)} {_p(ty)}) scale({_p(scale)})">\n'
        f"{content}\n"
        f"  </g>\n"
        f"</svg>\n"
    )


def svg_monogram(segs: list[Seg], width: float, w: float, linecap: str, label: str,
                 opacity: float = 1.0) -> str:
    """Stroke-mark monogram."""
    return mono_wrap(_strokes(segs, w, linecap, "currentColor", opacity=opacity),
                     width, S, label)


def svg_icon(segs: list[Seg], width: float, w: float, linecap: str, label: str,
             pad: float, radius: float, icon_bg: str, mark: str,
             opacity: float = 1.0) -> str:
    """Stroke-mark icon."""
    return icon_wrap(_strokes(segs, w, linecap, mark, indent="    ", opacity=opacity),
                     width, S, label, pad, radius, icon_bg)


# =========================================================================
# wordmark (the full "XoXoCom" logo, glyphs converted to outlines)
# =========================================================================

WORDMARK_TEXT = "XoXoCom"
# Which character positions carry the accent. Per the site rule (blueprint 3.2)
# that is the two X's; every other letter is ink.
WORDMARK_ACCENT_IDX = frozenset({0, 2})


def build_wordmark(font_path: Path, text: str, weight: float, tracking_em: float,
                   accent_idx: frozenset[int] = WORDMARK_ACCENT_IDX,
                   ) -> tuple[dict[str, list[str]], float, float] | None:
    """Set `text` and return its glyph outlines as SVG path data.

    Returns ({"accent": [d, ...], "ink": [d, ...]}, width, height) in font units,
    with the origin moved to the top-left of the inked bounding box — so the
    caller can drop the paths straight into a tight viewBox.

    Outlining rather than emitting <text> is what makes the result a real asset:
    no font dependency at render time, so it works as a favicon, in an <img>, and
    anywhere the brand typeface is not installed. Returns None (rather than
    raising) if fontTools/brotli are unavailable, so the rest of the kit still
    builds — the lab page can fall back to live HTML text.
    """
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib import instancer
        from fontTools.pens.svgPathPen import SVGPathPen
        from fontTools.pens.transformPen import TransformPen
        from fontTools.pens.boundsPen import BoundsPen
    except ImportError:
        return None

    # One guard around the whole job. TrueType tables decompile lazily, so a
    # malformed or composite glyph in a hand-subsetted webfont surfaces at
    # .draw() time, not at TTFont() — and this runs before any file is written, so
    # an escaping exception would take the three working stroke marks down with it.
    try:
        font = TTFont(str(font_path))
        if "fvar" in font:
            # Manrope ships as one variable face; pin the weight the site uses for
            # the wordmark (font-extrabold = 800) so the outlines match the header.
            instancer.instantiateVariableFont(font, {"wght": weight}, inplace=True)
        glyphs = font.getGlyphSet()
        upem = font["head"].unitsPerEm
        cmap = font.getBestCmap()

        track = tracking_em * upem

        # Pass 1: lay the glyphs out and union their inked bounds (in flipped,
        # y-grows-down space, which is what SVG wants).
        pen_x = 0.0
        placed: list[tuple[int, str, float]] = []
        min_x = min_y = float("inf")
        max_x = max_y = float("-inf")
        for i, ch in enumerate(text):
            name = cmap.get(ord(ch))
            if name is None:
                return None
            glyph = glyphs[name]
            bounds = BoundsPen(glyphs)
            glyph.draw(bounds)
            if bounds.bounds:
                x0, y0, x1, y1 = bounds.bounds
                min_x, max_x = min(min_x, pen_x + x0), max(max_x, pen_x + x1)
                min_y, max_y = min(min_y, -y1), max(max_y, -y0)
            placed.append((i, name, pen_x))
            pen_x += glyph.width + track

        if min_x == float("inf"):
            return None

        # Pass 2: draw each glyph through a flip-and-shift transform so the emitted
        # path data is already in final SVG coordinates.
        paths: dict[str, list[str]] = {"accent": [], "ink": []}
        for i, name, px in placed:
            svg_pen = SVGPathPen(glyphs, ntos=_n)
            glyphs[name].draw(TransformPen(svg_pen, (1, 0, 0, -1, px - min_x, -min_y)))
            d = svg_pen.getCommands()
            if d:
                paths["accent" if i in accent_idx else "ink"].append(d)

        return paths, max_x - min_x, max_y - min_y
    except Exception:
        # A woff2 needs brotli/brotlicffi to decompress; a subset may lack a glyph;
        # a contour may be degenerate. All of it is optional — degrade quietly and
        # let main() report the skip.
        return None


def wordmark_body(paths: dict[str, list[str]], accent: str, ink: str, indent: str = "  ") -> str:
    """Compose the outlines into two fills: the X's in accent, the rest in `ink`
    (pass "currentColor" for a tintable monogram)."""
    out = []
    if paths["ink"]:
        out.append(f'{indent}<path d="{" ".join(paths["ink"])}" fill="{ink}"/>')
    if paths["accent"]:
        out.append(f'{indent}<path d="{" ".join(paths["accent"])}" fill="{accent}"/>')
    return "\n".join(out)


def svg_proof(w: float, linecap: str, overlap: float, clearance: float, accent: str) -> str:
    """The interlace argument, drawn: both crossings marked, plus the rotation
    centre they are symmetric about."""
    r = interlace_report(overlap, w, clearance)
    segs, width = build_interlock(w, linecap, overlap, clearance)
    cx, cy = r["centre"]  # type: ignore[misc]
    pad = 26.0
    vb_w, vb_h = width + pad * 2, S + pad * 2

    def dot(p: Pt, txt: str, dy: float) -> str:
        return (
            f'  <circle cx="{_n(p[0])}" cy="{_n(p[1])}" r="{_n(w * 0.92)}" fill="none"'
            f' stroke="{accent}" stroke-width="1.4" stroke-dasharray="3 3"/>\n'
            f'  <text x="{_n(p[0] + w * 1.5)}" y="{_n(p[1] + dy)}" fill="{MUTED}"'
            f' font-family="ui-monospace, monospace" font-size="9">{txt}</text>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{_n(-pad)} {_n(-pad)} {_n(vb_w)} {_n(vb_h)}"'
        f' role="img" aria-label="Interlace crossings">\n'
        f"  <title>Interlace crossings</title>\n"
        f'{_strokes(segs, w, linecap, accent)}\n'
        f'  <line x1="{_n(cx)}" y1="{_n(-pad + 4)}" x2="{_n(cx)}" y2="{_n(S + pad - 4)}"'
        f' stroke="{BORDER}" stroke-width="1" stroke-dasharray="4 4"/>\n'
        f'  <circle cx="{_n(cx)}" cy="{_n(cy)}" r="2.4" fill="{FG}"/>\n'
        # Labelled by which X reads as being on top, at the crossing where it is.
        f"{dot(r['over_a'], 'A over B', -w * 1.1)}\n"   # type: ignore[arg-type]
        f"{dot(r['over_b'], 'B over A', w * 1.9)}\n"    # type: ignore[arg-type]
        f"</svg>\n"
    )


# =========================================================================
# lab page
# =========================================================================

GROUNDS = [("dark", BG, FG), ("light", FG, BG)]
TAB_SIZES = [16, 20, 32, 48]


def _font_css(font_path: Path) -> tuple[str, bool]:
    """Inline Manrope as a data URI (the Artifact CSP blocks font CDNs)."""
    if not font_path.is_file():
        return "", False
    b64 = base64.b64encode(font_path.read_bytes()).decode("ascii")
    return (
        "@font-face{font-family:'Manrope';font-style:normal;font-weight:400 800;"
        "font-display:block;"
        f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
    ), True


def _ascii_safe(s: str) -> str:
    """Convert every non-ASCII character to a numeric character reference.

    The published page's <head> is supplied by the Artifact wrapper, so this file
    cannot declare its own charset. Emitting pure ASCII makes the page immune to
    whatever encoding the wrapper assumes — no mojibake em dashes.
    """
    return "".join(c if ord(c) < 128 else f"&#{ord(c)};" for c in s)


def _tile(inner: str, ground: str, bg: str, extra: str = "") -> str:
    return (
        f'<div class="tile tile--{ground}" style="--tile-bg:{bg}">'
        f'<div class="tile__stage {extra}">{inner}</div>'
        f'<span class="tile__tag">{bg}</span>'
        f"</div>"
    )


def _view_block(title: str, note: str, tiles: str) -> str:
    return (
        f'<section class="view">'
        f'<div class="view__head"><h4>{title}</h4><p>{note}</p></div>'
        f'<div class="view__tiles">{tiles}</div>'
        f"</section>"
    )


def build_page(marks: dict[str, dict[str, object]], proof: str, specs: list[tuple[str, str, str]],
               font_css: str, have_font: bool, body_only: bool, accent: str) -> str:
    """Assemble the review page. `marks` maps version key -> its SVG strings."""

    # --- the decisive test first: does it survive an actual browser tab? -----
    tab_rows = []
    for key, m in marks.items():
        chips = "".join(
            f'<div class="ladder__item"><div class="ladder__box" style="width:{s}px;height:{s}px">'
            f'{m["icon"]}</div><span>{s}px</span></div>'
            for s in TAB_SIZES
        )
        tabs = "".join(
            f'<div class="tabmock tabmock--{g}">'
            f'<div class="tabmock__tab"><span class="tabmock__ico">{m["icon"]}</span>'
            f'<span class="tabmock__title">XoXoCom UG — Modern Ways of…</span>'
            f'<span class="tabmock__x">&#215;</span></div></div>'
            for g, _bg, _fg in GROUNDS
        )
        tab_rows.append(
            f'<div class="tabrow"><h4>{m["name"]}</h4>'
            f'<div class="tabrow__mocks">{tabs}</div>'
            f'<div class="ladder">{chips}</div></div>'
        )

    # --- three views per version, each on both grounds -----------------------
    version_blocks = []
    for key, m in marks.items():
        # The stroke marks are painted entirely in currentColor, so they are tinted
        # with the accent. The wordmark instead carries the accent on its X's
        # internally and leaves the other letters as currentColor, so it must be
        # tinted with the ground's ink or those letters vanish.
        wide = bool(m.get("wide"))
        mono = _view_block(
            "Monogram",
            "The bare mark, no container. Tintable — one file, painted in "
            "<code>currentColor</code>.",
            "".join(
                _tile(
                    f'<span class="mono{" mono--wide" if wide else ""}"'
                    f' style="color:{fg if m.get("tint") == "ink" else accent}">{m["mono"]}</span>',
                    g, bg,
                )
                for g, bg, fg in GROUNDS
            ),
        )
        icon = _view_block(
            "Icon",
            "The favicon/app form: mark centred in a rounded square that carries its "
            "own ground, so it holds up whatever the browser chrome does.",
            "".join(
                _tile(f'<span class="icon">{m["icon"]}</span>', g, bg)
                for g, bg, _fg in GROUNDS
            ),
        )
        lock = _view_block(
            "Lockup",
            str(m.get("lock_note", "Mark plus wordmark. The accent lives in the mark here, "
                                  "so the wordmark stays neutral — two accents side by side "
                                  "would fight.")),
            "".join(
                _tile(
                    f'<span class="lock">'
                    f'<span class="lock__mark{" lock__mark--wide" if wide else ""}"'
                    f' style="color:{fg if m.get("tint") == "ink" else accent}">{m["mono"]}</span>'
                    f'<span class="lock__rule" style="background:{fg}"></span>'
                    f'<span class="lock__word" style="color:{fg}">{m.get("lock_word", "XoXoCom")}</span>'
                    f"</span>",
                    g, bg, extra="tile__stage--wide",
                )
                for g, bg, fg in GROUNDS
            ),
        )
        version_blocks.append(
            f'<article class="version" id="{key}">'
            f'<header class="version__head">'
            f'<p class="eyebrow">Option {m["letter"]}</p>'
            f'<h3>{m["name"]}</h3><p class="lede">{m["blurb"]}</p></header>'
            f"{mono}{icon}{lock}</article>"
        )

    spec_rows = "".join(
        f"<tr><th scope=\"row\">{a}</th><td>{b}</td><td>{c}</td></tr>" for a, b, c in specs
    )

    font_note = (
        "" if have_font else
        '<p class="warn">Manrope was not found in the site build cache, so the '
        "wordmark below is rendering in a system fallback — the marks themselves are "
        "geometry and are unaffected.</p>"
    )

    css = f"""
{font_css}
:root{{
  --bg:{BG}; --surface:{SURFACE}; --border:{BORDER};
  --fg:{FG}; --muted:{MUTED}; --accent:{ACCENT};
  --sans:'Manrope',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  --step:clamp(1rem,0.6rem + 1.4vw,1.5rem);
}}
/* The specimen tiles are the content, so they hold their literal hex grounds in
   every theme. Only the page chrome follows the viewer. */
@media (prefers-color-scheme: light){{
  :root{{ --bg:#f4f5f7; --surface:#ffffff; --border:#d9dde2; --fg:#12161b; --muted:#5d646c; }}
}}
:root[data-theme="dark"]{{
  --bg:{BG}; --surface:{SURFACE}; --border:{BORDER}; --fg:{FG}; --muted:{MUTED};
}}
:root[data-theme="light"]{{
  --bg:#f4f5f7; --surface:#ffffff; --border:#d9dde2; --fg:#12161b; --muted:#5d646c;
}}
*{{box-sizing:border-box}}
.lab{{background:var(--bg);color:var(--fg);font-family:var(--sans);
  line-height:1.6;padding:var(--step);display:flex;flex-direction:column;gap:calc(var(--step)*2)}}
.wrap{{width:100%;max-width:1080px;margin:0 auto;display:flex;flex-direction:column;
  gap:calc(var(--step)*2)}}
.eyebrow{{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.18em;
  color:var(--accent);margin:0}}
h1,h2,h3,h4{{margin:0;letter-spacing:-.02em;text-wrap:balance;font-weight:800}}
h1{{font-size:clamp(1.9rem,1.2rem + 2.6vw,3rem);line-height:1.05}}
h2{{font-size:clamp(1.3rem,1rem + 1vw,1.65rem)}}
h3{{font-size:clamp(1.15rem,1rem + .6vw,1.4rem)}}
h4{{font-size:.95rem;font-weight:700}}
p{{margin:0}}
.lede{{color:var(--muted);max-width:62ch}}
code{{font-family:var(--mono);font-size:.86em;color:var(--fg)}}
.warn{{border-left:2px solid var(--accent);padding-left:.75rem;color:var(--muted);font-size:.9rem}}
.hd{{display:flex;flex-direction:column;gap:.6rem;
  border-bottom:1px solid var(--border);padding-bottom:calc(var(--step)*1.1)}}
.panel{{display:flex;flex-direction:column;gap:var(--step);
  border:1px solid var(--border);border-radius:14px;background:var(--surface);
  padding:calc(var(--step)*1.1)}}
.panel__head{{display:flex;flex-direction:column;gap:.4rem}}

/* --- tab reality check ------------------------------------------------- */
.tabrow{{display:flex;flex-direction:column;gap:.8rem}}
.tabrow__mocks{{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}}
.tabmock{{border-radius:10px 10px 0 0;padding:.5rem .5rem 0;border:1px solid var(--border);
  border-bottom:0}}
.tabmock--dark{{background:#171b21}}
.tabmock--light{{background:#dee1e6}}
.tabmock__tab{{display:flex;align-items:center;gap:.5rem;padding:.45rem .6rem;
  border-radius:8px 8px 0 0;font-size:.74rem;min-width:0}}
.tabmock--dark .tabmock__tab{{background:#292d33;color:#e8eaed}}
.tabmock--light .tabmock__tab{{background:#fff;color:#3c4043}}
.tabmock__ico{{flex:0 0 16px;width:16px;height:16px;display:block;line-height:0}}
.tabmock__ico svg{{width:16px;height:16px;display:block}}
.tabmock__title{{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.tabmock__x{{opacity:.55}}
.ladder{{display:flex;flex-wrap:wrap;gap:1.1rem;align-items:flex-end;
  padding:.9rem;border:1px solid var(--border);border-radius:10px;background:var(--bg)}}
.ladder__item{{display:flex;flex-direction:column;align-items:center;gap:.4rem}}
.ladder__box{{line-height:0}}
.ladder__box svg{{width:100%;height:100%;display:block}}
.ladder__item span{{font-family:var(--mono);font-size:.68rem;color:var(--muted);
  font-variant-numeric:tabular-nums}}

/* --- versions & views -------------------------------------------------- */
.version{{display:flex;flex-direction:column;gap:var(--step);
  border:1px solid var(--border);border-radius:14px;background:var(--surface);
  padding:calc(var(--step)*1.1)}}
.version__head{{display:flex;flex-direction:column;gap:.35rem;
  border-bottom:1px solid var(--border);padding-bottom:var(--step)}}
.view{{display:grid;gap:.85rem}}
.view__head{{display:flex;flex-direction:column;gap:.25rem}}
.view__head p{{color:var(--muted);font-size:.86rem;max-width:64ch}}
.view__tiles{{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}}
.tile{{position:relative;background:var(--tile-bg);border:1px solid var(--border);
  border-radius:12px;overflow:hidden}}
.tile__stage{{min-height:132px;display:grid;place-items:center;padding:1.5rem 1.25rem}}
.tile__stage--wide{{padding:1.5rem 1rem}}
.tile__tag{{position:absolute;right:.5rem;bottom:.4rem;font-family:var(--mono);
  font-size:.62rem;color:{MUTED};opacity:.85}}
.mono{{display:block;width:min(180px,80%);line-height:0}}
.mono svg{{width:100%;height:auto;display:block}}
.mono--wide{{width:min(240px,90%)}}
.icon{{display:block;width:76px;line-height:0}}
.icon svg{{width:100%;height:auto;display:block;border-radius:0}}
.lock{{display:flex;align-items:center;gap:.7rem;width:100%;justify-content:center}}
.lock__mark{{display:block;width:clamp(44px,26%,64px);line-height:0;flex:0 0 auto}}
.lock__mark svg{{width:100%;height:auto;display:block}}
.lock__mark--wide{{width:clamp(110px,52%,168px)}}
.lock__rule{{width:1px;align-self:stretch;opacity:.22;flex:0 0 1px}}
.lock__word{{font-size:clamp(1.1rem,.8rem + 1.1vw,1.6rem);font-weight:800;
  letter-spacing:-.03em;white-space:nowrap}}

/* --- proof & specs ----------------------------------------------------- */
.proof{{display:grid;gap:var(--step);grid-template-columns:1fr;align-items:center}}
@media (min-width:760px){{ .proof{{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}} }}
.proof__fig{{background:{BG};border:1px solid var(--border);border-radius:12px;
  padding:1.25rem;line-height:0}}
.proof__fig svg{{width:100%;height:auto;display:block}}
.proof__body{{display:flex;flex-direction:column;gap:.7rem;color:var(--muted);font-size:.92rem}}
.proof__body strong{{color:var(--fg)}}
.tablewrap{{overflow-x:auto}}
table{{border-collapse:collapse;width:100%;font-size:.88rem;min-width:520px}}
caption{{text-align:left;color:var(--muted);font-size:.82rem;padding-bottom:.6rem}}
th,td{{text-align:left;padding:.55rem .7rem;border-bottom:1px solid var(--border);
  vertical-align:top}}
thead th{{font-size:.7rem;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);
  font-weight:700}}
tbody th{{font-weight:600;white-space:nowrap}}
td{{font-family:var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}}
td:last-child{{font-family:var(--sans)}}
.foot{{color:var(--muted);font-size:.86rem;border-top:1px solid var(--border);
  padding-top:var(--step)}}
@media (prefers-reduced-motion:reduce){{*{{animation:none!important;transition:none!important}}}}
"""

    body = f"""<div class="lab"><div class="wrap">

<header class="hd">
  <p class="eyebrow">XoXoCom UG &middot; identity lab</p>
  <h1>A mark for the tab</h1>
  <p class="lede">Four candidates: the existing wordmark minimized to its two X's,
  two ways of overlapping those X's evenly, and the full wordmark as the header sets
  it today. Judge them at 16&nbsp;px first &mdash; that is the size a browser tab
  actually gives you, and it decides this. Everything below is supporting evidence.
  Nothing here is wired into the site yet.</p>
  {font_note}
</header>

<section class="panel">
  <div class="panel__head">
    <p class="eyebrow">The only test that matters</p>
    <h2>At tab size</h2>
    <p class="lede">Rendered at true pixel size in dark and light browser chrome,
    then stepped up the favicon ladder.</p>
  </div>
  {"".join(tab_rows)}
</section>

{"".join(version_blocks)}

<section class="panel">
  <div class="panel__head">
    <p class="eyebrow">Why the overlap is even</p>
    <h2>Neither X sits on top</h2>
  </div>
  <div class="proof">
    <div class="proof__fig">{proof}</div>
    <div class="proof__body">
      <p>Two X's overlapped this way cross at <strong>exactly two points</strong>.
      The other two strand pairs run parallel, so they never meet &mdash; there is
      nothing else to resolve.</p>
      <p>Each X is given <strong>one</strong> of those crossings: the left X passes
      over at the upper one, the right X passes over at the lower one. So each
      contributes one whole strand and one broken strand.</p>
      <p>That makes the figure <strong>invariant under a 180&deg; rotation</strong>
      about the marked centre &mdash; and that rotation maps one X exactly onto the
      other. "Neither overshadows the other" is therefore a property of the
      geometry, not a judgement call: swap the two X's and the drawing is
      unchanged.</p>
    </div>
  </div>
</section>

<section class="panel">
  <div class="panel__head">
    <p class="eyebrow">Reference</p>
    <h2>Specs &amp; findings</h2>
  </div>
  <div class="tablewrap">
    <table>
      <caption>Measured from the generated geometry. Contrast ratios are WCAG.</caption>
      <thead><tr><th scope="col">Property</th><th scope="col">Value</th><th scope="col">Note</th></tr></thead>
      <tbody>{spec_rows}</tbody>
    </table>
  </div>
</section>

<p class="foot">Generated by <code>execution/build_logo_lab.py</code>. Assets in
<code>assets/logo/</code>. To adopt one, drop its icon file into
<code>sites/xoxocom/app/icon.svg</code> &mdash; Next serves that as the favicon
automatically.</p>

</div></div>"""

    title = "XoXoCom &mdash; logo lab"
    if body_only:
        return _ascii_safe(f"<title>{title}</title>\n<style>{css}</style>\n{body}\n")
    return _ascii_safe(
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\"/>\n"
        '<meta name="viewport" content="width=device-width,initial-scale=1"/>\n'
        f"<title>{title}</title>\n"
        f"<style>*{{margin:0;padding:0}}{css}</style>\n</head>\n<body>\n{body}\n</body>\n</html>\n"
    )


# =========================================================================
# main
# =========================================================================

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--stroke", type=float, default=0.20,
                    help="stroke width as a fraction of the cap square (default 0.20)")
    ap.add_argument("--overlap", type=float, default=0.62,
                    help="how far the two X's overlap, as a fraction of one cap square "
                         "(default 0.62). Below ~0.50 the crossings crowd the arm tips and "
                         "the weave has no room — build_interlock will say so.")
    ap.add_argument("--gap", type=float, default=0.14,
                    help="twin version: gap between the X's, as a fraction of a cap square (default 0.14)")
    ap.add_argument("--clearance", type=float, default=0.26,
                    help="interlace breathing room at a crossing, as a fraction of stroke width (default 0.26)")
    ap.add_argument("--fused-opacity", type=float, default=0.72,
                    help="stroke opacity for the fused variant (default 0.72)")
    ap.add_argument("--wordmark-weight", type=float, default=800.0,
                    help="Manrope weight to outline the wordmark at (default 800, "
                         "matching the site header's font-extrabold)")
    ap.add_argument("--tracking", type=float, default=-0.02,
                    help="wordmark letter-spacing in em (default -0.02, matching "
                         "the header's tracking-tight)")
    ap.add_argument("--wordmark-ink", default=FG,
                    help=f"color of the wordmark's non-X letters in the icon file (default {FG})")
    ap.add_argument("--linecap", choices=["round", "square", "butt"], default="round")
    ap.add_argument("--icon-pad", type=float, default=0.12,
                    help="icon padding as a fraction of the icon square (default 0.12)")
    ap.add_argument("--icon-radius", type=float, default=0.22,
                    help="icon corner radius as a fraction of the icon square (default 0.22)")
    ap.add_argument("--icon-bg", default=BG, help=f"icon container fill (default {BG})")
    ap.add_argument("--accent", default=ACCENT, help=f"mark color in the icon files (default {ACCENT})")
    ap.add_argument("--assets-dir", default=str(DEFAULT_ASSETS))
    ap.add_argument("--out-dir", default=str(DEFAULT_OUT))
    ap.add_argument("--font", default=str(DEFAULT_FONT))
    args = ap.parse_args()

    # Colors land inside SVG/HTML attribute values and the emitted SVG is then
    # inlined verbatim into the lab page, so a quote in either flag would break out
    # of the attribute and inject markup. Escape before anything else uses them.
    accent = html.escape(args.accent, quote=True)
    icon_bg = html.escape(args.icon_bg, quote=True)
    word_ink = html.escape(args.wordmark_ink, quote=True)

    w = args.stroke * S
    overlap = args.overlap * S
    gap = args.gap * S

    twin_segs, twin_w = build_twin(w, args.linecap, gap)
    lock_segs, lock_w = build_interlock(w, args.linecap, overlap, args.clearance)
    fuse_segs, fuse_w = build_fused(w, args.linecap, overlap)
    rep = interlace_report(overlap, w, args.clearance)

    assets = Path(args.assets_dir).resolve()
    out = Path(args.out_dir).resolve()
    assets.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)

    files: dict[str, str] = {
        "xoxocom-mark-twin.svg": svg_monogram(twin_segs, twin_w, w, args.linecap, "XoXoCom twin X monogram"),
        "xoxocom-mark-interlock.svg": svg_monogram(lock_segs, lock_w, w, args.linecap, "XoXoCom interlocked X monogram"),
        "xoxocom-icon-twin.svg": svg_icon(twin_segs, twin_w, w, args.linecap, "XoXoCom icon (twin)",
                                          args.icon_pad, args.icon_radius, icon_bg, accent),
        "xoxocom-icon-interlock.svg": svg_icon(lock_segs, lock_w, w, args.linecap, "XoXoCom icon (interlock)",
                                               args.icon_pad, args.icon_radius, icon_bg, accent),
        "xoxocom-mark-fused.svg": svg_monogram(fuse_segs, fuse_w, w, args.linecap,
                                               "XoXoCom fused X monogram", args.fused_opacity),
        "xoxocom-icon-fused.svg": svg_icon(fuse_segs, fuse_w, w, args.linecap, "XoXoCom icon (fused)",
                                           args.icon_pad, args.icon_radius, icon_bg, accent,
                                           args.fused_opacity),
        "xoxocom-interlace-proof.svg": svg_proof(w, args.linecap, overlap, args.clearance, accent),
    }

    # The wordmark is type, not geometry, so it needs the font outlined. Optional:
    # if fontTools/brotli are missing we skip its two asset files and the lab page
    # falls back to live HTML text for that option.
    wm = build_wordmark(Path(args.font), WORDMARK_TEXT, args.wordmark_weight, args.tracking)
    if wm is not None:
        wm_paths, wm_w, wm_h = wm
        files["xoxocom-mark-wordmark.svg"] = mono_wrap(
            wordmark_body(wm_paths, accent, "currentColor"), wm_w, wm_h,
            "XoXoCom wordmark")
        files["xoxocom-icon-wordmark.svg"] = icon_wrap(
            wordmark_body(wm_paths, accent, word_ink, indent="    "), wm_w, wm_h,
            "XoXoCom icon (wordmark)", args.icon_pad, args.icon_radius, icon_bg)

    for name, text in files.items():
        (assets / name).write_text(text, encoding="utf-8")
        print(f"  wrote {_rel(assets / name)}")

    marks = {
        "twin": {
            "letter": "A", "name": "Twin", "blurb":
                "The current wordmark reduced to its two accent-bearing X's, set side "
                "by side. Conservative and instantly recognisable as the existing logo &mdash; "
                "but it is a wide mark, so it shrinks hard inside a square icon.",
            "mono": files["xoxocom-mark-twin.svg"], "icon": files["xoxocom-icon-twin.svg"],
        },
        "interlock": {
            "letter": "B", "name": "Interlock", "blurb":
                "The two X's woven together, each passing over the other exactly once. "
                "The most crafted of the three, and the overlap pulls the mark closer to "
                "square so it fills a tab icon at a larger optical size. The weave depends "
                "on a hairline gap, so check it at 16&nbsp;px before committing.",
            "mono": files["xoxocom-mark-interlock.svg"], "icon": files["xoxocom-icon-interlock.svg"],
        },
        "fused": {
            "letter": "C", "name": "Fused", "blurb":
                "The same overlap, painted instead of woven: both X's translucent, so the "
                "shared region simply reads brighter. Nothing passes over anything, so the "
                "even-overlap brief holds by construction &mdash; and with no gaps to lose, "
                "it is the one that survives 16&nbsp;px intact.",
            "mono": files["xoxocom-mark-fused.svg"], "icon": files["xoxocom-icon-fused.svg"],
        },
    }

    if wm is not None:
        wm_aspect = wm[1] / wm[2]
        marks["wordmark"] = {
            "letter": "D", "name": "Wordmark", "blurb":
                "The logo exactly as the site header sets it today: the full name, both "
                "X's in coral, every other letter in ink. Unambiguous and already "
                f"familiar &mdash; but at {wm_aspect:.1f}:1 it is far too wide for a square "
                "icon. Check the tab strip above before considering it for the favicon "
                "slot; it is here because it is the right answer for a header, an email "
                "signature, or a share image.",
            "mono": files["xoxocom-mark-wordmark.svg"], "icon": files["xoxocom-icon-wordmark.svg"],
            # Its X's are already accented internally, so it tints with ink, not accent.
            "tint": "ink", "wide": True,
            "lock_word": "UG",
            "lock_note": "This option is already a lockup, so the pairing shown is the "
                         "wordmark with the legal suffix rather than mark-plus-name.",
        }

    over_a, over_b = rep["over_a"], rep["over_b"]  # type: ignore[misc]
    c_dark = contrast(args.accent, BG)
    c_light = contrast(args.accent, FG)
    specs: list[tuple[str, str, str]] = [
        ("Stroke width", f"{_n(w)} / {_n(S)} units ({args.stroke:.0%})",
         f"{args.linecap} caps, inset {_n(cap_inset(w, args.linecap))} per axis so caps land on the cap square"),
        ("Twin aspect", f"{twin_w / S:.2f} : 1",
         "Wide. Width-constrained in a square icon, so the mark reads smaller."),
        ("Interlock aspect", f"{lock_w / S:.2f} : 1",
         "Overlap buys back width — the better square-icon citizen of the two."),
        ("Overlap", f"{_n(overlap)} units ({args.overlap:.0%})",
         "Of one cap square. Below ~50% the crossings crowd the arm tips and the weave "
         "has no room to resolve."),
        ("Crossings", f"({_n(over_a[0])}, {_n(over_a[1])}) &amp; ({_n(over_b[0])}, {_n(over_b[1])})",
         "The only two — the other strand pairs run parallel. The left X reads over at the "
         "first, the right X at the second."),
        ("Rotation centre", f"({_n(rep['centre'][0])}, {_n(rep['centre'][1])})",  # type: ignore[index,arg-type]
         "The woven figure is unchanged by a 180° rotation about this point, which maps "
         "one X onto the other."),
        ("Interlace gap", f"{_n(float(rep['half_gap']) * 2)} units",  # type: ignore[arg-type]
         f"Stroke width plus {args.clearance:.0%} clearance on each side. "
         f"Shortest resulting strand piece must clear {MIN_STUB:.0f} units or the build fails."),
        ("Fused opacity", f"{args.fused_opacity:.2f}",
         "Per X. The shared region reads brighter because both are equally translucent."),
        ("Coral on canvas", f"{c_dark:.2f} : 1", f"{args.accent} on {BG} — comfortable."),
        ("Wordmark aspect",
         f"{wm[1] / wm[2]:.2f} : 1" if wm else "n/a",
         "Outlined from Manrope at weight "
         f"{args.wordmark_weight:.0f}, tracking {args.tracking:+.2f}em. Glyphs are converted "
         "to paths, so the file needs no font at render time. Far too wide to work as a "
         "favicon — the letters go sub-pixel well before 16px."
         if wm else
         "fontTools/brotli unavailable, so the wordmark assets were skipped."),
        ("Coral on ink", f"{c_light:.2f} : 1",
         f"{args.accent} on {FG} — below the 3:1 graphic threshold. Fine for a large "
         "lockup, weak for a 16&nbsp;px favicon; deepen the coral or keep the dark icon container."),
    ]

    font_css, have_font = _font_css(Path(args.font))
    proof = files["xoxocom-interlace-proof.svg"]
    (out / "index.html").write_text(
        build_page(marks, proof, specs, font_css, have_font, False, accent), encoding="utf-8")
    (out / "artifact.html").write_text(
        build_page(marks, proof, specs, font_css, have_font, True, accent), encoding="utf-8")
    print(f"  wrote {_rel(out / 'index.html')}")
    print(f"  wrote {_rel(out / 'artifact.html')}")
    if not have_font:
        print(f"  ! Manrope not found at {args.font} — lab page falls back to a system stack")
    if wm is None:
        print("  ! wordmark skipped: needs fontTools + brotli/brotlicffi to outline the "
              "glyphs, and a readable font at --font")
    print(f"\nopen: {out / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
