#!/usr/bin/env python3
"""Generate translucent "origami" geometric shape assets (SVG) and an origami lab
preview page, so a shape family can be reviewed *before* it is wired into the hero
animations.

Every shape is built from flat triangular/quad facets with crisp crease lines — the
look of folded paper — and is painted entirely in `currentColor` with per-facet
`fill-opacity`. That means one asset file serves every tint: set `color: #fb6b4c`
for the coral accent, `color: #ffffff` for the white accent, and the translucency
stays baked into the geometry.

Usage:
    python execution/build_origami_lab.py
    python execution/build_origami_lab.py --fill-max 0.28 --crease 0.4
    python execution/build_origami_lab.py --assets-dir assets/origami

Outputs:
    assets/origami/<shape>.svg      durable, hand-editable shape assets
    .tmp/origami_lab/index.html     standalone preview page (open locally)
    .tmp/origami_lab/artifact.html  same page as a body-only fragment (for publishing)

Deterministic and std-lib only: same flags in, byte-identical files out.
"""

from __future__ import annotations

import argparse
import html
import math
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ASSETS = REPO_ROOT / "assets" / "origami"
DEFAULT_OUT = REPO_ROOT / ".tmp" / "origami_lab"

# --- geometry constants ---------------------------------------------------
S = 200.0           # square viewBox for every shape
C = S / 2           # centre
LIGHT_2D = math.radians(-131.0)   # where the "light" sits, for 2D facet shading
LIGHT_3D = (-0.42, -0.66, 0.62)   # light direction for the true-3D shapes

# --- brand tokens (mirrors sites/xoxocom/app/globals.css) -----------------
BG = "#0b0e11"
FG = "#eaecef"
MUTED = "#8c8f92"
SURFACE = "#1e2329"
BORDER = "#2b3139"
ACCENT = "#fb6b4c"
WHITE = "#ffffff"


# =========================================================================
# SVG primitives
# =========================================================================

def _n(v: float) -> str:
    """Compact number formatting so the SVGs stay readable/diffable."""
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def _d(pts: list[tuple[float, float]]) -> str:
    return "M " + " L ".join(f"{_n(x)} {_n(y)}" for x, y in pts) + " Z"


class Painter:
    """Emits facet/crease/outline paths at a chosen translucency range."""

    def __init__(self, fill_min: float, fill_max: float, crease: float, edge: float):
        self.fill_min = fill_min
        self.fill_max = fill_max
        self.crease = crease
        self.edge = edge

    # opacity of a facet, from a 0..1 "how lit is it" value
    def lit(self, t: float, dim: float = 1.0) -> float:
        t = min(1.0, max(0.0, t))
        return (self.fill_min + (self.fill_max - self.fill_min) * t) * dim

    def shade2d(self, pts: list[tuple[float, float]], dim: float = 1.0) -> float:
        """Fake lighting for flat shapes: facets whose centroid points toward the
        light read brighter, which is what sells the folded-paper illusion."""
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        ang = math.atan2(cy - C, cx - C)
        t = 0.5 + 0.5 * math.cos(ang - LIGHT_2D)
        return self.lit(t, dim)

    def facet(self, pts: list[tuple[float, float]], op: float) -> str:
        return (
            f'  <path d="{_d(pts)}" fill="currentColor" fill-opacity="{op:.3f}"'
            f' stroke="currentColor" stroke-opacity="{self.crease:.2f}" stroke-width="0.9"/>'
        )

    def outline(self, pts: list[tuple[float, float]]) -> str:
        return (
            f'  <path d="{_d(pts)}" stroke="currentColor"'
            f' stroke-opacity="{self.edge:.2f}" stroke-width="1.4"/>'
        )

    def crease_line(self, a: tuple[float, float], b: tuple[float, float], op: float) -> str:
        return (
            f'  <path d="M {_n(a[0])} {_n(a[1])} L {_n(b[0])} {_n(b[1])}"'
            f' stroke="currentColor" stroke-opacity="{op:.2f}" stroke-width="0.9"/>'
        )


def pol(r: float, deg: float, cx: float = C, cy: float = C) -> tuple[float, float]:
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def rot(p: tuple[float, float], deg: float, cx: float = C, cy: float = C) -> tuple[float, float]:
    a = math.radians(deg)
    dx, dy = p[0] - cx, p[1] - cy
    return (cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a))


def mid(a: tuple[float, float], b: tuple[float, float], t: float = 0.5) -> tuple[float, float]:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def centroid(pts: list[tuple[float, float]]) -> tuple[float, float]:
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


# =========================================================================
# Shape builders — each returns a list of SVG body lines
# =========================================================================

def radial_fold(p: Painter, n: int, R: float, inner: float, hub: float, phase: float = -90.0) -> list[str]:
    """A folded rosette: 2n triangular facets alternating mountain/valley, plus a
    small hub polygon. n=14 reads as a faceted disc, n=6 as a folded flower."""
    step = 360.0 / n
    outer = [pol(R, phase + i * step) for i in range(n)]
    inn = [pol(R * inner, phase + (i + 0.5) * step) for i in range(n)]
    hub_pts = [pol(R * hub, phase + i * step) for i in range(n)]
    out: list[str] = []
    for i in range(n):
        a, b, c2 = outer[i], inn[i], outer[(i + 1) % n]
        h0, h1 = hub_pts[i], hub_pts[(i + 1) % n]
        f1 = [h0, a, b]
        f2 = [h1, b, c2]
        out.append(p.facet(f1, p.shade2d(f1)))
        out.append(p.facet(f2, p.shade2d(f2, dim=0.55)))
        out.append(p.facet([h0, b, h1], p.shade2d([h0, b, h1], dim=0.8)))
    out.append(p.facet(hub_pts, p.lit(0.85)))
    out.append(p.outline([v for i in range(n) for v in (outer[i], inn[i])]))
    return out


def tri_fold(p: Painter, R: float = 96.0) -> list[str]:
    """Equilateral triangle, tri-folded: mid-edge triangle split from the centroid
    plus three corner facets — the classic first fold of almost every model."""
    v = [pol(R, -90.0 + i * 120.0) for i in range(3)]
    m = [mid(v[i], v[(i + 1) % 3]) for i in range(3)]
    g = centroid(v)
    out: list[str] = []
    for i in range(3):
        corner = [v[i], m[i], m[(i - 1) % 3]]
        out.append(p.facet(corner, p.shade2d(corner)))
    for i in range(3):
        wedge = [g, m[i], m[(i + 1) % 3]]
        out.append(p.facet(wedge, p.shade2d(wedge, dim=0.6)))
    out.append(p.outline(v))
    return out


def twist_fold(p: Painter, n: int, R: float, layers: int, twist: float, shrink: float = 0.62) -> list[str]:
    """Twist fold: concentric n-gons, each rotated and scaled inward. The quads
    between rings spiral, which gives a lot of motion from very little geometry."""
    rings: list[list[tuple[float, float]]] = []
    r, ang = R, -90.0
    for j in range(layers):
        rings.append([pol(r, ang + i * 360.0 / n) for i in range(n)])
        r *= shrink
        ang += twist
    out: list[str] = []
    for j in range(layers - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(n):
            quad = [a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]]
            dim = 1.0 if (i + j) % 2 == 0 else 0.5
            out.append(p.facet(quad, p.shade2d(quad, dim=dim)))
    out.append(p.facet(rings[-1], p.lit(0.9)))
    out.append(p.outline(rings[0]))
    return out


def pleat_band(p: Painter, folds: int = 9, length: float = 196.0, height: float = 68.0,
               amp: float = 11.0, angle: float = -24.0) -> list[str]:
    """Accordion pleat: a zig-zag ribbon. Reads beautifully as a corner/edge element
    behind a headline because it has a strong directional grain."""
    x0 = C - length / 2
    y0 = C - height / 2
    step = length / folds
    out: list[str] = []
    top = [(x0 + k * step, y0 + (amp if k % 2 else -amp)) for k in range(folds + 1)]
    bot = [(x, y + height) for (x, y) in top]
    for k in range(folds):
        quad = [top[k], top[k + 1], bot[k + 1], bot[k]]
        quad = [rot(q, angle) for q in quad]
        out.append(p.facet(quad, p.lit(0.9 if k % 2 == 0 else 0.22)))
    silhouette = [rot(q, angle) for q in (top + list(reversed(bot)))]
    out.append(p.outline(silhouette))
    return out


def chevron_stack(p: Painter, count: int = 4, width: float = 90.0, thickness: float = 17.0,
                  rise: float = 30.0, gap: float = 12.0) -> list[str]:
    """Nested folded chevrons — a directional "forward" mark built from creases."""
    out: list[str] = []
    total = count * (thickness + gap)
    y = C - total / 2 + thickness
    for k in range(count):
        w = width * (1.0 - 0.13 * k)
        r = rise * (1.0 - 0.10 * k)
        left = [(C - w, y), (C, y - r), (C, y - r + thickness), (C - w, y + thickness)]
        right = [(C, y - r), (C + w, y), (C + w, y + thickness), (C, y - r + thickness)]
        out.append(p.facet(left, p.lit(0.95 - 0.13 * k)))
        out.append(p.facet(right, p.lit(0.38 - 0.07 * k)))
        y += thickness + gap
    return out


def paper_gem(p: Painter, n: int = 6, height: float = 1.55, scale: float = 62.0,
              rx: float = 16.0, ry: float = 24.0) -> list[str]:
    """A real 3D n-gonal bipyramid — a folded paper gem. Back faces are culled and
    each visible facet is Lambert-shaded, so it holds up as a hero centrepiece."""
    ax, ay = math.radians(rx), math.radians(ry)

    def xform(v: tuple[float, float, float]) -> tuple[float, float, float]:
        x, y, z = v
        x, z = x * math.cos(ay) - z * math.sin(ay), x * math.sin(ay) + z * math.cos(ay)
        y, z = y * math.cos(ax) - z * math.sin(ax), y * math.sin(ax) + z * math.cos(ax)
        return (x, y, z)

    eq = [xform((math.cos(2 * math.pi * i / n), 0.0, math.sin(2 * math.pi * i / n))) for i in range(n)]
    top = xform((0.0, -height, 0.0))
    bot = xform((0.0, height, 0.0))

    faces: list[list[tuple[float, float, float]]] = []
    for i in range(n):
        a, b = eq[i], eq[(i + 1) % n]
        faces.append([top, a, b])
        faces.append([bot, b, a])

    def project(v: tuple[float, float, float]) -> tuple[float, float]:
        return (C + v[0] * scale, C + v[1] * scale)

    lit: list[tuple[float, list[tuple[float, float]], float]] = []
    for f in faces:
        (ax0, ay0, az0), (bx, by, bz), (cx0, cy0, cz0) = f
        u = (bx - ax0, by - ay0, bz - az0)
        w = (cx0 - ax0, cy0 - ay0, cz0 - az0)
        nx = u[1] * w[2] - u[2] * w[1]
        ny = u[2] * w[0] - u[0] * w[2]
        nz = u[0] * w[1] - u[1] * w[0]
        if nz <= 0:          # back face — cull
            continue
        ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
        dot = (nx * LIGHT_3D[0] + ny * LIGHT_3D[1] + nz * LIGHT_3D[2]) / ln
        depth = sum(v[2] for v in f) / 3.0
        lit.append((depth, [project(v) for v in f], 0.5 + 0.5 * dot))

    out: list[str] = []
    for _, pts, t in sorted(lit, key=lambda o: o[0]):
        out.append(p.facet(pts, p.lit(t)))
    return out


def _kite(p: Painter, cx: float, cy: float, size: float, deg: float, dim: float) -> list[str]:
    """One folded kite: two mirrored facets sharing a spine crease."""
    raw = [(0.0, -size), (size * 0.62, 0.0), (0.0, size * 1.15), (-size * 0.62, 0.0)]
    pts = []
    a = math.radians(deg)
    for x, y in raw:
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    left = [pts[0], pts[3], pts[2]]
    right = [pts[0], pts[1], pts[2]]
    return [
        p.facet(left, p.lit(0.95, dim)),
        p.facet(right, p.lit(0.3, dim)),
        p.outline(pts),
    ]


def shard_cluster(p: Painter) -> list[str]:
    """Loose folded shards — the drifting/ambient element. Hand-placed (not random)
    so the composition stays balanced and the file stays stable."""
    spec = [
        (62.0, 66.0, 38.0, -18.0, 1.0),
        (132.0, 52.0, 24.0, 26.0, 0.72),
        (148.0, 126.0, 32.0, -8.0, 0.9),
        (74.0, 142.0, 20.0, 38.0, 0.6),
        (108.0, 100.0, 14.0, -34.0, 0.45),
    ]
    out: list[str] = []
    for cx, cy, size, deg, dim in spec:
        out.extend(_kite(p, cx, cy, size, deg, dim))
    return out


def crane(p: Painter) -> list[str]:
    """An abstract paper crane — the most literal origami reference in the set.
    Deliberately reduced to seven facets so it stays a mark, not an illustration."""
    tail = [(14.0, 128.0), (76.0, 98.0), (80.0, 136.0)]
    wing_up = [(76.0, 98.0), (56.0, 24.0), (106.0, 88.0)]
    wing_dn = [(106.0, 88.0), (188.0, 124.0), (112.0, 112.0)]
    body = [(76.0, 98.0), (106.0, 88.0), (112.0, 112.0), (80.0, 136.0)]
    neck = [(106.0, 88.0), (150.0, 40.0), (159.0, 49.0), (114.0, 96.0)]
    head = [(150.0, 40.0), (176.0, 33.0), (158.0, 53.0)]
    out = [
        p.facet(tail, p.lit(0.42)),
        p.facet(body, p.lit(0.28)),
        p.facet(wing_up, p.lit(1.0)),
        p.facet(wing_dn, p.lit(0.62)),
        p.facet(neck, p.lit(0.9)),
        p.facet(head, p.lit(1.0)),
    ]
    out.append(p.crease_line((76.0, 98.0), (112.0, 112.0), p.crease))
    return out


# =========================================================================
# Asset catalogue
# =========================================================================

def build_catalogue(p: Painter) -> list[dict]:
    return [
        {
            "slug": "origami-disc",
            "name": "Folded disc",
            "note": "16-fold rosette, shallow creases. The calm one — reads as a circle, still folded.",
            "body": radial_fold(p, n=16, R=92.0, inner=0.90, hub=0.34),
        },
        {
            "slug": "origami-hex-flower",
            "name": "Hex flower",
            "note": "6-fold rosette with deeper creases. More graphic; good as a repeating motif.",
            "body": radial_fold(p, n=6, R=94.0, inner=0.58, hub=0.26),
        },
        {
            "slug": "origami-triangle",
            "name": "Tri-fold triangle",
            "note": "Equilateral with the classic first fold. Sharp, stable, reads as a direction.",
            "body": tri_fold(p),
        },
        {
            "slug": "origami-twist-square",
            "name": "Square twist",
            "note": "Concentric squares, each rotated 14°. Spiral motion from four creases.",
            "body": twist_fold(p, n=4, R=98.0, layers=5, twist=14.0, shrink=0.68),
        },
        {
            "slug": "origami-twist-hex",
            "name": "Hex twist",
            "note": "Same twist fold on six sides — denser, closer to a folded flower vortex.",
            "body": twist_fold(p, n=6, R=94.0, layers=5, twist=11.0, shrink=0.70),
        },
        {
            "slug": "origami-gem",
            "name": "Paper gem",
            "note": "True 3D bipyramid, back faces culled, Lambert-shaded. The hero centrepiece.",
            "body": paper_gem(p),
        },
        {
            "slug": "origami-pleat",
            "name": "Accordion pleat",
            "note": "Directional ribbon. Strongest edge/corner element — has grain and rhythm.",
            "body": pleat_band(p),
        },
        {
            "slug": "origami-chevron",
            "name": "Chevron stack",
            "note": "Folded arrows. Carries the 'transformation / forward' story literally.",
            "body": chevron_stack(p),
        },
        {
            "slug": "origami-shards",
            "name": "Drifting shards",
            "note": "Five loose kites. Built to be animated: each shard can drift independently.",
            "body": shard_cluster(p),
        },
        {
            "slug": "origami-crane",
            "name": "Crane",
            "note": "Seven facets, abstract. The only literal origami reference — use sparingly.",
            "body": crane(p),
        },
    ]


def svg_document(body: list[str], slug: str) -> str:
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {_n(S)} {_n(S)}" width="{_n(S)}" height="{_n(S)}"',
        '     fill="none" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">',
        f"  <!-- {slug} — generated by execution/build_origami_lab.py.",
        "       Painted in currentColor: set `color` on the parent to tint (accent or white). -->",
    ]
    lines.extend(body)
    lines.append("</svg>")
    return "\n".join(lines) + "\n"


def svg_inline(body: list[str], extra_class: str = "") -> str:
    cls = f' class="{extra_class}"' if extra_class else ""
    return (
        f'<svg viewBox="0 0 {_n(S)} {_n(S)}" fill="none" stroke-linejoin="round"'
        f' stroke-linecap="round" aria-hidden="true"{cls}>' + "".join(body) + "</svg>"
    )


# =========================================================================
# Preview page
# =========================================================================

CSS = """
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: %(bg)s; color: %(fg)s;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased; }
svg { display: block; width: 100%%; height: 100%%; overflow: visible; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 56px 24px 96px; }
h1 { font-size: clamp(1.9rem, 4vw, 2.7rem); line-height: 1.05; letter-spacing: -0.02em;
  font-weight: 800; margin: 0 0 14px; }
h2 { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 6px; }
.eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: %(accent)s; margin: 0 0 14px; }
.lede { color: %(muted)s; max-width: 62ch; line-height: 1.65; margin: 0 0 10px; }
.tokens { display: flex; flex-wrap: wrap; gap: 10px; margin: 26px 0 0; }
.chip { display: inline-flex; align-items: center; gap: 8px; border: 1px solid %(border)s;
  border-radius: 999px; padding: 6px 13px 6px 7px; font-size: 0.76rem; color: %(muted)s; }
.chip i { width: 16px; height: 16px; border-radius: 999px; display: block; }
.sec { margin-top: 68px; }
.sec > header { margin-bottom: 22px; }
.sec > header p { color: %(muted)s; margin: 0; font-size: 0.9rem; max-width: 70ch; line-height: 1.6; }
.grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
.card { border: 1px solid %(border)s; border-radius: 14px; background: %(surface)s; overflow: hidden; }
.card .pair { display: grid; grid-template-columns: 1fr 1fr; background: %(bg)s; }
.card .pair > div { aspect-ratio: 1 / 1; padding: 20px; position: relative; }
.card .pair > div + div { border-left: 1px solid %(border)s; }
.card .pair > div::after { content: attr(data-label); position: absolute; left: 12px; bottom: 9px;
  font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: %(muted)s; }
.card .meta { padding: 14px 16px 16px; border-top: 1px solid %(border)s; }
.card .meta h2 { font-size: 0.98rem; }
.card .meta p { margin: 0 0 8px; color: %(muted)s; font-size: 0.82rem; line-height: 1.55; }
.card .meta code { font-size: 0.72rem; color: %(muted)s; opacity: 0.8; }
.coral { color: %(accent)s; }
.white { color: %(white)s; }
.ladder { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
.ladder figure { margin: 0; }
.ladder .box { aspect-ratio: 1/1; border: 1px solid %(border)s; border-radius: 12px; padding: 16px;
  background: %(bg)s; }
.ladder figcaption { margin-top: 8px; font-size: 0.72rem; color: %(muted)s; letter-spacing: 0.06em; }
.duo { position: relative; aspect-ratio: 16/9; border: 1px solid %(border)s; border-radius: 14px;
  background: %(bg)s; overflow: hidden; }
.duo .layer { position: absolute; inset: 0; display: grid; place-items: center; }
.duo .layer > span { display: block; width: 32%%; aspect-ratio: 1/1; }
.hero { position: relative; overflow: hidden; border: 1px solid %(border)s; border-radius: 16px;
  background: %(bg)s; padding: 96px 28px; margin-bottom: 22px; }
.hero .shapes { position: absolute; inset: 0; pointer-events: none; }
.hero .shapes span { position: absolute; display: block; }
.hero .scrim { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(46%% 56%% at 50%% 46%%, %(bg)s 22%%, transparent 82%%); }
.hero .glow { position: absolute; inset-inline: 0; top: -33%%; height: 420px; pointer-events: none;
  background: radial-gradient(55%% 60%% at 50%% 0%%, rgba(251,107,76,0.18), transparent 70%%); }
.hero .inner { position: relative; max-width: 780px; margin: 0 auto; text-align: center; }
.hero h3 { font-size: clamp(1.7rem, 3.6vw, 2.9rem); line-height: 1.06; letter-spacing: -0.025em;
  font-weight: 800; margin: 0 0 18px; }
.hero h3 em { font-style: normal; color: %(accent)s; }
.hero .sub { color: %(muted)s; font-size: 1rem; line-height: 1.6; margin: 0 auto 26px; max-width: 44ch; }
.hero .btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.hero .btn { border-radius: 12px; padding: 12px 22px; font-size: 0.88rem; font-weight: 700;
  background: %(accent)s; color: #fff; }
.hero .btn.ghost { background: transparent; border: 1px solid %(border)s; color: %(fg)s; }
.hero .cap { position: absolute; top: 12px; left: 16px; font-size: 0.6rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: %(muted)s; }
.drift  { animation: drift 16s ease-in-out infinite; }
.drift2 { animation: drift 21s ease-in-out infinite reverse; }
.spin   { animation: spin 44s linear infinite; }
.spin-r { animation: spin 60s linear infinite reverse; }
@keyframes drift {
  0%%, 100%% { transform: translate3d(0,0,0) rotate(0deg); }
  50%%      { transform: translate3d(0,-14px,0) rotate(4deg); }
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
.foot { margin-top: 72px; border-top: 1px solid %(border)s; padding-top: 20px; color: %(muted)s;
  font-size: 0.8rem; line-height: 1.7; }
""" % {"bg": BG, "fg": FG, "muted": MUTED, "surface": SURFACE, "border": BORDER,
       "accent": ACCENT, "white": WHITE}


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def card(item: dict) -> str:
    inline = svg_inline(item["body"])
    return f"""
    <article class="card">
      <div class="pair">
        <div class="coral" data-label="accent {ACCENT}">{inline}</div>
        <div class="white" data-label="white {WHITE}">{inline}</div>
      </div>
      <div class="meta">
        <h2>{esc(item['name'])}</h2>
        <p>{esc(item['note'])}</p>
        <code>assets/origami/{esc(item['slug'])}.svg</code>
      </div>
    </article>"""


def ladder(item: dict) -> str:
    inline = svg_inline(item["body"])
    cells = []
    for op in (0.2, 0.35, 0.5, 0.75, 1.0):
        cells.append(
            f'<figure><div class="box coral" style="opacity:{op}">{inline}</div>'
            f'<figcaption>opacity {op:g}</figcaption></figure>'
        )
    return '<div class="ladder">' + "".join(cells) + "</div>"


def hero_mock(caption: str, layers: list[str], title: str, sub: str) -> str:
    return f"""
    <div class="hero">
      <span class="cap">{esc(caption)}</span>
      <div class="shapes">{''.join(layers)}</div>
      <div class="glow"></div>
      <div class="scrim"></div>
      <div class="inner">
        <p class="eyebrow">XoXoCom UG</p>
        <h3>{title}</h3>
        <p class="sub">{esc(sub)}</p>
        <div class="btns"><span class="btn">Get in touch</span><span class="btn ghost">Our services</span></div>
      </div>
    </div>"""


def layer(item: dict, css: str, tint: str, opacity: float, anim: str = "") -> str:
    cls = f"{tint} {anim}".strip()
    return f'<span class="{cls}" style="{css};opacity:{opacity}">{svg_inline(item["body"])}</span>'


def page_body(cat: list[dict], p: Painter) -> str:
    by = {c["slug"]: c for c in cat}
    hero_title = 'Uniting modern ways of working and <em>A.I.</em> for measurable advantage'
    hero_sub = ("We combine agile methodology with artificial intelligence — so teams and "
                "organizations work faster, smarter and measurably better.")

    mocks = [
        hero_mock(
            "Mock A — paper gem centre + drifting shards",
            [
                # `translate` (the standalone property) survives the keyframes' `transform`,
                # so the centred layer stays centred while it drifts.
                # Kept off-centre: the hero's radial scrim swallows anything sitting
                # directly behind the headline.
                layer(by["origami-gem"], "left:76%;top:50%;width:460px;height:460px;translate:-50% -50%", "coral", 0.6, "drift"),
                layer(by["origami-shards"], "left:4%;top:14%;width:230px;height:230px", "white", 0.42, "drift2"),
                layer(by["origami-shards"], "left:14%;bottom:4%;width:170px;height:170px", "coral", 0.4, "drift"),
            ],
            hero_title, hero_sub,
        ),
        hero_mock(
            "Mock B — twisted discs, corner-weighted",
            [
                layer(by["origami-twist-hex"], "left:-6%;top:-12%;width:360px;height:360px", "coral", 0.45, "spin"),
                layer(by["origami-disc"], "right:-8%;bottom:-20%;width:440px;height:440px", "white", 0.30, "spin-r"),
                layer(by["origami-triangle"], "right:18%;top:8%;width:150px;height:150px", "coral", 0.5, "drift2"),
            ],
            hero_title, hero_sub,
        ),
        hero_mock(
            "Mock C — pleat grain + chevrons (quietest option)",
            [
                layer(by["origami-pleat"], "left:-10%;bottom:-8%;width:520px;height:520px", "white", 0.3, "drift"),
                layer(by["origami-chevron"], "right:6%;top:14%;width:220px;height:220px", "coral", 0.6, "drift2"),
                layer(by["origami-triangle"], "left:24%;top:6%;width:120px;height:120px", "white", 0.28, ""),
            ],
            hero_title, hero_sub,
        ),
    ]

    duo = f"""
    <div class="duo">
      <div class="layer"><span class="coral" style="transform:translate(-9%,4%)">{svg_inline(by['origami-twist-square']['body'])}</span></div>
      <div class="layer"><span class="white" style="opacity:0.65;transform:translate(9%,-4%)">{svg_inline(by['origami-twist-square']['body'])}</span></div>
    </div>"""

    return f"""
  <div class="wrap">
    <p class="eyebrow">Hero shape system — round 1</p>
    <h1>Origami shapes for the hero animations</h1>
    <p class="lede">Ten folded-paper shapes, each built from flat facets with visible crease lines.
      Every shape is painted in <code>currentColor</code> with the translucency baked into the
      geometry per facet — so one file serves both tints: coral accent or white accent.</p>
    <p class="lede">Facet opacity range is {p.fill_min:g}–{p.fill_max:g}, creases {p.crease:g},
      silhouette {p.edge:g}. Nothing is wired into the site yet — this is the review round.</p>
    <div class="tokens">
      <span class="chip"><i style="background:{ACCENT}"></i>--color-accent {ACCENT}</span>
      <span class="chip"><i style="background:{WHITE}"></i>--color-accent-fg {WHITE}</span>
      <span class="chip"><i style="background:{BG};box-shadow:inset 0 0 0 1px {BORDER}"></i>--color-bg {BG}</span>
    </div>

    <section class="sec">
      <header>
        <h2>1 · The shape family</h2>
        <p>Left half of each tile is the coral accent, right half is the white accent, both on the
          real page canvas. Judge them at this size first — in the hero they will be much larger
          and much fainter.</p>
      </header>
      <div class="grid">{''.join(card(c) for c in cat)}</div>
    </section>

    <section class="sec">
      <header>
        <h2>2 · How translucent?</h2>
        <p>The same shape at five overall opacities. This is the dial we set once a shape is chosen —
          the hero canvas currently runs at 0.8.</p>
      </header>
      {ladder(by['origami-disc'])}
    </section>

    <section class="sec">
      <header>
        <h2>3 · Two tints, overlapping</h2>
        <p>Coral behind, white in front, offset. Overlapping translucent facets is where the folded-paper
          depth actually appears.</p>
      </header>
      {duo}
    </section>

    <section class="sec">
      <header>
        <h2>4 · In situ — three hero directions</h2>
        <p>Real hero copy, real scrim and glow, shapes slowly drifting. The existing node-network canvas
          is <em>not</em> drawn here, so you can judge the shapes on their own.</p>
      </header>
      {''.join(mocks)}
    </section>

    <p class="foot">Generated by <code>execution/build_origami_lab.py</code> — deterministic, std-lib only.
      Assets live in <code>assets/origami/</code>. Nothing in <code>sites/xoxocom/</code> has been touched.</p>
  </div>"""


def full_document(body: str) -> str:
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        "<title>Origami hero shapes — XoXoCom</title>\n<style>" + CSS + "</style>\n</head>\n<body>"
        + body + "\n</body>\n</html>\n"
    )


def fragment_document(body: str) -> str:
    return "<title>Origami hero shapes — XoXoCom</title>\n<style>" + CSS + "</style>\n" + body + "\n"


# =========================================================================

def main() -> int:
    ap = argparse.ArgumentParser(description="Generate origami shape assets + preview lab.")
    ap.add_argument("--assets-dir", default=str(DEFAULT_ASSETS), help="where the .svg files go")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="where the preview page goes")
    ap.add_argument("--fill-min", type=float, default=0.05, help="opacity of the darkest facet")
    ap.add_argument("--fill-max", type=float, default=0.24, help="opacity of the brightest facet")
    ap.add_argument("--crease", type=float, default=0.30, help="crease-line opacity")
    ap.add_argument("--edge", type=float, default=0.62, help="silhouette-outline opacity")
    args = ap.parse_args()

    painter = Painter(args.fill_min, args.fill_max, args.crease, args.edge)
    cat = build_catalogue(painter)

    assets = Path(args.assets_dir)
    assets.mkdir(parents=True, exist_ok=True)
    for item in cat:
        (assets / f"{item['slug']}.svg").write_text(svg_document(item["body"], item["slug"]), encoding="utf-8")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    body = page_body(cat, painter)
    (out / "index.html").write_text(full_document(body), encoding="utf-8")
    (out / "artifact.html").write_text(fragment_document(body), encoding="utf-8")

    print(f"{len(cat)} shapes -> {assets}")
    for item in cat:
        print(f"  {item['slug']}.svg  ({len(item['body'])} paths)")
    print(f"preview  -> {out / 'index.html'}")
    print(f"fragment -> {out / 'artifact.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
